-- ============================================================================
-- 006_catalogue.sql — Categories, Vendors, Products, Prices
-- ============================================================================

-- ---- Categories ----

INSERT INTO categories (id, name, slug, description, parent_id, icon, sort_order, is_active, product_count, created_at, updated_at)
VALUES
  ('cat_furniture', 'Furniture', 'furniture', 'Living, bedroom, and office furniture', NULL, 'sofa', 1, true, 4, NOW() - INTERVAL '120 days', NOW()),
  ('cat_flooring', 'Flooring', 'flooring', 'Tiles, wood, marble, and vinyl flooring', NULL, 'grid', 2, true, 3, NOW() - INTERVAL '120 days', NOW()),
  ('cat_lighting', 'Lighting', 'lighting', 'Ceiling, wall, floor, and task lighting', NULL, 'lightbulb', 3, true, 2, NOW() - INTERVAL '120 days', NOW()),
  ('cat_kitchen', 'Kitchen', 'kitchen', 'Kitchen cabinets, countertops, and appliances', NULL, 'utensils', 4, true, 3, NOW() - INTERVAL '120 days', NOW()),
  ('cat_bathroom', 'Bathroom', 'bathroom', 'Bathroom fixtures, tiles, and accessories', NULL, 'bath', 5, true, 0, NOW() - INTERVAL '120 days', NOW()),
  ('cat_hardware', 'Hardware & Fittings', 'hardware', 'Cabinet hardware, hinges, handles, and fittings', NULL, 'wrench', 6, true, 0, NOW() - INTERVAL '120 days', NOW()),
  ('cat_paint', 'Paint & Finishes', 'paint', 'Wall paints, wood finishes, and primers', NULL, 'paintbrush', 7, true, 0, NOW() - INTERVAL '120 days', NOW());

-- ---- Vendors ----

INSERT INTO vendors (id, name, code, description, website, contact_email, contact_phone, phone, address, city, state, country, gst_number, payment_terms, rating, is_active, product_count, created_at)
VALUES
  ('vnd_kajaria', 'Kajaria Ceramics', 'KAJ', 'India largest manufacturer of ceramic and vitrified tiles', 'https://www.kajariaceramics.com', 'sales@kajaria.com', '+91-11-26511231', '+91-11-26511231', 'Kajaria House, A-1 Sector 136, Noida', 'Noida', 'UP', 'IN', '09AAACK1234A1Z5', 'Net 30', 4.3, true, 3, NOW() - INTERVAL '120 days'),
  ('vnd_hettich', 'Hettich India', 'HET', 'Premium furniture fittings and hardware', 'https://www.hettich.com', 'info@hettich.com', '+91-20-67290100', '+91-20-67290100', 'Raisoni Industrial Park, Hinjewadi', 'Pune', 'MH', 'IN', '27AABCH5678B1Z2', 'Net 45', 4.7, true, 2, NOW() - INTERVAL '120 days'),
  ('vnd_philips', 'Philips Lighting India', 'PHI', 'LED lighting solutions for home and commercial', 'https://www.lighting.philips.co.in', 'contact@philips.com', '+91-124-4929000', '+91-124-4929000', 'DLF Cyber City, Gurugram', 'Gurugram', 'HR', 'IN', '06AAACR9012C1Z8', 'Net 30', 4.5, true, 2, NOW() - INTERVAL '120 days'),
  ('vnd_godrej', 'Godrej Interio', 'GOD', 'Furniture and modular solutions', 'https://www.godrejinterio.com', 'care@godrejinterio.com', '+91-22-67961000', '+91-22-67961000', 'Godrej One, Vikhroli', 'Mumbai', 'MH', 'IN', '27AAACG3456D1Z1', 'Net 30', 4.1, true, 4, NOW() - INTERVAL '120 days');

-- ---- Products ----

-- Furniture
INSERT INTO products (id, name, description, brand, category, category_id, subcategory, vendor_id, sku, status, unit, image_url, specifications, dimensions, weight_kg, material, finish, color, min_price, max_price, created_at, updated_at)
VALUES
  ('prod_sofa_001', '3-Seater Fabric Sofa - Sloane', 'Contemporary 3-seater sofa with solid wood frame and high-density foam cushions. Removable fabric covers.', 'Godrej Interio', 'furniture', 'cat_furniture', 'sofa', 'vnd_godrej', 'GI-SOFA-SLN-GRY', 'active', 'piece', NULL, '{"frame": "sheesham_wood", "foam_density": "40kg/m3", "fabric": "polyester_blend", "washable_covers": true}', '{"length_mm": 2200, "width_mm": 900, "height_mm": 850}', 65, 'fabric_wood', 'upholstered', 'grey', 42000, 48000, NOW() - INTERVAL '90 days', NOW()),
  ('prod_table_001', 'Walnut Coffee Table - Oslo', 'Solid sheesham wood coffee table with walnut finish. Clean lines and tapered legs.', 'Godrej Interio', 'furniture', 'cat_furniture', 'coffee_table', 'vnd_godrej', 'GI-CT-OSLO-WAL', 'active', 'piece', NULL, '{"wood": "sheesham", "joints": "mortise_and_tenon", "legStyle": "tapered"}', '{"length_mm": 1200, "width_mm": 600, "height_mm": 450}', 28, 'solid_wood', 'walnut', 'walnut', 11000, 14000, NOW() - INTERVAL '90 days', NOW()),
  ('prod_bookshelf_001', 'Ladder Bookshelf 5-Tier', '5-tier open bookshelf with ladder design. Engineered wood with oak veneer.', 'Godrej Interio', 'furniture', 'cat_furniture', 'bookshelf', 'vnd_godrej', 'GI-BS-LAD5-OAK', 'active', 'piece', NULL, '{"tiers": 5, "maxLoadPerShelf_kg": 15}', '{"length_mm": 800, "width_mm": 300, "height_mm": 1800}', 22, 'engineered_wood', 'oak_veneer', 'natural_oak', 8500, 12000, NOW() - INTERVAL '90 days', NOW()),
  ('prod_tvunit_001', 'Floating TV Unit 1800mm - Matte White', 'Wall-mounted TV unit with cable management, 2 drawers, and open shelf.', 'Godrej Interio', 'furniture', 'cat_furniture', 'tv_unit', 'vnd_godrej', 'GI-TV-FLT-WHT', 'active', 'piece', NULL, '{"mounting": "wall_mount", "cableManagement": true, "drawers": 2, "maxTVSize_inch": 65}', '{"length_mm": 1800, "width_mm": 400, "height_mm": 500}', 35, 'engineered_wood', 'matte_laminate', 'white', 18000, 24000, NOW() - INTERVAL '90 days', NOW());

-- Flooring
INSERT INTO products (id, name, description, brand, category, category_id, subcategory, vendor_id, sku, status, unit, image_url, specifications, dimensions, weight_kg, material, finish, color, min_price, max_price, created_at, updated_at)
VALUES
  ('prod_tile_001', 'Vitrified Floor Tile 600x600 - Pearl Grey', 'Double-charged vitrified tile. Scratch resistant, low water absorption.', 'Kajaria', 'flooring', 'cat_flooring', 'vitrified_tile', 'vnd_kajaria', 'KAJ-VT-600-PG', 'active', 'sqm', NULL, '{"type": "double_charged", "waterAbsorption": "<0.5%", "scratchResistance": "Mohs 7", "slipResistance": "R10"}', '{"length_mm": 600, "width_mm": 600, "height_mm": 10}', 18, 'vitrified', 'polished', 'pearl_grey', 750, 950, NOW() - INTERVAL '90 days', NOW()),
  ('prod_tile_002', 'Subway Wall Tile 75x150 - Glossy White', 'Classic subway tile for kitchen backsplash and bathroom walls.', 'Kajaria', 'flooring', 'cat_flooring', 'wall_tile', 'vnd_kajaria', 'KAJ-SW-75-GW', 'active', 'sqm', NULL, '{"type": "ceramic", "waterAbsorption": "<3%", "finish": "glossy"}', '{"length_mm": 150, "width_mm": 75, "height_mm": 8}', 14, 'ceramic', 'glossy', 'white', 900, 1300, NOW() - INTERVAL '90 days', NOW()),
  ('prod_wood_001', 'Engineered Oak Flooring - Natural Matte', 'European oak top layer (3mm) on HDF core. Click-lock installation.', 'Kajaria', 'flooring', 'cat_flooring', 'engineered_wood', 'vnd_kajaria', 'KAJ-EW-OAK-NM', 'active', 'sqm', NULL, '{"topLayer": "European oak 3mm", "core": "HDF", "installation": "click_lock", "underfloorHeating": true}', '{"length_mm": 1200, "width_mm": 190, "height_mm": 14}', 9, 'engineered_wood', 'matte', 'natural_oak', 3200, 4500, NOW() - INTERVAL '90 days', NOW());

-- Lighting
INSERT INTO products (id, name, description, brand, category, category_id, subcategory, vendor_id, sku, status, unit, image_url, specifications, dimensions, weight_kg, material, finish, color, min_price, max_price, created_at, updated_at)
VALUES
  ('prod_light_001', 'AstraSpot LED Recessed Downlight 12W', 'Slim profile recessed LED downlight. 3000K warm white, dimmable.', 'Philips', 'lighting', 'cat_lighting', 'recessed', 'vnd_philips', 'PH-LED-AS-12W', 'active', 'piece', NULL, '{"wattage": 12, "lumens": 1100, "colorTemp_K": 3000, "dimmable": true, "cutoutSize_mm": 150, "IP": "IP44"}', '{"length_mm": 175, "width_mm": 175, "height_mm": 45}', 0.3, 'aluminium', 'white', 'white', 550, 750, NOW() - INTERVAL '90 days', NOW()),
  ('prod_light_002', 'Geometric Pendant Light - Brass', 'Modern geometric pendant with brushed brass frame and frosted glass.', 'Philips', 'lighting', 'cat_lighting', 'pendant', 'vnd_philips', 'PH-PEN-GEO-BR', 'active', 'piece', NULL, '{"maxWattage": 60, "bulbType": "E27", "cableLength_m": 1.5, "adjustable": true}', '{"length_mm": 350, "width_mm": 350, "height_mm": 400}', 2.5, 'brass_glass', 'brushed_brass', 'brass', 7500, 9500, NOW() - INTERVAL '90 days', NOW());

-- Kitchen
INSERT INTO products (id, name, description, brand, category, category_id, subcategory, vendor_id, sku, status, unit, image_url, specifications, dimensions, weight_kg, material, finish, color, min_price, max_price, created_at, updated_at)
VALUES
  ('prod_hinge_001', 'Soft-Close Cabinet Hinge 110deg', 'Full overlay soft-close hinge with integrated damper. 110-degree opening.', 'Hettich', 'hardware', 'cat_hardware', 'hinge', 'vnd_hettich', 'HET-SC-110-NI', 'active', 'pair', NULL, '{"openingAngle": 110, "type": "full_overlay", "softClose": true, "mounting": "clip_on"}', NULL, 0.15, 'steel', 'nickel_plated', 'nickel', 220, 300, NOW() - INTERVAL '90 days', NOW()),
  ('prod_channel_001', 'Quadro Telescopic Drawer Channel 500mm', 'Full extension telescopic drawer slide with soft-close. 35kg load capacity.', 'Hettich', 'hardware', 'cat_hardware', 'drawer_channel', 'vnd_hettich', 'HET-QD-500-SC', 'active', 'pair', NULL, '{"extension": "full", "softClose": true, "loadCapacity_kg": 35, "length_mm": 500}', NULL, 0.8, 'steel', 'zinc_plated', 'silver', 480, 620, NOW() - INTERVAL '90 days', NOW()),
  ('prod_quartz_001', 'Quartz Countertop - Calacatta White', 'Engineered quartz slab with marble-like veining. Stain and scratch resistant.', 'Kajaria', 'kitchen', 'cat_kitchen', 'countertop', 'vnd_kajaria', 'KAJ-QZ-CAL-WH', 'active', 'sqm', NULL, '{"type": "engineered_quartz", "hardness": "Mohs 7", "stainResistant": true, "heatResistant": true}', '{"length_mm": 3000, "width_mm": 1400, "height_mm": 20}', 55, 'quartz', 'polished', 'calacatta_white', 10000, 14000, NOW() - INTERVAL '90 days', NOW());

-- ---- Product Prices (multi-vendor) ----

INSERT INTO product_prices (id, product_id, vendor_id, price, currency, unit, valid_from, valid_to)
VALUES
  ('pp_sofa_god', 'prod_sofa_001', 'vnd_godrej', 45000, 'INR', 'piece', NOW() - INTERVAL '60 days', NOW() + INTERVAL '120 days'),
  ('pp_table_god', 'prod_table_001', 'vnd_godrej', 12500, 'INR', 'piece', NOW() - INTERVAL '60 days', NOW() + INTERVAL '120 days'),
  ('pp_tile_kaj', 'prod_tile_001', 'vnd_kajaria', 850, 'INR', 'sqm', NOW() - INTERVAL '60 days', NOW() + INTERVAL '90 days'),
  ('pp_tile2_kaj', 'prod_tile_002', 'vnd_kajaria', 1100, 'INR', 'sqm', NOW() - INTERVAL '60 days', NOW() + INTERVAL '90 days'),
  ('pp_wood_kaj', 'prod_wood_001', 'vnd_kajaria', 3800, 'INR', 'sqm', NOW() - INTERVAL '60 days', NOW() + INTERVAL '90 days'),
  ('pp_light1_phi', 'prod_light_001', 'vnd_philips', 650, 'INR', 'piece', NOW() - INTERVAL '60 days', NOW() + INTERVAL '90 days'),
  ('pp_light2_phi', 'prod_light_002', 'vnd_philips', 8500, 'INR', 'piece', NOW() - INTERVAL '60 days', NOW() + INTERVAL '90 days'),
  ('pp_hinge_het', 'prod_hinge_001', 'vnd_hettich', 250, 'INR', 'pair', NOW() - INTERVAL '60 days', NOW() + INTERVAL '180 days'),
  ('pp_channel_het', 'prod_channel_001', 'vnd_hettich', 550, 'INR', 'pair', NOW() - INTERVAL '60 days', NOW() + INTERVAL '180 days'),
  ('pp_quartz_kaj', 'prod_quartz_001', 'vnd_kajaria', 12000, 'INR', 'sqm', NOW() - INTERVAL '60 days', NOW() + INTERVAL '90 days');
