#!/usr/bin/env python3
"""Generate OpenLintel Feature Explanation PDF."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.platypus.flowables import Flowable
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics import renderPDF
import os

# ── Colors ──────────────────────────────────────────────────────────────
PRIMARY = HexColor("#1a1a2e")
ACCENT = HexColor("#16213e")
BLUE = HexColor("#0f3460")
HIGHLIGHT = HexColor("#e94560")
LIGHT_BG = HexColor("#f8f9fa")
MEDIUM_BG = HexColor("#e9ecef")
DARK_TEXT = HexColor("#212529")
MUTED = HexColor("#6c757d")
WHITE = white
SECTION_BG = HexColor("#eef2ff")
ARCHITECT_COLOR = HexColor("#1e40af")
DESIGNER_COLOR = HexColor("#7c3aed")
CONSUMER_COLOR = HexColor("#059669")
TABLE_HEADER = HexColor("#1e293b")
TABLE_ALT = HexColor("#f1f5f9")


class ColoredBox(Flowable):
    """A colored rectangle with text inside."""
    def __init__(self, text, width, height, bg_color, text_color=WHITE, font_size=10):
        Flowable.__init__(self)
        self.text = text
        self.box_width = width
        self.box_height = height
        self.bg_color = bg_color
        self.text_color = text_color
        self.font_size = font_size

    def wrap(self, *args):
        return (self.box_width, self.box_height)

    def draw(self):
        self.canv.setFillColor(self.bg_color)
        self.canv.roundRect(0, 0, self.box_width, self.box_height, 4, fill=1, stroke=0)
        self.canv.setFillColor(self.text_color)
        self.canv.setFont("Helvetica-Bold", self.font_size)
        self.canv.drawCentredString(self.box_width / 2, (self.box_height - self.font_size) / 2 + 1, self.text)


def build_pdf():
    output_path = os.path.join(os.path.dirname(__file__), "featureexplanation.pdf")

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=45,
        leftMargin=45,
        topMargin=50,
        bottomMargin=50,
    )

    styles = getSampleStyleSheet()

    # ── Custom Styles ───────────────────────────────────────────────────
    styles.add(ParagraphStyle(
        "CoverTitle", parent=styles["Title"],
        fontSize=32, leading=38, textColor=PRIMARY,
        spaceAfter=6, alignment=TA_CENTER,
        fontName="Helvetica-Bold"
    ))
    styles.add(ParagraphStyle(
        "CoverSubtitle", parent=styles["Normal"],
        fontSize=14, leading=20, textColor=MUTED,
        spaceAfter=30, alignment=TA_CENTER,
        fontName="Helvetica"
    ))
    styles.add(ParagraphStyle(
        "SectionHeader", parent=styles["Heading1"],
        fontSize=22, leading=28, textColor=PRIMARY,
        spaceBefore=24, spaceAfter=10,
        fontName="Helvetica-Bold",
        borderWidth=0, borderColor=HIGHLIGHT,
        borderPadding=(0, 0, 4, 0),
    ))
    styles.add(ParagraphStyle(
        "SubSection", parent=styles["Heading2"],
        fontSize=15, leading=20, textColor=BLUE,
        spaceBefore=16, spaceAfter=6,
        fontName="Helvetica-Bold"
    ))
    styles.add(ParagraphStyle(
        "FeatureTitle", parent=styles["Heading3"],
        fontSize=12, leading=16, textColor=DARK_TEXT,
        spaceBefore=10, spaceAfter=4,
        fontName="Helvetica-Bold"
    ))
    styles.add(ParagraphStyle(
        "BodyText2", parent=styles["Normal"],
        fontSize=10, leading=14, textColor=DARK_TEXT,
        spaceAfter=6, alignment=TA_JUSTIFY,
        fontName="Helvetica"
    ))
    styles.add(ParagraphStyle(
        "BulletItem", parent=styles["Normal"],
        fontSize=10, leading=14, textColor=DARK_TEXT,
        spaceAfter=3, leftIndent=18, bulletIndent=6,
        fontName="Helvetica"
    ))
    styles.add(ParagraphStyle(
        "PersonaLabel", parent=styles["Normal"],
        fontSize=9, leading=12, spaceAfter=2,
        fontName="Helvetica-Bold"
    ))
    styles.add(ParagraphStyle(
        "PersonaText", parent=styles["Normal"],
        fontSize=9, leading=13, spaceAfter=4,
        leftIndent=10, fontName="Helvetica",
        textColor=DARK_TEXT
    ))
    styles.add(ParagraphStyle(
        "FooterStyle", parent=styles["Normal"],
        fontSize=8, textColor=MUTED, alignment=TA_CENTER
    ))
    styles.add(ParagraphStyle(
        "TOCEntry", parent=styles["Normal"],
        fontSize=11, leading=18, textColor=BLUE,
        leftIndent=10, fontName="Helvetica"
    ))
    styles.add(ParagraphStyle(
        "StatNumber", parent=styles["Normal"],
        fontSize=28, leading=32, textColor=HIGHLIGHT,
        alignment=TA_CENTER, fontName="Helvetica-Bold"
    ))
    styles.add(ParagraphStyle(
        "StatLabel", parent=styles["Normal"],
        fontSize=9, leading=12, textColor=MUTED,
        alignment=TA_CENTER, fontName="Helvetica"
    ))

    story = []

    # ── Helper Functions ────────────────────────────────────────────────
    def add_hr():
        story.append(Spacer(1, 6))
        story.append(HRFlowable(width="100%", thickness=1, color=MEDIUM_BG, spaceBefore=2, spaceAfter=8))

    def add_feature(title, description, architect_value, designer_value, consumer_value, capabilities=None):
        elements = []
        elements.append(Paragraph(title, styles["FeatureTitle"]))
        elements.append(Paragraph(description, styles["BodyText2"]))

        if capabilities:
            for cap in capabilities:
                elements.append(Paragraph(f"<bullet>&bull;</bullet> {cap}", styles["BulletItem"]))
            elements.append(Spacer(1, 4))

        # Persona value table
        persona_data = [
            [
                Paragraph(f'<font color="{ARCHITECT_COLOR.hexval()}">ARCHITECT</font>', styles["PersonaLabel"]),
                Paragraph(f'<font color="{DESIGNER_COLOR.hexval()}">DESIGNER</font>', styles["PersonaLabel"]),
                Paragraph(f'<font color="{CONSUMER_COLOR.hexval()}">END CONSUMER</font>', styles["PersonaLabel"]),
            ],
            [
                Paragraph(architect_value, styles["PersonaText"]),
                Paragraph(designer_value, styles["PersonaText"]),
                Paragraph(consumer_value, styles["PersonaText"]),
            ]
        ]

        col_width = (doc.width - 12) / 3
        t = Table(persona_data, colWidths=[col_width, col_width, col_width])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), SECTION_BG),
            ("ROUNDEDCORNERS", [4, 4, 4, 4]),
            ("TOPPADDING", (0, 0), (-1, 0), 6),
            ("BOTTOMPADDING", (0, -1), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LINEAFTER", (0, 0), (1, -1), 0.5, MEDIUM_BG),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 8))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=MEDIUM_BG, spaceBefore=0, spaceAfter=4))

        story.append(KeepTogether(elements))

    # ════════════════════════════════════════════════════════════════════
    # COVER PAGE
    # ════════════════════════════════════════════════════════════════════
    story.append(Spacer(1, 1.5 * inch))
    story.append(Paragraph("OpenLintel", styles["CoverTitle"]))
    story.append(Paragraph("Complete Feature Explanation Guide", ParagraphStyle(
        "CoverSub2", parent=styles["CoverSubtitle"], fontSize=18, textColor=BLUE, spaceAfter=8
    )))
    story.append(Paragraph(
        "End-to-end home design automation platform &mdash; from room photos to finished living spaces",
        styles["CoverSubtitle"]
    ))
    story.append(Spacer(1, 0.3 * inch))

    # Stats row
    stats = [
        ["73+", "Feature\nModules"],
        ["87", "API\nEndpoints"],
        ["55+", "Database\nTables"],
        ["5", "AI/ML\nSystems"],
        ["11", "Micro-\nservices"],
    ]
    stat_cells_row1 = []
    stat_cells_row2 = []
    for num, label in stats:
        stat_cells_row1.append(Paragraph(num, styles["StatNumber"]))
        stat_cells_row2.append(Paragraph(label, styles["StatLabel"]))

    stat_table = Table([stat_cells_row1, stat_cells_row2], colWidths=[doc.width / 5] * 5)
    stat_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BG),
        ("ROUNDEDCORNERS", [6, 6, 6, 6]),
        ("TOPPADDING", (0, 0), (-1, 0), 14),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 14),
    ]))
    story.append(stat_table)

    story.append(Spacer(1, 0.5 * inch))
    story.append(Paragraph(
        "How OpenLintel serves <b>Architects</b>, <b>Interior Designers</b>, and <b>End Consumers</b> "
        "across every stage of the design-to-delivery lifecycle.",
        ParagraphStyle("CoverDesc", parent=styles["BodyText2"], fontSize=11, alignment=TA_CENTER, textColor=MUTED)
    ))

    story.append(Spacer(1, 0.8 * inch))
    story.append(Paragraph("March 2026  |  Version 2.0", ParagraphStyle(
        "CoverDate", parent=styles["FooterStyle"], fontSize=10, textColor=MUTED
    )))

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════
    # TABLE OF CONTENTS
    # ════════════════════════════════════════════════════════════════════
    story.append(Paragraph("Table of Contents", styles["SectionHeader"]))
    add_hr()

    toc_items = [
        "1. Platform Overview & Architecture",
        "2. Design & Visualization",
        "    2.1 Room & Space Management",
        "    2.2 AI-Powered Design Generation",
        "    2.3 Floor Plan Intelligence",
        "    2.4 3D Editor & Real-Time Collaboration",
        "    2.5 Rendering & Visualization",
        "    2.6 AR/VR & Immersive Experiences",
        "3. Specialized Design Modules",
        "    3.1 Kitchen & Bath Design",
        "    3.2 Closet Design",
        "    3.3 Home Theater Design",
        "    3.4 Outdoor & Exterior Design",
        "    3.5 Lighting Design",
        "    3.6 Parametric Design",
        "    3.7 Space Planning & Furniture Layout",
        "    3.8 Material Boards & Inspiration",
        "    3.9 Smart Home Integration",
        "    3.10 Universal Design & Accessibility",
        "    3.11 Multi-Unit / ADU Design",
        "4. Technical & Engineering",
        "    4.1 Construction Drawings & Drawing Sets",
        "    4.2 Bill of Materials (BOM)",
        "    4.3 Cut Lists & CNC Optimization",
        "    4.4 MEP Engineering",
        "    4.5 Structural Analysis",
        "    4.6 Acoustics & Sound Engineering",
        "    4.7 Energy Modeling",
        "    4.8 Specification Writing",
        "    4.9 Code Compliance & AI Compliance Chat",
        "    4.10 Site Analysis",
        "5. Project Management & Construction",
        "    5.1 Timeline & Gantt Charts",
        "    5.2 Progress Reports & Site Logs",
        "    5.3 RFIs & Submittals",
        "    5.4 Permits & Inspections",
        "    5.5 Document Version Control",
        "    5.6 Drawing Sets & As-Built Documentation",
        "    5.7 Team Management",
        "    5.8 Time Tracking",
        "6. Financial & Procurement",
        "    6.1 Proposals & Client Presentations",
        "    6.2 Budget Optimization & Predictions",
        "    6.3 Procurement & Purchase Orders",
        "    6.4 Payments & Milestone Billing",
        "    6.5 Property Valuation & Benchmarking",
        "    6.6 Insurance Documentation",
        "7. Client Experience & Collaboration",
        "    7.1 Client Portal",
        "    7.2 Selections & Material Choices",
        "    7.3 Design Feedback & Critique",
        "    7.4 Annotations & Markups",
        "    7.5 Service Bookings & CRM",
        "    7.6 Post-Occupancy Evaluation",
        "8. Advanced Technology",
        "    8.1 AI/ML Pipeline",
        "    8.2 3D Reconstruction & LiDAR",
        "    8.3 Drone Integration",
        "    8.4 Digital Twin & IoT",
        "9. Integrations & Analytics",
        "    9.1 Third-Party Integrations",
        "    9.2 Analytics & Reporting",
        "    9.3 Sustainability & Carbon Tracking",
        "10. Summary & Value Proposition",
    ]

    for item in toc_items:
        indent = 20 if item.startswith("    ") else 0
        story.append(Paragraph(
            item.strip(),
            ParagraphStyle("toc_item", parent=styles["TOCEntry"], leftIndent=indent + 10,
                          fontSize=10 if indent else 11,
                          textColor=DARK_TEXT if indent else BLUE,
                          fontName="Helvetica" if indent else "Helvetica-Bold")
        ))

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════
    # 1. PLATFORM OVERVIEW
    # ════════════════════════════════════════════════════════════════════
    story.append(Paragraph("1. Platform Overview & Architecture", styles["SectionHeader"]))
    add_hr()

    story.append(Paragraph(
        "OpenLintel is a comprehensive, AI-powered home design automation platform that transforms "
        "the entire residential design and construction workflow. From the moment a client shares a "
        "room photo or uploads a floor plan, through design generation, engineering documentation, "
        "procurement, construction management, and post-occupancy evaluation &mdash; every step is "
        "digitized, automated, and connected.",
        styles["BodyText2"]
    ))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "The platform serves three primary audiences, each with distinct needs and workflows:",
        styles["BodyText2"]
    ))

    audience_data = [
        [
            Paragraph('<b><font color="#1e40af">Architects</font></b>', styles["BodyText2"]),
            Paragraph(
                "Professionals managing building design, structural integrity, code compliance, "
                "engineering calculations, and construction documentation. OpenLintel automates "
                "tedious technical tasks &mdash; from MEP load calculations to compliance checking &mdash; "
                "freeing architects to focus on creative problem-solving and client relationships.",
                styles["PersonaText"]
            ),
        ],
        [
            Paragraph('<b><font color="#7c3aed">Interior Designers</font></b>', styles["BodyText2"]),
            Paragraph(
                "Creatives focused on spatial aesthetics, material selection, furniture placement, "
                "and client presentation. OpenLintel provides AI-generated design variants, photorealistic "
                "renders, interactive 3D editors, mood boards, and specification tools that dramatically "
                "accelerate the design cycle while maintaining creative control.",
                styles["PersonaText"]
            ),
        ],
        [
            Paragraph('<b><font color="#059669">End Consumers</font></b>', styles["BodyText2"]),
            Paragraph(
                "Homeowners and property owners embarking on renovation or new construction. OpenLintel "
                "provides transparent project visibility, easy-to-understand design visualizations, "
                "selection tools, progress tracking, and a client portal that keeps them informed and "
                "engaged without overwhelming them with technical complexity.",
                styles["PersonaText"]
            ),
        ],
    ]

    audience_table = Table(audience_data, colWidths=[1.3 * inch, doc.width - 1.3 * inch])
    audience_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BG),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("LINEBELOW", (0, 0), (-1, 1), 0.5, MEDIUM_BG),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
    ]))
    story.append(audience_table)
    story.append(Spacer(1, 12))

    story.append(Paragraph(
        "<b>Technical Architecture:</b> OpenLintel is built as a modern microservices platform with "
        "11 specialized services (10 Python + 1 TypeScript), a Next.js 15 frontend with React Server Components, "
        "PostgreSQL with pgvector for AI-powered product matching, Redis for caching, MinIO/S3 for media storage, "
        "and real-time collaboration via Y.js CRDT. The entire system is containerized with Docker Compose "
        "for consistent deployment.",
        styles["BodyText2"]
    ))

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════
    # 2. DESIGN & VISUALIZATION
    # ════════════════════════════════════════════════════════════════════
    story.append(Paragraph("2. Design & Visualization", styles["SectionHeader"]))
    add_hr()
    story.append(Paragraph(
        "The design and visualization suite is the creative heart of OpenLintel, covering everything "
        "from initial room capture to photorealistic rendering and immersive AR/VR walkthroughs.",
        styles["BodyText2"]
    ))

    # 2.1
    story.append(Paragraph("2.1 Room & Space Management", styles["SubSection"]))
    add_feature(
        "Room Creation & Configuration",
        "Create and manage rooms within projects with precise dimensions (length, width, height), "
        "room types (bedroom, bathroom, kitchen, living room, etc.), floor assignment, and detailed "
        "descriptions. Rooms serve as the foundational unit for all design, engineering, and documentation workflows.",
        # Architect
        "Define spatial parameters that feed directly into structural calculations, MEP sizing, "
        "and code compliance checking. Room dimensions auto-propagate to drawings, BOMs, and energy models, "
        "eliminating manual data re-entry across disciplines.",
        # Designer
        "Organize projects by room with style preferences, budget tiers, and design constraints. "
        "Each room becomes a self-contained design workspace with its own variants, material palette, "
        "and client approvals.",
        # Consumer
        "See your home broken down into clearly defined spaces. Understand what's being designed, "
        "track progress room by room, and provide input on priorities and preferences for each space.",
        capabilities=[
            "Precise L x W x H dimensions with metric/imperial support",
            "17+ room types with smart defaults for typical dimensions",
            "Multi-floor support with floor assignment",
            "Photo upload per room for AI analysis",
            "Room-level budget allocation and style selection",
        ]
    )

    # 2.2
    story.append(Paragraph("2.2 AI-Powered Design Generation", styles["SubSection"]))
    add_feature(
        "Intelligent Design Variant Engine",
        "Upload a photo of any room, select a design style and budget tier, and OpenLintel's AI engine "
        "generates multiple design variants complete with furniture suggestions, material specifications, "
        "color palettes, and photorealistic renders. The system uses a multi-step LangGraph pipeline with "
        "Vision Language Models (GPT-4o, Claude, Gemini) for room analysis, followed by style-aware "
        "prompt generation and iterative design refinement.",
        # Architect
        "Rapidly explore design directions for client presentations without spending hours on manual "
        "concept sketches. The AI respects structural constraints and building code parameters, generating "
        "designs that are technically feasible. Use generated variants as a starting point, then refine "
        "in the 3D editor.",
        # Designer
        "Transform your creative workflow with AI-assisted ideation. Upload a client's existing room photo, "
        "select from 10+ curated styles (Modern, Scandinavian, Industrial, Bohemian, Art Deco, etc.), "
        "choose a budget tier (Budget, Mid-Range, Premium, Luxury), and receive multiple design concepts "
        "in minutes. Each variant includes specific product recommendations, material callouts, and "
        "a complete design specification document.",
        # Consumer
        "Simply take a photo of your room and see it transformed into professionally designed spaces. "
        "Compare different styles side by side, understand costs at different budget levels, and choose "
        "the direction you love. No design expertise needed &mdash; the AI does the creative heavy lifting.",
        capabilities=[
            "Multi-step AI pipeline: Room Analysis > Style Matching > Design Generation > Evaluation",
            "10+ design styles with curated vocabulary and reference imagery",
            "4 budget tiers: Budget, Mid-Range, Premium, Luxury",
            "Vision Language Model room analysis (detect existing furniture, materials, dimensions)",
            "Iterative refinement with quality scoring and self-correction",
            "Photorealistic rendering of each design variant",
            "Detailed specification sheets with product links and pricing",
            "Design constraint system (keep/replace specific items, color restrictions)",
        ]
    )

    add_feature(
        "Room Redesign Wizard",
        "A guided, step-by-step wizard that walks users through the redesign process: photo upload, "
        "style quiz, budget selection, constraint definition, and design generation. The wizard uses "
        "progressive disclosure to avoid overwhelming users while capturing all necessary design inputs.",
        # Architect
        "Structured client intake that captures all design parameters upfront, reducing back-and-forth "
        "communication. The wizard format ensures no critical information is missed.",
        # Designer
        "Professional client onboarding tool that guides homeowners through design preferences "
        "systematically. The 5-step style quiz builds a design DNA profile that informs all AI generation.",
        # Consumer
        "An intuitive, friendly experience that asks the right questions to understand your taste. "
        "Like having a conversation with a designer &mdash; answer simple preference questions and "
        "watch your dream room come to life.",
        capabilities=[
            "5-step interactive style quiz with visual preference selection",
            "Photo upload with drag-and-drop and camera capture",
            "Budget slider with real-time cost estimates",
            "Item preservation controls (keep sofa, replace curtains)",
            "Color palette preferences and material restrictions",
        ]
    )

    story.append(PageBreak())

    # 2.3
    story.append(Paragraph("2.3 Floor Plan Intelligence", styles["SubSection"]))
    add_feature(
        "AI Floor Plan Digitization",
        "Upload any floor plan &mdash; whether a hand-drawn sketch, a scanned PDF, a DWG/DXF CAD file, "
        "or even a photo of a blueprint &mdash; and OpenLintel's AI digitizes it into a structured, editable "
        "format. The system detects walls, doors, windows, room boundaries, and dimensions using a combination "
        "of computer vision, OCR, and Vision Language Models.",
        # Architect
        "Instantly convert legacy paper drawings into digital, editable floor plans. Import DWG files from "
        "AutoCAD, extract room geometries, and feed them directly into structural, MEP, and compliance "
        "analysis. Supports multi-floor detection and separation, dimension extraction with unit parsing, "
        "and DXF output for CAD interoperability.",
        # Designer
        "Skip the tedious process of manually recreating floor plans. Upload a client's existing plan "
        "(even a photo from a real estate listing) and get an accurate digital version ready for space "
        "planning, furniture layout, and design work. Wall positions, door swings, and window locations "
        "are automatically detected.",
        # Consumer
        "Share your floor plan in any format you have &mdash; a photo, a PDF from your builder, or even "
        "a hand sketch &mdash; and the system understands your home's layout instantly. No technical "
        "knowledge required.",
        capabilities=[
            "Multi-format input: PDF, DWG/DXF, PNG, JPEG, hand sketches",
            "DWG-to-DXF conversion via LibreDWG for CAD file processing",
            "Raster image preprocessing: skew correction, contrast enhancement, binarization",
            "VLM-based extraction of rooms, walls, doors, windows, and fixtures",
            "Dimension OCR with unit parsing (feet/inches, meters, millimeters)",
            "Multi-floor detection and automatic floor separation",
            "DXF output generation with proper CAD layer formatting",
            "Confidence scoring on extracted dimensions",
        ]
    )

    add_feature(
        "Interactive Floor Plan Editor",
        "A full-featured 2D floor plan editor for creating plans from scratch or modifying digitized plans. "
        "Draw walls, place doors and windows, define room boundaries, add dimensions, and arrange furniture &mdash; "
        "all in an intuitive browser-based interface with SVG rendering.",
        # Architect
        "Quick schematic design tool for early-stage planning. Draw room layouts, test spatial configurations, "
        "and establish dimension chains without opening heavy CAD software. Changes automatically update "
        "all downstream calculations (BOMs, MEP, structural).",
        # Designer
        "Plan furniture layouts, test traffic flow patterns, and optimize space utilization with visual "
        "feedback. Drag and drop furniture from the catalogue, snap to walls, and verify clearances &mdash; "
        "all before committing to a 3D model.",
        # Consumer
        "See your home as a clear 2D plan. Understand room sizes, furniture placement options, and "
        "how different layouts change the flow of your home. Easy to share and discuss with family.",
        capabilities=[
            "Wall drawing with snap-to-grid and angle constraints",
            "Door and window placement with swing direction",
            "Room boundary auto-detection from wall geometry",
            "Furniture drag-and-drop from product catalogue",
            "Dimension annotation with leader lines",
            "SVG rendering engine for sharp, scalable output",
            "Undo/redo with full history",
            "Export to DXF, PDF, and SVG formats",
        ]
    )

    # 2.4
    story.append(Paragraph("2.4 3D Editor & Real-Time Collaboration", styles["SubSection"]))
    add_feature(
        "3D Design Editor with Collaborative Editing",
        "A browser-based 3D design environment built on React Three Fiber (Three.js) where users can "
        "place furniture, apply materials, adjust lighting, and walk through their designs in real time. "
        "Multiple users can edit simultaneously with conflict-free CRDT synchronization via Y.js, seeing "
        "each other's cursors and changes in real time.",
        # Architect
        "Validate spatial relationships in 3D, check sightlines, verify furniture clearances against "
        "code requirements, and conduct virtual design reviews with clients and contractors. The WebSocket-based "
        "collaboration means the entire project team can work on the model simultaneously from anywhere.",
        # Designer
        "Your primary design canvas. Place furniture from the product catalogue, experiment with material "
        "finishes (PBR rendering for realistic wood, marble, fabric textures), adjust ambient and accent "
        "lighting, and create compelling 3D scenes. The intuitive toolbar supports select, move, rotate, "
        "scale, and measure modes with snap-to-grid precision.",
        # Consumer
        "Walk through your future home in 3D before any construction begins. See exactly how furniture "
        "fits, how materials look together, and how light plays through your space. If your designer is "
        "working on the model, you can watch changes happen live.",
        capabilities=[
            "React Three Fiber / Three.js WebGL rendering",
            "GLB/GLTF furniture model loading from product catalogue",
            "PBR material system (metalness, roughness, normal maps)",
            "Ambient, point, and directional lighting with shadows",
            "Select, move, rotate, scale, and measure tools",
            "Snap-to-grid and snap-to-wall alignment",
            "Y.js CRDT real-time collaboration with cursor presence",
            "Undo/redo with collaborative history",
            "First-person walkthrough camera mode",
            "Fullscreen mode for immersive viewing",
        ]
    )

    story.append(PageBreak())

    # 2.5
    story.append(Paragraph("2.5 Rendering & Visualization", styles["SubSection"]))
    add_feature(
        "AI-Powered Photorealistic Renders",
        "Generate photorealistic images of designed spaces using AI rendering. Each design variant can be "
        "rendered with specific camera angles, lighting conditions (natural daylight, evening ambiance, "
        "studio lighting), and material fidelity. Renders serve as the primary client communication and "
        "approval tool.",
        # Architect
        "Present design intent to clients with photorealistic clarity. Renders eliminate the ambiguity "
        "of floor plans and elevations, reducing change orders by ensuring clients understand exactly "
        "what they're approving before construction begins.",
        # Designer
        "Create portfolio-quality visualizations for every design concept. Generate multiple angles "
        "and lighting scenarios to tell a compelling design story. Use renders in proposals, social media, "
        "and client presentations without hiring a separate visualization specialist.",
        # Consumer
        "See exactly what your renovated space will look like. Compare different design options with "
        "photorealistic images that look like professional interior photography. Make confident decisions "
        "about style, colors, and materials.",
        capabilities=[
            "AI-generated photorealistic room visualizations",
            "Multiple camera angles and lighting presets",
            "Before/after comparison views",
            "High-resolution output for print and digital use",
            "Batch rendering for multiple design variants",
        ]
    )

    # 2.6
    story.append(Paragraph("2.6 AR/VR & Immersive Experiences", styles["SubSection"]))
    add_feature(
        "Augmented & Virtual Reality",
        "Experience designs in immersive AR and VR. The AR mode lets you place virtual furniture in "
        "your real room using your phone or tablet camera (WebXR). The VR walkthrough mode lets you "
        "navigate through the designed space as if you were standing inside it. Both modes support "
        "QR code sharing for easy client access.",
        # Architect
        "Conduct immersive design reviews where stakeholders can physically experience the space before "
        "it's built. AR helps validate furniture scale against real-world room dimensions. VR walkthroughs "
        "reveal circulation issues and spatial quality problems that 2D drawings miss.",
        # Designer
        "The ultimate client presentation tool. Hand your client a phone, let them point it at their "
        "empty room, and watch their face as your design appears overlaid on reality. VR walkthroughs "
        "create emotional buy-in that no render can match.",
        # Consumer
        "Try before you buy &mdash; literally. Point your phone at your room and see how new furniture "
        "looks in your actual space. Walk through your future home in VR to make sure the layout feels "
        "right. Share the experience with family via QR code.",
        capabilities=[
            "WebXR-based AR furniture placement on mobile devices",
            "VR room walkthrough with head-tracking navigation",
            "QR code generation for instant client sharing",
            "Real-world scale calibration for accurate sizing",
            "Works on standard phones and tablets (no special hardware)",
        ]
    )

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════
    # 3. SPECIALIZED DESIGN MODULES
    # ════════════════════════════════════════════════════════════════════
    story.append(Paragraph("3. Specialized Design Modules", styles["SectionHeader"]))
    add_hr()
    story.append(Paragraph(
        "Beyond general room design, OpenLintel provides deep, specialized tools for specific design "
        "domains &mdash; each with tailored AI assistance, industry-standard calculations, and "
        "purpose-built interfaces.",
        styles["BodyText2"]
    ))

    add_feature(
        "3.1 Kitchen & Bath Design",
        "Purpose-built design tools for kitchens and bathrooms, the most complex and valuable rooms in "
        "any home. Includes cabinet layout optimization, appliance placement with clearance checking, "
        "work triangle analysis, countertop material selection, plumbing fixture positioning, and "
        "ventilation requirements.",
        # Architect
        "Verify kitchen work triangle compliance, check ADA clearances around fixtures, validate "
        "plumbing rough-in locations, and ensure ventilation meets code. Auto-generates kitchen-specific "
        "elevations and MEP coordination drawings.",
        # Designer
        "Design dream kitchens with confidence. The tool enforces ergonomic standards while giving "
        "you creative freedom on materials, finishes, and layout. Visualize countertop materials, "
        "backsplash patterns, and cabinet door styles in 3D.",
        # Consumer
        "Kitchen and bathroom renovations are the highest-ROI home improvements. See detailed plans "
        "showing exactly where every cabinet, appliance, and fixture will go. Understand costs for "
        "different material tiers and make informed upgrade decisions.",
        capabilities=[
            "Cabinet layout with standard sizes and custom configurations",
            "Appliance placement with required clearances and electrical requirements",
            "Work triangle (sink-stove-fridge) optimization analysis",
            "Countertop material library with pricing",
            "Plumbing fixture coordination with rough-in locations",
            "Ventilation hood sizing and ductwork planning",
            "ADA/accessibility compliance checking",
        ]
    )

    add_feature(
        "3.2 Closet Design",
        "Closet organizer and storage system design with configurable shelving, hanging rods, "
        "drawers, and accessories. Supports walk-in closets, reach-in closets, and pantry configurations.",
        "Calculate structural support for heavy shelving loads. Verify ventilation "
        "and lighting compliance for walk-in closets. Generate cut lists for custom millwork.",
        "Create custom storage solutions that maximize every inch. Design with standard component "
        "systems (e.g., Elfa, California Closets-style) or fully custom millwork. Visualize in 3D.",
        "See a clear plan for organizing your closet with specific storage for shoes, hanging clothes, "
        "folded items, and accessories. Understand the cost of different organization systems.",
    )

    add_feature(
        "3.3 Home Theater Design",
        "Dedicated home theater configuration tool covering seating layout, screen sizing and placement, "
        "speaker positioning (5.1, 7.1, Dolby Atmos), acoustic treatment, ambient lighting control, "
        "and equipment rack planning.",
        "Acoustic modeling for reverb time (RT60), sound isolation requirements between theater and "
        "adjacent rooms, structural considerations for riser platforms, and electrical load calculations "
        "for AV equipment.",
        "Design immersive entertainment spaces with proper speaker geometry, screen aspect ratios, "
        "seating rake angles, and ambient lighting scenes. Material selection for acoustic panels and "
        "blackout treatments.",
        "Plan your dream home theater with guidance on screen size for your room dimensions, optimal "
        "seating positions, and speaker placement. Understand the difference between budget and premium "
        "setups with clear cost breakdowns.",
    )

    add_feature(
        "3.4 Outdoor & Exterior Design",
        "Exterior living space design including decks, patios, landscaping, outdoor kitchens, fire pits, "
        "pergolas, and pool areas. Includes material selection for weather-resistant finishes and "
        "drainage planning.",
        "Site grading and drainage design, structural calculations for decks and pergolas, "
        "setback compliance with local zoning, and landscape irrigation system planning.",
        "Create stunning outdoor rooms that extend the living space. Design with weather-appropriate "
        "materials, plan lighting for evening ambiance, and coordinate indoor-outdoor material flow.",
        "Visualize outdoor improvements before investing. See how a new deck, patio, or landscaping "
        "will look from different angles and seasons. Understand maintenance requirements for different "
        "material choices.",
    )

    story.append(PageBreak())

    add_feature(
        "3.5 Lighting Design",
        "Comprehensive lighting design with lux level calculations, daylight factor simulation, "
        "fixture layout planning, circuit mapping, and scene/dimming control programming. Supports "
        "ambient, task, accent, and decorative lighting layers.",
        "Calculate required illumination levels per room type (IES standards), design circuit layouts, "
        "verify switching locations meet code, and ensure emergency/egress lighting compliance.",
        "Layer lighting for atmosphere and function. Plan recessed, pendant, wall, and floor fixtures "
        "with dimming scenes. Visualize how natural and artificial light interact throughout the day.",
        "Understand how lighting transforms a room. See proposed fixture locations, preview the ambiance "
        "of different lighting scenes (bright task mode, relaxed evening mode), and compare fixture "
        "styles and costs.",
        capabilities=[
            "Lux level calculations per room type and activity",
            "Daylight factor simulation with window orientation",
            "Fixture selection from product catalogue with photometric data",
            "Circuit layout and switching location design",
            "Scene programming with dimming levels",
            "Energy efficiency calculations and LED recommendations",
        ]
    )

    add_feature(
        "3.6 Parametric Design",
        "Rule-based design generation that creates optimized layouts based on defined constraints, "
        "spatial rules, and design parameters. The engine generates and evaluates multiple configuration "
        "options, scoring them against criteria like space efficiency, circulation quality, and "
        "natural light access.",
        "Define design rules (minimum room sizes, circulation widths, structural grid alignment) "
        "and let the parametric engine generate compliant options. Excellent for early-stage massing "
        "studies and layout optimization.",
        "Explore design variations systematically rather than intuitively. Set aesthetic and functional "
        "constraints, and receive optimized layouts that you might not have considered. Great for "
        "difficult spaces where every inch matters.",
        "Receive designs that are provably optimized for your constraints. The system considers all "
        "your requirements simultaneously &mdash; budget, style, room sizes, natural light &mdash; "
        "producing solutions that no single designer could explore manually.",
    )

    add_feature(
        "3.7 Space Planning & Furniture Layout",
        "AI-assisted furniture arrangement optimization that considers traffic flow, conversation "
        "zones, focal points, and functional areas within each room.",
        "Verify ADA clearances, egress paths, and furniture-to-wall distances meet building code. "
        "Check that spatial layouts support the intended occupancy and use patterns.",
        "Start with AI-suggested layouts based on the room shape and function, then refine manually. "
        "The tool validates traffic flow and ensures no dead zones or awkward circulation paths.",
        "See multiple furniture arrangement options for your room and understand why each layout works. "
        "Choose the arrangement that fits your lifestyle &mdash; whether you prioritize entertaining, "
        "family time, or individual comfort.",
    )

    add_feature(
        "3.8 Material Boards & Inspiration",
        "AI-generated material and finish presentation boards combining fabrics, paints, flooring, "
        "tiles, and hardware into cohesive palettes. The inspiration gallery provides mood board "
        "creation from curated reference imagery.",
        "Ensure material selections meet fire rating, slip resistance, and durability requirements "
        "for commercial and residential applications.",
        "Create stunning material boards that tell a cohesive design story. The AI ensures color "
        "harmony, texture contrast, and style consistency across all selections. Export boards for "
        "client presentations and contractor ordering.",
        "See all proposed materials, finishes, and colors together in one view. Touch and feel "
        "samples can be ordered directly from the platform. Build inspiration boards from images "
        "you love and let the AI find matching products.",
        capabilities=[
            "AI-generated color palette and material harmonies",
            "Physical sample ordering with tracking",
            "Mood board creation from Pinterest-style inspiration images",
            "Material specification sheets with pricing and lead times",
            "Product matching via CLIP/DINOv2 visual AI search",
        ]
    )

    story.append(PageBreak())

    add_feature(
        "3.9 Smart Home Integration",
        "Smart device and home automation planning including device placement, network topology, "
        "wiring requirements, automation scene programming, and voice assistant integration.",
        "Design the electrical and network infrastructure for smart home systems. Plan conduit "
        "runs for low-voltage wiring, calculate network switch port requirements, and specify "
        "power outlet locations for smart devices.",
        "Integrate smart technology seamlessly into the design aesthetic. Plan hidden device "
        "locations, select switch plates and thermostat styles that complement the interior design, "
        "and program lighting scenes that enhance the design intent.",
        "Plan your smart home features: automated lighting, smart thermostats, security cameras, "
        "doorbell cameras, and voice control. Understand what needs to be wired during construction "
        "versus what can be added later.",
    )

    add_feature(
        "3.10 Universal Design & Accessibility",
        "ADA and accessibility compliance tools ensuring spaces are usable by people of all abilities. "
        "Covers wheelchair clearances, grab bar placement, lever handles, visual contrast, and "
        "aging-in-place features.",
        "Check all designs against ADA/ANSI A117.1 accessibility standards. Verify doorway widths, "
        "turning radii, reach ranges, and accessible route continuity. Generate compliance reports "
        "for permit applications.",
        "Design beautiful spaces that happen to be accessible. Universal design doesn't mean "
        "institutional &mdash; incorporate grab bars, curbless showers, and wider doorways in ways "
        "that enhance rather than detract from the design.",
        "Ensure your home works for everyone &mdash; aging parents, children, guests with mobility "
        "challenges, or your own future needs. Understand which accessibility features add resale "
        "value and which are easy to add now but expensive to retrofit later.",
    )

    add_feature(
        "3.11 Multi-Unit / ADU Design",
        "Design tools for accessory dwelling units (ADUs), duplexes, and multi-unit residential "
        "configurations. Handles unit separation, shared vs. private spaces, individual utility "
        "metering, and zoning compliance.",
        "Navigate complex zoning requirements for ADUs (setbacks, height limits, parking requirements). "
        "Design fire-rated separations between units, plan separate utility services, and ensure "
        "each unit meets independent egress requirements.",
        "Create ADU designs that maximize rental potential while complementing the main residence. "
        "Design shared outdoor spaces, create privacy between units, and select durable, "
        "tenant-appropriate finishes.",
        "Understand the financial opportunity of an ADU. See design options for your property, "
        "estimated rental income, construction costs, and timeline. The platform handles the "
        "complexity of multi-unit regulations so you don't have to.",
    )

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════
    # 4. TECHNICAL & ENGINEERING
    # ════════════════════════════════════════════════════════════════════
    story.append(Paragraph("4. Technical & Engineering", styles["SectionHeader"]))
    add_hr()
    story.append(Paragraph(
        "OpenLintel automates the most time-consuming technical tasks in residential design, "
        "generating construction-ready documentation, engineering calculations, and code compliance "
        "reports that traditionally require days of manual work.",
        styles["BodyText2"]
    ))

    add_feature(
        "4.1 Construction Drawings & Drawing Sets",
        "Auto-generation of a complete construction drawing package from the 3D model and design data: "
        "floor plans, reflected ceiling plans (RCP), elevations, sections, electrical layouts, flooring "
        "plans, and detail drawings. Output in DXF, PDF, SVG, and IFC (BIM) formats. Drawing sets "
        "allow bundling and versioning of drawing packages for permit submission and contractor distribution.",
        # Architect
        "Generate a complete drawing set in minutes instead of days. The system produces properly layered "
        "DXF files compatible with AutoCAD, with industry-standard sheet borders, title blocks, dimension "
        "styles, and annotation scales. IFC export enables BIM coordination with structural and MEP engineers.",
        # Designer
        "Professional construction documents without CAD expertise. The system generates floor plans, "
        "elevations, and detail drawings from your 3D design, properly formatted for contractor use. "
        "Focus on design intent while the platform handles documentation.",
        # Consumer
        "Receive a complete, professional drawing package for your project. These drawings are what "
        "your contractor needs to build from and what the building department needs for permit approval. "
        "All drawings are version-tracked so you always have the latest set.",
        capabilities=[
            "Floor plan with walls, doors, windows, and dimensions",
            "Reflected ceiling plan (RCP) with fixture layout",
            "Interior elevations with material callouts",
            "Sections with structural and finish information",
            "Electrical layout with outlet, switch, and fixture locations",
            "Flooring plan with material boundaries and transitions",
            "DXF, PDF, SVG, and IFC export formats",
            "Drawing set bundling with revision tracking",
            "Sheet numbering and title block formatting",
        ]
    )

    add_feature(
        "4.2 Bill of Materials (BOM)",
        "Comprehensive material quantification engine that calculates every item needed for construction: "
        "flooring, paint, tile, lumber, hardware, fixtures, and furnishings. Includes waste factors per "
        "material type, unit cost calculations, category-wise breakdowns, and export for procurement.",
        # Architect
        "Accurate BOMs feed directly into cost estimation and procurement. The system applies "
        "industry-standard waste factors (10% for flooring, 15% for tile cutting, etc.) and can "
        "generate structural BOMs from DWG files including beams, columns, and reinforcement schedules.",
        # Designer
        "Know the exact material quantities and costs for every design variant. Compare BOMs across "
        "different design options to help clients make informed budget decisions. The category breakdown "
        "(flooring, walls, ceiling, fixtures, furniture) makes it easy to identify cost drivers.",
        # Consumer
        "Complete transparency on what goes into your project. See every material, its quantity, "
        "unit cost, and total &mdash; broken down by category. Compare costs between design options "
        "and understand where your money is going.",
        capabilities=[
            "Automatic quantity takeoff from room dimensions and design specs",
            "Waste factor application per material type",
            "Category breakdown: flooring, walls, ceiling, fixtures, furniture, hardware",
            "Unit cost calculations with multi-vendor pricing",
            "PDF/Excel export for contractor bidding",
            "BOM comparison across design variants",
            "Structural BOM generation from DWG file analysis",
            "Integration with procurement for automatic PO generation",
        ]
    )

    story.append(PageBreak())

    add_feature(
        "4.3 Cut Lists & CNC Optimization",
        "Panel optimization engine for custom millwork, cabinetry, and shelving. Takes design dimensions "
        "and calculates optimal cutting patterns to minimize material waste. Supports rectangular nesting "
        "(rectpack) and irregular shape optimization (DeepNest integration). Outputs CNC-ready cutting "
        "instructions.",
        # Architect
        "Verify that custom millwork designs are manufacturable and calculate material efficiency. "
        "The nesting algorithm provides waste percentage metrics that inform value engineering decisions.",
        # Designer
        "Design custom built-ins, shelving systems, and furniture with confidence that they can be "
        "fabricated efficiently. The cut list shows exactly how each panel is cut from standard sheet goods.",
        # Consumer
        "Understand the fabrication efficiency of your custom cabinetry. The nesting visualization "
        "shows how panels are cut from sheet material, and the waste percentage demonstrates that "
        "your craftsperson is using materials efficiently.",
        capabilities=[
            "Rectangular bin packing (rectpack) for panel optimization",
            "Irregular shape nesting via DeepNest integration",
            "Kerf width and edge banding compensation",
            "Multi-sheet optimization across standard sheet sizes",
            "CNC G-code compatible output",
            "Visual nesting diagram with color-coded parts",
            "Waste percentage and offcut tracking",
            "Offcut marketplace for reuse across projects",
        ]
    )

    add_feature(
        "4.4 MEP Engineering (Mechanical, Electrical, Plumbing)",
        "Automated MEP calculations covering electrical load analysis (NEC wire sizing, circuit layout, "
        "panel scheduling), plumbing design (fixture unit calculation, pipe sizing, DWV layout), and "
        "HVAC requirements (heat loss/gain, equipment sizing, ductwork). Fire safety systems including "
        "sprinkler coverage and smoke detector placement.",
        # Architect
        "The most time-saving feature for residential architects. Automated NEC-compliant electrical "
        "load calculations, properly sized plumbing based on fixture unit counts, and HVAC load "
        "calculations that feed into equipment specifications. Fire safety layout meets NFPA requirements. "
        "All calculations are documented for permit submission.",
        # Designer
        "Understand MEP constraints early in the design process. Know where plumbing walls need to be "
        "thicker, where electrical panels require clearance, and where HVAC registers will be located &mdash; "
        "before they become costly change orders.",
        # Consumer
        "Receive professional engineering calculations for your project's mechanical, electrical, and "
        "plumbing systems. These calculations ensure your home is safe, efficient, and meets all building "
        "codes. Understand your home's electrical capacity, plumbing layout, and HVAC sizing.",
        capabilities=[
            "NEC-compliant electrical load calculation and wire sizing",
            "Circuit layout with GFCI/AFCI protection mapping",
            "Panel schedule generation",
            "Plumbing fixture unit calculation (IPC/UPC)",
            "Supply and DWV pipe sizing",
            "HVAC heat loss/gain (Manual J equivalent)",
            "Equipment sizing (Manual S equivalent)",
            "Ductwork sizing (Manual D equivalent)",
            "Fire sprinkler coverage and smoke/CO detector layout",
        ]
    )

    add_feature(
        "4.5 Structural Analysis",
        "Automated structural assessment including load path analysis, beam sizing, header calculations "
        "over openings, foundation type recommendations, and lateral force resistance evaluation.",
        # Architect
        "Rapid structural pre-sizing for residential projects. The system calculates tributary areas, "
        "determines load paths, and sizes beams and headers per IRC/IBC requirements. Identifies where "
        "point loads require special foundation design and flags lateral bracing requirements.",
        # Designer
        "Understand structural limitations before committing to design decisions. Know which walls are "
        "load-bearing, what beam sizes are needed for open-concept layouts, and where structural "
        "constraints shape the design.",
        # Consumer
        "Confidence that your renovation is structurally sound. The analysis shows exactly how loads "
        "travel through your building and confirms that proposed changes (like removing walls) are "
        "safe and properly engineered.",
        capabilities=[
            "Gravity load path analysis (dead + live loads)",
            "Beam and header sizing for standard spans",
            "Point load and tributary area calculations",
            "Foundation type recommendation",
            "Load-bearing wall identification",
            "Lateral force resistance evaluation",
            "Connection detail recommendations",
        ]
    )

    story.append(PageBreak())

    add_feature(
        "4.6 Acoustics & Sound Engineering",
        "Room acoustics analysis including sound transmission class (STC) calculations between rooms, "
        "reverberation time (RT60) analysis, noise criteria (NC) level assessment, and acoustic "
        "treatment recommendations.",
        "Calculate STC ratings for wall assemblies, design sound isolation for media rooms and "
        "bedrooms, and specify acoustic treatment to meet comfort standards.",
        "Design spaces with appropriate acoustic character. Specify absorptive and diffusive "
        "treatments that enhance the design aesthetic while controlling sound quality.",
        "Ensure your home theater has rich sound, your bedroom is quiet, and your open-plan living "
        "area doesn't echo. Understand the acoustic impact of material choices (hardwood vs. carpet, "
        "drywall vs. mass-loaded vinyl).",
    )

    add_feature(
        "4.7 Energy Modeling",
        "Whole-building energy simulation including envelope thermal analysis (U-values, R-values), "
        "HVAC load calculations, solar gain analysis, and energy code compliance checking. "
        "Estimates annual energy costs and identifies efficiency improvement opportunities.",
        "Demonstrate energy code compliance (IECC, Title 24) with automated envelope and HVAC analysis. "
        "Compare building envelope options (insulation levels, window types, air sealing strategies) "
        "with quantified energy savings.",
        "Specify materials and systems that meet the client's energy performance goals. Understand "
        "the energy impact of design choices like window size, orientation, and glazing type.",
        "See estimated annual energy costs for your home. Compare options like upgraded windows, "
        "better insulation, or heat pumps with clear payback period calculations. Make informed "
        "decisions about where energy efficiency investments provide the best return.",
        capabilities=[
            "Building envelope thermal analysis (U-value, R-value)",
            "HVAC load calculations (heating and cooling)",
            "Solar gain analysis by window orientation",
            "Annual energy cost estimation",
            "Energy code compliance checking (IECC, Title 24)",
            "Improvement recommendations with ROI analysis",
        ]
    )

    add_feature(
        "4.8 Specification Writing",
        "Automated construction specification document generation covering materials, methods, "
        "quality standards, and performance requirements for each building component.",
        "Generate CSI-formatted specifications that define material standards, installation methods, "
        "and quality criteria. Specifications ensure contractors bid and build to the intended standard.",
        "Translate design intent into unambiguous construction language. Specifications protect the "
        "design vision by defining exact material grades, finishes, and installation standards.",
        "Understand exactly what materials and methods will be used in your project. Specifications "
        "serve as a contract between you and your contractor &mdash; they define what you're paying for.",
    )

    add_feature(
        "4.9 Code Compliance & AI Compliance Chat",
        "Multi-jurisdiction building code compliance checking against NBC 2016 (India), IRC 2021 (USA), "
        "Eurocode (EU), and UK Building Regulations. An AI-powered compliance chat allows natural "
        "language queries about code requirements.",
        "Automated code checking that flags violations before permit submission. The AI chat enables "
        "quick code research: 'What's the minimum ceiling height for a habitable room in IRC 2021?' "
        "or 'Does this stairway meet egress requirements?'",
        "Understand code constraints early in the design process. The compliance checker runs "
        "continuously as you design, flagging issues before they become expensive redesign problems.",
        "Confidence that your project meets all building codes. The compliance report provides "
        "a clear pass/fail status for each requirement, and the AI chat answers code questions "
        "in plain language.",
        capabilities=[
            "Multi-jurisdiction support: NBC, IRC, Eurocode, UK Building Regs",
            "Room-by-room compliance checking (dimensions, ventilation, egress)",
            "Fire separation and egress path validation",
            "Accessibility compliance (ADA, ANSI A117.1)",
            "AI compliance chat for natural language code queries",
            "Compliance report generation for permit submission",
        ]
    )

    add_feature(
        "4.10 Site Analysis",
        "Comprehensive site evaluation covering topography and grading, solar orientation and sun path, "
        "wind patterns, drainage analysis, soil conditions, vegetation survey, utility location mapping, "
        "and setback/easement visualization.",
        "Make informed site-specific design decisions based on quantified environmental data. Solar "
        "orientation informs window placement, drainage patterns guide foundation design, and utility "
        "locations constrain the building footprint.",
        "Understand how site conditions influence design possibilities. Sun path analysis helps "
        "plan natural lighting, prevailing winds inform ventilation strategy, and views determine "
        "window placement priorities.",
        "See a complete analysis of your property before design begins. Understand why the architect "
        "chose specific window orientations, building positions, and drainage solutions.",
    )

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════
    # 5. PROJECT MANAGEMENT & CONSTRUCTION
    # ════════════════════════════════════════════════════════════════════
    story.append(Paragraph("5. Project Management & Construction", styles["SectionHeader"]))
    add_hr()
    story.append(Paragraph(
        "OpenLintel bridges the gap between design and construction with comprehensive project "
        "management tools that keep every stakeholder aligned throughout the build process.",
        styles["BodyText2"]
    ))

    add_feature(
        "5.1 Timeline & Gantt Charts",
        "Auto-generated construction schedules with Gantt chart visualization, critical path analysis, "
        "trade dependencies, milestone tracking, and resource allocation. The timeline engine considers "
        "material lead times, trade sequencing, and inspection hold points.",
        # Architect
        "Ensure the construction sequence respects structural and MEP coordination requirements. "
        "The critical path analysis identifies schedule-driving activities, and dependency mapping "
        "prevents trade conflicts (e.g., plumbing rough-in before drywall).",
        # Designer
        "Understand when design decisions must be finalized to avoid delaying construction. The timeline "
        "shows material lead times (custom furniture, imported tile) and when selections must be made "
        "to maintain the schedule.",
        # Consumer
        "See a clear, visual timeline of your entire project. Know when each phase starts and ends, "
        "when you need to make decisions, and how changes affect the overall completion date. "
        "Track progress against the plan in real time.",
        capabilities=[
            "Auto-generated Gantt chart from project scope",
            "Critical path method (CPM) analysis",
            "Trade dependency mapping (demolition > framing > MEP > drywall > finishes)",
            "Milestone tracking with percentage complete",
            "Material lead time integration",
            "Weather delay and holiday calendar support",
            "Schedule compression analysis (crashing/fast-tracking)",
        ]
    )

    add_feature(
        "5.2 Progress Reports & Site Logs",
        "Automated weekly/daily progress reporting with photo documentation, weather recording, "
        "labor tracking, and work completed summaries. Site logs capture daily construction activity "
        "for contractual documentation.",
        "Maintain a complete daily record of construction progress for contractual and legal "
        "documentation. Photo evidence of concealed conditions before they're covered up.",
        "Track design implementation quality through progress photos. Verify that specified "
        "materials and finishes are being installed correctly.",
        "Receive automated progress updates with photos showing what was accomplished each day/week. "
        "Track your project's progress without visiting the site. Documentation protects you in "
        "any disputes about work quality or timeline.",
    )

    add_feature(
        "5.3 RFIs & Submittals",
        "Request for Information (RFI) tracking for contractor questions about design intent, "
        "with markup tools for annotating drawings. Submittal management for reviewing and approving "
        "materials, products, and shop drawings before installation.",
        "Respond to contractor RFIs with marked-up drawings and clear written responses. "
        "Review submittals to verify products meet specifications. Both workflows create an "
        "auditable record of design decisions made during construction.",
        "Review submittals to ensure actual products match the design intent. The approval "
        "workflow prevents substitutions that compromise the design vision.",
        "Stay informed about questions and decisions during construction. When your contractor "
        "asks about a design detail, see the question and response. When materials are submitted "
        "for approval, see what's being proposed and approve or request alternatives.",
    )

    add_feature(
        "5.4 Permits & Inspections",
        "Building permit tracking with application status, inspection scheduling, inspector notes, "
        "and compliance documentation. Tracks permit conditions and required approvals.",
        "Track permit applications across multiple jurisdictions, schedule inspections at the "
        "right construction milestones, and maintain documentation for certificate of occupancy.",
        "Understand permit requirements that affect the design and timeline. Some design changes "
        "require permit amendments &mdash; the system flags these proactively.",
        "Know the status of your building permits. See when inspections are scheduled and their "
        "results. The system ensures nothing falls through the cracks on the regulatory side.",
    )

    story.append(PageBreak())

    add_feature(
        "5.5 Document Version Control",
        "Drawing and document revision tracking with version history, clouded comparison between "
        "revisions, and distribution tracking. Ensures everyone is always working from the latest "
        "documents.",
        "Maintain a complete revision history for all construction documents. Clouded revision "
        "comparison highlights exactly what changed between versions. Distribution tracking "
        "confirms contractors received the latest drawings.",
        "Track design evolution through revisions. Compare any two versions to see what changed "
        "and why. Ensure contractors always have current drawing sets.",
        "Always see the latest version of your project documents. Compare current plans to "
        "earlier versions to understand how the design has evolved.",
    )

    add_feature(
        "5.6 As-Built Documentation",
        "As-built drawing compilation showing actual constructed conditions versus design intent. "
        "Captures field modifications, hidden conditions, and final installed dimensions.",
        "Create the permanent record of how the building was actually constructed. As-builts are "
        "critical for future renovations, maintenance, and property transactions.",
        "Document final material selections, finish details, and any field changes for the client "
        "handover package. As-builts protect your design record.",
        "Receive a complete record of your home as it was actually built. This documentation is "
        "invaluable for future renovations, insurance claims, and property sales.",
    )

    add_feature(
        "5.7 Team Management",
        "User roles and permissions, team collaboration tools, contractor assignments, and "
        "performance tracking. Supports project-level access control with role-based permissions.",
        "Manage multi-disciplinary project teams with granular access control. Assign team members "
        "to specific projects and control what they can view and edit.",
        "Collaborate with contractors, clients, and fellow designers with appropriate access levels. "
        "Share specific views without exposing sensitive project data.",
        "See who's working on your project and their roles. Communicate with your design team "
        "through the platform instead of juggling emails and phone calls.",
    )

    add_feature(
        "5.8 Time Tracking",
        "Labor hour tracking for project team members with timesheet management, project-level "
        "cost allocation, and productivity analytics.",
        "Track billable hours per project for accurate invoicing. Analyze time allocation across "
        "design phases to improve future project estimation.",
        "Monitor time spent on each project phase. Track efficiency and identify bottlenecks "
        "in the design process. Feed time data into project profitability analysis.",
        "Understand how professional time is allocated on your project. Time tracking provides "
        "transparency into the design and management effort behind your project.",
    )

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════
    # 6. FINANCIAL & PROCUREMENT
    # ════════════════════════════════════════════════════════════════════
    story.append(Paragraph("6. Financial & Procurement", styles["SectionHeader"]))
    add_hr()

    add_feature(
        "6.1 Proposals & Client Presentations",
        "Professional proposal generation with design renders, scope of work, cost estimates, "
        "timeline projections, and terms. Proposals are generated from project data and can be "
        "customized with firm branding.",
        "Create winning proposals that demonstrate technical competence. Proposals include "
        "preliminary design concepts, scope definition, fee structure, and timeline &mdash; "
        "all generated from the platform's project data.",
        "Deliver polished client proposals in minutes instead of hours. Proposals include "
        "photorealistic renders, material selections, cost breakdowns, and timeline &mdash; "
        "professionally formatted and ready to present.",
        "Receive clear, comprehensive proposals that show exactly what you're getting. Compare "
        "proposals from different design options with transparent cost breakdowns. Understand "
        "what's included and what's extra.",
    )

    add_feature(
        "6.2 Budget Optimization & Cost Predictions",
        "AI-powered budget optimization that suggests material substitutions, alternative products, "
        "and value engineering options to meet target budgets. ML-based cost and timeline predictions "
        "with risk assessment for early-stage project planning.",
        "Value engineer projects systematically. The optimizer suggests equivalent materials at "
        "different price points while maintaining structural and code compliance. Cost predictions "
        "provide realistic budget ranges based on historical project data.",
        "Present clients with good/better/best budget options backed by specific material substitutions. "
        "The AI ensures alternatives maintain design quality while meeting budget constraints.",
        "Understand your options at different budget levels. The optimizer shows exactly what changes "
        "at each price point &mdash; where you can save without noticing and where premium materials "
        "make a visible difference. AI predictions help you set realistic budget expectations.",
        capabilities=[
            "AI material substitution suggestions with visual comparison",
            "Budget scenario modeling (good/better/best)",
            "ML-based cost prediction from project parameters",
            "Timeline prediction with confidence intervals",
            "Risk factor identification and mitigation suggestions",
            "Historical benchmarking against similar projects",
        ]
    )

    add_feature(
        "6.3 Procurement & Purchase Orders",
        "End-to-end procurement management from BOM to purchase orders. Automated PO generation, "
        "multi-vendor comparison, phased ordering aligned to construction schedule, delivery tracking, "
        "and receiving/inspection workflows.",
        "Manage procurement with full traceability from specification to delivery. Phased ordering "
        "prevents material storage issues on tight sites. Multi-vendor comparison ensures competitive pricing.",
        "Track material orders from specification through delivery. The procurement system ensures "
        "specified products are ordered (not substitutes) and arrives before installation is scheduled.",
        "See exactly what's been ordered for your project, when it will arrive, and how much it costs. "
        "Delivery tracking keeps you informed. Inspection checklists at receiving catch damage early.",
    )

    add_feature(
        "6.4 Payments & Milestone Billing",
        "Integrated payment processing via Stripe and Razorpay with milestone-based billing schedules. "
        "Payments are linked to project milestones and completion verification.",
        "Structure payment schedules tied to construction milestones. The system tracks completion "
        "percentage and supports progress-based billing with retention.",
        "Automated invoicing tied to project milestones. Get paid when work is completed and verified, "
        "with clear documentation supporting each invoice.",
        "Pay based on verified project milestones. See exactly what was completed before each payment "
        "is due. Secure payment processing through Stripe/Razorpay with full transaction records.",
    )

    story.append(PageBreak())

    add_feature(
        "6.5 Property Valuation & Benchmarking",
        "Post-renovation property value estimation based on improvements made. Cost benchmarking "
        "compares project costs per square foot against similar projects in the area.",
        "Advise clients on ROI for different improvement strategies. Benchmarking data helps set "
        "realistic budget expectations based on actual project data from similar scopes.",
        "Support design fee negotiations with data showing the value your design adds to the property. "
        "Benchmarking demonstrates that your specified materials provide appropriate value for the market.",
        "Understand the return on your renovation investment. See how your project costs compare to "
        "similar projects and estimate how much value the renovation adds to your property.",
    )

    add_feature(
        "6.6 Insurance Documentation",
        "Insurance claim documentation including damage assessment photos, scope of repair, "
        "cost estimates, and as-built records for insurance company submission.",
        "Generate insurance-ready documentation for damage repair projects. The system produces "
        "the detailed scope and cost estimates insurance companies require for claim approval.",
        "Document existing conditions thoroughly for insurance-related renovation projects. "
        "Photo documentation and scope definition support claim processing.",
        "Simplify insurance claims with professional documentation. The platform generates the "
        "detailed damage assessment, repair scope, and cost estimate your insurance company needs.",
    )

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════
    # 7. CLIENT EXPERIENCE & COLLABORATION
    # ════════════════════════════════════════════════════════════════════
    story.append(Paragraph("7. Client Experience & Collaboration", styles["SectionHeader"]))
    add_hr()

    add_feature(
        "7.1 Client Portal",
        "A dedicated client-facing interface for design reviews and approvals. Clients can view "
        "designs, compare options, leave comments, approve selections, track progress, and access "
        "project documents &mdash; all in a simplified view appropriate for non-technical stakeholders.",
        "Provide clients with a professional project interface that builds confidence and reduces "
        "email-based communication. Approval workflows create clear decision records.",
        "The client portal elevates the client experience from email attachments to an interactive "
        "platform. Clients feel professionally served while you reduce the overhead of managing "
        "client communications.",
        "Your personal project hub where you can see everything about your renovation in one place. "
        "Review designs at your own pace, compare options, approve materials, track construction "
        "progress, and access all documents. No technical knowledge required.",
    )

    add_feature(
        "7.2 Selections & Material Choices",
        "Interactive material selection tool where clients choose finishes, fixtures, furniture, "
        "and accessories from curated options. Each selection includes pricing, lead time, and "
        "visual previews. Selections feed directly into BOMs and procurement.",
        "Structured selection process with deadlines aligned to the construction schedule. "
        "Know which selections must be finalized before which construction milestone.",
        "Present curated options to clients in an organized, visual format. No more spreadsheet "
        "selection schedules. The platform tracks what's been selected, what's pending, and what's "
        "overdue.",
        "Choose your finishes, fixtures, and furniture from beautiful, curated options. See prices "
        "upfront, compare alternatives side by side, and make selections at your own pace. The "
        "platform tells you when decisions are needed to keep the project on schedule.",
    )

    add_feature(
        "7.3 Design Feedback & AI Critique",
        "AI-powered design evaluation that provides constructive feedback on spatial quality, "
        "color harmony, proportion, natural light usage, and functional layout. Combines "
        "computer vision analysis with design principles to identify improvement opportunities.",
        "Independent design review that catches issues a second pair of eyes would find. "
        "The AI evaluates spatial proportions, circulation quality, and code compliance aspects "
        "that are easy to overlook in familiar designs.",
        "Use AI critique as a design quality check before client presentation. The system "
        "evaluates color theory, scale/proportion, and spatial balance &mdash; confirming your "
        "design instincts or flagging areas for refinement.",
        "Understand the design rationale behind each choice. The AI explains why certain "
        "furniture arrangements work better, why specific color combinations create harmony, "
        "and how the design maximizes your room's potential.",
    )

    add_feature(
        "7.4 Annotations & Markups",
        "Comment and markup tools for design review. Place annotations directly on 2D drawings, "
        "3D models, and rendered images. Threaded discussions keep feedback organized and actionable.",
        "Precise design review with annotations placed on specific drawing details or 3D "
        "model locations. Threaded discussions maintain context, and mention tagging (@) "
        "ensures the right team member responds.",
        "Collaborate with clients and contractors through contextual feedback. No more 'the "
        "thing on the left side of the second drawing' &mdash; annotations pin feedback to "
        "exact locations.",
        "Point to exactly what you want to discuss. Click on any part of a design, drawing, "
        "or render to leave a comment. Your feedback is organized by location and topic, "
        "making it easy for your design team to respond.",
    )

    add_feature(
        "7.5 Service Bookings & CRM",
        "Appointment scheduling for site visits, design consultations, and installation coordination. "
        "CRM tracks client relationships, project pipeline, communication history, and follow-ups.",
        "Manage client relationships and project pipeline systematically. Track leads, active projects, "
        "and past clients in one place. Booking system eliminates email-based scheduling.",
        "Streamline client management from initial inquiry through project completion. The CRM "
        "tracks communication history, preferences, and project stage for every client.",
        "Book design consultations and site visits through an easy online system. See available "
        "times, book instantly, and receive reminders. No phone tag or email chains.",
    )

    add_feature(
        "7.6 Post-Occupancy Evaluation",
        "Post-completion satisfaction surveys and performance evaluation. Captures how the "
        "space performs in real use, identifies issues, and measures client satisfaction.",
        "Gather data on how your designs perform in actual occupancy. Post-occupancy feedback "
        "informs future design decisions and demonstrates commitment to quality.",
        "Learn from completed projects. Post-occupancy data reveals which design decisions "
        "clients love and which need refinement, building your design intelligence over time.",
        "Share how your renovated space is working in daily life. Flag any issues for warranty "
        "attention and provide feedback that helps the design team improve for future clients.",
    )

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════
    # 8. ADVANCED TECHNOLOGY
    # ════════════════════════════════════════════════════════════════════
    story.append(Paragraph("8. Advanced Technology", styles["SectionHeader"]))
    add_hr()

    add_feature(
        "8.1 AI/ML Pipeline",
        "OpenLintel's intelligence is powered by five major AI/ML systems working in concert: "
        "(1) Design Generation via LangGraph multi-step workflows with Vision Language Models, "
        "(2) Floor Plan Digitization using computer vision and OCR, (3) Room Segmentation via SAM2 "
        "(Segment Anything Model) for wall/floor/ceiling/furniture detection, (4) Product Matching "
        "using CLIP/DINOv2 visual embeddings with pgvector similarity search, and (5) Measurement & "
        "3D Reconstruction via monocular depth estimation and multi-view stereo.",
        # Architect
        "AI automates the tedious documentation tasks that consume 60-70% of an architect's time. "
        "From room measurement extraction to code compliance checking, the ML pipeline handles "
        "routine analysis so architects can focus on creative problem-solving and client relationships. "
        "The system improves with each project, learning from corrections and preferences.",
        # Designer
        "AI amplifies creative capacity. Instead of designing one option, present five. Instead of "
        "manually specifying products, let visual AI search find matching items from multiple vendor "
        "catalogues. The AI handles quantification, documentation, and compliance while you focus "
        "on aesthetics and client experience.",
        # Consumer
        "AI makes professional design accessible and affordable. Tasks that previously required "
        "expensive specialists (engineering calculations, material quantification, code checking) "
        "are automated, reducing project costs while maintaining professional quality.",
        capabilities=[
            "LangGraph orchestrated multi-step design pipeline",
            "Vision Language Models: GPT-4o, Claude, Gemini Vision",
            "SAM2 (Segment Anything Model) for room element detection",
            "CLIP/DINOv2 visual embeddings for product matching",
            "Depth Anything V2 for monocular depth estimation",
            "COLMAP multi-view stereo for 3D reconstruction",
            "pgvector similarity search in PostgreSQL",
            "Iterative quality evaluation with self-correction",
        ]
    )

    add_feature(
        "8.2 3D Reconstruction & LiDAR",
        "Create 3D models of existing spaces from photos or LiDAR scans. Photo-based reconstruction "
        "uses monocular depth estimation and multi-view stereo (COLMAP) to generate 3D meshes. "
        "LiDAR integration processes point cloud data from iPhone/iPad LiDAR sensors or professional "
        "scanners into structured room models.",
        # Architect
        "Capture existing conditions in 3D without traditional surveying. LiDAR point clouds provide "
        "millimeter-accurate as-built dimensions. Photo-based reconstruction enables 3D documentation "
        "of spaces that are difficult to access with traditional survey equipment.",
        # Designer
        "Start designs from an accurate 3D model of the existing space. Photo reconstruction makes "
        "it possible to design for a remote client's home without a site visit &mdash; they just take "
        "photos with their phone.",
        # Consumer
        "Capture your home in 3D using just your iPhone. The LiDAR sensor creates an accurate 3D model "
        "that designers can use without visiting your home. If you don't have LiDAR, regular photos "
        "work too &mdash; the AI estimates room dimensions from images.",
        capabilities=[
            "Monocular depth estimation from single photos (Depth Anything V2)",
            "Reference object calibration (door height, A4 paper, credit card)",
            "Multi-view stereo via COLMAP for photogrammetric reconstruction",
            "iPhone/iPad LiDAR point cloud processing",
            "Professional scanner point cloud import (LAS/LAZ/PLY/PCD)",
            "3D mesh generation in glTF format",
            "Confidence scoring on estimated dimensions",
        ]
    )

    add_feature(
        "8.3 Drone Integration",
        "Aerial photography and videography integration for site documentation, exterior visualization, "
        "and roof/facade inspection. Supports drone flight data import with GPS-tagged imagery.",
        "Aerial site documentation for planning and progress monitoring. Drone imagery supports "
        "site analysis (topography, vegetation, solar exposure) and provides roof condition "
        "assessment without scaffolding.",
        "Capture stunning aerial views of exterior design projects. Drone photography documents "
        "landscape design, outdoor living spaces, and building exterior from perspectives clients love.",
        "See your property from the air. Drone photography provides a complete picture of your "
        "site for planning purposes and creates dramatic progress documentation of your project.",
    )

    add_feature(
        "8.4 Digital Twin & IoT",
        "Post-completion digital twin that mirrors the physical space with real-time IoT sensor data. "
        "Temperature, humidity, motion, energy consumption, and water usage sensors feed into a "
        "3D visualization that shows building performance in real time.",
        "Monitor building performance against design targets. The digital twin reveals whether "
        "HVAC systems are performing as designed, energy consumption meets predictions, and "
        "occupancy patterns match programmatic assumptions.",
        "Maintain a living design record that evolves with the building. The digital twin "
        "captures how spaces are actually used, informing future design decisions with real data.",
        "See your home's vital signs in real time. Monitor temperature and humidity in each room, "
        "track energy and water usage, receive alerts for unusual conditions, and optimize your "
        "home's performance over time.",
        capabilities=[
            "Real-time IoT sensor visualization in 3D model",
            "Temperature, humidity, motion, energy, and water monitoring",
            "Historical data trending and anomaly detection",
            "Maintenance scheduling based on actual usage patterns",
            "Energy optimization recommendations from usage data",
            "Emergency system status (smoke detectors, water shutoffs)",
        ]
    )

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════
    # 9. INTEGRATIONS & ANALYTICS
    # ════════════════════════════════════════════════════════════════════
    story.append(Paragraph("9. Integrations & Analytics", styles["SectionHeader"]))
    add_hr()

    add_feature(
        "9.1 Third-Party Integrations",
        "API connections to external tools and services including CAD software, product catalogues, "
        "payment processors, accounting systems, and communication platforms. Supports OAuth app "
        "registration for custom integrations and webhook notifications.",
        "Connect OpenLintel to your existing toolchain: export to AutoCAD/Revit via DXF/IFC, "
        "sync with accounting software, and receive webhook notifications for project events.",
        "Integrate with product vendor systems for real-time pricing and availability. Connect "
        "to e-commerce platforms for direct ordering and social media for portfolio sharing.",
        "Connect your preferred payment method, receive project notifications via your preferred "
        "channel (email, SMS, Slack), and access your project data from other tools.",
        capabilities=[
            "DXF/IFC export for CAD/BIM interoperability",
            "Stripe and Razorpay payment processing",
            "OAuth app registration for third-party developers",
            "Webhook notifications for project events",
            "API key management with rate limiting (standard/premium/enterprise)",
            "Product catalogue API for vendor integration",
        ]
    )

    add_feature(
        "9.2 Analytics & Reporting",
        "Comprehensive project analytics covering budget vs. actual spending, cost breakdown by "
        "category, timeline progress tracking, variance analysis, and resource utilization. "
        "Dashboards provide at-a-glance project health indicators.",
        "Monitor portfolio-level metrics across all active projects. Identify projects trending "
        "over budget or behind schedule before they become problems. Analyze resource utilization "
        "and profitability across the practice.",
        "Track project profitability and time allocation. Analytics reveal which project types "
        "are most profitable, which phases take the most time, and where efficiency improvements "
        "will have the greatest impact.",
        "Full transparency into project finances. See exactly where your budget is being spent, "
        "how the project is progressing against the timeline, and whether costs are tracking "
        "to the original estimate.",
    )

    add_feature(
        "9.3 Sustainability & Carbon Tracking",
        "Environmental impact assessment including material carbon footprint calculation, LEED "
        "point estimation, embodied carbon analysis, and sustainable material recommendations.",
        "Quantify the environmental impact of design decisions. Track embodied carbon across "
        "materials and estimate LEED certification potential. Increasingly required for "
        "commercial projects and progressive residential clients.",
        "Offer clients sustainability metrics as a value-add service. Show the carbon "
        "impact of different material choices and position sustainable design as a differentiator.",
        "Understand the environmental impact of your renovation. See the carbon footprint "
        "of different material options and make informed choices about sustainability. "
        "Increasingly relevant for property value and personal values.",
    )

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════
    # 10. SUMMARY & VALUE PROPOSITION
    # ════════════════════════════════════════════════════════════════════
    story.append(Paragraph("10. Summary & Value Proposition", styles["SectionHeader"]))
    add_hr()

    story.append(Paragraph(
        "OpenLintel transforms the fragmented world of residential design and construction into a "
        "unified, AI-powered platform that serves every stakeholder from concept to completion and beyond.",
        styles["BodyText2"]
    ))
    story.append(Spacer(1, 12))

    # Value prop summary table
    summary_data = [
        [
            Paragraph(f'<b><font color="{WHITE.hexval()}">Stakeholder</font></b>', styles["BodyText2"]),
            Paragraph(f'<b><font color="{WHITE.hexval()}">Key Value Delivered</font></b>', styles["BodyText2"]),
            Paragraph(f'<b><font color="{WHITE.hexval()}">Impact</font></b>', styles["BodyText2"]),
        ],
        [
            Paragraph(f'<b><font color="{ARCHITECT_COLOR.hexval()}">Architects</font></b>', styles["BodyText2"]),
            Paragraph(
                "Automated engineering calculations (MEP, structural, energy, acoustics), "
                "auto-generated construction drawings and specifications, multi-jurisdiction code "
                "compliance checking, and construction administration tools (RFIs, submittals, permits).",
                styles["PersonaText"]
            ),
            Paragraph(
                "Reduces documentation time by up to 70%. Eliminates manual calculation errors. "
                "Enables smaller firms to deliver large-firm documentation quality. Frees architects "
                "to focus on design thinking and client relationships.",
                styles["PersonaText"]
            ),
        ],
        [
            Paragraph(f'<b><font color="{DESIGNER_COLOR.hexval()}">Interior Designers</font></b>', styles["BodyText2"]),
            Paragraph(
                "AI design generation with multiple variants, 3D visualization and rendering, "
                "material boards and product matching, interactive client presentations, selection "
                "management, and procurement coordination.",
                styles["PersonaText"]
            ),
            Paragraph(
                "10x design exploration speed with AI variants. Professional documentation without "
                "CAD training. Elevated client experience through the client portal. End-to-end "
                "project visibility from design through installation.",
                styles["PersonaText"]
            ),
        ],
        [
            Paragraph(f'<b><font color="{CONSUMER_COLOR.hexval()}">End Consumers</font></b>', styles["BodyText2"]),
            Paragraph(
                "Intuitive design visualization (3D, AR, VR), transparent cost tracking, "
                "easy material selection, real-time progress updates, client portal for approvals, "
                "and post-occupancy digital twin for ongoing home management.",
                styles["PersonaText"]
            ),
            Paragraph(
                "Complete project transparency and control. Confident decision-making through "
                "visualization. Reduced renovation anxiety through progress tracking. Long-term "
                "home management through the digital twin. Professional quality at accessible cost.",
                styles["PersonaText"]
            ),
        ],
    ]

    col_widths = [1.2 * inch, (doc.width - 1.2 * inch) * 0.55, (doc.width - 1.2 * inch) * 0.45]
    summary_table = Table(summary_data, colWidths=col_widths)
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("BACKGROUND", (0, 1), (-1, 1), WHITE),
        ("BACKGROUND", (0, 2), (-1, 2), TABLE_ALT),
        ("BACKGROUND", (0, 3), (-1, 3), WHITE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, MEDIUM_BG),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 20))

    # Platform stats
    story.append(Paragraph("<b>Platform at a Glance</b>", styles["SubSection"]))

    stats_list = [
        ("73+", "Feature modules spanning design, engineering, project management, finance, and operations"),
        ("87", "Type-safe API endpoints (tRPC routers) providing comprehensive backend capabilities"),
        ("55+", "Database tables modeling the complete design-to-delivery domain"),
        ("5", "Major AI/ML systems: Design Generation, Floor Plan Digitization, Room Segmentation, Product Matching, 3D Reconstruction"),
        ("11", "Microservices (10 Python + 1 TypeScript) for specialized processing"),
        ("4", "Building code jurisdictions supported (NBC, IRC, Eurocode, UK Building Regs)"),
        ("10+", "Design styles with curated AI vocabularies"),
        ("6", "Export formats (DXF, PDF, SVG, IFC, glTF, G-code)"),
    ]

    for num, desc in stats_list:
        story.append(Paragraph(
            f'<b><font color="{HIGHLIGHT.hexval()}">{num}</font></b>  &mdash;  {desc}',
            ParagraphStyle("stat_line", parent=styles["BodyText2"], spaceBefore=4, spaceAfter=4)
        ))

    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=1, color=HIGHLIGHT, spaceBefore=8, spaceAfter=12))
    story.append(Paragraph(
        "<i>OpenLintel &mdash; End-to-end home design automation, from room photos to finished living spaces.</i>",
        ParagraphStyle("closing", parent=styles["BodyText2"], fontSize=12, alignment=TA_CENTER,
                      textColor=MUTED, fontName="Helvetica-Oblique")
    ))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "www.openlintel.com",
        ParagraphStyle("url", parent=styles["BodyText2"], fontSize=10, alignment=TA_CENTER,
                      textColor=BLUE, fontName="Helvetica-Bold")
    ))

    # ── Build PDF ───────────────────────────────────────────────────────
    def add_page_number(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(MUTED)
        canvas.drawCentredString(A4[0] / 2, 30, f"OpenLintel Feature Guide  |  Page {doc.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(f"PDF generated: {output_path}")
    return output_path


if __name__ == "__main__":
    build_pdf()
