# OpenLintel - User Flow Diagrams

> Comprehensive user journey maps for the end-to-end home design automation platform.

---

## Table of Contents

1. [High-Level Platform Flow](#1-high-level-platform-flow)
2. [Authentication & Onboarding](#2-authentication--onboarding)
3. [Project Creation & Setup](#3-project-creation--setup)
4. [Room Management](#4-room-management)
5. [Design Generation Pipeline](#5-design-generation-pipeline)
6. [Floor Plan Digitization](#6-floor-plan-digitization)
7. [3D Editor & Collaboration](#7-3d-editor--collaboration)
8. [BOM, Drawings & Manufacturing](#8-bom-drawings--manufacturing)
9. [MEP Engineering](#9-mep-engineering)
10. [Project Timeline & Scheduling](#10-project-timeline--scheduling)
11. [Procurement & Delivery](#11-procurement--delivery)
12. [Payments & Invoicing](#12-payments--invoicing)
13. [Contractor Marketplace](#13-contractor-marketplace)
14. [Quality Assurance & Handover](#14-quality-assurance--handover)
15. [Intelligence & Analytics](#15-intelligence--analytics)
16. [Post-Occupancy (Digital Twin, Maintenance, Warranty)](#16-post-occupancy)
17. [Marketplace & Community](#17-marketplace--community)
18. [Admin Panel](#18-admin-panel)
19. [Developer API Portal](#19-developer-api-portal)

---

## 1. High-Level Platform Flow

```mermaid
flowchart TD
    A[User Arrives] --> B{Authenticated?}
    B -->|No| C[Sign In / Sign Up]
    C --> D[Dashboard]
    B -->|Yes| D

    D --> E[Create New Project]
    D --> F[Open Existing Project]
    D --> G[Marketplace]
    D --> H[Portfolios]
    D --> I[Settings]
    D --> J[Notifications]

    E --> K[Project Setup]
    F --> K

    K --> L[Add Rooms]
    L --> M[Upload Photos / Floor Plans]
    M --> N[Style Quiz]
    N --> O[AI Design Generation]
    O --> P[Review & Approve Designs]

    P --> Q[BOM Generation]
    P --> R[Technical Drawings]
    P --> S[CNC Cut Lists]
    P --> T[MEP Calculations]

    Q --> U[Procurement]
    R --> U
    S --> U
    T --> U

    U --> V[Contractor Hiring]
    V --> W[Project Timeline]
    W --> X[Construction Execution]

    X --> Y[Site Logs]
    X --> Z[Quality Checkpoints]
    X --> AA[Change Orders]
    X --> AB[Deliveries]

    Z --> AC[Punch List]
    AC --> AD[Handover Package]
    AD --> AE[Post-Occupancy]

    AE --> AF[Digital Twin]
    AE --> AG[Maintenance Scheduling]
    AE --> AH[Warranty Tracking]
```

---

## 2. Authentication & Onboarding

```mermaid
flowchart TD
    A[Landing Page /] --> B[Click Sign In]
    B --> C[/auth/signin]

    C --> D{Choose Auth Method}
    D -->|Google OAuth| E[Google Consent Screen]
    D -->|GitHub OAuth| F[GitHub Authorization]
    D -->|Email + Password| G[Enter Credentials]

    E --> H{Account Exists?}
    F --> H
    G --> H

    H -->|No| I[Create User Record]
    I --> J[Set Default Preferences]
    J --> K[Redirect to Dashboard]

    H -->|Yes| K

    K --> L[/dashboard]
    L --> M{First Visit?}
    M -->|Yes| N[Show Onboarding Tour]
    N --> O[Configure Preferences]
    O --> P[Set Currency / Units / Locale]
    P --> Q[Add LLM API Keys - Optional]
    Q --> R[Dashboard Ready]

    M -->|No| R
```

### User Preferences Setup

```mermaid
flowchart LR
    A[/dashboard/settings] --> B[Profile Section]
    B --> C[Name / Email / Avatar]

    A --> D[Preferences Section]
    D --> E[Currency: USD, INR, EUR, GBP...]
    D --> F[Unit System: Metric / Imperial]
    D --> G[Locale: en, hi, es...]

    A --> H[API Keys Section]
    H --> I[Add OpenAI Key]
    H --> J[Add Anthropic Key]
    H --> K[Add Google Key]

    I --> L[AES-256-GCM Encryption]
    J --> L
    K --> L
    L --> M[Store Encrypted Key + IV + AuthTag]
```

---

## 3. Project Creation & Setup

```mermaid
flowchart TD
    A[Dashboard /dashboard] --> B[Click + New Project]
    B --> C[Create Project Dialog]

    C --> D[Enter Project Name]
    D --> E[Enter Address - Optional]
    E --> F[Select Unit System]
    F --> G[Click Create]

    G --> H[POST project.create]
    H --> I[Project Created - Status: draft]
    I --> J[Redirect to /project/id]

    J --> K[Project Overview Page]
    K --> L{Next Step?}

    L --> M[Add Rooms]
    L --> N[Upload Floor Plan]
    L --> O[Take Style Quiz]
    L --> P[Upload Photos]

    subgraph "Project Statuses"
        S1[draft] --> S2[in_progress]
        S2 --> S3[construction]
        S3 --> S4[completed]
    end
```

---

## 4. Room Management

```mermaid
flowchart TD
    A[Project Page] --> B[Rooms Tab /project/id/rooms]
    B --> C[Click Add Room]

    C --> D[Room Creation Form]
    D --> E[Enter Room Name]
    E --> F[Select Room Type]
    F --> G[Enter Dimensions]
    G --> H[Select Floor Level]
    H --> I[Click Save]

    I --> J[Room Created]
    J --> K[Room Detail /project/id/rooms/roomId]

    K --> L{Actions}
    L --> M[Upload Room Photos]
    L --> N[Generate Designs]
    L --> O[View 3D Editor]
    L --> P[Edit Dimensions]
    L --> Q[Delete Room]

    subgraph "Room Types"
        R1[living_room]
        R2[bedroom]
        R3[kitchen]
        R4[bathroom]
        R5[dining_room]
        R6[study]
        R7[balcony]
        R8[pooja_room]
        R9[foyer]
        R10[laundry]
        R11[garage]
        R12[closet]
        R13[hallway]
        R14[kids_room]
        R15[other]
    end
```

---

## 5. Design Generation Pipeline

```mermaid
flowchart TD
    A[Room Detail Page] --> B[Click Generate Design]

    B --> C[Design Configuration]
    C --> D[Select Style]
    C --> E[Select Budget Tier]
    C --> F[Add Constraints - Optional]
    C --> G[Select Source Photo - Optional]

    D --> H{Style Options}
    H --> H1[modern]
    H --> H2[contemporary]
    H --> H3[traditional]
    H --> H4[scandinavian]
    H --> H5[industrial]
    H --> H6[minimalist]
    H --> H7[bohemian]
    H --> H8[japandi]
    H --> H9[art_deco]
    H --> H10[tropical]

    E --> I{Budget Tiers}
    I --> I1[economy]
    I --> I2[mid_range]
    I --> I3[premium]
    I --> I4[luxury]

    F --> J[Submit Request]
    J --> K[Create Job: design_generation]
    K --> L[Job Status: pending]

    L --> M[Worker Picks Up Job]
    M --> N[LangGraph Multi-Node Pipeline]
    N --> N1[Room Analysis Node]
    N1 --> N2[Style Application Node]
    N2 --> N3[Constraint Validation Node]
    N3 --> N4[Render Generation Node]
    N4 --> N5[Specification Output Node]

    N5 --> O[Job Status: completed]
    O --> P[Design Variant Created]
    P --> Q[View in Gallery /project/id/designs]

    Q --> R{User Actions}
    R --> S[Approve Design]
    R --> T[Request Revision]
    R --> U[Generate BOM]
    R --> V[Generate Drawings]
    R --> W[Compare Variants]
```

### Style Quiz Flow

```mermaid
flowchart TD
    A[/project/id/style-quiz] --> B[Step 1: Room Usage]
    B --> C[Step 2: Color Preferences]
    C --> D[Step 3: Material Preferences]
    D --> E[Step 4: Budget Range]
    E --> F[Step 5: Inspiration Images]

    F --> G[Submit Quiz]
    G --> H[AI Analyzes Responses]
    H --> I[Detected Styles with Scores]
    I --> J[Auto-Generated Mood Board]
    J --> K[Color Palette Suggestions]
    K --> L[Save Style Preferences]
    L --> M[Use in Design Generation]
```

---

## 6. Floor Plan Digitization

```mermaid
flowchart TD
    A[Project Page] --> B[Floor Plan Tab /project/id/floor-plan]

    B --> C[Upload Floor Plan Image/PDF]
    C --> D[File Upload to S3/MinIO]
    D --> E[Create Job: floor_plan_digitize]

    E --> F[Vision Engine Processes]
    F --> G[VLM Extracts Rooms]
    G --> H[Detect Dimensions]
    H --> I[Identify Doors & Windows]
    I --> J[Generate Structured JSON]
    J --> K[Generate DXF Output]

    K --> L[Job Complete]
    L --> M[Interactive SVG Viewer]

    M --> N{User Actions}
    N --> O[Verify Room Boundaries]
    N --> P[Adjust Dimensions]
    N --> Q[Auto-Create Rooms from Plan]
    N --> R[Download DXF]
    N --> S[Re-process with Corrections]
```

---

## 7. 3D Editor & Collaboration

```mermaid
flowchart TD
    A[Project Page] --> B[Editor Tab /project/id/editor]

    B --> C[Load React Three Fiber Canvas]
    C --> D[Load Room Geometry]
    D --> E[Load Furniture/Fixtures]

    E --> F{Editor Tools}
    F --> G[Select Object]
    F --> H[Move - Translate]
    F --> I[Rotate]
    F --> J[Scale]
    F --> K[Add Furniture from Catalog]
    F --> L[Delete Object]

    G --> M[Transform Controls]
    M --> N[Snap to Grid]
    M --> O[Undo / Redo Stack]

    subgraph "Real-time Collaboration"
        P[User A Edits] --> Q[Y.js CRDT Sync]
        Q --> R[WebSocket Broadcast]
        R --> S[User B Sees Changes]
        S --> T[Cursor Awareness]
    end

    B --> U[AR/VR Mode /project/id/ar]
    U --> V{Platform}
    V --> W[AR: Place Furniture in Real Space]
    V --> X[VR: Walkthrough with Teleportation]
    V --> Y[Generate QR Code to Share]
```

---

## 8. BOM, Drawings & Manufacturing

### BOM Flow

```mermaid
flowchart TD
    A[Design Variant Page] --> B[Click Generate BOM]
    B --> C[Create Job: bom_calculation]
    C --> D[BOM Engine - AI Agent]

    D --> E[Analyze Design Spec]
    E --> F[Categorize Materials]
    F --> G[Calculate Quantities]
    G --> H[Lookup Unit Prices]
    H --> I[Compute Totals]

    I --> J[BOM Results Created]
    J --> K[View BOM Table /project/id/bom]

    K --> L{Actions}
    L --> M[Export CSV]
    L --> N[Export PDF]
    L --> O[View by Category]
    L --> P[Substitute Materials]
    L --> Q[Link to Procurement]

    subgraph "BOM Categories"
        C1[Furniture]
        C2[Flooring]
        C3[Lighting]
        C4[Paint & Finishes]
        C5[Hardware]
        C6[Plumbing Fixtures]
        C7[Electrical]
        C8[Tiles & Stone]
        C9[Fabric & Upholstery]
        C10[Appliances]
    end
```

### Technical Drawings Flow

```mermaid
flowchart TD
    A[Design Variant Page] --> B[Click Generate Drawings]
    B --> C[Create Job: drawing]
    C --> D[Drawing Generator Service]

    D --> E{Drawing Types}
    E --> F[Floor Plan Layout]
    E --> G[Elevations - 4 walls]
    E --> H[Cross Sections]
    E --> I[Reflected Ceiling Plan]
    E --> J[Flooring Layout]
    E --> K[Electrical Layout]

    F --> L[Generate DXF + PDF + SVG]
    G --> L
    H --> L
    I --> L
    J --> L
    K --> L

    L --> M[Store in S3/MinIO]
    M --> N[View Gallery /project/id/drawings]

    N --> O{Actions}
    O --> P[Download DXF]
    O --> Q[Download PDF]
    O --> R[View SVG Inline]
    O --> S[Export IFC/BIM]
```

### CNC Cut Lists Flow

```mermaid
flowchart TD
    A[Design Variant Page] --> B[Click Generate Cut Lists]
    B --> C[Create Job: cutlist]
    C --> D[Cut List Engine]

    D --> E[Parse Design Furniture Specs]
    E --> F[Generate Panel List]
    F --> G[Apply Edge Banding]
    G --> H[Set Grain Direction]
    H --> I[Run Nesting Optimizer]

    I --> J[rectpack / DeepNest]
    J --> K[Sheet Layouts Generated]
    K --> L[Calculate Waste %]

    L --> M[Cut List Results Saved]
    M --> N[View /project/id/cutlist]

    N --> O{Output}
    O --> P[Panel List Table]
    O --> Q[Sheet Layout Diagrams]
    O --> R[Hardware Schedule]
    O --> S[Waste Report]
    O --> T[Offcut Details for Exchange]
```

---

## 9. MEP Engineering

```mermaid
flowchart TD
    A[Design Variant Page] --> B[Click MEP Calculations]
    B --> C{Select Type}

    C --> D[Electrical]
    C --> E[Plumbing]
    C --> F[HVAC]

    D --> G[Create Job: mep - electrical]
    G --> H[AI Agent + NEC 2020]
    H --> I[Circuit Load Analysis]
    I --> J[Outlet/Switch Placement]
    J --> K[Wire Sizing + Breaker Schedule]
    K --> L[Electrical Layout Generated]

    E --> M[Create Job: mep - plumbing]
    M --> N[AI Agent + IPC 2021]
    N --> O[Fixture Unit Count]
    O --> P[Pipe Sizing]
    P --> Q[Drainage Layout]
    Q --> R[Plumbing Layout Generated]

    F --> S[Create Job: mep - hvac]
    S --> T[AI Agent + ASHRAE 90.1]
    T --> U[Cooling/Heating Load]
    U --> V[Duct Sizing]
    V --> W[Equipment Selection]
    W --> X[HVAC Layout Generated]

    L --> Y[View /project/id/mep]
    R --> Y
    X --> Y

    Y --> Z[Standards Citations Included]
```

---

## 10. Project Timeline & Scheduling

```mermaid
flowchart TD
    A[Project Page] --> B[Timeline Tab /project/id/timeline]

    B --> C[Click Generate Schedule]
    C --> D[AI Analyzes Project Scope]
    D --> E[Generate Tasks & Dependencies]
    E --> F[Identify Critical Path]
    F --> G[Set Milestones]

    G --> H[Gantt Chart View]
    H --> I{Actions}
    I --> J[Adjust Task Dates]
    I --> K[Link Milestones to Payments]
    I --> L[Export Schedule]

    subgraph "Site Logs"
        M[/project/id/site-logs] --> N[Create Daily Log]
        N --> O[Date + Title + Notes]
        O --> P[Weather + Worker Count]
        P --> Q[Upload Photos]
        Q --> R[Add Tags]
    end

    subgraph "Change Orders"
        S[/project/id/change-orders] --> T[Propose Change]
        T --> U[AI Estimates Cost & Time Impact]
        U --> V{Review}
        V -->|Approve| W[Update Schedule & BOM]
        V -->|Reject| X[Change Rejected]
    end
```

---

## 11. Procurement & Delivery

```mermaid
flowchart TD
    A[BOM Approved] --> B[/project/id/procurement]

    B --> C[Create Purchase Order]
    C --> D[Select Vendor]
    D --> E[Add Line Items from BOM]
    E --> F[Set Quantities & Prices]
    F --> G[Submit PO]

    G --> H[PO Status: draft]
    H --> I[Submit to Vendor]
    I --> J[PO Status: submitted]
    J --> K[Vendor Confirms]
    K --> L[PO Status: confirmed]
    L --> M[Vendor Ships]
    M --> N[PO Status: shipped]
    N --> O[Materials Arrive]
    O --> P[PO Status: delivered]

    subgraph "Delivery Tracking"
        Q[/project/id/deliveries] --> R[Track Delivery]
        R --> S[Status: pending]
        S --> T[Status: dispatched]
        T --> U[Status: in_transit]
        U --> V[Status: delivered]
        V --> W[Inspection Checklist]
        W --> X{Pass?}
        X -->|Yes| Y[Status: inspected]
        X -->|No| Z[Status: rejected]
    end

    subgraph "Vendor Management"
        VA[/project/id/vendors] --> VB[View Vendor Ratings]
        VB --> VC[Delivery Score]
        VB --> VD[Quality Score]
        VB --> VE[Pricing Score]
        VB --> VF[Order History]
    end
```

---

## 12. Payments & Invoicing

```mermaid
flowchart TD
    A[/project/id/payments] --> B{Payment Type}

    B --> C[Milestone-Linked Payment]
    B --> D[Direct Payment]

    C --> E[Select Milestone]
    E --> F[Enter Amount]
    F --> G{Payment Provider}
    G --> H[Stripe Checkout]
    G --> I[Razorpay Checkout]

    H --> J[Payment Processing]
    I --> J
    J --> K{Result}
    K -->|Success| L[Status: completed]
    K -->|Failure| M[Status: failed]

    L --> N[Update Milestone Status]
    N --> O[Send Notification]
    O --> P[Generate Invoice]

    subgraph "Invoice Lifecycle"
        Q[Invoice Created] --> R[Status: draft]
        R --> S[Send Invoice]
        S --> T[Status: sent]
        T --> U{Payment Received?}
        U -->|Yes| V[Status: paid]
        U -->|Overdue| W[Status: overdue]
    end

    subgraph "Financial Reports"
        FR[/project/id/financial-reports] --> FR1[Budget vs. Actuals]
        FR --> FR2[Expenditure Timeline]
        FR --> FR3[Category Breakdown]
        FR --> FR4[Per Sq-ft Benchmarks]
    end
```

---

## 13. Contractor Marketplace

```mermaid
flowchart TD
    A[/marketplace] --> B[Search Contractors]

    B --> C[Filter by City]
    B --> D[Filter by Specialization]
    B --> E[Filter by Rating]
    B --> F[Filter by Verified Status]

    C --> G[Results List]
    D --> G
    E --> G
    F --> G

    G --> H[View Profile /marketplace/contractorId]
    H --> I[See Bio & Portfolio]
    H --> J[See Reviews & Ratings]
    H --> K[See Certifications]
    H --> L[See Years Experience]

    H --> M{Actions}
    M --> N[Hire Contractor]
    N --> O[Assign to Project]
    O --> P[Set Role & Dates]
    P --> Q[Set Agreed Amount]
    Q --> R[Contractor Assignment Created]

    M --> S[Write Review]
    S --> T[Rate 1-5 Stars]
    T --> U[Add Title & Review Text]
    U --> V[Review Published]

    M --> W[Refer to Friend]
    W --> X[Enter Referee Email]
    X --> Y[Referral Sent]
```

---

## 14. Quality Assurance & Handover

### QA & Punch List

```mermaid
flowchart TD
    A[/project/id/quality] --> B[Quality Checkpoints]

    B --> C[Create Checkpoint]
    C --> D[Select Milestone Stage]
    D --> E[Select Trade]
    E --> F[Add Checklist Items]
    F --> G[Assign Inspector]

    G --> H{Inspection}
    H --> I[Check Each Item]
    I --> J[Upload Inspection Photos]
    J --> K{All Pass?}
    K -->|Yes| L[Checkpoint: passed]
    K -->|No| M[Checkpoint: failed]

    M --> N[Create Punch List Items]
    N --> O[Set Severity: critical/major/minor]
    O --> P[Assign to Contractor]
    P --> Q[Contractor Fixes Issue]
    Q --> R[Mark as Resolved]
    R --> S[Verify Fix]
    S --> T[Mark as Verified]
```

### Handover Package

```mermaid
flowchart TD
    A[/project/id/handover] --> B[Generate Handover Package]

    B --> C[Compile As-Built Drawings]
    C --> D[Generate Material Register]
    D --> E[Compile Contractor Directory]
    E --> F[Create Operational Guides]
    F --> G[Generate Maintenance Manual PDF]

    G --> H[Handover Package Ready]
    H --> I{Client Review}
    I --> J[Client Signs Off]
    J --> K[Package Delivered]
    K --> L[Project Status: completed]

    subgraph "Handover Contents"
        HC1[As-Built Drawings DXF/PDF]
        HC2[Material Register with Batch Numbers]
        HC3[Contractor Directory with Contacts]
        HC4[System Operational Guides]
        HC5[Maintenance Manual]
        HC6[Warranty Documents]
    end
```

---

## 15. Intelligence & Analytics

```mermaid
flowchart TD
    A[/dashboard/analytics] --> B{Analytics Views}

    B --> C[Budget vs. Actual Chart]
    B --> D[Cost Breakdown by Category]
    B --> E[Timeline Progress]
    B --> F[Per Sq-ft Benchmarks]
    B --> G[Export CSV]

    subgraph "AI Predictions"
        H[/project/id/predictions] --> I[Generate Cost Prediction]
        I --> J[LLM Analyzes Project Data]
        J --> K[Predicted Cost + Confidence Range]
        K --> L[Risk Factors Identified]

        H --> M[Generate Timeline Prediction]
        M --> N[Predicted Days + Confidence]
        N --> O[Critical Risks & Mitigations]
        O --> P[Phase Breakdown]
    end

    subgraph "Budget Optimizer"
        Q[/project/id/budget-optimizer] --> R[Generate Scenarios]
        R --> S[AI Suggests Material Substitutions]
        S --> T[Show Savings per Substitution]
        T --> U{Accept?}
        U -->|Yes| V[Update BOM]
        U -->|No| W[Keep Original]
    end

    subgraph "Sustainability"
        X[/project/id/sustainability] --> Y[Generate Report]
        Y --> Z[Total Carbon Footprint]
        Z --> AA[LEED Points Estimate]
        AA --> AB[Green Alternatives Suggested]
    end
```

---

## 16. Post-Occupancy

### Digital Twin & IoT

```mermaid
flowchart TD
    A[/project/id/digital-twin] --> B[Create Digital Twin]
    B --> C[Upload/Generate 3D Model]
    C --> D[Twin Status: active]

    D --> E[Add IoT Devices]
    E --> F{Device Types}
    F --> G[Temperature Sensor]
    F --> H[Humidity Sensor]
    F --> I[Motion Sensor]
    F --> J[Energy Meter]
    F --> K[Water Flow Sensor]

    G --> L[Position in Room]
    H --> L
    I --> L
    J --> L
    K --> L

    L --> M[Live Dashboard]
    M --> N[Real-time Sensor Readings]
    M --> O[Historical Charts]
    M --> P[Alert Thresholds]

    D --> Q[Emergency References]
    Q --> R[Water Shutoff Location]
    Q --> S[Gas Shutoff Location]
    Q --> T[Electrical Breaker Panel]
    Q --> U[Fire Extinguisher Locations]
```

### Maintenance & Warranties

```mermaid
flowchart TD
    A[/project/id/maintenance] --> B[Maintenance Schedules]
    B --> C[Add Maintenance Item]
    C --> D[Set Category & Frequency]
    D --> E[Set Next Due Date]
    E --> F[Assign Provider]
    F --> G[Set Estimated Cost]

    G --> H[Schedule Active]
    H --> I{Due Date Reached}
    I --> J[Notification Sent]
    J --> K[Log Completion]
    K --> L[Record Cost & Notes]
    L --> M[Upload Photos]
    M --> N[Auto-Calculate Next Due Date]

    subgraph "Warranties"
        O[/project/id/warranties] --> P[Add Warranty]
        P --> Q[Item + Brand + Serial Number]
        Q --> R[Start & End Date]
        R --> S[Warranty Type]

        S --> T{Claim Needed?}
        T -->|Yes| U[File Warranty Claim]
        U --> V[Describe Issue + Photos]
        V --> W[Claim Status: filed]
        W --> X[Claim Status: in_review]
        X --> Y{Decision}
        Y -->|Approved| Z[Claim Resolved]
        Y -->|Denied| AA[Claim Denied]
    end
```

---

## 17. Marketplace & Community

### Product Catalogue

```mermaid
flowchart TD
    A[/marketplace/catalogue] --> B{Search Methods}
    B --> C[Text Search]
    B --> D[Category Browse]
    B --> E[Visual Similarity Search]

    C --> F[Meilisearch Full-Text]
    D --> G[Hierarchical Category Tree]
    E --> H[Upload Image - CLIP/pgvector]

    F --> I[Product Results]
    G --> I
    H --> I

    I --> J[Product Detail Page]
    J --> K[Multi-Vendor Price Comparison]
    J --> L[Specifications & Dimensions]
    J --> M[Similar Products]
    J --> N[Add to BOM]
```

### Offcuts Exchange

```mermaid
flowchart TD
    A[/marketplace/offcuts] --> B{Role}

    B -->|Seller| C[List Offcut Material]
    C --> D[Material Type + Quantity]
    D --> E[Dimensions & Condition]
    E --> F[Set Price + Upload Photos]
    F --> G[Listing Active]

    B -->|Buyer| H[Browse Listings]
    H --> I[Filter by Material/Location]
    I --> J[View Listing Detail]
    J --> K[Send Inquiry]
    K --> L[Seller Responds]
    L --> M{Deal?}
    M -->|Yes| N[Mark as Sold]
    M -->|No| O[Decline]
```

### Community Gallery

```mermaid
flowchart TD
    A[/marketplace/gallery] --> B[Browse Public Projects]
    B --> C[Filter by Style]
    B --> D[Filter by Tags]
    B --> E[Sort by Likes]

    F[Project Owner] --> G[Publish to Gallery]
    G --> H[Add Title & Description]
    H --> I[Select Images]
    I --> J[Set Style Tag]
    J --> K[Entry Published]

    B --> L[View Entry Detail]
    L --> M[Like Project]
    L --> N[View Design Details]
```

---

## 18. Admin Panel

```mermaid
flowchart TD
    A[Admin Login - role: admin] --> B[/admin]

    B --> C[Dashboard]
    C --> D[Total Users Count]
    C --> E[Total Projects Count]
    C --> F[Active Jobs Count]
    C --> G[System Health Status]

    B --> H[User Management /admin/users]
    H --> I[List All Users]
    I --> J[Toggle User Enabled/Disabled]
    I --> K[Change User Role]
    I --> L[View User Projects]

    B --> M[Job Queue /admin/jobs]
    M --> N[View All Jobs]
    N --> O[Filter by Status]
    N --> P[Filter by Type]
    N --> Q[Cancel Stuck Jobs]
    N --> R[Retry Failed Jobs]

    B --> S[System Health /admin/system]
    S --> T[Database Connection Status]
    S --> U[Storage Service Status]
    S --> V[ML Service Status]
    S --> W[Queue Depth Metrics]
```

---

## 19. Developer API Portal

```mermaid
flowchart TD
    A[/developer] --> B[Register New App]
    B --> C[Enter App Name]
    C --> D[Set Redirect URIs]
    D --> E[Select Scopes]
    E --> F[App Created]
    F --> G[Receive Client ID + Secret]

    G --> H[Generate Access Token]
    H --> I[OAuth Authorization Flow]
    I --> J[Access Token Issued]

    J --> K{API Usage}
    K --> L[Read Projects]
    K --> M[Read BOMs]
    K --> N[Read Drawings]
    K --> O[Trigger Jobs]

    A --> P[Webhook Subscriptions]
    P --> Q[Select Event Type]
    Q --> R[Set Target URL]
    R --> S[Set Secret for Signing]
    S --> T[Webhook Active]

    A --> U[Request Logs]
    U --> V[View API Call History]
    V --> W[Endpoint + Method + Status]
    V --> X[Response Time Metrics]

    subgraph "Rate Limits"
        RL1[Standard: 100 req/min]
        RL2[Premium: 500 req/min]
        RL3[Enterprise: 2000 req/min]
    end
```

---

## Notification Flow (Cross-cutting)

```mermaid
flowchart TD
    A{Event Trigger} --> B[Create Notification Record]
    B --> C[WebSocket Push to Client]
    C --> D[Bell Icon Badge Updated]
    D --> E[User Opens Notification Center]
    E --> F[Mark as Read]
    E --> G[Click Through to Link]

    A --> H{Event Types}
    H --> I[Job Completed]
    H --> J[Comment Added]
    H --> K[Approval Requested]
    H --> L[Payment Received]
    H --> M[Delivery Arrived]
    H --> N[Change Order Updated]
    H --> O[Maintenance Due]
    H --> P[Warranty Expiring]
```

---

## Building Code Compliance Flow

```mermaid
flowchart TD
    A[/project/id/compliance] --> B[Run Compliance Check]

    B --> C{Select Jurisdiction}
    C --> D[India - NBC 2016]
    C --> E[US - IRC 2021]
    C --> F[EU - Eurocode]
    C --> G[UK - Building Regs]

    D --> H[AI Checks Design Against Code]
    E --> H
    F --> H
    G --> H

    H --> I[Compliance Report]
    I --> J{Result}
    J -->|All Pass| K[Compliant Badge]
    J -->|Issues Found| L[List Violations]
    L --> M[Severity Level per Issue]
    M --> N[Remediation Suggestions]
    N --> O[Re-check After Fixes]
```

---

## Data Flow Summary

```mermaid
flowchart LR
    subgraph "User Input"
        A1[Photos]
        A2[Floor Plans]
        A3[Dimensions]
        A4[Style Preferences]
        A5[Budget]
    end

    subgraph "AI Processing"
        B1[Vision Engine]
        B2[Design Engine]
        B3[BOM Engine]
        B4[Drawing Generator]
        B5[Cut List Engine]
        B6[MEP Calculator]
    end

    subgraph "Outputs"
        C1[Design Renders]
        C2[Bill of Materials]
        C3[DXF/PDF Drawings]
        C4[CNC Cut Lists]
        C5[MEP Layouts]
        C6[Schedules]
    end

    subgraph "Execution"
        D1[Procurement]
        D2[Contractor Hiring]
        D3[Construction]
        D4[Quality Checks]
        D5[Handover]
    end

    A1 --> B1
    A2 --> B1
    A3 --> B2
    A4 --> B2
    A5 --> B2
    B1 --> B2
    B2 --> C1
    B2 --> B3
    B2 --> B4
    B2 --> B5
    B2 --> B6
    B3 --> C2
    B4 --> C3
    B5 --> C4
    B6 --> C5
    C2 --> D1
    C3 --> D2
    C6 --> D3
    D3 --> D4
    D4 --> D5
```
