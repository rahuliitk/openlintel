"""
File upload validation.

Checks MIME type, file size, image resolution, and whether the file is corrupt
before allowing it through the upload pipeline.
"""

from __future__ import annotations

import io
from typing import NamedTuple

from PIL import Image

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

ALLOWED_MIME_TYPES: dict[str, list[str]] = {
    # Images
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/webp": [".webp"],
    "image/gif": [".gif"],
    # PDF
    "application/pdf": [".pdf"],
    # DWG (no official IANA type — browsers vary)
    "application/acad": [".dwg"],
    "application/x-acad": [".dwg"],
    "application/x-autocad": [".dwg"],
    "application/dwg": [".dwg"],
    "image/x-dwg": [".dwg"],
    "image/vnd.dwg": [".dwg"],
    # DXF
    "application/dxf": [".dxf"],
    "application/x-dxf": [".dxf"],
    "image/vnd.dxf": [".dxf"],
    "image/x-dxf": [".dxf"],
    # Fallback for CAD files
    "application/octet-stream": [],
}

# Extensions that are always allowed (overrides MIME check)
ALLOWED_EXTENSIONS: set[str] = {".dwg", ".dxf", ".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif"}

# CAD file extensions (skip image integrity checks)
CAD_EXTENSIONS: set[str] = {".dwg", ".dxf"}

# 50 MB (was 20MB — DWG files are commonly 10-40MB)
MAX_FILE_SIZE: int = 50 * 1024 * 1024

# Maximum resolution (width or height) in pixels — 16384 px
MAX_RESOLUTION: int = 16384

# Minimum resolution — reject tiny garbage uploads
MIN_RESOLUTION: int = 32


class ValidationResult(NamedTuple):
    """Outcome of file validation."""

    valid: bool
    error: str | None


def _check_mime_type(content_type: str) -> ValidationResult:
    """Verify the MIME type is in the allow list."""
    if content_type not in ALLOWED_MIME_TYPES:
        allowed = ", ".join(sorted(ALLOWED_MIME_TYPES.keys()))
        return ValidationResult(
            valid=False,
            error=f"Unsupported file type '{content_type}'. Allowed types: {allowed}",
        )
    return ValidationResult(valid=True, error=None)


def _check_file_size(size_bytes: int) -> ValidationResult:
    """Reject files that exceed the maximum upload size."""
    if size_bytes > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE / (1024 * 1024)
        actual_mb = size_bytes / (1024 * 1024)
        return ValidationResult(
            valid=False,
            error=f"File too large ({actual_mb:.1f} MB). Maximum allowed size is {max_mb:.0f} MB.",
        )
    if size_bytes == 0:
        return ValidationResult(valid=False, error="File is empty (0 bytes).")
    return ValidationResult(valid=True, error=None)


def _check_image_integrity(file_bytes: bytes, content_type: str) -> ValidationResult:
    """Open the image with Pillow to detect corruption and validate resolution.

    PDFs are skipped — Pillow cannot open them.
    """
    if content_type == "application/pdf":
        # PDFs pass through without pixel-level validation
        return ValidationResult(valid=True, error=None)

    try:
        img = Image.open(io.BytesIO(file_bytes))
        # Pillow lazily decodes; calling .verify() checks for corruption
        img.verify()
    except Exception:
        return ValidationResult(valid=False, error="File appears to be corrupt or not a valid image.")

    # Re-open after verify (verify leaves the image in an unusable state)
    img = Image.open(io.BytesIO(file_bytes))
    width, height = img.size

    if width > MAX_RESOLUTION or height > MAX_RESOLUTION:
        return ValidationResult(
            valid=False,
            error=(
                f"Image resolution {width}x{height} exceeds maximum "
                f"{MAX_RESOLUTION}x{MAX_RESOLUTION} pixels."
            ),
        )

    if width < MIN_RESOLUTION or height < MIN_RESOLUTION:
        return ValidationResult(
            valid=False,
            error=(
                f"Image resolution {width}x{height} is below the minimum "
                f"{MIN_RESOLUTION}x{MIN_RESOLUTION} pixels."
            ),
        )

    return ValidationResult(valid=True, error=None)


def _get_extension(filename: str) -> str:
    """Extract lowercase file extension with dot."""
    if not filename:
        return ""
    parts = filename.rsplit(".", 1)
    return f".{parts[-1].lower()}" if len(parts) > 1 else ""


def validate_file(
    file_bytes: bytes,
    content_type: str,
    filename: str = "",
) -> ValidationResult:
    """Run all validations on an uploaded file.

    Parameters
    ----------
    file_bytes:
        The raw bytes of the uploaded file.
    content_type:
        The declared MIME type (from the ``Content-Type`` header or the
        ``UploadFile.content_type`` attribute).
    filename:
        Original filename — used for extension-based CAD file detection.

    Returns
    -------
    ValidationResult
        ``(True, None)`` when all checks pass, or ``(False, error_message)``
        on the first failing check.
    """
    # Extension-based override for CAD files
    ext = _get_extension(filename)
    is_cad = ext in CAD_EXTENSIONS

    # 1. File size
    result = _check_file_size(len(file_bytes))
    if not result.valid:
        return result

    # 2. MIME check — relaxed for known CAD extensions
    if not is_cad:
        result = _check_mime_type(content_type)
        if not result.valid:
            # Also check extension
            if ext not in ALLOWED_EXTENSIONS:
                return result

    # 3. Image integrity — skip for CAD and PDF files
    if not is_cad and content_type != "application/pdf":
        result = _check_image_integrity(file_bytes, content_type)
        if not result.valid:
            return result

    return ValidationResult(valid=True, error=None)
