-- ============================================================================
-- 007_schedule_milestones.sql — Schedules, Milestones, Site Logs, Change Orders
-- ============================================================================

-- ---- Schedule for Mumbai Apartment ----

INSERT INTO schedules (id, project_id, job_id, tasks, critical_path, start_date, end_date, metadata, created_at, updated_at)
VALUES (
  'sch_mum_001',
  'prj_mumbai_001',
  NULL,
  '[
    {"id": "T1", "name": "Demolition & Clearing", "startDay": 0, "durationDays": 3, "dependencies": [], "trade": "general", "status": "completed"},
    {"id": "T2", "name": "Electrical Rough-In", "startDay": 3, "durationDays": 5, "dependencies": ["T1"], "trade": "electrical", "status": "completed"},
    {"id": "T3", "name": "Plumbing Rough-In", "startDay": 3, "durationDays": 4, "dependencies": ["T1"], "trade": "plumbing", "status": "completed"},
    {"id": "T4", "name": "Masonry & Wall Modifications", "startDay": 7, "durationDays": 5, "dependencies": ["T2", "T3"], "trade": "masonry", "status": "completed"},
    {"id": "T5", "name": "Waterproofing (Bathroom)", "startDay": 12, "durationDays": 3, "dependencies": ["T4"], "trade": "waterproofing", "status": "in_progress"},
    {"id": "T6", "name": "Tiling (Bathroom + Kitchen)", "startDay": 15, "durationDays": 7, "dependencies": ["T5"], "trade": "tiling", "status": "pending"},
    {"id": "T7", "name": "Kitchen Cabinet Installation", "startDay": 15, "durationDays": 5, "dependencies": ["T4"], "trade": "carpentry", "status": "pending"},
    {"id": "T8", "name": "Countertop Installation", "startDay": 20, "durationDays": 2, "dependencies": ["T7"], "trade": "stone_work", "status": "pending"},
    {"id": "T9", "name": "Flooring (Living + Bedrooms)", "startDay": 15, "durationDays": 5, "dependencies": ["T4"], "trade": "tiling", "status": "pending"},
    {"id": "T10", "name": "Electrical Fixtures", "startDay": 22, "durationDays": 3, "dependencies": ["T6", "T9"], "trade": "electrical", "status": "pending"},
    {"id": "T11", "name": "Plumbing Fixtures", "startDay": 22, "durationDays": 2, "dependencies": ["T6"], "trade": "plumbing", "status": "pending"},
    {"id": "T12", "name": "Painting", "startDay": 25, "durationDays": 5, "dependencies": ["T10", "T11"], "trade": "painting", "status": "pending"},
    {"id": "T13", "name": "Furniture Assembly & Placement", "startDay": 30, "durationDays": 3, "dependencies": ["T12"], "trade": "carpentry", "status": "pending"},
    {"id": "T14", "name": "Final Cleaning & Touch-up", "startDay": 33, "durationDays": 2, "dependencies": ["T13"], "trade": "general", "status": "pending"},
    {"id": "T15", "name": "QA Inspection & Handover", "startDay": 35, "durationDays": 1, "dependencies": ["T14"], "trade": "general", "status": "pending"}
  ]',
  '["T1", "T2", "T4", "T5", "T6", "T10", "T12", "T13", "T14", "T15"]',
  NOW() - INTERVAL '30 days',
  NOW() + INTERVAL '6 days',
  '{"totalDays": 36, "criticalPathDays": 36, "tradesInvolved": 8}',
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '1 day'
);

-- ---- Milestones ----

INSERT INTO milestones (id, schedule_id, name, description, due_date, completed_date, status, payment_linked, created_at)
VALUES
  ('ms_mum_001', 'sch_mum_001', 'Demolition Complete', 'All demolition work and site clearing finished', NOW() - INTERVAL '27 days', NOW() - INTERVAL '27 days', 'completed', true, NOW() - INTERVAL '30 days'),
  ('ms_mum_002', 'sch_mum_001', 'Rough-In Complete', 'Electrical and plumbing rough-in done. Ready for wall close.', NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days', 'completed', true, NOW() - INTERVAL '30 days'),
  ('ms_mum_003', 'sch_mum_001', 'Tiling & Kitchen Complete', 'All tiling done, kitchen cabinets and countertop installed', NOW() + INTERVAL '2 days', NULL, 'in_progress', true, NOW() - INTERVAL '30 days'),
  ('ms_mum_004', 'sch_mum_001', 'Final Handover', 'Full QA pass, cleaning done, keys handed over', NOW() + INTERVAL '6 days', NULL, 'pending', true, NOW() - INTERVAL '30 days');

-- ---- Site Logs ----

INSERT INTO site_logs (id, project_id, user_id, date, title, notes, weather, workers_on_site, photo_keys, tags, created_at)
VALUES
  ('sl_mum_001', 'prj_mumbai_001', 'usr_alice_001', NOW() - INTERVAL '27 days', 'Demolition Day 3 - Complete', 'All old flooring removed. Kitchen cabinets dismantled. Walls prepared for replastering. Debris cleared.', 'sunny', 6, '["site_logs/prj_mumbai_001/demo_day3_1.jpg", "site_logs/prj_mumbai_001/demo_day3_2.jpg"]', '["demolition", "milestone"]', NOW() - INTERVAL '27 days'),
  ('sl_mum_002', 'prj_mumbai_001', 'usr_alice_001', NOW() - INTERVAL '22 days', 'Electrical Rough-In Progress', 'Conduit laid for living room and master bedroom. 3 new circuits planned. Waiting for switch plate positions confirmation.', 'cloudy', 3, '["site_logs/prj_mumbai_001/elec_roughin_1.jpg"]', '["electrical", "rough_in"]', NOW() - INTERVAL '22 days'),
  ('sl_mum_003', 'prj_mumbai_001', 'usr_alice_001', NOW() - INTERVAL '18 days', 'Plumbing & Masonry Done', 'All plumbing rough-in complete. Kitchen waste pipe relocated. Masonry modifications done for bathroom niche.', 'rainy', 5, '["site_logs/prj_mumbai_001/plumb_done_1.jpg", "site_logs/prj_mumbai_001/masonry_done_1.jpg"]', '["plumbing", "masonry", "milestone"]', NOW() - INTERVAL '18 days'),
  ('sl_mum_004', 'prj_mumbai_001', 'usr_alice_001', NOW() - INTERVAL '2 days', 'Waterproofing In Progress', 'Bathroom waterproofing 60% done. Applied 2 coats of polymer-modified cementitious coating. Flood test scheduled tomorrow.', 'sunny', 3, '["site_logs/prj_mumbai_001/waterproof_1.jpg"]', '["waterproofing", "bathroom"]', NOW() - INTERVAL '2 days');

-- ---- Change Orders ----

INSERT INTO change_orders (id, project_id, user_id, title, description, status, cost_impact, time_impact_days, approved_by, approved_at, created_at)
VALUES
  ('co_mum_001', 'prj_mumbai_001', 'usr_alice_001', 'Upgrade Kitchen Countertop to Quartz', 'Client requested upgrade from granite to Calacatta White quartz countertop. Original spec was black granite at INR 3500/sqm, new spec is quartz at INR 12000/sqm.', 'approved', 38250, 1, 'usr_alice_001', NOW() - INTERVAL '25 days', NOW() - INTERVAL '26 days'),
  ('co_mum_002', 'prj_mumbai_001', 'usr_alice_001', 'Add Accent Wall in Living Room', 'Client wants a textured stone veneer accent wall on the TV wall (3m x 2.8m). Requires additional material and 2 days labor.', 'proposed', 28000, 2, NULL, NULL, NOW() - INTERVAL '5 days'),
  ('co_mum_003', 'prj_mumbai_001', 'usr_alice_001', 'Relocate AC Outdoor Unit', 'Building society requires AC outdoor unit on balcony instead of external wall. Additional piping needed.', 'approved', 5500, 0, 'usr_alice_001', NOW() - INTERVAL '20 days', NOW() - INTERVAL '21 days');
