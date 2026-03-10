-- ============================================================================
-- seed_all.sql — Master seed file for OpenLintel sample database
-- ============================================================================
-- Usage: psql -U postgres -d openlintel < sampledb/seed_all.sql
-- ============================================================================

-- Ensure clean state (optional — uncomment to reset before seeding)
-- TRUNCATE users CASCADE;

BEGIN;

\echo '>>> Seeding 001: Users & Auth...'
\i 001_users_auth.sql

\echo '>>> Seeding 002: Projects & Rooms...'
\i 002_projects_rooms.sql

\echo '>>> Seeding 003: Uploads & Design Variants...'
\i 003_uploads_designs.sql

\echo '>>> Seeding 004: Jobs...'
\i 004_jobs.sql

\echo '>>> Seeding 005: BOM, Drawings, Cut Lists, MEP...'
\i 005_bom_drawings_cutlist_mep.sql

\echo '>>> Seeding 006: Catalogue (Categories, Vendors, Products)...'
\i 006_catalogue.sql

\echo '>>> Seeding 007: Schedules, Milestones, Site Logs, Change Orders...'
\i 007_schedule_milestones.sql

\echo '>>> Seeding 008: Procurement, Payments, Invoices, Deliveries...'
\i 008_procurement_payments.sql

\echo '>>> Seeding 009: Collaboration (Comments, Approvals, Notifications, Threads)...'
\i 009_collaboration.sql

\echo '>>> Seeding 010: Contractors, Reviews, Assignments...'
\i 010_contractors.sql

\echo '>>> Seeding 011: Intelligence (Predictions, Budget, Sustainability)...'
\i 011_intelligence.sql

\echo '>>> Seeding 012: Post-Occupancy (Digital Twin, IoT, Maintenance, Warranties)...'
\i 012_post_occupancy.sql

\echo '>>> Seeding 013: Marketplace (Offcuts, Gallery, Developer Apps)...'
\i 013_marketplace.sql

COMMIT;

\echo ''
\echo '============================================'
\echo '  OpenLintel sample database seeded!'
\echo '============================================'
\echo ''
\echo '  Test accounts:'
\echo '    alice@example.com (user)  — 2 active projects'
\echo '    bob@example.com   (admin) — 1 completed project'
\echo ''
\echo '  Data summary:'
\echo '    2 users, 3 projects, 8 rooms'
\echo '    6 design variants, 8 jobs'
\echo '    2 BOMs, 5 drawings, 1 cut list, 2 MEP calcs'
\echo '    7 categories, 4 vendors, 12 products'
\echo '    1 schedule, 4 milestones, 4 site logs'
\echo '    3 change orders, 3 POs, 3 payments'
\echo '    3 contractors, 4 reviews'
\echo '    1 digital twin, 5 IoT devices'
\echo '    5 warranties, 5 maintenance items'
\echo '    3 offcut listings, 2 gallery entries'
\echo '============================================'
