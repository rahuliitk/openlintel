-- ============================================================================
-- 008_procurement_payments.sql — Purchase Orders, Payments, Invoices, Deliveries
-- ============================================================================

-- ---- Purchase Orders ----

-- PO for flooring tiles (delivered)
INSERT INTO purchase_orders (id, project_id, vendor_id, status, items, total_amount, currency, expected_delivery, actual_delivery, notes, created_at, updated_at)
VALUES (
  'po_mum_tiles_001',
  'prj_mumbai_001',
  'vnd_kajaria',
  'delivered',
  '[
    {"productId": "prod_tile_001", "name": "Vitrified Floor Tile 600x600 Pearl Grey", "quantity": 40, "unit": "sqm", "unitPrice": 850},
    {"productId": "prod_tile_002", "name": "Subway Wall Tile 75x150 White", "quantity": 8, "unit": "sqm", "unitPrice": 1100}
  ]',
  42800,
  'INR',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '14 days',
  'Delivery to site gate. Contact: Site supervisor Ramesh - 9876543210',
  NOW() - INTERVAL '25 days',
  NOW() - INTERVAL '14 days'
);

-- PO for kitchen hardware (confirmed, awaiting delivery)
INSERT INTO purchase_orders (id, project_id, vendor_id, status, items, total_amount, currency, expected_delivery, actual_delivery, notes, created_at, updated_at)
VALUES (
  'po_mum_hardware_001',
  'prj_mumbai_001',
  'vnd_hettich',
  'confirmed',
  '[
    {"productId": "prod_hinge_001", "name": "Soft-Close Cabinet Hinge 110deg", "quantity": 28, "unit": "pair", "unitPrice": 250},
    {"productId": "prod_channel_001", "name": "Quadro Telescopic Drawer Channel 500mm", "quantity": 16, "unit": "pair", "unitPrice": 550}
  ]',
  15800,
  'INR',
  NOW() + INTERVAL '3 days',
  NULL,
  'Ship to site address. Include installation manual.',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '8 days'
);

-- PO for lighting (draft)
INSERT INTO purchase_orders (id, project_id, vendor_id, status, items, total_amount, currency, expected_delivery, actual_delivery, notes, created_at, updated_at)
VALUES (
  'po_mum_lights_001',
  'prj_mumbai_001',
  'vnd_philips',
  'draft',
  '[
    {"productId": "prod_light_001", "name": "AstraSpot LED Recessed Downlight 12W", "quantity": 12, "unit": "piece", "unitPrice": 650},
    {"productId": "prod_light_002", "name": "Geometric Pendant Light Brass", "quantity": 1, "unit": "piece", "unitPrice": 8500}
  ]',
  16300,
  'INR',
  NOW() + INTERVAL '10 days',
  NULL,
  NULL,
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days'
);

-- ---- Payments ----

-- Milestone 1 payment (completed)
INSERT INTO payments (id, project_id, milestone_id, amount, currency, status, payment_provider, external_id, metadata, paid_at, created_at)
VALUES (
  'pay_mum_001',
  'prj_mumbai_001',
  'ms_mum_001',
  75000,
  'INR',
  'completed',
  'razorpay',
  'pay_rzp_mum_001_abc123',
  '{"description": "Demolition milestone payment", "method": "upi"}',
  NOW() - INTERVAL '26 days',
  NOW() - INTERVAL '27 days'
);

-- Milestone 2 payment (completed)
INSERT INTO payments (id, project_id, milestone_id, amount, currency, status, payment_provider, external_id, metadata, paid_at, created_at)
VALUES (
  'pay_mum_002',
  'prj_mumbai_001',
  'ms_mum_002',
  150000,
  'INR',
  'completed',
  'razorpay',
  'pay_rzp_mum_002_def456',
  '{"description": "Rough-in completion payment", "method": "bank_transfer"}',
  NOW() - INTERVAL '18 days',
  NOW() - INTERVAL '19 days'
);

-- Milestone 3 payment (pending)
INSERT INTO payments (id, project_id, milestone_id, amount, currency, status, payment_provider, external_id, metadata, paid_at, created_at)
VALUES (
  'pay_mum_003',
  'prj_mumbai_001',
  'ms_mum_003',
  200000,
  'INR',
  'pending',
  NULL,
  NULL,
  '{"description": "Tiling and kitchen completion payment"}',
  NULL,
  NOW() - INTERVAL '1 day'
);

-- ---- Invoices ----

INSERT INTO invoices (id, project_id, purchase_order_id, invoice_number, amount, currency, status, due_date, paid_date, pdf_storage_key, created_at)
VALUES
  ('inv_mum_001', 'prj_mumbai_001', 'po_mum_tiles_001', 'INV-2025-MUM-001', 42800, 'INR', 'paid', NOW() - INTERVAL '10 days', NOW() - INTERVAL '12 days', 'invoices/prj_mumbai_001/INV-2025-MUM-001.pdf', NOW() - INTERVAL '25 days'),
  ('inv_mum_002', 'prj_mumbai_001', 'po_mum_hardware_001', 'INV-2025-MUM-002', 15800, 'INR', 'sent', NOW() + INTERVAL '15 days', NULL, 'invoices/prj_mumbai_001/INV-2025-MUM-002.pdf', NOW() - INTERVAL '8 days'),
  ('inv_mum_003', 'prj_mumbai_001', NULL, 'INV-2025-MUM-003', 75000, 'INR', 'paid', NOW() - INTERVAL '20 days', NOW() - INTERVAL '26 days', NULL, NOW() - INTERVAL '27 days');

-- ---- Delivery Tracking ----

INSERT INTO delivery_tracking (id, project_id, purchase_order_id, vendor_name, description, status, tracking_number, estimated_delivery_date, actual_delivery_date, inspection_checklist, inspection_photo_keys, received_by, notes, created_at, updated_at)
VALUES
  ('del_mum_001', 'prj_mumbai_001', 'po_mum_tiles_001', 'Kajaria Ceramics', 'Floor and wall tiles - 48 sqm total', 'inspected', 'KAJ-SHIP-2025-4521', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days', '[{"item": "Quantity matches PO", "passed": true, "note": null}, {"item": "No chipped/broken tiles", "passed": true, "note": "2 tiles had minor edge chips, within 5% acceptable"}, {"item": "Correct shade/batch number", "passed": true, "note": "Batch: KAJ-PG-B2025-11"}, {"item": "Packaging intact", "passed": true, "note": null}]', '["deliveries/prj_mumbai_001/tiles_delivery_1.jpg", "deliveries/prj_mumbai_001/tiles_inspection_1.jpg"]', 'Ramesh (Site Supervisor)', 'Delivered on time. 2 minor chips noted but within tolerance.', NOW() - INTERVAL '25 days', NOW() - INTERVAL '14 days'),
  ('del_mum_002', 'prj_mumbai_001', 'po_mum_hardware_001', 'Hettich India', 'Kitchen cabinet hardware - hinges and channels', 'dispatched', 'HET-DISP-2025-8834', NOW() + INTERVAL '3 days', NULL, NULL, NULL, NULL, 'Dispatched from Pune warehouse', NOW() - INTERVAL '10 days', NOW() - INTERVAL '1 day');
