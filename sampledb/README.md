# OpenLintel Sample Database

This directory contains SQL seed files to populate a PostgreSQL database with realistic test data for manual and automated testing.

## Files

| File | Description |
|------|-------------|
| `001_users_auth.sql` | Users, accounts, sessions (2 users: homeowner + admin) |
| `002_projects_rooms.sql` | Projects (3) with rooms (8 total) |
| `003_uploads_designs.sql` | File uploads and design variants |
| `004_jobs.sql` | Sample async job records across all statuses |
| `005_bom_drawings_cutlist_mep.sql` | BOM results, drawings, cut lists, MEP calculations |
| `006_catalogue.sql` | Categories, vendors, products, product prices |
| `007_schedule_milestones.sql` | Project timeline, milestones, site logs, change orders |
| `008_procurement_payments.sql` | Purchase orders, payments, invoices, deliveries |
| `009_collaboration.sql` | Comments, approvals, notifications, threads, messages |
| `010_contractors.sql` | Contractors, reviews, assignments, referrals |
| `011_intelligence.sql` | Cost/timeline predictions, budget scenarios, sustainability |
| `012_post_occupancy.sql` | Digital twins, IoT, maintenance, warranties |
| `013_marketplace.sql` | Offcut listings, gallery entries, developer apps |
| `seed_all.sql` | Master file that imports all above in order |

## How to Import

### Option 1: Import all at once
```bash
psql -U postgres -d openlintel < sampledb/seed_all.sql
```

### Option 2: Import individual files
```bash
psql -U postgres -d openlintel < sampledb/001_users_auth.sql
psql -U postgres -d openlintel < sampledb/002_projects_rooms.sql
# ... etc
```

### Option 3: Using Docker Compose
```bash
docker exec -i openlintel-db psql -U postgres -d openlintel < sampledb/seed_all.sql
```

## Test Accounts

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| `alice@example.com` | `password123` | user | Homeowner with 2 active projects |
| `bob@example.com` | `password123` | admin | Platform administrator |

> **Note:** Passwords are hashed with bcrypt. For OAuth testing, use Google/GitHub sign-in flows.

## Data Overview

- **2 users** (1 homeowner, 1 admin)
- **3 projects** (Mumbai Apartment, Bangalore Villa, Delhi Penthouse)
- **8 rooms** across all projects
- **6 design variants** with different styles/budgets
- **4 vendors** (wood, tiles, electrical, plumbing)
- **12 products** across categories
- **3 contractors** (carpenter, electrician, plumber)
- **Full lifecycle data** from design through handover
