-- ============================================================================
-- 011_intelligence.sql — Predictions, Budget Scenarios, Sustainability
-- ============================================================================

-- ---- Cost Predictions ----

INSERT INTO cost_predictions (id, project_id, predicted_cost, confidence_low, confidence_high, risk_factors, breakdown, model_provider, input_snapshot, created_at)
VALUES (
  'cpred_mum_001',
  'prj_mumbai_001',
  825000,
  720000,
  950000,
  '[
    {"name": "Material price volatility", "impact": 45000, "probability": 0.3},
    {"name": "Change orders", "impact": 60000, "probability": 0.5},
    {"name": "Skilled labor shortage", "impact": 25000, "probability": 0.2},
    {"name": "Weather delays (monsoon)", "impact": 15000, "probability": 0.4}
  ]',
  '[
    {"category": "Materials", "amount": 380000},
    {"category": "Labor", "amount": 280000},
    {"category": "Appliances", "amount": 55000},
    {"category": "Design & Supervision", "amount": 60000},
    {"category": "Contingency (10%)", "amount": 50000}
  ]',
  'openai',
  '{"rooms": 4, "totalArea_sqm": 50, "style": "modern", "budgetTier": "mid_range"}',
  NOW() - INTERVAL '35 days'
);

INSERT INTO cost_predictions (id, project_id, predicted_cost, confidence_low, confidence_high, risk_factors, breakdown, model_provider, input_snapshot, created_at)
VALUES (
  'cpred_blr_001',
  'prj_blr_002',
  2800000,
  2400000,
  3500000,
  '[
    {"name": "Imported material lead times", "impact": 200000, "probability": 0.4},
    {"name": "Italian marble price fluctuation", "impact": 150000, "probability": 0.3},
    {"name": "Monsoon season overlap", "impact": 50000, "probability": 0.6}
  ]',
  '[
    {"category": "Materials", "amount": 1400000},
    {"category": "Labor", "amount": 750000},
    {"category": "Appliances", "amount": 300000},
    {"category": "Design & Supervision", "amount": 150000},
    {"category": "Contingency (10%)", "amount": 200000}
  ]',
  'anthropic',
  '{"rooms": 2, "totalArea_sqm": 65, "style": "contemporary", "budgetTier": "luxury"}',
  NOW() - INTERVAL '5 days'
);

-- ---- Timeline Predictions ----

INSERT INTO timeline_predictions (id, project_id, predicted_days, confidence_low, confidence_high, critical_risks, phase_breakdown, model_provider, input_snapshot, created_at)
VALUES (
  'tpred_mum_001',
  'prj_mumbai_001',
  36,
  30,
  45,
  '[
    {"name": "Bathroom waterproofing retest", "delayDays": 3, "mitigation": "Use premium waterproofing brand with guaranteed first-pass"},
    {"name": "Custom furniture delivery delay", "delayDays": 5, "mitigation": "Order early, have backup vendor"},
    {"name": "Monsoon interference", "delayDays": 4, "mitigation": "Schedule outdoor work before monsoon onset"}
  ]',
  '[
    {"phase": "Demolition & Prep", "days": 3, "dependencies": []},
    {"phase": "Rough-In (Electrical + Plumbing)", "days": 5, "dependencies": ["Demolition"]},
    {"phase": "Masonry & Structure", "days": 5, "dependencies": ["Rough-In"]},
    {"phase": "Waterproofing", "days": 3, "dependencies": ["Masonry"]},
    {"phase": "Tiling & Flooring", "days": 7, "dependencies": ["Waterproofing"]},
    {"phase": "Kitchen Installation", "days": 7, "dependencies": ["Masonry"]},
    {"phase": "Fixture Installation", "days": 3, "dependencies": ["Tiling"]},
    {"phase": "Painting", "days": 5, "dependencies": ["Fixtures"]},
    {"phase": "Furniture & Finishing", "days": 5, "dependencies": ["Painting"]},
    {"phase": "Cleaning & Handover", "days": 3, "dependencies": ["Furniture"]}
  ]',
  'openai',
  '{"rooms": 4, "totalArea_sqm": 50, "complexity": "medium"}',
  NOW() - INTERVAL '35 days'
);

-- ---- Budget Scenarios ----

INSERT INTO budget_scenarios (id, project_id, name, original_total_cost, optimized_total_cost, savings_amount, savings_percent, substitutions, constraints, status, created_at)
VALUES
  ('bs_mum_001', 'prj_mumbai_001', 'Economy Alternatives', 825000, 680000, 145000, 17.6, '[
    {"original": "Quartz Countertop - Calacatta", "replacement": "Granite - Crystal White", "savings": 38250, "reason": "Similar aesthetic at 60% lower cost"},
    {"original": "Vitrified Tiles - Kajaria", "replacement": "Vitrified Tiles - Somany", "savings": 5100, "reason": "Same quality, local brand pricing"},
    {"original": "Hettich Soft-Close Hinges", "replacement": "Ebco Soft-Close Hinges", "savings": 2800, "reason": "Comparable quality at 40% less"},
    {"original": "Philips LED Downlights", "replacement": "Syska LED Downlights", "savings": 2400, "reason": "Same lumens output, budget brand"},
    {"original": "Godrej 3-Seater Sofa", "replacement": "Wakefit 3-Seater Sofa", "savings": 18000, "reason": "Similar build quality, online-first brand"},
    {"original": "Custom TV Unit", "replacement": "Semi-custom from Amazon Basics", "savings": 8000, "reason": "Standard size, no custom work needed"},
    {"original": "Asian Paints Royale", "replacement": "Asian Paints Apcolite", "savings": 1500, "reason": "Good quality for interior walls"},
    {"original": "Contractor labour premium", "replacement": "Standard contractor rate", "savings": 15000, "reason": "Use experienced but non-premium contractor"}
  ]', '["maintain modern aesthetic", "no quality compromise on kitchen hardware"]', 'draft', NOW() - INTERVAL '30 days'),
  ('bs_mum_002', 'prj_mumbai_001', 'Premium Upgrade', 825000, 1050000, -225000, -27.3, '[
    {"original": "Vitrified Tiles", "replacement": "Italian Marble - Statuario", "savings": -85000, "reason": "Premium marble flooring throughout"},
    {"original": "Fabric Sofa", "replacement": "Italian Leather Sofa", "savings": -65000, "reason": "Genuine Italian leather for luxury feel"},
    {"original": "Standard LED Downlights", "replacement": "Flos Architectural Lighting", "savings": -35000, "reason": "Designer lighting fixtures"},
    {"original": "Asian Paints", "replacement": "Benjamin Moore Premium", "savings": -12000, "reason": "Ultra-premium paint with better finish"},
    {"original": "Standard Curtains", "replacement": "Motorized Blinds - Somfy", "savings": -28000, "reason": "Smart home integration"}
  ]', '["luxury upgrade", "smart home integration"]', 'draft', NOW() - INTERVAL '28 days');

-- ---- Sustainability Reports ----

INSERT INTO sustainability_reports (id, project_id, total_carbon_kg, material_carbon_kg, transport_carbon_kg, sustainability_score, leed_points, green_alternatives, model_provider, created_at)
VALUES (
  'sust_mum_001',
  'prj_mumbai_001',
  2850,
  2100,
  750,
  62,
  8,
  '[
    {"material": "BWP Plywood (standard)", "alternative": "FSC-Certified Plywood", "carbonSaved_kg": 180, "costDelta_inr": 12000, "reason": "Sustainably harvested wood, same durability"},
    {"material": "Vitrified Tiles", "alternative": "Recycled Content Tiles (Kajaria GreenVit)", "carbonSaved_kg": 250, "costDelta_inr": 3000, "reason": "30% recycled content, lower firing temperature"},
    {"material": "Standard Paint", "alternative": "Zero-VOC Paint (Asian Paints Royale Health Shield)", "carbonSaved_kg": 50, "costDelta_inr": 800, "reason": "Better indoor air quality, lower emissions"},
    {"material": "XPS Insulation", "alternative": "Recycled Cotton Insulation", "carbonSaved_kg": 120, "costDelta_inr": -500, "reason": "Made from recycled denim, lower embodied carbon"}
  ]',
  'openai',
  NOW() - INTERVAL '30 days'
);

-- ---- Portfolios ----

INSERT INTO portfolios (id, user_id, name, description, created_at, updated_at)
VALUES (
  'port_alice_001',
  'usr_alice_001',
  'My Home Projects',
  'Collection of all my residential interior design projects',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '2 days'
);

INSERT INTO portfolio_projects (id, portfolio_id, project_id, sort_order)
VALUES
  ('pp_001', 'port_alice_001', 'prj_mumbai_001', 1),
  ('pp_002', 'port_alice_001', 'prj_blr_002', 2);
