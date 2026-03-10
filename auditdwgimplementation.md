# DWG/PDF to BOM — Step-by-Step Implementation Guide

**Based on:** `codeauditdwg.md` audit findings
**Date:** 2026-03-09
**Scope:** Complete implementation plan to enable DWG/PDF upload → floor plan parsing → BOM generation

---

## Table of Contents

1. [Implementation Overview](#1-implementation-overview)
2. [Step 1: Backend Upload API — Accept DWG/DXF Files](#2-step-1-backend-upload-api)
3. [Step 2: Media Service — CAD File Support](#3-step-2-media-service)
4. [Step 3: DWG Converter Module](#4-step-3-dwg-converter)
5. [Step 4: PDF Floor Plan Extraction](#5-step-4-pdf-floor-plan-extraction)
6. [Step 5: Vision Engine — File-Type Router](#6-step-5-vision-engine-file-type-router)
7. [Step 6: Enhanced DXF Parser](#7-step-6-enhanced-dxf-parser)
8. [Step 7: Structural BOM Generator](#8-step-7-structural-bom-generator)
9. [Step 8: BOM Engine — Floor Plan Endpoint](#9-step-8-bom-engine-floor-plan-endpoint)
10. [Step 9: tRPC Router & Frontend Integration](#10-step-9-trpc-router-frontend)
11. [Step 10: Database Schema Changes](#11-step-10-database-schema)
12. [Step 11: Docker & Infrastructure](#12-step-11-docker-infrastructure)
13. [Step 12: Testing Strategy](#13-step-12-testing)
14. [Dependency Map & Build Order](#14-dependency-map)
15. [File Manifest](#15-file-manifest)

---

## 1. Implementation Overview

### The Three Broken Links (from audit)

```
LINK 1 (Upload Gate):
  Frontend accepts .dwg → Backend REJECTS (MIME types not in allowlist)

LINK 2 (DWG Reader):
  pipeline.py imports dwg_converter → Module DOES NOT EXIST

LINK 3 (Floor Plan → BOM Bridge):
  FloorPlanData has walls/rooms/openings → BOM engine only accepts design variant spec_json
```

### Build Order (Dependency Chain)

```
Step 1:  Upload API (route.ts)           ── unblocks file ingestion
Step 2:  Media Service (validator.py)     ── unblocks server-side validation
Step 3:  DWG Converter (dwg_converter.py) ── unblocks DWG→DXF conversion
Step 4:  PDF Extractor (pdf_extractor.py) ── unblocks PDF floor plan processing
Step 5:  Vision Engine Router             ── routes files to correct pipeline
Step 6:  Enhanced DXF Parser              ── extracts richer structural data
Step 7:  Structural BOM Generator         ── converts geometry → materials
Step 8:  BOM Engine Endpoint              ── exposes /bom/from-floor-plan API
Step 9:  tRPC + Frontend                  ── user-facing integration
Step 10: Database Schema                  ── floor_plan_bom_results table
Step 11: Docker/Infra                     ── LibreDWG, poppler-utils packages
Step 12: Tests                            ── end-to-end validation
```

### Files to Create (New)

| # | File | Purpose |
|---|------|---------|
| 1 | `ml/floor-plan-digitizer/src/openlintel_digitizer/dwg_converter.py` | DWG→DXF conversion via LibreDWG/ODA |
| 2 | `ml/floor-plan-digitizer/src/openlintel_digitizer/pdf_extractor.py` | PDF→Image extraction for floor plans |
| 3 | `services/bom-engine/src/services/structural_bom.py` | Geometry→BOM material calculation |
| 4 | `services/bom-engine/src/models/floor_plan_bom.py` | Pydantic models for floor-plan BOM |
| 5 | `services/vision-engine/src/services/file_router.py` | File-type detection and routing |

### Files to Modify (Existing)

| # | File | Change |
|---|------|--------|
| 1 | `apps/web/src/app/api/upload/route.ts` | Add DWG/DXF MIME types, increase size limit |
| 2 | `services/media-service/src/services/validator.py` | Add CAD MIME types |
| 3 | `services/media-service/src/routers/upload.py` | Add DWG/DXF extension mapping |
| 4 | `services/vision-engine/src/routers/vision.py` | Add file-type routing before VLM |
| 5 | `services/vision-engine/main.py` | Register new router |
| 6 | `ml/floor-plan-digitizer/src/openlintel_digitizer/pipeline.py` | Wire PDF extractor |
| 7 | `ml/floor-plan-digitizer/pyproject.toml` | Add pdf2image, pdfplumber deps |
| 8 | `services/bom-engine/src/routers/bom.py` | Add /from-floor-plan endpoint |
| 9 | `services/bom-engine/pyproject.toml` | Add ezdxf dependency |
| 10 | `apps/web/src/server/trpc/routers/bom.ts` | Add generateFromFloorPlan mutation |
| 11 | `apps/web/src/server/trpc/routers/floorPlan.ts` | Add file-type aware digitization |
| 12 | `apps/web/src/app/(dashboard)/project/[id]/bom/page.tsx` | Add "BOM from Floor Plan" button |
| 13 | `packages/db/src/schema/app.ts` | Add floor_plan_bom_results table |
| 14 | `packages/python-shared/src/openlintel_shared/job_worker.py` | Add write_floor_plan_bom_result |
| 15 | `docker-compose.yml` | Add system deps to service images |

---

## 2. Step 1: Backend Upload API — Accept DWG/DXF Files

### Why This Is First
Every other step depends on files actually reaching the server. Currently, the upload API at `apps/web/src/app/api/upload/route.ts` rejects DWG/DXF with "Unsupported file type" because only image and PDF MIME types are allowed (line 9-15).

### 2.1 Modify `apps/web/src/app/api/upload/route.ts`

**Current code (lines 8-15):**
```typescript
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];
```

**Replace with:**
```typescript
const MAX_SIZE = 50 * 1024 * 1024; // 50MB — DWG files are commonly 10-40MB

// MIME types sent by browsers for each format.
// DWG has no official IANA MIME type — browsers vary widely.
const ALLOWED_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  // PDF
  'application/pdf',
  // DWG — browsers send different types depending on OS/browser
  'application/acad',
  'application/x-acad',
  'application/x-autocad',
  'application/dwg',
  'image/x-dwg',
  'image/vnd.dwg',
  // DXF
  'application/dxf',
  'application/x-dxf',
  'image/vnd.dxf',
  'image/x-dxf',
  // Fallback — many browsers send this for unknown binary formats
  'application/octet-stream',
];

// Because DWG/DXF MIME detection is unreliable, also validate by extension
const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'dwg', 'dxf',
]);

const CAD_EXTENSIONS = new Set(['dwg', 'dxf']);
```

**Add extension validation function (after line 17):**
```typescript
function getFileExtension(filename: string): string {
  return (filename.split('.').pop() ?? '').toLowerCase();
}

function isAllowedFile(file: File): boolean {
  const ext = getFileExtension(file.name);
  // If extension is in our allowed list, accept regardless of MIME type
  if (ALLOWED_EXTENSIONS.has(ext)) return true;
  // Otherwise fall back to MIME type check
  return ALLOWED_TYPES.includes(file.type);
}

function isCADFile(filename: string): boolean {
  return CAD_EXTENSIONS.has(getFileExtension(filename));
}
```

**Modify the POST handler validation block (lines 56-62):**

Replace:
```typescript
if (!ALLOWED_TYPES.includes(file.type)) {
  return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
}
```

With:
```typescript
if (!isAllowedFile(file)) {
  return NextResponse.json(
    { error: `Unsupported file type. Allowed: images, PDF, DWG, DXF` },
    { status: 400 },
  );
}
```

**Modify thumbnail/hash logic (lines 88-97) to skip for CAD files:**

Replace:
```typescript
// Generate thumbnail for images
let thumbnailKey: string | null = null;
const thumbnail = await generateThumbnail(buffer, file.type);
if (thumbnail) {
  thumbnailKey = storageKey.replace(/\.[^.]+$/, '_thumb.jpg');
  await saveFile(thumbnail, thumbnailKey, 'image/jpeg');
}

// Compute image hash for deduplication
const imageHash = IMAGE_TYPES.includes(file.type) ? computeImageHash(buffer) : null;
```

With:
```typescript
// Generate thumbnail for images (not for CAD files)
let thumbnailKey: string | null = null;
const isCad = isCADFile(file.name);
if (!isCad) {
  const thumbnail = await generateThumbnail(buffer, file.type);
  if (thumbnail) {
    thumbnailKey = storageKey.replace(/\.[^.]+$/, '_thumb.jpg');
    await saveFile(thumbnail, thumbnailKey, 'image/jpeg');
  }
}

// Compute image hash for deduplication (images only)
const imageHash = IMAGE_TYPES.includes(file.type) ? computeImageHash(buffer) : null;
```

### 2.2 Why `application/octet-stream` Is Safe Here

Including `application/octet-stream` in the allow-list might seem risky. It is safe because:
1. We still validate by file extension (`ALLOWED_EXTENSIONS`)
2. The `isAllowedFile` function requires EITHER a known extension OR a known MIME type
3. CAD files from most browsers will come as `octet-stream` + `.dwg` extension
4. Files without a known extension AND with `octet-stream` type will be rejected

**However**, if you prefer stricter validation, use this alternative:
```typescript
function isAllowedFile(file: File): boolean {
  const ext = getFileExtension(file.name);
  if (!ALLOWED_EXTENSIONS.has(ext)) return false; // Extension MUST match
  // For non-CAD files, also check MIME type
  if (!CAD_EXTENSIONS.has(ext) && !ALLOWED_TYPES.includes(file.type)) return false;
  return true;
}
```

### 2.3 Verification

After this change:
- Uploading `floorplan.dwg` → stored in MinIO with storage key
- Uploading `floorplan.dxf` → stored in MinIO with storage key
- Uploading `plan.pdf` → still works (no change)
- Uploading `photo.jpg` → still works (no change)
- Uploading `malware.exe` → rejected ("Unsupported file type")

---

## 3. Step 2: Media Service — CAD File Support

### 3.1 Modify `services/media-service/src/services/validator.py`

**Current `ALLOWED_MIME_TYPES` (in the file):**
```python
ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "application/pdf",
}
```

**Replace with:**
```python
ALLOWED_MIME_TYPES = {
    # Images
    "image/jpeg", "image/png", "image/webp", "image/gif",
    # PDF
    "application/pdf",
    # DWG (no official IANA type — browsers vary)
    "application/acad", "application/x-acad", "application/x-autocad",
    "application/dwg", "image/x-dwg", "image/vnd.dwg",
    # DXF
    "application/dxf", "application/x-dxf",
    "image/vnd.dxf", "image/x-dxf",
    # Fallback for CAD files
    "application/octet-stream",
}

# Extensions that are always allowed (overrides MIME check)
ALLOWED_EXTENSIONS = {".dwg", ".dxf", ".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif"}

# CAD file extensions (skip image integrity checks)
CAD_EXTENSIONS = {".dwg", ".dxf"}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB (was 20MB)
```

**Modify `validate_file()` to accept CAD files:**
```python
def validate_file(
    file_bytes: bytes,
    content_type: str,
    filename: str = "",  # NEW parameter
) -> ValidationResult:
    """Validate an uploaded file."""
    # Extension-based override for CAD files
    ext = _get_extension(filename)
    is_cad = ext in CAD_EXTENSIONS

    # Size check
    size_result = _check_file_size(file_bytes)
    if not size_result.valid:
        return size_result

    # MIME check — relaxed for known CAD extensions
    if not is_cad:
        mime_result = _check_mime_type(content_type)
        if not mime_result.valid:
            # Also check extension
            if ext not in ALLOWED_EXTENSIONS:
                return mime_result

    # Image integrity — skip for CAD and PDF files
    if not is_cad and content_type != "application/pdf":
        integrity_result = _check_image_integrity(file_bytes)
        if not integrity_result.valid:
            return integrity_result

    return ValidationResult(valid=True, error=None)


def _get_extension(filename: str) -> str:
    """Extract lowercase file extension with dot."""
    if not filename:
        return ""
    parts = filename.rsplit(".", 1)
    return f".{parts[-1].lower()}" if len(parts) > 1 else ""
```

### 3.2 Modify `services/media-service/src/routers/upload.py`

**Update `_mime_to_extension()` (line 59-68):**
```python
def _mime_to_extension(mime_type: str, filename: str = "") -> str:
    """Map MIME type to a file extension, with filename fallback."""
    mapping: dict[str, str] = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
        "application/pdf": ".pdf",
    }
    ext = mapping.get(mime_type)
    if ext:
        return ext
    # For CAD files, derive from original filename
    if filename:
        original_ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if original_ext in ("dwg", "dxf"):
            return f".{original_ext}"
    return ".bin"
```

**Update `_build_metadata()` (line 71-103) to handle CAD files:**
```python
def _build_metadata(
    image_bytes: bytes,
    mime_type: str,
    original_size: int,
    filename: str = "",
) -> MediaMetadata:
    """Build a MediaMetadata object from file bytes."""
    exif = extract_metadata(image_bytes)
    image_hash = compute_image_hash(image_bytes)

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    # For PDFs and CAD files, we cannot extract pixel dimensions
    if mime_type == "application/pdf" or ext in ("dwg", "dxf"):
        return MediaMetadata(
            width=0,
            height=0,
            format=ext.upper() if ext in ("dwg", "dxf") else "PDF",
            mode="N/A",
            file_size_bytes=original_size,
            has_alpha=False,
            image_hash=image_hash,
            exif=exif,
        )

    img = Image.open(io.BytesIO(image_bytes))
    return MediaMetadata(
        width=img.width,
        height=img.height,
        format=img.format or mime_type.split("/")[-1].upper(),
        mode=img.mode,
        file_size_bytes=original_size,
        has_alpha=img.mode in ("RGBA", "LA", "PA"),
        image_hash=image_hash,
        exif=exif,
    )
```

**Update the upload endpoint to pass filename through:**

In the `upload_media()` function, update the `validate_file` and `_build_metadata` calls:
```python
result = validate_file(file_bytes, content_type, filename=original_filename)
# ...
metadata = _build_metadata(file_bytes, content_type, original_size, filename=original_filename)
# ...
ext = _mime_to_extension(content_type, filename=original_filename)
```

---

## 4. Step 3: DWG Converter Module

### 4.1 Create `ml/floor-plan-digitizer/src/openlintel_digitizer/dwg_converter.py`

This is the **CRITICAL missing module** identified in the audit. The pipeline at `pipeline.py:169` imports `DWGConverter` from this module, but it was never created.

```python
"""
DWG to DXF conversion using LibreDWG or ODA File Converter.

Conversion strategy (in priority order):
1. LibreDWG ``dwg2dxf`` — open-source, GPLv3, supports R2000–R2018.
2. ODA File Converter — free (proprietary), supports R14–R2024.
3. Neither available → raise RuntimeError with install instructions.

Usage::

    converter = DWGConverter()
    if converter.is_available:
        dxf_path = await converter.convert("input.dwg")
    else:
        print(converter.install_instructions)

The converted DXF is then parsed by ``ezdxf`` via ``FloorPlanPipeline._parse_dxf()``.
"""

from __future__ import annotations

import asyncio
import logging
import shutil
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)


class ConversionError(Exception):
    """Raised when DWG-to-DXF conversion fails."""


class DWGConverter:
    """Converts DWG files to DXF format using available system tools.

    Parameters
    ----------
    libredwg_path:
        Explicit path to the ``dwg2dxf`` binary.  If ``None``, searches ``$PATH``.
    oda_converter_path:
        Explicit path to the ``ODAFileConverter`` binary.  If ``None``, searches ``$PATH``.
    timeout_seconds:
        Maximum time to wait for a conversion subprocess.
    """

    def __init__(
        self,
        *,
        libredwg_path: str | None = None,
        oda_converter_path: str | None = None,
        timeout_seconds: int = 120,
    ) -> None:
        self._libredwg = libredwg_path or shutil.which("dwg2dxf")
        self._oda = oda_converter_path or shutil.which("ODAFileConverter")
        self._timeout = timeout_seconds

    # -- Public properties -----------------------------------------------------

    @property
    def is_available(self) -> bool:
        """True if at least one conversion backend is installed."""
        return bool(self._libredwg or self._oda)

    @property
    def backend(self) -> str:
        """Name of the active backend: ``'libredwg'``, ``'oda'``, or ``'none'``."""
        if self._libredwg:
            return "libredwg"
        if self._oda:
            return "oda"
        return "none"

    @property
    def install_instructions(self) -> str:
        """Human-readable install instructions when no backend is found."""
        return (
            "No DWG conversion backend found.\n"
            "Install one of:\n"
            "  1. LibreDWG (open source):\n"
            "     Ubuntu/Debian: sudo apt-get install libredwg-utils\n"
            "     macOS:         brew install libredwg\n"
            "  2. ODA File Converter (free, proprietary):\n"
            "     Download from https://www.opendesign.com/guestfiles/oda_file_converter\n"
        )

    # -- Public API ------------------------------------------------------------

    async def convert(
        self,
        dwg_path: str | Path,
        *,
        output_path: str | Path | None = None,
        dxf_version: str = "R2013",
    ) -> Path:
        """Convert a DWG file to DXF.

        Parameters
        ----------
        dwg_path:
            Path to the input ``.dwg`` file.
        output_path:
            Destination for the ``.dxf`` file.  Defaults to the same directory
            and basename as the input with ``.dxf`` extension.
        dxf_version:
            Target DXF version (used by ODA converter).  LibreDWG outputs
            the version matching the source DWG.

        Returns
        -------
        Path
            Absolute path to the generated DXF file.

        Raises
        ------
        FileNotFoundError
            If the input DWG file does not exist.
        ConversionError
            If the conversion subprocess fails.
        RuntimeError
            If no conversion backend is available.
        """
        dwg_path = Path(dwg_path).resolve()
        if not dwg_path.exists():
            raise FileNotFoundError(f"DWG file not found: {dwg_path}")
        if not dwg_path.suffix.lower() == ".dwg":
            raise ValueError(f"Expected .dwg file, got: {dwg_path.suffix}")

        if output_path is None:
            output_path = dwg_path.with_suffix(".dxf")
        output_path = Path(output_path).resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)

        logger.info(
            "Converting DWG→DXF: %s → %s (backend=%s)",
            dwg_path.name,
            output_path.name,
            self.backend,
        )

        if self._libredwg:
            return await self._convert_libredwg(dwg_path, output_path)
        elif self._oda:
            return await self._convert_oda(dwg_path, output_path, dxf_version)
        else:
            raise RuntimeError(self.install_instructions)

    async def check_health(self) -> dict[str, str | bool]:
        """Check which backends are available and their versions."""
        result: dict[str, str | bool] = {
            "available": self.is_available,
            "backend": self.backend,
        }

        if self._libredwg:
            try:
                proc = await asyncio.create_subprocess_exec(
                    self._libredwg, "--version",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=5)
                result["libredwg_version"] = stdout.decode().strip()
            except Exception as exc:
                result["libredwg_error"] = str(exc)

        if self._oda:
            result["oda_path"] = self._oda

        return result

    # -- Private conversion methods --------------------------------------------

    async def _convert_libredwg(
        self,
        dwg_path: Path,
        output_path: Path,
    ) -> Path:
        """Convert using LibreDWG's ``dwg2dxf`` command-line tool.

        Command: ``dwg2dxf -o <output.dxf> <input.dwg>``

        LibreDWG preserves the DWG's native version in the output DXF.
        Supports AutoCAD R2000 through R2018 formats.
        """
        cmd = [self._libredwg, "-o", str(output_path), str(dwg_path)]

        logger.debug("Running: %s", " ".join(cmd))

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(),
                timeout=self._timeout,
            )
        except asyncio.TimeoutError:
            proc.kill()
            raise ConversionError(
                f"LibreDWG conversion timed out after {self._timeout}s "
                f"for {dwg_path.name}"
            )

        if proc.returncode != 0:
            error_msg = stderr.decode().strip() or stdout.decode().strip()
            raise ConversionError(
                f"dwg2dxf exited with code {proc.returncode}: {error_msg}"
            )

        if not output_path.exists():
            raise ConversionError(
                f"dwg2dxf completed but output file not found: {output_path}"
            )

        logger.info(
            "LibreDWG conversion successful: %s (%d bytes)",
            output_path.name,
            output_path.stat().st_size,
        )
        return output_path

    async def _convert_oda(
        self,
        dwg_path: Path,
        output_path: Path,
        dxf_version: str,
    ) -> Path:
        """Convert using ODA File Converter.

        ODA works on entire directories, so we:
        1. Copy the DWG into a temp input directory
        2. Run ODAFileConverter with input_dir, output_dir, version, format
        3. Copy the resulting DXF to the desired output path
        4. Clean up temp directories

        ODA command:
          ODAFileConverter <input_dir> <output_dir> <version> <format> <recurse> <audit>
          Example: ODAFileConverter /tmp/in /tmp/out ACAD2013 DXF 0 1
        """
        oda_version_map = {
            "R14": "ACAD14",
            "R2000": "ACAD2000",
            "R2004": "ACAD2004",
            "R2007": "ACAD2007",
            "R2010": "ACAD2010",
            "R2013": "ACAD2013",
            "R2018": "ACAD2018",
        }
        oda_version = oda_version_map.get(dxf_version, "ACAD2013")

        with tempfile.TemporaryDirectory(prefix="openlintel_oda_") as tmpdir:
            input_dir = Path(tmpdir) / "input"
            output_dir = Path(tmpdir) / "output"
            input_dir.mkdir()
            output_dir.mkdir()

            # Copy DWG to input directory
            shutil.copy2(dwg_path, input_dir / dwg_path.name)

            cmd = [
                self._oda,
                str(input_dir),
                str(output_dir),
                oda_version,
                "DXF",
                "0",  # recurse = no
                "1",  # audit = yes
            ]

            logger.debug("Running: %s", " ".join(cmd))

            try:
                proc = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(),
                    timeout=self._timeout,
                )
            except asyncio.TimeoutError:
                proc.kill()
                raise ConversionError(
                    f"ODA conversion timed out after {self._timeout}s "
                    f"for {dwg_path.name}"
                )

            # ODA does not always return non-zero on failure
            converted_files = list(output_dir.glob("*.dxf"))

            if not converted_files:
                error_msg = stderr.decode().strip() or stdout.decode().strip()
                raise ConversionError(
                    f"ODA File Converter produced no DXF output. "
                    f"Return code: {proc.returncode}. "
                    f"Error: {error_msg or 'unknown'}"
                )

            # Copy the first (and usually only) DXF to desired output
            shutil.copy2(converted_files[0], output_path)

        logger.info(
            "ODA conversion successful: %s (%d bytes)",
            output_path.name,
            output_path.stat().st_size,
        )
        return output_path
```

### 4.2 Update `ml/floor-plan-digitizer/pyproject.toml`

Add the new dependencies under `[project.dependencies]`:

```toml
[project]
dependencies = [
    "ezdxf>=1.3,<2",
    "opencv-python-headless>=4.9,<5",
    "numpy>=1.26,<2",
    "pillow>=11.0,<12",
    "litellm>=1.50,<2",
    "pydantic>=2.10,<3",
    "structlog>=24.0,<25",
    # NEW: PDF floor plan extraction
    "pdf2image>=1.16,<2",
    "pdfplumber>=0.11,<1",
]
```

### 4.3 Verify Pipeline Integration

The existing `pipeline.py:169` already does:
```python
from openlintel_digitizer.dwg_converter import DWGConverter
```

Once `dwg_converter.py` is created, this import will resolve and the `digitize_dwg()` method (lines 146-200) will work as designed. **No changes to `pipeline.py` are needed for DWG support** — the scaffolding was already correct.

---

## 5. Step 4: PDF Floor Plan Extraction

### 5.1 Create `ml/floor-plan-digitizer/src/openlintel_digitizer/pdf_extractor.py`

```python
"""
PDF floor plan extraction — converts PDF pages to images for VLM processing,
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
        analysis — high enough for text/line clarity, low enough for
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
```

### 5.2 Update Pipeline to Support PDF Input

**Modify `ml/floor-plan-digitizer/src/openlintel_digitizer/pipeline.py`**

Add a new method after `digitize_dxf()` (around line 220):

```python
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
```

Also add to `__init__.py` exports:

```python
from openlintel_digitizer.pdf_extractor import PDFFloorPlanExtractor
```

---

## 6. Step 5: Vision Engine — File-Type Router

### 6.1 Create `services/vision-engine/src/services/file_router.py`

This service determines the processing strategy based on file type and routes to the correct pipeline.

```python
"""
File-type detection and routing for floor plan digitization.

Routes uploaded files to the correct processing pipeline:
- DWG files → DWG converter → DXF parser → FloorPlanData
- DXF files → DXF parser → FloorPlanData
- PDF files → PDF extractor → VLM extraction → FloorPlanData
- Images   → VLM extraction → FloorPlanData

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

    # 4. application/octet-stream — check extension again
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
```

### 6.2 Modify `services/vision-engine/src/routers/vision.py`

Add a new endpoint alongside the existing `/job` endpoint. Add this after line 68:

```python
class FloorPlanDigitizeInput(BaseModel):
    """Request model for the enhanced floor plan digitization job."""
    job_id: str
    user_id: str
    project_id: str
    upload_id: str
    storage_key: str
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

    from openlintel_shared.config import get_settings
    from openlintel_shared.storage import download_file

    from src.services.file_router import FileType, detect_file_type

    session_factory = get_session_factory()
    settings = get_settings()
    async with session_factory() as db:
        try:
            await update_job_status(db, job_id, status="running", progress=10)

            # Download file from MinIO
            bucket = settings.MINIO_BUCKET
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
                output = await _process_dwg(db, job_id, file_bytes, filename, user_id)
            elif file_type == FileType.DXF:
                output = await _process_dxf(db, job_id, file_bytes, filename)
            elif file_type == FileType.PDF:
                output = await _process_pdf(db, job_id, file_bytes, user_id)
            elif file_type == FileType.IMAGE:
                output = await _process_image(db, job_id, storage_key, user_id)
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


async def _process_dwg(db, job_id, file_bytes, filename, user_id):
    """DWG → DXF → FloorPlanData."""
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
    """DXF → FloorPlanData (direct parsing, no conversion needed)."""
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
    """PDF → Image → VLM → FloorPlanData."""
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


async def _process_image(db, job_id, storage_key, user_id):
    """Image → VLM → FloorPlanData (existing pipeline)."""
    from openlintel_shared.config import get_settings
    settings = get_settings()
    origin = f"http://localhost:{settings.PORT}" if hasattr(settings, "PORT") else "http://localhost:3000"
    image_url = f"{origin}/api/uploads/{storage_key}"

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
    for i, room in enumerate(floor_plan.rooms):
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
```

### 6.3 Update `services/vision-engine/pyproject.toml`

Add floor-plan-digitizer as a dependency:

```toml
dependencies = [
    "openlintel-shared",
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.32.0",
    "litellm>=1.50.0",
    # NEW: Floor plan digitizer for DWG/DXF/PDF processing
    "openlintel-floor-plan-digitizer",
]
```

---

## 7. Step 6: Enhanced DXF Parser

### 7.1 Improve `pipeline.py:_parse_dxf()` for Richer Extraction

The current parser (lines 260-339) extracts walls and rooms, but misses doors, windows, blocks, and dimension entities. Modify the `_parse_dxf` method in `ml/floor-plan-digitizer/src/openlintel_digitizer/pipeline.py`:

**Replace the `_parse_dxf` method (lines 259-339) with:**

```python
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

    # ── Extract walls from LINE entities ──────────────────────────────
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

    # ── Extract rooms from LWPOLYLINE entities ────────────────────────
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

    # ── Extract doors/windows from INSERT entities (block references) ─
    for entity in msp.query("INSERT"):
        block_name = entity.dxf.name.lower()
        layer = entity.dxf.layer.lower()
        insert_point = entity.dxf.insert

        is_door = (
            _layer_matches(layer, door_patterns)
            or any(d in block_name for d in ("door", "dr", "entrance"))
        )
        is_window = (
            _layer_matches(layer, window_patterns)
            or any(w in block_name for w in ("window", "wndw", "glazing"))
        )

        if is_door or is_window:
            opening_type = DoorWindowType.SINGLE_DOOR if is_door else DoorWindowType.SINGLE_WINDOW

            # Try to get width from block definition
            width_mm = 900.0 if is_door else 1200.0
            try:
                block = doc.blocks.get(entity.dxf.name)
                if block:
                    # Estimate width from block extents
                    from ezdxf.bbox import extents
                    bbox = extents(block)
                    if bbox.has_data:
                        width_mm = abs(bbox.extmax.x - bbox.extmin.x)
                        if width_mm < 100:  # Probably in a different unit
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

    # ── Extract dimensions from DIMENSION entities ────────────────────
    for entity in msp.query("DIMENSION"):
        try:
            # Get dimension measurement points
            if hasattr(entity.dxf, "defpoint") and hasattr(entity.dxf, "defpoint2"):
                start = entity.dxf.defpoint
                end = entity.dxf.defpoint2
                # Calculate distance
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

    # ── Fallback: if no wall layers found, treat all lines as walls ───
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

    # ── Enrich room names from TEXT/MTEXT near room centroids ─────────
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
```

---

## 8. Step 7: Structural BOM Generator

### 8.1 Create `services/bom-engine/src/services/structural_bom.py`

This is the **Floor Plan → BOM bridge** — the most architecturally significant new module. It converts geometric data (walls, rooms, openings) into material quantities.

```python
"""
Structural BOM generator — converts FloorPlanData geometry into a
construction Bill of Materials.

Unlike the existing BOM agent (which operates on design variant spec_json),
this module calculates materials directly from structural geometry:
- Wall quantities → bricks, cement, sand, plaster, paint
- Room areas → flooring, false ceiling
- Openings → door/window frames, hardware, glass
- Perimeters → skirting, electrical conduit, wiring

Uses the existing material database (material_db.py) for pricing and
waste factors, and the existing calculator (calculator.py) for quantity
refinement.
"""

from __future__ import annotations

import math
import uuid
from datetime import datetime, timezone
from typing import Any

import structlog

from src.agents.material_db import get_price_for_tier, get_waste_factor
from src.models.bom import (
    BOMCategorySummary,
    BOMResult,
    BOMStatus,
    BOMSummary,
)

from openlintel_shared.schemas.bom import BOMItem, MaterialCategory
from openlintel_shared.schemas.design import BudgetTier

logger = structlog.get_logger(__name__)

# Conversion constants
MM_TO_FT = 1 / 304.8
MM2_TO_SQFT = 1 / (304.8 * 304.8)


class StructuralBOMGenerator:
    """Generate a construction BOM from floor plan geometry.

    Parameters
    ----------
    budget_tier:
        Pricing tier for material cost lookup.
    currency:
        ISO 4217 currency code.
    wall_height_mm:
        Default wall height if not specified in geometry.
    """

    def __init__(
        self,
        *,
        budget_tier: str = "mid_range",
        currency: str = "INR",
        wall_height_mm: float = 2700.0,
    ) -> None:
        self._budget_tier = BudgetTier(budget_tier)
        self._currency = currency
        self._wall_height_mm = wall_height_mm

    def generate(
        self,
        *,
        floor_plan_data: dict[str, Any],
        project_id: str = "",
        room_id: str = "",
        bom_id: str | None = None,
    ) -> BOMResult:
        """Generate a structural BOM from floor plan geometry.

        Parameters
        ----------
        floor_plan_data:
            Dict with ``walls``, ``rooms``, ``openings``, ``dimensions`` keys.
            This is the output_json from a floor plan digitization job.
        project_id:
            Project ID to tag the BOM result.
        room_id:
            Room ID (or "all" for whole-floor BOM).
        bom_id:
            Explicit BOM ID. Auto-generated if not provided.

        Returns
        -------
        BOMResult
            Complete BOM with items, summary, and pricing.
        """
        if bom_id is None:
            bom_id = str(uuid.uuid4())

        now = datetime.now(tz=timezone.utc)
        items: list[BOMItem] = []

        walls = floor_plan_data.get("walls", [])
        rooms = floor_plan_data.get("rooms", [])
        openings = floor_plan_data.get("openings", [])

        logger.info(
            "structural_bom_start",
            bom_id=bom_id,
            walls=len(walls),
            rooms=len(rooms),
            openings=len(openings),
        )

        # ── Wall-derived materials ────────────────────────────────────
        total_wall_area_sqft = 0.0
        total_wall_length_rft = 0.0

        for wall in walls:
            wall_height = wall.get("height_mm", self._wall_height_mm)
            wall_length = wall.get("length_mm", 0)

            if wall_length <= 0:
                # Calculate from start/end
                start = wall.get("start", {})
                end = wall.get("end", {})
                dx = end.get("x", 0) - start.get("x", 0)
                dy = end.get("y", 0) - start.get("y", 0)
                wall_length = (dx**2 + dy**2) ** 0.5

            wall_area_sqft = (wall_length * wall_height) * MM2_TO_SQFT
            wall_length_rft = wall_length * MM_TO_FT

            total_wall_area_sqft += wall_area_sqft
            total_wall_length_rft += wall_length_rft

        if total_wall_area_sqft > 0:
            items.extend(self._wall_materials(
                total_wall_area_sqft,
                total_wall_length_rft,
                room_id,
            ))

        # ── Room-derived materials (flooring, ceiling, electrical) ────
        total_floor_area_sqft = 0.0

        for room in rooms:
            room_area_sqmm = room.get("areaSqMm", 0)
            room_type = room.get("type", "other")
            r_id = room.get("id", room_id)

            if room_area_sqmm <= 0:
                # Estimate from polygon vertices
                vertices = room.get("polygon", [])
                if len(vertices) >= 3:
                    room_area_sqmm = self._shoelace_area(vertices)

            room_area_sqft = room_area_sqmm * MM2_TO_SQFT
            total_floor_area_sqft += room_area_sqft

            items.extend(self._room_materials(
                room_area_sqft,
                room_type,
                r_id,
            ))

        # ── Opening-derived materials (doors, windows, hardware) ──────
        for opening in openings:
            items.extend(self._opening_materials(opening, room_id))

        # ── Electrical rough-in (based on total floor area) ───────────
        if total_floor_area_sqft > 0:
            items.extend(self._electrical_materials(
                total_floor_area_sqft,
                total_wall_length_rft,
                room_id,
            ))

        # ── Build summary ─────────────────────────────────────────────
        total_cost = sum(item.estimated_cost or 0.0 for item in items)
        category_breakdown = self._build_category_breakdown(items, total_cost)

        summary = BOMSummary(
            total_items=len(items),
            total_cost=round(total_cost, 2),
            currency=self._currency,
            category_breakdown=category_breakdown,
        )

        logger.info(
            "structural_bom_complete",
            bom_id=bom_id,
            items=len(items),
            total_cost=total_cost,
        )

        return BOMResult(
            id=bom_id,
            project_id=project_id,
            room_id=room_id or "all",
            design_variant_id="structural",
            status=BOMStatus.COMPLETE,
            items=items,
            summary=summary,
            created_at=now,
            completed_at=now,
        )

    # ── Material generators ───────────────────────────────────────────

    def _wall_materials(
        self,
        wall_area_sqft: float,
        wall_length_rft: float,
        room_id: str,
    ) -> list[BOMItem]:
        """Generate wall-related BOM items."""
        items: list[BOMItem] = []

        # Painting (wall putty + primer + emulsion)
        for key, name, spec in [
            ("wall_putty", "Wall Putty", "2 coats birla/JK wall putty"),
            ("wall_primer", "Wall Primer", "1 coat interior primer"),
            ("interior_emulsion", "Interior Emulsion Paint", "2 coats premium emulsion"),
        ]:
            unit_price = get_price_for_tier(key, self._budget_tier)
            waste = get_waste_factor(key)
            items.append(BOMItem(
                id=str(uuid.uuid4()),
                roomId=room_id,
                category=MaterialCategory.PAINTING,
                name=name,
                specification=spec,
                quantity=round(wall_area_sqft, 1),
                unit="sqft",
                unitPrice=unit_price,
                currency=self._currency,
                wasteFactor=waste,
            ))

        return items

    def _room_materials(
        self,
        floor_area_sqft: float,
        room_type: str,
        room_id: str,
    ) -> list[BOMItem]:
        """Generate room-specific BOM items (flooring, ceiling)."""
        items: list[BOMItem] = []

        if floor_area_sqft <= 0:
            return items

        # Flooring
        tile_key = "vitrified_tiles_600x600"
        unit_price = get_price_for_tier(tile_key, self._budget_tier)
        waste = get_waste_factor(tile_key, "straight")
        items.append(BOMItem(
            id=str(uuid.uuid4()),
            roomId=room_id,
            category=MaterialCategory.FLOORING,
            name="Vitrified Tiles 600x600mm",
            specification="Glossy vitrified floor tile, straight lay",
            quantity=round(floor_area_sqft, 1),
            unit="sqft",
            unitPrice=unit_price,
            currency=self._currency,
            wasteFactor=waste,
        ))

        # False ceiling for living/bedroom/dining
        if room_type in ("living_room", "bedroom", "dining", "study"):
            ceiling_area = floor_area_sqft * 0.6
            fc_price = get_price_for_tier("gypsum_board_12mm", self._budget_tier)
            fc_waste = get_waste_factor("gypsum_board_12mm")
            items.append(BOMItem(
                id=str(uuid.uuid4()),
                roomId=room_id,
                category=MaterialCategory.FALSE_CEILING,
                name="Gypsum Board False Ceiling",
                specification="12.5mm gypsum board with GI framework",
                quantity=round(ceiling_area, 1),
                unit="sqft",
                unitPrice=fc_price,
                currency=self._currency,
                wasteFactor=fc_waste,
            ))

        # Plumbing for wet areas
        if room_type in ("bathroom", "kitchen", "utility"):
            perimeter_rft = math.sqrt(floor_area_sqft) * 4 * 0.3048  # approximate
            pipe_price = get_price_for_tier("cpvc_pipe_15mm", self._budget_tier)
            items.append(BOMItem(
                id=str(uuid.uuid4()),
                roomId=room_id,
                category=MaterialCategory.PLUMBING,
                name="CPVC Pipe 15mm",
                specification="Hot and cold water supply",
                quantity=round(perimeter_rft * 1.5, 1),
                unit="rft",
                unitPrice=pipe_price,
                currency=self._currency,
                wasteFactor=0.05,
            ))

        return items

    def _opening_materials(
        self,
        opening: dict[str, Any],
        room_id: str,
    ) -> list[BOMItem]:
        """Generate door/window BOM items."""
        items: list[BOMItem] = []
        opening_type = opening.get("type", "single_door")
        is_door = "door" in opening_type.lower()
        width_mm = opening.get("width_mm", 900 if is_door else 1200)

        if is_door:
            items.append(BOMItem(
                id=str(uuid.uuid4()),
                roomId=room_id,
                category=MaterialCategory.CARPENTRY,
                name="Flush Door with Frame",
                specification=f"{int(width_mm)}mm flush door, sal wood frame",
                quantity=1,
                unit="nos",
                unitPrice=get_price_for_tier("flush_door_frame", self._budget_tier) or 8500.0,
                currency=self._currency,
                wasteFactor=0.0,
            ))
            items.append(BOMItem(
                id=str(uuid.uuid4()),
                roomId=room_id,
                category=MaterialCategory.HARDWARE,
                name="Door Hardware Set",
                specification="Mortice lock + 3 hinges + tower bolt + door stopper",
                quantity=1,
                unit="set",
                unitPrice=get_price_for_tier("door_hardware_set", self._budget_tier) or 2500.0,
                currency=self._currency,
                wasteFactor=0.0,
            ))
        else:
            items.append(BOMItem(
                id=str(uuid.uuid4()),
                roomId=room_id,
                category=MaterialCategory.GLASS_ALUMINUM,
                name="Aluminium Sliding Window",
                specification=f"{int(width_mm)}mm aluminium section with 5mm glass",
                quantity=1,
                unit="nos",
                unitPrice=get_price_for_tier("aluminium_window", self._budget_tier) or 650.0,
                currency=self._currency,
                wasteFactor=0.0,
            ))

        return items

    def _electrical_materials(
        self,
        floor_area_sqft: float,
        perimeter_rft: float,
        room_id: str,
    ) -> list[BOMItem]:
        """Generate electrical rough-in materials."""
        items: list[BOMItem] = []

        # Wiring
        for key, name, spec, multiplier in [
            ("copper_wire_1_5mm", "Copper Wire 1.5mm", "FR grade, lighting circuits", 3),
            ("copper_wire_2_5mm", "Copper Wire 2.5mm", "FR grade, power sockets", 2),
        ]:
            items.append(BOMItem(
                id=str(uuid.uuid4()),
                roomId=room_id,
                category=MaterialCategory.ELECTRICAL,
                name=name,
                specification=spec,
                quantity=round(perimeter_rft * multiplier, 1),
                unit="rft",
                unitPrice=get_price_for_tier(key, self._budget_tier),
                currency=self._currency,
                wasteFactor=get_waste_factor(key),
            ))

        # Switches & lights (proportional to floor area)
        switch_count = max(2, round(floor_area_sqft / 50))
        light_count = max(2, round(floor_area_sqft / 30))

        items.append(BOMItem(
            id=str(uuid.uuid4()),
            roomId=room_id,
            category=MaterialCategory.ELECTRICAL,
            name="Modular Switch Plate",
            specification="6-module switch plate",
            quantity=switch_count,
            unit="nos",
            unitPrice=get_price_for_tier("modular_switch_plate", self._budget_tier),
            currency=self._currency,
            wasteFactor=0.0,
        ))

        items.append(BOMItem(
            id=str(uuid.uuid4()),
            roomId=room_id,
            category=MaterialCategory.ELECTRICAL,
            name="LED Downlight 12W",
            specification="Recessed LED downlight, 4000K neutral white",
            quantity=light_count,
            unit="nos",
            unitPrice=get_price_for_tier("led_downlight", self._budget_tier),
            currency=self._currency,
            wasteFactor=0.0,
        ))

        return items

    # ── Helpers ────────────────────────────────────────────────────────

    @staticmethod
    def _shoelace_area(vertices: list[dict[str, float]]) -> float:
        """Compute polygon area using the Shoelace formula (sq mm)."""
        n = len(vertices)
        if n < 3:
            return 0.0
        area = 0.0
        for i in range(n):
            j = (i + 1) % n
            area += vertices[i]["x"] * vertices[j]["y"]
            area -= vertices[j]["x"] * vertices[i]["y"]
        return abs(area) / 2.0

    @staticmethod
    def _build_category_breakdown(
        items: list[BOMItem],
        total_cost: float,
    ) -> list[BOMCategorySummary]:
        """Build per-category cost breakdown."""
        cat_totals: dict[MaterialCategory, tuple[int, float]] = {}
        for item in items:
            count, subtotal = cat_totals.get(item.category, (0, 0.0))
            cost = item.estimated_cost or 0.0
            cat_totals[item.category] = (count + 1, subtotal + cost)

        breakdown: list[BOMCategorySummary] = []
        for cat, (count, subtotal) in sorted(cat_totals.items(), key=lambda x: -x[1][1]):
            pct = (subtotal / total_cost * 100) if total_cost > 0 else 0.0
            breakdown.append(BOMCategorySummary(
                category=cat,
                item_count=count,
                subtotal=round(subtotal, 2),
                percentage_of_total=round(pct, 1),
            ))
        return breakdown
```

---

## 9. Step 8: BOM Engine — Floor Plan Endpoint

### 9.1 Add Endpoint to `services/bom-engine/src/routers/bom.py`

Add this endpoint after the existing `/job` endpoint (after line 224):

```python
from src.services.structural_bom import StructuralBOMGenerator


class FloorPlanBOMRequest(BaseModel):
    """Request body for POST /api/v1/bom/from-floor-plan."""
    job_id: str = Field(description="Job ID for status tracking")
    project_id: str = Field(description="Project ID")
    floor_plan_data: dict[str, Any] = Field(
        description="FloorPlanData output from digitization job"
    )
    budget_tier: str = Field(default="mid_range")
    currency: str = Field(default="INR")


@router.post(
    "/from-floor-plan",
    response_model=BOMGenerateResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Generate a structural BOM from floor plan geometry",
    description=(
        "Accepts FloorPlanData (walls, rooms, openings) from a floor plan "
        "digitization job and generates a construction BOM with material "
        "quantities, pricing, and waste factors. Does NOT require a design "
        "variant — works directly from structural geometry."
    ),
)
async def generate_bom_from_floor_plan(
    request: FloorPlanBOMRequest,
    background_tasks: BackgroundTasks,
) -> BOMGenerateResponse:
    """Generate a structural BOM from floor plan data."""
    bom_id = str(uuid.uuid4())

    logger.info(
        "structural_bom_request",
        bom_id=bom_id,
        project_id=request.project_id,
        walls=len(request.floor_plan_data.get("walls", [])),
        rooms=len(request.floor_plan_data.get("rooms", [])),
    )

    try:
        generator = StructuralBOMGenerator(
            budget_tier=request.budget_tier,
            currency=request.currency,
        )

        result = generator.generate(
            floor_plan_data=request.floor_plan_data,
            project_id=request.project_id,
            bom_id=bom_id,
        )

        # Store result
        bom_data = result.model_dump(mode="json")
        _bom_store[bom_id] = bom_data
        await cache_set(f"bom:{bom_id}", bom_data, ttl=_BOM_CACHE_TTL)

        return BOMGenerateResponse(
            bom_id=bom_id,
            status=BOMStatus.COMPLETE,
            message="Structural BOM generation complete.",
        )

    except Exception as exc:
        logger.error("structural_bom_failed", bom_id=bom_id, error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Structural BOM generation failed: {exc}",
        ) from exc
```

### 9.2 Add `ezdxf` to BOM Engine Dependencies

Update `services/bom-engine/pyproject.toml`:

```toml
dependencies = [
    "openlintel-shared",
    "fastapi>=0.111",
    "uvicorn[standard]>=0.30",
    "ortools>=9.9,<10",
    "openpyxl>=3.1,<4",
    "reportlab>=4.1,<5",
    # No new deps needed — structural_bom.py uses existing material_db/calculator
]
```

---

## 10. Step 9: tRPC Router & Frontend Integration

### 10.1 Update `apps/web/src/server/trpc/routers/bom.ts`

Add a `generateFromFloorPlan` mutation after the existing `generate` mutation (after line 104):

```typescript
generateFromFloorPlan: protectedProcedure
  .input(
    z.object({
      projectId: z.string(),
      floorPlanJobId: z.string(),
      budgetTier: z.string().default('mid_range'),
      currency: z.string().default('INR'),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    // Verify project ownership
    const project = await ctx.db.query.projects.findFirst({
      where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.userId)),
    });
    if (!project) throw new Error('Project not found');

    // Get the floor plan digitization job output
    const fpJob = await ctx.db.query.jobs.findFirst({
      where: and(eq(jobs.id, input.floorPlanJobId), eq(jobs.userId, ctx.userId)),
    });
    if (!fpJob) throw new Error('Floor plan job not found');
    if (fpJob.status !== 'completed') throw new Error('Floor plan digitization not complete');

    const floorPlanData = fpJob.outputJson as Record<string, unknown>;
    if (!floorPlanData) throw new Error('No floor plan data in job output');

    // Create BOM job
    const [job] = await ctx.db
      .insert(jobs)
      .values({
        userId: ctx.userId,
        type: 'structural_bom',
        status: 'pending',
        inputJson: {
          projectId: input.projectId,
          floorPlanJobId: input.floorPlanJobId,
          budgetTier: input.budgetTier,
        },
        projectId: input.projectId,
      })
      .returning();

    // Call BOM service
    fetch(`${BOM_SERVICE_URL}/api/v1/bom/from-floor-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: job.id,
        project_id: input.projectId,
        floor_plan_data: floorPlanData,
        budget_tier: input.budgetTier,
        currency: input.currency,
      }),
    }).catch(() => {
      // Service may be down; job stays pending
    });

    return job;
  }),
```

### 10.2 Update `apps/web/src/server/trpc/routers/floorPlan.ts`

Update the `digitize` mutation to pass filename and MIME type to the new `/digitize` endpoint. Replace the fire-and-forget block (lines 49-62):

```typescript
// Fire-and-forget to vision-engine — enhanced endpoint with file-type routing
fetch(`${VISION_SERVICE_URL}/api/v1/vision/digitize`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    job_id: job.id,
    user_id: ctx.userId,
    project_id: input.projectId,
    upload_id: input.uploadId,
    storage_key: upload.storageKey,
    filename: upload.filename,
    mime_type: upload.mimeType,
  }),
}).catch(() => {
  // Fallback: try the legacy image-only endpoint
  const fullImageUrl = `${origin}${imageUrl}`;
  fetch(`${VISION_SERVICE_URL}/api/v1/vision/job`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      job_id: job.id,
      user_id: ctx.userId,
      project_id: input.projectId,
      image_url: fullImageUrl,
      upload_id: input.uploadId,
    }),
  }).catch(() => {});
});
```

### 10.3 Update BOM Page UI

In `apps/web/src/app/(dashboard)/project/[id]/bom/page.tsx`, add a "Generate from Floor Plan" section. Add alongside the existing variant-based generation UI:

```tsx
{/* Structural BOM from Floor Plan */}
{completedFloorPlanJobs.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">Generate BOM from Floor Plan</CardTitle>
      <CardDescription>
        Create a structural BOM directly from your digitized floor plan
        — no design variant needed.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
      <Select
        value={selectedFloorPlanJob}
        onValueChange={setSelectedFloorPlanJob}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a floor plan..." />
        </SelectTrigger>
        <SelectContent>
          {completedFloorPlanJobs.map((fpJob) => (
            <SelectItem key={fpJob.id} value={fpJob.id}>
              Floor Plan — {fpJob.outputJson?.room_count ?? '?'} rooms,{' '}
              {fpJob.outputJson?.wall_count ?? '?'} walls
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        onClick={() => generateStructuralBom.mutate({
          projectId,
          floorPlanJobId: selectedFloorPlanJob,
          budgetTier: 'mid_range',
        })}
        disabled={!selectedFloorPlanJob || generateStructuralBom.isPending}
      >
        Generate Structural BOM
      </Button>
    </CardContent>
  </Card>
)}
```

---

## 11. Step 10: Database Schema Changes

### 11.1 No New Tables Strictly Needed

The existing `bom_results` table works for structural BOMs because:
- `design_variant_id` can be set to `"structural"` as a sentinel value
- `items` (JSONB) stores BOM items identically
- `total_cost`, `currency`, `metadata` all apply

### 11.2 Optional: Add `floor_plan_results` Table

If you want to persist parsed `FloorPlanData` separately (recommended for re-processing):

Add to `packages/db/src/schema/app.ts`:

```typescript
export const floorPlanResults = pgTable('floor_plan_results', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  projectId: text('project_id').notNull().references(() => projects.id),
  uploadId: text('upload_id').references(() => uploads.id),
  jobId: text('job_id').references(() => jobs.id),
  sourceType: text('source_type').notNull(), // 'dwg', 'dxf', 'pdf', 'image'
  walls: jsonb('walls').notNull().default([]),
  rooms: jsonb('rooms').notNull().default([]),
  openings: jsonb('openings').notNull().default([]),
  dimensions: jsonb('dimensions').notNull().default([]),
  totalAreaSqm: real('total_area_sqm'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

---

## 12. Step 11: Docker & Infrastructure

### 12.1 Vision Engine Dockerfile

Add system dependencies for DWG conversion and PDF processing. Update `services/vision-engine/Dockerfile`:

```dockerfile
FROM python:3.12-slim

# System deps for DWG conversion and PDF rasterization
RUN apt-get update && apt-get install -y --no-install-recommends \
    libredwg-utils \
    poppler-utils \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps
COPY packages/python-shared /packages/python-shared
RUN pip install --no-cache-dir /packages/python-shared

COPY ml/floor-plan-digitizer /ml/floor-plan-digitizer
RUN pip install --no-cache-dir /ml/floor-plan-digitizer

COPY services/vision-engine/pyproject.toml services/vision-engine/setup.cfg* ./
RUN pip install --no-cache-dir .

COPY services/vision-engine/ .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8010"]
```

### 12.2 docker-compose.yml

Add the system packages to the vision-engine service build context. In the `vision-engine` service section, ensure it has access to the floor-plan-digitizer:

```yaml
vision-engine:
  build:
    context: .
    dockerfile: services/vision-engine/Dockerfile
  ports:
    - "8010:8010"
  environment:
    DATABASE_URL: postgresql+asyncpg://openlintel:openlintel_dev@postgres:5432/openlintel
    REDIS_URL: redis://redis:6379
    MINIO_ENDPOINT: http://minio:9000
    MINIO_ACCESS_KEY: minioadmin
    MINIO_SECRET_KEY: minioadmin123
    MINIO_BUCKET: openlintel
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
    minio:
      condition: service_started
```

### 12.3 Verify LibreDWG Availability

After building the Docker image, verify:

```bash
docker compose exec vision-engine dwg2dxf --version
```

Expected output: `dwg2dxf <version>`

If LibreDWG is not available in the distro's package manager, use the ODA File Converter instead:
1. Download the `.deb` from ODA's website
2. Add to the Dockerfile: `COPY oda_file_converter.deb /tmp/ && dpkg -i /tmp/oda_file_converter.deb`

---

## 13. Step 12: Testing Strategy

### 13.1 Unit Tests

```
tests/
├── test_dwg_converter.py      — DWGConverter with mock subprocess
├── test_pdf_extractor.py       — PDFFloorPlanExtractor with sample PDFs
├── test_file_router.py         — FileType detection from MIME/ext/magic
├── test_structural_bom.py      — StructuralBOMGenerator with sample geometry
├── test_enhanced_dxf_parser.py — _parse_dxf with sample DXF files
└── test_upload_validation.py   — MIME type / extension validation
```

### 13.2 Integration Tests

```python
# test_dwg_to_bom_e2e.py
async def test_dwg_upload_to_bom():
    """End-to-end: upload DWG → digitize → generate BOM."""
    # 1. Upload a sample DWG file
    with open("fixtures/sample_floor_plan.dwg", "rb") as f:
        response = await client.post("/api/upload", files={"file": f})
    assert response.status_code == 200
    upload_id = response.json()["id"]

    # 2. Trigger digitization
    job = await trpc.floorPlan.digitize({
        "projectId": test_project_id,
        "uploadId": upload_id,
    })

    # 3. Poll until complete
    while True:
        status = await trpc.floorPlan.jobStatus({"jobId": job["id"]})
        if status["status"] in ("completed", "failed"):
            break
        await asyncio.sleep(1)

    assert status["status"] == "completed"

    # 4. Generate structural BOM
    bom_job = await trpc.bom.generateFromFloorPlan({
        "projectId": test_project_id,
        "floorPlanJobId": job["id"],
    })

    # 5. Verify BOM result
    bom = await trpc.bom.jobStatus({"jobId": bom_job["id"]})
    assert bom["status"] == "completed"
    assert len(bom["outputJson"]["items"]) > 0
```

### 13.3 Sample Test Files

Create `tests/fixtures/` with:
- `sample_floor_plan.dwg` — simple 2BHK DWG file
- `sample_floor_plan.dxf` — same plan as DXF
- `sample_floor_plan.pdf` — PDF export of the same plan
- `sample_floor_plan.png` — raster image of the same plan

These enable comparison testing across all four input formats.

---

## 14. Dependency Map & Build Order

```
                    ┌─────────────────────────────┐
                    │   Step 1: Upload API (TS)   │
                    │   Step 2: Media Service (PY) │
                    └──────────┬──────────────────┘
                               │ files can now reach server
                    ┌──────────▼──────────────────┐
                    │  Step 11: Docker/Infra       │
                    │  (LibreDWG, poppler-utils)   │
                    └──────────┬──────────────────┘
                               │ system tools available
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼────┐  ┌───────▼──────┐  ┌──────▼──────┐
    │ Step 3: DWG  │  │ Step 4: PDF  │  │ Step 6: DXF │
    │ Converter    │  │ Extractor    │  │ Parser++    │
    └─────────┬────┘  └───────┬──────┘  └──────┬──────┘
              │               │                │
              └───────┬───────┘                │
                      │                        │
            ┌─────────▼────────────────────────▼──┐
            │  Step 5: Vision Engine File Router   │
            └─────────────────┬────────────────────┘
                              │ FloorPlanData output
                    ┌─────────▼────────────────┐
                    │ Step 7: Structural BOM    │
                    │ Generator                 │
                    └─────────┬────────────────┘
                              │
                    ┌─────────▼────────────────┐
                    │ Step 8: BOM Engine        │
                    │ /from-floor-plan endpoint │
                    └─────────┬────────────────┘
                              │
                    ┌─────────▼────────────────┐
                    │ Step 9: tRPC + Frontend   │
                    └─────────┬────────────────┘
                              │
                    ┌─────────▼────────────────┐
                    │ Step 10: DB Schema        │
                    │ (optional table)          │
                    └─────────┬────────────────┘
                              │
                    ┌─────────▼────────────────┐
                    │ Step 12: Tests            │
                    └──────────────────────────┘
```

**Parallelizable steps:**
- Steps 3, 4, 6 can be developed in parallel (independent modules)
- Steps 1, 2, 11 can be done in parallel (infrastructure layer)
- Steps 7, 8 depend on earlier steps but can be stubbed

---

## 15. File Manifest

### New Files (8 files)

| File | Lines (est.) | Purpose |
|------|-------------|---------|
| `ml/floor-plan-digitizer/src/openlintel_digitizer/dwg_converter.py` | ~280 | DWG→DXF conversion |
| `ml/floor-plan-digitizer/src/openlintel_digitizer/pdf_extractor.py` | ~200 | PDF→Image extraction |
| `services/vision-engine/src/services/file_router.py` | ~130 | File-type detection/routing |
| `services/bom-engine/src/services/structural_bom.py` | ~350 | Geometry→BOM calculation |
| `tests/test_dwg_converter.py` | ~100 | DWG converter tests |
| `tests/test_pdf_extractor.py` | ~80 | PDF extractor tests |
| `tests/test_file_router.py` | ~60 | File router tests |
| `tests/test_structural_bom.py` | ~120 | Structural BOM tests |

### Modified Files (15 files)

| File | Change Description |
|------|-------------------|
| `apps/web/src/app/api/upload/route.ts` | DWG/DXF MIME types, 50MB limit, extension validation |
| `services/media-service/src/services/validator.py` | CAD MIME types, extension override |
| `services/media-service/src/routers/upload.py` | DWG/DXF extension mapping, metadata |
| `services/vision-engine/src/routers/vision.py` | New `/digitize` endpoint, file-aware processing |
| `services/vision-engine/main.py` | No change needed (router already included) |
| `services/vision-engine/pyproject.toml` | Add floor-plan-digitizer dependency |
| `ml/floor-plan-digitizer/src/openlintel_digitizer/pipeline.py` | Add `digitize_pdf()`, enhanced `_parse_dxf()` |
| `ml/floor-plan-digitizer/src/openlintel_digitizer/__init__.py` | Export new classes |
| `ml/floor-plan-digitizer/pyproject.toml` | Add pdf2image, pdfplumber |
| `services/bom-engine/src/routers/bom.py` | Add `/from-floor-plan` endpoint |
| `apps/web/src/server/trpc/routers/bom.ts` | Add `generateFromFloorPlan` mutation |
| `apps/web/src/server/trpc/routers/floorPlan.ts` | Pass filename/MIME to vision engine |
| `apps/web/src/app/(dashboard)/project/[id]/bom/page.tsx` | "BOM from Floor Plan" UI |
| `packages/db/src/schema/app.ts` | Optional `floor_plan_results` table |
| `docker-compose.yml` / Dockerfiles | LibreDWG, poppler-utils system packages |

---

## End-to-End User Flow (Target State)

```
User uploads floor_plan.dwg (or .dxf or .pdf)
    │
    ▼
Upload API accepts file (Step 1) ── stores in MinIO
    │
    ▼
Vision Engine receives job (Step 5)
    │
    ├── .dwg → DWGConverter (Step 3) → .dxf → ezdxf parser (Step 6) → FloorPlanData
    ├── .dxf → ezdxf parser (Step 6) → FloorPlanData
    ├── .pdf → PDFExtractor (Step 4) → image → VLM (GPT-4o) → FloorPlanData
    └── image → VLM (GPT-4o) → FloorPlanData
    │
    ▼
User sees detected rooms, walls, dimensions on floor plan viewer
    │
    ▼
User clicks "Generate Structural BOM" (Step 9)
    │
    ▼
StructuralBOMGenerator (Step 7) converts geometry → materials
    │
    ├── Walls → paint, putty, primer (by wall area)
    ├── Rooms → tiles, false ceiling (by floor area)
    ├── Openings → doors, windows, hardware (by count)
    └── Electrical → wiring, switches, lights (by room size)
    │
    ▼
BOM displayed with category breakdown, total cost
    │
    ▼
User exports as Excel / CSV / PDF (existing export system)
```
