CREATE TABLE "api_access_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"scopes" jsonb,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_request_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"method" text NOT NULL,
	"status_code" integer NOT NULL,
	"response_time_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"requested_by" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bom_results" (
	"id" text PRIMARY KEY NOT NULL,
	"design_variant_id" text NOT NULL,
	"job_id" text,
	"items" jsonb NOT NULL,
	"total_cost" real,
	"currency" text DEFAULT 'USD',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_scenarios" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"original_total_cost" real NOT NULL,
	"optimized_total_cost" real NOT NULL,
	"savings_amount" real NOT NULL,
	"savings_percent" real NOT NULL,
	"substitutions" jsonb,
	"constraints" jsonb,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"parent_id" text,
	"icon" text,
	"image_url" text,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"product_count" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "change_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'proposed' NOT NULL,
	"cost_impact" real,
	"time_impact_days" integer,
	"approved_by" text,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collaboration_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"mentions" jsonb,
	"attachment_keys" jsonb,
	"is_decision" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collaboration_threads" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"room_id" text,
	"title" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text NOT NULL,
	"parent_id" text,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"content" text NOT NULL,
	"resolved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contractor_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"contractor_id" text NOT NULL,
	"project_id" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"agreed_amount" real,
	"currency" text DEFAULT 'USD',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contractor_referrals" (
	"id" text PRIMARY KEY NOT NULL,
	"referrer_user_id" text NOT NULL,
	"contractor_id" text NOT NULL,
	"referee_email" text NOT NULL,
	"message" text,
	"status" text DEFAULT 'sent' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contractor_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"contractor_id" text NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text,
	"rating" integer NOT NULL,
	"title" text,
	"review" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contractors" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"company_name" text,
	"bio" text,
	"website" text,
	"profile_image_url" text,
	"specializations" jsonb,
	"phone" text,
	"email" text,
	"address" text,
	"city" text,
	"state" text,
	"rating" real DEFAULT 0,
	"total_reviews" integer DEFAULT 0,
	"verified" boolean DEFAULT false,
	"years_experience" integer,
	"portfolio_keys" jsonb,
	"portfolio_urls" jsonb,
	"certifications" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_predictions" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"predicted_cost" real NOT NULL,
	"confidence_low" real NOT NULL,
	"confidence_high" real NOT NULL,
	"risk_factors" jsonb,
	"breakdown" jsonb,
	"model_provider" text NOT NULL,
	"input_snapshot" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cutlist_results" (
	"id" text PRIMARY KEY NOT NULL,
	"design_variant_id" text NOT NULL,
	"job_id" text,
	"panels" jsonb NOT NULL,
	"hardware" jsonb,
	"nesting_result" jsonb,
	"total_sheets" integer,
	"waste_percent" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_tracking" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"purchase_order_id" text,
	"vendor_name" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"tracking_number" text,
	"estimated_delivery_date" timestamp,
	"actual_delivery_date" timestamp,
	"inspection_checklist" jsonb,
	"inspection_photo_keys" jsonb,
	"received_by" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "developer_apps" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"client_id" text NOT NULL,
	"client_secret_hash" text NOT NULL,
	"redirect_uris" jsonb,
	"scopes" jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"rate_limit_tier" text DEFAULT 'standard',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "developer_apps_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "digital_twins" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"model_storage_key" text,
	"model_version" integer DEFAULT 1,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drawing_results" (
	"id" text PRIMARY KEY NOT NULL,
	"design_variant_id" text NOT NULL,
	"job_id" text,
	"drawing_type" text NOT NULL,
	"dxf_storage_key" text,
	"pdf_storage_key" text,
	"svg_storage_key" text,
	"ifc_storage_key" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_references" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"type" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"location_description" text,
	"position_json" jsonb,
	"room_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" text PRIMARY KEY NOT NULL,
	"from_currency" text NOT NULL,
	"to_currency" text NOT NULL,
	"rate" real NOT NULL,
	"source" text DEFAULT 'manual',
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "handover_packages" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"as_built_drawing_keys" jsonb,
	"material_register" jsonb,
	"contractor_directory" jsonb,
	"operational_guides" jsonb,
	"maintenance_manual_key" text,
	"client_signed_at" timestamp,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"purchase_order_id" text,
	"invoice_number" text NOT NULL,
	"amount" real NOT NULL,
	"currency" text DEFAULT 'USD',
	"status" text DEFAULT 'draft' NOT NULL,
	"due_date" timestamp,
	"paid_date" timestamp,
	"pdf_storage_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iot_data_points" (
	"id" text PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"value" real NOT NULL,
	"unit" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iot_devices" (
	"id" text PRIMARY KEY NOT NULL,
	"digital_twin_id" text NOT NULL,
	"name" text NOT NULL,
	"device_type" text NOT NULL,
	"position_json" jsonb,
	"room_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"input_json" jsonb,
	"output_json" jsonb,
	"error" text,
	"progress" integer DEFAULT 0,
	"project_id" text,
	"room_id" text,
	"design_variant_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "maintenance_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"schedule_id" text NOT NULL,
	"performed_at" timestamp DEFAULT now() NOT NULL,
	"performed_by" text,
	"cost" real,
	"notes" text,
	"photo_keys" jsonb
);
--> statement-breakpoint
CREATE TABLE "maintenance_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"item_name" text NOT NULL,
	"category" text NOT NULL,
	"frequency_days" integer NOT NULL,
	"next_due_at" timestamp NOT NULL,
	"provider" text,
	"estimated_cost" real,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mep_calculations" (
	"id" text PRIMARY KEY NOT NULL,
	"design_variant_id" text NOT NULL,
	"job_id" text,
	"calc_type" text NOT NULL,
	"result" jsonb NOT NULL,
	"standards_cited" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" text PRIMARY KEY NOT NULL,
	"schedule_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"due_date" timestamp,
	"completed_date" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_linked" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text,
	"link" text,
	"read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offcut_inquiries" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"buyer_user_id" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offcut_listings" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"material_type" text NOT NULL,
	"quantity" real NOT NULL,
	"unit" text NOT NULL,
	"dimensions" jsonb,
	"condition" text DEFAULT 'new' NOT NULL,
	"asking_price" real,
	"currency" text DEFAULT 'USD',
	"image_keys" jsonb,
	"location" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"milestone_id" text,
	"amount" real NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_provider" text,
	"external_id" text,
	"metadata" jsonb,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_projects" (
	"id" text PRIMARY KEY NOT NULL,
	"portfolio_id" text NOT NULL,
	"project_id" text NOT NULL,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "portfolios" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_embeddings" (
	"product_id" text PRIMARY KEY NOT NULL,
	"embedding" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_prices" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"vendor_id" text NOT NULL,
	"price" real NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"unit" text DEFAULT 'piece',
	"valid_from" timestamp DEFAULT now() NOT NULL,
	"valid_to" timestamp
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"brand" text,
	"category" text NOT NULL,
	"category_id" text,
	"subcategory" text,
	"vendor_id" text,
	"sku" text,
	"status" text DEFAULT 'active' NOT NULL,
	"unit" text DEFAULT 'piece',
	"image_url" text,
	"image_storage_key" text,
	"images" jsonb,
	"tags" jsonb,
	"specifications" jsonb,
	"dimensions" jsonb,
	"weight_kg" real,
	"material" text,
	"finish" text,
	"color" text,
	"prices" jsonb,
	"min_price" real,
	"max_price" real,
	"embedding" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_gallery_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"tags" jsonb,
	"image_keys" jsonb,
	"style" text,
	"is_public" boolean DEFAULT true,
	"likes" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "punch_list_items" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"room_id" text,
	"title" text NOT NULL,
	"description" text,
	"severity" text DEFAULT 'minor' NOT NULL,
	"category" text,
	"status" text DEFAULT 'open' NOT NULL,
	"assigned_to" text,
	"photo_keys" jsonb,
	"location_pin" jsonb,
	"resolved_at" timestamp,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"vendor_id" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"items" jsonb NOT NULL,
	"total_amount" real,
	"currency" text DEFAULT 'USD',
	"expected_delivery" timestamp,
	"actual_delivery" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quality_checkpoints" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"milestone" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"trade" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"inspected_by" text,
	"checklist_items" jsonb,
	"photo_keys" jsonb,
	"notes" text,
	"inspected_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"job_id" text,
	"tasks" jsonb NOT NULL,
	"critical_path" jsonb,
	"start_date" timestamp,
	"end_date" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"weather" text,
	"workers_on_site" integer,
	"photo_keys" jsonb,
	"tags" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "style_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"quiz_responses" jsonb,
	"detected_styles" jsonb,
	"budget_tier" text,
	"color_preferences" jsonb,
	"mood_board_items" jsonb,
	"inspiration_urls" jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sustainability_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"total_carbon_kg" real NOT NULL,
	"material_carbon_kg" real NOT NULL,
	"transport_carbon_kg" real NOT NULL,
	"sustainability_score" integer NOT NULL,
	"leed_points" integer,
	"green_alternatives" jsonb,
	"model_provider" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_predictions" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"predicted_days" integer NOT NULL,
	"confidence_low" integer NOT NULL,
	"confidence_high" integer NOT NULL,
	"critical_risks" jsonb,
	"phase_breakdown" jsonb,
	"model_provider" text NOT NULL,
	"input_snapshot" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"description" text,
	"website" text,
	"contact_email" text,
	"contact_phone" text,
	"phone" text,
	"address" text,
	"city" text,
	"state" text,
	"country" text DEFAULT 'IN',
	"gst_number" text,
	"payment_terms" text,
	"rating" real,
	"is_active" boolean DEFAULT true,
	"product_count" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vendors_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "warranties" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"item_name" text NOT NULL,
	"category" text NOT NULL,
	"brand" text,
	"serial_number" text,
	"warranty_start_date" timestamp NOT NULL,
	"warranty_end_date" timestamp NOT NULL,
	"warranty_type" text DEFAULT 'manufacturer' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warranty_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"warranty_id" text NOT NULL,
	"issue_description" text NOT NULL,
	"photo_keys" jsonb,
	"status" text DEFAULT 'filed' NOT NULL,
	"claim_date" timestamp DEFAULT now() NOT NULL,
	"resolution_date" timestamp
);
--> statement-breakpoint
CREATE TABLE "webhook_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"event_type" text NOT NULL,
	"target_url" text NOT NULL,
	"secret" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"failure_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yjs_documents" (
	"doc_id" text PRIMARY KEY NOT NULL,
	"state" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferred_currency" text DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferred_unit_system" text DEFAULT 'metric';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferred_locale" text DEFAULT 'en';--> statement-breakpoint
ALTER TABLE "design_variants" ADD COLUMN "source_upload_id" text;--> statement-breakpoint
ALTER TABLE "design_variants" ADD COLUMN "prompt_used" text;--> statement-breakpoint
ALTER TABLE "design_variants" ADD COLUMN "constraints" jsonb;--> statement-breakpoint
ALTER TABLE "design_variants" ADD COLUMN "job_id" text;--> statement-breakpoint
ALTER TABLE "design_variants" ADD COLUMN "render_urls" jsonb;--> statement-breakpoint
ALTER TABLE "design_variants" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "image_hash" text;--> statement-breakpoint
ALTER TABLE "api_access_tokens" ADD CONSTRAINT "api_access_tokens_app_id_developer_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."developer_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_access_tokens" ADD CONSTRAINT "api_access_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_request_logs" ADD CONSTRAINT "api_request_logs_app_id_developer_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."developer_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_results" ADD CONSTRAINT "bom_results_design_variant_id_design_variants_id_fk" FOREIGN KEY ("design_variant_id") REFERENCES "public"."design_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_results" ADD CONSTRAINT "bom_results_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_scenarios" ADD CONSTRAINT "budget_scenarios_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_orders" ADD CONSTRAINT "change_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaboration_messages" ADD CONSTRAINT "collaboration_messages_thread_id_collaboration_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."collaboration_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaboration_messages" ADD CONSTRAINT "collaboration_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaboration_threads" ADD CONSTRAINT "collaboration_threads_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaboration_threads" ADD CONSTRAINT "collaboration_threads_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaboration_threads" ADD CONSTRAINT "collaboration_threads_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractor_assignments" ADD CONSTRAINT "contractor_assignments_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractor_assignments" ADD CONSTRAINT "contractor_assignments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractor_referrals" ADD CONSTRAINT "contractor_referrals_referrer_user_id_users_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractor_referrals" ADD CONSTRAINT "contractor_referrals_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractor_reviews" ADD CONSTRAINT "contractor_reviews_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractor_reviews" ADD CONSTRAINT "contractor_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractor_reviews" ADD CONSTRAINT "contractor_reviews_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractors" ADD CONSTRAINT "contractors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_predictions" ADD CONSTRAINT "cost_predictions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cutlist_results" ADD CONSTRAINT "cutlist_results_design_variant_id_design_variants_id_fk" FOREIGN KEY ("design_variant_id") REFERENCES "public"."design_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cutlist_results" ADD CONSTRAINT "cutlist_results_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_tracking" ADD CONSTRAINT "delivery_tracking_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_tracking" ADD CONSTRAINT "delivery_tracking_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "developer_apps" ADD CONSTRAINT "developer_apps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_twins" ADD CONSTRAINT "digital_twins_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drawing_results" ADD CONSTRAINT "drawing_results_design_variant_id_design_variants_id_fk" FOREIGN KEY ("design_variant_id") REFERENCES "public"."design_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drawing_results" ADD CONSTRAINT "drawing_results_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_references" ADD CONSTRAINT "emergency_references_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_references" ADD CONSTRAINT "emergency_references_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handover_packages" ADD CONSTRAINT "handover_packages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iot_data_points" ADD CONSTRAINT "iot_data_points_device_id_iot_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."iot_devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iot_devices" ADD CONSTRAINT "iot_devices_digital_twin_id_digital_twins_id_fk" FOREIGN KEY ("digital_twin_id") REFERENCES "public"."digital_twins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iot_devices" ADD CONSTRAINT "iot_devices_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_design_variant_id_design_variants_id_fk" FOREIGN KEY ("design_variant_id") REFERENCES "public"."design_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_schedule_id_maintenance_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."maintenance_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mep_calculations" ADD CONSTRAINT "mep_calculations_design_variant_id_design_variants_id_fk" FOREIGN KEY ("design_variant_id") REFERENCES "public"."design_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mep_calculations" ADD CONSTRAINT "mep_calculations_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offcut_inquiries" ADD CONSTRAINT "offcut_inquiries_listing_id_offcut_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."offcut_listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offcut_inquiries" ADD CONSTRAINT "offcut_inquiries_buyer_user_id_users_id_fk" FOREIGN KEY ("buyer_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offcut_listings" ADD CONSTRAINT "offcut_listings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_projects" ADD CONSTRAINT "portfolio_projects_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_projects" ADD CONSTRAINT "portfolio_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_embeddings" ADD CONSTRAINT "product_embeddings_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_prices" ADD CONSTRAINT "product_prices_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_gallery_entries" ADD CONSTRAINT "project_gallery_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punch_list_items" ADD CONSTRAINT "punch_list_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punch_list_items" ADD CONSTRAINT "punch_list_items_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_checkpoints" ADD CONSTRAINT "quality_checkpoints_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_logs" ADD CONSTRAINT "site_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_logs" ADD CONSTRAINT "site_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "style_preferences" ADD CONSTRAINT "style_preferences_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sustainability_reports" ADD CONSTRAINT "sustainability_reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_predictions" ADD CONSTRAINT "timeline_predictions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_warranty_id_warranties_id_fk" FOREIGN KEY ("warranty_id") REFERENCES "public"."warranties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "webhook_subscriptions_app_id_developer_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."developer_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_variants" ADD CONSTRAINT "design_variants_source_upload_id_uploads_id_fk" FOREIGN KEY ("source_upload_id") REFERENCES "public"."uploads"("id") ON DELETE set null ON UPDATE no action;