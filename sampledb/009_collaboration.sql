-- ============================================================================
-- 009_collaboration.sql — Comments, Approvals, Notifications, Threads
-- ============================================================================

-- ---- Comments ----

INSERT INTO comments (id, user_id, project_id, parent_id, target_type, target_id, content, resolved, created_at, updated_at)
VALUES
  ('cmt_001', 'usr_alice_001', 'prj_mumbai_001', NULL, 'design_variant', 'dv_mum_liv_modern_001', 'Love the modern look! Can we make the sofa a lighter grey to match the curtains?', false, NOW() - INTERVAL '39 days', NOW() - INTERVAL '39 days'),
  ('cmt_002', 'usr_bob_002', 'prj_mumbai_001', 'cmt_001', 'design_variant', 'dv_mum_liv_modern_001', 'The lighter grey would work well. I can update the BOM to reflect the fabric change. Estimated cost difference: +INR 2000.', false, NOW() - INTERVAL '38 days', NOW() - INTERVAL '38 days'),
  ('cmt_003', 'usr_alice_001', 'prj_mumbai_001', NULL, 'room', 'room_mum_kitchen_003', 'The chimney position needs to be above the hob. Current placement shows it offset to the right.', true, NOW() - INTERVAL '36 days', NOW() - INTERVAL '35 days'),
  ('cmt_004', 'usr_alice_001', 'prj_mumbai_001', NULL, 'bom', 'bom_mum_liv_001', 'Can we substitute the curtain rods with a ceiling track system? Would be cleaner look.', false, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
  ('cmt_005', 'usr_bob_002', 'prj_delhi_003', NULL, 'design_variant', 'dv_del_liv_artdeco_001', 'Art deco chandelier sourced from Italy. Lead time is 6 weeks. Should we order now?', true, NOW() - INTERVAL '155 days', NOW() - INTERVAL '150 days');

-- ---- Approvals ----

INSERT INTO approvals (id, project_id, requested_by, target_type, target_id, status, reviewed_by, reviewed_at, notes, created_at)
VALUES
  ('apr_001', 'prj_mumbai_001', 'usr_alice_001', 'design_variant', 'dv_mum_liv_modern_001', 'approved', 'usr_alice_001', NOW() - INTERVAL '38 days', 'Approved with minor color adjustment to sofa', NOW() - INTERVAL '39 days'),
  ('apr_002', 'prj_mumbai_001', 'usr_alice_001', 'design_variant', 'dv_mum_kit_modern_001', 'approved', 'usr_alice_001', NOW() - INTERVAL '35 days', 'Approved. Chimney position corrected.', NOW() - INTERVAL '36 days'),
  ('apr_003', 'prj_mumbai_001', 'usr_alice_001', 'bom', 'bom_mum_liv_001', 'approved', 'usr_alice_001', NOW() - INTERVAL '36 days', NULL, NOW() - INTERVAL '37 days'),
  ('apr_004', 'prj_mumbai_001', 'usr_alice_001', 'schedule', 'sch_mum_001', 'approved', 'usr_alice_001', NOW() - INTERVAL '29 days', 'Timeline looks good. Start date confirmed.', NOW() - INTERVAL '30 days'),
  ('apr_005', 'prj_blr_002', 'usr_alice_001', 'design_variant', 'dv_blr_liv_contemporary_001', 'pending', NULL, NULL, NULL, NOW() - INTERVAL '6 days');

-- ---- Notifications ----

INSERT INTO notifications (id, user_id, type, title, message, link, read, created_at)
VALUES
  ('ntf_001', 'usr_alice_001', 'job_complete', 'Design generated', 'Your modern living room design is ready to view', '/project/prj_mumbai_001/designs/dv_mum_liv_modern_001', true, NOW() - INTERVAL '40 days'),
  ('ntf_002', 'usr_alice_001', 'job_complete', 'BOM calculated', 'Bill of Materials for Modern Minimalist Living is ready. Total: INR 1,98,160', '/project/prj_mumbai_001/bom', true, NOW() - INTERVAL '38 days'),
  ('ntf_003', 'usr_alice_001', 'job_complete', 'Drawings generated', '3 technical drawings are ready for your living room design', '/project/prj_mumbai_001/drawings', true, NOW() - INTERVAL '37 days'),
  ('ntf_004', 'usr_alice_001', 'comment', 'New comment on design', 'Bob Kumar commented on Modern Minimalist Living design', '/project/prj_mumbai_001/designs/dv_mum_liv_modern_001', true, NOW() - INTERVAL '38 days'),
  ('ntf_005', 'usr_alice_001', 'delivery', 'Tiles delivered', 'Kajaria tiles delivery has been received and inspected at site', '/project/prj_mumbai_001/deliveries', true, NOW() - INTERVAL '14 days'),
  ('ntf_006', 'usr_alice_001', 'payment', 'Payment confirmed', 'INR 1,50,000 payment for Rough-In milestone confirmed via Razorpay', '/project/prj_mumbai_001/payments', true, NOW() - INTERVAL '18 days'),
  ('ntf_007', 'usr_alice_001', 'approval', 'Approval pending', 'Bangalore Villa contemporary design is awaiting your approval', '/project/prj_blr_002/designs/dv_blr_liv_contemporary_001', false, NOW() - INTERVAL '6 days'),
  ('ntf_008', 'usr_alice_001', 'job_complete', 'Cut list in progress', 'Kitchen cut list generation is 65% complete', '/project/prj_mumbai_001/cutlist', false, NOW() - INTERVAL '1 hour'),
  ('ntf_009', 'usr_bob_002', 'comment', 'New comment', 'Alice Sharma commented on Mumbai living room design', '/project/prj_mumbai_001/designs/dv_mum_liv_modern_001', true, NOW() - INTERVAL '39 days');

-- ---- Collaboration Threads ----

INSERT INTO collaboration_threads (id, project_id, room_id, title, category, status, created_by, created_at, updated_at)
VALUES
  ('thr_001', 'prj_mumbai_001', 'room_mum_living_001', 'Living Room Color Scheme Discussion', 'design_decision', 'resolved', 'usr_alice_001', NOW() - INTERVAL '39 days', NOW() - INTERVAL '35 days'),
  ('thr_002', 'prj_mumbai_001', 'room_mum_kitchen_003', 'Kitchen Countertop Material Selection', 'change_request', 'resolved', 'usr_alice_001', NOW() - INTERVAL '28 days', NOW() - INTERVAL '25 days'),
  ('thr_003', 'prj_mumbai_001', NULL, 'Overall Budget Review - Week 3', 'general', 'open', 'usr_alice_001', NOW() - INTERVAL '10 days', NOW() - INTERVAL '5 days'),
  ('thr_004', 'prj_blr_002', 'room_blr_living_001', 'Villa Living Room Design Options', 'design_decision', 'open', 'usr_alice_001', NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days');

-- ---- Collaboration Messages ----

INSERT INTO collaboration_messages (id, thread_id, user_id, content, mentions, attachment_keys, is_decision, created_at)
VALUES
  ('msg_001', 'thr_001', 'usr_alice_001', 'I am leaning towards warm neutral tones for the living room. The grey sofa with off-white walls feels right, but I want the accent wall to be warmer.', NULL, NULL, false, NOW() - INTERVAL '39 days'),
  ('msg_002', 'thr_001', 'usr_bob_002', 'Warm neutrals work great with the modern style. I suggest changing the accent from navy (#2C3E50) to a warm charcoal (#3C3C3C) or even a terracotta (#C57B57).', NULL, NULL, false, NOW() - INTERVAL '38 days'),
  ('msg_003', 'thr_001', 'usr_alice_001', 'DECISION: Going with warm charcoal accent wall. Updated in the design spec.', '["usr_bob_002"]', NULL, true, NOW() - INTERVAL '35 days'),
  ('msg_004', 'thr_002', 'usr_alice_001', 'The granite countertop in the original design feels too dark for the white gloss cabinets. Can we switch to quartz?', NULL, NULL, false, NOW() - INTERVAL '28 days'),
  ('msg_005', 'thr_002', 'usr_bob_002', 'Calacatta White quartz would be perfect. Cost increase is about INR 38,250 for 4.5 sqm. I have raised a change order for your approval.', NULL, NULL, false, NOW() - INTERVAL '27 days'),
  ('msg_006', 'thr_002', 'usr_alice_001', 'DECISION: Approved the quartz upgrade. Change order CO-MUM-001 approved.', NULL, NULL, true, NOW() - INTERVAL '25 days'),
  ('msg_007', 'thr_003', 'usr_alice_001', 'We are 3 weeks in. Current spend is INR 2,83,800 against a budget of INR 8,00,000. On track so far but the quartz upgrade added INR 38,250.', NULL, NULL, false, NOW() - INTERVAL '10 days');

-- ---- Style Preferences ----

INSERT INTO style_preferences (id, project_id, quiz_responses, detected_styles, budget_tier, color_preferences, mood_board_items, inspiration_urls, notes, created_at, updated_at)
VALUES (
  'sp_mum_001',
  'prj_mumbai_001',
  '[
    {"questionId": "room_usage", "selectedOption": "family_gathering", "imageUrl": null},
    {"questionId": "color_preference", "selectedOption": "warm_neutrals", "imageUrl": null},
    {"questionId": "material_preference", "selectedOption": "wood_and_fabric", "imageUrl": null},
    {"questionId": "budget_range", "selectedOption": "mid_range", "imageUrl": null},
    {"questionId": "inspiration", "selectedOption": "modern_warm", "imageUrl": null}
  ]',
  '[{"style": "modern", "score": 0.85}, {"style": "scandinavian", "score": 0.72}, {"style": "contemporary", "score": 0.65}, {"style": "japandi", "score": 0.45}]',
  'mid_range',
  '{"palette": ["#F5F5F0", "#3C3C3C", "#D4C5A9", "#8B7355", "#FFFFFF"], "warm": true}',
  '[
    {"imageUrl": "mood/warm_living_1.jpg", "caption": "Warm minimalist living room", "source": "Pinterest", "category": "living_room"},
    {"imageUrl": "mood/wood_kitchen_1.jpg", "caption": "Light wood kitchen with white counters", "source": "Pinterest", "category": "kitchen"}
  ]',
  '["https://www.pinterest.com/pin/example1", "https://www.pinterest.com/pin/example2"]',
  'Client prefers natural materials. Avoid too much metal or industrial elements.',
  NOW() - INTERVAL '42 days',
  NOW() - INTERVAL '42 days'
);
