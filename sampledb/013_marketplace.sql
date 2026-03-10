-- ============================================================================
-- 013_marketplace.sql — Offcuts, Gallery, Developer Apps, Exchange Rates
-- ============================================================================

-- ---- Offcut Listings ----

INSERT INTO offcut_listings (id, user_id, title, material_type, quantity, unit, dimensions, condition, asking_price, currency, image_keys, location, status, created_at, updated_at)
VALUES
  ('off_001', 'usr_bob_002', 'Nero Marquina Marble Offcuts', 'stone', 3.5, 'sqm', '{"length": 800, "width": 600, "thickness": 20, "unit": "mm"}', 'new', 15000, 'INR', '["offcuts/off_001/marble_1.jpg", "offcuts/off_001/marble_2.jpg"]', 'Gurugram, Haryana', 'active', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
  ('off_002', 'usr_bob_002', 'Walnut Engineered Wood Planks', 'wood', 12, 'sqm', '{"length": 1200, "width": 190, "thickness": 14, "unit": "mm"}', 'new', 25000, 'INR', '["offcuts/off_002/wood_1.jpg"]', 'Gurugram, Haryana', 'active', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),
  ('off_003', 'usr_alice_001', 'White Subway Tiles - Leftover', 'tile', 2, 'sqm', '{"length": 150, "width": 75, "thickness": 8, "unit": "mm"}', 'new', 1800, 'INR', '["offcuts/off_003/tile_1.jpg"]', 'Bandra, Mumbai', 'active', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days');

-- ---- Offcut Inquiries ----

INSERT INTO offcut_inquiries (id, listing_id, buyer_user_id, message, status, created_at)
VALUES
  ('ofi_001', 'off_001', 'usr_alice_001', 'Hi! I am interested in the Nero Marquina offcuts. Can you share the exact slab sizes? I need them for a tabletop project. Would you do INR 12,000?', 'replied', NOW() - INTERVAL '8 days'),
  ('ofi_002', 'off_002', 'usr_alice_001', 'Are these planks from the same batch? I need them to match existing flooring in my villa project. Can I visit to check the color match?', 'pending', NOW() - INTERVAL '5 days');

-- ---- Project Gallery Entries ----

INSERT INTO project_gallery_entries (id, project_id, title, description, tags, image_keys, style, is_public, likes, created_at)
VALUES
  ('gal_001', 'prj_delhi_003', 'Art Deco Penthouse Living Room', 'Luxurious art deco living room with emerald velvet seating, brass accents, and Nero Marquina marble flooring. Panoramic city views from floor-to-ceiling windows.', '["art_deco", "luxury", "penthouse", "marble", "brass"]', '["gallery/prj_delhi_003/living_hero.jpg", "gallery/prj_delhi_003/living_detail_1.jpg", "gallery/prj_delhi_003/living_night.jpg"]', 'art_deco', true, 47, NOW() - INTERVAL '15 days'),
  ('gal_002', 'prj_delhi_003', 'Modern Executive Study', 'Floor-to-ceiling walnut bookshelves, executive desk with leather chair, and warm ambient lighting. Perfect home office setup.', '["modern", "study", "home_office", "walnut", "bookshelves"]', '["gallery/prj_delhi_003/study_hero.jpg"]', 'modern', true, 23, NOW() - INTERVAL '15 days');

-- ---- Developer Apps ----

INSERT INTO developer_apps (id, user_id, name, client_id, client_secret_hash, redirect_uris, scopes, status, rate_limit_tier, created_at, updated_at)
VALUES (
  'devapp_001',
  'usr_bob_002',
  'Interior Design Analytics Tool',
  'olclient_analytics_001',
  '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG',
  '["http://localhost:3001/callback", "https://analytics.example.com/callback"]',
  '["projects:read", "bom:read", "analytics:read"]',
  'active',
  'standard',
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '30 days'
);

-- ---- API Access Tokens ----

INSERT INTO api_access_tokens (id, app_id, user_id, token_hash, scopes, expires_at, created_at)
VALUES (
  'aat_001',
  'devapp_001',
  'usr_bob_002',
  '$2b$10$tokenhash1234567890abcdefghijklmnopqrstuv',
  '["projects:read", "bom:read"]',
  NOW() + INTERVAL '90 days',
  NOW() - INTERVAL '5 days'
);

-- ---- API Request Logs ----

INSERT INTO api_request_logs (id, app_id, endpoint, method, status_code, response_time_ms, created_at)
VALUES
  ('arl_001', 'devapp_001', '/api/v1/projects', 'GET', 200, 45, NOW() - INTERVAL '4 days'),
  ('arl_002', 'devapp_001', '/api/v1/projects/prj_delhi_003', 'GET', 200, 32, NOW() - INTERVAL '4 days'),
  ('arl_003', 'devapp_001', '/api/v1/projects/prj_delhi_003/bom', 'GET', 200, 67, NOW() - INTERVAL '3 days'),
  ('arl_004', 'devapp_001', '/api/v1/projects/prj_nonexistent', 'GET', 404, 12, NOW() - INTERVAL '3 days'),
  ('arl_005', 'devapp_001', '/api/v1/analytics/dashboard', 'GET', 200, 180, NOW() - INTERVAL '2 days');

-- ---- Webhook Subscriptions ----

INSERT INTO webhook_subscriptions (id, app_id, event_type, target_url, secret, status, failure_count, created_at)
VALUES
  ('wh_001', 'devapp_001', 'project.created', 'https://analytics.example.com/webhooks/project-created', 'whsec_analytics_proj_001', 'active', 0, NOW() - INTERVAL '25 days'),
  ('wh_002', 'devapp_001', 'bom.generated', 'https://analytics.example.com/webhooks/bom-generated', 'whsec_analytics_bom_001', 'active', 0, NOW() - INTERVAL '25 days');

-- ---- Exchange Rates ----

INSERT INTO exchange_rates (id, from_currency, to_currency, rate, source, fetched_at)
VALUES
  ('er_usd_inr', 'USD', 'INR', 83.50, 'api', NOW() - INTERVAL '1 hour'),
  ('er_eur_inr', 'EUR', 'INR', 90.75, 'api', NOW() - INTERVAL '1 hour'),
  ('er_gbp_inr', 'GBP', 'INR', 105.20, 'api', NOW() - INTERVAL '1 hour'),
  ('er_usd_eur', 'USD', 'EUR', 0.92, 'api', NOW() - INTERVAL '1 hour'),
  ('er_inr_usd', 'INR', 'USD', 0.012, 'api', NOW() - INTERVAL '1 hour');
