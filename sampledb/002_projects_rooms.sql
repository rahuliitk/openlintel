-- ============================================================================
-- 002_projects_rooms.sql — Projects and Rooms
-- ============================================================================

-- Project 1: Mumbai Apartment (active, in construction phase)
INSERT INTO projects (id, user_id, name, status, address, unit_system, created_at, updated_at)
VALUES (
  'prj_mumbai_001',
  'usr_alice_001',
  'Mumbai 2BHK Apartment Renovation',
  'in_progress',
  '504 Sea View Towers, Bandra West, Mumbai 400050',
  'metric',
  NOW() - INTERVAL '45 days',
  NOW() - INTERVAL '1 day'
);

-- Project 2: Bangalore Villa (design phase)
INSERT INTO projects (id, user_id, name, status, address, unit_system, created_at, updated_at)
VALUES (
  'prj_blr_002',
  'usr_alice_001',
  'Bangalore Villa Interior Design',
  'draft',
  '12 Koramangala 4th Block, Bangalore 560034',
  'metric',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '2 days'
);

-- Project 3: Delhi Penthouse (completed)
INSERT INTO projects (id, user_id, name, status, address, unit_system, created_at, updated_at)
VALUES (
  'prj_delhi_003',
  'usr_bob_002',
  'Delhi Penthouse Redesign',
  'completed',
  '1501 DLF Magnolias, Gurugram 122009',
  'metric',
  NOW() - INTERVAL '180 days',
  NOW() - INTERVAL '15 days'
);

-- ---- Rooms for Project 1: Mumbai Apartment ----

-- Living Room
INSERT INTO rooms (id, project_id, name, type, length_mm, width_mm, height_mm, floor, metadata, created_at, updated_at)
VALUES (
  'room_mum_living_001',
  'prj_mumbai_001',
  'Main Living Room',
  'living_room',
  5000,
  4000,
  2800,
  0,
  '{"windows": 2, "doors": 1, "balconyAccess": true}',
  NOW() - INTERVAL '44 days',
  NOW() - INTERVAL '3 days'
);

-- Master Bedroom
INSERT INTO rooms (id, project_id, name, type, length_mm, width_mm, height_mm, floor, metadata, created_at, updated_at)
VALUES (
  'room_mum_master_002',
  'prj_mumbai_001',
  'Master Bedroom',
  'bedroom',
  4500,
  3500,
  2800,
  0,
  '{"windows": 1, "doors": 1, "hasAttachedBath": true}',
  NOW() - INTERVAL '44 days',
  NOW() - INTERVAL '3 days'
);

-- Kitchen
INSERT INTO rooms (id, project_id, name, type, length_mm, width_mm, height_mm, floor, metadata, created_at, updated_at)
VALUES (
  'room_mum_kitchen_003',
  'prj_mumbai_001',
  'Modular Kitchen',
  'kitchen',
  3500,
  2500,
  2800,
  0,
  '{"layout": "L-shaped", "hasChimney": true, "gasConnection": true}',
  NOW() - INTERVAL '44 days',
  NOW() - INTERVAL '5 days'
);

-- Bathroom
INSERT INTO rooms (id, project_id, name, type, length_mm, width_mm, height_mm, floor, metadata, created_at, updated_at)
VALUES (
  'room_mum_bath_004',
  'prj_mumbai_001',
  'Master Bathroom',
  'bathroom',
  2500,
  2000,
  2800,
  0,
  '{"hasShower": true, "hasBathtub": false, "waterproofed": true}',
  NOW() - INTERVAL '44 days',
  NOW() - INTERVAL '5 days'
);

-- ---- Rooms for Project 2: Bangalore Villa ----

-- Living Room
INSERT INTO rooms (id, project_id, name, type, length_mm, width_mm, height_mm, floor, metadata, created_at, updated_at)
VALUES (
  'room_blr_living_001',
  'prj_blr_002',
  'Open Plan Living + Dining',
  'living_room',
  8000,
  5500,
  3200,
  0,
  '{"windows": 4, "doors": 2, "doubleHeight": false}',
  NOW() - INTERVAL '9 days',
  NOW() - INTERVAL '3 days'
);

-- Kids Room
INSERT INTO rooms (id, project_id, name, type, length_mm, width_mm, height_mm, floor, metadata, created_at, updated_at)
VALUES (
  'room_blr_kids_002',
  'prj_blr_002',
  'Kids Room',
  'kids_room',
  3500,
  3000,
  3200,
  1,
  '{"windows": 1, "doors": 1, "studyArea": true}',
  NOW() - INTERVAL '8 days',
  NOW() - INTERVAL '3 days'
);

-- ---- Rooms for Project 3: Delhi Penthouse ----

-- Living Room
INSERT INTO rooms (id, project_id, name, type, length_mm, width_mm, height_mm, floor, metadata, created_at, updated_at)
VALUES (
  'room_del_living_001',
  'prj_delhi_003',
  'Penthouse Living Area',
  'living_room',
  10000,
  7000,
  3500,
  0,
  '{"windows": 6, "doors": 3, "panoramicView": true}',
  NOW() - INTERVAL '170 days',
  NOW() - INTERVAL '20 days'
);

-- Study
INSERT INTO rooms (id, project_id, name, type, length_mm, width_mm, height_mm, floor, metadata, created_at, updated_at)
VALUES (
  'room_del_study_002',
  'prj_delhi_003',
  'Home Office / Study',
  'study',
  4000,
  3500,
  3500,
  0,
  '{"windows": 2, "doors": 1, "builtInShelves": true}',
  NOW() - INTERVAL '170 days',
  NOW() - INTERVAL '20 days'
);
