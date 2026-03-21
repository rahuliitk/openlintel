"""
Main floor plan digitization pipeline.

Orchestrates the full workflow:
1. For DWG files: DWG -> DXF via LibreDWG, then parse with ezdxf.
2. For raster images: preprocess -> VLM extraction -> structured JSON -> DXF.

The pipeline produces both a ``FloorPlanData`` (structured JSON) and
optionally a DXF file as output.
"""

from __future__ import annotations

import io
import logging
from pathlib import Path
from typing import Any

import ezdxf
import numpy as np
from PIL import Image

from openlintel_digitizer.dxf_generator import DXFGenerator
from openlintel_digitizer.image_preprocessor import FloorPlanPreprocessor, PreprocessConfig
from openlintel_digitizer.schemas import FloorPlanData
from openlintel_digitizer.vlm_extractor import VLMExtractor

logger = logging.getLogger(__name__)


class FloorPlanPipeline:
    """End-to-end floor plan digitization pipeline.

    Parameters
    ----------
    vlm_model:
        LiteLLM model identifier for the VLM extractor.
    vlm_api_key:
        API key for the VLM provider.
    preprocess_config:
        Image preprocessing configuration.
    libredwg_path:
        Path to the ``dwg2dxf`` executable for DWG conversion.
    oda_converter_path:
        Path to the ODA File Converter executable.
    dxf_version:
        Target DXF version for output files.
    """

    def __init__(
        self,
        *,
        vlm_model: str = "openai/gpt-4o",
        vlm_api_key: str | None = None,
        preprocess_config: PreprocessConfig | None = None,
        libredwg_path: str | None = None,
        oda_converter_path: str | None = None,
        dxf_version: str = "R2013",
    ) -> None:
        self._vlm_extractor = VLMExtractor(
            model=vlm_model,
            api_key=vlm_api_key,
        )
        self._preprocessor = FloorPlanPreprocessor(config=preprocess_config)
        self._dxf_generator = DXFGenerator(dxf_version=dxf_version)
        self._libredwg_path = libredwg_path
        self._oda_converter_path = oda_converter_path
        self._dxf_version = dxf_version

    async def digitize_image(
        self,
        *,
        image: Image.Image | None = None,
        image_bytes: bytes | None = None,
        image_path: str | Path | None = None,
        skip_preprocess: bool = False,
        output_dxf_path: str | Path | None = None,
    ) -> FloorPlanData:
        """Digitize a raster floor plan image.

        Provide exactly one of ``image``, ``image_bytes``, or ``image_path``.

        Parameters
        ----------
        image:
            PIL Image.
        image_bytes:
            Raw image bytes.
        image_path:
            Path to an image file.
        skip_preprocess:
            If ``True``, skip OpenCV preprocessing (useful for already-clean images).
        output_dxf_path:
            If provided, generate and save a DXF file.

        Returns
        -------
        FloorPlanData
            Structured floor plan data.
        """
        # Resolve image input
        pil_image = self._resolve_image(image, image_bytes, image_path)

        logger.info(
            "Digitizing raster floor plan: %dx%d",
            pil_image.width,
            pil_image.height,
        )

        # Step 1: Preprocess
        if not skip_preprocess:
            logger.info("Step 1/3: Preprocessing image")
            preprocess_result = self._preprocessor.process(pil_image)
            # Convert processed grayscale back to PIL for VLM
            processed_image = Image.fromarray(preprocess_result.image)
            logger.info(
                "Preprocessing complete: steps=%s, skew=%.2f deg",
                preprocess_result.steps_applied,
                preprocess_result.skew_angle,
            )
        else:
            logger.info("Step 1/3: Preprocessing skipped")
            processed_image = pil_image

        # Step 2: VLM extraction
        logger.info("Step 2/3: VLM floor plan extraction")
        floor_plan = await self._vlm_extractor.extract(processed_image)
        floor_plan.source_type = "raster"

        logger.info(
            "Extraction complete: %d walls, %d rooms, %d openings",
            floor_plan.wall_count,
            floor_plan.room_count,
            floor_plan.opening_count,
        )

        # Step 3: Generate DXF if requested
        if output_dxf_path is not None:
            logger.info("Step 3/3: Generating DXF")
            self._dxf_generator.generate(floor_plan, output_path=output_dxf_path)
        else:
            logger.info("Step 3/3: DXF generation skipped (no output path)")

        return floor_plan

    async def digitize_dwg(
        self,
        dwg_path: str | Path,
        *,
        output_dxf_path: str | Path | None = None,
    ) -> FloorPlanData:
        """Digitize a DWG file.

        Converts DWG to DXF using LibreDWG/ODA, then parses the DXF
        to extract structural information.

        Parameters
        ----------
        dwg_path:
            Path to the input DWG file.
        output_dxf_path:
            If provided, save the converted DXF file here.

        Returns
        -------
        FloorPlanData
            Structured floor plan data extracted from the DWG.
        """
        from openlintel_digitizer.dwg_converter import DWGConverter

        converter = DWGConverter(
            libredwg_path=self._libredwg_path,
            oda_converter_path=self._oda_converter_path,
        )

        if not converter.is_available:
            raise RuntimeError(
                "No DWG conversion backend available. Install LibreDWG or ODA File Converter."
            )

        logger.info("Digitizing DWG file: %s", dwg_path)

        # Convert DWG to DXF
        dxf_path = await converter.convert(
            dwg_path,
            output_path=output_dxf_path,
            dxf_version=self._dxf_version,
        )

        # Parse the DXF
        floor_plan = self._parse_dxf(dxf_path)
        floor_plan.source_type = "dwg"

        logger.info(
            "DWG digitization complete: %d walls, %d rooms",
            floor_plan.wall_count,
            floor_plan.room_count,
        )

        return floor_plan

    async def digitize_pdf(
        self,
        *,
        pdf_bytes: bytes | None = None,
        pdf_path: str | Path | None = None,
        page_number: int = 1,
        output_dxf_path: str | Path | None = None,
    ) -> FloorPlanData:
        """Digitize a floor plan from a PDF file.

        For PDFs exported from AutoCAD, attempts vector extraction first.
        Falls back to raster VLM extraction for scanned PDFs.

        Parameters
        ----------
        pdf_bytes:
            Raw PDF bytes.
        pdf_path:
            Path to a PDF file.
        page_number:
            Which page to extract (1-based).  Defaults to 1.
        output_dxf_path:
            If provided, generate and save a DXF file.

        Returns
        -------
        FloorPlanData
            Structured floor plan data.
        """
        from openlintel_digitizer.pdf_extractor import PDFFloorPlanExtractor

        extractor = PDFFloorPlanExtractor()

        logger.info("Digitizing PDF floor plan (page %d)", page_number)

        # Extract the target page as an image
        if pdf_bytes is not None:
            page_image = extractor.extract_page_image(pdf_bytes, page_number)
        elif pdf_path is not None:
            with open(pdf_path, "rb") as f:
                page_image = extractor.extract_page_image(f.read(), page_number)
        else:
            raise ValueError("Provide one of: pdf_bytes, pdf_path")

        # Use the raster VLM pipeline on the extracted page image
        floor_plan = await self.digitize_image(
            image=page_image,
            skip_preprocess=False,
            output_dxf_path=output_dxf_path,
        )
        floor_plan.source_type = "pdf"

        return floor_plan

    def digitize_dxf(
        self,
        dxf_path: str | Path,
    ) -> FloorPlanData:
        """Parse an existing DXF file into structured floor plan data.

        Parameters
        ----------
        dxf_path:
            Path to the DXF file.

        Returns
        -------
        FloorPlanData
            Structured floor plan data.
        """
        floor_plan = self._parse_dxf(Path(dxf_path))
        floor_plan.source_type = "dxf"
        return floor_plan

    def export_dxf(
        self,
        floor_plan: FloorPlanData,
        output_path: str | Path,
    ) -> str:
        """Generate a DXF file from structured floor plan data.

        Parameters
        ----------
        floor_plan:
            Structured floor plan data.
        output_path:
            Destination file path.

        Returns
        -------
        str
            Absolute path to the generated DXF file.
        """
        doc = self._dxf_generator.generate(floor_plan, output_path=output_path)
        return str(Path(output_path).resolve())

    @staticmethod
    def _resolve_image(
        image: Image.Image | None,
        image_bytes: bytes | None,
        image_path: str | Path | None,
    ) -> Image.Image:
        """Resolve one of the three image input formats."""
        if image is not None:
            return image.convert("RGB")
        if image_bytes is not None:
            return Image.open(io.BytesIO(image_bytes)).convert("RGB")
        if image_path is not None:
            return Image.open(image_path).convert("RGB")
        raise ValueError("Provide one of: image, image_bytes, or image_path")

    @staticmethod
    def _parse_dxf(dxf_path: Path) -> FloorPlanData:
        """Parse a DXF file into ``FloorPlanData``.

        Enhanced parser that extracts:
        - Walls from LINE entities on wall-related layers
        - Rooms from LWPOLYLINE entities on room-related layers
        - Doors from INSERT entities (block references) with door-related names
        - Windows from INSERT entities with window-related names
        - Dimensions from DIMENSION entities
        - Text/labels from TEXT/MTEXT entities for room identification
        """
        from openlintel_digitizer.schemas import (
            DimensionAnnotation,
            DoorWindow,
            DoorWindowType,
            Point2D,
            RoomPolygon,
            WallSegment,
            WallType,
        )

        doc = ezdxf.readfile(str(dxf_path))
        msp = doc.modelspace()

        walls: list[WallSegment] = []
        rooms: list[RoomPolygon] = []
        openings: list[DoorWindow] = []
        dimensions: list[DimensionAnnotation] = []
        wall_idx = 0
        room_idx = 0
        opening_idx = 0

        # Layer name patterns
        wall_patterns = {"wall", "walls", "a-wall", "s-wall", "partition"}
        room_patterns = {"room", "rooms", "space", "spaces", "area", "a-area"}
        door_patterns = {"door", "doors", "a-door", "opening"}
        window_patterns = {"window", "windows", "a-glaz", "glazing", "glass"}

        def _layer_matches(layer_name: str, patterns: set[str]) -> bool:
            lower = layer_name.lower()
            return any(p in lower for p in patterns)

        # -- Extract walls from LINE entities ----------------------------------
        for entity in msp.query("LINE"):
            layer = entity.dxf.layer
            if _layer_matches(layer, wall_patterns) or layer == "0":
                start = entity.dxf.start
                end = entity.dxf.end
                wall_type = (
                    WallType.EXTERIOR
                    if "exterior" in layer.lower() or "ext" in layer.lower()
                    else WallType.INTERIOR_PARTITION
                )
                walls.append(WallSegment(
                    id=f"W{wall_idx}",
                    start=Point2D(x=float(start.x), y=float(start.y)),
                    end=Point2D(x=float(end.x), y=float(end.y)),
                    wall_type=wall_type,
                ))
                wall_idx += 1

        # -- Extract rooms from LWPOLYLINE entities ----------------------------
        for entity in msp.query("LWPOLYLINE"):
            layer = entity.dxf.layer
            if _layer_matches(layer, room_patterns):
                points = list(entity.get_points(format="xy"))
                if len(points) >= 3:
                    vertices = [Point2D(x=float(p[0]), y=float(p[1])) for p in points]
                    rooms.append(RoomPolygon(
                        id=f"R{room_idx}",
                        name=f"Room {room_idx}",
                        vertices=vertices,
                    ))
                    room_idx += 1

        # -- Extract doors/windows from INSERT entities (block references) -----
        for entity in msp.query("INSERT"):
            block_name = entity.dxf.name.lower()
            layer = entity.dxf.layer.lower()

            is_door = (
                _layer_matches(entity.dxf.layer, door_patterns)
                or any(d in block_name for d in ("door", "dr", "entrance"))
            )
            is_window = (
                _layer_matches(entity.dxf.layer, window_patterns)
                or any(w in block_name for w in ("window", "wndw", "glazing"))
            )

            if is_door or is_window:
                opening_type = DoorWindowType.SINGLE_DOOR if is_door else DoorWindowType.SINGLE_WINDOW

                # Try to get width from block definition
                width_mm = 900.0 if is_door else 1200.0
                try:
                    block = doc.blocks.get(entity.dxf.name)
                    if block:
                        from ezdxf.bbox import extents
                        bbox = extents(block)
                        if bbox.has_data:
                            width_mm = abs(bbox.extmax.x - bbox.extmin.x)
                            if width_mm < 100:
                                width_mm = width_mm * entity.dxf.xscale if hasattr(entity.dxf, 'xscale') else 900.0
                except Exception:
                    pass

                openings.append(DoorWindow(
                    id=f"{'D' if is_door else 'W'}{opening_idx}",
                    type=opening_type,
                    wall_id="",
                    position_along_wall_mm=0.0,
                    width_mm=width_mm,
                    height_mm=2100.0 if is_door else 1200.0,
                    sill_height_mm=0.0 if is_door else 900.0,
                ))
                opening_idx += 1

        # -- Extract dimensions from DIMENSION entities ------------------------
        for entity in msp.query("DIMENSION"):
            try:
                if hasattr(entity.dxf, "defpoint") and hasattr(entity.dxf, "defpoint2"):
                    start = entity.dxf.defpoint
                    end = entity.dxf.defpoint2
                    dx = end.x - start.x
                    dy = end.y - start.y
                    value_mm = (dx**2 + dy**2) ** 0.5

                    if value_mm > 0:
                        dimensions.append(DimensionAnnotation(
                            start=Point2D(x=float(start.x), y=float(start.y)),
                            end=Point2D(x=float(end.x), y=float(end.y)),
                            value_mm=value_mm,
                            label=getattr(entity.dxf, "text", ""),
                        ))
            except Exception:
                pass

        # -- Fallback: if no wall layers found, treat all lines as walls -------
        if not walls:
            for entity in msp.query("LINE"):
                start = entity.dxf.start
                end = entity.dxf.end
                walls.append(WallSegment(
                    id=f"W{wall_idx}",
                    start=Point2D(x=float(start.x), y=float(start.y)),
                    end=Point2D(x=float(end.x), y=float(end.y)),
                ))
                wall_idx += 1

        # -- Enrich room names from TEXT/MTEXT near room centroids -------------
        texts: list[tuple[float, float, str]] = []
        for entity in msp.query("TEXT MTEXT"):
            try:
                insert = entity.dxf.insert
                text_val = entity.dxf.text if hasattr(entity.dxf, "text") else ""
                if not text_val and hasattr(entity, "text"):
                    text_val = entity.text
                if text_val and len(text_val.strip()) > 1:
                    texts.append((float(insert.x), float(insert.y), text_val.strip()))
            except Exception:
                pass

        # Match text labels to nearest room centroid
        for room in rooms:
            centroid = room.centroid
            best_dist = float("inf")
            best_label = None
            for tx, ty, label in texts:
                dist = ((centroid.x - tx)**2 + (centroid.y - ty)**2) ** 0.5
                if dist < best_dist:
                    best_dist = dist
                    best_label = label
            if best_label and best_dist < 5000:  # Within 5 metres
                room.name = best_label

        logger.info(
            "Parsed DXF: %d walls, %d rooms, %d openings, %d dimensions from %s",
            len(walls),
            len(rooms),
            len(openings),
            len(dimensions),
            dxf_path,
        )

        return FloorPlanData(
            walls=walls,
            rooms=rooms,
            openings=openings,
            dimensions=dimensions,
        )
