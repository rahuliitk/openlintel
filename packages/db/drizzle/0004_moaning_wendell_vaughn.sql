CREATE TABLE "acoustic_assessments" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"assessment_type" text NOT NULL,
	"source_room_id" text,
	"receiving_room_id" text,
	"source_room_name" text,
	"receiving_room_name" text,
	"room_use" text,
	"wall_type" text,
	"notes" text,
	"status" text DEFAULT 'pending',
	"stc_value" integer,
	"iic_value" integer,
	"reverb_time" real,
	"recommendation" text,
	"analysis_result" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ar_vr_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"mode" text DEFAULT 'ar' NOT NULL,
	"placed_items" jsonb,
	"vr_state" jsonb,
	"thumbnail_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "as_built_field_markups" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"sheet_number" text NOT NULL,
	"markup_type" text NOT NULL,
	"discipline" text,
	"description" text NOT NULL,
	"original_value" text,
	"as_built_value" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"citations" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"jurisdiction" text DEFAULT 'IN' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"summary" jsonb,
	"room_results" jsonb,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "energy_model_items" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"model_type" text NOT NULL,
	"r_value" real,
	"window_wall_ratio" real,
	"orientation" text,
	"notes" text,
	"status" text DEFAULT 'draft',
	"result" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lighting_fixtures" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"room_id" text NOT NULL,
	"fixture_type" text NOT NULL,
	"lumens" integer NOT NULL,
	"wattage" real NOT NULL,
	"color_temp" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"switch_zone" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety_records" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"record_type" text DEFAULT 'checklist' NOT NULL,
	"severity" text DEFAULT 'minor' NOT NULL,
	"phase" text DEFAULT 'framing' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"description" text,
	"assigned_to" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_analysis_items" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"analysis_type" text NOT NULL,
	"soil_type" text,
	"elevation" real,
	"slope_percent" real,
	"notes" text,
	"status" text DEFAULT 'pending',
	"results" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spec_sections" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"section_number" text NOT NULL,
	"title" text NOT NULL,
	"division" text NOT NULL,
	"content" text,
	"status" text DEFAULT 'draft',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "structural_elements" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"element_type" text NOT NULL,
	"span_length" real,
	"load_type" text,
	"load_value" real,
	"material" text,
	"notes" text,
	"status" text DEFAULT 'pending',
	"recommended_size" text,
	"analysis_result" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submittal_items" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"submittal_number" integer NOT NULL,
	"spec_division" text NOT NULL,
	"contractor" text,
	"product_name" text NOT NULL,
	"manufacturer" text,
	"description" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"review_notes" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_versions" ALTER COLUMN "document_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "document_versions" ALTER COLUMN "file_key" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "permits" ALTER COLUMN "status" SET DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "progress_reports" ALTER COLUMN "period_start" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "progress_reports" ALTER COLUMN "period_end" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "render_jobs" ALTER COLUMN "status" SET DEFAULT 'queued';--> statement-breakpoint
ALTER TABLE "material_boards" ADD COLUMN "board_type" text DEFAULT 'room' NOT NULL;--> statement-breakpoint
ALTER TABLE "material_boards" ADD COLUMN "material_category" text;--> statement-breakpoint
ALTER TABLE "material_boards" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "material_boards" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "material_boards" ADD COLUMN "material_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "material_boards" ADD COLUMN "swatches" jsonb;--> statement-breakpoint
ALTER TABLE "material_boards" ADD COLUMN "thumbnail_url" text;--> statement-breakpoint
ALTER TABLE "material_boards" ADD COLUMN "share_token" text;--> statement-breakpoint
ALTER TABLE "permits" ADD COLUMN "submitted_date" timestamp;--> statement-breakpoint
ALTER TABLE "permits" ADD COLUMN "inspector_name" text;--> statement-breakpoint
ALTER TABLE "permits" ADD COLUMN "inspector_phone" text;--> statement-breakpoint
ALTER TABLE "progress_reports" ADD COLUMN "title" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "progress_reports" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "progress_reports" ADD COLUMN "overall_progress" integer;--> statement-breakpoint
ALTER TABLE "progress_reports" ADD COLUMN "labor_hours" double precision;--> statement-breakpoint
ALTER TABLE "progress_reports" ADD COLUMN "weather_delay_days" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "progress_reports" ADD COLUMN "photo_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "progress_reports" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "render_jobs" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "render_jobs" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "render_jobs" ADD COLUMN "quality" text DEFAULT 'standard';--> statement-breakpoint
ALTER TABLE "render_jobs" ADD COLUMN "output_url" text;--> statement-breakpoint
ALTER TABLE "acoustic_assessments" ADD CONSTRAINT "acoustic_assessments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ar_vr_sessions" ADD CONSTRAINT "ar_vr_sessions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "as_built_field_markups" ADD CONSTRAINT "as_built_field_markups_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "as_built_field_markups" ADD CONSTRAINT "as_built_field_markups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_chat_messages" ADD CONSTRAINT "compliance_chat_messages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_chat_messages" ADD CONSTRAINT "compliance_chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_reports" ADD CONSTRAINT "compliance_reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_reports" ADD CONSTRAINT "compliance_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_model_items" ADD CONSTRAINT "energy_model_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lighting_fixtures" ADD CONSTRAINT "lighting_fixtures_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lighting_fixtures" ADD CONSTRAINT "lighting_fixtures_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_records" ADD CONSTRAINT "safety_records_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_analysis_items" ADD CONSTRAINT "site_analysis_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spec_sections" ADD CONSTRAINT "spec_sections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "structural_elements" ADD CONSTRAINT "structural_elements_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submittal_items" ADD CONSTRAINT "submittal_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;