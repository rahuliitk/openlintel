# OpenLintel — Complete Feature Inventory & Missing Feature Wishlist

*Perspective: Award-winning Architect, Home Builder & Interior Designer*

---

## PART 1: EXISTING FEATURES (What OpenLintel Already Does)

### Platform Overview

**OpenLintel** is an end-to-end home design automation platform that transforms room photos or floor plans into fully documented, manufacture-ready residential designs — complete with technical drawings, BOMs, MEP engineering, project scheduling, procurement, and post-completion management.

**Core Value Chain:**
`Photos/Floor Plans → AI Design Generation → Technical Drawings → BOM → Cut Lists → MEP Engineering → Procurement → Project Execution → Handover → Digital Twin & Maintenance`

---

### 1. Authentication & User Management
- OAuth integration (Google, GitHub) via NextAuth v5
- Email/password authentication
- First-time user auto-provisioning with default preferences
- Session management via JWT httpOnly cookies
- Role-Based Access Control (RBAC): user, admin
- User preferences: currency, unit system (metric/imperial), locale

### 2. Project & Room Management
- Create, list, view, delete projects
- Project metadata: name, address, status (draft/active/completed), unit system
- Add rooms with name, type, dimensions (length/width/height in mm), floor number
- 15+ room types: bedroom, kitchen, bathroom, living room, dining, home office, hallway, staircase, balcony, pantry, study, walk-in closet, laundry, utility, storage
- Room metadata storage for custom properties

### 3. File Upload & Asset Management
- Image uploads (photos, floor plans, reference images): max 10MB
- PDF uploads (floor plan PDFs, architect drawings)
- Automatic thumbnail generation
- Perceptual hashing for duplicate detection
- Storage in MinIO/S3 with configurable CDN
- Category tagging: photos, floor_plans, documents

### 4. Admin Panel
- System health overview and database stats
- User management (create, view, disable, change roles)
- Async job queue monitoring (status, progress, error tracking)
- System-wide analytics and performance metrics
- All-project visibility across users

### 5. AI Design Generation
- Accept room photos + style preferences + budget constraints
- Multi-provider VLM support (OpenAI, Anthropic, Google) via LiteLLM
- Generate multiple design variants per room with different styles and budgets
- 10 predefined styles: modern, traditional, minimalist, industrial, eclectic, scandinavian, bohemian, rustic, contemporary, transitional
- 4 budget tiers: budget, mid-range, premium, luxury
- Preserve specified elements ("keep the floors," "keep the window treatments")
- LangGraph agent for multi-step design generation workflows
- Constraint compliance checking and iterative quality evaluation
- Outputs: redesigned room renders, design specs (JSON), concept mood boards

### 6. Floor Plan Digitization
- Upload floor plan image (PDF, scan, photo) or DWG file
- DWG files converted to DXF via LibreDWG
- AI-powered room extraction via Multimodal VLM
- Room boundary detection, door/window recognition with opening direction
- Dimension text extraction and parsing (OCR)
- Wall thickness detection, room polygon generation
- Outputs: structured JSON room data, DXF file for CAD, interactive SVG viewer

### 7. Photo-to-3D Reconstruction
- Upload multiple room photos for 3D reconstruction
- VLM depth estimation from photos
- Reference object calibration (standard door height 2.1m, A4 paper, credit card)
- Monocular depth map generation (Depth Anything V2)
- Photogrammetry integration (COLMAP) for multi-view precision
- 3D mesh generation (glTF format)
- Confidence score reporting on estimated dimensions
- As-built BIM model generation with walls, floors, ceilings, openings

### 8. 3D Interactive Editor
- Real-time 3D visualization (React Three Fiber + WebGL)
- Furniture catalogue integration with move, rotate, scale
- Snap-to-grid alignment and undo/redo
- Material selection and PBR material preview
- Lighting controls
- Real-time collaboration via Y.js CRDT
- Collaborative presence awareness (see other users' cursors)
- Comment placement on 3D elements
- Saved viewing angles and camera positions

### 9. Style Quiz & Mood Board
- 5-step interactive wizard for style preference capture
- Design style questions (color, material, aesthetic, budget tier, room function)
- AI style detection from uploaded photos
- Mood board curation and item tagging
- Budget tier auto-detection from responses
- Color palette generation

### 10. AR/VR Viewer
- AR furniture placement in real-world environment (WebXR)
- VR room walkthroughs with immersive experience
- Teleportation-based VR navigation
- Device capability detection (AR/VR support)
- QR code generation for mobile sharing

### 11. Bill of Materials (BOM)
- Calculate material quantities from design specifications
- Category-specific waste factors (drywall, tile, stone, paint, flooring, wood, etc.)
- Room-by-room breakdown and category-wise summaries
- Material substitution suggestions based on budget/availability
- Material scheduling by construction phase
- Cost calculation with multi-vendor pricing
- OR-Tools optimization for budget allocation
- Waste tracking and reporting
- Material availability and lead-time flagging
- Export: BOM JSON, CSV for procurement, cost rollups

### 12. Technical Drawing Generation
- **Drawing Types:** floor plans, elevations, sections, reflected ceiling plans (RCP), flooring plans, electrical drawings, joinery/millwork details
- **Output Formats:** DXF (AutoCAD), PDF (scaled, title-blocked), SVG (web), IFC/BIM (Revit/ArchiCAD)
- DWG input support (converted to DXF via LibreDWG)
- LLM agent for coordinate calculation
- ezdxf for DXF reading/writing, IfcOpenShell for BIM export

### 13. CNC Cut List & Nesting Optimization
- Break down furniture designs into individual panels
- Panel specs: dimensions, material, grain direction, edge banding, boring positions
- CNC-ready formatting with tool-specific parameters
- Rectangular panel layout optimization (rectpack) for standard 8x4 sheets
- Irregular shape nesting (DeepNest) for tiles and stone
- Offcut tracking and reuse suggestions
- Hardware schedule generation per furniture unit
- DXF export for CNC router machines
- Waste percentage reporting

### 14. MEP Engineering Calculations
- **Electrical:** load calculation, NEC wire gauge sizing, voltage drop, panel schedules, conduit routing, circuit requirements, service size
- **Plumbing:** fixture unit calculations (IPC), pipe sizing, drainage slope, trap/venting, hot water sizing, water pressure validation
- **HVAC:** cooling/heating load (ASHRAE Manual J), equipment tonnage/BTU, duct sizing, ACH validation
- **Fire Safety:** smoke detector placement (NFPA 72), fire extinguisher locations, exit path validation, emergency egress
- All calculations cite source standard (NEC/IPC/ASHRAE clause number)
- Pydantic-validated JSON schemas for all outputs

### 15. Building Code Compliance
- Multi-jurisdiction code checking: India NBC 2016, US IRC 2021, EU Eurocode, UK Building Regulations
- Checks: room dimensions, natural ventilation, fire egress, electrical outlet spacing, plumbing accessibility, ADA compliance, ceiling heights, glazing area, staircase slope/tread/rise, load-bearing walls, waterproofing
- Compliance report with pass/fail, remediation suggestions

### 16. IFC/BIM Export
- IFC4-compliant export for Revit/ArchiCAD
- Object mapping: walls, doors, windows, furniture → IFC entities
- Material and property metadata export
- Structural element identification
- MEP system export (circuits, plumbing fixtures, HVAC components)

### 17. Project Timeline & Scheduling
- Auto-generated construction schedules (Gantt chart)
- Trade dependency mapping (electrical before drywall, etc.)
- Critical path identification and highlighting
- Milestone creation and tracking
- Task duration estimation and resource allocation
- OR-Tools schedule optimization
- Delay cascade analysis
- Phases: demolition → rough-in → finishing → handover

### 18. Site Logs
- Daily progress documentation with date, title, detailed notes
- Weather conditions recording
- Worker count tracking
- Multiple photo attachments per log entry
- Custom tagging (demolition, rough-in, finishing, inspection)
- Chronological photo gallery timeline

### 19. Change Orders
- Propose design/specification changes
- AI-powered cost impact analysis
- Timeline impact analysis (delay in days)
- Approval workflow: proposed → approved → implemented
- Change order history and audit trail
- Before/after specification comparison

### 20. Quality Assurance & Punch List
- Stage-gate verification at construction milestones
- Predefined checkpoints: demolition_complete, rough_in_complete, waterproofing_complete, etc.
- Trade-specific inspections (electrical, plumbing, carpentry, painting, tiling)
- Checklist items per checkpoint (pass/fail) with photos and notes
- Punch list with severity levels (critical, major, minor, observation)
- Category tags (structural, finish, electrical, plumbing, carpentry, painting)
- Status workflow: open → in_progress → resolved → verified → reopened
- Contractor assignment and responsibility tracking

### 21. Handover Package
- As-built drawings compilation
- Material register (brands, models, batch numbers, purchase dates)
- Contractor directory (names, trades, phone, email)
- Operational guides (system-specific instructions)
- Generated maintenance manual (PDF with schedules)
- Client sign-off documentation
- Warranty tracking attachment
- Status: draft → in progress → ready → delivered

### 22. Collaboration & Communication
- CRDT-based real-time collaboration (Y.js + WebSocket)
- Threaded discussions per project/room/element with @mentions
- Comment threading with replies
- Decision logging and status tracking
- File/image attachments in threads
- Approval flows: request approval on designs, BOMs, schedules
- Real-time push notifications (comment, approval, job_complete, payment, delivery)
- Notification bell with unread indicator

### 23. Payments & Invoices
- Stripe and Razorpay (India) integration
- Milestone-linked payments (pay on construction phase completion)
- Payment status: pending → processing → completed → failed → refunded
- Invoice generation per purchase order
- Invoice numbering, PDF generation, due date tracking
- Payment reconciliation

### 24. Procurement & Purchase Orders
- Create POs from BOM items
- Vendor selection and assignment
- Item-level ordering with quantities and unit prices
- Status: draft → submitted → confirmed → shipped → delivered → cancelled
- Multi-vendor order splitting optimization (OR-Tools)
- Phased ordering based on construction timeline
- Returns and defect management workflow

### 25. Delivery Tracking
- Delivery status: pending → shipped → delivered → inspected
- Tracking number storage
- Inspection checklists per delivery
- Photo documentation of received items
- Damage/defect reporting on receipt

### 26. Financial Reports
- Budget vs. actual spending comparison
- Expenditure timeline (historical and projected)
- Category-wise spend breakdown (materials, labor, services)
- Cost per sqft benchmarking
- Cost overrun analysis and variance explanation
- Cash flow forecasting
- Vendor payment status dashboard
- CSV export

### 27. Contractor Marketplace
- Browse and filter contractors by specialization and location
- Contractor profiles: bio, portfolio, experience, certifications, verified status
- Star ratings (1-5) and written reviews
- Hiring workflow with project assignment and agreement tracking
- Contractor referral system with status tracking

### 28. Product Catalogue
- Hierarchical category structure (e.g., Materials > Wood > Plywood)
- Multi-vendor pricing with validity dates
- Full-text search via Meilisearch
- Visual similarity search via pgvector (CLIP/DINOv2 embeddings)
- Filter by category, price range, material, color, brand
- Product specifications, dimensions, SKU tracking

### 29. Vendor Performance Management
- Delivery rating, quality rating, pricing rating, overall composite
- Contact details, GST number, payment terms
- Order history, on-time delivery percentage, quality issue tracking

### 30. Offcuts Exchange Marketplace
- Create listings for leftover materials with type, dimensions, condition, price
- Location-based browsing
- Inquiry system with messaging between buyer/seller
- Project gallery showcase for completed work
- Community browsing with like/favorite functionality

### 31. Developer API Portal
- OAuth app registration with client ID/secret
- Scope-based permissions and rate limiting (standard, premium, enterprise)
- Webhook subscriptions for events (project.created, bom.generated, payment.completed, etc.)
- API request logging with response time tracking

### 32. Analytics Dashboard
- Budget vs. actual spending visualization
- Cost breakdown by category
- Timeline progress vs. planned schedule
- Cost per square foot benchmarking
- Expenditure timeline with projections
- Variance analysis

### 33. AI Cost & Timeline Predictions
- LLM-powered cost range estimation with confidence intervals
- Risk factor identification and impact assessment
- Timeline predictions with phase breakdown and dependencies
- Mitigation strategies per risk

### 34. Budget Optimizer
- AI-powered material substitution suggestions
- Cost-equivalent alternatives with same quality
- Premium-to-budget alternatives with trade-offs
- Multi-scenario generation (budget, mid-range, premium)
- Constraint preservation (don't change structural materials)

### 35. Sustainability Scoring
- Total carbon footprint (material, transport, assembly, operational, end-of-life)
- 0-100 sustainability score
- LEED points estimate
- Green alternative suggestions with carbon savings and cost delta
- Lifecycle assessment data

### 36. Portfolio Management
- Group multiple projects into named portfolios
- Sort projects within portfolio
- Visibility controls (public/private)

### 37. Digital Twin & IoT
- Post-completion 3D model of finished home (glTF/FBX)
- IoT sensor management: temperature, humidity, motion, energy, water flow
- Sensor placement in 3D model with position tracking
- Real-time time-series data collection
- Emergency reference system: shutoff locations, breaker panels, fire extinguishers

### 38. Maintenance Scheduling
- Maintenance items with category (HVAC, plumbing, electrical, structural, appliance, exterior)
- Frequency-based scheduling with next due date calculation
- Overdue flagging
- Maintenance logs with performed date, technician, cost, notes, photos

### 39. Warranty Tracking
- Warranty records: item, brand, type (manufacturer/extended/contractor), dates, serial number
- Warranty claims: file claims with issue description, photos
- Claim status: filed → in_review → approved → denied → resolved

### 40. Localization
- Multi-currency support with exchange rate caching
- Unit system support (metric/imperial)
- Locale support (date/time formatting, number formatting, currency symbols)

### 41. ML Modules
- **Room Segmentation:** wall/floor/ceiling segmentation, door/window detection, furniture identification, damage detection (SAM 2, Depth Anything V2)
- **Floor Plan Digitizer:** boundary detection, door/window recognition, dimension OCR, DWG/PDF support
- **Design Generation:** LangGraph multi-step workflow, 10+ styles, budget-tier pricing
- **AI Measurement:** monocular depth estimation, reference calibration, multi-view stereo
- **Visual Product Matching:** CLIP/DINOv2 embeddings, pgvector similarity, VLM re-ranking

### 42. Microservices Architecture
- 10 Python services: design-engine, drawing-generator, bom-engine, cutlist-engine, mep-calculator, media-service, vision-engine, catalogue-service, procurement-service, project-service
- 1 TypeScript service: collaboration (Y.js + WebSocket)
- tRPC-based API with 25+ routers

---

## PART 2: MISSING FEATURES — What an Architect, Home Builder & Interior Designer Still Needs

The following features are not currently present in OpenLintel but would be extremely valuable for professionals in architecture, home building, and interior design.

---

### A. DESIGN & VISUALIZATION

#### A1. Parametric Design Engine
- Parametric walls, roofs, and structural elements that auto-update when dimensions change
- Rule-based design generation (e.g., "all bedrooms must be at least 120 sqft")
- Constraint propagation — changing one room auto-adjusts adjacent rooms
- Design templates for common home types (ranch, colonial, split-level, townhouse, villa)

#### A2. 2D Floor Plan Editor (Interactive)
- Drag-and-drop wall drawing tool (not just AI extraction)
- Manual room drawing, splitting, merging
- Door/window placement tool with standard library (slider, casement, bi-fold, pocket, French, etc.)
- Staircase designer with auto-calculated riser/tread
- Snap-to-wall, snap-to-grid, dimension constraints
- Real-time area and perimeter calculations as you draw
- Layer management (structural, furniture, electrical, plumbing)

#### A3. Exterior Design & Facade Generator
- Front/rear/side elevation design tool
- Roof design (hip, gable, mansard, flat, butterfly, shed) with material selection
- Facade material application (brick, stone, stucco, siding, cladding)
- Landscaping rough layout (driveway, walkways, garden beds, trees, fencing)
- Outdoor living spaces (deck, patio, pergola, pool)
- Exterior lighting design

#### A4. Kitchen & Bath Specific Design Module
- Cabinet layout optimizer with standard sizes (base, wall, tall, pantry)
- Countertop material selection with edge profile options
- Appliance placement with clearance validation
- Work triangle analysis (sink-stove-fridge efficiency)
- Backsplash design and tile pattern generator
- Bathroom fixture layout with ADA/accessibility checks
- Shower/tub enclosure configurator
- Vanity and mirror placement tool

#### A5. Lighting Design Simulator
- Lux level calculations per room
- Natural daylight simulation based on window orientation and size
- Artificial lighting layout (recessed, pendant, track, sconce, under-cabinet)
- Light temperature (warm/cool) visualization
- Circadian lighting planning
- Switching zone design (which switch controls which lights)
- Integration with electrical drawings

#### A6. Material & Finish Board Generator
- Auto-generate material boards from selected design
- Side-by-side comparison of finish options (floor vs. wall vs. countertop)
- Physical sample request integration
- Client-facing presentation mode with branded templates
- Material spec sheets with technical data (slip resistance, fire rating, VOC levels)

#### A7. Photorealistic Rendering Engine
- Ray-traced rendering for final client presentations
- Time-of-day lighting simulation (morning, afternoon, sunset, night)
- Seasonal lighting variations
- 360-degree panoramic renders
- Video walkthroughs (animated camera paths)
- Before-and-after comparison sliders

---

### B. STRUCTURAL & ENGINEERING

#### B1. Structural Analysis Module
- Load path analysis (gravity loads from roof to foundation)
- Beam/header sizing calculator for openings
- Foundation type recommendation (slab, crawl space, basement)
- Seismic zone compliance checks
- Wind load calculations
- Snow load calculations for roof design
- Retaining wall design for sloped sites

#### B2. Site Analysis & Grading
- Topographic survey data import
- Site grading and drainage planning
- Setback and easement visualization
- Solar orientation analysis (sun path diagrams)
- Wind direction analysis for natural ventilation
- Noise mapping from adjacent roads
- Soil type and bearing capacity input
- Flood zone mapping

#### B3. Energy Modeling & Passive Design
- Whole-building energy simulation (heating, cooling, lighting loads)
- Insulation R-value optimization
- Window-to-wall ratio optimization per orientation
- Thermal bridging identification
- Passive solar design recommendations
- Natural ventilation CFD (simplified)
- HERS (Home Energy Rating System) score estimation
- Net-zero energy pathway analysis
- Solar panel placement optimization with production estimates

#### B4. Acoustic Design
- Sound transmission class (STC) calculations between rooms
- Impact insulation class (IIC) for floors
- Room acoustics (reverberation time estimation)
- Acoustic material recommendations (home theater, music rooms)
- Noise reduction strategies for bedrooms near living areas

---

### C. PROJECT MANAGEMENT & FIELD

#### C1. RFI (Request for Information) Management
- Contractor-to-architect question tracking
- Photo/drawing markup attachments
- Response deadlines and escalation
- RFI log with searchable history
- Link RFIs to specific drawing sheets or spec sections

#### C2. Submittal Management
- Contractor material/product submittals for architect approval
- Submittal log with status tracking (pending, approved, rejected, revise-and-resubmit)
- Side-by-side comparison with specified products
- Stamp/watermark approval on PDFs

#### C3. Daily/Weekly Progress Reporting
- Automated progress reports aggregating site logs, photos, milestones
- Percentage completion tracking per trade/phase
- Weather delay tracking and impact on schedule
- Labor hours tracking per trade
- Photo comparison (same angle, different dates) for progress visualization
- Client-facing weekly email reports

#### C4. Safety & OSHA Compliance
- Safety checklist templates per construction phase
- Incident reporting with photos and witness statements
- Near-miss tracking
- Safety training record management
- PPE compliance tracking
- OSHA violation risk flagging

#### C5. Permit & Inspection Tracking
- Building permit application status tracking
- Required inspections checklist by jurisdiction
- Inspection scheduling and result recording
- Inspector contact management
- Permit document storage
- Occupancy certificate tracking
- Zoning compliance verification

#### C6. Document Version Control
- Drawing revision tracking (Rev A, Rev B, Rev C)
- Spec section version management
- Clouded/marked-up revision comparison
- Distribution tracking (who received which revision)
- Superseded document flagging
- ASI (Architect's Supplemental Instructions) management

---

### D. CLIENT EXPERIENCE

#### D1. Client Portal
- Dedicated client login with simplified view
- Design approval interface (approve/request changes with comments)
- Progress photo gallery updated in real-time
- Payment milestone dashboard
- Selection schedule (client picks finishes, fixtures, colors)
- Decision deadline reminders
- Document access (drawings, specs, contracts)

#### D2. Selection & Allowance Management
- Finish selection scheduler (flooring by date X, paint by date Y)
- Allowance budget tracking (e.g., $5,000 for lighting fixtures)
- Over/under allowance tracking with change order generation
- Supplier showroom appointment scheduling
- Selection sign-off workflow

#### D3. Client Mood Board & Inspiration Collection
- Pinterest-style inspiration board for clients
- AI-powered "find similar" from inspiration photos
- Collaborative pinning between designer and client
- Style preference evolution tracking

#### D4. Walk-Through Annotation Tool
- Client marks up VR/3D walkthrough with voice or text notes
- "I don't like this" pinned to specific elements
- Designer receives annotated feedback with context
- Feedback resolution tracking

---

### E. BUSINESS OPERATIONS

#### E1. Proposal & Contract Generator
- Auto-generate scope of work from project details
- Fee calculation (fixed, cost-plus, percentage of construction)
- Terms and conditions templates
- E-signature integration (DocuSign, HelloSign)
- Retainer and payment schedule auto-generation
- Change order integration with contract amendments

#### E2. CRM & Lead Management
- Client inquiry tracking
- Lead source attribution (website, referral, social media)
- Follow-up reminders and pipeline stages
- Past client relationship management
- Referral tracking and thank-you automation
- Client satisfaction surveys

#### E3. Time Tracking & Billing
- Hourly time tracking per project/phase
- Billable vs. non-billable categorization
- Timesheet approval workflow
- Invoice generation from tracked time
- Staff utilization reports
- Project profitability analysis

#### E4. Insurance & Liability Management
- Professional liability (E&O) insurance tracking
- General liability insurance certificate management
- Subcontractor insurance verification (COI tracking)
- Workers' compensation certificate management
- Expiration alerts and renewal reminders

#### E5. Multi-Office / Team Management
- Team member roles: principal, project architect, designer, project manager, field superintendent
- Project assignment and workload balancing
- Resource calendar (who's available when)
- Internal design review workflows
- Mentor/mentee pairing for junior designers
- Firm-wide project pipeline dashboard

---

### F. ADVANCED TECHNOLOGY

#### F1. AI Space Planning
- Auto-generate optimal room layouts given constraints
- Furniture arrangement optimization (traffic flow, focal points, conversation groupings)
- Feng Shui or Vastu Shastra compliance suggestions
- Accessibility-first layout generation (wheelchair turning radius, grab bar placement)
- Multi-option layout comparison with pros/cons

#### F2. Generative Facade Design
- AI-generated exterior options based on style, climate, budget
- Contextual design (match neighborhood aesthetic)
- Climate-responsive facade optimization (shading, thermal mass)

#### F3. AI Code Compliance Pre-Check
- Upload any drawing → AI flags potential code violations before submission
- Natural language code lookup ("what's the minimum hallway width in IRC?")
- Jurisdiction-specific code database with search

#### F4. Voice-Controlled Design
- Voice commands during 3D editing ("move the sofa 2 feet left")
- Voice-to-note during site visits (auto-transcribed site log entries)
- Hands-free punch list creation during walkthroughs

#### F5. Drone Integration
- Import drone survey photos for site analysis
- Drone-based progress monitoring (aerial comparison over time)
- Roof inspection photo integration
- Photogrammetric site model from drone imagery

#### F6. LiDAR Scan Import
- Import LiDAR point clouds from iPhone/iPad Pro or dedicated scanners
- Auto-generate as-built floor plans from point cloud
- Clash detection between existing conditions and proposed design
- Renovation-specific measurements from scans

#### F7. Smart Home Pre-Wiring Planner
- Plan smart home infrastructure during design phase
- Network rack location and structured wiring layout
- Smart switch, thermostat, doorbell, camera placement
- Voice assistant zone planning
- Home automation scene design
- Low-voltage wiring schedule (CAT6, coax, speaker wire, HDMI)

---

### G. SPECIALIZED DESIGN AREAS

#### G1. Closet & Storage Design Module
- Walk-in closet layout optimizer
- Shelving, hanging rod, drawer configuration
- Shoe storage, island, jewelry drawer planning
- Linen closet and pantry shelving layouts
- Garage storage and workshop planning

#### G2. Home Theater / Media Room Designer
- Screen size calculator based on viewing distance
- Speaker placement (5.1, 7.1, Atmos) optimization
- Acoustic treatment recommendations
- Lighting control zone design
- Equipment rack planning

#### G3. Outdoor Living Designer
- Deck/patio layout and material selection
- Outdoor kitchen design (grill, sink, refrigerator, countertop)
- Pool and spa design with equipment pad planning
- Landscape lighting layout
- Irrigation zone planning
- Fence and gate design
- Fire pit and seating area planning

#### G4. Aging-in-Place / Universal Design Module
- ADA-compliant bathroom layouts
- Zero-threshold shower design
- Grab bar placement per code
- Wider doorway recommendations (36" min)
- Lever handle specifications
- First-floor master suite planning
- Future elevator shaft provision

#### G5. Multi-Unit / ADU Planning
- Accessory Dwelling Unit (ADU) design templates
- Duplex/triplex layout optimization
- Shared vs. separate utility planning
- Parking requirement calculations
- Zoning compliance for multi-unit
- Rental unit feature set (separate entry, metering)

---

### H. REPORTING & DOCUMENTATION

#### H1. Professional Drawing Set Templates
- AIA-standard title blocks with firm branding
- Sheet numbering system (A-series architectural, S-structural, M-mechanical, E-electrical, P-plumbing)
- Drawing index auto-generation
- Symbol legend and abbreviation key auto-generation
- North arrow, scale bar, and revision block

#### H2. Specification Writer
- CSI MasterFormat specification generation
- Division-based spec organization (Div 03 Concrete, Div 06 Wood, etc.)
- Product substitution language
- Performance vs. prescriptive spec options
- Spec linked to BOM items

#### H3. Photo Documentation Report Generator
- Before/during/after photo reports with captions
- Auto-organized by date and construction phase
- Branded PDF output for client records
- Photo markup and annotation
- Comparison views (same angle over time)

#### H4. As-Built Documentation
- Red-line markup tool on original drawings
- Field change recording
- As-built drawing generation from markup
- Deviation report (planned vs. actual dimensions)
- As-built BIM model update

---

### I. INTEGRATIONS (Currently Missing)

#### I1. CAD/BIM Software Integration
- Direct Revit plugin for two-way sync
- SketchUp import/export
- AutoCAD plugin for live drawing updates
- Rhino/Grasshopper parametric design import
- ArchiCAD bidirectional IFC exchange
- Blender import for custom 3D models

#### I2. Accounting & ERP Integration
- QuickBooks / Xero sync for invoices and payments
- SAP/Oracle integration for enterprise builders
- Procore integration for construction management
- CoConstruct / Buildertrend data exchange

#### I3. Communication Integrations
- Slack / Microsoft Teams notifications
- Email integration for client communications
- SMS alerts for critical milestones
- WhatsApp Business API for contractor communication (especially India market)

#### I4. Real Estate & MLS Integration
- Zillow / Realtor.com listing data for comparable pricing
- Appraisal report generation with project improvements
- ROI calculator (renovation cost vs. property value increase)

#### I5. Government & Permit Systems
- Electronic permit application submission
- Inspection scheduling API integration
- Code database API for real-time compliance checking
- GIS/zoning data import

---

### J. MARKETPLACE ENHANCEMENTS

#### J1. Design Template Marketplace
- Buy/sell reusable design templates
- Room templates (master bath layouts, kitchen configurations)
- Whole-house plan templates
- Style packs (furniture + material + color combinations)
- Designer revenue sharing model

#### J2. Professional Services Marketplace
- Structural engineer matchmaking
- Landscape architect directory
- Interior stylist / stager booking
- Real estate photographer booking
- Home inspector scheduling

#### J3. Material Sample Box Service
- Order physical material samples from catalogue
- Curated sample boxes based on design selections
- Sample tracking and return logistics
- Client sample review and selection workflow

---

### K. ACCESSIBILITY & COMPLIANCE DEPTH

#### K1. ADA / Universal Design Compliance Engine
- Full ADA 2010 Standards for Accessible Design checker
- Fair Housing Act compliance for multi-family
- Visitability standards checking
- ANSI A117.1 compliance verification
- Accessibility route planning through the home

#### K2. Energy Code Compliance
- IECC (International Energy Conservation Code) compliance checking
- Title 24 (California energy code) compliance
- ENERGY STAR certification pathway
- Envelope trade-off calculations (COMcheck equivalent)

#### K3. Historic Preservation Compliance
- Secretary of the Interior's Standards for Rehabilitation
- Historic district design guidelines checking
- Material compatibility recommendations for historic structures
- Tax credit eligibility assessment for historic renovations

---

### L. DATA & INTELLIGENCE

#### L1. Market-Rate Benchmarking
- Real-time material pricing from supplier APIs
- Regional labor rate database
- Cost per sqft benchmarks by home type, region, and quality tier
- Price trend analysis and forecasting
- "What similar projects cost" comparative analysis

#### L2. Post-Occupancy Evaluation
- Client satisfaction surveys at 6-month and 1-year post-completion
- Energy performance vs. design predictions
- Comfort and livability feedback collection
- Lessons-learned database for firm knowledge management
- Design decision outcome tracking

#### L3. AI Design Learning
- Learn from past project outcomes to improve future recommendations
- Track which design decisions clients loved vs. changed
- Regional preference modeling (what works in Arizona vs. New England)
- Budget accuracy improvement over time from historical data

---

## SUMMARY

| Category | Existing Features | Missing Features |
|---|---|---|
| Design & Visualization | AI design gen, 3D editor, AR/VR, mood boards | Parametric design, 2D editor, exterior/facade, kitchen/bath module, lighting sim, rendering |
| Engineering | MEP calcs, building code, BIM export | Structural analysis, energy modeling, acoustics, site grading |
| Construction Docs | Technical drawings, BOM, cut lists | Spec writer, AIA drawing sets, as-built tools, document version control |
| Project Management | Timeline, site logs, change orders, QA | RFI, submittals, progress reporting, safety/OSHA, permits |
| Client Experience | Collaboration, approvals, notifications | Client portal, selection management, walk-through annotations |
| Business Ops | Payments, invoices, procurement | Proposals/contracts, CRM, time tracking, insurance, team management |
| Marketplace | Contractors, products, offcuts | Design templates, professional services, sample boxes |
| Technology | AI predictions, sustainability, digital twin | Voice control, drone, LiDAR, smart home planning, generative facade |
| Integrations | API portal, webhooks | Revit/SketchUp/Procore, QuickBooks, Slack, permit systems |
| Compliance | Multi-jurisdiction codes, ADA basics | Energy code, historic preservation, full ADA engine |

---

*This document was compiled from a thorough codebase audit of the OpenLintel platform. Missing features are prioritized from the perspective of practicing architects, licensed home builders, and professional interior designers who need production-grade tools for residential design and construction.*
