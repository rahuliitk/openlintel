-- ============================================================================
-- 005_bom_drawings_cutlist_mep.sql — Technical Outputs
-- ============================================================================

-- ---- BOM Results ----

-- Mumbai Living Room BOM
INSERT INTO bom_results (id, design_variant_id, job_id, items, total_cost, currency, metadata, created_at)
VALUES (
  'bom_mum_liv_001',
  'dv_mum_liv_modern_001',
  'job_bom_001',
  '[
    {"category": "furniture", "name": "3-Seater Fabric Sofa - Grey", "quantity": 1, "unit": "piece", "unitPrice": 45000, "totalPrice": 45000, "vendor": "Urban Ladder"},
    {"category": "furniture", "name": "Walnut Coffee Table", "quantity": 1, "unit": "piece", "unitPrice": 12000, "totalPrice": 12000, "vendor": "Pepperfry"},
    {"category": "furniture", "name": "TV Unit - White Matte 1800mm", "quantity": 1, "unit": "piece", "unitPrice": 22000, "totalPrice": 22000, "vendor": "Custom"},
    {"category": "furniture", "name": "Bookshelf 800x300x1800mm", "quantity": 1, "unit": "piece", "unitPrice": 15000, "totalPrice": 15000, "vendor": "Custom"},
    {"category": "flooring", "name": "Vitrified Tiles 600x600mm Light Grey", "quantity": 34, "unit": "sqm", "unitPrice": 850, "totalPrice": 28900, "vendor": "Kajaria"},
    {"category": "flooring", "name": "Tile Adhesive", "quantity": 10, "unit": "bag", "unitPrice": 450, "totalPrice": 4500, "vendor": "MYK Laticrete"},
    {"category": "flooring", "name": "Tile Spacers 2mm", "quantity": 5, "unit": "pack", "unitPrice": 120, "totalPrice": 600, "vendor": "Local"},
    {"category": "lighting", "name": "Recessed LED Downlight 12W", "quantity": 6, "unit": "piece", "unitPrice": 650, "totalPrice": 3900, "vendor": "Philips"},
    {"category": "lighting", "name": "Pendant Light - Geometric", "quantity": 1, "unit": "piece", "unitPrice": 8500, "totalPrice": 8500, "vendor": "Jainsons"},
    {"category": "paint", "name": "Asian Paints Royale Matt - Off White", "quantity": 4, "unit": "litre", "unitPrice": 750, "totalPrice": 3000, "vendor": "Asian Paints"},
    {"category": "paint", "name": "Asian Paints Royale Matt - Navy Accent", "quantity": 2, "unit": "litre", "unitPrice": 750, "totalPrice": 1500, "vendor": "Asian Paints"},
    {"category": "paint", "name": "Primer & Putty", "quantity": 1, "unit": "set", "unitPrice": 3500, "totalPrice": 3500, "vendor": "Asian Paints"},
    {"category": "hardware", "name": "Curtain Rod - Brushed Nickel 2.5m", "quantity": 2, "unit": "piece", "unitPrice": 1800, "totalPrice": 3600, "vendor": "Curtain World"},
    {"category": "fabric", "name": "Blackout Curtains - Grey", "quantity": 2, "unit": "pair", "unitPrice": 3500, "totalPrice": 7000, "vendor": "D Decor"},
    {"category": "electrical", "name": "Modular Switch Plates", "quantity": 8, "unit": "piece", "unitPrice": 350, "totalPrice": 2800, "vendor": "Legrand"},
    {"category": "electrical", "name": "5A/15A Sockets", "quantity": 12, "unit": "piece", "unitPrice": 180, "totalPrice": 2160, "vendor": "Legrand"},
    {"category": "hardware", "name": "Wall Mounting Hardware Kit", "quantity": 1, "unit": "set", "unitPrice": 1200, "totalPrice": 1200, "vendor": "Fischer"},
    {"category": "miscellaneous", "name": "Labour - Installation", "quantity": 1, "unit": "lumpsum", "unitPrice": 35000, "totalPrice": 35000, "vendor": "Contractor"}
  ]',
  198160,
  'INR',
  '{"roomArea_sqm": 20, "costPerSqm": 9908}',
  NOW() - INTERVAL '38 days'
);

-- Mumbai Kitchen BOM
INSERT INTO bom_results (id, design_variant_id, job_id, items, total_cost, currency, metadata, created_at)
VALUES (
  'bom_mum_kit_001',
  'dv_mum_kit_modern_001',
  NULL,
  '[
    {"category": "cabinets", "name": "Upper Cabinets - White Gloss Laminate", "quantity": 6, "unit": "piece", "unitPrice": 8500, "totalPrice": 51000, "vendor": "Custom"},
    {"category": "cabinets", "name": "Lower Cabinets - Grey Matte Laminate", "quantity": 8, "unit": "piece", "unitPrice": 9500, "totalPrice": 76000, "vendor": "Custom"},
    {"category": "countertop", "name": "Quartz Countertop - Calacatta White", "quantity": 4.5, "unit": "sqm", "unitPrice": 12000, "totalPrice": 54000, "vendor": "Kalinga Stone"},
    {"category": "backsplash", "name": "Subway Tiles 75x150mm White", "quantity": 5, "unit": "sqm", "unitPrice": 1200, "totalPrice": 6000, "vendor": "Johnson"},
    {"category": "sink", "name": "SS Undermount Double Bowl Sink", "quantity": 1, "unit": "piece", "unitPrice": 8500, "totalPrice": 8500, "vendor": "Franke"},
    {"category": "appliances", "name": "Elica Kitchen Chimney 90cm", "quantity": 1, "unit": "piece", "unitPrice": 15000, "totalPrice": 15000, "vendor": "Elica"},
    {"category": "appliances", "name": "Bosch 4-Burner Gas Hob", "quantity": 1, "unit": "piece", "unitPrice": 22000, "totalPrice": 22000, "vendor": "Bosch"},
    {"category": "appliances", "name": "Built-in Microwave", "quantity": 1, "unit": "piece", "unitPrice": 18000, "totalPrice": 18000, "vendor": "IFB"},
    {"category": "hardware", "name": "Soft-Close Hinges (pair)", "quantity": 28, "unit": "pair", "unitPrice": 250, "totalPrice": 7000, "vendor": "Hettich"},
    {"category": "hardware", "name": "Telescopic Drawer Channels", "quantity": 16, "unit": "pair", "unitPrice": 550, "totalPrice": 8800, "vendor": "Hettich"},
    {"category": "plumbing", "name": "Kitchen Tap - Pull Down", "quantity": 1, "unit": "piece", "unitPrice": 6500, "totalPrice": 6500, "vendor": "Grohe"}
  ]',
  272800,
  'INR',
  '{"roomArea_sqm": 8.75, "costPerSqm": 31177}',
  NOW() - INTERVAL '36 days'
);

-- ---- Drawing Results ----

-- Mumbai Living Room Floor Plan
INSERT INTO drawing_results (id, design_variant_id, job_id, drawing_type, dxf_storage_key, pdf_storage_key, svg_storage_key, ifc_storage_key, metadata, created_at)
VALUES
  ('draw_mum_fp_001', 'dv_mum_liv_modern_001', 'job_drawing_001', 'floor_plan', 'drawings/prj_mumbai_001/living_floor_plan.dxf', 'drawings/prj_mumbai_001/living_floor_plan.pdf', 'drawings/prj_mumbai_001/living_floor_plan.svg', NULL, '{"scale": "1:50", "paperSize": "A3"}', NOW() - INTERVAL '37 days'),
  ('draw_mum_elev_001', 'dv_mum_liv_modern_001', 'job_drawing_001', 'elevation', 'drawings/prj_mumbai_001/living_elevation.dxf', 'drawings/prj_mumbai_001/living_elevation.pdf', NULL, NULL, '{"scale": "1:25", "walls": ["north", "south", "east", "west"]}', NOW() - INTERVAL '37 days'),
  ('draw_mum_elec_001', 'dv_mum_liv_modern_001', 'job_drawing_001', 'electrical', 'drawings/prj_mumbai_001/living_electrical.dxf', 'drawings/prj_mumbai_001/living_electrical.pdf', NULL, NULL, '{"scale": "1:50", "circuits": 3}', NOW() - INTERVAL '37 days');

-- Delhi Penthouse Drawings (completed project)
INSERT INTO drawing_results (id, design_variant_id, job_id, drawing_type, dxf_storage_key, pdf_storage_key, svg_storage_key, ifc_storage_key, metadata, created_at)
VALUES
  ('draw_del_fp_001', 'dv_del_liv_artdeco_001', NULL, 'floor_plan', 'drawings/prj_delhi_003/living_floor_plan.dxf', 'drawings/prj_delhi_003/living_floor_plan.pdf', 'drawings/prj_delhi_003/living_floor_plan.svg', 'drawings/prj_delhi_003/living.ifc', '{"scale": "1:50"}', NOW() - INTERVAL '150 days'),
  ('draw_del_rcp_001', 'dv_del_liv_artdeco_001', NULL, 'rcp', 'drawings/prj_delhi_003/living_rcp.dxf', 'drawings/prj_delhi_003/living_rcp.pdf', NULL, NULL, '{"scale": "1:50", "ceilingType": "false_ceiling_with_coves"}', NOW() - INTERVAL '150 days');

-- ---- Cut List Results ----

-- Mumbai Kitchen Cut List
INSERT INTO cutlist_results (id, design_variant_id, job_id, panels, hardware, nesting_result, total_sheets, waste_percent, created_at)
VALUES (
  'cl_mum_kit_001',
  'dv_mum_kit_modern_001',
  NULL,
  '[
    {"partName": "Upper Cabinet Side Panel", "material": "18mm BWP Plywood", "length": 720, "width": 300, "quantity": 12, "grainDirection": "vertical", "edgeBanding": ["front"], "laminate": "white_gloss"},
    {"partName": "Upper Cabinet Top/Bottom", "material": "18mm BWP Plywood", "length": 564, "width": 300, "quantity": 12, "grainDirection": "horizontal", "edgeBanding": ["front"], "laminate": "white_gloss"},
    {"partName": "Upper Cabinet Shelf", "material": "18mm BWP Plywood", "length": 560, "width": 280, "quantity": 6, "grainDirection": "horizontal", "edgeBanding": ["front"], "laminate": "white_gloss"},
    {"partName": "Lower Cabinet Side Panel", "material": "18mm BWP Plywood", "length": 820, "width": 560, "quantity": 16, "grainDirection": "vertical", "edgeBanding": ["front"], "laminate": "grey_matte"},
    {"partName": "Lower Cabinet Top/Bottom", "material": "18mm BWP Plywood", "length": 564, "width": 560, "quantity": 16, "grainDirection": "horizontal", "edgeBanding": ["front"], "laminate": "grey_matte"},
    {"partName": "Drawer Front", "material": "18mm BWP Plywood", "length": 596, "width": 200, "quantity": 16, "grainDirection": "horizontal", "edgeBanding": ["all"], "laminate": "grey_matte"},
    {"partName": "Drawer Box Side", "material": "12mm Plywood", "length": 500, "width": 150, "quantity": 32, "grainDirection": "horizontal", "edgeBanding": [], "laminate": "none"},
    {"partName": "Drawer Box Front/Back", "material": "12mm Plywood", "length": 536, "width": 150, "quantity": 32, "grainDirection": "horizontal", "edgeBanding": [], "laminate": "none"},
    {"partName": "Drawer Box Bottom", "material": "6mm Plywood", "length": 536, "width": 500, "quantity": 16, "grainDirection": "any", "edgeBanding": [], "laminate": "none"}
  ]',
  '[
    {"type": "hinge_soft_close", "quantity": 28, "brand": "Hettich"},
    {"type": "drawer_channel_telescopic_500mm", "quantity": 16, "brand": "Hettich"},
    {"type": "handle_bar_160mm", "quantity": 22, "brand": "Hafele"},
    {"type": "shelf_support_pin", "quantity": 24, "brand": "Generic"}
  ]',
  '{"sheets": [{"sheetId": 1, "material": "18mm BWP Plywood", "sheetSize": {"l": 2440, "w": 1220}, "panels": [{"partName": "Lower Cabinet Side Panel", "x": 0, "y": 0, "rotated": false}, {"partName": "Lower Cabinet Side Panel", "x": 820, "y": 0, "rotated": false}], "utilizationPercent": 87.3}, {"sheetId": 2, "material": "18mm BWP Plywood", "sheetSize": {"l": 2440, "w": 1220}, "panels": [], "utilizationPercent": 91.1}], "totalSheets18mm": 7, "totalSheets12mm": 3, "totalSheets6mm": 2}',
  12,
  4.8,
  NOW() - INTERVAL '35 days'
);

-- ---- MEP Calculations ----

-- Mumbai Living Room Electrical
INSERT INTO mep_calculations (id, design_variant_id, job_id, calc_type, result, standards_cited, created_at)
VALUES (
  'mep_mum_elec_001',
  'dv_mum_liv_modern_001',
  NULL,
  'electrical',
  '{
    "loadSummary": {"totalLoad_watts": 2850, "circuitBreaker_amps": 20, "wireGauge": "2.5 sqmm"},
    "circuits": [
      {"name": "Lighting Circuit", "load_watts": 450, "breaker_amps": 6, "wireGauge": "1.5 sqmm", "outlets": ["6x recessed downlight", "1x pendant"]},
      {"name": "Power Circuit 1", "load_watts": 1200, "breaker_amps": 16, "wireGauge": "2.5 sqmm", "outlets": ["4x 15A socket"]},
      {"name": "Power Circuit 2 (AC)", "load_watts": 1200, "breaker_amps": 16, "wireGauge": "4 sqmm", "outlets": ["1x AC dedicated", "2x 15A socket"]}
    ],
    "switchLayout": [
      {"location": "entry_door", "switches": ["main_lights", "accent_lights", "fan_regulator"]},
      {"location": "balcony_door", "switches": ["balcony_light"]}
    ]
  }',
  '["IS 732:2019 - Wiring installations", "NEC 2020 Article 210 - Branch Circuits", "IS 3043 - Earthing"]',
  NOW() - INTERVAL '36 days'
);

-- Mumbai Kitchen Plumbing
INSERT INTO mep_calculations (id, design_variant_id, job_id, calc_type, result, standards_cited, created_at)
VALUES (
  'mep_mum_plumb_001',
  'dv_mum_kit_modern_001',
  NULL,
  'plumbing',
  '{
    "fixtureUnits": {"sink_double": 3, "dishwasher": 2, "total": 5},
    "supplyPipe": {"coldWater": "20mm CPVC", "hotWater": "20mm CPVC"},
    "drainPipe": {"size": "50mm PVC", "slope": "1:40", "trapType": "P-trap"},
    "ventPipe": {"size": "40mm PVC", "connectTo": "main_vent_stack"},
    "waterHeater": {"type": "instant", "capacity_litres": 3, "location": "under_sink"}
  }',
  '["IPC 2021 Table 709.1 - Fixture Units", "IS 2065 - CPVC Pipes", "IS 1172 - Water Supply Code"]',
  NOW() - INTERVAL '35 days'
);
