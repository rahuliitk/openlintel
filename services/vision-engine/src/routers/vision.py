"""Vision (floor plan digitization) API routes."""

from __future__ import annotations

import json
from typing import Annotated

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from openlintel_shared.db import get_db_session, get_session_factory
from openlintel_shared.job_worker import update_job_status, get_user_api_key
from openlintel_shared.config import Settings, get_settings

from src.agents.vision_agent import detect_rooms_from_image

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/v1/vision", tags=["vision"])


class VisionJobRequest:
    """Simple request model for vision jobs."""
    pass


from pydantic import BaseModel, Field


class VisionJobInput(BaseModel):
    job_id: str
    user_id: str
    project_id: str
    image_url: str
    upload_id: str | None = None


@router.post(
    "/job",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Run floor plan digitization as a background job",
)
async def run_vision_job(
    request: VisionJobInput,
    background_tasks: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict:
    """Accept a vision job request, run room detection in the background."""
    try:
        await update_job_status(db, request.job_id, status="running", progress=5)

        background_tasks.add_task(
            _run_detection,
            job_id=request.job_id,
            user_id=request.user_id,
            image_url=request.image_url,
        )

        logger.info("vision_job_dispatched", job_id=request.job_id)
        return {"status": "accepted", "job_id": request.job_id}

    except Exception as exc:
        logger.error("vision_job_dispatch_failed", job_id=request.job_id, error=str(exc))
        await update_job_status(db, request.job_id, status="failed", error=str(exc))
        return {"status": "failed", "error": str(exc)}


class FloorPlanDigitizeInput(BaseModel):
    """Request model for the enhanced floor plan digitization job."""
    job_id: str
    user_id: str
    project_id: str
    upload_id: str = ""
    storage_key: str = ""
    filename: str = ""
    mime_type: str = ""


@router.post(
    "/digitize",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Digitize a floor plan file (DWG, DXF, PDF, or image)",
)
async def digitize_floor_plan(
    request: FloorPlanDigitizeInput,
    background_tasks: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict:
    """Enhanced digitization endpoint that handles all file types.

    Routes DWG/DXF/PDF/image files to the correct processing pipeline.
    Falls back to the existing VLM-only pipeline for images.
    """
    try:
        await update_job_status(db, request.job_id, status="running", progress=5)

        background_tasks.add_task(
            _run_file_aware_digitization,
            job_id=request.job_id,
            user_id=request.user_id,
            project_id=request.project_id,
            storage_key=request.storage_key,
            filename=request.filename,
            mime_type=request.mime_type,
        )

        logger.info(
            "digitize_job_dispatched",
            job_id=request.job_id,
            filename=request.filename,
            mime_type=request.mime_type,
        )
        return {"status": "accepted", "job_id": request.job_id}

    except Exception as exc:
        logger.error("digitize_dispatch_failed", job_id=request.job_id, error=str(exc))
        await update_job_status(db, request.job_id, status="failed", error=str(exc))
        return {"status": "failed", "error": str(exc)}


async def _run_file_aware_digitization(
    job_id: str,
    user_id: str,
    project_id: str,
    storage_key: str,
    filename: str,
    mime_type: str,
) -> None:
    """Background task: route file to correct pipeline based on type."""
    import asyncio
    import tempfile
    from pathlib import Path

    from src.services.file_router import FileType, detect_file_type

    session_factory = get_session_factory()
    async with session_factory() as db:
        try:
            await update_job_status(db, job_id, status="running", progress=10)

            # Download file from storage
            from openlintel_shared.storage import download_file
            from openlintel_shared.config import get_settings as _get_settings
            _settings = _get_settings()
            bucket = _settings.MINIO_BUCKET
            file_bytes = await asyncio.to_thread(
                download_file, bucket, storage_key
            )

            # Detect file type
            file_type = detect_file_type(
                mime_type=mime_type,
                filename=filename,
                file_bytes=file_bytes[:16] if file_bytes else None,
            )

            logger.info(
                "file_type_detected",
                job_id=job_id,
                file_type=file_type.value,
                filename=filename,
            )

            await update_job_status(db, job_id, status="running", progress=20)

            if file_type == FileType.DWG:
                output = await _process_dwg(db, job_id, file_bytes, filename)
            elif file_type == FileType.DXF:
                output = await _process_dxf(db, job_id, file_bytes, filename)
            elif file_type == FileType.PDF:
                output = await _process_pdf(db, job_id, file_bytes, user_id)
            elif file_type == FileType.IMAGE:
                # Fall back to existing VLM pipeline
                output = await _process_image_vlm(db, job_id, storage_key, user_id)
            else:
                raise ValueError(f"Unsupported file type: {file_type.value}")

            await update_job_status(
                db, job_id,
                status="completed",
                progress=100,
                output_json=output,
            )

            logger.info("digitize_job_completed", job_id=job_id, file_type=file_type.value)

        except Exception as exc:
            logger.error("digitize_job_failed", job_id=job_id, error=str(exc))
            await update_job_status(db, job_id, status="failed", error=str(exc))


async def _process_dwg(db, job_id, file_bytes, filename):
    """DWG -> DXF -> FloorPlanData."""
    import tempfile
    from pathlib import Path

    await update_job_status(db, job_id, status="running", progress=30)

    with tempfile.TemporaryDirectory(prefix="openlintel_dwg_") as tmpdir:
        dwg_path = Path(tmpdir) / filename
        dwg_path.write_bytes(file_bytes)

        from openlintel_digitizer.dwg_converter import DWGConverter
        converter = DWGConverter()

        if not converter.is_available:
            raise RuntimeError(converter.install_instructions)

        await update_job_status(db, job_id, status="running", progress=40)

        dxf_path = await converter.convert(dwg_path)

        await update_job_status(db, job_id, status="running", progress=60)

        from openlintel_digitizer.pipeline import FloorPlanPipeline
        pipeline = FloorPlanPipeline()
        floor_plan = pipeline.digitize_dxf(dxf_path)

    await update_job_status(db, job_id, status="running", progress=80)

    return _floor_plan_to_output(floor_plan)


async def _process_dxf(db, job_id, file_bytes, filename):
    """DXF -> FloorPlanData (direct parsing, no conversion needed)."""
    import tempfile
    from pathlib import Path

    await update_job_status(db, job_id, status="running", progress=40)

    with tempfile.TemporaryDirectory(prefix="openlintel_dxf_") as tmpdir:
        dxf_path = Path(tmpdir) / filename
        dxf_path.write_bytes(file_bytes)

        from openlintel_digitizer.pipeline import FloorPlanPipeline
        pipeline = FloorPlanPipeline()
        floor_plan = pipeline.digitize_dxf(dxf_path)

    await update_job_status(db, job_id, status="running", progress=80)

    return _floor_plan_to_output(floor_plan)


async def _process_pdf(db, job_id, file_bytes, user_id):
    """PDF -> Image -> VLM -> FloorPlanData."""
    await update_job_status(db, job_id, status="running", progress=30)

    from openlintel_digitizer.pipeline import FloorPlanPipeline

    api_key = await get_user_api_key(db, user_id, provider="openai")
    vlm_api_key = None
    if api_key:
        from openlintel_shared.crypto import decrypt_api_key
        vlm_api_key = decrypt_api_key(
            encrypted_key=api_key["encrypted_key"],
            iv=api_key["iv"],
            auth_tag=api_key["auth_tag"],
        )

    pipeline = FloorPlanPipeline(vlm_api_key=vlm_api_key)

    await update_job_status(db, job_id, status="running", progress=40)

    floor_plan = await pipeline.digitize_pdf(pdf_bytes=file_bytes)

    await update_job_status(db, job_id, status="running", progress=80)

    return _floor_plan_to_output(floor_plan)


async def _process_image_vlm(db, job_id, storage_key, user_id):
    """Image -> VLM -> room detection (existing pipeline)."""
    from openlintel_shared.config import get_settings as _get_settings
    _settings = _get_settings()
    image_url = f"http://localhost:3000/api/uploads/{storage_key}"

    api_key = await get_user_api_key(db, user_id, provider="openai")
    if api_key is None:
        raise ValueError("No API key configured for provider 'openai'")

    await update_job_status(db, job_id, status="running", progress=40)

    result = await detect_rooms_from_image(
        image_url=image_url,
        api_key_material={
            "encrypted_key": api_key["encrypted_key"],
            "iv": api_key["iv"],
            "auth_tag": api_key["auth_tag"],
        },
    )

    return {
        "rooms": [
            {
                "id": f"room_{i}",
                "name": room.name,
                "type": room.type,
                "polygon": [{"x": p.x, "y": p.y} for p in room.polygon],
                "lengthMm": room.length_mm,
                "widthMm": room.width_mm,
                "areaSqMm": room.area_sq_mm,
            }
            for i, room in enumerate(result.rooms)
        ],
        "width": result.width,
        "height": result.height,
        "scale": result.scale,
        "source_type": "image",
    }


def _floor_plan_to_output(floor_plan) -> dict:
    """Convert FloorPlanData to job output format."""
    rooms = []
    for room in floor_plan.rooms:
        rooms.append({
            "id": room.id,
            "name": room.name,
            "type": room.room_type,
            "polygon": [{"x": v.x, "y": v.y} for v in room.vertices],
            "lengthMm": None,
            "widthMm": None,
            "areaSqMm": room.area_sqmm,
        })

    walls = []
    for wall in floor_plan.walls:
        walls.append({
            "id": wall.id,
            "start": {"x": wall.start.x, "y": wall.start.y},
            "end": {"x": wall.end.x, "y": wall.end.y},
            "thickness_mm": wall.thickness_mm,
            "wall_type": wall.wall_type.value if hasattr(wall.wall_type, "value") else str(wall.wall_type),
            "height_mm": wall.height_mm,
            "length_mm": wall.length_mm,
        })

    openings = []
    for opening in floor_plan.openings:
        openings.append({
            "id": opening.id,
            "type": opening.type.value if hasattr(opening.type, "value") else str(opening.type),
            "wall_id": opening.wall_id,
            "width_mm": opening.width_mm,
            "height_mm": opening.height_mm,
        })

    return {
        "rooms": rooms,
        "walls": walls,
        "openings": openings,
        "dimensions": [
            {
                "start": {"x": d.start.x, "y": d.start.y},
                "end": {"x": d.end.x, "y": d.end.y},
                "value_mm": d.value_mm,
            }
            for d in floor_plan.dimensions
        ],
        "source_type": floor_plan.source_type,
        "wall_count": floor_plan.wall_count,
        "room_count": floor_plan.room_count,
        "opening_count": floor_plan.opening_count,
        "total_area_sqm": floor_plan.total_area_sqm,
    }


async def _run_detection(
    job_id: str,
    user_id: str,
    image_url: str,
) -> None:
    """Background task: run VLM room detection and persist results."""
    session_factory = get_session_factory()
    async with session_factory() as db:
        try:
            await update_job_status(db, job_id, status="running", progress=20)

            # Get user's API key for OpenAI
            api_key = await get_user_api_key(db, user_id, provider="openai")
            if api_key is None:
                await update_job_status(
                    db, job_id, status="failed",
                    error="No API key configured for provider 'openai'",
                )
                return

            await update_job_status(db, job_id, status="running", progress=40)

            # Run VLM detection
            result = await detect_rooms_from_image(
                image_url=image_url,
                api_key_material={
                    "encrypted_key": api_key["encrypted_key"],
                    "iv": api_key["iv"],
                    "auth_tag": api_key["auth_tag"],
                },
            )

            await update_job_status(db, job_id, status="running", progress=80)

            # Persist result as job output
            output = {
                "rooms": [
                    {
                        "id": f"room_{i}",
                        "name": room.name,
                        "type": room.type,
                        "polygon": [{"x": p.x, "y": p.y} for p in room.polygon],
                        "lengthMm": room.length_mm,
                        "widthMm": room.width_mm,
                        "areaSqMm": room.area_sq_mm,
                    }
                    for i, room in enumerate(result.rooms)
                ],
                "width": result.width,
                "height": result.height,
                "scale": result.scale,
            }

            await update_job_status(
                db, job_id,
                status="completed",
                progress=100,
                output_json=output,
            )

            logger.info(
                "vision_job_completed",
                job_id=job_id,
                rooms_detected=len(result.rooms),
            )

        except Exception as exc:
            logger.error("vision_job_failed", job_id=job_id, error=str(exc))
            await update_job_status(db, job_id, status="failed", error=str(exc))
