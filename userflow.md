# OpenLintel — Complete User Flow Documentation

> **Version**: 1.0
> **Last Updated**: 2026-03-03
> **Product**: OpenLintel — End-to-End Home Design Automation Platform

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [Authentication & Onboarding](#3-authentication--onboarding)
4. [Dashboard & Project Management](#4-dashboard--project-management)
5. [Room Management](#5-room-management)
6. [Floor Plan Digitization](#6-floor-plan-digitization)
7. [Photo-to-3D Reconstruction](#7-photo-to-3d-reconstruction)
8. [Style Quiz & Mood Board](#8-style-quiz--mood-board)
9. [AI Design Generation](#9-ai-design-generation)
10. [3D Interactive Editor](#10-3d-interactive-editor)
11. [Bill of Materials (BOM)](#11-bill-of-materials-bom)
12. [Technical Drawings](#12-technical-drawings)
13. [CNC Cut List & Nesting](#13-cnc-cut-list--nesting)
14. [MEP Engineering](#14-mep-engineering)
15. [Building Code Compliance](#15-building-code-compliance)
16. [IFC/BIM Export](#16-ifcbim-export)
17. [Project Timeline & Scheduling](#17-project-timeline--scheduling)
18. [Change Orders](#18-change-orders)
19. [Site Logs](#19-site-logs)
20. [Quality Assurance & Punch List](#20-quality-assurance--punch-list)
21. [Collaboration Hub](#21-collaboration-hub)
22. [Procurement & Purchase Orders](#22-procurement--purchase-orders)
23. [Delivery Tracking](#23-delivery-tracking)
24. [Payments & Invoices](#24-payments--invoices)
25. [Financial Reports](#25-financial-reports)
26. [Analytics Dashboard](#26-analytics-dashboard)
27. [AI Cost & Timeline Predictions](#27-ai-cost--timeline-predictions)
28. [Budget Optimizer](#28-budget-optimizer)
29. [Sustainability Scoring](#29-sustainability-scoring)
30. [Contractor Marketplace](#30-contractor-marketplace)
31. [Product Catalogue](#31-product-catalogue)
32. [Vendor Performance Management](#32-vendor-performance-management)
33. [Offcuts Exchange Marketplace](#33-offcuts-exchange-marketplace)
34. [Digital Twin & IoT](#34-digital-twin--iot)
35. [Maintenance Scheduling](#35-maintenance-scheduling)
36. [Warranty Tracking](#36-warranty-tracking)
37. [Handover Package](#37-handover-package)
38. [AR/VR Viewer](#38-arvr-viewer)
39. [Portfolio Management](#39-portfolio-management)
40. [Developer API Portal](#40-developer-api-portal)
41. [Notifications System](#41-notifications-system)
42. [Admin Panel](#42-admin-panel)
43. [Settings & Preferences](#43-settings--preferences)
44. [End-to-End Master Flow](#44-end-to-end-master-flow)

---

## 1. Platform Overview

OpenLintel transforms how homes are designed, documented, procured, and built. It takes room photos or floor plans and produces AI-designed interiors, technical drawings, manufacturing-ready cut lists, engineering calculations, bills of materials, project timelines, procurement coordination, site management, financial tracking, and post-completion digital twins.

### Core Value Chain

```
Photos/Floor Plans
    → AI Design Generation (multiple styles & budgets)
        → Technical Drawings (DXF/PDF/IFC)
        → Bill of Materials (quantities + pricing)
        → CNC Cut Lists (nesting optimization)
        → MEP Engineering (electrical, plumbing, HVAC)
            → Procurement & Purchase Orders
                → Project Timeline & Scheduling
                    → Construction Management (site logs, quality)
                        → Payments & Financial Tracking
                            → Handover Package
                                → Digital Twin & Maintenance
```

---

## 2. User Roles & Permissions

### Role Hierarchy

| Role | Access Level | Key Capabilities |
|------|-------------|-----------------|
| **Admin** | Full system | User management, system health, job queue monitoring, all project access |
| **Homeowner/User** | Own projects | Create/manage projects, approve designs, manage payments, full financial visibility |
| **Designer** | Assigned projects | Edit designs & materials, propose design variants, partial cost visibility |
| **Architect** | Assigned projects | View/modify structural elements, full technical drawings, no finance access |
| **Contractor** | Assigned tasks | View assigned tasks, submit site logs, mark task completion, task-related budget only |
| **Factory** | Production batches | View cut lists for production, mark units shipped, no design/finance access |

### Permission Matrix

| Feature | Admin | Homeowner | Designer | Architect | Contractor | Factory |
|---------|-------|-----------|----------|-----------|------------|---------|
| Create projects | Yes | Yes | No | No | No | No |
| View all projects | Yes | Own only | Assigned | Assigned | Assigned | Assigned |
| Generate designs | Yes | Yes | Yes | No | No | No |
| Approve designs | Yes | Yes | No | No | No | No |
| Edit designs (3D) | Yes | Yes | Yes | Structural only | No | No |
| View BOM/costs | Yes | Yes | Partial | No | Task-related | No |
| Manage payments | Yes | Yes | No | No | No | No |
| Submit site logs | Yes | Yes | No | No | Yes | No |
| View cut lists | Yes | Yes | Yes | Yes | No | Yes |
| Manage users | Yes | No | No | No | No | No |

---

## 3. Authentication & Onboarding

### 3.1 Sign Up / Sign In

**Route**: `/auth/signin`

**Flow**:
```
1. User lands on homepage (/)
2. Clicks "Sign In" or "Get Started"
3. Redirected to /auth/signin
4. Presented with OAuth options:
   ├── "Sign in with Google"
   └── "Sign in with GitHub"
5. User clicks preferred provider
6. Redirected to provider's consent screen
7. User grants permissions
8. Provider redirects back with authorization code
9. NextAuth exchanges code for access token
10. User record created in database (first time) or matched (returning)
11. JWT session token set as httpOnly cookie
12. User redirected to /dashboard
```

**First-Time User**:
- Account auto-created via OAuth adapter
- Default role: `user`
- Default currency: `USD`
- Default locale: `en_US`
- Default unit system: `metric`

**Returning User**:
- Session restored from JWT
- Redirected directly to `/dashboard`

### 3.2 Session Management

- **Type**: JWT (stateless, no server-side session store)
- **Storage**: httpOnly secure cookie
- **Expiry**: Configurable (default: 30 days)
- **Refresh**: Automatic on page load via NextAuth

### 3.3 Sign Out

```
1. User clicks avatar in top navigation
2. Selects "Sign Out" from dropdown menu
3. NextAuth clears session cookie
4. User redirected to /auth/signin
```

---

## 4. Dashboard & Project Management

### 4.1 Projects Dashboard

**Route**: `/dashboard`

**What the user sees**:
- Grid of project cards (name, status badge, address, room count, last modified)
- "Create Project" button
- Empty state with CTA if no projects exist

**Flow — Create New Project**:
```
1. User clicks "Create Project" button
2. Dialog opens with form:
   ├── Project Name (required, text input)
   ├── Address (optional, text input)
   └── Unit System (dropdown: metric / imperial)
3. User fills in details and clicks "Create"
4. API call: trpc.project.create
5. New project appears in dashboard grid
6. User clicks project card to enter it
7. Redirected to /project/[id]
```

**Flow — View Project**:
```
1. User clicks project card
2. Redirected to /project/[id] (Project Overview page)
3. Sees:
   ├── Project header (name, status, address)
   ├── Room cards (type badge, dimensions)
   ├── Quick stats (rooms, designs, status)
   └── Sidebar navigation (30+ project sections)
```

**Flow — Delete Project**:
```
1. User opens project
2. Clicks delete option (typically in settings or context menu)
3. Confirmation dialog appears
4. User confirms deletion
5. Project and all associated data removed
6. Redirected back to /dashboard
```

### 4.2 Project Status Lifecycle

```
draft
  → designing (when first design generation starts)
    → design_approved (when homeowner approves a design)
      → procurement (when purchase orders are created)
        → in_construction (when site work begins)
          → punch_list (when final QA starts)
            → completed (all items resolved)
              → maintenance (post-handover phase)
```

---

## 5. Room Management

**Route**: `/project/[id]/rooms`

### 5.1 Room List View

**What the user sees**:
- List/grid of room cards
- Each card shows: room name, type badge, dimensions (L × W × H), floor number
- "Add Room" button

### 5.2 Add Room

**Flow**:
```
1. User clicks "Add Room"
2. Dialog opens with form:
   ├── Room Name (required, e.g., "Master Bedroom")
   ├── Room Type (dropdown: 15 types)
   │   ├── living_room, bedroom, kitchen, bathroom
   │   ├── dining, study, balcony, utility
   │   ├── foyer, corridor, pooja_room, store
   │   └── garage, terrace, other
   ├── Length (mm or ft based on unit system)
   └── Width (mm or ft based on unit system)
3. User fills details and clicks "Create"
4. API call: trpc.room.create
5. New room card appears in the list
6. Height defaults to 2700mm (9ft)
```

### 5.3 Room Detail

**Route**: `/project/[id]/rooms/[roomId]`

**What the user sees**:
- Room information (name, type, dimensions, floor)
- Uploaded photos for this room
- Associated design variants
- Upload zone for room photos

### 5.4 Upload Room Photos

**Flow**:
```
1. User navigates to room detail page
2. Clicks upload zone or drags files
3. File validation:
   ├── Allowed: JPEG, PNG, WebP, GIF, PDF
   └── Max size: 10MB per file
4. Upload progress bar shown (10% → 30% → 80% → 100%)
5. API call: POST /api/upload with FormData
6. File stored in MinIO/S3
7. Thumbnail auto-generated (256×256px)
8. Image hash computed for deduplication
9. Photo appears in room's photo gallery
```

---

## 6. Floor Plan Digitization

**Route**: `/project/[id]/floor-plan`

### 6.1 Overview

Takes a floor plan image (photo or scan) and uses AI (VLM) to automatically detect rooms, dimensions, door positions, and window locations.

### 6.2 User Flow

**Tab 1 — Upload**:
```
1. User navigates to /project/[id]/floor-plan
2. Sees "Upload" tab (active by default)
3. Drags floor plan image or clicks to browse
4. File uploads with progress bar
5. Uploaded floor plan appears as thumbnail
6. User clicks "Digitize" button
```

**Tab 2 — Processing & Viewer**:
```
7. Async job starts (status: pending → running)
8. Progress indicator shown with percentage
9. Backend Vision Engine processes image:
   ├── VLM (GPT-4o via LiteLLM) analyzes floor plan
   ├── Detects walls, rooms, doors, windows
   ├── Extracts room boundaries as polygons
   ├── Classifies room types (bedroom, kitchen, etc.)
   └── Estimates dimensions (if scale reference available)
10. Job completes (polled every 2 seconds)
11. "Viewer" tab activates with interactive SVG display:
    ├── Room polygons (color-coded by type)
    ├── Room labels (name, type, area)
    ├── Zoom controls (25% - 300%)
    ├── Pan/scroll navigation
    └── Click room for details (toast with info)
```

**Tab 3 — Detected Rooms**:
```
12. User switches to "Detected Rooms" tab
13. Sees list of AI-detected rooms with:
    ├── Name (auto-generated, e.g., "Bedroom 1")
    ├── Type (classified by AI)
    ├── Dimensions (length × width in mm)
    └── Area (calculated)
14. User can review and edit room details
15. Clicks "Create Rooms" button
16. All detected rooms batch-created in project
17. Rooms appear in /project/[id]/rooms
```

---

## 7. Photo-to-3D Reconstruction

**Route**: `/project/[id]/reconstruction`

### 7.1 Overview

Takes multiple room photos from different angles and generates a 3D model with calibrated measurements.

### 7.2 User Flow

```
1. User navigates to /project/[id]/reconstruction
2. Uploads multiple room photos (minimum 3-5 recommended)
3. Optionally provides a reference object for scale calibration
   (e.g., "door height = 2100mm")
4. Clicks "Start Reconstruction"
5. Async job starts:
   ├── Depth estimation (Depth Anything V2)
   ├── Multi-view geometry alignment (COLMAP)
   ├── Point cloud generation
   ├── Mesh reconstruction (Open3D)
   ├── Scale calibration from reference object
   └── glTF/GLB model export
6. Progress polled every 2 seconds
7. On completion:
   ├── 3D model viewer loads (React Three Fiber)
   ├── Measurements displayed with confidence scores
   ├── Model can be orbited/zoomed
   └── Dimensions extracted for room creation
8. User can accept measurements to update room dimensions
```

---

## 8. Style Quiz & Mood Board

**Route**: `/project/[id]/style-quiz`

### 8.1 Overview

A 5-step wizard that captures the user's design preferences to inform AI design generation.

### 8.2 User Flow

```
1. User navigates to /project/[id]/style-quiz
2. Step 1: Style Images
   ├── Shown curated interior images
   ├── User selects ones they like (swipe/click)
   └── AI detects style preferences from selections
3. Step 2: Color Preferences
   ├── Color palette options shown
   ├── User picks preferred palettes
   └── Can specify colors to avoid
4. Step 3: Budget Tier
   ├── Economy (basic, functional)
   ├── Mid-range (balanced quality/cost)
   ├── Premium (high quality materials)
   └── Luxury (top-tier everything)
5. Step 4: Functional Requirements
   ├── Storage needs (minimal/moderate/extensive)
   ├── Lifestyle notes (kids, pets, work-from-home)
   └── Special requirements (accessibility, etc.)
6. Step 5: Mood Board Review
   ├── AI generates mood board from responses
   ├── Curated images matching detected styles
   ├── Color palette visualization
   └── Style summary (e.g., "Modern Minimalist with warm accents")
7. User confirms preferences
8. Style data saved to project's stylePreferences
9. Used as input for AI design generation
```

---

## 9. AI Design Generation

**Route**: `/project/[id]/designs`

### 9.1 Overview

Generates multiple AI-designed interior variants for each room, considering style preferences, budget tier, room dimensions, and constraints.

### 9.2 Generate Designs

**Flow**:
```
1. User navigates to /project/[id]/designs
2. Clicks "Generate Design" button
3. Design Generation Dialog opens:
   ├── Select Room (dropdown of project rooms)
   ├── Design Name (e.g., "Modern Living V1")
   ├── Design Style (10 options):
   │   ├── modern, traditional, minimalist
   │   ├── scandinavian, industrial, bohemian
   │   ├── contemporary, mid_century, japandi
   │   └── art_deco
   ├── Budget Tier (economy/mid_range/premium/luxury)
   ├── Constraints (optional, e.g., "no red", "maximize storage")
   └── Additional Prompt (optional free text)
4. User clicks "Generate"
5. API creates design variant + async job
6. Design Engine processes (LangGraph orchestration):
   ├── Retrieves user's encrypted LLM API key
   ├── Decrypts key (AES-256-GCM)
   ├── Constructs prompt with room data + style + budget
   ├── Calls VLM (OpenAI/Anthropic/Google via LiteLLM)
   ├── Generates design specification JSON
   ├── Creates render image(s)
   └── Stores renders in MinIO/S3
7. Frontend polls job status every 2 seconds
8. Progress bar shown (0-100%)
9. On completion:
   ├── Render image(s) displayed
   ├── Design specification viewable
   └── Status changes to "completed"
```

### 9.3 View & Compare Designs

**Route**: `/project/[id]/designs/[designId]`

**Flow**:
```
1. User sees design cards in grid view
2. Can filter by room (dropdown)
3. Each card shows:
   ├── Render thumbnail
   ├── Design name
   ├── Style badge (e.g., "Modern")
   ├── Budget tier badge (e.g., "Premium")
   └── Status indicator
4. Click card → design detail page
5. Detail page shows:
   ├── Full render image(s)
   ├── Design specification
   ├── Associated BOM (if generated)
   ├── Technical drawings (if generated)
   └── Actions: Generate BOM, Generate Drawings, Approve
```

### 9.4 Approve Design

**Flow**:
```
1. Homeowner reviews design render and specs
2. Can add comments via Collaboration Hub
3. Clicks "Approve" or "Request Revision"
4. If approved:
   ├── Approval record created
   ├── Notification sent to team
   ├── Project status updates to "design_approved"
   └── Unlocks procurement workflow
5. If revision requested:
   ├── Notes added to approval
   ├── Designer notified
   └── New variant can be generated
```

---

## 10. 3D Interactive Editor

**Route**: `/project/[id]/editor`

### 10.1 Overview

A full WebGL-based 3D editor for placing furniture, changing materials, and collaborating in real-time with other users.

### 10.2 Editor Layout

```
┌──────────────────────────────────────────────┐
│ Toolbar: Select | Move | Rotate | Scale | Measure │
├────────┬─────────────────────────────┬───────┤
│        │                             │       │
│ Furni- │     3D Viewport             │ Prop- │
│ ture   │     (React Three Fiber)     │ erty  │
│ Cata-  │                             │ Panel │
│ logue  │     Room walls/floor/       │       │
│        │     ceiling + furniture     │ Mate- │
│ By     │     objects                 │ rial  │
│ cate-  │                             │ Pick- │
│ gory   │     Grid overlay (optional) │ er    │
│        │                             │       │
│        │     Collab cursors shown    │ Light │
│        │                             │ Panel │
├────────┴─────────────────────────────┴───────┤
│ Status: Grid 0.5m | Snap ON | 3 users online │
└──────────────────────────────────────────────┘
```

### 10.3 User Flow

**Place Furniture**:
```
1. User selects room from room dropdown
2. 3D room geometry loads (walls, floor, ceiling)
3. Browse furniture catalogue (left panel, grouped by category)
4. Click furniture item to add to scene
5. Furniture appears at room center
6. Select furniture → bounding box + gizmo shown
7. Use Move tool (G key) to position
8. Use Rotate tool (R key) to orient
9. Use Scale tool (S key) to resize
10. Snap-to-grid aligns objects (toggle with grid controls)
```

**Change Materials**:
```
1. Select furniture object in viewport
2. Open Material Panel (right sidebar)
3. Choose from preset materials OR
4. Use color picker for custom color
5. Material updates in real-time on 3D object
```

**Configure Lighting**:
```
1. Open Lighting Panel (right sidebar)
2. Adjust ambient light intensity and color
3. Adjust directional light intensity, color, and angle
4. Changes reflected in real-time viewport
```

**Real-Time Collaboration**:
```
1. Multiple users open same project's editor
2. Y.js CRDT syncs furniture state across clients
3. Each user sees others' cursors (colored dots with names)
4. Furniture changes broadcast instantly via WebSocket
5. User presence shown in header (avatars)
6. No conflicts — CRDT handles concurrent edits
```

**View Controls**:
```
- Orbit: Left mouse drag
- Pan: Right mouse drag / Middle mouse
- Zoom: Scroll wheel
- View presets: Perspective, Isometric, Front, Side, Top
- Fullscreen toggle
```

**Keyboard Shortcuts**:
```
V - Select tool
G - Move tool
R - Rotate tool
S - Scale tool
M - Measure tool
Delete - Remove selected object
Escape - Deselect
```

---

## 11. Bill of Materials (BOM)

**Route**: `/project/[id]/bom`

### 11.1 Overview

Generates a comprehensive list of all materials, products, and quantities needed for a design variant, with pricing from the product catalogue.

### 11.2 Generate BOM

**Flow**:
```
1. User navigates to /project/[id]/bom
2. Selects a design variant from dropdown
3. Clicks "Generate BOM"
4. Async job starts:
   ├── BOM Engine extracts furniture from design spec
   ├── Maps furniture to catalogue products
   ├── Calculates material quantities from room dimensions
   ├── Applies waste factors (e.g., 10% for tiles)
   ├── Fetches vendor pricing
   └── Aggregates by category
5. Job polled every 2 seconds
6. On completion, BOM table displays
```

### 11.3 BOM Table

**What the user sees**:
```
┌──────────────────────────────────────────────────────────┐
│ BOM for "Modern Living V1"          [Export ▾] [Sort ▾]  │
├──────────────────────────────────────────────────────────┤
│ ▼ Furniture (5 items)                      Subtotal: $X  │
│   ├── Sofa 3-seater        2 × $800 = $1,600    5% waste│
│   ├── Coffee Table          1 × $350 = $350      0%     │
│   ├── TV Unit              1 × $600 = $600       0%     │
│   ├── Side Table           2 × $150 = $300       0%     │
│   └── Floor Lamp           1 × $120 = $120       0%     │
│                                                          │
│ ▼ Flooring (2 items)                       Subtotal: $Y  │
│   ├── Hardwood Oak         45 sqm × $25 = $1,125   10%  │
│   └── Underlay Foam        45 sqm × $5 = $225     10%   │
│                                                          │
│ ▼ Paint & Finishes (3 items)               Subtotal: $Z  │
│   ├── Wall Paint (White)   4 L × $35 = $140       15%   │
│   ├── Ceiling Paint        2 L × $30 = $60        15%   │
│   └── Wood Stain           1 L × $45 = $45        10%   │
│                                                          │
│ ═══════════════════════════════════════════════════════   │
│                              GRAND TOTAL: $4,565         │
└──────────────────────────────────────────────────────────┘
```

**Interactions**:
- Click column headers to sort (name, quantity, unitPrice, total, wasteFactor)
- Click category header to collapse/expand
- Sort direction toggles: ascending ↔ descending

### 11.4 Export BOM

**Flow**:
```
1. User clicks "Export" dropdown
2. Options:
   ├── CSV — direct browser download (Blob)
   ├── Excel (XLSX) — redirects to /api/bom/export/[bomId]?format=xlsx
   └── PDF — redirects to /api/bom/export/[bomId]?format=pdf
3. File downloads to user's device
```

---

## 12. Technical Drawings

**Route**: `/project/[id]/drawings`

### 12.1 Overview

Generates CAD-standard technical drawings from design variants in multiple formats (DXF, PDF, SVG, IFC).

### 12.2 User Flow

**Generate Drawings**:
```
1. User navigates to /project/[id]/drawings
2. Selects design variant
3. Selects drawing types to generate:
   ├── Floor Plan
   ├── Elevation (front, side, rear)
   ├── Section (cross-section cuts)
   ├── Reflected Ceiling Plan (RCP)
   ├── Flooring Layout
   └── Electrical Layout
4. Clicks "Generate"
5. Async job starts (Drawing Generator service)
6. Polled for status
7. On completion:
   ├── Drawing previews shown (SVG rendered in browser)
   ├── Download buttons for each format:
   │   ├── DXF (for AutoCAD/CAD software)
   │   ├── PDF (printable technical sheets)
   │   ├── SVG (web viewable)
   │   └── IFC (Building Information Modeling)
   └── Drawing metadata (scale, dimensions, date)
```

### 12.3 Drawing Types Explained

| Type | Content | Use Case |
|------|---------|----------|
| Floor Plan | Room layouts, walls, doors, windows, dimensions | General reference |
| Elevation | Vertical views of walls with furniture placement | Wall treatment planning |
| Section | Cross-section showing internal structure | Construction detail |
| RCP (Reflected Ceiling Plan) | Ceiling layout, light fixtures, AC vents | Electrical/HVAC coordination |
| Flooring Layout | Tile/plank patterns, starter rows, cuts | Flooring installation |
| Electrical Layout | Switch positions, outlet locations, circuit runs | Electrician reference |

---

## 13. CNC Cut List & Nesting

**Route**: `/project/[id]/cutlist`

### 13.1 Overview

Generates manufacturing-ready panel cut lists with optimized nesting patterns to minimize material waste.

### 13.2 User Flow

```
1. User navigates to /project/[id]/cutlist
2. BOM must already be generated for the design variant
3. Selects design variant
4. Clicks "Generate Cut List"
5. Async job starts (Cutlist Engine):
   ├── Extracts panel items from BOM
   ├── Adds grain direction & edge banding info
   ├── Runs nesting optimization (rectpack/DeepNest)
   ├── Optimizes for standard 8×4 ft sheets
   ├── Calculates waste percentage
   └── Generates nesting layout diagrams
6. On completion, user sees:
   ├── Panel Schedule (table):
   │   ├── Panel name, material, dimensions
   │   ├── Grain direction (horizontal/vertical)
   │   ├── Edge banding (which edges)
   │   └── Quantity needed
   ├── Hardware Schedule:
   │   ├── Hinges, handles, drawer slides
   │   └── Quantities and specifications
   ├── Nesting Diagram (visual):
   │   ├── Sheet layout showing panel placement
   │   ├── Color-coded by panel type
   │   ├── Waste areas highlighted
   │   └── Waste percentage displayed
   └── Summary:
       ├── Total sheets needed
       ├── Total waste percentage
       └── Material cost estimate
7. Export as DXF for CNC machine input
```

---

## 14. MEP Engineering

**Route**: `/project/[id]/mep`

### 14.1 Overview

Calculates Mechanical, Electrical, and Plumbing requirements based on design specifications, citing relevant building codes.

### 14.2 User Flow

```
1. User navigates to /project/[id]/mep
2. Three tabs available:
   ├── Electrical
   ├── Plumbing
   └── HVAC

3. Electrical Tab:
   ├── Select design variant
   ├── Click "Calculate Electrical"
   ├── MEP Calculator runs (NEC 2020 standards):
   │   ├── Circuit load calculations
   │   ├── Wire gauge recommendations
   │   ├── Breaker sizing
   │   ├── Panel schedule
   │   ├── Outlet placement recommendations
   │   └── Lighting circuit design
   ├── Results displayed with:
   │   ├── Circuit diagram
   │   ├── Panel schedule table
   │   ├── Wire gauge table
   │   └── Standards cited (NEC Article references)
   └── Export as PDF/drawing

4. Plumbing Tab:
   ├── Select design variant
   ├── Click "Calculate Plumbing"
   ├── MEP Calculator runs (IPC 2021 standards):
   │   ├── Pipe sizing for supply lines
   │   ├── Drainage pipe calculations
   │   ├── Fixture unit counts
   │   ├── Water heater sizing
   │   └── Vent stack requirements
   ├── Results with IPC references
   └── Export as PDF

5. HVAC Tab:
   ├── Select design variant
   ├── Click "Calculate HVAC"
   ├── MEP Calculator runs (ASHRAE 90.1):
   │   ├── Cooling load calculation (BTU/ton)
   │   ├── Heating load calculation
   │   ├── Duct sizing
   │   ├── Equipment recommendations
   │   └── Energy efficiency rating
   ├── Results with ASHRAE references
   └── Export as PDF
```

---

## 15. Building Code Compliance

**Route**: `/project/[id]/compliance`

### 15.1 User Flow

```
1. User navigates to /project/[id]/compliance
2. System checks design against applicable building codes:
   ├── India: National Building Code (NBC) 2016
   ├── USA: International Residential Code (IRC) 2021
   ├── EU: Eurocode standards
   └── UK: Building Regulations
3. Compliance report generated:
   ├── Pass/Fail per code section
   ├── Room-by-room analysis
   ├── Fire safety compliance
   ├── Structural requirements
   ├── Accessibility requirements
   ├── Ventilation requirements
   └── Emergency egress
4. Non-compliant items flagged with:
   ├── Code reference (e.g., "NBC 4.4.3.2")
   ├── Requirement description
   ├── Current value vs. required value
   └── Recommended fix
```

---

## 16. IFC/BIM Export

**Route**: Available from `/project/[id]/drawings`

### 16.1 User Flow

```
1. User generates drawings for a design variant
2. IFC export option available alongside DXF/PDF/SVG
3. Click "Download IFC"
4. IFC4-compliant file generated (using IfcOpenShell):
   ├── Walls with materials
   ├── Doors and windows
   ├── Floor slabs
   ├── Furniture objects
   ├── MEP elements (if calculated)
   └── Room boundaries
5. File downloadable for use in:
   ├── Autodesk Revit
   ├── ArchiCAD
   ├── BIM 360
   └── Other BIM software
```

---

## 17. Project Timeline & Scheduling

**Route**: `/project/[id]/timeline`

### 17.1 Overview

AI-generated Gantt chart with critical path analysis, task dependencies, and milestone-based payment linking.

### 17.2 User Flow

```
1. User navigates to /project/[id]/timeline
2. Two tabs available:
   ├── Gantt Chart
   └── Milestones

3. Generate Schedule:
   ├── Click "Generate Timeline"
   ├── AI analyzes project scope (rooms, BOM, design complexity)
   ├── Generates task sequence by trade:
   │   ├── Demolition
   │   ├── Civil/Structural
   │   ├── Plumbing rough-in
   │   ├── Electrical rough-in
   │   ├── HVAC installation
   │   ├── Carpentry/woodwork
   │   ├── Flooring
   │   ├── Painting
   │   ├── Fixture installation
   │   └── Final cleanup
   ├── Each task has:
   │   ├── Name, duration, start/end date
   │   ├── Dependencies (e.g., electrical after framing)
   │   ├── Progress percentage
   │   └── Critical path flag
   └── Schedule created with milestones

4. Gantt Chart View:
   ├── Horizontal bars per task (color-coded by trade)
   ├── Critical path highlighted in red
   ├── Dependencies shown as arrows
   ├── Today marker line
   ├── Drag to adjust dates (edit mode)
   └── Click task for details

5. Milestones Tab:
   ├── List of project milestones
   ├── Each milestone:
   │   ├── Name (e.g., "Carpentry Complete")
   │   ├── Due date
   │   ├── Status (pending/in_progress/completed/overdue)
   │   └── Payment linked (yes/no)
   ├── Click to update status
   └── Link payment to milestone
```

---

## 18. Change Orders

**Route**: `/project/[id]/change-orders`

### 18.1 User Flow

```
1. User navigates to /project/[id]/change-orders
2. Sees list of existing change orders (if any)
3. Click "Create Change Order" button
4. Change Order Dialog:
   ├── Title (e.g., "Upgrade kitchen countertop")
   ├── Description (detailed scope of change)
   └── Submit
5. System generates AI-powered impact analysis:
   ├── Cost impact (e.g., "+$2,500")
   ├── Timeline impact (e.g., "+3 days")
   └── Affected tasks/milestones
6. Change order created with status: "proposed"
7. Workflow:
   proposed → approved (by homeowner/admin)
            → rejected (with reason)
            → implemented (work completed)
8. Approved changes:
   ├── BOM updated with new items/costs
   ├── Timeline adjusted
   └── Stakeholders notified
```

---

## 19. Site Logs

**Route**: `/project/[id]/site-logs`

### 19.1 Overview

Daily construction progress logs with photos, weather, worker counts, and notes.

### 19.2 User Flow

```
1. User (contractor/homeowner) navigates to /project/[id]/site-logs
2. Sees chronological list of daily logs
3. Click "Add Site Log"
4. Site Log Form:
   ├── Date (date picker, defaults to today)
   ├── Title (e.g., "Day 15 — Electrical wiring")
   ├── Notes (detailed progress description)
   ├── Weather (sunny/cloudy/rainy/etc.)
   ├── Workers on Site (number)
   ├── Photos (upload multiple, geotagged)
   └── Tags (categorize: progress/issue/delivery/inspection)
5. Submit log
6. Log appears in timeline view
7. Photos stored with geolocation metadata
8. Stakeholders can view logs for oversight
```

---

## 20. Quality Assurance & Punch List

**Route**: `/project/[id]/quality`

### 20.1 User Flow

**Quality Checkpoints**:
```
1. User navigates to /project/[id]/quality
2. Stage-gate checkpoints listed by milestone:
   ├── Pre-construction inspection
   ├── Rough-in complete (plumbing/electrical)
   ├── Carpentry complete
   ├── Painting complete
   ├── Fixture installation complete
   └── Final walkthrough
3. Each checkpoint has:
   ├── Title and description
   ├── Trade (electrical, plumbing, carpentry, etc.)
   ├── Status: pending → in_progress → passed / failed
   ├── Checklist items (JSON):
   │   ├── ☐ Wiring properly secured
   │   ├── ☐ All outlets functional
   │   ├── ☐ No exposed wires
   │   └── ☐ Panel labeled correctly
   ├── Inspection photos
   └── Inspector notes
4. Click checkpoint to inspect
5. Check/uncheck items
6. Mark as passed or failed
7. Failed items create punch list entries
```

**Punch List**:
```
1. Punch list items shown separately
2. Each item:
   ├── Title (e.g., "Scratch on bedroom door")
   ├── Description
   ├── Severity: critical / major / minor / observation
   ├── Category: carpentry / electrical / plumbing / paint / etc.
   ├── Status: open → in_progress → resolved → verified
   ├── Room assignment
   ├── Photos (before/after)
   ├── Location pin (x, y coordinates on floor plan)
   └── Assigned to (contractor)
3. Contractor resolves items and uploads photos
4. Homeowner verifies resolution
5. All items must be verified before project completion
```

---

## 21. Collaboration Hub

**Route**: `/project/[id]/collaboration`

### 21.1 User Flow

**Threaded Discussions**:
```
1. User navigates to /project/[id]/collaboration
2. Sees list of discussion threads
3. Create new thread:
   ├── Title
   ├── Category: general / design_decision / issue / change_request / approval
   ├── Status: open / resolved / archived
   └── Optional: link to room/design
4. Click thread to open
5. Post messages:
   ├── Rich text content
   ├── @mention other users
   ├── Attach files
   ├── Mark as "decision" (for key decisions)
   └── Reply to create nested thread
6. Real-time updates via WebSocket
7. Mentioned users receive notifications
```

**Comments on Designs/BOMs**:
```
1. From any design variant, BOM, or drawing page
2. Click "Comment" to open comment panel
3. Add comment targeting specific item
4. Threaded replies supported
5. Mark comments as resolved
6. Comment count shown on parent item
```

**Approval Workflows**:
```
1. Request approval for design/BOM/schedule
2. Approval created with status: pending
3. Reviewers notified
4. Reviewer can: approve / reject / request revision
5. Notes attached to decision
6. Status change triggers notifications
```

---

## 22. Procurement & Purchase Orders

**Route**: `/project/[id]/procurement`

### 22.1 User Flow

**Generate Purchase Orders**:
```
1. User navigates to /project/[id]/procurement
2. Prerequisites: BOM generated, vendors available
3. Click "Generate Orders"
4. Procurement Service optimizes:
   ├── Groups BOM items by vendor
   ├── Considers delivery phases (aligned with schedule)
   ├── Optimizes for bulk discounts
   ├── Splits across vendors if cost-effective
   ├── Respects budget constraints
   └── Aligns with milestone dates
5. Draft purchase orders generated
6. Each PO shows:
   ├── PO Number
   ├── Vendor name
   ├── Items list (product, quantity, unit price)
   ├── Total amount
   ├── Expected delivery date
   └── Status: draft
```

**PO Lifecycle**:
```
draft → submitted (sent to vendor)
      → confirmed (vendor accepts)
        → shipped (vendor ships)
          → delivered (received on site)
```

**Manage Orders**:
```
1. View all POs in table format
2. Click PO to see full details
3. Update status as deliveries progress
4. Track amounts: total ordered, confirmed, delivered
5. Flag issues (delays, wrong items, quality problems)
```

---

## 23. Delivery Tracking

**Route**: `/project/[id]/deliveries`

### 23.1 User Flow

```
1. User navigates to /project/[id]/deliveries
2. Sees material delivery timeline:
   ├── Each delivery shows:
   │   ├── Vendor name
   │   ├── Description (items being delivered)
   │   ├── Tracking number
   │   ├── Status: pending → dispatched → in_transit → delivered → inspected
   │   ├── Estimated delivery date
   │   └── Actual delivery date
3. When delivery arrives:
   ├── Mark as "delivered"
   ├── Inspection checklist:
   │   ├── ☐ Correct items received
   │   ├── ☐ Quantities match PO
   │   ├── ☐ No damage
   │   ├── ☐ Quality acceptable
   │   └── ☐ Documentation included
   ├── Upload inspection photos
   ├── Note any issues
   └── Mark as "inspected" or "rejected"
4. Rejected deliveries flag the PO for vendor follow-up
```

---

## 24. Payments & Invoices

**Route**: `/project/[id]/payments`

### 24.1 User Flow

**Payment Page (3 tabs)**:
```
Tab 1 — Payments:
   ├── Summary cards:
   │   ├── Total Budget
   │   ├── Total Paid
   │   ├── Pending Payments
   │   └── Remaining Balance
   ├── Payment list (amount, status, date, provider)
   └── "Create Payment" button

Tab 2 — Purchase Orders:
   ├── PO list (PO#, vendor, amount, status, date)
   └── Click to view PO details

Tab 3 — Invoices:
   ├── Invoice list (Invoice#, date, amount, status)
   └── Click to view/download invoice PDF
```

**Create Payment**:
```
1. Click "Create Payment"
2. Payment Form:
   ├── Amount (number input)
   ├── Currency (USD / INR / EUR / GBP)
   ├── Payment Provider:
   │   ├── Stripe (international)
   │   └── Razorpay (India)
   ├── Linked Milestone (optional dropdown)
   └── Payment Summary Preview card
3. Click "Pay"
4. Payment record created (status: pending)
5. If Stripe:
   ├── Checkout session created
   ├── User redirected to Stripe checkout page
   ├── User completes payment
   ├── Stripe webhook hits /api/payments/webhook
   ├── Webhook verifies signature (HMAC-SHA256)
   ├── Payment status updated to "completed"
   └── User redirected back to app
6. If Razorpay:
   ├── Similar flow with Razorpay checkout
   └── Webhook verification on completion
7. Toast notification confirms payment
8. Milestone status updated if linked
```

---

## 25. Financial Reports

**Route**: `/project/[id]/financial-reports`

### 25.1 User Flow

```
1. User navigates to /project/[id]/financial-reports
2. Report sections:
   ├── Budget vs. Actuals:
   │   ├── Bar chart comparing planned vs. spent
   │   ├── Category-wise breakdown
   │   └── Variance analysis (over/under budget)
   ├── Expenditure Timeline:
   │   ├── Monthly spending chart
   │   ├── Cumulative spend curve
   │   └── Projected final cost
   ├── Category Breakdown:
   │   ├── Pie chart of spending by category
   │   ├── (Furniture, Flooring, Paint, Labor, etc.)
   │   └── Percentage of total per category
   ├── Vendor Payment Summary:
   │   ├── Amount paid per vendor
   │   ├── Outstanding amounts
   │   └── Payment timeline
   └── Tax Summary:
       ├── GST/tax breakdowns
       └── Input credit eligible amounts
3. Export report as PDF
```

---

## 26. Analytics Dashboard

### 26.1 Global Analytics

**Route**: `/analytics`

```
1. User navigates to /analytics
2. Overview cards:
   ├── Total Projects (count)
   ├── Active Projects (count)
   ├── Completed Projects (count)
   └── Total Spending (currency)
3. Charts:
   ├── Spending Trend (6-month bar chart)
   ├── Project Status Distribution (grouped bars)
   ├── Popular Design Styles (horizontal bars)
   └── Budget Distribution by Tier (stacked bars)
4. Statistics:
   ├── Total rooms across all projects
   ├── Average rooms per project
   └── Most popular room types
```

### 26.2 Project Analytics

**Route**: `/project/[id]/analytics`

```
1. User navigates to /project/[id]/analytics
2. Project-specific metrics:
   ├── Budget vs. Actual spending
   ├── Timeline progress (% complete)
   ├── Cost breakdown by room
   ├── Cost breakdown by category
   ├── Design variant comparison
   └── Procurement status summary
```

---

## 27. AI Cost & Timeline Predictions

**Route**: `/project/[id]/predictions`

### 27.1 User Flow

```
1. User navigates to /project/[id]/predictions
2. System analyzes project data:
   ├── Room count and dimensions
   ├── Design complexity
   ├── Budget tier selections
   ├── Historical project data
   └── Market conditions
3. Cost Prediction:
   ├── Predicted total cost (point estimate)
   ├── Confidence interval (low - high range)
   ├── Risk factors (ranked):
   │   ├── Material price volatility
   │   ├── Labor shortage risk
   │   ├── Design change probability
   │   └── Weather delay risk
   └── Cost breakdown by phase
4. Timeline Prediction:
   ├── Predicted duration (days)
   ├── Confidence interval
   ├── Critical risks
   ├── Phase-by-phase timeline
   └── Most likely delay causes
5. Model provider and input snapshot recorded
```

---

## 28. Budget Optimizer

**Route**: `/project/[id]/budget-optimizer`

### 28.1 User Flow

```
1. User navigates to /project/[id]/budget-optimizer
2. System analyzes current BOM and design
3. Generates optimization scenarios:
   ├── Scenario 1: "Maximum Savings"
   │   ├── Savings: -25% ($X)
   │   ├── Substitutions:
   │   │   ├── Solid wood → Engineered wood (-$Y)
   │   │   ├── Marble → Vitrified tiles (-$Z)
   │   │   └── Custom furniture → Ready-made (-$W)
   │   └── Quality impact: Moderate
   ├── Scenario 2: "Balanced Optimization"
   │   ├── Savings: -15% ($X)
   │   ├── Fewer substitutions, higher quality maintained
   │   └── Quality impact: Low
   └── Scenario 3: "Premium with Savings"
       ├── Savings: -8% ($X)
       ├── Only brand/vendor substitutions
       └── Quality impact: Negligible
4. User reviews scenarios
5. Can accept/reject each scenario
6. Accepted scenario updates BOM
```

---

## 29. Sustainability Scoring

**Route**: `/project/[id]/sustainability`

### 29.1 User Flow

```
1. User navigates to /project/[id]/sustainability
2. Sustainability report generated:
   ├── Overall Sustainability Score (0-100)
   ├── Carbon Footprint:
   │   ├── Total carbon (kg CO₂)
   │   ├── Material carbon footprint
   │   ├── Transportation carbon
   │   └── Construction carbon
   ├── LEED Points Assessment:
   │   ├── Points achievable per category
   │   └── Total LEED points estimate
   ├── Green Alternatives:
   │   ├── Eco-friendly material substitutions
   │   ├── Local sourcing opportunities
   │   ├── Recycled material options
   │   └── Energy-efficient alternatives
   └── Recommendations:
       ├── Low-VOC paints
       ├── FSC-certified wood
       ├── Energy-efficient fixtures
       └── Water-saving fixtures
3. Track improvements over time
```

---

## 30. Contractor Marketplace

**Route**: `/marketplace`

### 30.1 User Flow

**Browse Contractors**:
```
1. User navigates to /marketplace
2. Sees contractor cards in 3-column grid
3. Each card shows:
   ├── Profile image (or fallback icon)
   ├── Name and company
   ├── Star rating (1-5) with review count
   ├── City/location badge
   ├── Specialization badges (max 4 + "+N more")
   ├── Verified checkmark (if verified)
   └── Years of experience
```

**Filter & Search**:
```
4. Left sidebar filters:
   ├── Search input (debounced 300ms):
   │   └── Searches name, company, city
   ├── City filter (toggle buttons):
   │   └── Mumbai, Delhi, Bangalore, etc.
   ├── Specialization checkboxes:
   │   ├── Carpentry
   │   ├── Electrical
   │   ├── Plumbing
   │   ├── Painting
   │   ├── Flooring
   │   └── (+more, expandable)
   └── Active filter chips (with remove × button)
5. Results paginate (12 per page, Next/Previous)
6. "Clear All" resets filters
```

**View Contractor Profile**:
```
7. Click contractor card
8. Redirected to /marketplace/[contractorId]
9. Profile page shows:
   ├── Full bio
   ├── Portfolio gallery (project photos)
   ├── Certifications
   ├── Reviews & ratings
   ├── Contact information
   ├── Service areas
   └── "Hire" button
```

**Hire Contractor**:
```
10. Click "Hire" button
11. Hire Dialog opens:
    ├── Select project
    ├── Role (general contractor, electrician, etc.)
    ├── Agreed amount
    ├── Start date
    └── Notes
12. Submit creates contractor assignment
13. Contractor notified
14. Assignment status: active
```

**Leave Review**:
```
15. After project completion
16. Navigate to contractor profile
17. Click "Write Review"
18. Review form:
    ├── Rating (1-5 stars)
    ├── Title
    └── Review text
19. Submit review
20. Rating recalculated
```

---

## 31. Product Catalogue

**Route**: `/marketplace/catalogue`

### 31.1 User Flow

```
1. User navigates to /marketplace/catalogue
2. Browse products by category:
   ├── Furniture
   ├── Flooring
   ├── Paint & Finishes
   ├── Hardware
   ├── Fixtures
   ├── Lighting
   └── Appliances
3. Search products (full-text via Meilisearch)
4. Filter by:
   ├── Category
   ├── Vendor
   ├── Material
   ├── Color
   ├── Price range
   └── Brand
5. Product card shows:
   ├── Image
   ├── Name
   ├── Vendor prices (multi-vendor comparison)
   ├── Specifications
   └── Dimensions
6. Visual similarity search:
   ├── Upload photo of product
   ├── System finds similar products (CLIP embeddings + pgvector)
   └── Results ranked by visual similarity
7. Click product for full details
8. Add to BOM or procurement list
```

---

## 32. Vendor Performance Management

**Route**: `/project/[id]/vendors`

### 32.1 User Flow

```
1. User navigates to /project/[id]/vendors
2. Lists all vendors associated with project
3. Each vendor shows:
   ├── Name and company info
   ├── Delivery rating (on-time %)
   ├── Quality rating (defect-free %)
   ├── Pricing competitiveness
   ├── Order history with project
   └── Total amount ordered
4. Click vendor for detailed performance:
   ├── Order-by-order breakdown
   ├── Delivery punctuality chart
   ├── Quality inspection results
   └── Payment history
5. Rate vendor after delivery:
   ├── Delivery speed
   ├── Product quality
   ├── Pricing fairness
   └── Communication
```

---

## 33. Offcuts Exchange Marketplace

**Route**: `/marketplace/offcuts`

### 33.1 User Flow

**List Offcut Material**:
```
1. User navigates to /marketplace/offcuts
2. Click "List Material"
3. Listing form:
   ├── Title (e.g., "Marine Plywood 8mm - 2 sheets")
   ├── Material type (wood, tile, stone, metal, etc.)
   ├── Quantity and unit
   ├── Dimensions
   ├── Condition (new / like_new / good / fair)
   ├── Asking price and currency
   ├── Photos (upload)
   └── Location/city
4. Listing published (status: active)
```

**Browse & Inquire**:
```
5. Browse listings with filters (material, location, price)
6. Click listing for details
7. Click "Inquire" to send message to seller
8. Inquiry form:
   ├── Message text
   └── Submit
9. Seller receives notification
10. Seller responds (accept/decline)
11. If accepted, coordinate pickup/delivery offline
12. Seller marks as "sold" when complete
```

---

## 34. Digital Twin & IoT

**Route**: `/project/[id]/digital-twin`

### 34.1 User Flow

```
1. User navigates to /project/[id]/digital-twin
   (Available post-construction)
2. Digital twin status: draft → active → archived
3. 3D model viewer shows completed space
4. IoT device management:
   ├── Add device:
   │   ├── Name (e.g., "Living Room Thermostat")
   │   ├── Type: temperature / humidity / motion / energy / water /
   │   │        light / air_quality / smoke
   │   ├── Position in 3D model (x, y, z)
   │   └── Room assignment
   ├── View device dashboard:
   │   ├── Real-time sensor readings
   │   ├── Historical data charts
   │   └── Alerts (thresholds exceeded)
   └── Remove device
5. Emergency references:
   ├── Water shutoff locations
   ├── Gas shutoff locations
   ├── Electrical breaker panel
   ├── Fire extinguisher locations
   └── Shown as pins on 3D model
6. MEP reference layers:
   ├── Electrical wiring overlay
   ├── Plumbing pipe overlay
   └── HVAC duct overlay
```

---

## 35. Maintenance Scheduling

**Route**: `/project/[id]/maintenance`

### 35.1 User Flow

```
1. User navigates to /project/[id]/maintenance
2. Maintenance schedules listed:
   ├── HVAC filter change (every 90 days)
   ├── Plumbing valve exercise (annually)
   ├── Exterior paint touch-up (as needed)
   ├── Appliance servicing (per manufacturer)
   └── Pest control (quarterly)
3. Each schedule shows:
   ├── Item name
   ├── Category (HVAC/plumbing/electrical/structural/appliance/exterior)
   ├── Frequency (days between service)
   ├── Next due date
   ├── Service provider
   ├── Estimated cost
   └── Status indicator (upcoming/overdue)
4. When service is performed:
   ├── Create maintenance log:
   │   ├── Date performed
   │   ├── Performed by
   │   ├── Actual cost
   │   ├── Notes
   │   └── Photos
   └── Next due date auto-calculated
5. Overdue items highlighted in red
6. Notifications sent before due dates
```

---

## 36. Warranty Tracking

**Route**: `/project/[id]/warranties`

### 36.1 User Flow

```
1. User navigates to /project/[id]/warranties
2. Warranty list shows all tracked items:
   ├── Item name (e.g., "Kitchen Chimney")
   ├── Brand
   ├── Serial number
   ├── Warranty type: manufacturer / extended / contractor
   ├── Start date
   ├── End date
   ├── Status: active / expired / claimed
   └── Days remaining
3. Add warranty:
   ├── Fill item details
   ├── Upload warranty card/receipt
   └── Set expiry date
4. File warranty claim:
   ├── Select warranty
   ├── Describe issue
   ├── Upload photos of defect
   ├── Submit claim
   ├── Status: filed → in_review → approved/denied → resolved
   └── Track resolution
5. Expiring warranties highlighted
6. Notifications before warranty expiry
```

---

## 37. Handover Package

**Route**: `/project/[id]/handover`

### 37.1 User Flow

```
1. User navigates to /project/[id]/handover
   (Available when project is near completion)
2. Handover package status: draft → in_progress → ready → delivered
3. Package contains:
   ├── As-Built Drawings:
   │   ├── Final floor plans (reflecting actual construction)
   │   ├── Electrical as-built
   │   ├── Plumbing as-built
   │   └── Downloadable DXF/PDF files
   ├── Material Register:
   │   ├── Every product used (brand, model, batch)
   │   ├── Purchase receipts
   │   ├── Warranty information
   │   └── Supplier contact info
   ├── Contractor Directory:
   │   ├── All contractors who worked on project
   │   ├── Contact details
   │   ├── Scope of work completed
   │   └── Performance ratings
   ├── Operational Guides:
   │   ├── Appliance user manuals
   │   ├── Maintenance instructions
   │   └── Emergency procedures
   └── Maintenance Manual:
       ├── Recommended maintenance schedule
       ├── Service provider contacts
       └── Estimated maintenance costs
4. Client signs off on handover (digital signature)
5. Package marked as "delivered"
6. Project status changes to "completed" or "maintenance"
```

---

## 38. AR/VR Viewer

**Route**: `/project/[id]/ar`

### 38.1 User Flow

**AR Mode (Augmented Reality)**:
```
1. User navigates to /project/[id]/ar
2. AR mode activates device camera (mobile/tablet)
3. User points camera at room
4. Furniture from design overlaid on real room view
5. Interactions:
   ├── Tap to place furniture
   ├── Pinch to resize
   ├── Drag to reposition
   └── Rotate with two-finger gesture
6. Take screenshot to save AR view
```

**VR Mode (Virtual Reality)**:
```
1. User connects VR headset (WebXR compatible)
2. VR mode loads fully immersive room
3. Navigation:
   ├── Teleportation (point and click to move)
   ├── Walk around (room-scale tracking)
   └── Look around (head tracking)
4. Interact with furniture:
   ├── Select objects
   ├── View material details
   └── Toggle design variants
```

---

## 39. Portfolio Management

**Route**: `/portfolios`

### 39.1 User Flow

```
1. User navigates to /portfolios
2. Create portfolio:
   ├── Portfolio name
   └── Description
3. Add projects to portfolio
4. Portfolio view shows:
   ├── All projects in group
   ├── Aggregate metrics
   ├── Total spending across projects
   └── Timeline overview
5. Useful for:
   ├── Real estate developers (multiple units)
   ├── Interior design firms (client projects)
   └── Property managers (multiple properties)
```

---

## 40. Developer API Portal

**Route**: `/developer`

### 40.1 User Flow

```
1. User navigates to /developer
2. Overview of API capabilities
3. Register new app:
   ├── App name
   ├── Redirect URIs (for OAuth flow)
   ├── Requested scopes:
   │   ├── projects:read
   │   ├── projects:write
   │   ├── designs:read
   │   ├── bom:read
   │   └── etc.
   └── Submit
4. Receive:
   ├── Client ID
   ├── Client Secret (shown once)
   └── API endpoint documentation
5. Rate limiting tiers:
   ├── Standard: X calls/minute
   ├── Premium: Y calls/minute
   └── Enterprise: unlimited
6. Webhook subscriptions:
   ├── Subscribe to events:
   │   ├── project.created
   │   ├── bom.generated
   │   ├── payment.completed
   │   └── etc.
   ├── Configure target URL
   └── Secret for signature verification
7. API documentation at /developer/docs
8. View app details at /developer/[appId]:
   ├── Usage statistics
   ├── API call logs
   ├── Rotate secrets
   └── Manage scopes
```

---

## 41. Notifications System

### 41.1 Notification Bell (TopNav)

```
1. Bell icon in top navigation bar
2. Unread count badge (red circle with number)
3. Click bell → dropdown menu:
   ├── Recent 5 notifications
   ├── "Mark all read" link
   └── "View all notifications" link
4. Each notification shows:
   ├── Icon (by type: payment/schedule/comment/approval/alert)
   ├── Title
   ├── Message preview (truncated)
   ├── Relative timestamp ("5m ago", "2h ago")
   └── Unread indicator (dot)
5. Click notification → navigate to relevant page
```

### 41.2 Notification Center

**Route**: `/notifications`

```
1. Full notification list
2. Tabs: All | Unread
3. "Mark All Read" button
4. Each notification card:
   ├── Type icon
   ├── Title + full message
   ├── Timestamp
   ├── "View Details" link
   └── "Mark Read" button
5. Notification types:
   ├── payment — "Payment of $X received"
   ├── schedule — "Milestone ABC due tomorrow"
   ├── comment — "User commented on design"
   ├── approval — "Design approved/rejected"
   ├── alert — "Error in BOM generation"
   └── info — "New feature available"
```

### 41.3 Real-Time Notifications

```
- WebSocket (Socket.IO) pushes notifications
- Toast popup on new notification
- Unread count polled every 30 seconds
- Comment creation → toast with author + preview
- Approval status change → toast with result
```

---

## 42. Admin Panel

**Route**: `/admin` (Admin role required)

### 42.1 User Flow

```
1. Admin navigates to /admin
2. Dashboard shows:
   ├── Total users count
   ├── Total projects count
   ├── Active jobs count
   └── System health status

3. User Management (/admin/users):
   ├── List all users
   ├── Search/filter users
   ├── Enable/disable accounts
   ├── Change user roles
   └── View user activity

4. System Health (/admin/system):
   ├── Service health checks:
   │   ├── Database (PostgreSQL)
   │   ├── Cache (Redis)
   │   ├── Search (Meilisearch)
   │   ├── Storage (MinIO/S3)
   │   ├── Design Engine
   │   ├── Vision Engine
   │   ├── BOM Engine
   │   ├── Drawing Generator
   │   ├── Cutlist Engine
   │   ├── MEP Calculator
   │   ├── Catalogue Service
   │   └── Collaboration Service
   └── Each shows: status (up/down), response time, last check

5. Job Queue (/admin/jobs):
   ├── List all background jobs
   ├── Filter by: status, type, user
   ├── View job details (input, output, errors)
   ├── Cancel stuck jobs
   └── Retry failed jobs
```

---

## 43. Settings & Preferences

**Route**: `/dashboard/settings`

### 43.1 User Flow

```
1. User navigates to /dashboard/settings
2. Settings sections:

   Profile:
   ├── Name
   ├── Email (from OAuth, read-only)
   └── Profile picture (from OAuth)

   Preferences:
   ├── Currency (USD, INR, EUR, GBP)
   ├── Unit System (metric / imperial)
   ├── Locale (en_US, en_GB, hi_IN)
   └── Theme (light / dark)

   API Keys:
   ├── Add LLM provider keys:
   │   ├── OpenAI API Key
   │   ├── Anthropic API Key
   │   └── Google API Key
   ├── Keys encrypted (AES-256-GCM) before storage
   ├── Only key prefix shown (sk-...XXXX)
   └── Delete/rotate keys

   Connected Accounts:
   ├── Google (connected/disconnected)
   └── GitHub (connected/disconnected)
```

---

## 44. End-to-End Master Flow

### The Complete Journey: From Empty Room to Maintained Home

```
PHASE 1: PROJECT SETUP
═══════════════════════
1. Sign in via Google/GitHub
2. Create project (name, address, unit system)
3. Add rooms manually OR upload floor plan for auto-detection
4. Upload room photos

PHASE 2: DESIGN
═══════════════
5. Take style quiz (optional but recommended)
6. Generate AI designs (select style + budget per room)
7. Compare design variants
8. Edit in 3D editor (place furniture, change materials)
9. Collaborate with designer in real-time
10. Request approval from stakeholders
11. Homeowner approves final design

PHASE 3: ENGINEERING
════════════════════
12. Generate Bill of Materials (per approved design)
13. Generate technical drawings (floor plans, elevations, etc.)
14. Generate CNC cut lists (for custom furniture)
15. Run MEP calculations (electrical, plumbing, HVAC)
16. Check building code compliance
17. Export IFC for BIM workflow

PHASE 4: PROCUREMENT
════════════════════
18. Browse product catalogue / visual search
19. Generate optimized purchase orders
20. Submit orders to vendors
21. Track deliveries with inspection checklists
22. Find and hire contractors from marketplace

PHASE 5: CONSTRUCTION
═════════════════════
23. AI generates project timeline (Gantt chart)
24. Link milestones to payments
25. Daily site logs (photos, weather, progress)
26. Process change orders (AI impact analysis)
27. Quality checkpoints at stage gates
28. Punch list for defects/snags
29. Milestone payments via Stripe/Razorpay

PHASE 6: COMPLETION
═══════════════════
30. Final quality walkthrough
31. All punch list items resolved and verified
32. Generate handover package:
    ├── As-built drawings
    ├── Material register
    ├── Contractor directory
    └── Maintenance manual
33. Client signs off on handover

PHASE 7: POST-OCCUPANCY
════════════════════════
34. Activate digital twin (3D model of completed space)
35. Connect IoT devices (temperature, humidity, energy)
36. Set up maintenance schedules
37. Track warranties (with claim filing)
38. Monitor via digital twin dashboard
39. Ongoing maintenance logging

ONGOING
═══════
40. View analytics and financial reports
41. AI predictions for cost and timeline
42. Budget optimization suggestions
43. Sustainability scoring and improvements
44. Portfolio management (multiple projects)
45. List surplus materials on offcuts marketplace
46. Leave contractor reviews
```

---

## Visual Flow Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Sign In    │────▶│  Dashboard  │────▶│  Create     │
│  (OAuth)    │     │  (Projects) │     │  Project    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────────────────┘
                    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Add Rooms  │────▶│  Upload     │────▶│  Floor Plan │
│  (Manual)   │     │  Photos     │     │  Digitize   │
└──────┬──────┘     └─────────────┘     └──────┬──────┘
       │                                       │
       └───────────────┬───────────────────────┘
                       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Style Quiz │────▶│  AI Design  │────▶│  3D Editor  │
│  (Optional) │     │  Generation │     │  (Collab)   │
└─────────────┘     └──────┬──────┘     └──────┬──────┘
                           │                   │
                           └─────────┬─────────┘
                                     ▼
                              ┌──────────────┐
                              │   APPROVE    │
                              │   DESIGN     │
                              └──────┬───────┘
                                     │
              ┌──────────┬───────────┼───────────┬──────────┐
              ▼          ▼           ▼           ▼          ▼
        ┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────┐
        │   BOM    ││ Drawings ││ Cut List ││   MEP    ││ IFC  │
        │          ││ DXF/PDF  ││ Nesting  ││ Elec/Plb ││ BIM  │
        └────┬─────┘└──────────┘└──────────┘└──────────┘└──────┘
             │
             ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Procurement │────▶│  Purchase   │────▶│  Delivery   │
│ Optimize    │     │  Orders     │     │  Tracking   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
┌─────────────┐     ┌─────────────┐            │
│ Hire        │────▶│  Timeline   │◀───────────┘
│ Contractors │     │  (Gantt)    │
└─────────────┘     └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐┌──────────┐┌──────────┐
        │  Site    ││  Quality ││ Payments │
        │  Logs    ││  & Punch ││ (Stripe) │
        └──────────┘└──────────┘└──────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   HANDOVER   │
                    │   PACKAGE    │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐┌──────────┐┌──────────┐
        │ Digital  ││ Mainten- ││ Warranty │
        │ Twin/IoT ││ ance     ││ Tracking │
        └──────────┘└──────────┘└──────────┘
```

---

*This document covers all 43+ features and their complete user flows within the OpenLintel platform.*
