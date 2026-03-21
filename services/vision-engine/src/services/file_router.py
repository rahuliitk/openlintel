"""
File-type detection and routing for floor plan digitization.

Routes uploaded files to the correct processing pipeline:
- DWG files -> DWG converter -> DXF parser -> FloorPlanData
- DXF files -> DXF parser -> FloorPlanData
- PDF files -> PDF extractor -> VLM extraction -> FloorPlanData
- Images   -> VLM extraction -> FloorPlanData

All paths converge on FloorPlanData as the canonical output format.
"""

from __future__ import annotations

import logging
from enum import Enum

logger = logging.getLogger(__name__)


class FileType(str, Enum):
    """Detected file type categories."""
    DWG = "dwg"
    DXF = "dxf"
    PDF = "pdf"
    IMAGE = "image"
    UNKNOWN = "unknown"


# MIME types grouped by FileType
_MIME_MAP: dict[str, FileType] = {
    # DWG
    "application/acad": FileType.DWG,
    "application/x-acad": FileType.DWG,
    "application/x-autocad": FileType.DWG,
    "application/dwg": FileType.DWG,
    "image/x-dwg": FileType.DWG,
    "image/vnd.dwg": FileType.DWG,
    # DXF
    "application/dxf": FileType.DXF,
    "application/x-dxf": FileType.DXF,
    "image/vnd.dxf": FileType.DXF,
    "image/x-dxf": FileType.DXF,
    # PDF
    "application/pdf": FileType.PDF,
    # Images
    "image/jpeg": FileType.IMAGE,
    "image/png": FileType.IMAGE,
    "image/webp": FileType.IMAGE,
    "image/gif": FileType.IMAGE,
}

_EXT_MAP: dict[str, FileType] = {
    ".dwg": FileType.DWG,
    ".dxf": FileType.DXF,
    ".pdf": FileType.PDF,
    ".jpg": FileType.IMAGE,
    ".jpeg": FileType.IMAGE,
    ".png": FileType.IMAGE,
    ".webp": FileType.IMAGE,
    ".gif": FileType.IMAGE,
}

# DWG magic bytes: "AC10" (ASCII) at offset 0
_DWG_MAGIC = b"AC10"


def detect_file_type(
    *,
    mime_type: str = "",
    filename: str = "",
    file_bytes: bytes | None = None,
) -> FileType:
    """Detect the file type using MIME, extension, and magic bytes.

    Priority: magic bytes > extension > MIME type.

    Parameters
    ----------
    mime_type:
        Content-Type header value.
    filename:
        Original filename with extension.
    file_bytes:
        First few bytes of the file for magic-byte detection.

    Returns
    -------
    FileType
        Detected file category.
    """
    # 1. Magic bytes (most reliable for DWG)
    if file_bytes and len(file_bytes) >= 4:
        if file_bytes[:4] == _DWG_MAGIC or file_bytes[:2] == b"AC":
            logger.debug("Detected DWG via magic bytes")
            return FileType.DWG

    # 2. File extension (reliable for most cases)
    if filename:
        ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        ext_type = _EXT_MAP.get(ext)
        if ext_type:
            logger.debug("Detected %s via extension: %s", ext_type.value, ext)
            return ext_type

    # 3. MIME type (least reliable for CAD files)
    mime_type_lower = mime_type.lower().strip()
    mime_result = _MIME_MAP.get(mime_type_lower)
    if mime_result:
        logger.debug("Detected %s via MIME: %s", mime_result.value, mime_type_lower)
        return mime_result

    # 4. application/octet-stream -- check extension again
    if mime_type_lower == "application/octet-stream" and filename:
        ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        ext_type = _EXT_MAP.get(ext)
        if ext_type:
            return ext_type

    logger.warning(
        "Could not detect file type: mime=%s, filename=%s",
        mime_type,
        filename,
    )
    return FileType.UNKNOWN


def requires_conversion(file_type: FileType) -> bool:
    """Whether the file needs conversion before DXF parsing."""
    return file_type == FileType.DWG


def requires_vlm(file_type: FileType) -> bool:
    """Whether the file needs VLM (vision-language model) processing."""
    return file_type in (FileType.IMAGE, FileType.PDF)


def can_parse_directly(file_type: FileType) -> bool:
    """Whether the file can be parsed directly with ezdxf."""
    return file_type == FileType.DXF
