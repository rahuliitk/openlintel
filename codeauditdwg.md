# Code Audit: DWG/PDF Upload and BOM Calculation Pipeline

**Audit Date:** 2026-03-09
**Auditor:** Claude Opus 4.6
**Scope:** End-to-end analysis of DWG/PDF file upload, parsing, and BOM (Bill of Materials) generation capabilities

---

## Executive Summary

**Can you currently upload a DWG or PDF-of-DWG file and calculate BOM?**

**NO — not end-to-end.** The system has significant architectural scaffolding for this flow, but critical modules are missing or disconnected. Specifically:

| Capability | Status | Blocker |
|-----------|--------|---------|
| Upload DWG file (frontend) | Partial | UI accepts `.dwg`, backend rejects it |
| Upload PDF of DWG (frontend) | Partial | UI accepts `.pdf`, backend accepts PDF but vision pipeline expects images |
| Parse/read DWG file | **NOT IMPLEMENTED** | `dwg_converter.py` module does not exist |
| Parse PDF to extract floor plan | **NOT IMPLEMENTED** | No PDF-to-image conversion |
| Digitize floor plan from image | Working | VLM-based extraction via GPT-4o works |
| Generate BOM from floor plan | **DISCONNECTED** | BOM engine operates on design variants, not floor plan geometry |
| Generate BOM from design variant | Working | Full LangGraph pipeline with OR-Tools optimization |
| Export BOM (Excel/CSV/PDF) | Working | All three export formats implemented |

**Estimated effort to make this work end-to-end: 3-5 development sprints.**

---

## 1. Detailed Analysis: What Exists Today

### 1.1 Frontend — Floor Plan Upload Component

**File:** `apps/web/src/components/floor-plan-upload.tsx`

```
Line 18: const ACCEPTED_EXTENSIONS = '.png,.jpg,.jpeg,.webp,.pdf,.dxf,.dwg';
Line 50: const validExt = ['png', 'jpg', 'jpeg', 'webp', 'pdf', 'dxf', 'dwg'];
```

The frontend UI **does accept DWG files**. It shows DWG/DXF/PDF/PNG/JPG badges, validates by extension, allows 50MB uploads, has drag-and-drop support, and automatically triggers digitization after upload.

**However**, the file is sent to `/api/upload` which rejects non-image/non-PDF MIME types.

### 1.2 Backend Upload API — REJECTS DWG

**File:** `apps/web/src/app/api/upload/route.ts`

```typescript
// Line 8-15
const MAX_SIZE = 10 * 1024 * 1024; // 10MB (frontend says 50MB!)
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];
```

**Problems identified:**
1. **DWG MIME type not allowed**: DWG files (`application/acad`, `application/x-acad`, `application/x-autocad`, `image/x-dwg`, `application/dwg`) are not in `ALLOWED_TYPES`. Upload will fail with "Unsupported file type".
2. **DXF MIME type not allowed**: DXF files (`application/dxf`, `image/vnd.dxf`) also not in the allowed list.
3. **Size mismatch**: Backend limits to 10MB; frontend advertises 50MB. DWG files commonly exceed 10MB.
4. **No file content inspection**: The backend trusts the browser's `Content-Type` header entirely, no magic-byte validation.

### 1.3 Media Service — Also No DWG Support

**File:** `services/media-service/src/routers/upload.py`

```python
# Line 59-68 — _mime_to_extension()
mapping = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/pdf": ".pdf",
}
```

The media service also has no DWG/DXF awareness. Non-image files pass through without optimization but are stored as `.bin` extension.

### 1.4 Floor Plan Digitization Pipeline — DWG Converter is MISSING

**File:** `ml/floor-plan-digitizer/src/openlintel_digitizer/pipeline.py`

The `FloorPlanPipeline` class has a `digitize_dwg()` method (line 146-200) that is architecturally sound:

```python
async def digitize_dwg(self, dwg_path, *, output_dxf_path=None) -> FloorPlanData:
    from openlintel_digitizer.dwg_converter import DWGConverter  # <-- DOES NOT EXIST
    converter = DWGConverter(
        libredwg_path=self._libredwg_path,
        oda_converter_path=self._oda_converter_path,
    )
    if not converter.is_available:
        raise RuntimeError("No DWG conversion backend available...")
    dxf_path = await converter.convert(dwg_path, output_path=output_dxf_path, dxf_version=self._dxf_version)
    floor_plan = self._parse_dxf(dxf_path)
    floor_plan.source_type = "dwg"
    return floor_plan
```

**Critical finding:** The import `from openlintel_digitizer.dwg_converter import DWGConverter` references a module that **DOES NOT EXIST** anywhere in the codebase. Verified via:
- `Glob("**/dwg_converter*")` → No files found
- `Glob("**/dwg*")` → No files found
- No `libredwg` in any `requirements.txt`
- No ODA File Converter references in any dependency file

The method also calls `self._parse_dxf()` which DOES exist (line 260-339) and successfully parses DXF files using `ezdxf`. So the second half of the pipeline (DXF → FloorPlanData) is implemented.

### 1.5 DXF Parsing — WORKS

**File:** `ml/floor-plan-digitizer/src/openlintel_digitizer/pipeline.py` (lines 260-339)

The `_parse_dxf()` static method is fully implemented:
- Reads DXF files with `ezdxf.readfile()`
- Extracts LINE entities from wall-related layers (`walls`, `wall`, `walls_exterior`, `walls_interior`)
- Extracts LWPOLYLINE entities from room layers (`rooms`, `room`, `spaces`, `space`)
- Falls back to treating all LINEs as walls if no specific wall layers found
- Returns structured `FloorPlanData` with walls and rooms

### 1.6 DXF Generation — WORKS

**File:** `ml/floor-plan-digitizer/src/openlintel_digitizer/dxf_generator.py`

Fully implemented `DXFGenerator` class using `ezdxf`:
- Generates DXF R2013 with proper layer structure (WALLS, WALLS_EXTERIOR, DOORS, WINDOWS, ROOMS, DIMENSIONS, ANNOTATIONS, FURNITURE)
- Draws walls with centre-lines and offset edges
- Draws door swing arcs and window glazing lines
- Generates aligned dimension annotations
- All geometry in millimetres

### 1.7 Vision Engine — Image-Only, No DWG/PDF Awareness

**File:** `services/vision-engine/src/agents/vision_agent.py`

The vision engine sends `image_url` directly to GPT-4o:
```python
{"type": "image_url", "image_url": {"url": image_url}}
```

**Problems:**
1. Only works for raster images (JPEG, PNG, WebP)
2. Does not handle PDF files (would need PDF-to-image conversion first)
3. Does not handle DWG files at all
4. No file-type routing — assumes everything is a displayable image

**File:** `services/vision-engine/src/routers/vision.py`

The job dispatcher accepts `image_url` (line 37) and passes it directly to `detect_rooms_from_image()`. No format detection, no conversion step.

### 1.8 BOM Engine — DISCONNECTED from Floor Plans

**File:** `services/bom-engine/src/agents/bom_agent.py`

The BOM agent is a 5-node LangGraph pipeline:
1. `extract_materials` — LLM analyses **design spec JSON** (not floor plan geometry)
2. `calculate_quantities` — computes quantities with waste factors
3. `lookup_prices` — resolves unit prices from material database
4. `optimize_budget` — OR-Tools budget allocation
5. `generate_bom` — assembles final BOM

**Key insight:** The BOM agent's input is a `spec_json` from a **design variant**, not floor plan geometry. The pipeline is:

```
Room Photo → Design Engine (VLM) → Design Variant (spec_json) → BOM Engine → BOM
```

There is **no path** from:
```
DWG File → Floor Plan Data → BOM
```

The BOM system doesn't know about walls, rooms, doors, or windows at a structural level. It receives a design specification (furniture, finishes, fixtures) and calculates materials from that.

### 1.9 BOM tRPC Router — Flow Requires Design Variant

**File:** `apps/web/src/server/trpc/routers/bom.ts`

```typescript
generate: protectedProcedure
  .input(z.object({ designVariantId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    // Fetches design variant → sends to BOM service
    // Room dimensions come from the rooms table (lengthMm, widthMm, heightMm)
  })
```

BOM generation REQUIRES a `designVariantId`. There's no endpoint to generate BOM from a floor plan or uploaded DWG directly.

---

## 2. Current User Flow (What Works Today)

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. User uploads room PHOTO (JPEG/PNG) via /api/upload                │
│    ├─ Stored in MinIO/S3                                             │
│    └─ Metadata saved to PostgreSQL (uploads table)                   │
│                                                                      │
│ 2. User triggers DESIGN GENERATION for a room                       │
│    ├─ Design Engine (LangGraph + GPT-4o) generates 3 variants       │
│    ├─ Each variant has a spec_json describing furniture, finishes    │
│    └─ Render images stored in MinIO                                  │
│                                                                      │
│ 3. User selects a design variant                                     │
│                                                                      │
│ 4. User clicks "Generate BOM"                                        │
│    ├─ BOM Agent analyses spec_json via LLM                          │
│    ├─ Extracts materials (flooring, paint, electrical, plumbing...)  │
│    ├─ Calculates quantities with waste factors                       │
│    ├─ Looks up prices from material database                         │
│    ├─ Optionally runs OR-Tools budget optimization                   │
│    └─ Returns structured BOM with items, summary, substitutions     │
│                                                                      │
│ 5. User exports BOM as Excel (.xlsx), CSV, or PDF                    │
└────────────────────────────────────────────────────────────────────────┘
```

**For floor plan upload (separate flow):**
```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. User uploads floor plan IMAGE (PNG/JPG) via floor-plan-upload     │
│    ├─ Stored in MinIO                                                │
│    └─ Triggers digitization job                                      │
│                                                                      │
│ 2. Vision Engine sends image to GPT-4o                               │
│    ├─ VLM detects rooms (name, type, polygon, dimensions)           │
│    └─ Results stored in job output                                   │
│                                                                      │
│ 3. Room data populates the rooms table                               │
│    ├─ But this data is NOT fed into design generation                │
│    └─ And NOT fed into BOM generation                                │
│                                                                      │
│ THE FLOW STOPS HERE — no connection to BOM                           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Has a DWG Reader Been Implemented?

### Answer: **NO — the DWG reader has NOT been implemented.**

Here is a detailed breakdown of what exists vs. what is missing:

### What EXISTS (the scaffolding):

| Component | File | Status |
|-----------|------|--------|
| `FloorPlanPipeline.digitize_dwg()` method | `ml/floor-plan-digitizer/src/openlintel_digitizer/pipeline.py:146-200` | Method stub exists, imports non-existent module |
| `__init__.py` documentation | `ml/floor-plan-digitizer/src/openlintel_digitizer/__init__.py:9` | Documents "DWG -> DXF via LibreDWG" as Pipeline Option 1 |
| `libredwg_path` constructor parameter | `pipeline.py:56` | Accepted but never used (no converter to pass it to) |
| `oda_converter_path` constructor parameter | `pipeline.py:57` | Accepted but never used |
| DXF parser (post-conversion) | `pipeline.py:260-339` | Fully implemented — would work after DWG→DXF conversion |
| Frontend DWG file acceptance | `floor-plan-upload.tsx:18` | UI accepts .dwg but backend rejects |

### What is MISSING:

| Component | Impact | Priority |
|-----------|--------|----------|
| **`dwg_converter.py` module** | Cannot convert DWG to DXF | CRITICAL |
| **LibreDWG dependency** | No DWG parsing library installed | CRITICAL |
| **ODA File Converter integration** | No fallback DWG converter | HIGH |
| **DWG MIME type in upload API** | Backend rejects DWG uploads | CRITICAL |
| **DXF MIME type in upload API** | Backend rejects DXF uploads | HIGH |
| **PDF-to-image converter** | Cannot extract floor plans from PDFs | HIGH |
| **File-type router in vision engine** | Cannot dispatch DWG/DXF/PDF differently | MEDIUM |
| **Floor plan → BOM bridge** | Cannot generate BOM from structural data | HIGH |
| **DWG-native BOM extraction** | Cannot read schedules/tables from DWG | MEDIUM |

### The Import That Fails:

```python
# pipeline.py:169 — This will raise ImportError at runtime
from openlintel_digitizer.dwg_converter import DWGConverter
```

The `DWGConverter` class was designed to:
1. Check if LibreDWG (`dwg2dxf` binary) or ODA File Converter is available
2. Convert DWG → DXF using the available backend
3. Return the path to the converted DXF file

None of this code exists.

---

## 4. What Needs to Be Built

### Phase 1: DWG/DXF Upload Support (1 sprint)

#### 4.1.1 Update Upload API to Accept DWG/DXF

**File:** `apps/web/src/app/api/upload/route.ts`

```typescript
// Add these MIME types:
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  // DWG MIME types (browsers vary):
  'application/acad', 'application/x-acad', 'application/x-autocad',
  'application/dwg', 'image/x-dwg', 'image/vnd.dwg',
  'application/octet-stream',  // fallback for unknown binary
  // DXF MIME types:
  'application/dxf', 'image/vnd.dxf', 'image/x-dxf',
  'application/x-dxf',
];

// Increase size limit:
const MAX_SIZE = 50 * 1024 * 1024; // 50MB to match frontend

// Add extension-based validation (since DWG MIME types are unreliable):
function isAllowedByExtension(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['jpg','jpeg','png','webp','gif','pdf','dwg','dxf'].includes(ext ?? '');
}
```

**Rationale:** DWG files have unreliable MIME types across browsers. Extension-based validation is necessary as a fallback. Most browsers send `application/octet-stream` for DWG files.

#### 4.1.2 Update Media Service

**File:** `services/media-service/src/routers/upload.py`

Add DWG/DXF to the MIME-to-extension mapping and validator. Skip image optimization for CAD files.

#### 4.1.3 Update Size Limits Consistency

Align the 50MB frontend limit with the backend limit across all services.

---

### Phase 2: DWG Reader/Converter (1-2 sprints)

#### 4.2.1 Implement `dwg_converter.py`

**File to create:** `ml/floor-plan-digitizer/src/openlintel_digitizer/dwg_converter.py`

```python
"""
DWG to DXF conversion using LibreDWG or ODA File Converter.

Strategy:
1. Primary: LibreDWG's dwg2dxf command-line tool (open source, C library)
2. Fallback: ODA File Converter (free, proprietary, cross-platform)
3. Future: Direct ezdxf-based DWG reading (when ezdxf adds DWG support)
"""

import asyncio
import shutil
import tempfile
from pathlib import Path

class DWGConverter:
    """Converts DWG files to DXF format."""

    def __init__(self, *, libredwg_path=None, oda_converter_path=None):
        self._libredwg = libredwg_path or shutil.which("dwg2dxf")
        self._oda = oda_converter_path or shutil.which("ODAFileConverter")

    @property
    def is_available(self) -> bool:
        return bool(self._libredwg or self._oda)

    @property
    def backend(self) -> str:
        if self._libredwg: return "libredwg"
        if self._oda: return "oda"
        return "none"

    async def convert(self, dwg_path, *, output_path=None, dxf_version="R2013") -> Path:
        """Convert DWG to DXF, returning the path to the DXF file."""
        dwg_path = Path(dwg_path)
        if not dwg_path.exists():
            raise FileNotFoundError(f"DWG file not found: {dwg_path}")

        if output_path is None:
            output_path = dwg_path.with_suffix(".dxf")
        output_path = Path(output_path)

        if self._libredwg:
            return await self._convert_libredwg(dwg_path, output_path)
        elif self._oda:
            return await self._convert_oda(dwg_path, output_path, dxf_version)
        else:
            raise RuntimeError("No DWG conversion backend available")

    async def _convert_libredwg(self, dwg_path, output_path) -> Path:
        proc = await asyncio.create_subprocess_exec(
            self._libredwg, str(dwg_path), "-o", str(output_path),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            raise RuntimeError(f"dwg2dxf failed: {stderr.decode()}")
        return output_path

    async def _convert_oda(self, dwg_path, output_path, dxf_version) -> Path:
        # ODA converter works on directories
        with tempfile.TemporaryDirectory() as tmpdir:
            input_dir = Path(tmpdir) / "input"
            output_dir = Path(tmpdir) / "output"
            input_dir.mkdir()
            output_dir.mkdir()

            shutil.copy2(dwg_path, input_dir / dwg_path.name)

            oda_version_map = {
                "R2013": "ACAD2013", "R2018": "ACAD2018",
                "R2010": "ACAD2010", "R2007": "ACAD2007",
            }
            oda_version = oda_version_map.get(dxf_version, "ACAD2013")

            proc = await asyncio.create_subprocess_exec(
                self._oda,
                str(input_dir), str(output_dir),
                oda_version, "DXF", "0", "1",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await proc.communicate()

            converted = list(output_dir.glob("*.dxf"))
            if not converted:
                raise RuntimeError("ODA conversion produced no DXF output")

            shutil.copy2(converted[0], output_path)
            return output_path
```

#### 4.2.2 Add LibreDWG Dependency

**For the Docker image / deployment:**
```dockerfile
# In the floor-plan-digitizer Dockerfile:
RUN apt-get update && apt-get install -y libredwg-utils
```

**For local development:**
```bash
# Ubuntu/Debian:
sudo apt-get install libredwg-utils

# macOS:
brew install libredwg
```

**For the Python package:**
```
# requirements.txt — no pip package needed; LibreDWG is a system binary (dwg2dxf)
```

#### 4.2.3 Add ODA File Converter as Fallback

The ODA File Converter is a free (registration required) binary from Open Design Alliance. It supports more DWG versions than LibreDWG.

**Download:** https://www.opendesign.com/guestfiles/oda_file_converter

---

### Phase 3: PDF Floor Plan Support (1 sprint)

#### 4.3.1 Add PDF-to-Image Conversion

**Dependency:** `pdf2image` (uses `poppler-utils`)

```python
# New service in vision-engine or floor-plan-digitizer:
from pdf2image import convert_from_bytes

def extract_floor_plan_from_pdf(pdf_bytes: bytes) -> list[Image.Image]:
    """Convert PDF pages to images for VLM processing."""
    images = convert_from_bytes(pdf_bytes, dpi=300, fmt="png")
    return images
```

#### 4.3.2 Update Vision Engine File-Type Router

```python
# In vision router or a new preprocessor:
async def preprocess_upload(storage_key: str, mime_type: str) -> str:
    """Route uploaded files to appropriate processing pipeline."""
    if mime_type in ('application/pdf',):
        # Convert PDF to image, return image URL
        pdf_bytes = await download_from_storage(storage_key)
        images = extract_floor_plan_from_pdf(pdf_bytes)
        # Save first page as image, return its URL
        image_key = await save_to_storage(images[0], "png")
        return get_presigned_url(image_key)

    elif mime_type in DWG_MIME_TYPES:
        # Convert DWG to DXF, parse directly (no VLM needed)
        dwg_bytes = await download_from_storage(storage_key)
        # Save to temp file, run converter
        ...
        return "dwg_direct"  # Signal direct DXF parsing path

    else:
        # Already an image, use directly
        return get_presigned_url(storage_key)
```

---

### Phase 4: Floor Plan → BOM Bridge (1-2 sprints)

This is the most architecturally significant change. Currently:
- BOM engine input = `design_variant.spec_json` (furniture/finish descriptions)
- Floor plan output = `FloorPlanData` (walls, rooms, openings with mm coordinates)

#### 4.4.1 Option A: Structural BOM from Floor Plan (Recommended)

Create a new "Structural BOM" capability that generates a BOM directly from floor plan geometry:

```python
class StructuralBOMGenerator:
    """Generate a construction BOM directly from FloorPlanData.

    This bypasses the design variant and produces a civil/structural BOM:
    - Wall materials (bricks, cement, sand based on wall dimensions)
    - Flooring materials (tiles/marble based on room areas)
    - Door/window frames and hardware
    - Electrical rough-in materials
    - Plumbing rough-in materials (for bathrooms/kitchens)
    - Painting materials (based on wall surface area)
    """

    def generate(self, floor_plan: FloorPlanData, budget_tier: str = "mid_range") -> BOMResult:
        items = []

        for wall in floor_plan.walls:
            # Calculate wall area in sqft
            wall_area_sqft = (wall.length_mm * wall.height_mm) / (304.8 ** 2)
            # Add bricks, cement, sand, plaster, etc.
            items.extend(self._wall_materials(wall, wall_area_sqft, budget_tier))

        for room in floor_plan.rooms:
            floor_area_sqft = room.area_sqm * 10.764
            # Add flooring, painting, electrical, etc.
            items.extend(self._room_materials(room, floor_area_sqft, budget_tier))

        for opening in floor_plan.openings:
            # Add door/window frames, hardware, glass
            items.extend(self._opening_materials(opening, budget_tier))

        return self._assemble_bom(items)
```

#### 4.4.2 Option B: Floor Plan → Design → BOM (Current Architecture Extension)

Alternatively, bridge the gap by feeding floor plan data into the design engine:

```
Floor Plan (FloorPlanData) → Design Engine (with room geometry as context) → Design Variant → BOM
```

This would require modifying the design engine to accept structured room geometry instead of just photos.

#### 4.4.3 Option C: DWG-Native BOM Extraction

For DWG files created by architects that already contain material schedules:

```python
class DWGBOMExtractor:
    """Extract BOM data directly from DWG drawing tables/schedules.

    AutoCAD drawings often contain:
    - Material schedules (in table entities)
    - Door/window schedules
    - Finish schedules
    - Quantity take-off tables
    - Title block data with project info
    """

    def extract_from_dxf(self, dxf_path: Path) -> list[BOMItem]:
        doc = ezdxf.readfile(str(dxf_path))
        msp = doc.modelspace()

        items = []
        # Extract TABLE entities
        for table in msp.query("TABLE"):
            items.extend(self._parse_table(table))

        # Extract TEXT/MTEXT for schedule information
        for text in msp.query("MTEXT"):
            if self._is_schedule_text(text):
                items.extend(self._parse_schedule_text(text))

        return items
```

---

### Phase 5: End-to-End Integration (1 sprint)

#### 4.5.1 New API Endpoint: DWG-to-BOM

```python
# New endpoint in BOM engine or a new orchestrator service:
@router.post("/api/v1/bom/from-floor-plan")
async def generate_bom_from_floor_plan(
    upload_id: str,
    budget_tier: str = "mid_range",
    currency: str = "INR",
):
    """Generate BOM directly from an uploaded DWG/DXF/PDF floor plan."""
    # 1. Fetch upload metadata
    # 2. Download file from MinIO
    # 3. Route by file type:
    #    - DWG: Convert to DXF, parse with ezdxf
    #    - DXF: Parse directly with ezdxf
    #    - PDF: Convert to image, run VLM extraction
    #    - Image: Run VLM extraction
    # 4. Get FloorPlanData
    # 5. Generate structural BOM from FloorPlanData
    # 6. Return BOM result
```

#### 4.5.2 Frontend Integration

Add a "Generate BOM from Floor Plan" button on the floor plan page that doesn't require going through design generation first.

---

## 5. Proposed User Flow: DWG → BOM

### Flow A: DWG File Upload

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. User uploads .DWG file via floor-plan-upload component            │
│    ├─ Frontend validates extension (.dwg) ✓                          │
│    ├─ Backend validates MIME type (NEEDS: DWG types added)           │
│    ├─ File stored in MinIO with storageKey                           │
│    └─ Upload record saved to PostgreSQL                              │
│                                                                      │
│ 2. File-type router detects DWG format                               │
│    ├─ Downloads DWG from MinIO to temp file                          │
│    ├─ Runs DWGConverter (LibreDWG dwg2dxf)                          │
│    ├─ Produces .DXF file                                             │
│    └─ Stores converted DXF back in MinIO                             │
│                                                                      │
│ 3. DXF parser extracts structural data                               │
│    ├─ Walls (LINE entities on wall layers)                           │
│    ├─ Rooms (LWPOLYLINE entities on room layers)                    │
│    ├─ Doors/Windows (BLOCK references, INSERT entities)             │
│    ├─ Dimensions (DIMENSION entities)                                │
│    └─ Returns FloorPlanData (JSON)                                   │
│                                                                      │
│ 4. User reviews detected rooms on the floor plan viewer              │
│    ├─ SVG preview generated from FloorPlanData                      │
│    ├─ Room dimensions shown                                          │
│    └─ User can edit/correct room boundaries                          │
│                                                                      │
│ 5. User clicks "Generate BOM"                                        │
│    ├─ Option A: Structural BOM (directly from geometry)             │
│    │   ├─ Wall materials calculated from wall lengths/heights        │
│    │   ├─ Flooring from room areas                                   │
│    │   ├─ Door/window hardware from openings                         │
│    │   └─ Electrical/plumbing from room types                        │
│    │                                                                  │
│    ├─ Option B: Design-based BOM                                     │
│    │   ├─ Trigger design generation with room geometry               │
│    │   ├─ Select design variant                                      │
│    │   └─ Generate BOM from design spec                              │
│    │                                                                  │
│    └─ Option C: DWG-native BOM (if schedules exist in DWG)          │
│        ├─ Extract TABLE entities from DXF                            │
│        ├─ Parse material/door/window schedules                       │
│        └─ Convert to BOM items                                       │
│                                                                      │
│ 6. BOM displayed with category breakdown                             │
│    ├─ Total cost with budget tier pricing                            │
│    ├─ Material substitution suggestions                              │
│    └─ Export: Excel / CSV / PDF                                      │
└────────────────────────────────────────────────────────────────────────┘
```

### Flow B: PDF of DWG Upload

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. User uploads .PDF file containing floor plan                      │
│    ├─ Could be: exported from AutoCAD, printed to PDF, scanned      │
│    └─ File stored in MinIO                                           │
│                                                                      │
│ 2. PDF processor extracts floor plan                                 │
│    ├─ Vector PDF: Extract geometry directly (pdfplumber/pdfminer)   │
│    ├─ Raster PDF: Convert to high-res image (pdf2image at 300 DPI) │
│    └─ Multi-page: Let user select the floor plan page               │
│                                                                      │
│ 3. Route to appropriate pipeline:                                    │
│    ├─ Vector PDF → Parse lines/shapes → FloorPlanData               │
│    └─ Raster PDF → VLM extraction (GPT-4o) → FloorPlanData         │
│                                                                      │
│ 4-6. Same as DWG flow above                                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Technology Recommendations

### 6.1 DWG Reading Options

| Option | License | DWG Versions | Quality | Recommended? |
|--------|---------|-------------|---------|-------------|
| **LibreDWG** (`dwg2dxf`) | GPLv3 | R2000–R2018 | Good for most files | Yes (primary) |
| **ODA File Converter** | Free (proprietary) | R14–R2024 | Excellent, widest support | Yes (fallback) |
| **Teigha (ODA SDK)** | Commercial | All | Best | If budget allows |
| **ezdxf** (DXF only) | MIT | N/A (DXF only) | Excellent for DXF | Already used |
| **Aspose.CAD** (Python) | Commercial | All DWG/DXF | Excellent | Alternative option |

**Recommendation:** Use LibreDWG as primary (open source, GPLv3-compatible), ODA File Converter as fallback (wider DWG version support), and ezdxf for DXF parsing (already integrated).

### 6.2 PDF Processing Options

| Option | Purpose | License |
|--------|---------|---------|
| **pdf2image** + poppler | PDF → raster images | MIT/GPL |
| **pdfplumber** | Extract vector graphics/text from PDF | MIT |
| **PyMuPDF (fitz)** | Fast PDF rendering and text extraction | AGPL |
| **pdfminer.six** | Text and layout extraction | MIT |

**Recommendation:** Use `pdf2image` for raster conversion (scanned PDFs) and `pdfplumber` for vector PDF geometry extraction.

### 6.3 Additional Dependencies Needed

```
# ml/floor-plan-digitizer/requirements.txt — add:
pdf2image>=1.16
pdfplumber>=0.10

# System packages (Dockerfile):
poppler-utils   # for pdf2image
libredwg-utils  # for dwg2dxf
```

---

## 7. Architectural Diagram: Target State

```
                    ┌──────────────┐
                    │  User Upload │
                    │  (DWG/DXF/   │
                    │  PDF/Image)  │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  Upload API  │
                    │  (validate,  │
                    │  store MinIO)│
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  File Router │◄── NEW: detect file type
                    └──┬───┬───┬──┘
                       │   │   │
              ┌────────┘   │   └────────┐
              │            │            │
        ┌─────▼─────┐ ┌───▼────┐ ┌─────▼─────┐
        │ DWG→DXF   │ │ PDF→   │ │  Image    │
        │ converter │ │ Image  │ │  (direct) │
        │ (LibreDWG)│ │ (pdf2  │ │           │
        │    NEW    │ │ image) │ │           │
        └─────┬─────┘ │  NEW   │ └─────┬─────┘
              │        └───┬────┘       │
              │            │            │
        ┌─────▼─────┐     │      ┌─────▼─────┐
        │ DXF Parse │     │      │ VLM Floor │
        │ (ezdxf)   │     │      │ Plan      │
        │ EXISTING  │     └──────►│ Extractor │
        └─────┬─────┘            │ EXISTING  │
              │                   └─────┬─────┘
              │                         │
              └────────┬────────────────┘
                       │
                ┌──────▼───────┐
                │ FloorPlanData│  (walls, rooms, openings, dimensions)
                │  EXISTING    │
                └──────┬───────┘
                       │
              ┌────────┼────────┐
              │        │        │
        ┌─────▼──┐ ┌──▼────┐ ┌─▼─────────┐
        │Struct. │ │Design │ │DWG-native │
        │BOM     │ │Engine │ │BOM extract│
        │ NEW    │ │EXISTNG│ │   NEW     │
        └────┬───┘ └──┬────┘ └─────┬─────┘
             │        │            │
             │   ┌────▼────┐       │
             │   │BOM Agent│       │
             │   │EXISTING │       │
             │   └────┬────┘       │
             │        │            │
             └────────┼────────────┘
                      │
               ┌──────▼───────┐
               │  BOM Result  │
               │  EXISTING    │
               └──────┬───────┘
                      │
               ┌──────▼───────┐
               │Export: Excel, │
               │CSV, PDF       │
               │  EXISTING     │
               └───────────────┘
```

---

## 8. Priority Implementation Roadmap

### Sprint 1: Enable DWG/DXF Upload (Unblock the pipeline)
1. Add DWG/DXF MIME types to upload API (`route.ts`)
2. Add extension-based validation fallback
3. Increase upload size limit to 50MB
4. Update media service for CAD files
5. **Deliverable:** Users can upload DWG/DXF files (stored, not yet processed)

### Sprint 2: Implement DWG Converter
1. Create `dwg_converter.py` with LibreDWG backend
2. Add ODA File Converter fallback
3. Add `libredwg-utils` to Docker images
4. Wire converter into `FloorPlanPipeline.digitize_dwg()`
5. **Deliverable:** DWG files converted to DXF and parsed into FloorPlanData

### Sprint 3: PDF Floor Plan Support
1. Add `pdf2image` dependency
2. Create PDF page extraction service
3. Add vector PDF parsing with `pdfplumber`
4. Update vision engine file-type routing
5. **Deliverable:** PDF floor plans converted to images and processed via VLM

### Sprint 4: Floor Plan → BOM Bridge
1. Create `StructuralBOMGenerator` service
2. Add `/api/v1/bom/from-floor-plan` endpoint
3. Wire floor plan digitization output to BOM input
4. Add DWG-native schedule extraction (TABLE/TEXT entities)
5. **Deliverable:** BOM generated directly from floor plan geometry

### Sprint 5: End-to-End Integration & Polish
1. Frontend "Generate BOM from Floor Plan" button
2. Multi-page PDF page selector UI
3. Floor plan review/edit UI before BOM generation
4. Error handling for unsupported DWG versions
5. **Deliverable:** Complete DWG → BOM user flow

---

## 9. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| LibreDWG fails on some DWG versions | Medium | High | ODA File Converter fallback |
| DWG files have no layer organization | Medium | Medium | Fallback: treat all lines as walls |
| VLM extraction inaccurate for complex plans | Medium | Medium | Allow manual correction UI |
| Large DWG files (>50MB) cause timeouts | Low | Medium | Async processing, progress polling |
| PDF vector extraction misses elements | Medium | Medium | Fallback to raster VLM path |
| BOM quantity accuracy from geometry alone | High | Medium | LLM-assisted quantity refinement |

---

## 10. Files Referenced in This Audit

| File | Lines | Role |
|------|-------|------|
| `apps/web/src/components/floor-plan-upload.tsx` | 1-316 | Frontend upload component |
| `apps/web/src/app/api/upload/route.ts` | 1-116 | Backend upload endpoint |
| `apps/web/src/app/api/jobs/floor-plan-digitize/route.ts` | 1-69 | Digitization job trigger |
| `apps/web/src/server/trpc/routers/bom.ts` | 1-130 | BOM tRPC router |
| `services/bom-engine/src/routers/bom.py` | 1-345 | BOM API router |
| `services/bom-engine/src/agents/bom_agent.py` | 1-621 | LangGraph BOM agent |
| `services/media-service/src/routers/upload.py` | 1-209 | Media upload handler |
| `services/vision-engine/src/routers/vision.py` | 1-139 | Vision job router |
| `services/vision-engine/src/agents/vision_agent.py` | 1-107 | VLM room detection |
| `ml/floor-plan-digitizer/src/openlintel_digitizer/pipeline.py` | 1-339 | Digitization pipeline |
| `ml/floor-plan-digitizer/src/openlintel_digitizer/__init__.py` | 1-37 | Package docs |
| `ml/floor-plan-digitizer/src/openlintel_digitizer/dxf_generator.py` | 1-392 | DXF output generator |
| `ml/floor-plan-digitizer/src/openlintel_digitizer/vlm_extractor.py` | 1-367 | VLM floor plan extractor |
| `ml/floor-plan-digitizer/src/openlintel_digitizer/schemas.py` | 1-271 | FloorPlanData schemas |
| `ml/floor-plan-digitizer/src/openlintel_digitizer/dwg_converter.py` | **DOES NOT EXIST** | DWG→DXF converter |
| `packages/db/src/schema/app.ts` | — | Database schema |

---

## 11. Summary

The OpenLintel codebase has **strong architectural foundations** for a DWG-to-BOM pipeline:
- The `FloorPlanPipeline` class has the right method signatures and flow design
- The DXF parser (`_parse_dxf`) is fully functional
- The BOM engine is production-ready with LLM extraction, pricing, optimization, and export
- The frontend UI already accepts DWG files

But **three critical modules are missing**:
1. **`dwg_converter.py`** — the DWG-to-DXF conversion bridge
2. **Upload API DWG/DXF MIME support** — the backend gate that blocks uploads
3. **Floor Plan → BOM bridge** — the connection between structural geometry and material calculation

Building these three modules, plus PDF support, would unlock the full DWG → BOM pipeline in approximately 3-5 sprints.
