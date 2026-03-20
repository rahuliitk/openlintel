import { pgTable, text, timestamp, integer, doublePrecision, jsonb, real, boolean, vector, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './auth';

/**
 * Application domain tables.
 */

// ---------------------------------------------------------------------------
// User API Keys — encrypted LLM provider keys
// ---------------------------------------------------------------------------
export const userApiKeys = pgTable('user_api_keys', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(), // e.g. 'openai', 'anthropic', 'google'
  label: text('label').notNull(), // user-friendly name
  encryptedKey: text('encrypted_key').notNull(), // AES-256-GCM encrypted
  keyPrefix: text('key_prefix').notNull(), // e.g. 'sk-ab...' for display
  iv: text('iv').notNull(), // initialization vector (hex)
  authTag: text('auth_tag').notNull(), // GCM auth tag (hex)
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at', { mode: 'date' }),
});

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
export const projects = pgTable('projects', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  status: text('status').notNull().default('draft'),
  address: text('address'),
  unitSystem: text('unit_system').notNull().default('metric'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------
export const rooms = pgTable('rooms', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull().default('other'),
  lengthMm: real('length_mm'),
  widthMm: real('width_mm'),
  heightMm: real('height_mm').default(2700), // standard ceiling height
  floor: integer('floor').default(0),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Design Variants
// ---------------------------------------------------------------------------
export const designVariants = pgTable('design_variants', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  roomId: text('room_id')
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  style: text('style').notNull(),
  budgetTier: text('budget_tier').notNull(),
  renderUrl: text('render_url'),
  specJson: jsonb('spec_json'), // full design specification
  // Batch 2: design generation fields
  sourceUploadId: text('source_upload_id').references(() => uploads.id, { onDelete: 'set null' }),
  promptUsed: text('prompt_used'),
  constraints: jsonb('constraints'), // string[] of user constraints
  jobId: text('job_id'), // references jobs.id (can't circular ref, handled in app)
  renderUrls: jsonb('render_urls'), // string[] of generated image URLs
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------
export const uploads = pgTable('uploads', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  roomId: text('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  filename: text('filename').notNull(),
  label: text('label'), // user-friendly display name (editable)
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  storageKey: text('storage_key').notNull(), // path in MinIO/S3
  category: text('category').notNull().default('photo'), // photo, floor_plan, document
  thumbnailKey: text('thumbnail_key'),
  imageHash: text('image_hash'), // perceptual hash for dedup
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Jobs — async processing queue for all services
// ---------------------------------------------------------------------------
export const jobs = pgTable('jobs', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // design_generation, bom_calculation, drawing, segmentation, etc.
  status: text('status').notNull().default('pending'), // pending, running, completed, failed, cancelled
  inputJson: jsonb('input_json'),
  outputJson: jsonb('output_json'),
  error: text('error'),
  progress: integer('progress').default(0), // 0-100
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  roomId: text('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  designVariantId: text('design_variant_id').references(() => designVariants.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  startedAt: timestamp('started_at', { mode: 'date' }),
  completedAt: timestamp('completed_at', { mode: 'date' }),
});

// ---------------------------------------------------------------------------
// BOM Results — Bill of Materials output
// ---------------------------------------------------------------------------
export const bomResults = pgTable('bom_results', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  designVariantId: text('design_variant_id')
    .notNull()
    .references(() => designVariants.id, { onDelete: 'cascade' }),
  jobId: text('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  items: jsonb('items').notNull(), // BOMItem[]
  totalCost: real('total_cost'),
  currency: text('currency').default('USD'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Drawing Results
// ---------------------------------------------------------------------------
export const drawingResults = pgTable('drawing_results', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  designVariantId: text('design_variant_id')
    .notNull()
    .references(() => designVariants.id, { onDelete: 'cascade' }),
  jobId: text('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  drawingType: text('drawing_type').notNull(), // floor_plan, elevation, section, rcp, flooring, electrical
  dxfStorageKey: text('dxf_storage_key'),
  pdfStorageKey: text('pdf_storage_key'),
  svgStorageKey: text('svg_storage_key'),
  ifcStorageKey: text('ifc_storage_key'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Cut List Results
// ---------------------------------------------------------------------------
export const cutlistResults = pgTable('cutlist_results', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  designVariantId: text('design_variant_id')
    .notNull()
    .references(() => designVariants.id, { onDelete: 'cascade' }),
  jobId: text('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  panels: jsonb('panels').notNull(), // CutListPanel[]
  hardware: jsonb('hardware'), // hardware schedule
  nestingResult: jsonb('nesting_result'), // sheet layouts
  totalSheets: integer('total_sheets'),
  wastePercent: real('waste_percent'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// MEP Calculations
// ---------------------------------------------------------------------------
export const mepCalculations = pgTable('mep_calculations', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  designVariantId: text('design_variant_id')
    .notNull()
    .references(() => designVariants.id, { onDelete: 'cascade' }),
  jobId: text('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  calcType: text('calc_type').notNull(), // electrical, plumbing, hvac
  result: jsonb('result').notNull(),
  standardsCited: jsonb('standards_cited'), // NEC/IPC/ASHRAE references
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Categories — hierarchical product categories
// ---------------------------------------------------------------------------
export const categories = pgTable('categories', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  parentId: text('parent_id'), // self-reference for hierarchy
  icon: text('icon'),
  imageUrl: text('image_url'),
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true),
  productCount: integer('product_count').default(0),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Vendors
// ---------------------------------------------------------------------------
export const vendors = pgTable('vendors', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  code: text('code').unique(),
  description: text('description'),
  website: text('website'),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  country: text('country').default('IN'),
  gstNumber: text('gst_number'),
  paymentTerms: text('payment_terms'),
  rating: real('rating'),
  isActive: boolean('is_active').default(true),
  productCount: integer('product_count').default(0),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Products Catalogue (pgvector for visual similarity)
// ---------------------------------------------------------------------------
export const products = pgTable('products', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  brand: text('brand'),
  category: text('category').notNull(),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  subcategory: text('subcategory'),
  vendorId: text('vendor_id').references(() => vendors.id, { onDelete: 'set null' }),
  sku: text('sku'),
  status: text('status').notNull().default('active'),
  unit: text('unit').default('piece'),
  imageUrl: text('image_url'),
  imageStorageKey: text('image_storage_key'),
  images: jsonb('images'), // string[] of image URLs
  tags: jsonb('tags'), // string[]
  specifications: jsonb('specifications'),
  dimensions: jsonb('dimensions'), // { length_mm, width_mm, height_mm }
  weight_kg: real('weight_kg'),
  material: text('material'),
  finish: text('finish'),
  color: text('color'),
  prices: jsonb('prices'), // vendor price entries
  minPrice: real('min_price'),
  maxPrice: real('max_price'),
  embedding: text('embedding'), // stored as text, cast to vector in queries
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Product Embeddings — separate table for vector search
// ---------------------------------------------------------------------------
export const productEmbeddings = pgTable('product_embeddings', {
  productId: text('product_id')
    .primaryKey()
    .references(() => products.id, { onDelete: 'cascade' }),
  embedding: text('embedding'), // stored as text, cast to vector in queries
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const productPrices = pgTable('product_prices', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  productId: text('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  vendorId: text('vendor_id')
    .notNull()
    .references(() => vendors.id, { onDelete: 'cascade' }),
  price: real('price').notNull(),
  currency: text('currency').notNull().default('USD'),
  unit: text('unit').default('piece'),
  validFrom: timestamp('valid_from', { mode: 'date' }).defaultNow().notNull(),
  validTo: timestamp('valid_to', { mode: 'date' }),
});

// ---------------------------------------------------------------------------
// Schedules + Milestones + Site Logs + Change Orders
// ---------------------------------------------------------------------------
export const schedules = pgTable('schedules', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  jobId: text('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  tasks: jsonb('tasks').notNull(), // ScheduleTask[] with dependencies
  criticalPath: jsonb('critical_path'), // task IDs on critical path
  startDate: timestamp('start_date', { mode: 'date' }),
  endDate: timestamp('end_date', { mode: 'date' }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const milestones = pgTable('milestones', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  scheduleId: text('schedule_id')
    .notNull()
    .references(() => schedules.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  dueDate: timestamp('due_date', { mode: 'date' }),
  completedDate: timestamp('completed_date', { mode: 'date' }),
  status: text('status').notNull().default('pending'), // pending, in_progress, completed, overdue
  paymentLinked: boolean('payment_linked').default(false),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const siteLogs = pgTable('site_logs', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  date: timestamp('date', { mode: 'date' }).notNull(),
  title: text('title').notNull(),
  notes: text('notes'),
  weather: text('weather'),
  workersOnSite: integer('workers_on_site'),
  photoKeys: jsonb('photo_keys'), // string[] of storage keys
  tags: jsonb('tags'), // string[]
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const changeOrders = pgTable('change_orders', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('proposed'), // proposed, approved, rejected, implemented
  costImpact: real('cost_impact'),
  timeImpactDays: integer('time_impact_days'),
  approvedBy: text('approved_by'),
  approvedAt: timestamp('approved_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Purchase Orders + Payments + Invoices
// ---------------------------------------------------------------------------
export const purchaseOrders = pgTable('purchase_orders', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  vendorId: text('vendor_id').references(() => vendors.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('draft'), // draft, submitted, confirmed, shipped, delivered, cancelled
  items: jsonb('items').notNull(), // { productId, quantity, unitPrice }[]
  totalAmount: real('total_amount'),
  currency: text('currency').default('USD'),
  expectedDelivery: timestamp('expected_delivery', { mode: 'date' }),
  actualDelivery: timestamp('actual_delivery', { mode: 'date' }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const payments = pgTable('payments', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  milestoneId: text('milestone_id').references(() => milestones.id, { onDelete: 'set null' }),
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('USD'),
  status: text('status').notNull().default('pending'), // pending, processing, completed, failed, refunded
  paymentProvider: text('payment_provider'), // stripe, razorpay
  externalId: text('external_id'), // Stripe/Razorpay payment ID
  metadata: jsonb('metadata'),
  paidAt: timestamp('paid_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const invoices = pgTable('invoices', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  purchaseOrderId: text('purchase_order_id').references(() => purchaseOrders.id, { onDelete: 'set null' }),
  invoiceNumber: text('invoice_number').notNull(),
  amount: real('amount').notNull(),
  currency: text('currency').default('USD'),
  status: text('status').notNull().default('draft'), // draft, sent, paid, overdue, cancelled
  dueDate: timestamp('due_date', { mode: 'date' }),
  paidDate: timestamp('paid_date', { mode: 'date' }),
  pdfStorageKey: text('pdf_storage_key'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Collaboration — Comments, Approvals, Notifications
// ---------------------------------------------------------------------------
export const comments = pgTable('comments', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  parentId: text('parent_id'), // self-reference for threading
  targetType: text('target_type').notNull(), // design_variant, room, drawing, bom
  targetId: text('target_id').notNull(),
  content: text('content').notNull(),
  resolved: boolean('resolved').default(false),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const approvals = pgTable('approvals', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  requestedBy: text('requested_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  targetType: text('target_type').notNull(), // design_variant, bom, schedule
  targetId: text('target_id').notNull(),
  status: text('status').notNull().default('pending'), // pending, approved, rejected, revision_requested
  reviewedBy: text('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { mode: 'date' }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // comment, approval, job_complete, payment, delivery
  title: text('title').notNull(),
  message: text('message'),
  link: text('link'), // relative URL to navigate to
  read: boolean('read').default(false),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Contractors + Reviews + Assignments (Marketplace)
// ---------------------------------------------------------------------------
export const contractors = pgTable('contractors', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }), // optional linked user account
  name: text('name').notNull(),
  companyName: text('company_name'),
  bio: text('bio'), // short description / about
  website: text('website'),
  profileImageUrl: text('profile_image_url'),
  specializations: jsonb('specializations'), // string[] - e.g. ['carpentry', 'electrical']
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  rating: real('rating').default(0),
  totalReviews: integer('total_reviews').default(0),
  verified: boolean('verified').default(false),
  yearsExperience: integer('years_experience'),
  portfolioKeys: jsonb('portfolio_keys'), // string[] of image storage keys
  portfolioUrls: jsonb('portfolio_urls'), // string[] of external portfolio URLs
  certifications: jsonb('certifications'), // string[] of licenses/certifications
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const contractorReviews = pgTable('contractor_reviews', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  contractorId: text('contractor_id')
    .notNull()
    .references(() => contractors.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  rating: integer('rating').notNull(), // 1-5
  title: text('title'),
  review: text('review'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const contractorAssignments = pgTable('contractor_assignments', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  contractorId: text('contractor_id')
    .notNull()
    .references(() => contractors.id, { onDelete: 'cascade' }),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // e.g. 'general_contractor', 'electrician', 'carpenter'
  status: text('status').notNull().default('active'), // active, completed, terminated
  startDate: timestamp('start_date', { mode: 'date' }),
  endDate: timestamp('end_date', { mode: 'date' }),
  agreedAmount: real('agreed_amount'),
  currency: text('currency').default('USD'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Y.js Collaboration Documents — persisted editor state
// ---------------------------------------------------------------------------
export const yjsDocuments = pgTable('yjs_documents', {
  docId: text('doc_id').primaryKey(),
  state: text('state'), // base64-encoded Y.js binary state
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// ===========================================================================
// PHASE 4: INTELLIGENCE
// ===========================================================================

// ---------------------------------------------------------------------------
// Cost Predictions — AI-generated cost forecasts
// ---------------------------------------------------------------------------
export const costPredictions = pgTable('cost_predictions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  predictedCost: real('predicted_cost').notNull(),
  confidenceLow: real('confidence_low').notNull(),
  confidenceHigh: real('confidence_high').notNull(),
  riskFactors: jsonb('risk_factors'), // { name, impact, probability }[]
  breakdown: jsonb('breakdown'), // { category, amount }[]
  modelProvider: text('model_provider').notNull(),
  inputSnapshot: jsonb('input_snapshot'), // snapshot of project data used
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Timeline Predictions — AI-generated timeline forecasts
// ---------------------------------------------------------------------------
export const timelinePredictions = pgTable('timeline_predictions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  predictedDays: integer('predicted_days').notNull(),
  confidenceLow: integer('confidence_low').notNull(),
  confidenceHigh: integer('confidence_high').notNull(),
  criticalRisks: jsonb('critical_risks'), // { name, delayDays, mitigation }[]
  phaseBreakdown: jsonb('phase_breakdown'), // { phase, days, dependencies }[]
  modelProvider: text('model_provider').notNull(),
  inputSnapshot: jsonb('input_snapshot'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Budget Scenarios — AI-optimized budget alternatives
// ---------------------------------------------------------------------------
export const budgetScenarios = pgTable('budget_scenarios', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  originalTotalCost: real('original_total_cost').notNull(),
  optimizedTotalCost: real('optimized_total_cost').notNull(),
  savingsAmount: real('savings_amount').notNull(),
  savingsPercent: real('savings_percent').notNull(),
  substitutions: jsonb('substitutions'), // { original, replacement, savings, reason }[]
  constraints: jsonb('constraints'), // string[] of user constraints
  status: text('status').notNull().default('draft'), // draft, accepted, rejected
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Sustainability Reports — carbon & green scoring
// ---------------------------------------------------------------------------
export const sustainabilityReports = pgTable('sustainability_reports', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  totalCarbonKg: real('total_carbon_kg').notNull(),
  materialCarbonKg: real('material_carbon_kg').notNull(),
  transportCarbonKg: real('transport_carbon_kg').notNull(),
  sustainabilityScore: integer('sustainability_score').notNull(), // 0-100
  leedPoints: integer('leed_points'),
  greenAlternatives: jsonb('green_alternatives'), // { material, alternative, carbonSaved, costDelta }[]
  modelProvider: text('model_provider'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Portfolios — multi-project grouping
// ---------------------------------------------------------------------------
export const portfolios = pgTable('portfolios', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Portfolio–Project associations
// ---------------------------------------------------------------------------
export const portfolioProjects = pgTable('portfolio_projects', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  portfolioId: text('portfolio_id')
    .notNull()
    .references(() => portfolios.id, { onDelete: 'cascade' }),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').default(0),
});

// ===========================================================================
// PHASE 5: ECOSYSTEM
// ===========================================================================

// ---------------------------------------------------------------------------
// Digital Twins
// ---------------------------------------------------------------------------
export const digitalTwins = pgTable('digital_twins', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  modelStorageKey: text('model_storage_key'),
  modelVersion: integer('model_version').default(1),
  status: text('status').notNull().default('draft'), // draft, active, archived
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// IoT Devices
// ---------------------------------------------------------------------------
export const iotDevices = pgTable('iot_devices', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  digitalTwinId: text('digital_twin_id')
    .notNull()
    .references(() => digitalTwins.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  deviceType: text('device_type').notNull(), // temperature, humidity, motion, energy, water
  positionJson: jsonb('position_json'), // { x, y, z }
  roomId: text('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('active'), // active, offline, maintenance
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// IoT Data Points
// ---------------------------------------------------------------------------
export const iotDataPoints = pgTable('iot_data_points', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  deviceId: text('device_id')
    .notNull()
    .references(() => iotDevices.id, { onDelete: 'cascade' }),
  value: real('value').notNull(),
  unit: text('unit').notNull(),
  timestamp: timestamp('timestamp', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Emergency References — shutoff/breaker locations
// ---------------------------------------------------------------------------
export const emergencyReferences = pgTable('emergency_references', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // water_shutoff, gas_shutoff, electrical_breaker, fire_extinguisher
  label: text('label').notNull(),
  description: text('description'),
  locationDescription: text('location_description'),
  positionJson: jsonb('position_json'), // { x, y, z }
  roomId: text('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Maintenance Schedules
// ---------------------------------------------------------------------------
export const maintenanceSchedules = pgTable('maintenance_schedules', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  itemName: text('item_name').notNull(),
  category: text('category').notNull(), // hvac, plumbing, electrical, structural, appliance, exterior
  frequencyDays: integer('frequency_days').notNull(),
  nextDueAt: timestamp('next_due_at', { mode: 'date' }).notNull(),
  provider: text('provider'),
  estimatedCost: real('estimated_cost'),
  status: text('status').notNull().default('active'), // active, paused, completed
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Maintenance Logs
// ---------------------------------------------------------------------------
export const maintenanceLogs = pgTable('maintenance_logs', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  scheduleId: text('schedule_id')
    .notNull()
    .references(() => maintenanceSchedules.id, { onDelete: 'cascade' }),
  performedAt: timestamp('performed_at', { mode: 'date' }).defaultNow().notNull(),
  performedBy: text('performed_by'),
  cost: real('cost'),
  notes: text('notes'),
  photoKeys: jsonb('photo_keys'), // string[]
});

// ---------------------------------------------------------------------------
// Warranties
// ---------------------------------------------------------------------------
export const warranties = pgTable('warranties', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  itemName: text('item_name').notNull(),
  category: text('category').notNull(), // appliance, fixture, material, system
  brand: text('brand'),
  serialNumber: text('serial_number'),
  warrantyStartDate: timestamp('warranty_start_date', { mode: 'date' }).notNull(),
  warrantyEndDate: timestamp('warranty_end_date', { mode: 'date' }).notNull(),
  warrantyType: text('warranty_type').notNull().default('manufacturer'), // manufacturer, extended, contractor
  status: text('status').notNull().default('active'), // active, expired, claimed
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Warranty Claims
// ---------------------------------------------------------------------------
export const warrantyClaims = pgTable('warranty_claims', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  warrantyId: text('warranty_id')
    .notNull()
    .references(() => warranties.id, { onDelete: 'cascade' }),
  issueDescription: text('issue_description').notNull(),
  photoKeys: jsonb('photo_keys'), // string[]
  status: text('status').notNull().default('filed'), // filed, in_review, approved, denied, resolved
  claimDate: timestamp('claim_date', { mode: 'date' }).defaultNow().notNull(),
  resolutionDate: timestamp('resolution_date', { mode: 'date' }),
});

// ---------------------------------------------------------------------------
// Offcut Listings — leftover material marketplace
// ---------------------------------------------------------------------------
export const offcutListings = pgTable('offcut_listings', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  materialType: text('material_type').notNull(), // wood, tile, stone, metal, fabric, other
  quantity: real('quantity').notNull(),
  unit: text('unit').notNull(), // pieces, sqft, sqm, linear_ft, linear_m, kg
  dimensions: jsonb('dimensions'), // { length, width, thickness, unit }
  condition: text('condition').notNull().default('new'), // new, like_new, good, fair
  askingPrice: real('asking_price'),
  currency: text('currency').default('USD'),
  imageKeys: jsonb('image_keys'), // string[]
  location: text('location'),
  status: text('status').notNull().default('active'), // active, sold, expired, removed
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Offcut Inquiries
// ---------------------------------------------------------------------------
export const offcutInquiries = pgTable('offcut_inquiries', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  listingId: text('listing_id')
    .notNull()
    .references(() => offcutListings.id, { onDelete: 'cascade' }),
  buyerUserId: text('buyer_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  message: text('message').notNull(),
  status: text('status').notNull().default('pending'), // pending, replied, accepted, declined
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Project Gallery Entries — community showcase
// ---------------------------------------------------------------------------
export const projectGalleryEntries = pgTable('project_gallery_entries', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  tags: jsonb('tags'), // string[]
  imageKeys: jsonb('image_keys'), // string[]
  style: text('style'),
  isPublic: boolean('is_public').default(true),
  likes: integer('likes').default(0),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Contractor Referrals
// ---------------------------------------------------------------------------
export const contractorReferrals = pgTable('contractor_referrals', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  referrerUserId: text('referrer_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  contractorId: text('contractor_id')
    .notNull()
    .references(() => contractors.id, { onDelete: 'cascade' }),
  refereeEmail: text('referee_email').notNull(),
  message: text('message'),
  status: text('status').notNull().default('sent'), // sent, viewed, hired
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Developer Apps — OAuth client registration
// ---------------------------------------------------------------------------
export const developerApps = pgTable('developer_apps', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  clientId: text('client_id').notNull().unique(),
  clientSecretHash: text('client_secret_hash').notNull(),
  redirectUris: jsonb('redirect_uris'), // string[]
  scopes: jsonb('scopes'), // string[]
  status: text('status').notNull().default('active'), // active, suspended, revoked
  rateLimitTier: text('rate_limit_tier').default('standard'), // standard, premium, enterprise
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// API Access Tokens
// ---------------------------------------------------------------------------
export const apiAccessTokens = pgTable('api_access_tokens', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  appId: text('app_id')
    .notNull()
    .references(() => developerApps.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  scopes: jsonb('scopes'), // string[]
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// API Request Logs
// ---------------------------------------------------------------------------
export const apiRequestLogs = pgTable('api_request_logs', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  appId: text('app_id')
    .notNull()
    .references(() => developerApps.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull(),
  method: text('method').notNull(),
  statusCode: integer('status_code').notNull(),
  responseTimeMs: integer('response_time_ms'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Webhook Subscriptions
// ---------------------------------------------------------------------------
export const webhookSubscriptions = pgTable('webhook_subscriptions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  appId: text('app_id')
    .notNull()
    .references(() => developerApps.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(), // project.created, bom.generated, payment.completed, etc.
  targetUrl: text('target_url').notNull(),
  secret: text('secret').notNull(),
  status: text('status').notNull().default('active'), // active, paused, failed
  failureCount: integer('failure_count').default(0),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Exchange Rates — cached currency conversion rates
// ---------------------------------------------------------------------------
export const exchangeRates = pgTable('exchange_rates', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  fromCurrency: text('from_currency').notNull(),
  toCurrency: text('to_currency').notNull(),
  rate: real('rate').notNull(),
  source: text('source').default('manual'), // manual, api
  fetchedAt: timestamp('fetched_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Quality Checkpoints — stage-gate quality verification
// ---------------------------------------------------------------------------
export const qualityCheckpoints = pgTable('quality_checkpoints', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  milestone: text('milestone').notNull(), // e.g. 'demolition_complete', 'rough_in_complete', 'waterproofing_complete'
  title: text('title').notNull(),
  description: text('description'),
  trade: text('trade'), // electrical, plumbing, carpentry, painting, tiling, etc.
  status: text('status').notNull().default('pending'), // pending, in_progress, passed, failed
  inspectedBy: text('inspected_by'),
  checklistItems: jsonb('checklist_items'), // { item: string, checked: boolean, note?: string }[]
  photoKeys: jsonb('photo_keys'), // string[]
  notes: text('notes'),
  inspectedAt: timestamp('inspected_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Punch List Items — snag/defect tracking
// ---------------------------------------------------------------------------
export const punchListItems = pgTable('punch_list_items', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  roomId: text('room_id')
    .references(() => rooms.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  severity: text('severity').notNull().default('minor'), // critical, major, minor, observation
  category: text('category'), // structural, finish, electrical, plumbing, carpentry, painting
  status: text('status').notNull().default('open'), // open, in_progress, resolved, verified, reopened
  assignedTo: text('assigned_to'), // contractor name or ID
  photoKeys: jsonb('photo_keys'), // string[]
  locationPin: jsonb('location_pin'), // { x: number, y: number, floorPlanId?: string }
  resolvedAt: timestamp('resolved_at', { mode: 'date' }),
  verifiedAt: timestamp('verified_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Handover Packages — project completion & handover documentation
// ---------------------------------------------------------------------------
export const handoverPackages = pgTable('handover_packages', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('draft'), // draft, in_progress, ready, delivered
  asBuiltDrawingKeys: jsonb('as_built_drawing_keys'), // string[]
  materialRegister: jsonb('material_register'), // { item, brand, model, batch, purchaseDate, vendor }[]
  contractorDirectory: jsonb('contractor_directory'), // { name, trade, phone, email }[]
  operationalGuides: jsonb('operational_guides'), // { system, instructions }[]
  maintenanceManualKey: text('maintenance_manual_key'), // file key for generated PDF
  clientSignedAt: timestamp('client_signed_at', { mode: 'date' }),
  deliveredAt: timestamp('delivered_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Collaboration Threads — threaded discussions per room/element
// ---------------------------------------------------------------------------
export const collaborationThreads = pgTable('collaboration_threads', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  roomId: text('room_id')
    .references(() => rooms.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  category: text('category').notNull().default('general'), // general, design_decision, issue, change_request, approval
  status: text('status').notNull().default('open'), // open, resolved, archived
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Collaboration Messages — messages within threads
// ---------------------------------------------------------------------------
export const collaborationMessages = pgTable('collaboration_messages', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  threadId: text('thread_id')
    .notNull()
    .references(() => collaborationThreads.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  mentions: jsonb('mentions'), // string[] of user IDs
  attachmentKeys: jsonb('attachment_keys'), // string[]
  isDecision: boolean('is_decision').default(false),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Delivery Tracking — material delivery logistics
// ---------------------------------------------------------------------------
export const deliveryTracking = pgTable('delivery_tracking', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  purchaseOrderId: text('purchase_order_id')
    .references(() => purchaseOrders.id, { onDelete: 'set null' }),
  vendorName: text('vendor_name').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('pending'), // pending, dispatched, in_transit, delivered, inspected, rejected
  trackingNumber: text('tracking_number'),
  estimatedDeliveryDate: timestamp('estimated_delivery_date', { mode: 'date' }),
  actualDeliveryDate: timestamp('actual_delivery_date', { mode: 'date' }),
  inspectionChecklist: jsonb('inspection_checklist'), // { item: string, passed: boolean, note?: string }[]
  inspectionPhotoKeys: jsonb('inspection_photo_keys'), // string[]
  receivedBy: text('received_by'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Style Preferences — design quiz & mood board
// ---------------------------------------------------------------------------
export const stylePreferences = pgTable('style_preferences', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  quizResponses: jsonb('quiz_responses'), // { questionId, selectedOption, imageUrl }[]
  detectedStyles: jsonb('detected_styles'), // { style: string, score: number }[]
  budgetTier: text('budget_tier'), // economy, mid_range, premium, luxury
  colorPreferences: jsonb('color_preferences'), // { palette: string[], warm: boolean }
  moodBoardItems: jsonb('mood_board_items'), // { imageUrl, caption, source, category }[]
  inspirationUrls: jsonb('inspiration_urls'), // string[]
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// ===========================================================================
// MISSING FEATURES — A. DESIGN & VISUALIZATION
// ===========================================================================

// ---------------------------------------------------------------------------
// A1. Parametric Design Engine
// ---------------------------------------------------------------------------
export const parametricRules = pgTable('parametric_rules', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  ruleType: text('rule_type').notNull(), // dimension_constraint | area_constraint | ratio_constraint | dependency | code_min
  targetType: text('target_type').notNull(), // room | wall | opening | roof
  targetId: text('target_id'),
  expression: jsonb('expression').notNull(),
  priority: integer('priority').default(0),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const designTemplates = pgTable('design_templates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  homeType: text('home_type').notNull(),
  description: text('description'),
  thumbnailKey: text('thumbnail_key'),
  roomDefinitions: jsonb('room_definitions').notNull(),
  defaultRules: jsonb('default_rules').notNull(),
  metadata: jsonb('metadata'),
  isPublic: boolean('is_public').default(false).notNull(),
  priceUsd: real('price_usd'),
  saleCount: integer('sale_count').default(0),
  revenueSharePercent: real('revenue_share_percent').default(70),
  authorId: text('author_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const parametricHistory = pgTable('parametric_history', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  action: text('action').notNull(),
  beforeState: jsonb('before_state').notNull(),
  afterState: jsonb('after_state').notNull(),
  triggeredBy: text('triggered_by'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// A2. 2D Floor Plan Editor
// ---------------------------------------------------------------------------
export const floorPlanCanvases = pgTable('floor_plan_canvases', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  floorNumber: integer('floor_number').notNull().default(0),
  name: text('name').notNull(),
  canvasState: jsonb('canvas_state').notNull(),
  gridSize: integer('grid_size').default(100),
  scale: real('scale').default(1.0),
  layers: jsonb('layers'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const wallSegments = pgTable('wall_segments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  canvasId: text('canvas_id').notNull().references(() => floorPlanCanvases.id, { onDelete: 'cascade' }),
  roomId: text('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  startX: real('start_x').notNull(),
  startY: real('start_y').notNull(),
  endX: real('end_x').notNull(),
  endY: real('end_y').notNull(),
  thickness: real('thickness').notNull().default(150),
  wallType: text('wall_type').notNull().default('interior'),
  materialType: text('material_type'),
  layer: text('layer').default('structural'),
  metadata: jsonb('metadata'),
});

export const openings = pgTable('openings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  wallSegmentId: text('wall_segment_id').notNull().references(() => wallSegments.id, { onDelete: 'cascade' }),
  openingType: text('opening_type').notNull(),
  subType: text('sub_type'),
  offsetFromStart: real('offset_from_start').notNull(),
  width: real('width').notNull(),
  height: real('height').notNull(),
  sillHeight: real('sill_height').default(0),
  swingDirection: text('swing_direction'),
  swingAngle: real('swing_angle').default(90),
  layer: text('layer').default('structural'),
  metadata: jsonb('metadata'),
});

export const staircases = pgTable('staircases', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  canvasId: text('canvas_id').notNull().references(() => floorPlanCanvases.id, { onDelete: 'cascade' }),
  stairType: text('stair_type').notNull(),
  startX: real('start_x').notNull(),
  startY: real('start_y').notNull(),
  totalRise: real('total_rise').notNull(),
  riserHeight: real('riser_height'),
  treadDepth: real('tread_depth'),
  width: real('width').notNull().default(900),
  numRisers: integer('num_risers'),
  direction: real('direction').default(0),
  landingDepth: real('landing_depth'),
  handrailSides: text('handrail_sides').default('both'),
  metadata: jsonb('metadata'),
});

// ---------------------------------------------------------------------------
// A3. Exterior Design & Facade Generator
// ---------------------------------------------------------------------------
export const exteriorDesigns = pgTable('exterior_designs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  designType: text('design_type').notNull(),
  elevationType: text('elevation_type').notNull().default('front'),
  viewDirection: text('view_direction'),
  roofStyle: text('roof_style'),
  facadeMaterial: text('facade_material'),
  facadeMaterials: jsonb('facade_materials'),
  landscapeElements: jsonb('landscape_elements'),
  landscapeNotes: text('landscape_notes'),
  outdoorSpaces: jsonb('outdoor_spaces'),
  description: text('description'),
  renderUrl: text('render_url'),
  style: text('style'),
  status: text('status').notNull().default('draft'),
  specJson: jsonb('spec_json'),
  jobId: text('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// A4. Kitchen & Bath Design Module
// ---------------------------------------------------------------------------
export const cabinetLayouts = pgTable('cabinet_layouts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  layoutType: text('layout_type').notNull(),
  cabinets: jsonb('cabinets').notNull(),
  countertops: jsonb('countertops'),
  appliances: jsonb('appliances'),
  backsplash: jsonb('backsplash'),
  workTriangleScore: real('work_triangle_score'),
  workTrianglePerimeter: real('work_triangle_perimeter'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const bathroomLayouts = pgTable('bathroom_layouts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  fixtures: jsonb('fixtures').notNull(),
  showerEnclosure: jsonb('shower_enclosure'),
  vanity: jsonb('vanity'),
  adaCompliant: boolean('ada_compliant').default(false),
  ventilation: jsonb('ventilation'),
  waterproofing: jsonb('waterproofing'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// A4b. Unified Kitchen & Bath Layouts (project-level)
export const kitchenBathLayouts = pgTable('kitchen_bath_layouts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  roomType: text('room_type').notNull(), // kitchen, master_bath, guest_bath, powder_room, laundry, wet_bar
  roomName: text('room_name').notNull(),
  cabinetType: text('cabinet_type').notNull(),
  countertopMaterial: text('countertop_material').notNull(),
  edgeProfile: text('edge_profile').notNull(),
  notes: text('notes'),
  status: text('status').default('draft').notNull(), // draft, designing, validated, issues
  workTriangleScore: real('work_triangle_score'),
  workTriangleDistance: real('work_triangle_distance'),
  validationResults: jsonb('validation_results'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// A5. Lighting Design Simulator
// ---------------------------------------------------------------------------
export const lightingDesigns = pgTable('lighting_designs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  fixtures: jsonb('fixtures').notNull(),
  switchZones: jsonb('switch_zones'),
  naturalLight: jsonb('natural_light'),
  luxCalculation: jsonb('lux_calculation'),
  daylightFactor: real('daylight_factor'),
  targetLux: integer('target_lux'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// A5b. Lighting Fixtures (project-level, per-fixture records)
export const lightingFixtures = pgTable('lighting_fixtures', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  fixtureType: text('fixture_type').notNull(),
  lumens: integer('lumens').notNull(),
  wattage: real('wattage').notNull(),
  colorTemp: integer('color_temp').notNull(),
  quantity: integer('quantity').default(1).notNull(),
  switchZone: text('switch_zone'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// A6. Material & Finish Board Generator
// ---------------------------------------------------------------------------
export const materialBoards = pgTable('material_boards', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  roomId: text('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  boardType: text('board_type').default('room').notNull(),
  materialCategory: text('material_category'),
  description: text('description'),
  status: text('status').default('draft').notNull(),
  materialCount: integer('material_count').default(0),
  swatches: jsonb('swatches'),
  thumbnailUrl: text('thumbnail_url'),
  shareToken: text('share_token'),
  items: jsonb('items').notNull(),
  layout: text('layout').default('grid'),
  brandingConfig: jsonb('branding_config'),
  pdfKey: text('pdf_key'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// A7. Photorealistic Rendering Engine
// ---------------------------------------------------------------------------
export const renderJobs = pgTable('render_jobs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  roomId: text('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  jobId: text('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  name: text('name'),
  description: text('description'),
  renderType: text('render_type').notNull(),
  quality: text('quality').default('standard'),
  resolution: text('resolution').notNull(),
  timeOfDay: text('time_of_day'),
  season: text('season'),
  cameraPosition: jsonb('camera_position'),
  sceneKey: text('scene_key'),
  outputKey: text('output_key'),
  outputUrl: text('output_url'),
  samples: integer('samples').default(256),
  status: text('status').default('queued'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ===========================================================================
// MISSING FEATURES — B. STRUCTURAL & ENGINEERING
// ===========================================================================

export const structuralElements = pgTable('structural_elements', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  elementType: text('element_type').notNull(), // beam, column, foundation, wall, slab, roof_truss, retaining_wall
  spanLength: real('span_length'), // feet
  loadType: text('load_type'), // dead, live, wind, seismic, snow
  loadValue: real('load_value'), // psf
  material: text('material'),
  notes: text('notes'),
  status: text('status').default('pending'), // pending, analyzing, pass, fail, warning
  recommendedSize: text('recommended_size'),
  analysisResult: jsonb('analysis_result'), // detailed analysis output
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const structuralAnalyses = pgTable('structural_analyses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  analysisType: text('analysis_type').notNull(),
  inputParameters: jsonb('input_parameters').notNull(),
  result: jsonb('result').notNull(),
  standardsCited: jsonb('standards_cited'),
  status: text('status').default('completed'),
  jobId: text('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const siteAnalysisItems = pgTable('site_analysis_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  analysisType: text('analysis_type').notNull(), // topography, solar, grading, wind, noise, soil, flood, setback
  soilType: text('soil_type'),
  elevation: real('elevation'), // feet
  slopePercent: real('slope_percent'),
  notes: text('notes'),
  status: text('status').default('pending'), // pending, processing, completed, warning, critical
  results: jsonb('results'), // AI-generated analysis results
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const siteAnalyses = pgTable('site_analyses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  topoData: jsonb('topo_data'),
  setbacks: jsonb('setbacks'),
  solarData: jsonb('solar_data'),
  gradeData: jsonb('grade_data'),
  drainagePlan: jsonb('drainage_plan'),
  soilType: text('soil_type'),
  floodZone: text('flood_zone'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const energyModels = pgTable('energy_models', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  envelopeSpec: jsonb('envelope_spec'),
  climateZone: text('climate_zone'),
  simulationResult: jsonb('simulation_result'),
  hersScore: real('hers_score'),
  recommendations: jsonb('recommendations'),
  solarPanelSpec: jsonb('solar_panel_spec'),
  jobId: text('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const energyModelItems = pgTable('energy_model_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  modelType: text('model_type').notNull(),
  rValue: real('r_value'),
  windowWallRatio: real('window_wall_ratio'),
  orientation: text('orientation'),
  notes: text('notes'),
  status: text('status').default('draft'),
  result: jsonb('result'), // AI-generated simulation results
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const acousticAssessments = pgTable('acoustic_assessments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  assessmentType: text('assessment_type').notNull(),
  sourceRoomId: text('source_room_id'),
  receivingRoomId: text('receiving_room_id'),
  sourceRoomName: text('source_room_name'),
  receivingRoomName: text('receiving_room_name'),
  roomUse: text('room_use'),
  wallType: text('wall_type'),
  notes: text('notes'),
  status: text('status').default('pending'),
  stcValue: integer('stc_value'),
  iicValue: integer('iic_value'),
  reverbTime: real('reverb_time'),
  recommendation: text('recommendation'),
  analysisResult: jsonb('analysis_result'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const acousticAnalyses = pgTable('acoustic_analyses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  roomPairs: jsonb('room_pairs'),
  stcRatings: jsonb('stc_ratings'),
  iicRatings: jsonb('iic_ratings'),
  reverbTime: jsonb('reverb_time'),
  recommendations: jsonb('recommendations'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ===========================================================================
// MISSING FEATURES — C. PROJECT MANAGEMENT & FIELD
// ===========================================================================

export const rfis = pgTable('rfis', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  rfiNumber: integer('rfi_number').notNull(),
  subject: text('subject').notNull(),
  question: text('question').notNull(),
  response: text('response'),
  status: text('status').notNull().default('open'),
  priority: text('priority').default('normal'),
  askedBy: text('asked_by').notNull().references(() => users.id),
  assignedTo: text('assigned_to').references(() => users.id),
  relatedDrawingId: text('related_drawing_id').references(() => drawingResults.id, { onDelete: 'set null' }),
  relatedSpecSection: text('related_spec_section'),
  attachments: jsonb('attachments'),
  dueDate: timestamp('due_date', { mode: 'date' }),
  respondedAt: timestamp('responded_at', { mode: 'date' }),
  respondedBy: text('responded_by').references(() => users.id),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const submittals = pgTable('submittals', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  submittalNumber: integer('submittal_number').notNull(),
  specSection: text('spec_section'),
  description: text('description').notNull(),
  submittedProductId: text('submitted_product_id').references(() => products.id, { onDelete: 'set null' }),
  specifiedProductId: text('specified_product_id').references(() => products.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('pending'),
  reviewerNotes: text('reviewer_notes'),
  stampType: text('stamp_type'),
  pdfKey: text('pdf_key'),
  stampedPdfKey: text('stamped_pdf_key'),
  submittedBy: text('submitted_by').references(() => users.id),
  reviewedBy: text('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const submittalItems = pgTable('submittal_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  submittalNumber: integer('submittal_number').notNull(),
  specDivision: text('spec_division').notNull(),
  contractor: text('contractor'),
  productName: text('product_name').notNull(),
  manufacturer: text('manufacturer'),
  description: text('description'),
  status: text('status').notNull().default('pending'),
  reviewNotes: text('review_notes'),
  reviewedAt: timestamp('reviewed_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const progressReports = pgTable('progress_reports', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  reportType: text('report_type').notNull(),
  title: text('title').notNull().default(''),
  status: text('status').notNull().default('draft'),
  periodStart: timestamp('period_start', { mode: 'date' }),
  periodEnd: timestamp('period_end', { mode: 'date' }),
  overallProgress: integer('overall_progress'),
  laborHours: doublePrecision('labor_hours'),
  weatherDelayDays: integer('weather_delay_days').default(0),
  photoCount: integer('photo_count').default(0),
  summary: text('summary'),
  content: jsonb('content'),
  pdfKey: text('pdf_key'),
  emailedTo: jsonb('emailed_to'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const safetyRecords = pgTable('safety_records', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  recordType: text('record_type').notNull().default('checklist'),
  severity: text('severity').notNull().default('minor'),
  phase: text('phase').notNull().default('framing'),
  status: text('status').notNull().default('open'),
  description: text('description'),
  assignedTo: text('assigned_to'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const safetyChecklists = pgTable('safety_checklists', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  phase: text('phase').notNull(),
  templateName: text('template_name').notNull(),
  items: jsonb('items').notNull(),
  completedBy: text('completed_by'),
  completedAt: timestamp('completed_at', { mode: 'date' }),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const safetyIncidents = pgTable('safety_incidents', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  incidentType: text('incident_type').notNull(),
  severity: text('severity').notNull().default('minor'),
  date: timestamp('date', { mode: 'date' }).notNull(),
  description: text('description').notNull(),
  location: text('location'),
  witnesses: jsonb('witnesses'),
  photoKeys: jsonb('photo_keys'),
  correctiveActions: text('corrective_actions'),
  reportedBy: text('reported_by').references(() => users.id),
  status: text('status').notNull().default('reported'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const safetyTrainingRecords = pgTable('safety_training_records', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  workerName: text('worker_name').notNull(),
  trainingType: text('training_type').notNull(),
  certificationNumber: text('certification_number'),
  completedDate: timestamp('completed_date', { mode: 'date' }).notNull(),
  expirationDate: timestamp('expiration_date', { mode: 'date' }),
  documentKey: text('document_key'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const permits = pgTable('permits', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  permitType: text('permit_type').notNull(),
  jurisdiction: text('jurisdiction'),
  applicationDate: timestamp('application_date', { mode: 'date' }),
  submittedDate: timestamp('submitted_date', { mode: 'date' }),
  approvalDate: timestamp('approval_date', { mode: 'date' }),
  permitNumber: text('permit_number'),
  status: text('status').notNull().default('draft'),
  expirationDate: timestamp('expiration_date', { mode: 'date' }),
  inspectorName: text('inspector_name'),
  inspectorPhone: text('inspector_phone'),
  documents: jsonb('documents'),
  fees: real('fees'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const inspections = pgTable('inspections', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  permitId: text('permit_id').notNull().references(() => permits.id, { onDelete: 'cascade' }),
  inspectionType: text('inspection_type').notNull(),
  scheduledDate: timestamp('scheduled_date', { mode: 'date' }),
  completedDate: timestamp('completed_date', { mode: 'date' }),
  result: text('result'),
  inspectorName: text('inspector_name'),
  inspectorPhone: text('inspector_phone'),
  notes: text('notes'),
  photoKeys: jsonb('photo_keys'),
  corrections: jsonb('corrections'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const documentVersions = pgTable('document_versions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  documentType: text('document_type').notNull(),
  documentNumber: text('document_number'),
  revision: text('revision').notNull(),
  title: text('title').notNull(),
  fileKey: text('file_key'),
  previousVersionId: text('previous_version_id'),
  status: text('status').notNull().default('current'),
  changesDescription: text('changes_description'),
  distributionList: jsonb('distribution_list'),
  issuedDate: timestamp('issued_date', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ===========================================================================
// MISSING FEATURES — D. CLIENT EXPERIENCE
// ===========================================================================

export const projectClients = pgTable('project_clients', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  clientUserId: text('client_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessLevel: text('access_level').notNull().default('view_only'),
  invitedBy: text('invited_by').references(() => users.id),
  invitedAt: timestamp('invited_at', { mode: 'date' }).defaultNow().notNull(),
});

export const selectionCategories = pgTable('selection_categories', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  allowanceBudget: real('allowance_budget'),
  dueDate: timestamp('due_date', { mode: 'date' }),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const selections = pgTable('selections', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  categoryId: text('category_id').notNull().references(() => selectionCategories.id, { onDelete: 'cascade' }),
  roomId: text('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  selectedProductId: text('selected_product_id').references(() => products.id, { onDelete: 'set null' }),
  productName: text('product_name'),
  actualCost: real('actual_cost'),
  overUnder: real('over_under'),
  status: text('status').notNull().default('pending'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const inspirationBoards = pgTable('inspiration_boards', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  layout: text('layout').default('masonry'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const inspirationPins = pgTable('inspiration_pins', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  boardId: text('board_id').notNull().references(() => inspirationBoards.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  imageUrl: text('image_url'),
  imageKey: text('image_key'),
  sourceUrl: text('source_url'),
  note: text('note'),
  tags: jsonb('tags'),
  style: text('style'),
  category: text('category'),
  position: jsonb('position'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const walkthroughAnnotations = pgTable('walkthrough_annotations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  roomId: text('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  position3d: jsonb('position_3d'),
  annotationType: text('annotation_type').notNull(),
  content: text('content'),
  voiceRecordingKey: text('voice_recording_key'),
  status: text('status').notNull().default('open'),
  createdBy: text('created_by').notNull().references(() => users.id),
  resolvedBy: text('resolved_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ===========================================================================
// MISSING FEATURES — E. BUSINESS OPERATIONS
// ===========================================================================

export const contractTemplates = pgTable('contract_templates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  content: text('content').notNull(),
  category: text('category'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const proposals = pgTable('proposals', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  templateId: text('template_id').references(() => contractTemplates.id, { onDelete: 'set null' }),
  scopeOfWork: text('scope_of_work'),
  feeStructure: jsonb('fee_structure'),
  termsAndConditions: text('terms_and_conditions'),
  paymentSchedule: jsonb('payment_schedule'),
  status: text('status').notNull().default('draft'),
  signatureRequestId: text('signature_request_id'),
  signedAt: timestamp('signed_at', { mode: 'date' }),
  pdfKey: text('pdf_key'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const leads = pgTable('leads', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  source: text('source'),
  status: text('status').notNull().default('new'),
  estimatedValue: real('estimated_value'),
  notes: text('notes'),
  nextFollowUp: timestamp('next_follow_up', { mode: 'date' }),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const leadActivities = pgTable('lead_activities', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  leadId: text('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  activityType: text('activity_type').notNull(),
  description: text('description').notNull(),
  date: timestamp('date', { mode: 'date' }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const timeEntries = pgTable('time_entries', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  date: timestamp('date', { mode: 'date' }).notNull(),
  hours: real('hours').notNull(),
  description: text('description'),
  billable: boolean('billable').default(true),
  rate: real('rate'),
  status: text('status').notNull().default('draft'),
  approvedBy: text('approved_by').references(() => users.id),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const insuranceCertificates = pgTable('insurance_certificates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  insuranceType: text('insurance_type').notNull(),
  carrier: text('carrier'),
  policyNumber: text('policy_number'),
  coverageAmount: real('coverage_amount'),
  startDate: timestamp('start_date', { mode: 'date' }).notNull(),
  endDate: timestamp('end_date', { mode: 'date' }).notNull(),
  certificateKey: text('certificate_key'),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const teams = pgTable('teams', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const teamMembers = pgTable('team_members', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const projectAssignments = pgTable('project_assignments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  allocationPercent: integer('allocation_percent').default(100),
  startDate: timestamp('start_date', { mode: 'date' }),
  endDate: timestamp('end_date', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ===========================================================================
// MISSING FEATURES — F. ADVANCED TECHNOLOGY
// ===========================================================================

export const spacePlans = pgTable('space_plans', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  layoutVariant: integer('layout_variant').notNull().default(1),
  furniturePlacements: jsonb('furniture_placements'),
  circulationScore: real('circulation_score'),
  fengShuiScore: real('feng_shui_score'),
  accessibilityScore: real('accessibility_score'),
  prosAndCons: jsonb('pros_and_cons'),
  jobId: text('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const complianceQueries = pgTable('compliance_queries', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  query: text('query').notNull(),
  response: text('response'),
  codeReferences: jsonb('code_references'),
  jurisdiction: text('jurisdiction'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const droneCaptures = pgTable('drone_captures', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  captureDate: timestamp('capture_date', { mode: 'date' }).notNull(),
  gpsData: jsonb('gps_data'),
  imageKeys: jsonb('image_keys'),
  pointCloudKey: text('point_cloud_key'),
  terrainMeshKey: text('terrain_mesh_key'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const lidarScans = pgTable('lidar_scans', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  rawPointCloudKey: text('raw_point_cloud_key'),
  processedPointCloudKey: text('processed_point_cloud_key'),
  extractedPlanKey: text('extracted_plan_key'),
  clashReport: jsonb('clash_report'),
  status: text('status').notNull().default('uploaded'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const smartHomePlans = pgTable('smart_home_plans', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  networkRackLocation: jsonb('network_rack_location'),
  wifiAccessPoints: jsonb('wifi_access_points'),
  smartDevices: jsonb('smart_devices'),
  wiringRuns: jsonb('wiring_runs'),
  scenes: jsonb('scenes'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

// ===========================================================================
// MISSING FEATURES — G. SPECIALIZED DESIGN AREAS
// ===========================================================================

export const closetLayouts = pgTable('closet_layouts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  layoutType: text('layout_type'),
  sections: jsonb('sections'),
  accessories: jsonb('accessories'),
  totalLinearFt: real('total_linear_ft'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const theaterDesigns = pgTable('theater_designs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  screenSpec: jsonb('screen_spec'),
  speakerLayout: jsonb('speaker_layout'),
  seatingLayout: jsonb('seating_layout'),
  acousticTreatment: jsonb('acoustic_treatment'),
  lightingZones: jsonb('lighting_zones'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const outdoorDesigns = pgTable('outdoor_designs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  designType: text('design_type').notNull(),
  elements: jsonb('elements'),
  materials: jsonb('materials'),
  gradeIntegration: jsonb('grade_integration'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const universalDesignChecks = pgTable('universal_design_checks', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  roomId: text('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  checkResults: jsonb('check_results'),
  complianceLevel: text('compliance_level'),
  recommendations: jsonb('recommendations'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const multiUnitPlans = pgTable('multi_unit_plans', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  unitCount: integer('unit_count').notNull(),
  units: jsonb('units'),
  sharedSpaces: jsonb('shared_spaces'),
  parkingSpaces: integer('parking_spaces'),
  zoningCompliance: jsonb('zoning_compliance'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ===========================================================================
// MISSING FEATURES — H. REPORTING & DOCUMENTATION
// ===========================================================================

export const drawingSetConfigs = pgTable('drawing_set_configs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  titleBlockTemplate: jsonb('title_block_template'),
  sheetNumberingScheme: text('sheet_numbering_scheme'),
  symbolLegend: jsonb('symbol_legend'),
  abbreviationKey: jsonb('abbreviation_key'),
  firmLogo: text('firm_logo'),
  firmName: text('firm_name'),
  defaultScale: text('default_scale'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const specifications = pgTable('specifications', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  division: text('division').notNull(),
  section: text('section').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  productReferences: jsonb('product_references'),
  format: text('format').default('prescriptive'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const specSections = pgTable('spec_sections', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  sectionNumber: text('section_number').notNull(),
  title: text('title').notNull(),
  division: text('division').notNull(),
  content: text('content'),
  status: text('status').default('draft'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const asBuiltMarkups = pgTable('as_built_markups', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  drawingResultId: text('drawing_result_id').notNull().references(() => drawingResults.id, { onDelete: 'cascade' }),
  markupData: jsonb('markup_data'),
  deviations: jsonb('deviations'),
  markedUpPdfKey: text('marked_up_pdf_key'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// Project-level as-built field markups
export const asBuiltFieldMarkups = pgTable('as_built_field_markups', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sheetNumber: text('sheet_number').notNull(),
  markupType: text('markup_type').notNull(),
  discipline: text('discipline'),
  description: text('description').notNull(),
  originalValue: text('original_value'),
  asBuiltValue: text('as_built_value'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ===========================================================================
// MISSING FEATURES — I. INTEGRATIONS
// ===========================================================================

export const integrationConfigs = pgTable('integration_configs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  syncStatus: text('sync_status'),
  lastSyncAt: timestamp('last_sync_at', { mode: 'date' }),
  config: jsonb('config'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const communicationPreferences = pgTable('communication_preferences', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  channel: text('channel').notNull(),
  enabled: boolean('enabled').default(true),
  config: jsonb('config'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const propertyValuations = pgTable('property_valuations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  preRenovationValue: real('pre_renovation_value'),
  renovationCost: real('renovation_cost'),
  postRenovationEstimate: real('post_renovation_estimate'),
  roi: real('roi'),
  comparables: jsonb('comparables'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ===========================================================================
// MISSING FEATURES — J. MARKETPLACE ENHANCEMENTS
// ===========================================================================

export const serviceBookings = pgTable('service_bookings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  professionalId: text('professional_id').notNull().references(() => contractors.id, { onDelete: 'cascade' }),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  clientUserId: text('client_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  serviceType: text('service_type').notNull(),
  scheduledDate: timestamp('scheduled_date', { mode: 'date' }).notNull(),
  duration: integer('duration'),
  status: text('status').notNull().default('pending'),
  amount: real('amount'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const sampleRequests = pgTable('sample_requests', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  products: jsonb('products'),
  shippingAddress: text('shipping_address'),
  status: text('status').notNull().default('requested'),
  trackingNumber: text('tracking_number'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ===========================================================================
// MISSING FEATURES — L. DATA & INTELLIGENCE
// ===========================================================================

export const marketBenchmarks = pgTable('market_benchmarks', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  region: text('region').notNull(),
  homeType: text('home_type'),
  qualityTier: text('quality_tier'),
  costPerSqft: real('cost_per_sqft'),
  dataSource: text('data_source'),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const laborRates = pgTable('labor_rates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  trade: text('trade').notNull(),
  region: text('region').notNull(),
  hourlyRate: real('hourly_rate').notNull(),
  currency: text('currency').default('USD'),
  dataSource: text('data_source'),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const postOccupancySurveys = pgTable('post_occupancy_surveys', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  surveyType: text('survey_type').notNull(),
  responses: jsonb('responses'),
  sentAt: timestamp('sent_at', { mode: 'date' }),
  completedAt: timestamp('completed_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const lessonsLearned = pgTable('lessons_learned', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  category: text('category'),
  title: text('title').notNull(),
  description: text('description').notNull(),
  tags: jsonb('tags'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Compliance Reports (persisted compliance check results)
// ---------------------------------------------------------------------------
export const complianceReports = pgTable('compliance_reports', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  jurisdiction: text('jurisdiction').notNull().default('IN'),
  status: text('status').notNull().default('pending'), // pending, running, completed, failed
  summary: jsonb('summary'), // { totalRooms, totalChecks, pass, fail, warning, complianceRate }
  roomResults: jsonb('room_results'), // array of room results with checks
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { mode: 'date' }),
});

// ---------------------------------------------------------------------------
// Compliance Chat Messages
// ---------------------------------------------------------------------------
export const complianceChatMessages = pgTable('compliance_chat_messages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'user' | 'assistant'
  content: text('content').notNull(),
  citations: jsonb('citations'), // [{ code, section, text }]
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const designFeedback = pgTable('design_feedback', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  designVariantId: text('design_variant_id').notNull().references(() => designVariants.id, { onDelete: 'cascade' }),
  feedbackType: text('feedback_type').notNull(),
  notes: text('notes'),
  changeDetails: jsonb('change_details'),
  region: text('region'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});
