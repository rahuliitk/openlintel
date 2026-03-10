-- ============================================================================
-- 004_jobs.sql — Async Job Records (all statuses represented)
-- ============================================================================

-- Completed design generation job
INSERT INTO jobs (id, user_id, type, status, input_json, output_json, error, progress, project_id, room_id, design_variant_id, created_at, started_at, completed_at)
VALUES (
  'job_design_001',
  'usr_alice_001',
  'design_generation',
  'completed',
  '{"style": "modern", "budgetTier": "mid_range", "roomId": "room_mum_living_001"}',
  '{"designVariantId": "dv_mum_liv_modern_001", "renderCount": 2}',
  NULL,
  100,
  'prj_mumbai_001',
  'room_mum_living_001',
  'dv_mum_liv_modern_001',
  NOW() - INTERVAL '40 days',
  NOW() - INTERVAL '40 days' + INTERVAL '5 seconds',
  NOW() - INTERVAL '40 days' + INTERVAL '50 seconds'
);

-- Completed BOM calculation job
INSERT INTO jobs (id, user_id, type, status, input_json, output_json, error, progress, project_id, room_id, design_variant_id, created_at, started_at, completed_at)
VALUES (
  'job_bom_001',
  'usr_alice_001',
  'bom_calculation',
  'completed',
  '{"designVariantId": "dv_mum_liv_modern_001"}',
  '{"bomResultId": "bom_mum_liv_001", "totalItems": 18, "totalCost": 285000}',
  NULL,
  100,
  'prj_mumbai_001',
  'room_mum_living_001',
  'dv_mum_liv_modern_001',
  NOW() - INTERVAL '38 days',
  NOW() - INTERVAL '38 days' + INTERVAL '3 seconds',
  NOW() - INTERVAL '38 days' + INTERVAL '25 seconds'
);

-- Completed drawing job
INSERT INTO jobs (id, user_id, type, status, input_json, output_json, error, progress, project_id, room_id, design_variant_id, created_at, started_at, completed_at)
VALUES (
  'job_drawing_001',
  'usr_alice_001',
  'drawing',
  'completed',
  '{"designVariantId": "dv_mum_liv_modern_001", "drawingTypes": ["floor_plan", "elevation", "electrical"]}',
  '{"drawingResultIds": ["draw_mum_fp_001", "draw_mum_elev_001", "draw_mum_elec_001"]}',
  NULL,
  100,
  'prj_mumbai_001',
  'room_mum_living_001',
  'dv_mum_liv_modern_001',
  NOW() - INTERVAL '37 days',
  NOW() - INTERVAL '37 days' + INTERVAL '2 seconds',
  NOW() - INTERVAL '37 days' + INTERVAL '90 seconds'
);

-- Running cut list job (in progress)
INSERT INTO jobs (id, user_id, type, status, input_json, output_json, error, progress, project_id, room_id, design_variant_id, created_at, started_at, completed_at)
VALUES (
  'job_cutlist_001',
  'usr_alice_001',
  'cutlist',
  'running',
  '{"designVariantId": "dv_mum_kit_modern_001"}',
  NULL,
  NULL,
  65,
  'prj_mumbai_001',
  'room_mum_kitchen_003',
  'dv_mum_kit_modern_001',
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '58 minutes',
  NULL
);

-- Pending MEP job
INSERT INTO jobs (id, user_id, type, status, input_json, output_json, error, progress, project_id, room_id, design_variant_id, created_at, started_at, completed_at)
VALUES (
  'job_mep_001',
  'usr_alice_001',
  'mep_calculation',
  'pending',
  '{"designVariantId": "dv_mum_liv_modern_001", "calcTypes": ["electrical", "plumbing"]}',
  NULL,
  NULL,
  0,
  'prj_mumbai_001',
  'room_mum_living_001',
  'dv_mum_liv_modern_001',
  NOW() - INTERVAL '30 minutes',
  NULL,
  NULL
);

-- Failed segmentation job
INSERT INTO jobs (id, user_id, type, status, input_json, output_json, error, progress, project_id, room_id, design_variant_id, created_at, started_at, completed_at)
VALUES (
  'job_segment_fail_001',
  'usr_alice_001',
  'segmentation',
  'failed',
  '{"uploadId": "upl_mum_001", "model": "sam2"}',
  NULL,
  'SAM2 model failed: CUDA out of memory. Tried to allocate 2.00 GiB',
  45,
  'prj_mumbai_001',
  'room_mum_living_001',
  NULL,
  NOW() - INTERVAL '35 days',
  NOW() - INTERVAL '35 days' + INTERVAL '10 seconds',
  NOW() - INTERVAL '35 days' + INTERVAL '120 seconds'
);

-- Completed floor plan digitization job
INSERT INTO jobs (id, user_id, type, status, input_json, output_json, error, progress, project_id, room_id, design_variant_id, created_at, started_at, completed_at)
VALUES (
  'job_floorplan_001',
  'usr_alice_001',
  'floor_plan_digitize',
  'completed',
  '{"uploadId": "upl_mum_004"}',
  '{"roomsDetected": 6, "dxfStorageKey": "outputs/prj_mumbai_001/floor_plan.dxf", "doorsDetected": 5, "windowsDetected": 8}',
  NULL,
  100,
  'prj_mumbai_001',
  NULL,
  NULL,
  NOW() - INTERVAL '43 days',
  NOW() - INTERVAL '43 days' + INTERVAL '5 seconds',
  NOW() - INTERVAL '43 days' + INTERVAL '35 seconds'
);

-- Cancelled job
INSERT INTO jobs (id, user_id, type, status, input_json, output_json, error, progress, project_id, room_id, design_variant_id, created_at, started_at, completed_at)
VALUES (
  'job_cancelled_001',
  'usr_alice_001',
  'design_generation',
  'cancelled',
  '{"style": "industrial", "budgetTier": "economy", "roomId": "room_mum_living_001"}',
  NULL,
  'Cancelled by user',
  10,
  'prj_mumbai_001',
  'room_mum_living_001',
  NULL,
  NOW() - INTERVAL '41 days',
  NOW() - INTERVAL '41 days' + INTERVAL '3 seconds',
  NOW() - INTERVAL '41 days' + INTERVAL '15 seconds'
);
