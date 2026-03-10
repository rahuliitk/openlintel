-- ============================================================================
-- 003_uploads_designs.sql — Uploads and Design Variants
-- ============================================================================

-- ---- Uploads for Mumbai Apartment ----

INSERT INTO uploads (id, user_id, project_id, room_id, filename, mime_type, size_bytes, storage_key, category, thumbnail_key, image_hash, created_at)
VALUES
  ('upl_mum_001', 'usr_alice_001', 'prj_mumbai_001', 'room_mum_living_001', 'living_room_photo_1.jpg', 'image/jpeg', 2450000, 'uploads/prj_mumbai_001/living_room_photo_1.jpg', 'photo', 'thumbnails/prj_mumbai_001/living_room_photo_1_thumb.jpg', 'phash_a1b2c3d4', NOW() - INTERVAL '43 days'),
  ('upl_mum_002', 'usr_alice_001', 'prj_mumbai_001', 'room_mum_living_001', 'living_room_photo_2.jpg', 'image/jpeg', 1980000, 'uploads/prj_mumbai_001/living_room_photo_2.jpg', 'photo', 'thumbnails/prj_mumbai_001/living_room_photo_2_thumb.jpg', 'phash_e5f6g7h8', NOW() - INTERVAL '43 days'),
  ('upl_mum_003', 'usr_alice_001', 'prj_mumbai_001', 'room_mum_kitchen_003', 'kitchen_photo_1.jpg', 'image/jpeg', 3100000, 'uploads/prj_mumbai_001/kitchen_photo_1.jpg', 'photo', 'thumbnails/prj_mumbai_001/kitchen_photo_1_thumb.jpg', 'phash_i9j0k1l2', NOW() - INTERVAL '42 days'),
  ('upl_mum_004', 'usr_alice_001', 'prj_mumbai_001', NULL, 'floor_plan_2bhk.pdf', 'application/pdf', 5200000, 'uploads/prj_mumbai_001/floor_plan_2bhk.pdf', 'floor_plan', NULL, NULL, NOW() - INTERVAL '44 days');

-- ---- Uploads for Bangalore Villa ----

INSERT INTO uploads (id, user_id, project_id, room_id, filename, mime_type, size_bytes, storage_key, category, thumbnail_key, image_hash, created_at)
VALUES
  ('upl_blr_001', 'usr_alice_001', 'prj_blr_002', 'room_blr_living_001', 'villa_living_room.jpg', 'image/jpeg', 4200000, 'uploads/prj_blr_002/villa_living_room.jpg', 'photo', 'thumbnails/prj_blr_002/villa_living_room_thumb.jpg', 'phash_m3n4o5p6', NOW() - INTERVAL '8 days'),
  ('upl_blr_002', 'usr_alice_001', 'prj_blr_002', NULL, 'villa_floor_plan.png', 'image/png', 6800000, 'uploads/prj_blr_002/villa_floor_plan.png', 'floor_plan', NULL, NULL, NOW() - INTERVAL '9 days');

-- ---- Design Variants for Mumbai Living Room ----

-- Modern Mid-Range
INSERT INTO design_variants (id, room_id, name, style, budget_tier, render_url, spec_json, source_upload_id, prompt_used, constraints, render_urls, metadata, created_at)
VALUES (
  'dv_mum_liv_modern_001',
  'room_mum_living_001',
  'Modern Minimalist Living',
  'modern',
  'mid_range',
  'renders/prj_mumbai_001/living_modern_v1.jpg',
  '{"furniture": [{"type": "sofa", "material": "fabric", "color": "grey", "dimensions": {"l": 2200, "w": 900, "h": 850}}, {"type": "coffee_table", "material": "wood", "finish": "walnut", "dimensions": {"l": 1200, "w": 600, "h": 450}}, {"type": "tv_unit", "material": "engineered_wood", "finish": "white_matte", "dimensions": {"l": 1800, "w": 400, "h": 500}}, {"type": "bookshelf", "material": "wood", "dimensions": {"l": 800, "w": 300, "h": 1800}}], "flooring": {"type": "vitrified_tiles", "size": "600x600mm", "color": "light_grey"}, "lighting": [{"type": "recessed", "count": 6}, {"type": "pendant", "count": 1}], "paint": {"walls": "#F5F5F0", "accent": "#2C3E50"}}',
  'upl_mum_001',
  'Design a modern minimalist living room for a 5m x 4m space with 2 windows and balcony access',
  '["keep existing AC location", "child-safe corners", "budget under 5 lakh INR"]',
  '["renders/prj_mumbai_001/living_modern_v1.jpg", "renders/prj_mumbai_001/living_modern_v1_angle2.jpg"]',
  '{"generationTimeMs": 45200, "modelProvider": "openai", "modelId": "gpt-4o"}',
  NOW() - INTERVAL '40 days'
);

-- Scandinavian Premium
INSERT INTO design_variants (id, room_id, name, style, budget_tier, render_url, spec_json, source_upload_id, prompt_used, constraints, render_urls, metadata, created_at)
VALUES (
  'dv_mum_liv_scandi_002',
  'room_mum_living_001',
  'Scandinavian Warm Living',
  'scandinavian',
  'premium',
  'renders/prj_mumbai_001/living_scandi_v1.jpg',
  '{"furniture": [{"type": "sofa", "material": "linen", "color": "cream", "dimensions": {"l": 2400, "w": 950, "h": 800}}, {"type": "coffee_table", "material": "oak", "finish": "natural", "dimensions": {"l": 1100, "w": 550, "h": 400}}, {"type": "sideboard", "material": "oak", "finish": "natural", "dimensions": {"l": 1600, "w": 450, "h": 750}}], "flooring": {"type": "engineered_wood", "species": "oak", "finish": "matte"}, "lighting": [{"type": "track", "count": 4}, {"type": "floor_lamp", "count": 2}], "paint": {"walls": "#FFFFFF", "accent": "#D4C5A9"}}',
  'upl_mum_001',
  'Design a warm Scandinavian living room with natural materials',
  '["natural wood preferred", "lots of natural light", "cozy reading corner"]',
  '["renders/prj_mumbai_001/living_scandi_v1.jpg"]',
  '{"generationTimeMs": 52300, "modelProvider": "anthropic", "modelId": "claude-3-opus"}',
  NOW() - INTERVAL '39 days'
);

-- ---- Design Variants for Mumbai Kitchen ----

INSERT INTO design_variants (id, room_id, name, style, budget_tier, render_url, spec_json, source_upload_id, prompt_used, constraints, render_urls, metadata, created_at)
VALUES (
  'dv_mum_kit_modern_001',
  'room_mum_kitchen_003',
  'Modern L-Shaped Kitchen',
  'modern',
  'mid_range',
  'renders/prj_mumbai_001/kitchen_modern_v1.jpg',
  '{"cabinets": {"upper": {"material": "plywood_laminate", "finish": "white_gloss", "count": 6}, "lower": {"material": "plywood_laminate", "finish": "grey_matte", "count": 8}}, "countertop": {"material": "quartz", "color": "calacatta_white", "thickness_mm": 20}, "backsplash": {"material": "subway_tile", "color": "white", "size": "75x150mm"}, "appliances": [{"type": "chimney", "brand": "Elica"}, {"type": "hob", "brand": "Bosch", "burners": 4}, {"type": "microwave", "built_in": true}], "sink": {"type": "undermount", "material": "stainless_steel", "bowls": 2}}',
  'upl_mum_003',
  'Design a modern L-shaped modular kitchen for a 3.5m x 2.5m space',
  '["gas connection on east wall", "chimney above hob", "maximize storage"]',
  '["renders/prj_mumbai_001/kitchen_modern_v1.jpg"]',
  '{"generationTimeMs": 38900, "modelProvider": "openai", "modelId": "gpt-4o"}',
  NOW() - INTERVAL '38 days'
);

-- ---- Design Variants for Bangalore Living ----

INSERT INTO design_variants (id, room_id, name, style, budget_tier, render_url, spec_json, source_upload_id, prompt_used, constraints, render_urls, metadata, created_at)
VALUES (
  'dv_blr_liv_contemporary_001',
  'room_blr_living_001',
  'Contemporary Open Plan',
  'contemporary',
  'luxury',
  'renders/prj_blr_002/living_contemporary_v1.jpg',
  '{"furniture": [{"type": "sectional_sofa", "material": "italian_leather", "color": "tan", "dimensions": {"l": 3200, "w": 1800, "h": 850}}, {"type": "dining_table", "material": "marble_top_teak_base", "seats": 8, "dimensions": {"l": 2400, "w": 1100, "h": 750}}], "flooring": {"type": "italian_marble", "variety": "statuario", "size": "800x800mm"}, "lighting": [{"type": "chandelier", "count": 1}, {"type": "cove", "length_m": 12}], "paint": {"walls": "#FAF9F6", "accent": "#8B7355"}}',
  'upl_blr_001',
  'Design a luxury contemporary open plan living and dining area for a villa',
  '["8-seater dining required", "Italian marble flooring", "high ceiling 3.2m"]',
  '["renders/prj_blr_002/living_contemporary_v1.jpg"]',
  '{"generationTimeMs": 61000, "modelProvider": "google", "modelId": "gemini-1.5-pro"}',
  NOW() - INTERVAL '7 days'
);

-- ---- Design Variants for Delhi Penthouse ----

INSERT INTO design_variants (id, room_id, name, style, budget_tier, render_url, spec_json, source_upload_id, prompt_used, constraints, render_urls, metadata, created_at)
VALUES (
  'dv_del_liv_artdeco_001',
  'room_del_living_001',
  'Art Deco Penthouse Living',
  'art_deco',
  'luxury',
  'renders/prj_delhi_003/living_artdeco_v1.jpg',
  '{"furniture": [{"type": "chesterfield_sofa", "material": "velvet", "color": "emerald_green"}, {"type": "bar_cabinet", "material": "brass_glass", "finish": "gold"}], "flooring": {"type": "marble", "variety": "nero_marquina", "inlay": "brass"}, "lighting": [{"type": "art_deco_chandelier", "count": 2}], "paint": {"walls": "#1A1A2E", "accent": "#C9A96E"}}',
  NULL,
  'Design a luxury art deco penthouse living area with panoramic city views',
  '["panoramic window treatment", "home bar area", "statement chandelier"]',
  '["renders/prj_delhi_003/living_artdeco_v1.jpg", "renders/prj_delhi_003/living_artdeco_v1_night.jpg"]',
  '{"generationTimeMs": 55800, "modelProvider": "openai", "modelId": "gpt-4o"}',
  NOW() - INTERVAL '160 days'
),
(
  'dv_del_study_modern_001',
  'room_del_study_002',
  'Modern Executive Study',
  'modern',
  'premium',
  'renders/prj_delhi_003/study_modern_v1.jpg',
  '{"furniture": [{"type": "executive_desk", "material": "walnut_veneer", "dimensions": {"l": 1800, "w": 800, "h": 750}}, {"type": "ergonomic_chair", "material": "leather_mesh"}, {"type": "bookshelf_wall", "material": "walnut", "dimensions": {"l": 4000, "w": 350, "h": 3000}}], "flooring": {"type": "engineered_wood", "species": "walnut"}, "lighting": [{"type": "task_lamp", "count": 1}, {"type": "recessed", "count": 8}]}',
  NULL,
  'Design a modern executive home office with floor-to-ceiling bookshelves',
  '["full wall bookshelf", "standing desk option", "video call background wall"]',
  '["renders/prj_delhi_003/study_modern_v1.jpg"]',
  '{"generationTimeMs": 42100, "modelProvider": "anthropic", "modelId": "claude-3-opus"}',
  NOW() - INTERVAL '158 days'
);
