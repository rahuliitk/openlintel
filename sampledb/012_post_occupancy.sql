-- ============================================================================
-- 012_post_occupancy.sql — Digital Twins, IoT, Maintenance, Warranties
-- ============================================================================

-- ---- Digital Twin (Delhi project - completed) ----

INSERT INTO digital_twins (id, project_id, model_storage_key, model_version, status, created_at, updated_at)
VALUES (
  'dt_del_001',
  'prj_delhi_003',
  'digital_twins/prj_delhi_003/model_v3.gltf',
  3,
  'active',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '5 days'
);

-- ---- IoT Devices ----

INSERT INTO iot_devices (id, digital_twin_id, name, device_type, position_json, room_id, status, created_at)
VALUES
  ('iot_temp_001', 'dt_del_001', 'Living Room Temperature', 'temperature', '{"x": 5.0, "y": 2.0, "z": 3.5}', 'room_del_living_001', 'active', NOW() - INTERVAL '14 days'),
  ('iot_humid_001', 'dt_del_001', 'Living Room Humidity', 'humidity', '{"x": 5.0, "y": 2.0, "z": 3.5}', 'room_del_living_001', 'active', NOW() - INTERVAL '14 days'),
  ('iot_energy_001', 'dt_del_001', 'Main Energy Meter', 'energy', '{"x": 0.5, "y": 1.5, "z": 0.0}', NULL, 'active', NOW() - INTERVAL '14 days'),
  ('iot_motion_001', 'dt_del_001', 'Study Motion Sensor', 'motion', '{"x": 2.0, "y": 2.5, "z": 1.75}', 'room_del_study_002', 'active', NOW() - INTERVAL '14 days'),
  ('iot_water_001', 'dt_del_001', 'Water Flow Meter', 'water', '{"x": 1.0, "y": 0.5, "z": 0.0}', NULL, 'active', NOW() - INTERVAL '14 days');

-- ---- IoT Data Points (sample time-series data) ----

INSERT INTO iot_data_points (id, device_id, value, unit, timestamp)
VALUES
  -- Temperature readings (last 24 hours)
  ('dp_temp_001', 'iot_temp_001', 24.5, 'celsius', NOW() - INTERVAL '24 hours'),
  ('dp_temp_002', 'iot_temp_001', 24.8, 'celsius', NOW() - INTERVAL '20 hours'),
  ('dp_temp_003', 'iot_temp_001', 25.2, 'celsius', NOW() - INTERVAL '16 hours'),
  ('dp_temp_004', 'iot_temp_001', 26.1, 'celsius', NOW() - INTERVAL '12 hours'),
  ('dp_temp_005', 'iot_temp_001', 25.8, 'celsius', NOW() - INTERVAL '8 hours'),
  ('dp_temp_006', 'iot_temp_001', 24.3, 'celsius', NOW() - INTERVAL '4 hours'),
  ('dp_temp_007', 'iot_temp_001', 23.9, 'celsius', NOW()),
  -- Humidity readings
  ('dp_humid_001', 'iot_humid_001', 55.2, 'percent', NOW() - INTERVAL '24 hours'),
  ('dp_humid_002', 'iot_humid_001', 58.1, 'percent', NOW() - INTERVAL '16 hours'),
  ('dp_humid_003', 'iot_humid_001', 52.4, 'percent', NOW() - INTERVAL '8 hours'),
  ('dp_humid_004', 'iot_humid_001', 54.0, 'percent', NOW()),
  -- Energy readings (kWh cumulative)
  ('dp_energy_001', 'iot_energy_001', 12.5, 'kWh', NOW() - INTERVAL '24 hours'),
  ('dp_energy_002', 'iot_energy_001', 18.2, 'kWh', NOW() - INTERVAL '16 hours'),
  ('dp_energy_003', 'iot_energy_001', 24.8, 'kWh', NOW() - INTERVAL '8 hours'),
  ('dp_energy_004', 'iot_energy_001', 28.3, 'kWh', NOW()),
  -- Water readings (litres cumulative)
  ('dp_water_001', 'iot_water_001', 150, 'litres', NOW() - INTERVAL '24 hours'),
  ('dp_water_002', 'iot_water_001', 280, 'litres', NOW() - INTERVAL '16 hours'),
  ('dp_water_003', 'iot_water_001', 410, 'litres', NOW() - INTERVAL '8 hours'),
  ('dp_water_004', 'iot_water_001', 495, 'litres', NOW());

-- ---- Emergency References ----

INSERT INTO emergency_references (id, project_id, type, label, description, location_description, position_json, room_id, created_at)
VALUES
  ('emr_del_001', 'prj_delhi_003', 'water_shutoff', 'Main Water Shutoff Valve', 'Quarter-turn ball valve. Turn clockwise to shut off.', 'Utility area behind kitchen, bottom-left of wall panel', '{"x": 0.3, "y": 0.5, "z": 0.0}', NULL, NOW() - INTERVAL '15 days'),
  ('emr_del_002', 'prj_delhi_003', 'electrical_breaker', 'Main Distribution Board', '32A main breaker + 8 MCBs. Labeled per circuit.', 'Entrance foyer, right wall behind shoe cabinet', '{"x": 0.5, "y": 1.5, "z": 0.0}', NULL, NOW() - INTERVAL '15 days'),
  ('emr_del_003', 'prj_delhi_003', 'gas_shutoff', 'Kitchen Gas Regulator', 'LPG regulator with safety valve. Turn red knob fully left.', 'Below kitchen countertop, near hob gas inlet', '{"x": 1.2, "y": 0.5, "z": 0.0}', NULL, NOW() - INTERVAL '15 days'),
  ('emr_del_004', 'prj_delhi_003', 'fire_extinguisher', 'Kitchen Fire Extinguisher', 'ABC dry powder 2kg. Expires Dec 2026. Pull pin, aim at base of fire.', 'Kitchen wall, left of entry door, eye height', '{"x": 0.2, "y": 1.4, "z": 0.0}', NULL, NOW() - INTERVAL '15 days');

-- ---- Maintenance Schedules ----

INSERT INTO maintenance_schedules (id, project_id, item_name, category, frequency_days, next_due_at, provider, estimated_cost, status, created_at)
VALUES
  ('maint_del_001', 'prj_delhi_003', 'AC Service & Filter Clean', 'hvac', 90, NOW() + INTERVAL '15 days', 'Voltas Service Center', 2500, 'active', NOW() - INTERVAL '15 days'),
  ('maint_del_002', 'prj_delhi_003', 'Water Purifier Filter Change', 'plumbing', 180, NOW() + INTERVAL '90 days', 'Kent Service', 3500, 'active', NOW() - INTERVAL '15 days'),
  ('maint_del_003', 'prj_delhi_003', 'Chimney Deep Clean', 'appliance', 120, NOW() + INTERVAL '30 days', 'Elica Service', 1500, 'active', NOW() - INTERVAL '15 days'),
  ('maint_del_004', 'prj_delhi_003', 'Wooden Floor Polish', 'structural', 365, NOW() + INTERVAL '180 days', 'Floor Care Experts', 15000, 'active', NOW() - INTERVAL '15 days'),
  ('maint_del_005', 'prj_delhi_003', 'Bathroom Sealant Inspection', 'plumbing', 180, NOW() + INTERVAL '75 days', 'VP Plumbing Services', 800, 'active', NOW() - INTERVAL '15 days');

-- ---- Maintenance Logs ----

INSERT INTO maintenance_logs (id, schedule_id, performed_at, performed_by, cost, notes, photo_keys)
VALUES
  ('mlog_del_001', 'maint_del_001', NOW() - INTERVAL '75 days', 'Voltas Technician - Ramesh K.', 2200, 'AC serviced. Filters cleaned. Gas top-up done. Cooling efficiency restored to 95%. Next service in 3 months.', '["maintenance/prj_delhi_003/ac_service_1.jpg"]'),
  ('mlog_del_002', 'maint_del_003', NOW() - INTERVAL '90 days', 'Elica Service - Mahesh', 1200, 'Chimney auto-clean activated. Baffle filters soaked and cleaned. Motor checked. Suction power optimal.', NULL);

-- ---- Warranties ----

INSERT INTO warranties (id, project_id, item_name, category, brand, serial_number, warranty_start_date, warranty_end_date, warranty_type, status, created_at)
VALUES
  ('war_del_001', 'prj_delhi_003', 'Bosch Dishwasher SMS66GI01I', 'appliance', 'Bosch', 'BSH-DW-2024-5521', NOW() - INTERVAL '180 days', NOW() + INTERVAL '545 days', 'manufacturer', 'active', NOW() - INTERVAL '15 days'),
  ('war_del_002', 'prj_delhi_003', 'Grohe Rainshower System', 'fixture', 'Grohe', 'GRH-RS-2024-8834', NOW() - INTERVAL '180 days', NOW() + INTERVAL '1545 days', 'manufacturer', 'active', NOW() - INTERVAL '15 days'),
  ('war_del_003', 'prj_delhi_003', 'Hettich Kitchen Hardware Set', 'material', 'Hettich', 'HET-KIT-2024-3302', NOW() - INTERVAL '180 days', NOW() + INTERVAL '3465 days', 'manufacturer', 'active', NOW() - INTERVAL '15 days'),
  ('war_del_004', 'prj_delhi_003', 'Waterproofing - Bathroom', 'system', NULL, NULL, NOW() - INTERVAL '170 days', NOW() + INTERVAL '1625 days', 'contractor', 'active', NOW() - INTERVAL '15 days'),
  ('war_del_005', 'prj_delhi_003', 'Italian Marble Flooring', 'material', NULL, NULL, NOW() - INTERVAL '160 days', NOW() + INTERVAL '205 days', 'contractor', 'active', NOW() - INTERVAL '15 days');

-- ---- Warranty Claims ----

INSERT INTO warranty_claims (id, warranty_id, issue_description, photo_keys, status, claim_date, resolution_date)
VALUES (
  'wc_del_001',
  'war_del_001',
  'Dishwasher making unusual rattling noise during wash cycle. Started after 4 months of use. No error code displayed.',
  '["warranty_claims/prj_delhi_003/dishwasher_issue_1.jpg"]',
  'resolved',
  NOW() - INTERVAL '45 days',
  NOW() - INTERVAL '38 days'
);

-- ---- Quality Checkpoints ----

INSERT INTO quality_checkpoints (id, project_id, milestone, title, description, trade, status, inspected_by, checklist_items, photo_keys, notes, inspected_at, created_at, updated_at)
VALUES
  ('qc_del_001', 'prj_delhi_003', 'waterproofing_complete', 'Bathroom Waterproofing Inspection', 'Verify waterproofing membrane integrity before tiling', 'waterproofing', 'passed', 'VP Plumbing - Vikram', '[{"item": "Membrane covers all wet areas", "checked": true, "note": null}, {"item": "Overlap minimum 150mm at joints", "checked": true, "note": "200mm overlap achieved"}, {"item": "Floor drain area sealed", "checked": true, "note": null}, {"item": "48-hour flood test passed", "checked": true, "note": "No leakage detected after 48hrs"}, {"item": "Wall membrane extends 1800mm", "checked": true, "note": "Full height to 2100mm in shower area"}]', '["quality/prj_delhi_003/waterproof_test_1.jpg", "quality/prj_delhi_003/waterproof_test_2.jpg"]', 'All checks passed. Flood test held 48 hours with no leakage. Approved for tiling.', NOW() - INTERVAL '140 days', NOW() - INTERVAL '145 days', NOW() - INTERVAL '140 days'),
  ('qc_del_002', 'prj_delhi_003', 'electrical_complete', 'Electrical Final Inspection', 'Verify all circuits, earthing, and fixtures before handover', 'electrical', 'passed', 'Suresh Electricals', '[{"item": "All circuits tested under load", "checked": true, "note": null}, {"item": "ELCB/RCCB functioning", "checked": true, "note": "30mA trip tested"}, {"item": "Earth resistance < 5 ohms", "checked": true, "note": "Measured: 2.8 ohms"}, {"item": "All switches and sockets functional", "checked": true, "note": "48 points verified"}, {"item": "MCB labels match circuit map", "checked": true, "note": null}]', '["quality/prj_delhi_003/elec_inspection_1.jpg"]', 'All electrical work meets IS 732:2019 standards.', NOW() - INTERVAL '30 days', NOW() - INTERVAL '35 days', NOW() - INTERVAL '30 days');

-- ---- Punch List Items ----

INSERT INTO punch_list_items (id, project_id, room_id, title, description, severity, category, status, assigned_to, photo_keys, location_pin, resolved_at, verified_at, created_at, updated_at)
VALUES
  ('pl_del_001', 'prj_delhi_003', 'room_del_living_001', 'Minor paint touch-up needed at ceiling cornice', 'Small area (approx 10cm) where paint has peeled at the junction of false ceiling and wall in the north-east corner.', 'minor', 'painting', 'verified', 'Paint contractor', '["punchlist/prj_delhi_003/paint_touchup_1.jpg"]', '{"x": 0.95, "y": 0.95}', NOW() - INTERVAL '18 days', NOW() - INTERVAL '16 days', NOW() - INTERVAL '22 days', NOW() - INTERVAL '16 days'),
  ('pl_del_002', 'prj_delhi_003', 'room_del_study_002', 'Bookshelf edge slightly rough at eye level', 'Third shelf from top has a rough laminate edge that catches fingers. Needs edge banding reapplication.', 'minor', 'carpentry', 'resolved', 'Raj Woodworks', '["punchlist/prj_delhi_003/shelf_edge_1.jpg"]', '{"x": 0.8, "y": 0.6}', NOW() - INTERVAL '17 days', NULL, NOW() - INTERVAL '22 days', NOW() - INTERVAL '17 days'),
  ('pl_del_003', 'prj_delhi_003', 'room_del_living_001', 'Brass inlay grout hairline crack', 'Very fine hairline crack in the grout around brass inlay near the bar cabinet area. Cosmetic only.', 'observation', 'tiling', 'open', NULL, '["punchlist/prj_delhi_003/grout_crack_1.jpg"]', '{"x": 0.3, "y": 0.7}', NULL, NULL, NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days');

-- ---- Handover Packages ----

INSERT INTO handover_packages (id, project_id, status, as_built_drawing_keys, material_register, contractor_directory, operational_guides, maintenance_manual_key, client_signed_at, delivered_at, created_at, updated_at)
VALUES (
  'ho_del_001',
  'prj_delhi_003',
  'delivered',
  '["handover/prj_delhi_003/as_built_floor_plan.pdf", "handover/prj_delhi_003/as_built_electrical.pdf", "handover/prj_delhi_003/as_built_plumbing.pdf"]',
  '[
    {"item": "Italian Marble - Nero Marquina", "brand": "Imported", "model": "NM-800x800-P", "batch": "IT-NM-2024-B12", "purchaseDate": "2024-08-15", "vendor": "Stone World Delhi"},
    {"item": "Bosch Dishwasher", "brand": "Bosch", "model": "SMS66GI01I", "batch": "BSH-2024-Q3", "purchaseDate": "2024-09-01", "vendor": "Bosch Home India"},
    {"item": "Art Deco Chandelier", "brand": "Flos", "model": "AD-CHAN-2024", "batch": "FL-IT-2024-55", "purchaseDate": "2024-07-20", "vendor": "Imported via LightStore Delhi"}
  ]',
  '[
    {"name": "Raj Woodworks", "trade": "Carpentry", "phone": "+91-9876543001", "email": "raj@rajwoodworks.in"},
    {"name": "Suresh Electricals", "trade": "Electrical", "phone": "+91-9876543002", "email": "suresh@gmail.com"},
    {"name": "VP Plumbing", "trade": "Plumbing", "phone": "+91-9876543003", "email": "vikram.plumber@gmail.com"},
    {"name": "Stone World Delhi", "trade": "Stone/Marble", "phone": "+91-11-26789012", "email": "info@stoneworld.in"}
  ]',
  '[
    {"system": "Central AC", "instructions": "Maintain temperature between 22-26C. Clean filters every 3 months. Annual gas top-up recommended."},
    {"system": "Motorized Blinds", "instructions": "Use Somfy app or wall switch. Reset: hold up+down for 5 seconds. Battery backup lasts 72 hours."},
    {"system": "Dishwasher", "instructions": "Use rinse aid monthly. Clean filter weekly. Run empty hot cycle with citric acid every 3 months."},
    {"system": "Waterproofing", "instructions": "Avoid drilling into bathroom walls below 1800mm height. Check sealant around shower glass annually."}
  ]',
  'handover/prj_delhi_003/maintenance_manual.pdf',
  NOW() - INTERVAL '16 days',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '20 days',
  NOW() - INTERVAL '15 days'
);
