-- ============================================================================
-- 010_contractors.sql — Contractors, Reviews, Assignments, Referrals
-- ============================================================================

-- ---- Contractors ----

INSERT INTO contractors (id, user_id, name, company_name, bio, website, profile_image_url, specializations, phone, email, address, city, state, rating, total_reviews, verified, years_experience, certifications, metadata, created_at, updated_at)
VALUES
  ('ctr_raj_001', NULL, 'Rajesh Carpenter', 'Raj Woodworks', 'Master carpenter with 18 years of experience in modular kitchens, wardrobes, and custom furniture. Specializes in BWP plywood and premium laminates. IGBC certified for sustainable wood sourcing.', NULL, NULL, '["carpentry", "modular_kitchen", "wardrobe", "custom_furniture"]', '+91-9876543001', 'raj@rajwoodworks.in', '12 Furniture Hub, Jogeshwari', 'Mumbai', 'MH', 4.6, 23, true, 18, '["IGBC Certified", "Hettich Certified Installer"]', '{"completedProjects": 142, "avgProjectDays": 12}', NOW() - INTERVAL '365 days', NOW() - INTERVAL '5 days'),
  ('ctr_suresh_002', NULL, 'Suresh Electricals', 'Suresh Electrical Solutions', 'Licensed electrician specializing in residential renovations. Expert in smart home wiring, LED installations, and complete rewiring. All work certified per IS 732:2019.', NULL, NULL, '["electrical", "smart_home", "led_installation", "rewiring"]', '+91-9876543002', 'suresh@gmail.com', '45 Electronics Market, Dadar', 'Mumbai', 'MH', 4.4, 18, true, 12, '["Licensed Electrician Class-A", "Legrand Certified", "Smart Home Specialist"]', '{"completedProjects": 98, "avgProjectDays": 5}', NOW() - INTERVAL '300 days', NOW() - INTERVAL '10 days'),
  ('ctr_vikram_003', NULL, 'Vikram Plumbing', 'VP Plumbing Services', 'Experienced plumber handling residential and light commercial projects. Specializes in bathroom renovations, kitchen plumbing, and waterproofing. Uses branded fittings only.', NULL, NULL, '["plumbing", "waterproofing", "bathroom_renovation"]', '+91-9876543003', 'vikram.plumber@gmail.com', '78 Plumber Lane, Andheri East', 'Mumbai', 'MH', 4.2, 15, true, 10, '["Grohe Certified Installer", "Waterproofing Specialist"]', '{"completedProjects": 75, "avgProjectDays": 4}', NOW() - INTERVAL '250 days', NOW() - INTERVAL '15 days');

-- ---- Contractor Reviews ----

INSERT INTO contractor_reviews (id, contractor_id, user_id, project_id, rating, title, review, created_at)
VALUES
  ('rev_raj_001', 'ctr_raj_001', 'usr_alice_001', 'prj_mumbai_001', 5, 'Excellent kitchen work', 'Rajesh did a fantastic job on our modular kitchen. Perfect cuts, clean finish, and completed on time. His team was professional and cleaned up after themselves daily.', NOW() - INTERVAL '5 days'),
  ('rev_raj_002', 'ctr_raj_001', 'usr_bob_002', 'prj_delhi_003', 4, 'Good quality, slight delay', 'Quality of woodwork was excellent for our study bookshelves. There was a 2-day delay due to material availability but Rajesh communicated proactively about it.', NOW() - INTERVAL '20 days'),
  ('rev_suresh_001', 'ctr_suresh_002', 'usr_alice_001', 'prj_mumbai_001', 4, 'Clean wiring work', 'Suresh rewired the entire apartment neatly. All conduits properly concealed. One socket placement was slightly off but he fixed it the same day.', NOW() - INTERVAL '18 days'),
  ('rev_vikram_001', 'ctr_vikram_003', 'usr_alice_001', 'prj_mumbai_001', 5, 'Perfect waterproofing', 'Vikram handled all our bathroom plumbing and waterproofing. The flood test passed first time. Very methodical approach.', NOW() - INTERVAL '2 days');

-- ---- Contractor Assignments ----

INSERT INTO contractor_assignments (id, contractor_id, project_id, role, status, start_date, end_date, agreed_amount, currency, created_at)
VALUES
  ('asg_raj_mum', 'ctr_raj_001', 'prj_mumbai_001', 'carpenter', 'active', NOW() - INTERVAL '15 days', NOW() + INTERVAL '10 days', 180000, 'INR', NOW() - INTERVAL '30 days'),
  ('asg_suresh_mum', 'ctr_suresh_002', 'prj_mumbai_001', 'electrician', 'active', NOW() - INTERVAL '24 days', NOW() + INTERVAL '5 days', 45000, 'INR', NOW() - INTERVAL '30 days'),
  ('asg_vikram_mum', 'ctr_vikram_003', 'prj_mumbai_001', 'plumber', 'active', NOW() - INTERVAL '24 days', NOW() + INTERVAL '5 days', 55000, 'INR', NOW() - INTERVAL '30 days'),
  ('asg_raj_del', 'ctr_raj_001', 'prj_delhi_003', 'carpenter', 'completed', NOW() - INTERVAL '160 days', NOW() - INTERVAL '30 days', 350000, 'INR', NOW() - INTERVAL '170 days');

-- ---- Contractor Referrals ----

INSERT INTO contractor_referrals (id, referrer_user_id, contractor_id, referee_email, message, status, created_at)
VALUES
  ('ref_001', 'usr_alice_001', 'ctr_raj_001', 'priya@example.com', 'Rajesh did amazing work on my Mumbai apartment kitchen. Highly recommend for any carpentry/modular kitchen work.', 'sent', NOW() - INTERVAL '3 days'),
  ('ref_002', 'usr_bob_002', 'ctr_suresh_002', 'amit@example.com', 'Suresh is a reliable electrician. Did clean work on our penthouse project.', 'viewed', NOW() - INTERVAL '15 days');
