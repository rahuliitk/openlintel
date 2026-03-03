# OpenLintel — Comprehensive Testing Guide

> **Version**: 1.0
> **Last Updated**: 2026-03-03
> **Audience**: QA interns, new testers, manual testing team
> **Product**: OpenLintel — End-to-End Home Design Automation Platform

---

## Table of Contents

1. [Introduction & Testing Philosophy](#1-introduction--testing-philosophy)
2. [Environment Setup](#2-environment-setup)
3. [Test Data & Accounts](#3-test-data--accounts)
4. [How to Report Bugs](#4-how-to-report-bugs)
5. [Module 1: Authentication & Onboarding](#module-1-authentication--onboarding)
6. [Module 2: Dashboard & Project Management](#module-2-dashboard--project-management)
7. [Module 3: Room Management](#module-3-room-management)
8. [Module 4: File Upload System](#module-4-file-upload-system)
9. [Module 5: Floor Plan Digitization](#module-5-floor-plan-digitization)
10. [Module 6: Photo-to-3D Reconstruction](#module-6-photo-to-3d-reconstruction)
11. [Module 7: Style Quiz & Mood Board](#module-7-style-quiz--mood-board)
12. [Module 8: AI Design Generation](#module-8-ai-design-generation)
13. [Module 9: 3D Interactive Editor](#module-9-3d-interactive-editor)
14. [Module 10: Bill of Materials (BOM)](#module-10-bill-of-materials-bom)
15. [Module 11: Technical Drawings](#module-11-technical-drawings)
16. [Module 12: CNC Cut List & Nesting](#module-12-cnc-cut-list--nesting)
17. [Module 13: MEP Engineering](#module-13-mep-engineering)
18. [Module 14: Building Code Compliance](#module-14-building-code-compliance)
19. [Module 15: Project Timeline & Scheduling](#module-15-project-timeline--scheduling)
20. [Module 16: Change Orders](#module-16-change-orders)
21. [Module 17: Site Logs](#module-17-site-logs)
22. [Module 18: Quality Assurance & Punch List](#module-18-quality-assurance--punch-list)
23. [Module 19: Collaboration Hub](#module-19-collaboration-hub)
24. [Module 20: Procurement & Purchase Orders](#module-20-procurement--purchase-orders)
25. [Module 21: Delivery Tracking](#module-21-delivery-tracking)
26. [Module 22: Payments & Invoices](#module-22-payments--invoices)
27. [Module 23: Financial Reports](#module-23-financial-reports)
28. [Module 24: Analytics Dashboard](#module-24-analytics-dashboard)
29. [Module 25: AI Predictions](#module-25-ai-predictions)
30. [Module 26: Budget Optimizer](#module-26-budget-optimizer)
31. [Module 27: Sustainability Scoring](#module-27-sustainability-scoring)
32. [Module 28: Contractor Marketplace](#module-28-contractor-marketplace)
33. [Module 29: Product Catalogue](#module-29-product-catalogue)
34. [Module 30: Vendor Performance Management](#module-30-vendor-performance-management)
35. [Module 31: Offcuts Exchange Marketplace](#module-31-offcuts-exchange-marketplace)
36. [Module 32: Digital Twin & IoT](#module-32-digital-twin--iot)
37. [Module 33: Maintenance Scheduling](#module-33-maintenance-scheduling)
38. [Module 34: Warranty Tracking](#module-34-warranty-tracking)
39. [Module 35: Handover Package](#module-35-handover-package)
40. [Module 36: AR/VR Viewer](#module-36-arvr-viewer)
41. [Module 37: Portfolio Management](#module-37-portfolio-management)
42. [Module 38: Developer API Portal](#module-38-developer-api-portal)
43. [Module 39: Notifications System](#module-39-notifications-system)
44. [Module 40: Admin Panel](#module-40-admin-panel)
45. [Module 41: Settings & Preferences](#module-41-settings--preferences)
46. [Module 42: Localization & Currency](#module-42-localization--currency)
47. [Cross-Cutting Tests](#cross-cutting-tests)
48. [Performance Testing](#performance-testing)
49. [Security Testing](#security-testing)
50. [Mobile Responsiveness Testing](#mobile-responsiveness-testing)
51. [Test Completion Checklist](#test-completion-checklist)

---

## 1. Introduction & Testing Philosophy

### What is OpenLintel?

OpenLintel is a home design automation platform. Think of it as a one-stop shop where homeowners upload room photos, get AI-generated interior designs, receive technical construction documents, manage procurement, track construction progress, and maintain their homes after completion.

### Your Role as a Tester

Your job is to:
- **Click every button** and verify it does what it's supposed to
- **Try to break things** — enter wrong data, upload wrong files, click things in wrong order
- **Check what the user sees** — does it look right? Is the text correct? Are numbers formatted properly?
- **Document everything** — if something looks wrong, even slightly, report it

### Testing Approach

For each test case below, you will see:
- **TC-XX.YY**: Test case number (Module.Case)
- **Steps**: Exactly what to do (follow step by step)
- **Expected Result**: What should happen if everything is working
- **Priority**: P0 (critical), P1 (important), P2 (nice-to-have)

### Key Terms

| Term | Meaning |
|------|---------|
| **Route** | The URL path (e.g., `/dashboard` means go to `http://localhost:3000/dashboard`) |
| **API call** | Background request the app makes to the server (visible in browser DevTools → Network tab) |
| **Toast** | Small popup notification that appears briefly at bottom of screen |
| **Dialog/Modal** | A popup box that appears over the page with a form or confirmation |
| **Skeleton** | Gray placeholder bars shown while content is loading |
| **Badge** | Small colored label (e.g., "Modern" or "Premium") |

---

## 2. Environment Setup

### Prerequisites

Before you start testing, ensure the following are running:

```bash
# 1. Clone the repository
git clone https://github.com/allgpt-co/openlintel.git
cd openlintel

# 2. Install dependencies
pnpm install

# 3. Copy environment file
cp .env.example .env
# Fill in required values (ask your team lead)

# 4. Start the database
docker-compose up -d postgres redis minio meilisearch

# 5. Run database migrations
pnpm db:push

# 6. Seed test data (if available)
pnpm db:seed

# 7. Start the web application
pnpm dev

# 8. Start microservices (if testing AI features)
# In separate terminals:
cd services/design-engine && python main.py
cd services/vision-engine && python main.py
cd services/bom-engine && python main.py
# ... etc.
```

### Access URLs

| Service | URL |
|---------|-----|
| Web App | http://localhost:3000 |
| API (tRPC) | http://localhost:3000/api/trpc |
| MinIO Console | http://localhost:9001 |
| Meilisearch | http://localhost:7700 |
| Design Engine | http://localhost:8001 |
| Vision Engine | http://localhost:8010 |

### Browser Requirements

Test on:
- Chrome (latest) — **Primary browser**
- Firefox (latest) — Secondary
- Safari (latest) — If on Mac
- Mobile Chrome (Android) — Responsive testing
- Mobile Safari (iOS) — Responsive testing

### Tools You'll Need

1. **Browser DevTools** (F12) — For checking network requests, console errors, local storage
2. **Multiple browser profiles** — For testing multi-user collaboration
3. **Test image files** — Room photos, floor plan images (JPEG, PNG, PDF)
4. **Screen recording tool** — For recording bugs (e.g., Loom, OBS)

---

## 3. Test Data & Accounts

### Test Accounts

| Account | Role | Login Method | Purpose |
|---------|------|-------------|---------|
| testuser1@gmail.com | user | Google OAuth | Primary tester (homeowner) |
| testuser2@gmail.com | user | Google OAuth | Secondary tester (collaboration) |
| testadmin@gmail.com | admin | Google OAuth | Admin panel testing |
| githubuser@test.com | user | GitHub OAuth | GitHub OAuth testing |

> **Note**: Ask your team lead for actual test account credentials. If using local dev, any Google/GitHub account will work.

### Test Files to Prepare

Create a folder called `test-files/` with these files:

| File | Type | Size | Purpose |
|------|------|------|---------|
| `room-photo-1.jpg` | JPEG | ~2MB | Valid room photo |
| `room-photo-2.png` | PNG | ~3MB | Valid room photo (different format) |
| `floor-plan.jpg` | JPEG | ~1MB | Floor plan image |
| `floor-plan.pdf` | PDF | ~5MB | Floor plan PDF |
| `large-file.jpg` | JPEG | ~15MB | Over 10MB limit (should be rejected) |
| `not-an-image.txt` | Text | ~1KB | Wrong file type (should be rejected) |
| `malicious.html` | HTML | ~1KB | Potential XSS file (should be rejected) |
| `tiny-image.jpg` | JPEG | ~10KB | Very small image |
| `webp-image.webp` | WebP | ~1MB | WebP format test |
| `animated.gif` | GIF | ~2MB | GIF format test |

---

## 4. How to Report Bugs

### Bug Report Template

When you find a bug, report it with this format:

```
**Title**: [Short description of the bug]
**Module**: [Which module/feature]
**Priority**: P0/P1/P2
**Test Case**: TC-XX.YY

**Environment**:
- Browser: Chrome 120
- OS: macOS 14 / Windows 11 / Ubuntu 22.04
- Screen resolution: 1920x1080
- Device: Desktop / Mobile

**Steps to Reproduce**:
1. Go to [URL]
2. Click [button/link]
3. Enter [data]
4. Click [submit]

**Expected Result**: [What should happen]
**Actual Result**: [What actually happened]

**Screenshots/Video**: [Attach]
**Console Errors**: [Copy from DevTools Console]
**Network Errors**: [Copy from DevTools Network tab]
```

### Severity Definitions

| Priority | Definition | Example |
|----------|-----------|---------|
| **P0** | App crashes, data loss, security issue, login broken | Cannot sign in, payment charged but not recorded |
| **P1** | Feature doesn't work, blocking workflow | Cannot create project, BOM generation fails |
| **P2** | Minor UI issue, cosmetic problem, edge case | Button misaligned, wrong date format |

---

## Module 1: Authentication & Onboarding

### TC-1.01: Google OAuth Sign In (P0)
**Steps**:
1. Open http://localhost:3000 in an incognito/private browser window
2. Click "Sign In" or "Get Started" button
3. Verify you're redirected to `/auth/signin`
4. Click "Sign in with Google"
5. Google consent screen appears
6. Select your Google test account
7. Grant permissions

**Expected Result**:
- Redirected to `/dashboard`
- Your name and profile picture appear in top-right corner
- Dashboard loads with either empty state or your projects

**Things to Check**:
- [ ] No console errors (F12 → Console)
- [ ] Session cookie is set (DevTools → Application → Cookies)
- [ ] No flash of unauthenticated content

---

### TC-1.02: GitHub OAuth Sign In (P0)
**Steps**:
1. Open http://localhost:3000 in an incognito browser window
2. Navigate to `/auth/signin`
3. Click "Sign in with GitHub"
4. Authorize the application on GitHub
5. Grant permissions

**Expected Result**:
- Same as TC-1.01 but using GitHub account
- Name and avatar from GitHub shown

---

### TC-1.03: Protected Route Redirect (P0)
**Steps**:
1. Open an incognito browser window (not signed in)
2. Try to navigate directly to: `/dashboard`
3. Try to navigate directly to: `/project/some-id`
4. Try to navigate directly to: `/admin`

**Expected Result**:
- Each URL should redirect to `/auth/signin`
- After signing in, user should be redirected back to the originally requested URL

---

### TC-1.04: Sign Out (P0)
**Steps**:
1. Sign in to the application
2. Click your avatar/profile in the top-right corner
3. Click "Sign Out" from the dropdown menu

**Expected Result**:
- Redirected to `/auth/signin`
- Attempting to visit `/dashboard` redirects back to sign-in
- Session cookie is cleared

---

### TC-1.05: Session Persistence (P1)
**Steps**:
1. Sign in to the application
2. Close the browser tab (not the browser)
3. Open a new tab and navigate to http://localhost:3000/dashboard

**Expected Result**:
- User is still signed in
- Dashboard loads without requiring re-authentication

---

### TC-1.06: Multiple Tabs (P1)
**Steps**:
1. Sign in to the application
2. Open 3 different pages in separate tabs:
   - `/dashboard`
   - `/analytics`
   - `/marketplace`
3. Sign out from one tab

**Expected Result**:
- All tabs should recognize the sign-out (next navigation should redirect to sign-in)
- No stale data shown

---

## Module 2: Dashboard & Project Management

### TC-2.01: View Empty Dashboard (P1)
**Steps**:
1. Sign in with a new account (no projects)
2. Navigate to `/dashboard`

**Expected Result**:
- Empty state shown with appropriate message (e.g., "No projects yet")
- "Create Project" button visible and prominent
- No error messages in console

---

### TC-2.02: Create New Project (P0)
**Steps**:
1. Navigate to `/dashboard`
2. Click "Create Project" button
3. Fill in form:
   - Name: "Test Living Room Project"
   - Address: "123 Test Street, Mumbai"
   - Unit System: Metric
4. Click "Create"

**Expected Result**:
- Dialog closes
- New project card appears in dashboard
- Project card shows: name, status "draft", address
- Toast notification: "Project created successfully" (or similar)

**Edge Cases to Test**:
- [ ] Empty name → Should show validation error
- [ ] Very long name (200+ characters) → Should handle gracefully
- [ ] Special characters in name (`<script>alert('xss')</script>`) → Should be escaped, not executed
- [ ] Create with only name (no address) → Should work (address is optional)

---

### TC-2.03: Create Project with Imperial Units (P1)
**Steps**:
1. Click "Create Project"
2. Set Unit System to "Imperial"
3. Fill other fields and create

**Expected Result**:
- Project created with imperial unit system
- All dimensions in the project shown in feet/inches instead of mm

---

### TC-2.04: View Project Overview (P0)
**Steps**:
1. Click on a project card from the dashboard
2. Observe the project overview page

**Expected Result**:
- URL changes to `/project/[id]`
- Project header shows: name, status, address
- Sidebar navigation appears with all project sections
- Room cards shown (or empty state if no rooms)

---

### TC-2.05: Delete Project (P1)
**Steps**:
1. Navigate to a project
2. Find and click the delete option
3. Confirm deletion in the confirmation dialog

**Expected Result**:
- Confirmation dialog appears before deletion
- After confirmation, redirected to `/dashboard`
- Deleted project no longer appears in project list
- All associated rooms, designs, BOMs removed (verify in DB if possible)

**Edge Case**:
- [ ] Cancel the delete confirmation → Project should remain

---

### TC-2.06: Multiple Projects (P1)
**Steps**:
1. Create 5 different projects with different names
2. View dashboard

**Expected Result**:
- All 5 projects shown as cards
- Cards arranged in grid layout
- Each card shows correct name and status
- Clicking each card navigates to correct project

---

## Module 3: Room Management

### TC-3.01: View Room List (Empty) (P1)
**Steps**:
1. Navigate to a project with no rooms
2. Go to `/project/[id]/rooms`

**Expected Result**:
- Empty state message shown
- "Add Room" button visible

---

### TC-3.02: Add Room (P0)
**Steps**:
1. Navigate to `/project/[id]/rooms`
2. Click "Add Room"
3. Fill in form:
   - Name: "Master Bedroom"
   - Type: bedroom
   - Length: 4000 (mm)
   - Width: 3500 (mm)
4. Click "Create"

**Expected Result**:
- Dialog closes
- New room card appears
- Card shows: "Master Bedroom", bedroom badge, "4000 × 3500 mm"
- Height defaults to 2700mm

---

### TC-3.03: Add All 15 Room Types (P1)
**Steps**:
1. Create one room for each room type:
   - living_room, bedroom, kitchen, bathroom, dining
   - study, balcony, utility, foyer, corridor
   - pooja_room, store, garage, terrace, other
2. Verify each is created with correct type badge

**Expected Result**:
- All 15 room types can be selected and created
- Each type shows appropriate badge/label

---

### TC-3.04: Room Validation (P1)
**Steps**:
1. Click "Add Room"
2. Try each invalid case:
   a. Empty name → Submit
   b. Name only (no dimensions) → Submit
   c. Negative dimensions (-1000) → Submit
   d. Zero dimensions (0) → Submit
   e. Extremely large dimensions (999999999) → Submit

**Expected Result**:
- (a) Validation error: Name is required
- (b) Should either show error or use default dimensions
- (c-d) Should show error or prevent negative/zero values
- (e) Should handle gracefully (may allow but should not crash)

---

### TC-3.05: View Room Detail (P0)
**Steps**:
1. Click on a room card
2. Navigate to `/project/[id]/rooms/[roomId]`

**Expected Result**:
- Room name, type, dimensions displayed
- Photo upload zone visible
- Design variants section shown (empty if none)

---

### TC-3.06: Delete Room (P1)
**Steps**:
1. Navigate to room detail page
2. Click delete option
3. Confirm deletion

**Expected Result**:
- Room removed from list
- Associated designs should also be handled (deleted or orphaned gracefully)

---

## Module 4: File Upload System

### TC-4.01: Upload Valid JPEG Photo (P0)
**Steps**:
1. Navigate to a room detail page
2. Locate the file upload zone
3. Drag and drop `room-photo-1.jpg` onto the zone
4. Observe upload progress

**Expected Result**:
- Progress bar shows: 10% → 30% → 80% → 100%
- Photo appears in room gallery after upload
- Thumbnail generated and visible
- No console errors

---

### TC-4.02: Upload Valid PNG Photo (P0)
**Steps**:
1. Same as TC-4.01 but with `room-photo-2.png`

**Expected Result**: Same as TC-4.01

---

### TC-4.03: Upload WebP Image (P1)
**Steps**:
1. Upload `webp-image.webp`

**Expected Result**:
- Upload succeeds
- WebP image displayed correctly

---

### TC-4.04: Upload GIF Image (P1)
**Steps**:
1. Upload `animated.gif`

**Expected Result**:
- Upload succeeds
- GIF displayed (animation may or may not be preserved in thumbnail)

---

### TC-4.05: Upload PDF Floor Plan (P0)
**Steps**:
1. Upload `floor-plan.pdf`
2. Set category to "floor_plan"

**Expected Result**:
- PDF uploads successfully
- File listed with PDF icon
- Downloadable/viewable

---

### TC-4.06: Reject Oversized File (P0)
**Steps**:
1. Try to upload `large-file.jpg` (15MB, exceeds 10MB limit)

**Expected Result**:
- Upload rejected with error message: "File too large (max 10MB)" or similar
- No file stored on server
- Error message shown to user (toast or inline)

---

### TC-4.07: Reject Invalid File Type (P0)
**Steps**:
1. Try to upload `not-an-image.txt`

**Expected Result**:
- Upload rejected with error message about invalid file type
- Only image/* and application/pdf accepted
- Clear error message to user

---

### TC-4.08: Reject Potentially Malicious File (P1)
**Steps**:
1. Try to upload `malicious.html`

**Expected Result**:
- Upload rejected (not an allowed MIME type)
- No HTML content served to users

---

### TC-4.09: Upload via Click (P1)
**Steps**:
1. Click the upload zone (instead of drag-drop)
2. File picker opens
3. Select a valid image
4. Confirm

**Expected Result**:
- File picker opens correctly
- Selected file uploads successfully
- Same behavior as drag-drop

---

### TC-4.10: Multiple File Upload (P1)
**Steps**:
1. Select or drag multiple files at once (3-4 images)

**Expected Result**:
- Either all files upload (if multi-upload supported) OR
- Clear indication that only single file is accepted per upload

---

### TC-4.11: Upload Without Authentication (P0)
**Steps**:
1. Sign out
2. Try to POST directly to `/api/upload` using DevTools or curl:
   ```bash
   curl -X POST http://localhost:3000/api/upload -F "file=@room-photo-1.jpg"
   ```

**Expected Result**:
- Request rejected with 401 Unauthorized
- No file stored

---

## Module 5: Floor Plan Digitization

### TC-5.01: Upload Floor Plan (P0)
**Steps**:
1. Navigate to `/project/[id]/floor-plan`
2. Verify "Upload" tab is active
3. Upload a floor plan image (`floor-plan.jpg`)
4. Verify upload succeeds

**Expected Result**:
- Floor plan image shown as thumbnail
- "Digitize" button becomes available

---

### TC-5.02: Digitize Floor Plan (P0)
**Steps**:
1. After uploading floor plan (TC-5.01)
2. Click "Digitize" button
3. Observe processing status

**Expected Result**:
- Job starts (status: pending → running)
- Progress indicator shown
- Frontend polls every 2 seconds (check Network tab)
- After completion:
  - "Viewer" tab activates
  - Detected rooms shown as colored polygons on SVG

**Note**: This test requires Vision Engine service running. If not available, verify:
- Job is created in DB
- API call to vision engine is made
- Job status updates are polled

---

### TC-5.03: Floor Plan Viewer (P1)
**Steps**:
1. After digitization completes
2. Click "Viewer" tab
3. Test interactions:
   - Zoom in (click + button or scroll)
   - Zoom out (click - button or scroll)
   - Pan (drag canvas)
   - Hover over room polygon
   - Click on a room polygon

**Expected Result**:
- SVG viewer renders correctly
- Room polygons color-coded by type
- Room labels show name, type, area
- Zoom range: 25% - 300%
- Pan works smoothly
- Hover changes polygon opacity
- Click shows room info toast

---

### TC-5.04: Create Rooms from Detected Rooms (P0)
**Steps**:
1. After digitization completes
2. Click "Detected Rooms" tab
3. Review detected rooms list
4. Click "Create Rooms"

**Expected Result**:
- All detected rooms created in project
- Rooms appear in `/project/[id]/rooms`
- Room types match AI detection
- Dimensions match extracted measurements

---

### TC-5.05: Digitize with PDF (P1)
**Steps**:
1. Upload `floor-plan.pdf` instead of image
2. Click "Digitize"

**Expected Result**:
- PDF processed correctly (converted to image internally)
- Same digitization flow as with image

---

## Module 6: Photo-to-3D Reconstruction

### TC-6.01: Start Reconstruction (P1)
**Steps**:
1. Navigate to `/project/[id]/reconstruction`
2. Upload 3-5 room photos from different angles
3. Optionally provide reference object (e.g., "door height = 2100mm")
4. Click "Start Reconstruction"

**Expected Result**:
- Job starts and progress shown
- On completion: 3D model viewer loads
- Measurements displayed with confidence scores
- Model can be orbited, zoomed, panned

**Note**: Requires Vision Engine service. If not available, verify API call is made.

---

### TC-6.02: Reconstruction with Insufficient Photos (P2)
**Steps**:
1. Upload only 1 photo
2. Try to start reconstruction

**Expected Result**:
- Either error message (minimum photos required) OR
- Reconstruction proceeds but with lower confidence scores

---

## Module 7: Style Quiz & Mood Board

### TC-7.01: Complete Style Quiz (P1)
**Steps**:
1. Navigate to `/project/[id]/style-quiz`
2. Complete each step:
   - Step 1: Select 3-5 style images
   - Step 2: Choose color palettes
   - Step 3: Select budget tier (e.g., "Premium")
   - Step 4: Enter functional requirements
   - Step 5: Review mood board

**Expected Result**:
- Each step navigates correctly (Next/Back buttons)
- Step 5 shows generated mood board with:
  - Images matching selected styles
  - Color palette visualization
  - Style summary text
- Preferences saved to project

---

### TC-7.02: Skip Steps (P2)
**Steps**:
1. Try to skip to Step 5 without completing earlier steps

**Expected Result**:
- Either prevented (must complete in order) OR
- Works with default values for skipped steps

---

## Module 8: AI Design Generation

### TC-8.01: Generate Design Variant (P0)
**Steps**:
1. Navigate to `/project/[id]/designs`
2. Click "Generate Design"
3. Fill dialog:
   - Room: Select a room
   - Name: "Modern Living V1"
   - Style: "modern"
   - Budget: "premium"
4. Click "Generate"

**Expected Result**:
- Design variant created in list
- Job starts (check progress indicator)
- Frontend polls job status every 2 seconds
- On completion:
  - Render image(s) displayed on design card
  - Design card shows name, style badge, budget badge

**Note**: Requires Design Engine + valid LLM API key. Without API key, expect error message about missing key.

---

### TC-8.02: Generate Without API Key (P1)
**Steps**:
1. Ensure no LLM API key is configured in settings
2. Try to generate a design

**Expected Result**:
- Clear error message about missing API key
- Suggestion to add key in Settings

---

### TC-8.03: Generate Multiple Variants (P1)
**Steps**:
1. Generate 3 design variants for the same room:
   - Variant 1: Modern, Premium
   - Variant 2: Minimalist, Mid-range
   - Variant 3: Traditional, Economy

**Expected Result**:
- All 3 variants appear in list
- Each has distinct style and budget badges
- Can filter/view by room

---

### TC-8.04: View Design Detail (P0)
**Steps**:
1. Click on a completed design variant card
2. Navigate to `/project/[id]/designs/[designId]`

**Expected Result**:
- Full render image displayed
- Design specification viewable
- Actions available: Generate BOM, Generate Drawings, Approve

---

### TC-8.05: All 10 Design Styles (P2)
**Steps**:
1. Verify all 10 styles appear in the dropdown:
   - modern, traditional, minimalist, scandinavian, industrial
   - bohemian, contemporary, mid_century, japandi, art_deco

**Expected Result**: All 10 styles selectable

---

### TC-8.06: All 4 Budget Tiers (P2)
**Steps**:
1. Verify all 4 tiers appear:
   - economy, mid_range, premium, luxury

**Expected Result**: All 4 tiers selectable

---

## Module 9: 3D Interactive Editor

### TC-9.01: Load Editor (P0)
**Steps**:
1. Navigate to `/project/[id]/editor`
2. Select a room from the dropdown

**Expected Result**:
- 3D viewport loads (WebGL canvas)
- Room geometry visible (walls, floor)
- Toolbar visible at top
- Furniture catalogue visible on left
- Property panels on right

---

### TC-9.02: Place Furniture (P0)
**Steps**:
1. Browse furniture catalogue (left panel)
2. Click a furniture item (e.g., "Sofa")
3. Furniture appears in viewport

**Expected Result**:
- Furniture object added to scene at room center
- Object visible and properly scaled
- Object selectable by clicking

---

### TC-9.03: Move Furniture (P0)
**Steps**:
1. Select a furniture object (click it)
2. Press G key or select Move tool from toolbar
3. Drag the furniture to a new position

**Expected Result**:
- Move gizmo appears (colored axes)
- Object follows mouse movement
- Position updates in real-time

---

### TC-9.04: Rotate Furniture (P1)
**Steps**:
1. Select a furniture object
2. Press R key or select Rotate tool
3. Rotate the object

**Expected Result**:
- Rotation gizmo appears
- Object rotates smoothly
- Snap to increments if grid snap is enabled

---

### TC-9.05: Scale Furniture (P1)
**Steps**:
1. Select a furniture object
2. Press S key or select Scale tool
3. Scale the object

**Expected Result**:
- Scale gizmo appears
- Object resizes proportionally

---

### TC-9.06: Delete Furniture (P1)
**Steps**:
1. Select a furniture object
2. Press Delete key

**Expected Result**:
- Object removed from scene
- No console errors

---

### TC-9.07: Deselect Object (P1)
**Steps**:
1. Select a furniture object
2. Press Escape key

**Expected Result**:
- Object deselected
- Bounding box and gizmos disappear

---

### TC-9.08: Change Material (P1)
**Steps**:
1. Select a furniture object
2. Open Material Panel (right sidebar)
3. Choose a different material preset
4. Try color picker

**Expected Result**:
- Material updates on 3D object in real-time
- Color changes reflected immediately

---

### TC-9.09: Grid and Snap Controls (P1)
**Steps**:
1. Toggle grid visibility (show/hide)
2. Change grid size (0.1m, 0.25m, 0.5m, 1m)
3. Toggle snap on/off
4. Move furniture with snap on → off

**Expected Result**:
- Grid overlay appears/disappears
- Grid density changes with size selection
- With snap ON: furniture snaps to grid increments
- With snap OFF: furniture moves freely

---

### TC-9.10: View Presets (P1)
**Steps**:
1. Click view preset buttons:
   - Perspective
   - Isometric
   - Front
   - Side
   - Top

**Expected Result**:
- Camera transitions to correct view angle
- Scene remains visible from each view

---

### TC-9.11: Keyboard Shortcuts (P2)
**Steps**:
1. Verify all keyboard shortcuts work:
   - V → Select tool
   - G → Move tool
   - R → Rotate tool
   - S → Scale tool
   - M → Measure tool
   - Delete → Remove selected
   - Escape → Deselect

**Expected Result**: Each shortcut activates the correct tool

---

### TC-9.12: Real-Time Collaboration (P1)
**Steps**:
1. Open the editor in Browser Window A (User 1)
2. Open the same project's editor in Browser Window B (User 2, different account)
3. In Window A: place a furniture item
4. In Window A: move the furniture

**Expected Result**:
- In Window B: furniture item appears automatically
- In Window B: furniture movement reflected in real-time
- User presence indicators shown (avatars)
- Remote user cursors visible (colored dots)

---

### TC-9.13: Ceiling Toggle (P2)
**Steps**:
1. Toggle ceiling visibility on/off

**Expected Result**:
- Ceiling geometry shows/hides
- Allows looking down into room when ceiling is hidden

---

## Module 10: Bill of Materials (BOM)

### TC-10.01: Generate BOM (P0)
**Steps**:
1. Navigate to `/project/[id]/bom`
2. Select a design variant from dropdown
3. Click "Generate BOM"
4. Wait for job to complete

**Expected Result**:
- Job starts, progress shown
- On completion: BOM table displays
- Table has categorized items with quantities and prices
- Grand total calculated correctly

---

### TC-10.02: BOM Table Sorting (P1)
**Steps**:
1. Click "Name" column header → sort alphabetically
2. Click again → reverse sort
3. Click "Unit Price" header → sort by price
4. Click "Total" header → sort by total

**Expected Result**:
- Items re-order correctly on each click
- Sort direction toggles (ascending ↔ descending)
- Sort icon updates to show direction

---

### TC-10.03: BOM Category Collapse/Expand (P1)
**Steps**:
1. Click category header (e.g., "Furniture") to collapse
2. Click again to expand

**Expected Result**:
- Items under category hide on collapse
- Items reappear on expand
- Subtotal always visible

---

### TC-10.04: BOM Export CSV (P0)
**Steps**:
1. Click "Export" dropdown
2. Select "CSV"

**Expected Result**:
- CSV file downloads to browser
- Open file and verify:
  - All items present
  - Columns: name, specification, category, quantity, unit, unitPrice, total, wasteFactor
  - Numbers are correct
  - Grand total included

---

### TC-10.05: BOM Export Excel (P1)
**Steps**:
1. Click "Export" → "Excel"

**Expected Result**:
- Browser navigates to `/api/bom/export/[bomId]?format=xlsx`
- XLSX file downloads
- Open in Excel: data formatted correctly

---

### TC-10.06: BOM Export PDF (P1)
**Steps**:
1. Click "Export" → "PDF"

**Expected Result**:
- PDF file downloads
- Open: formatted report with items, categories, totals

---

### TC-10.07: BOM Currency Display (P1)
**Steps**:
1. Check if BOM displays amounts in user's preferred currency
2. Change currency preference in settings
3. Regenerate or refresh BOM

**Expected Result**:
- Currency symbol matches preference ($, ₹, €, £)
- Amounts formatted correctly for locale

---

## Module 11: Technical Drawings

### TC-11.01: Generate Drawings (P0)
**Steps**:
1. Navigate to `/project/[id]/drawings`
2. Select a design variant
3. Select drawing types (e.g., Floor Plan, Elevation)
4. Click "Generate"

**Expected Result**:
- Job starts, progress shown
- On completion:
  - Drawing previews rendered (SVG in browser)
  - Download buttons for each format (DXF, PDF, SVG, IFC)

---

### TC-11.02: Download DXF (P1)
**Steps**:
1. Click "Download DXF" for a generated drawing

**Expected Result**:
- DXF file downloads
- File can be opened in AutoCAD or DXF viewer

---

### TC-11.03: Download PDF (P1)
**Steps**:
1. Click "Download PDF" for a generated drawing

**Expected Result**:
- PDF file downloads
- File opens in PDF reader with proper drawings

---

### TC-11.04: All Drawing Types (P1)
**Steps**:
1. Generate each drawing type:
   - Floor Plan
   - Elevation
   - Section
   - Reflected Ceiling Plan (RCP)
   - Flooring Layout
   - Electrical Layout

**Expected Result**: Each type generates successfully with relevant content

---

## Module 12: CNC Cut List & Nesting

### TC-12.01: Generate Cut List (P0)
**Steps**:
1. Navigate to `/project/[id]/cutlist`
2. Select a design variant (must have BOM generated)
3. Click "Generate Cut List"

**Expected Result**:
- Job processes
- On completion:
  - Panel schedule table shown
  - Hardware schedule shown
  - Nesting diagram visualized
  - Total sheets needed displayed
  - Waste percentage shown

---

### TC-12.02: Nesting Viewer (P1)
**Steps**:
1. After cut list generation
2. Examine nesting diagram

**Expected Result**:
- Visual layout of panels on standard sheets (8×4 ft)
- Color-coded by panel type
- Waste areas visible
- Waste percentage reasonable (typically < 20%)

---

## Module 13: MEP Engineering

### TC-13.01: Electrical Calculation (P0)
**Steps**:
1. Navigate to `/project/[id]/mep`
2. Select "Electrical" tab
3. Select design variant
4. Click "Calculate"

**Expected Result**:
- Job processes
- Results show:
  - Circuit load calculations
  - Wire gauge recommendations
  - Breaker sizing
  - Standards cited (NEC references)

---

### TC-13.02: Plumbing Calculation (P0)
**Steps**:
1. Select "Plumbing" tab
2. Click "Calculate"

**Expected Result**:
- Pipe sizing results
- Water supply calculations
- IPC standards cited

---

### TC-13.03: HVAC Calculation (P0)
**Steps**:
1. Select "HVAC" tab
2. Click "Calculate"

**Expected Result**:
- Cooling/heating load (BTU)
- Equipment recommendations
- ASHRAE standards cited

---

## Module 14: Building Code Compliance

### TC-14.01: Run Compliance Check (P1)
**Steps**:
1. Navigate to `/project/[id]/compliance`
2. Trigger compliance check

**Expected Result**:
- Report generated with pass/fail per code section
- Non-compliant items flagged with code references
- Recommended fixes provided

---

## Module 15: Project Timeline & Scheduling

### TC-15.01: Generate Timeline (P0)
**Steps**:
1. Navigate to `/project/[id]/timeline`
2. Click "Generate Timeline"

**Expected Result**:
- Gantt chart displayed with tasks
- Each task: name, duration, start/end date, progress
- Dependencies shown (arrows between tasks)
- Critical path highlighted
- Trade-based coloring

---

### TC-15.02: View Milestones (P1)
**Steps**:
1. Click "Milestones" tab

**Expected Result**:
- Milestone list displayed
- Each: name, due date, status
- Can update milestone status

---

### TC-15.03: Link Payment to Milestone (P1)
**Steps**:
1. Click a milestone
2. Link a payment to it

**Expected Result**:
- Payment linked successfully
- Milestone shows "Payment Linked" indicator

---

## Module 16: Change Orders

### TC-16.01: Create Change Order (P0)
**Steps**:
1. Navigate to `/project/[id]/change-orders`
2. Click "Create Change Order"
3. Fill in:
   - Title: "Upgrade countertop material"
   - Description: "Change from laminate to granite"
4. Submit

**Expected Result**:
- Change order created with status "proposed"
- Cost impact analysis shown (AI-generated)
- Timeline impact shown

---

### TC-16.02: Approve Change Order (P1)
**Steps**:
1. Click on a proposed change order
2. Click "Approve"

**Expected Result**:
- Status changes to "approved"
- Relevant stakeholders notified

---

### TC-16.03: Reject Change Order (P1)
**Steps**:
1. Click on a proposed change order
2. Click "Reject"
3. Add rejection reason

**Expected Result**:
- Status changes to "rejected"
- Reason recorded

---

## Module 17: Site Logs

### TC-17.01: Create Site Log (P0)
**Steps**:
1. Navigate to `/project/[id]/site-logs`
2. Click "Add Site Log"
3. Fill in:
   - Date: Today
   - Title: "Day 1 — Demolition started"
   - Notes: "Removed old kitchen cabinets..."
   - Weather: Sunny
   - Workers: 5
   - Upload 2 photos
   - Tags: progress
4. Submit

**Expected Result**:
- Site log created and appears in list
- Photos attached and viewable
- All fields displayed correctly

---

### TC-17.02: View Site Logs Timeline (P1)
**Steps**:
1. Create 3 site logs with different dates
2. View the logs list

**Expected Result**:
- Logs shown in chronological order
- Each log displays date, title, weather, worker count

---

## Module 18: Quality Assurance & Punch List

### TC-18.01: View Quality Checkpoints (P1)
**Steps**:
1. Navigate to `/project/[id]/quality`
2. View checkpoint list

**Expected Result**:
- Stage-gate checkpoints listed
- Each shows title, trade, status

---

### TC-18.02: Complete Quality Inspection (P1)
**Steps**:
1. Click a checkpoint (e.g., "Electrical rough-in")
2. Go through checklist items (check each)
3. Upload inspection photos
4. Mark as "Passed"

**Expected Result**:
- Checklist items toggle correctly
- Photos attached
- Status updates to "Passed"

---

### TC-18.03: Fail Quality Inspection (P1)
**Steps**:
1. Click a checkpoint
2. Leave some items unchecked
3. Mark as "Failed"
4. Add notes about issues

**Expected Result**:
- Status updates to "Failed"
- Punch list items created for failed items

---

### TC-18.04: Create Punch List Item (P0)
**Steps**:
1. Click "Add Punch List Item"
2. Fill in:
   - Title: "Scratch on bedroom door"
   - Description: "Deep scratch on lower panel"
   - Severity: Minor
   - Category: Carpentry
   - Room: Master Bedroom
   - Upload photo
3. Submit

**Expected Result**:
- Item created with status "open"
- Photo attached
- Severity badge displayed

---

### TC-18.05: Resolve Punch List Item (P1)
**Steps**:
1. Click an open punch list item
2. Update status to "resolved"
3. Upload "after" photo
4. Add resolution notes

**Expected Result**:
- Status changes to "resolved"
- Before/after photos visible

---

## Module 19: Collaboration Hub

### TC-19.01: Create Discussion Thread (P0)
**Steps**:
1. Navigate to `/project/[id]/collaboration`
2. Click "New Thread"
3. Fill in:
   - Title: "Kitchen design feedback"
   - Category: design_decision
4. Submit

**Expected Result**:
- Thread created and appears in list
- Status: "open"

---

### TC-19.02: Post Message in Thread (P0)
**Steps**:
1. Open a thread
2. Type a message: "I think we should go with the minimalist design"
3. Submit

**Expected Result**:
- Message appears in thread
- Timestamp and author shown
- Real-time for other users viewing the thread

---

### TC-19.03: @Mention User (P1)
**Steps**:
1. In a thread, type: "@testuser2 what do you think?"
2. Submit

**Expected Result**:
- Message posted with mention highlighted
- testuser2 receives notification

---

### TC-19.04: Mark Thread as Resolved (P1)
**Steps**:
1. Open an active thread
2. Click "Resolve"

**Expected Result**:
- Thread status changes to "resolved"
- Thread moves to resolved section/filter

---

### TC-19.05: Request Approval (P1)
**Steps**:
1. Navigate to a design variant
2. Click "Request Approval"
3. Select reviewer

**Expected Result**:
- Approval record created (status: pending)
- Reviewer notified
- Approval status visible on design card

---

### TC-19.06: Approve/Reject Request (P1)
**Steps**:
1. Log in as the reviewer
2. Navigate to the approval
3. Click "Approve" (or "Reject" with notes)

**Expected Result**:
- Status updates to "approved" or "rejected"
- Requester notified
- Notes captured if rejected

---

## Module 20: Procurement & Purchase Orders

### TC-20.01: Generate Purchase Orders (P0)
**Steps**:
1. Navigate to `/project/[id]/procurement`
2. Ensure BOM is generated
3. Click "Generate Orders"

**Expected Result**:
- Procurement service optimizes orders
- Draft POs generated
- Each PO shows: vendor, items, total, expected delivery

---

### TC-20.02: Submit Purchase Order (P1)
**Steps**:
1. Click on a draft PO
2. Review items and totals
3. Click "Submit"

**Expected Result**:
- PO status changes to "submitted"
- Confirmation toast

---

### TC-20.03: Update PO Status (P1)
**Steps**:
1. Update PO status through lifecycle:
   - submitted → confirmed → shipped → delivered

**Expected Result**:
- Each status transition works
- Status badge updates
- Delivery date fields editable

---

## Module 21: Delivery Tracking

### TC-21.01: View Deliveries (P1)
**Steps**:
1. Navigate to `/project/[id]/deliveries`
2. View delivery list

**Expected Result**:
- All deliveries listed
- Each shows: vendor, description, status, expected date

---

### TC-21.02: Inspection Checklist (P1)
**Steps**:
1. Mark a delivery as "delivered"
2. Complete inspection checklist:
   - ☐ Correct items received
   - ☐ Quantities match
   - ☐ No damage
   - ☐ Quality acceptable
3. Upload inspection photos
4. Mark as "inspected"

**Expected Result**:
- Checklist items toggle correctly
- Photos attached to delivery
- Status updates to "inspected"

---

## Module 22: Payments & Invoices

### TC-22.01: View Payment Summary (P0)
**Steps**:
1. Navigate to `/project/[id]/payments`
2. View summary cards

**Expected Result**:
- Cards show: Total Budget, Total Paid, Pending, Remaining
- Numbers are correctly calculated
- Currency symbols correct

---

### TC-22.02: Create Payment (Stripe) (P0)
**Steps**:
1. Click "Create Payment"
2. Fill form:
   - Amount: 1000
   - Currency: USD
   - Provider: Stripe
   - Milestone: (select one)
3. Click "Pay"

**Expected Result**:
- Payment record created (status: pending)
- Redirected to Stripe checkout page
- Complete payment on Stripe
- Redirected back to app
- Payment status: completed
- Toast: "Payment successful"

**Note**: Use Stripe test mode card: `4242 4242 4242 4242`

---

### TC-22.03: Payment Validation (P1)
**Steps**:
1. Try creating payment with:
   a. Amount: 0 → Should reject
   b. Amount: -100 → Should reject
   c. Amount: blank → Should reject

**Expected Result**: All invalid amounts rejected with validation error

---

### TC-22.04: View Invoices (P1)
**Steps**:
1. Click "Invoices" tab
2. View invoice list

**Expected Result**:
- Invoices listed with: number, date, amount, status
- Click invoice to view/download PDF

---

## Module 23: Financial Reports

### TC-23.01: View Financial Report (P1)
**Steps**:
1. Navigate to `/project/[id]/financial-reports`
2. View report sections

**Expected Result**:
- Budget vs. Actuals chart displayed
- Category breakdown chart/table
- Expenditure timeline shown
- Numbers match payment records

---

## Module 24: Analytics Dashboard

### TC-24.01: Global Analytics (P1)
**Steps**:
1. Navigate to `/analytics`
2. View overview cards and charts

**Expected Result**:
- Total Projects count matches actual
- Active Projects count is correct
- Spending Trend chart shows 6 months
- Project Status Distribution chart correct
- Design Styles chart shows usage
- Budget Distribution shows tier counts

---

### TC-24.02: Project Analytics (P1)
**Steps**:
1. Navigate to `/project/[id]/analytics`
2. View project metrics

**Expected Result**:
- Budget vs. actual chart
- Timeline progress bar
- Cost breakdown accurate

---

## Module 25: AI Predictions

### TC-25.01: Cost Prediction (P1)
**Steps**:
1. Navigate to `/project/[id]/predictions`
2. View cost prediction

**Expected Result**:
- Predicted cost with confidence interval (low-high)
- Risk factors listed and ranked
- Breakdown by phase shown

---

### TC-25.02: Timeline Prediction (P1)
**Steps**:
1. View timeline prediction on same page

**Expected Result**:
- Predicted duration (days)
- Confidence interval
- Critical risks listed

---

## Module 26: Budget Optimizer

### TC-26.01: Generate Budget Scenarios (P1)
**Steps**:
1. Navigate to `/project/[id]/budget-optimizer`
2. View optimization scenarios

**Expected Result**:
- Multiple scenarios presented (e.g., Maximum Savings, Balanced, Premium)
- Each shows: savings amount, percentage, substitutions, quality impact
- Can accept or reject each scenario

---

## Module 27: Sustainability Scoring

### TC-27.01: View Sustainability Report (P1)
**Steps**:
1. Navigate to `/project/[id]/sustainability`
2. View report

**Expected Result**:
- Overall score (0-100)
- Carbon footprint breakdown
- LEED points assessment
- Green alternatives suggested

---

## Module 28: Contractor Marketplace

### TC-28.01: Browse Contractors (P0)
**Steps**:
1. Navigate to `/marketplace`
2. View contractor cards

**Expected Result**:
- Cards display in 3-column grid
- Each card: name, company, rating (stars), city, specializations, verified badge
- Pagination works (Next/Previous)

---

### TC-28.02: Search Contractors (P0)
**Steps**:
1. Type "electrician" in search box
2. Wait 300ms for debounce

**Expected Result**:
- Results filter to match search query
- Debounce works (no API call per keystroke)
- Results update smoothly

---

### TC-28.03: Filter by City (P1)
**Steps**:
1. Click "Mumbai" city filter button
2. Results filter to Mumbai contractors only
3. Click "Delhi" → Results show Delhi contractors
4. Click "All" → All contractors shown

**Expected Result**:
- City filter buttons toggle correctly
- Active filter highlighted
- Results update immediately

---

### TC-28.04: Filter by Specialization (P1)
**Steps**:
1. Check "Carpentry" checkbox
2. Check "Electrical" checkbox (multi-select)
3. Observe filter chips appear
4. Click × on "Electrical" chip to remove

**Expected Result**:
- Results filter by selected specializations
- Filter chips display active filters
- Removing chip updates results
- "Show More" expands full specialization list

---

### TC-28.05: Clear All Filters (P1)
**Steps**:
1. Apply search, city, and specialization filters
2. Click "Clear All"

**Expected Result**:
- All filters reset
- Full contractor list shown
- Filter chips removed

---

### TC-28.06: View Contractor Profile (P0)
**Steps**:
1. Click a contractor card
2. Navigate to `/marketplace/[contractorId]`

**Expected Result**:
- Full profile page loads
- Shows: bio, portfolio gallery, certifications, reviews, contact info
- "Hire" button visible

---

### TC-28.07: Hire Contractor (P1)
**Steps**:
1. Click "Hire" on a contractor profile
2. Fill hire dialog:
   - Select project
   - Role: "General Contractor"
   - Amount: 50000
   - Start date: Next week
3. Submit

**Expected Result**:
- Contractor assignment created
- Confirmation shown
- Contractor appears in project's vendor list

---

### TC-28.08: Pagination (P1)
**Steps**:
1. Ensure there are >12 contractors in the system
2. Click "Next" page
3. Click "Previous" page

**Expected Result**:
- 12 contractors per page
- Page navigation works correctly
- No duplicate contractors across pages

---

## Module 29: Product Catalogue

### TC-29.01: Browse Products (P1)
**Steps**:
1. Navigate to `/marketplace/catalogue`
2. Browse by category
3. Search for a product

**Expected Result**:
- Products listed with images, names, prices
- Category browsing works
- Search returns relevant results

---

### TC-29.02: Product Detail (P1)
**Steps**:
1. Click a product

**Expected Result**:
- Full product details shown
- Multi-vendor price comparison
- Specifications and dimensions displayed

---

## Module 30: Vendor Performance Management

### TC-30.01: View Vendor Performance (P1)
**Steps**:
1. Navigate to `/project/[id]/vendors`
2. View vendor list

**Expected Result**:
- Vendors listed with ratings
- Delivery, quality, pricing scores shown
- Order history accessible

---

## Module 31: Offcuts Exchange Marketplace

### TC-31.01: List Material for Sale (P1)
**Steps**:
1. Navigate to `/marketplace/offcuts`
2. Click "List Material"
3. Fill in:
   - Title: "Marine Plywood 8mm"
   - Material: Wood
   - Quantity: 2 sheets
   - Condition: New
   - Price: $50
   - Upload photo
4. Submit

**Expected Result**:
- Listing created and appears in marketplace
- Status: active
- Photo displayed

---

### TC-31.02: Browse and Inquire (P1)
**Steps**:
1. Browse offcut listings
2. Click a listing for details
3. Click "Inquire"
4. Send message to seller

**Expected Result**:
- Inquiry sent
- Seller receives notification
- Inquiry appears in seller's inbox

---

## Module 32: Digital Twin & IoT

### TC-32.01: View Digital Twin (P1)
**Steps**:
1. Navigate to `/project/[id]/digital-twin`
2. View 3D model

**Expected Result**:
- 3D model of completed space loads
- Can orbit, zoom, pan
- IoT devices section visible

---

### TC-32.02: Add IoT Device (P1)
**Steps**:
1. Click "Add Device"
2. Fill in:
   - Name: "Living Room Thermostat"
   - Type: temperature
   - Room: Living Room
3. Submit

**Expected Result**:
- Device added to digital twin
- Appears on 3D model
- Dashboard shows device

---

## Module 33: Maintenance Scheduling

### TC-33.01: View Maintenance Schedule (P1)
**Steps**:
1. Navigate to `/project/[id]/maintenance`
2. View schedule list

**Expected Result**:
- Maintenance items listed
- Each shows: item, category, frequency, next due date, cost estimate
- Overdue items highlighted

---

### TC-33.02: Log Maintenance (P1)
**Steps**:
1. Click a maintenance item
2. Click "Log Maintenance"
3. Fill in:
   - Date performed
   - Performed by
   - Cost
   - Notes
4. Submit

**Expected Result**:
- Maintenance logged
- Next due date recalculated
- Log appears in history

---

## Module 34: Warranty Tracking

### TC-34.01: Add Warranty (P1)
**Steps**:
1. Navigate to `/project/[id]/warranties`
2. Click "Add Warranty"
3. Fill in:
   - Item: "Kitchen Chimney"
   - Brand: "Elica"
   - Serial: "ELC-2024-001"
   - Type: Manufacturer
   - Start: 2024-01-01
   - End: 2026-01-01
4. Submit

**Expected Result**:
- Warranty added to list
- Status: active (if within dates)
- Days remaining calculated correctly

---

### TC-34.02: File Warranty Claim (P1)
**Steps**:
1. Click an active warranty
2. Click "File Claim"
3. Fill in:
   - Issue description
   - Upload photos
4. Submit

**Expected Result**:
- Claim created (status: filed)
- Can track claim progress

---

## Module 35: Handover Package

### TC-35.01: Generate Handover Package (P1)
**Steps**:
1. Navigate to `/project/[id]/handover`
2. View package contents:
   - As-built drawings
   - Material register
   - Contractor directory
   - Maintenance manual

**Expected Result**:
- Package sections populated
- Documents downloadable
- Status progression: draft → in_progress → ready → delivered

---

## Module 36: AR/VR Viewer

### TC-36.01: Open AR Mode (P2)
**Steps**:
1. Navigate to `/project/[id]/ar`
2. On mobile device with camera

**Expected Result**:
- Camera activates (with permission)
- AR overlay shows furniture
- Can interact with placed items

**Note**: Requires WebXR-capable device. On desktop, may show compatibility warning.

---

## Module 37: Portfolio Management

### TC-37.01: Create Portfolio (P1)
**Steps**:
1. Navigate to `/portfolios`
2. Click "Create Portfolio"
3. Fill in: name, description
4. Add projects to portfolio

**Expected Result**:
- Portfolio created
- Projects grouped under portfolio
- Aggregate metrics shown

---

## Module 38: Developer API Portal

### TC-38.01: Register App (P1)
**Steps**:
1. Navigate to `/developer`
2. Click "Register App"
3. Fill in:
   - App name
   - Redirect URIs
   - Scopes
4. Submit

**Expected Result**:
- App registered
- Client ID generated
- Client Secret shown (once)

---

### TC-38.02: View API Documentation (P1)
**Steps**:
1. Navigate to `/developer/docs`

**Expected Result**:
- API documentation displayed
- Endpoints listed with parameters
- Code examples provided

---

## Module 39: Notifications System

### TC-39.01: Notification Bell (P0)
**Steps**:
1. Trigger a notification (e.g., create a comment on your project from another account)
2. Observe the bell icon in top navigation

**Expected Result**:
- Bell icon shows unread count badge (red number)
- Click bell → dropdown with recent notifications
- Each notification: icon, title, message, timestamp

---

### TC-39.02: Mark Notification as Read (P1)
**Steps**:
1. Click a notification in the dropdown
2. Or click "Mark as Read" button

**Expected Result**:
- Notification marked as read
- Unread count decrements
- Read notification no longer has "unread" styling

---

### TC-39.03: Mark All Read (P1)
**Steps**:
1. Have multiple unread notifications
2. Click "Mark All Read"

**Expected Result**:
- All notifications marked as read
- Unread count becomes 0
- Badge disappears

---

### TC-39.04: Notification Center (P1)
**Steps**:
1. Navigate to `/notifications`
2. View All tab and Unread tab

**Expected Result**:
- All tab shows all notifications
- Unread tab shows only unread
- "View Details" link navigates to relevant page

---

### TC-39.05: Real-Time Notification (P1)
**Steps**:
1. Open the app in two browsers (two different users)
2. User A comments on User B's project
3. Observe User B's browser

**Expected Result**:
- Toast popup appears on User B's screen within seconds
- Bell icon count increments
- No page refresh needed

---

## Module 40: Admin Panel

### TC-40.01: Admin Access Control (P0)
**Steps**:
1. Sign in with a non-admin account
2. Navigate to `/admin`

**Expected Result**:
- Access denied (redirected or error message)
- No admin content visible

---

### TC-40.02: Admin Dashboard (P0)
**Steps**:
1. Sign in with admin account
2. Navigate to `/admin`

**Expected Result**:
- Dashboard shows: total users, total projects, active jobs, system health
- All numbers accurate

---

### TC-40.03: User Management (P1)
**Steps**:
1. Navigate to `/admin/users`
2. View user list
3. Try to disable a user account

**Expected Result**:
- User list displayed with search/filter
- Can enable/disable user accounts
- Disabled user cannot sign in

---

### TC-40.04: System Health (P1)
**Steps**:
1. Navigate to `/admin/system`
2. View service health checks

**Expected Result**:
- All services show status (up/down)
- Response times displayed
- Down services highlighted in red

---

### TC-40.05: Job Queue Monitor (P1)
**Steps**:
1. Navigate to `/admin/jobs`
2. View job list

**Expected Result**:
- Jobs listed with: type, status, user, created time
- Filter by status (pending/running/completed/failed)
- Can view job details (input/output/errors)

---

## Module 41: Settings & Preferences

### TC-41.01: View Settings (P0)
**Steps**:
1. Navigate to `/dashboard/settings`

**Expected Result**:
- Profile section with name, email, image
- Preferences section with currency, unit system, locale
- API Keys section
- Connected accounts section

---

### TC-41.02: Change Currency Preference (P1)
**Steps**:
1. Go to Settings → Preferences
2. Change currency from USD to INR
3. Save

**Expected Result**:
- Currency preference saved
- All financial displays across the app show ₹ instead of $

---

### TC-41.03: Change Unit System (P1)
**Steps**:
1. Change from Metric to Imperial
2. Save
3. Navigate to a room page

**Expected Result**:
- Dimensions shown in feet/inches instead of mm
- All dimensional inputs accept feet/inches

---

### TC-41.04: Add LLM API Key (P0)
**Steps**:
1. Go to Settings → API Keys
2. Click "Add API Key"
3. Select provider: OpenAI
4. Enter API key: `sk-test123456789`
5. Save

**Expected Result**:
- Key stored successfully
- Only prefix shown (e.g., `sk-te...789`)
- Key encrypted in database (verify: not stored as plaintext)

---

### TC-41.05: Delete API Key (P1)
**Steps**:
1. Click delete on an existing API key
2. Confirm deletion

**Expected Result**:
- Key removed
- Design generation should show "no API key" error until new key is added

---

## Module 42: Localization & Currency

### TC-42.01: Multi-Currency Display (P1)
**Steps**:
1. Create payments in different currencies
2. View financial reports

**Expected Result**:
- Each currency symbol displayed correctly: $, ₹, €, £
- Numbers formatted per locale (e.g., 1,000.00 vs 1.000,00)

---

### TC-42.02: Metric vs Imperial (P1)
**Steps**:
1. Create project with Metric
2. Create project with Imperial
3. Compare room dimension displays

**Expected Result**:
- Metric project: dimensions in mm (e.g., 4000 × 3500 mm)
- Imperial project: dimensions in ft/in (e.g., 13'1" × 11'6")

---

## Cross-Cutting Tests

### TC-CC.01: Navigation Consistency (P1)
**Steps**:
1. Navigate to every page via sidebar
2. Verify active route highlighting
3. Check breadcrumbs on nested pages
4. Verify back button behavior

**Expected Result**:
- Sidebar highlights current page
- Breadcrumbs show correct path
- Back button returns to previous page (not a random page)

---

### TC-CC.02: Loading States (P1)
**Steps**:
1. On a slow network (DevTools → Network → Slow 3G)
2. Navigate to various pages
3. Observe loading indicators

**Expected Result**:
- Skeleton loaders shown while content loads
- No blank/white screens
- Loading spinners for actions (button states)
- No layout shift when content loads

---

### TC-CC.03: Error States (P1)
**Steps**:
1. Disconnect network (DevTools → Network → Offline)
2. Try to create a project
3. Try to load a page

**Expected Result**:
- Error message shown (not a crash)
- Toast with error description
- Retry option where applicable
- No unhandled promise rejections in console

---

### TC-CC.04: Empty States (P1)
**Steps**:
1. Check empty states on:
   - Dashboard (no projects)
   - Rooms (no rooms)
   - Designs (no designs)
   - BOM (no BOM generated)
   - Marketplace (no contractors match filter)
   - Notifications (no notifications)

**Expected Result**:
- Each shows appropriate empty state message
- Icon/illustration present
- CTA button to create/add (where applicable)
- No broken layouts

---

### TC-CC.05: Toast Notifications (P1)
**Steps**:
1. Trigger various actions:
   - Create project → success toast
   - Create room → success toast
   - Upload file → success/error toast
   - Generate BOM → completion toast
2. Observe toast behavior

**Expected Result**:
- Toasts appear at consistent position (bottom)
- Auto-dismiss after 3-5 seconds
- Close button (×) works
- Multiple toasts stack properly
- Error toasts are visually distinct (red/destructive)

---

### TC-CC.06: URL Direct Access (P1)
**Steps**:
1. Copy a project URL (e.g., `/project/abc123`)
2. Paste in new tab while signed in

**Expected Result**:
- Page loads correctly
- No redirect to dashboard
- Correct project data shown

---

### TC-CC.07: Invalid Project ID (P1)
**Steps**:
1. Navigate to `/project/invalid-id-12345`

**Expected Result**:
- "Project not found" error or 404 page
- No crash
- Navigation back to dashboard available

---

### TC-CC.08: Other User's Project (P0)
**Steps**:
1. Get a project ID belonging to another user
2. Try to access it: `/project/[other-users-project-id]`

**Expected Result**:
- Access denied or "Not found"
- Cannot view other user's project data
- No data leakage in API responses

---

### TC-CC.09: Concurrent Actions (P1)
**Steps**:
1. Open the same project in two browser tabs
2. In tab 1: create a room
3. Switch to tab 2: check if room appears (after refresh)
4. In tab 2: delete the room
5. Switch to tab 1: check if room is gone (after refresh)

**Expected Result**:
- Data remains consistent
- No phantom data after deletion
- Refresh shows current state

---

## Performance Testing

### TC-P.01: Page Load Time (P1)
**Steps**:
1. Open DevTools → Performance tab
2. Navigate to each major page:
   - Dashboard
   - Project overview
   - Editor
   - Marketplace
   - Analytics
3. Record load times

**Expected Result**:
- Pages load in under 3 seconds on fast connection
- First Contentful Paint < 1.5 seconds
- No unnecessary API calls (check Network tab)

---

### TC-P.02: Large Data Sets (P1)
**Steps**:
1. Create a project with 20 rooms
2. Generate designs for each room
3. Navigate to design list

**Expected Result**:
- Page handles 20+ items without performance issues
- Scrolling remains smooth
- No memory warnings in console

---

### TC-P.03: Image Loading (P1)
**Steps**:
1. Navigate to a project with many uploaded photos
2. Scroll through photo gallery

**Expected Result**:
- Thumbnails load quickly
- Lazy loading works (images below viewport load on scroll)
- No broken image icons

---

### TC-P.04: 3D Editor Performance (P1)
**Steps**:
1. Open 3D editor
2. Add 20+ furniture items
3. Orbit and zoom the scene

**Expected Result**:
- FPS stays above 30 (check stats panel if available)
- No freezing or stuttering
- Mouse interaction remains responsive

---

## Security Testing

### TC-S.01: XSS Prevention (P0)
**Steps**:
1. In every text input field, try entering:
   ```
   <script>alert('XSS')</script>
   ```
   Test in: project name, room name, comment text, site log notes
2. Submit and view the saved data

**Expected Result**:
- Script is NOT executed
- Text is displayed as-is (escaped) or sanitized
- No JavaScript alert popup

---

### TC-S.02: SQL Injection Prevention (P0)
**Steps**:
1. In text inputs, try:
   ```
   '; DROP TABLE projects; --
   ```
2. Submit and check if data is saved

**Expected Result**:
- Text saved as literal string
- No database errors
- No data loss (projects table intact)

**Note**: The app uses Drizzle ORM which should prevent SQL injection, but always verify.

---

### TC-S.03: API Authorization (P0)
**Steps**:
1. Using DevTools Network tab, copy a tRPC request
2. Modify the project ID to another user's project
3. Replay the request

**Expected Result**:
- Request rejected (unauthorized or not found)
- Cannot access other user's data
- Cannot modify other user's data

---

### TC-S.04: File Upload Security (P0)
**Steps**:
1. Rename a `.html` file to `.jpg` and try to upload
2. Try to upload a file with script content

**Expected Result**:
- Server validates actual file content (MIME type), not just extension
- Malicious files rejected
- Uploaded files served with proper Content-Type headers
- No Content-Type sniffing (X-Content-Type-Options: nosniff)

---

### TC-S.05: API Key Security (P0)
**Steps**:
1. Add an LLM API key
2. Check the database directly (if you have access):
   ```sql
   SELECT encryptedKey, iv, authTag FROM userApiKeys WHERE userId = '...';
   ```

**Expected Result**:
- `encryptedKey` is NOT the plaintext key
- `iv` and `authTag` are populated (AES-256-GCM encryption)
- API never returns the full key (only prefix)

---

### TC-S.06: Rate Limiting (P2)
**Steps**:
1. Make 100 rapid API calls (script or manual)

**Expected Result**:
- Rate limiting kicks in (429 Too Many Requests)
- Or: requests are throttled

---

## Mobile Responsiveness Testing

### TC-M.01: Dashboard Mobile (P1)
**Steps**:
1. Open `/dashboard` on mobile (or Chrome DevTools → Mobile view)
2. Check responsive layout

**Expected Result**:
- Project cards stack vertically (single column)
- Sidebar collapses to hamburger menu
- All buttons tappable (min 44×44px touch target)
- No horizontal scrollbar

---

### TC-M.02: Marketplace Mobile (P1)
**Steps**:
1. Open `/marketplace` on mobile
2. Check filters, search, cards

**Expected Result**:
- Filter sidebar collapses or becomes sheet/drawer
- Search input full width
- Contractor cards single column
- Pagination buttons accessible

---

### TC-M.03: Tables Mobile (P1)
**Steps**:
1. Open BOM table on mobile
2. Check table display

**Expected Result**:
- Table horizontally scrollable
- Column headers visible
- Touch scroll works smoothly
- No text cutoff

---

### TC-M.04: 3D Editor Mobile (P2)
**Steps**:
1. Open 3D editor on mobile

**Expected Result**:
- Either: Viewport renders with touch controls (pinch zoom, one-finger orbit)
- Or: Clear message that editor is best on desktop
- No crash

---

### TC-M.05: Forms Mobile (P1)
**Steps**:
1. Open create project dialog on mobile
2. Fill in all fields
3. Submit

**Expected Result**:
- Dialog covers full screen or adapts to mobile
- Keyboard doesn't cover input fields
- Submit button accessible
- Dropdowns work correctly on mobile

---

## Test Completion Checklist

Use this checklist to track your testing progress:

### Critical Path (P0) - Must complete first
- [ ] TC-1.01: Google OAuth Sign In
- [ ] TC-1.02: GitHub OAuth Sign In
- [ ] TC-1.03: Protected Route Redirect
- [ ] TC-1.04: Sign Out
- [ ] TC-2.02: Create New Project
- [ ] TC-2.04: View Project Overview
- [ ] TC-3.02: Add Room
- [ ] TC-3.05: View Room Detail
- [ ] TC-4.01: Upload Valid JPEG
- [ ] TC-4.06: Reject Oversized File
- [ ] TC-4.07: Reject Invalid File Type
- [ ] TC-4.11: Upload Without Auth
- [ ] TC-5.01: Upload Floor Plan
- [ ] TC-5.02: Digitize Floor Plan
- [ ] TC-5.04: Create Rooms from Detected
- [ ] TC-8.01: Generate Design Variant
- [ ] TC-8.04: View Design Detail
- [ ] TC-9.01: Load Editor
- [ ] TC-9.02: Place Furniture
- [ ] TC-9.03: Move Furniture
- [ ] TC-10.01: Generate BOM
- [ ] TC-10.04: BOM Export CSV
- [ ] TC-11.01: Generate Drawings
- [ ] TC-13.01: Electrical Calculation
- [ ] TC-13.02: Plumbing Calculation
- [ ] TC-13.03: HVAC Calculation
- [ ] TC-15.01: Generate Timeline
- [ ] TC-16.01: Create Change Order
- [ ] TC-17.01: Create Site Log
- [ ] TC-18.04: Create Punch List Item
- [ ] TC-19.01: Create Discussion Thread
- [ ] TC-19.02: Post Message
- [ ] TC-20.01: Generate Purchase Orders
- [ ] TC-22.01: View Payment Summary
- [ ] TC-22.02: Create Payment (Stripe)
- [ ] TC-28.01: Browse Contractors
- [ ] TC-28.02: Search Contractors
- [ ] TC-28.06: View Contractor Profile
- [ ] TC-39.01: Notification Bell
- [ ] TC-40.01: Admin Access Control
- [ ] TC-40.02: Admin Dashboard
- [ ] TC-41.01: View Settings
- [ ] TC-41.04: Add LLM API Key
- [ ] TC-CC.08: Other User's Project (security)
- [ ] TC-S.01: XSS Prevention
- [ ] TC-S.02: SQL Injection Prevention
- [ ] TC-S.03: API Authorization
- [ ] TC-S.04: File Upload Security
- [ ] TC-S.05: API Key Security

### Important (P1) - Complete second
- [ ] TC-1.05: Session Persistence
- [ ] TC-1.06: Multiple Tabs
- [ ] TC-2.01: View Empty Dashboard
- [ ] TC-2.03: Imperial Units Project
- [ ] TC-2.05: Delete Project
- [ ] TC-2.06: Multiple Projects
- [ ] TC-3.01: Empty Room List
- [ ] TC-3.03: All 15 Room Types
- [ ] TC-3.04: Room Validation
- [ ] TC-3.06: Delete Room
- [ ] TC-4.02: Upload PNG
- [ ] TC-4.03: Upload WebP
- [ ] TC-4.04: Upload GIF
- [ ] TC-4.05: Upload PDF
- [ ] TC-4.09: Upload via Click
- [ ] TC-4.10: Multiple File Upload
- [ ] TC-5.03: Floor Plan Viewer Interactions
- [ ] TC-5.05: Digitize with PDF
- [ ] TC-8.02: Generate Without API Key
- [ ] TC-8.03: Multiple Variants
- [ ] TC-9.04: Rotate Furniture
- [ ] TC-9.05: Scale Furniture
- [ ] TC-9.06: Delete Furniture
- [ ] TC-9.07: Deselect Object
- [ ] TC-9.08: Change Material
- [ ] TC-9.09: Grid and Snap Controls
- [ ] TC-9.10: View Presets
- [ ] TC-9.12: Real-Time Collaboration
- [ ] TC-10.02: BOM Table Sorting
- [ ] TC-10.03: BOM Category Collapse/Expand
- [ ] TC-10.05: BOM Export Excel
- [ ] TC-10.06: BOM Export PDF
- [ ] TC-10.07: BOM Currency Display
- [ ] TC-11.02: Download DXF
- [ ] TC-11.03: Download PDF
- [ ] TC-11.04: All Drawing Types
- [ ] TC-12.01: Generate Cut List
- [ ] TC-12.02: Nesting Viewer
- [ ] TC-14.01: Run Compliance Check
- [ ] TC-15.02: View Milestones
- [ ] TC-15.03: Link Payment to Milestone
- [ ] TC-16.02: Approve Change Order
- [ ] TC-16.03: Reject Change Order
- [ ] TC-17.02: View Site Logs Timeline
- [ ] TC-18.01: Quality Checkpoints
- [ ] TC-18.02: Complete Inspection
- [ ] TC-18.03: Fail Inspection
- [ ] TC-18.05: Resolve Punch List
- [ ] TC-19.03: @Mention User
- [ ] TC-19.04: Mark Thread Resolved
- [ ] TC-19.05: Request Approval
- [ ] TC-19.06: Approve/Reject
- [ ] TC-20.02: Submit PO
- [ ] TC-20.03: Update PO Status
- [ ] TC-21.01: View Deliveries
- [ ] TC-21.02: Inspection Checklist
- [ ] TC-22.03: Payment Validation
- [ ] TC-22.04: View Invoices
- [ ] TC-23.01: Financial Report
- [ ] TC-24.01: Global Analytics
- [ ] TC-24.02: Project Analytics
- [ ] TC-25.01: Cost Prediction
- [ ] TC-25.02: Timeline Prediction
- [ ] TC-26.01: Budget Scenarios
- [ ] TC-27.01: Sustainability Report
- [ ] TC-28.03: Filter by City
- [ ] TC-28.04: Filter by Specialization
- [ ] TC-28.05: Clear All Filters
- [ ] TC-28.07: Hire Contractor
- [ ] TC-28.08: Pagination
- [ ] TC-29.01: Browse Products
- [ ] TC-29.02: Product Detail
- [ ] TC-30.01: Vendor Performance
- [ ] TC-31.01: List Offcut Material
- [ ] TC-31.02: Browse and Inquire
- [ ] TC-32.01: View Digital Twin
- [ ] TC-32.02: Add IoT Device
- [ ] TC-33.01: Maintenance Schedule
- [ ] TC-33.02: Log Maintenance
- [ ] TC-34.01: Add Warranty
- [ ] TC-34.02: File Warranty Claim
- [ ] TC-35.01: Handover Package
- [ ] TC-37.01: Create Portfolio
- [ ] TC-38.01: Register App
- [ ] TC-38.02: API Documentation
- [ ] TC-39.02: Mark Read
- [ ] TC-39.03: Mark All Read
- [ ] TC-39.04: Notification Center
- [ ] TC-39.05: Real-Time Notification
- [ ] TC-40.03: User Management
- [ ] TC-40.04: System Health
- [ ] TC-40.05: Job Queue Monitor
- [ ] TC-41.02: Change Currency
- [ ] TC-41.03: Change Unit System
- [ ] TC-41.05: Delete API Key
- [ ] TC-42.01: Multi-Currency Display
- [ ] TC-42.02: Metric vs Imperial
- [ ] TC-CC.01 to TC-CC.09: Cross-Cutting Tests
- [ ] TC-P.01 to TC-P.04: Performance Tests
- [ ] TC-M.01 to TC-M.05: Mobile Tests

### Nice-to-Have (P2) - Complete last
- [ ] TC-6.02: Insufficient Photos
- [ ] TC-7.02: Skip Quiz Steps
- [ ] TC-8.05: All 10 Styles
- [ ] TC-8.06: All 4 Budget Tiers
- [ ] TC-9.11: Keyboard Shortcuts
- [ ] TC-9.13: Ceiling Toggle
- [ ] TC-36.01: AR Mode
- [ ] TC-S.06: Rate Limiting
- [ ] TC-M.04: 3D Editor Mobile

---

## Tips for Effective Testing

1. **Always open DevTools** (F12) before testing — watch for console errors and network failures
2. **Test the happy path first**, then try to break it with edge cases
3. **Take screenshots** of everything you find — bugs without screenshots are hard to reproduce
4. **Test in incognito mode** for authentication tests to avoid cached sessions
5. **Check the Network tab** after each action to ensure API calls succeed (look for red entries)
6. **Try rapid clicking** on buttons — does it create duplicate entries?
7. **Try refreshing the page** during async operations (BOM generation, design generation) — does it recover gracefully?
8. **Test with slow network** (DevTools → Network → Slow 3G) to catch loading state issues
9. **Test the back button** after every major action
10. **Keep notes** on which features are not yet implemented vs. actually broken

---

## Glossary

| Term | Meaning |
|------|---------|
| BOM | Bill of Materials — list of everything needed to build the design |
| CNC | Computer Numerical Control — automated manufacturing |
| DXF | Drawing Exchange Format — CAD file format |
| IFC | Industry Foundation Classes — BIM file format |
| MEP | Mechanical, Electrical, Plumbing |
| NEC | National Electrical Code (US standard) |
| IPC | International Plumbing Code |
| ASHRAE | American Society of Heating, Refrigerating & Air-Conditioning Engineers |
| CRDT | Conflict-free Replicated Data Type — used for real-time collaboration |
| Y.js | JavaScript CRDT library for real-time editing |
| tRPC | TypeScript Remote Procedure Call — type-safe API framework |
| OAuth | Open Authorization — sign-in via Google/GitHub |
| JWT | JSON Web Token — session authentication token |
| VLM | Vision Language Model — AI model that understands images |
| LLM | Large Language Model — AI model for text generation |
| pgvector | PostgreSQL extension for vector similarity search |

---

*Total test cases: 150+*
*Estimated testing time: 3-5 full working days for complete coverage*
*Priority P0 tests: ~40 cases (complete in 1 day)*
*Priority P1 tests: ~90 cases (complete in 2-3 days)*
*Priority P2 tests: ~20 cases (complete in 0.5-1 day)*

---

> **Remember**: If something feels wrong, it probably is. Report it. It's better to report a non-bug than to miss a real one.
