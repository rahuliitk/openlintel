# OpenLintel - Sample Test Flows

> Comprehensive manual test scenarios for QA testing. Use with the [sample database](./sampledb/README.md) for pre-populated data.

---

## Table of Contents

1. [Authentication & Onboarding](#1-authentication--onboarding)
2. [Project Management](#2-project-management)
3. [Room Management](#3-room-management)
4. [File Uploads](#4-file-uploads)
5. [Design Generation](#5-design-generation)
6. [Style Quiz & Mood Board](#6-style-quiz--mood-board)
7. [Floor Plan Digitization](#7-floor-plan-digitization)
8. [3D Editor](#8-3d-editor)
9. [BOM (Bill of Materials)](#9-bom-bill-of-materials)
10. [Technical Drawings](#10-technical-drawings)
11. [CNC Cut Lists & Nesting](#11-cnc-cut-lists--nesting)
12. [MEP Engineering](#12-mep-engineering)
13. [Building Code Compliance](#13-building-code-compliance)
14. [Project Timeline & Scheduling](#14-project-timeline--scheduling)
15. [Site Logs](#15-site-logs)
16. [Change Orders](#16-change-orders)
17. [Product Catalogue](#17-product-catalogue)
18. [Procurement & Purchase Orders](#18-procurement--purchase-orders)
19. [Delivery Tracking](#19-delivery-tracking)
20. [Payments & Invoicing](#20-payments--invoicing)
21. [Contractor Marketplace](#21-contractor-marketplace)
22. [Collaboration & Comments](#22-collaboration--comments)
23. [Notifications](#23-notifications)
24. [Quality Assurance & Punch List](#24-quality-assurance--punch-list)
25. [Handover Package](#25-handover-package)
26. [Cost & Timeline Predictions](#26-cost--timeline-predictions)
27. [Budget Optimizer](#27-budget-optimizer)
28. [Sustainability Scoring](#28-sustainability-scoring)
29. [Financial Reports](#29-financial-reports)
30. [Portfolio Management](#30-portfolio-management)
31. [Digital Twin & IoT](#31-digital-twin--iot)
32. [Maintenance Scheduling](#32-maintenance-scheduling)
33. [Warranty Tracking](#33-warranty-tracking)
34. [Offcuts Exchange](#34-offcuts-exchange)
35. [Community Gallery](#35-community-gallery)
36. [Developer API Portal](#36-developer-api-portal)
37. [Admin Panel](#37-admin-panel)
38. [User Settings & Preferences](#38-user-settings--preferences)
39. [AR/VR Viewer](#39-arvr-viewer)
40. [Cross-cutting: Error Handling & Edge Cases](#40-cross-cutting-error-handling--edge-cases)

---

## Test Data Reference

| Account | Email | Role | Projects |
|---------|-------|------|----------|
| Alice Sharma | alice@example.com | user | Mumbai Apartment (in_progress), Bangalore Villa (draft) |
| Bob Kumar | bob@example.com | admin | Delhi Penthouse (completed) |

---

## 1. Authentication & Onboarding

### TC-AUTH-001: Google OAuth Sign-In
- **Precondition:** User not signed in
- **Steps:**
  1. Navigate to `/auth/signin`
  2. Click "Sign in with Google"
  3. Complete Google consent flow
  4. Verify redirect to `/dashboard`
- **Expected:** User session created, name/email populated from Google profile, role=user

### TC-AUTH-002: GitHub OAuth Sign-In
- **Steps:**
  1. Navigate to `/auth/signin`
  2. Click "Sign in with GitHub"
  3. Authorize on GitHub
- **Expected:** Session created, user record linked to GitHub provider

### TC-AUTH-003: Email/Password Sign-In
- **Steps:**
  1. Navigate to `/auth/signin`
  2. Enter `alice@example.com` and password
  3. Click Sign In
- **Expected:** Redirect to dashboard with Alice's projects listed

### TC-AUTH-004: Sign Out
- **Steps:**
  1. Sign in as any user
  2. Click user avatar > Sign Out
- **Expected:** Session destroyed, redirect to landing page, protected routes inaccessible

### TC-AUTH-005: Unauthorized Access
- **Steps:**
  1. Without signing in, navigate to `/dashboard`
  2. Try `/project/prj_mumbai_001`
  3. Try `/admin`
- **Expected:** All redirect to `/auth/signin`

### TC-AUTH-006: Admin Role Gate
- **Steps:**
  1. Sign in as Alice (role=user)
  2. Navigate to `/admin`
- **Expected:** 403 Forbidden or redirect (admin-only routes blocked for users)

---

## 2. Project Management

### TC-PROJ-001: Create New Project
- **Steps:**
  1. Sign in as Alice
  2. Click "+ New Project" on dashboard
  3. Enter name: "Test Project"
  4. Enter address: "123 Test Street"
  5. Select unit system: metric
  6. Click Create
- **Expected:** Project created with status=draft, redirects to `/project/{id}`

### TC-PROJ-002: List Projects
- **Steps:**
  1. Sign in as Alice
  2. Navigate to `/dashboard`
- **Expected:** Shows 2 projects (Mumbai Apartment, Bangalore Villa) + any newly created. Bob's projects NOT visible.

### TC-PROJ-003: Update Project Name
- **Steps:**
  1. Open Mumbai Apartment project
  2. Edit project name to "Mumbai 2BHK Reno Updated"
  3. Save
- **Expected:** Name updated, updatedAt timestamp refreshed

### TC-PROJ-004: Delete Project
- **Steps:**
  1. Create a test project
  2. Delete it from project settings
- **Expected:** Project and all cascading data (rooms, designs, BOMs) removed

### TC-PROJ-005: Project Status Transition
- **Steps:**
  1. Open Bangalore Villa (status=draft)
  2. Change status to in_progress
  3. Verify status badge updates
- **Expected:** Status updates correctly, reflected on dashboard list

### TC-PROJ-006: Cross-User Isolation
- **Steps:**
  1. Sign in as Alice
  2. Try to access `/project/prj_delhi_003` (Bob's project)
- **Expected:** 404 or access denied — users can only see their own projects

---

## 3. Room Management

### TC-ROOM-001: Add Room to Project
- **Steps:**
  1. Open Mumbai Apartment > Rooms tab
  2. Click "Add Room"
  3. Enter: Name="Guest Bedroom", Type=bedroom, L=3500mm, W=3000mm, H=2800mm, Floor=0
  4. Save
- **Expected:** Room appears in room list with correct dimensions

### TC-ROOM-002: Edit Room Dimensions
- **Steps:**
  1. Open "Main Living Room" (room_mum_living_001)
  2. Change width from 4000mm to 4200mm
  3. Save
- **Expected:** Width updated, related designs may show "recalculation needed" warning

### TC-ROOM-003: All Room Types
- **Steps:**
  1. Create rooms of each type: living_room, bedroom, kitchen, bathroom, dining_room, study, balcony, pooja_room, foyer, laundry, garage, closet, hallway, kids_room, other
- **Expected:** All 15 room types accepted and saved correctly

### TC-ROOM-004: Delete Room
- **Steps:**
  1. Create a test room
  2. Delete it
- **Expected:** Room removed, associated uploads/designs cascade deleted

### TC-ROOM-005: Room Validation
- **Steps:**
  1. Try to create a room with: empty name, negative dimensions, missing type
- **Expected:** Validation errors shown for each invalid field

---

## 4. File Uploads

### TC-UPLOAD-001: Upload Room Photo
- **Steps:**
  1. Open any room detail page
  2. Click "Upload Photo"
  3. Select a JPEG image (< 10MB)
- **Expected:** File uploaded to S3/MinIO, thumbnail generated, appears in room gallery

### TC-UPLOAD-002: Upload Floor Plan PDF
- **Steps:**
  1. Open project page
  2. Upload a floor plan PDF
  3. Set category = "floor_plan"
- **Expected:** PDF stored, available for digitization workflow

### TC-UPLOAD-003: Duplicate Detection
- **Steps:**
  1. Upload the same image twice to the same room
- **Expected:** Perceptual hash comparison detects duplicate, warns user

### TC-UPLOAD-004: Large File Rejection
- **Steps:**
  1. Try to upload a 50MB file
- **Expected:** Upload rejected with "file too large" error

### TC-UPLOAD-005: Invalid File Type
- **Steps:**
  1. Try to upload a .exe file
- **Expected:** Upload rejected, only image/pdf types accepted

---

## 5. Design Generation

### TC-DESIGN-001: Generate Modern Mid-Range Design
- **Steps:**
  1. Open room_mum_living_001
  2. Click "Generate Design"
  3. Select style=modern, budgetTier=mid_range
  4. Add constraint: "child-safe corners"
  5. Select source photo: upl_mum_001
  6. Submit
- **Expected:** Job created (type=design_generation), status=pending, progresses to completed, design variant created with render URL

### TC-DESIGN-002: Generate With Each Style
- **Steps:**
  1. For each style (modern, contemporary, traditional, scandinavian, industrial, minimalist, bohemian, japandi, art_deco, tropical), generate a design
- **Expected:** All 10 styles produce valid design variants with unique spec_json

### TC-DESIGN-003: Generate With Each Budget Tier
- **Steps:**
  1. Generate designs at economy, mid_range, premium, luxury tiers
- **Expected:** Material quality and price points differ appropriately per tier

### TC-DESIGN-004: View Design Gallery
- **Steps:**
  1. Navigate to `/project/prj_mumbai_001/designs`
  2. View all design variants for the project
- **Expected:** Gallery shows render images, style badges, budget tier labels

### TC-DESIGN-005: Compare Design Variants
- **Steps:**
  1. Open design gallery
  2. Select 2 variants for comparison
- **Expected:** Side-by-side view showing spec differences, cost differences

### TC-DESIGN-006: Design Generation With Constraints
- **Steps:**
  1. Generate design with multiple constraints: "keep AC on east wall", "no glass furniture", "pet-friendly fabrics"
- **Expected:** Generated design spec respects all stated constraints

### TC-DESIGN-007: Cancel Running Job
- **Steps:**
  1. Start a design generation
  2. While status=running, click "Cancel"
- **Expected:** Job status changes to cancelled, partial results discarded

---

## 6. Style Quiz & Mood Board

### TC-QUIZ-001: Complete Style Quiz
- **Steps:**
  1. Navigate to `/project/prj_blr_002/style-quiz`
  2. Step 1: Select room usage = "family_gathering"
  3. Step 2: Select color = "warm_neutrals"
  4. Step 3: Select material = "wood_and_fabric"
  5. Step 4: Select budget = "premium"
  6. Step 5: Upload inspiration images
  7. Submit
- **Expected:** Detected styles returned with scores (e.g., modern: 0.85), mood board generated, color palette suggested

### TC-QUIZ-002: Style Preferences Saved
- **Steps:**
  1. Complete quiz for a project
  2. Navigate away and return to quiz page
- **Expected:** Previous responses loaded, results displayed

### TC-QUIZ-003: Quiz Influences Design Generation
- **Steps:**
  1. Complete quiz with "scandinavian" preferences
  2. Generate a design for same project
- **Expected:** Generated design leans toward detected style preferences

---

## 7. Floor Plan Digitization

### TC-FPLAN-001: Digitize Floor Plan
- **Steps:**
  1. Navigate to `/project/prj_mumbai_001/floor-plan`
  2. Select uploaded floor plan (upl_mum_004)
  3. Click "Digitize"
- **Expected:** Job created, VLM extracts rooms with dimensions, doors, windows. Interactive SVG displayed.

### TC-FPLAN-002: Verify Extracted Data
- **Steps:**
  1. After digitization completes
  2. Check that room count matches actual floor plan
  3. Verify dimensions are within 5% of actual
  4. Verify doors/windows detected
- **Expected:** Extracted data is reasonably accurate

### TC-FPLAN-003: Auto-Create Rooms
- **Steps:**
  1. After digitization
  2. Click "Create Rooms from Floor Plan"
- **Expected:** Rooms auto-created in the project with correct types and dimensions from the digitized plan

### TC-FPLAN-004: Download DXF
- **Steps:**
  1. After digitization
  2. Click "Download DXF"
- **Expected:** Valid DXF file downloads, opens in CAD software

---

## 8. 3D Editor

### TC-EDITOR-001: Load 3D Scene
- **Steps:**
  1. Navigate to `/project/prj_mumbai_001/editor`
- **Expected:** React Three Fiber canvas loads, room geometry visible, furniture objects rendered

### TC-EDITOR-002: Move Object
- **Steps:**
  1. Select a furniture item
  2. Drag to move it
- **Expected:** Object translates along floor plane, snap-to-grid works

### TC-EDITOR-003: Rotate Object
- **Steps:**
  1. Select furniture
  2. Switch to rotate mode
  3. Rotate 90 degrees
- **Expected:** Object rotates on Y axis, snaps to 15/45/90 degree increments

### TC-EDITOR-004: Undo/Redo
- **Steps:**
  1. Move an object
  2. Press Ctrl+Z (undo)
  3. Press Ctrl+Shift+Z (redo)
- **Expected:** Object returns to previous position on undo, returns on redo

### TC-EDITOR-005: Add Furniture from Catalog
- **Steps:**
  1. Open furniture catalog panel
  2. Search "sofa"
  3. Drag into scene
- **Expected:** New furniture object placed at cursor position in scene

### TC-EDITOR-006: Real-time Collaboration
- **Steps:**
  1. Open editor in Browser A as Alice
  2. Open same editor in Browser B as Bob (if admin access enabled)
  3. Move object in Browser A
- **Expected:** Movement reflected in Browser B in real-time, cursor awareness shown

---

## 9. BOM (Bill of Materials)

### TC-BOM-001: Generate BOM
- **Steps:**
  1. Open design variant dv_mum_liv_modern_001
  2. Click "Generate BOM"
- **Expected:** Job created, BOM result with categorized items, quantities, unit prices, and total cost

### TC-BOM-002: View BOM Table
- **Steps:**
  1. Navigate to `/project/prj_mumbai_001/bom`
  2. View BOM for Mumbai Living Room
- **Expected:** Table shows all 17+ items grouped by category (furniture, flooring, lighting, etc.)

### TC-BOM-003: Export BOM as CSV
- **Steps:**
  1. On BOM page, click "Export CSV"
- **Expected:** CSV file downloads with all BOM items, quantities, prices

### TC-BOM-004: Export BOM as PDF
- **Steps:**
  1. Click "Export PDF"
- **Expected:** Formatted PDF with project header, room info, itemized BOM table, total cost

### TC-BOM-005: BOM Total Calculation
- **Steps:**
  1. Verify sum of all item totalPrice values equals the totalCost field
  2. For bom_mum_liv_001: expect ~INR 198,160
- **Expected:** Totals mathematically correct

### TC-BOM-006: Filter by Category
- **Steps:**
  1. On BOM page, filter by "furniture"
- **Expected:** Only furniture items shown, subtotal updates

---

## 10. Technical Drawings

### TC-DRAW-001: Generate All Drawing Types
- **Steps:**
  1. For a design variant, generate: floor_plan, elevation, section, rcp, flooring, electrical
- **Expected:** Each drawing type generates with appropriate DXF/PDF/SVG files

### TC-DRAW-002: View Drawings Gallery
- **Steps:**
  1. Navigate to `/project/prj_mumbai_001/drawings`
- **Expected:** Gallery shows thumbnails/previews for each drawing, labeled by type

### TC-DRAW-003: Download DXF
- **Steps:**
  1. Click download on any drawing
  2. Select DXF format
- **Expected:** Valid DXF file downloads

### TC-DRAW-004: View SVG Inline
- **Steps:**
  1. Click a drawing with SVG output
- **Expected:** SVG renders inline in browser with zoom/pan

### TC-DRAW-005: IFC/BIM Export
- **Steps:**
  1. Click "Export IFC" on a drawing
- **Expected:** IFC4-compliant file generates, downloadable

---

## 11. CNC Cut Lists & Nesting

### TC-CUT-001: Generate Cut List
- **Steps:**
  1. Open kitchen design variant
  2. Click "Generate Cut List"
- **Expected:** Panel list with material, dimensions, grain direction, edge banding per panel

### TC-CUT-002: View Nesting Layout
- **Steps:**
  1. Navigate to `/project/prj_mumbai_001/cutlist`
  2. View sheet layouts
- **Expected:** Visual diagram showing panel placement on standard 2440x1220mm sheets

### TC-CUT-003: Verify Waste Percentage
- **Steps:**
  1. Check waste_percent on cl_mum_kit_001
  2. Should be ~4.8%
- **Expected:** Waste under 5% (platform target)

### TC-CUT-004: Hardware Schedule
- **Steps:**
  1. View hardware section of cut list
- **Expected:** Lists all hinges, channels, handles with quantities and brands

---

## 12. MEP Engineering

### TC-MEP-001: Generate Electrical Calculation
- **Steps:**
  1. Open design variant, click MEP > Electrical
- **Expected:** Load summary, circuit breakdown, switch layout, wire gauges calculated

### TC-MEP-002: Generate Plumbing Calculation
- **Steps:**
  1. Click MEP > Plumbing (for kitchen design)
- **Expected:** Fixture units, pipe sizing, drain slopes, trap types specified

### TC-MEP-003: Generate HVAC Calculation
- **Steps:**
  1. Click MEP > HVAC
- **Expected:** Cooling/heating load, duct sizing, equipment selection returned

### TC-MEP-004: Standards Citations
- **Steps:**
  1. View any MEP result
  2. Check standards_cited field
- **Expected:** NEC/IPC/ASHRAE/IS references included with specific clause numbers

### TC-MEP-005: View MEP Page
- **Steps:**
  1. Navigate to `/project/prj_mumbai_001/mep`
- **Expected:** All MEP results displayed with tabs for electrical/plumbing/hvac

---

## 13. Building Code Compliance

### TC-COMPLY-001: Run Compliance Check — India
- **Steps:**
  1. Navigate to `/project/prj_mumbai_001/compliance`
  2. Select jurisdiction: India (NBC 2016)
  3. Run check
- **Expected:** Compliance report generated with pass/fail per code section

### TC-COMPLY-002: Run Compliance Check — US
- **Steps:**
  1. Select jurisdiction: US (IRC 2021)
  2. Run check
- **Expected:** US-specific code requirements checked (different from India)

### TC-COMPLY-003: Handle Violations
- **Steps:**
  1. Trigger a compliance check that flags violations
  2. Review remediation suggestions
- **Expected:** Each violation shows severity, clause reference, and remediation suggestion

---

## 14. Project Timeline & Scheduling

### TC-SCHED-001: Generate Schedule
- **Steps:**
  1. Navigate to `/project/prj_mumbai_001/timeline`
  2. Click "Generate Schedule"
- **Expected:** AI generates tasks with dependencies, critical path highlighted, milestones set

### TC-SCHED-002: View Gantt Chart
- **Steps:**
  1. View generated schedule
- **Expected:** Gantt chart renders with task bars, dependency arrows, milestone diamonds

### TC-SCHED-003: Critical Path
- **Steps:**
  1. Verify critical path tasks are highlighted (sch_mum_001 has 10 critical tasks)
- **Expected:** Critical path clearly distinguished, represents longest dependency chain

### TC-SCHED-004: Export Schedule
- **Steps:**
  1. Click "Export" on timeline page
- **Expected:** Schedule exports in usable format (PDF/JSON)

---

## 15. Site Logs

### TC-SITELOG-001: Create Site Log
- **Steps:**
  1. Navigate to `/project/prj_mumbai_001/site-logs`
  2. Click "New Log"
  3. Enter: date=today, title="Tiling Started", notes="Kitchen wall tiling begun", weather=sunny, workers=4
  4. Upload 2 photos
  5. Add tags: ["tiling", "kitchen"]
  6. Save
- **Expected:** Site log created with all fields, photos stored in S3

### TC-SITELOG-002: View Log Timeline
- **Steps:**
  1. View all site logs for Mumbai Apartment
- **Expected:** 4+ logs shown in chronological order with photos and tags

### TC-SITELOG-003: Filter Logs by Tag
- **Steps:**
  1. Filter by tag "milestone"
- **Expected:** Only logs tagged with "milestone" shown (2 logs)

---

## 16. Change Orders

### TC-CO-001: Propose Change Order
- **Steps:**
  1. Navigate to `/project/prj_mumbai_001/change-orders`
  2. Click "New Change Order"
  3. Enter: title="Add under-cabinet lighting", description="LED strip under all upper cabinets"
  4. Submit
- **Expected:** Change order created with status=proposed, AI calculates cost/time impact

### TC-CO-002: Approve Change Order
- **Steps:**
  1. Open change order co_mum_002 (status=proposed)
  2. Review cost impact (INR 28,000) and time impact (2 days)
  3. Click "Approve"
- **Expected:** Status changes to approved, approvedBy and approvedAt set

### TC-CO-003: Reject Change Order
- **Steps:**
  1. Create a test change order
  2. Click "Reject"
- **Expected:** Status changes to rejected

### TC-CO-004: AI Impact Analysis
- **Steps:**
  1. When creating change order, verify AI-generated cost_impact and time_impact_days
- **Expected:** Reasonable estimates based on project context

---

## 17. Product Catalogue

### TC-CAT-001: Text Search
- **Steps:**
  1. Navigate to `/marketplace/catalogue`
  2. Search "sofa"
- **Expected:** Products matching "sofa" returned (prod_sofa_001)

### TC-CAT-002: Browse by Category
- **Steps:**
  1. Click "Furniture" category
- **Expected:** 4 furniture products shown (sofa, coffee table, bookshelf, TV unit)

### TC-CAT-003: Multi-Vendor Price Comparison
- **Steps:**
  1. Open any product detail page
- **Expected:** Prices from all vendors shown with valid date ranges

### TC-CAT-004: Product Specifications
- **Steps:**
  1. Open prod_tile_001
  2. Check specifications
- **Expected:** Water absorption, scratch resistance, slip resistance shown

### TC-CAT-005: Visual Similarity Search
- **Steps:**
  1. Upload an image of a sofa
  2. Search visually
- **Expected:** Products with similar visual embedding returned (CLIP/pgvector)

---

## 18. Procurement & Purchase Orders

### TC-PO-001: Create Purchase Order
- **Steps:**
  1. Navigate to `/project/prj_mumbai_001/procurement`
  2. Click "New Purchase Order"
  3. Select vendor: Kajaria
  4. Add items: Quartz Countertop x 5sqm @ 12000/sqm
  5. Submit
- **Expected:** PO created with status=draft, totalAmount calculated

### TC-PO-002: Submit PO to Vendor
- **Steps:**
  1. Open draft PO
  2. Click "Submit"
- **Expected:** Status changes to submitted

### TC-PO-003: PO Status Lifecycle
- **Steps:**
  1. Transition PO through: draft → submitted → confirmed → shipped → delivered
  2. Set actual delivery date when marking delivered
- **Expected:** Each transition updates status and timestamps correctly

### TC-PO-004: View All POs
- **Steps:**
  1. View procurement page for Mumbai Apartment
- **Expected:** 3 POs shown (tiles=delivered, hardware=confirmed, lights=draft)

---

## 19. Delivery Tracking

### TC-DEL-001: Create Delivery
- **Steps:**
  1. Navigate to `/project/prj_mumbai_001/deliveries`
  2. Click "Track New Delivery"
  3. Link to PO po_mum_lights_001
  4. Enter vendor name, description, tracking number
- **Expected:** Delivery record created with status=pending

### TC-DEL-002: Update Delivery Status
- **Steps:**
  1. Transition through: pending → dispatched → in_transit → delivered
- **Expected:** Status updates correctly, estimated vs actual delivery dates tracked

### TC-DEL-003: Inspection Checklist
- **Steps:**
  1. After delivery arrives, open inspection
  2. Check each item (quantity matches, no damage, correct batch)
  3. Upload inspection photos
  4. Submit
- **Expected:** Checklist saved, status changes to inspected or rejected

### TC-DEL-004: View Delivery History
- **Steps:**
  1. View deliveries for Mumbai Apartment
- **Expected:** 2 deliveries shown with different statuses

---

## 20. Payments & Invoicing

### TC-PAY-001: Milestone Payment
- **Steps:**
  1. Navigate to `/project/prj_mumbai_001/payments`
  2. Click "Pay" on milestone ms_mum_003 (Tiling Complete)
  3. Select payment provider (Razorpay)
  4. Complete payment flow
- **Expected:** Payment record created, status changes to completed, milestone updated

### TC-PAY-002: Payment History
- **Steps:**
  1. View payments page
- **Expected:** 3 payments shown (2 completed, 1 pending), totals correct

### TC-PAY-003: Invoice Generation
- **Steps:**
  1. Verify invoices exist for completed payments
  2. Download invoice PDF
- **Expected:** Formatted invoice with correct amounts and dates

### TC-PAY-004: Failed Payment
- **Steps:**
  1. Initiate payment with invalid card/method
- **Expected:** Payment status=failed, appropriate error message shown

---

## 21. Contractor Marketplace

### TC-CONTR-001: Search Contractors
- **Steps:**
  1. Navigate to `/marketplace`
  2. Filter by city="Mumbai"
  3. Filter by specialization="carpentry"
- **Expected:** Rajesh Carpenter appears in results

### TC-CONTR-002: View Contractor Profile
- **Steps:**
  1. Click on Rajesh Carpenter
- **Expected:** Profile shows: bio, specializations, 18 years experience, 4.6 rating, certifications, 23 reviews

### TC-CONTR-003: Hire Contractor
- **Steps:**
  1. Click "Hire" on contractor profile
  2. Select project: Mumbai Apartment
  3. Set role=carpenter, dates, agreed amount
- **Expected:** Contractor assignment created

### TC-CONTR-004: Write Review
- **Steps:**
  1. After contractor completes work
  2. Write review: 5 stars, title, text
- **Expected:** Review published, contractor rating recalculated

### TC-CONTR-005: Refer Contractor
- **Steps:**
  1. Click "Refer" on contractor profile
  2. Enter referee email and message
- **Expected:** Referral created with status=sent

### TC-CONTR-006: Filter by Verified Status
- **Steps:**
  1. Toggle "Verified Only" filter
- **Expected:** Only verified contractors shown (all 3 sample contractors are verified)

---

## 22. Collaboration & Comments

### TC-COLLAB-001: Add Comment on Design
- **Steps:**
  1. Open design variant dv_mum_liv_modern_001
  2. Add comment: "Can we add a reading nook by the window?"
- **Expected:** Comment saved with timestamp, visible to all project participants

### TC-COLLAB-002: Threaded Reply
- **Steps:**
  1. Reply to an existing comment
- **Expected:** Reply nested under parent comment

### TC-COLLAB-003: Resolve Comment
- **Steps:**
  1. Mark a comment as resolved
- **Expected:** Comment shows "resolved" badge, filterable

### TC-COLLAB-004: Create Discussion Thread
- **Steps:**
  1. Navigate to `/project/prj_mumbai_001/collaboration`
  2. Create thread: title="Flooring Material Decision", category=design_decision
  3. Add messages
- **Expected:** Thread created, messages with timestamps and user attribution

### TC-COLLAB-005: Decision Logging
- **Steps:**
  1. In a thread, mark a message as "decision"
- **Expected:** Message flagged as decision, easily findable in thread

### TC-COLLAB-006: @Mentions
- **Steps:**
  1. In a message, type @bob
  2. Submit
- **Expected:** Bob receives notification about the mention

---

## 23. Notifications

### TC-NOTIF-001: View Notifications
- **Steps:**
  1. Sign in as Alice
  2. Click bell icon
- **Expected:** Notification list shows all notifications, unread highlighted

### TC-NOTIF-002: Unread Count Badge
- **Steps:**
  1. Check bell icon badge count
  2. Should match count of notifications where read=false
- **Expected:** Badge shows "2" (approval pending + cut list in progress for Alice)

### TC-NOTIF-003: Mark as Read
- **Steps:**
  1. Click on an unread notification
- **Expected:** Notification marked as read, badge count decrements

### TC-NOTIF-004: Click-Through Navigation
- **Steps:**
  1. Click notification with link (e.g., "Design generated" links to design page)
- **Expected:** Navigates to the linked page

### TC-NOTIF-005: Real-time WebSocket Push
- **Steps:**
  1. Keep notification panel open
  2. In another session, trigger an event (e.g., complete a job)
- **Expected:** New notification appears in real-time without page refresh

---

## 24. Quality Assurance & Punch List

### TC-QA-001: Create Quality Checkpoint
- **Steps:**
  1. Navigate to `/project/prj_mumbai_001/quality`
  2. Click "New Checkpoint"
  3. Milestone: waterproofing_complete
  4. Trade: waterproofing
  5. Add checklist: ["Membrane covers all wet areas", "48-hour flood test"]
  6. Save
- **Expected:** Checkpoint created with status=pending

### TC-QA-002: Inspect Checkpoint
- **Steps:**
  1. Open pending checkpoint
  2. Check each item, add notes
  3. Upload inspection photos
  4. Mark as "passed" or "failed"
- **Expected:** Status updated, inspection timestamp recorded

### TC-QA-003: Create Punch List Item
- **Steps:**
  1. Click "New Punch List Item"
  2. Enter: title="Chipped tile in kitchen", severity=minor, category=tiling
  3. Assign to contractor
  4. Upload photo
- **Expected:** Punch list item created with status=open

### TC-QA-004: Punch List Lifecycle
- **Steps:**
  1. Transition through: open → in_progress → resolved → verified
- **Expected:** Each transition updates timestamps (resolvedAt, verifiedAt)

### TC-QA-005: Severity Filtering
- **Steps:**
  1. Filter punch list by severity: critical, major, minor, observation
- **Expected:** Only items of selected severity shown

---

## 25. Handover Package

### TC-HAND-001: Generate Handover Package
- **Steps:**
  1. Navigate to `/project/prj_delhi_003/handover`
  2. Click "Generate Handover Package"
- **Expected:** Compiles as-built drawings, material register, contractor directory, operational guides, maintenance manual

### TC-HAND-002: View Package Contents
- **Steps:**
  1. View generated handover for Delhi Penthouse (ho_del_001)
- **Expected:** Shows: 3 drawing files, 3 material register entries, 4 contractors, 4 operational guides

### TC-HAND-003: Client Sign-Off
- **Steps:**
  1. Click "Client Sign Off"
- **Expected:** clientSignedAt timestamp set

### TC-HAND-004: Deliver Package
- **Steps:**
  1. After sign-off, click "Mark as Delivered"
- **Expected:** Status=delivered, deliveredAt set, project can move to completed

---

## 26. Cost & Timeline Predictions

### TC-PRED-001: Generate Cost Prediction
- **Steps:**
  1. Navigate to `/project/prj_mumbai_001/predictions`
  2. Click "Predict Cost"
- **Expected:** AI returns: predicted cost, confidence range (low/high), risk factors, cost breakdown by category

### TC-PRED-002: Generate Timeline Prediction
- **Steps:**
  1. Click "Predict Timeline"
- **Expected:** Predicted days, confidence range, critical risks with mitigation, phase breakdown

### TC-PRED-003: Verify Confidence Ranges
- **Steps:**
  1. Check that confidence_low < predicted_cost < confidence_high
  2. For cpred_mum_001: 720000 < 825000 < 950000
- **Expected:** Range is mathematically valid

### TC-PRED-004: Risk Factor Assessment
- **Steps:**
  1. Review risk factors in prediction
- **Expected:** Each risk has name, impact amount, and probability (0-1)

---

## 27. Budget Optimizer

### TC-BUDGET-001: Generate Economy Scenario
- **Steps:**
  1. Navigate to `/project/prj_mumbai_001/budget-optimizer`
  2. Click "Generate Savings Scenario"
- **Expected:** List of substitutions with original item, replacement, savings per item, and reason

### TC-BUDGET-002: Verify Savings Calculation
- **Steps:**
  1. For bs_mum_001: original=825000, optimized=680000, savings=145000 (17.6%)
  2. Verify sum of individual substitution savings = total savings
- **Expected:** Math checks out

### TC-BUDGET-003: Accept/Reject Scenario
- **Steps:**
  1. Accept economy scenario
  2. Verify status changes to "accepted"
- **Expected:** Status updated, BOM optionally recalculated with substitutions

---

## 28. Sustainability Scoring

### TC-SUST-001: Generate Sustainability Report
- **Steps:**
  1. Navigate to `/project/prj_mumbai_001/sustainability`
  2. Click "Generate Report"
- **Expected:** Total carbon (kg CO2), material vs transport carbon, sustainability score (0-100), LEED points

### TC-SUST-002: Green Alternatives
- **Steps:**
  1. Review green_alternatives in report
- **Expected:** Each alternative shows: original material, green replacement, carbon saved, cost delta

### TC-SUST-003: Carbon Breakdown
- **Steps:**
  1. Verify material_carbon + transport_carbon = total_carbon
  2. For sust_mum_001: 2100 + 750 = 2850 kg
- **Expected:** Math is correct

---

## 29. Financial Reports

### TC-FIN-001: Budget vs Actuals
- **Steps:**
  1. Navigate to `/project/prj_mumbai_001/financial-reports`
  2. View budget vs actuals chart
- **Expected:** Chart shows planned vs actual spend by category

### TC-FIN-002: Expenditure Timeline
- **Steps:**
  1. View expenditure over time
- **Expected:** Line chart showing cumulative spend over project duration

### TC-FIN-003: Category Breakdown
- **Steps:**
  1. View category breakdown
- **Expected:** Pie chart showing spend by category (materials, labor, appliances, etc.)

### TC-FIN-004: Export CSV
- **Steps:**
  1. Click "Export CSV"
- **Expected:** CSV file with all financial data for the project

---

## 30. Portfolio Management

### TC-PORT-001: Create Portfolio
- **Steps:**
  1. Navigate to `/portfolios`
  2. Click "New Portfolio"
  3. Enter: name="My Homes", description="All residential projects"
- **Expected:** Portfolio created

### TC-PORT-002: Add Projects to Portfolio
- **Steps:**
  1. Add Mumbai Apartment and Bangalore Villa to portfolio
- **Expected:** Both projects linked, sortable order

### TC-PORT-003: View Portfolio
- **Steps:**
  1. Open portfolio port_alice_001
- **Expected:** Shows 2 projects with status badges, combined stats

---

## 31. Digital Twin & IoT

### TC-IOT-001: View Digital Twin
- **Steps:**
  1. Navigate to `/project/prj_delhi_003/digital-twin`
- **Expected:** 3D model loads, IoT device markers shown at positioned locations

### TC-IOT-002: View Live Sensor Data
- **Steps:**
  1. Click on temperature sensor
- **Expected:** Current reading (23.9°C) and historical chart (last 24h readings)

### TC-IOT-003: Add IoT Device
- **Steps:**
  1. Click "Add Device"
  2. Select type=temperature, position in room
- **Expected:** Device created, appears on twin visualization

### TC-IOT-004: Emergency References
- **Steps:**
  1. View emergency references panel
- **Expected:** Lists: water shutoff, gas shutoff, electrical breaker, fire extinguisher with locations

### TC-IOT-005: Energy Monitoring
- **Steps:**
  1. View energy meter readings
- **Expected:** Shows cumulative kWh with daily consumption calculated (28.3 - 12.5 = 15.8 kWh/day)

---

## 32. Maintenance Scheduling

### TC-MAINT-001: View Schedule
- **Steps:**
  1. Navigate to `/project/prj_delhi_003/maintenance`
- **Expected:** 5 maintenance items shown with next due dates, categories, estimated costs

### TC-MAINT-002: Log Maintenance
- **Steps:**
  1. Select "AC Service & Filter Clean"
  2. Click "Log Completion"
  3. Enter: performedBy="Voltas", cost=2500, notes="Filters cleaned"
  4. Upload photo
- **Expected:** Log created, nextDueAt auto-advances by frequency_days (90 days)

### TC-MAINT-003: Overdue Items
- **Steps:**
  1. Check for items where nextDueAt < today
- **Expected:** Overdue items highlighted with warning

### TC-MAINT-004: Create Maintenance Item
- **Steps:**
  1. Click "Add Maintenance Item"
  2. Enter: item="Pest Control", category=exterior, frequency=180 days, cost=3000
- **Expected:** Item created with next due date calculated

---

## 33. Warranty Tracking

### TC-WAR-001: View Warranties
- **Steps:**
  1. Navigate to `/project/prj_delhi_003/warranties`
- **Expected:** 5 warranties shown with item names, brands, start/end dates, types, statuses

### TC-WAR-002: File Warranty Claim
- **Steps:**
  1. Open Bosch Dishwasher warranty (war_del_001)
  2. Click "File Claim"
  3. Enter issue description, upload photos
- **Expected:** Claim created with status=filed

### TC-WAR-003: Claim Lifecycle
- **Steps:**
  1. Transition claim through: filed → in_review → approved → resolved
- **Expected:** Status updates, resolution date set when resolved

### TC-WAR-004: Expired Warranty Detection
- **Steps:**
  1. Verify warranties with endDate < today show status=expired
- **Expected:** Expired warranties clearly flagged

### TC-WAR-005: Warranty Type Filtering
- **Steps:**
  1. Filter by type: manufacturer, extended, contractor
- **Expected:** Correct warranties shown per filter

---

## 34. Offcuts Exchange

### TC-OFFCUT-001: List Offcut Material
- **Steps:**
  1. Navigate to `/marketplace/offcuts`
  2. Click "List Material"
  3. Enter: title="Leftover kitchen tiles", materialType=tile, quantity=2 sqm, condition=new, price=1800 INR
  4. Upload photos
- **Expected:** Listing created with status=active

### TC-OFFCUT-002: Browse Offcuts
- **Steps:**
  1. Browse offcut listings
  2. Filter by material type "stone"
- **Expected:** Nero Marquina marble offcut shown

### TC-OFFCUT-003: Send Inquiry
- **Steps:**
  1. Open listing off_001
  2. Send inquiry message: "Interested in the marble. Can we negotiate?"
- **Expected:** Inquiry created, seller notified

### TC-OFFCUT-004: Respond to Inquiry
- **Steps:**
  1. Sign in as seller (Bob)
  2. View inquiry, reply
- **Expected:** Inquiry status changes to "replied"

### TC-OFFCUT-005: Mark as Sold
- **Steps:**
  1. After agreeing on deal, mark listing as "sold"
- **Expected:** Status=sold, listing no longer appears in active search

---

## 35. Community Gallery

### TC-GALLERY-001: Publish to Gallery
- **Steps:**
  1. Open a completed project
  2. Click "Publish to Gallery"
  3. Enter: title, description, select images, add style tags
- **Expected:** Gallery entry created with is_public=true

### TC-GALLERY-002: Browse Gallery
- **Steps:**
  1. Navigate to `/marketplace/gallery`
- **Expected:** Public entries shown with images, styles, like counts

### TC-GALLERY-003: Like Project
- **Steps:**
  1. Click "Like" on a gallery entry
- **Expected:** Like count increments

### TC-GALLERY-004: Filter by Style
- **Steps:**
  1. Filter gallery by style="art_deco"
- **Expected:** Only art deco entries shown (gal_001)

---

## 36. Developer API Portal

### TC-API-001: Register App
- **Steps:**
  1. Navigate to `/developer`
  2. Click "Register New App"
  3. Enter: name, redirect URIs, select scopes
- **Expected:** App created with clientId and clientSecret

### TC-API-002: Generate Access Token
- **Steps:**
  1. Use OAuth flow to generate access token
- **Expected:** Token issued with selected scopes, expiry date set

### TC-API-003: Make API Call
- **Steps:**
  1. Use access token to call GET /api/v1/projects
- **Expected:** Returns authorized user's projects

### TC-API-004: Rate Limiting
- **Steps:**
  1. Send 101+ requests within 1 minute (standard tier limit=100)
- **Expected:** 429 Too Many Requests returned after limit exceeded

### TC-API-005: Webhook Subscription
- **Steps:**
  1. Create webhook for event "project.created"
  2. Set target URL and secret
  3. Create a new project
- **Expected:** Webhook fires to target URL with signed payload

### TC-API-006: View Request Logs
- **Steps:**
  1. Navigate to developer portal
  2. View request logs for app
- **Expected:** Shows endpoint, method, status code, response time for each API call

---

## 37. Admin Panel

### TC-ADMIN-001: Admin Dashboard
- **Steps:**
  1. Sign in as Bob (admin)
  2. Navigate to `/admin`
- **Expected:** Shows: total users, total projects, active jobs, system health indicators

### TC-ADMIN-002: User Management
- **Steps:**
  1. Navigate to `/admin/users`
  2. View all users
- **Expected:** Lists all users with email, role, enabled status, creation date

### TC-ADMIN-003: Toggle User Enabled
- **Steps:**
  1. Disable Alice's account (enabled=false)
  2. Try to sign in as Alice
- **Expected:** Alice cannot sign in while disabled

### TC-ADMIN-004: Job Queue Monitoring
- **Steps:**
  1. Navigate to `/admin/jobs`
  2. View all jobs
- **Expected:** Shows jobs across all statuses (pending, running, completed, failed, cancelled)

### TC-ADMIN-005: Filter Jobs by Status
- **Steps:**
  1. Filter jobs by status=failed
- **Expected:** Only failed jobs shown (job_segment_fail_001)

### TC-ADMIN-006: Retry Failed Job
- **Steps:**
  1. Click "Retry" on a failed job
- **Expected:** New job created with same inputs, status=pending

### TC-ADMIN-007: System Health
- **Steps:**
  1. Navigate to `/admin/system`
- **Expected:** Shows: DB connection (green/red), storage service, ML services, queue depth

---

## 38. User Settings & Preferences

### TC-SETTINGS-001: Change Currency
- **Steps:**
  1. Navigate to `/dashboard/settings`
  2. Change currency from INR to USD
  3. Save
- **Expected:** All prices across the app display in USD with conversion

### TC-SETTINGS-002: Change Unit System
- **Steps:**
  1. Change from metric to imperial
- **Expected:** Dimensions display in feet/inches instead of millimeters

### TC-SETTINGS-003: Add API Key
- **Steps:**
  1. Navigate to API Keys section
  2. Add OpenAI key: label="My OpenAI", key="sk-test123..."
- **Expected:** Key encrypted (AES-256-GCM), keyPrefix stored (sk-te...), iv and authTag saved

### TC-SETTINGS-004: Delete API Key
- **Steps:**
  1. Delete a stored API key
- **Expected:** Key record removed, last_used_at and encrypted data gone

### TC-SETTINGS-005: Profile Update
- **Steps:**
  1. Update name
  2. Save
- **Expected:** Name updated across the app (header, comments, etc.)

---

## 39. AR/VR Viewer

### TC-AR-001: Launch AR Mode
- **Steps:**
  1. Navigate to `/project/prj_mumbai_001/ar`
  2. Click "AR Mode" (requires WebXR-compatible browser)
- **Expected:** Camera feed with AR furniture placement overlay

### TC-AR-002: Place Furniture in AR
- **Steps:**
  1. In AR mode, select a furniture item
  2. Tap on floor surface to place
- **Expected:** 3D furniture model placed at tapped location in AR space

### TC-AR-003: VR Walkthrough
- **Steps:**
  1. Click "VR Mode" (requires VR headset)
  2. Teleport through room
- **Expected:** Immersive room walkthrough with teleportation

### TC-AR-004: QR Code Sharing
- **Steps:**
  1. Click "Share via QR"
- **Expected:** QR code generated, scannable by mobile device to open AR view

---

## 40. Cross-cutting: Error Handling & Edge Cases

### TC-ERR-001: Network Offline
- **Steps:**
  1. Disconnect network
  2. Try any CRUD operation
- **Expected:** Graceful error message, no data loss, retry possible when online

### TC-ERR-002: Session Expiry
- **Steps:**
  1. Wait for session to expire (or manually expire it)
  2. Try an action
- **Expected:** Redirect to sign-in, return to previous page after re-auth

### TC-ERR-003: Concurrent Edit Conflict
- **Steps:**
  1. Open same project in 2 tabs
  2. Edit project name in both tabs
  3. Save both
- **Expected:** Last write wins or conflict resolution shown

### TC-ERR-004: Long-Running Job Timeout
- **Steps:**
  1. Trigger a design generation
  2. Simulate ML service being down
- **Expected:** Job status shows "failed" with timeout error after threshold

### TC-ERR-005: Invalid Input Injection
- **Steps:**
  1. Enter `<script>alert('xss')</script>` in project name
  2. Enter `'; DROP TABLE users; --` in search
- **Expected:** Input sanitized, no XSS or SQL injection possible

### TC-ERR-006: File Upload During Design Generation
- **Steps:**
  1. While a design job is running for a room
  2. Upload a new photo to the same room
- **Expected:** Upload succeeds independently, doesn't interfere with running job

### TC-ERR-007: Delete Project With Active Jobs
- **Steps:**
  1. Start a job for a project
  2. Try to delete the project while job is running
- **Expected:** Either: block deletion until job completes, or cancel job and cascade delete

### TC-ERR-008: Empty Project States
- **Steps:**
  1. Create project with no rooms
  2. Try to access BOM, drawings, timeline pages
- **Expected:** Helpful empty states ("Add rooms first") instead of blank pages or errors

### TC-ERR-009: Currency Conversion Edge Cases
- **Steps:**
  1. View BOM in USD when data was entered in INR
  2. Verify conversion uses latest exchange rate
- **Expected:** Amounts correctly converted, source currency noted

### TC-ERR-010: Pagination
- **Steps:**
  1. If a page has 100+ items (products, notifications, etc.)
  2. Verify pagination controls work
- **Expected:** Data loads in pages, no performance degradation

---

## Test Priority Guide

| Priority | Category | Test IDs |
|----------|----------|----------|
| **P0 - Critical** | Auth, Project CRUD, Design Generation | TC-AUTH-001 to 006, TC-PROJ-001 to 006, TC-DESIGN-001 |
| **P1 - High** | Room CRUD, BOM, Drawings, Payments, Uploads | TC-ROOM-001 to 005, TC-BOM-001 to 005, TC-DRAW-001 to 004, TC-PAY-001 to 004, TC-UPLOAD-001 to 005 |
| **P2 - Medium** | MEP, Scheduling, Procurement, Contractors, Notifications | TC-MEP-001 to 005, TC-SCHED-001 to 004, TC-PO-001 to 004, TC-CONTR-001 to 006, TC-NOTIF-001 to 005 |
| **P3 - Normal** | QA, Handover, Predictions, Collaboration, Settings | TC-QA-001 to 005, TC-HAND-001 to 004, TC-PRED-001 to 004, TC-COLLAB-001 to 006, TC-SETTINGS-001 to 005 |
| **P4 - Low** | IoT, Maintenance, Warranty, Offcuts, Gallery, API Portal | TC-IOT-001 to 005, TC-MAINT-001 to 004, TC-WAR-001 to 005, TC-OFFCUT-001 to 005, TC-GALLERY-001 to 004, TC-API-001 to 006 |

---

## Regression Test Checklist (Quick Smoke)

Run these after every deploy:

- [ ] Sign in with OAuth (Google)
- [ ] Create new project
- [ ] Add a room with dimensions
- [ ] Upload a photo
- [ ] Generate a design variant
- [ ] View BOM
- [ ] Navigate to dashboard — projects listed
- [ ] Notifications bell loads
- [ ] Admin panel accessible as admin
- [ ] Sign out works
