"""
PDF floor plan extraction -- converts PDF pages to images for VLM processing,
with optional vector geometry extraction for CAD-exported PDFs.

Two strategies:
1. **Raster path** (scanned PDFs, screenshots):
   pdf2image converts pages to high-res PNG for VLM analysis.
2. **Vector path** (AutoCAD-exported PDFs):
   pdfplumber extracts lines/rects/curves as geometric primitives,
   which map to walls/rooms without needing VLM.

The raster path is always used as the primary pipeline;
vector extraction is attempted first as an optimization.
"""

from __future__ import annotations

import io
import logging
from pathlib import Path
from typing import Any

import pdfplumber
from pdf2image import convert_from_bytes, convert_from_path
from PIL import Image

logger = logging.getLogger(__name__)


class PDFExtractionResult:
    """Result of PDF floor plan extraction."""

    def __init__(
        self,
        *,
        images: list[Image.Image],
        page_count: int,
        vector_data: dict[str, Any] | None = None,
        has_vector_content: bool = False,
    ) -> None:
        self.images = images
        self.page_count = page_count
        self.vector_data = vector_data
        self.has_vector_content = has_vector_content

    @property
    def primary_image(self) -> Image.Image | None:
        """The main floor plan image (first page, or largest page)."""
        if not self.images:
            return None
        if len(self.images) == 1:
            return self.images[0]
        # Return the page with the most content (largest area)
        return max(self.images, key=lambda img: img.width * img.height)


class PDFFloorPlanExtractor:
    """Extracts floor plan data from PDF files.

    Parameters
    ----------
    dpi:
        Resolution for raster conversion.  300 DPI is optimal for VLM
        analysis -- high enough for text/line clarity, low enough for
        reasonable file sizes.
    max_pages:
        Maximum pages to process.  Floor plans are usually 1-3 pages.
    """

    def __init__(self, *, dpi: int = 300, max_pages: int = 5) -> None:
        self._dpi = dpi
        self._max_pages = max_pages

    async def extract(
        self,
        *,
        pdf_bytes: bytes | None = None,
        pdf_path: str | Path | None = None,
    ) -> PDFExtractionResult:
        """Extract floor plan images from a PDF.

        Provide exactly one of ``pdf_bytes`` or ``pdf_path``.

        Returns
        -------
        PDFExtractionResult
            Contains rasterised page images and optional vector data.
        """
        if pdf_bytes is None and pdf_path is None:
            raise ValueError("Provide one of: pdf_bytes, pdf_path")

        # Get page count
        if pdf_bytes is not None:
            pdf = pdfplumber.open(io.BytesIO(pdf_bytes))
        else:
            pdf = pdfplumber.open(str(pdf_path))

        page_count = len(pdf.pages)
        pages_to_process = min(page_count, self._max_pages)

        logger.info(
            "Extracting floor plan from PDF: %d pages (processing %d)",
            page_count,
            pages_to_process,
        )

        # Attempt vector extraction first
        vector_data = self._extract_vector_data(pdf, pages_to_process)
        has_vector = bool(
            vector_data
            and (vector_data.get("lines", []) or vector_data.get("rects", []))
        )

        if has_vector:
            logger.info(
                "Vector content detected: %d lines, %d rects",
                len(vector_data.get("lines", [])),
                len(vector_data.get("rects", [])),
            )

        pdf.close()

        # Rasterise pages for VLM
        if pdf_bytes is not None:
            images = convert_from_bytes(
                pdf_bytes,
                dpi=self._dpi,
                fmt="png",
                first_page=1,
                last_page=pages_to_process,
            )
        else:
            images = convert_from_path(
                str(pdf_path),
                dpi=self._dpi,
                fmt="png",
                first_page=1,
                last_page=pages_to_process,
            )

        logger.info(
            "Rasterised %d pages at %d DPI",
            len(images),
            self._dpi,
        )

        return PDFExtractionResult(
            images=images,
            page_count=page_count,
            vector_data=vector_data if has_vector else None,
            has_vector_content=has_vector,
        )

    def extract_page_image(
        self,
        pdf_bytes: bytes,
        page_number: int = 1,
    ) -> Image.Image:
        """Extract a single page as an image.

        Parameters
        ----------
        pdf_bytes:
            Raw PDF file bytes.
        page_number:
            1-based page number to extract.

        Returns
        -------
        PIL.Image.Image
            The rasterised page.
        """
        images = convert_from_bytes(
            pdf_bytes,
            dpi=self._dpi,
            fmt="png",
            first_page=page_number,
            last_page=page_number,
        )
        if not images:
            raise ValueError(f"Could not extract page {page_number} from PDF")
        return images[0]

    @staticmethod
    def _extract_vector_data(
        pdf: pdfplumber.PDF,
        max_pages: int,
    ) -> dict[str, Any]:
        """Extract vector geometry from PDF pages.

        This works best for PDFs exported from AutoCAD or similar CAD tools,
        which embed actual vector line/rect/curve data (not rasterised images).
        """
        all_lines: list[dict[str, float]] = []
        all_rects: list[dict[str, float]] = []
        all_texts: list[dict[str, Any]] = []

        for i, page in enumerate(pdf.pages[:max_pages]):
            page_height = float(page.height)

            # Extract lines (wall candidates)
            for line in (page.lines or []):
                all_lines.append({
                    "x0": float(line["x0"]),
                    "y0": page_height - float(line["top"]),
                    "x1": float(line["x1"]),
                    "y1": page_height - float(line["bottom"]),
                    "width": float(line.get("linewidth", 1)),
                    "page": i,
                })

            # Extract rectangles (room candidates)
            for rect in (page.rects or []):
                all_rects.append({
                    "x0": float(rect["x0"]),
                    "y0": page_height - float(rect["top"]),
                    "x1": float(rect["x1"]),
                    "y1": page_height - float(rect["bottom"]),
                    "width": float(rect.get("linewidth", 1)),
                    "page": i,
                })

            # Extract text (room labels, dimensions)
            for char_group in (page.extract_words() or []):
                all_texts.append({
                    "text": char_group["text"],
                    "x": float(char_group["x0"]),
                    "y": page_height - float(char_group["top"]),
                    "page": i,
                })

        return {
            "lines": all_lines,
            "rects": all_rects,
            "texts": all_texts,
        }
