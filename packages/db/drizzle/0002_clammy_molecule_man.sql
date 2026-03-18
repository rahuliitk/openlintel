CREATE TABLE "acoustic_analyses" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"room_pairs" jsonb,
	"stc_ratings" jsonb,
	"iic_ratings" jsonb,
	"reverb_time" jsonb,
	"recommendations" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "as_built_markups" (
	"id" text PRIMARY KEY NOT NULL,
	"drawing_result_id" text NOT NULL,
	"markup_data" jsonb,
	"deviations" jsonb,
	"marked_up_pdf_key" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bathroom_layouts" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"fixtures" jsonb NOT NULL,
	"shower_enclosure" jsonb,
	"vanity" jsonb,
	"ada_compliant" boolean DEFAULT false,
	"ventilation" jsonb,
	"waterproofing" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cabinet_layouts" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"layout_type" text NOT NULL,
	"cabinets" jsonb NOT NULL,
	"countertops" jsonb,
	"appliances" jsonb,
	"backsplash" jsonb,
	"work_triangle_score" real,
	"work_triangle_perimeter" real,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "closet_layouts" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"layout_type" text,
	"sections" jsonb,
	"accessories" jsonb,
	"total_linear_ft" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communication_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"channel" text NOT NULL,
	"enabled" boolean DEFAULT true,
	"config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_queries" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text,
	"user_id" text NOT NULL,
	"query" text NOT NULL,
	"response" text,
	"code_references" jsonb,
	"jurisdiction" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"content" text NOT NULL,
	"category" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "design_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"design_variant_id" text NOT NULL,
	"feedback_type" text NOT NULL,
	"notes" text,
	"change_details" jsonb,
	"region" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "design_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"home_type" text NOT NULL,
	"description" text,
	"thumbnail_key" text,
	"room_definitions" jsonb NOT NULL,
	"default_rules" jsonb NOT NULL,
	"metadata" jsonb,
	"is_public" boolean DEFAULT false NOT NULL,
	"price_usd" real,
	"sale_count" integer DEFAULT 0,
	"revenue_share_percent" real DEFAULT 70,
	"author_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"document_type" text NOT NULL,
	"document_number" text NOT NULL,
	"revision" text NOT NULL,
	"title" text NOT NULL,
	"file_key" text NOT NULL,
	"previous_version_id" text,
	"status" text DEFAULT 'current' NOT NULL,
	"changes_description" text,
	"distribution_list" jsonb,
	"issued_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drawing_set_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title_block_template" jsonb,
	"sheet_numbering_scheme" text,
	"symbol_legend" jsonb,
	"abbreviation_key" jsonb,
	"firm_logo" text,
	"firm_name" text,
	"default_scale" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drone_captures" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"capture_date" timestamp NOT NULL,
	"gps_data" jsonb,
	"image_keys" jsonb,
	"point_cloud_key" text,
	"terrain_mesh_key" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "energy_models" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"envelope_spec" jsonb,
	"climate_zone" text,
	"simulation_result" jsonb,
	"hers_score" real,
	"recommendations" jsonb,
	"solar_panel_spec" jsonb,
	"job_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exterior_designs" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"design_type" text NOT NULL,
	"elevation_type" text DEFAULT 'front' NOT NULL,
	"view_direction" text,
	"roof_style" text,
	"facade_material" text,
	"facade_materials" jsonb,
	"landscape_elements" jsonb,
	"landscape_notes" text,
	"outdoor_spaces" jsonb,
	"description" text,
	"render_url" text,
	"style" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"spec_json" jsonb,
	"job_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "floor_plan_canvases" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"floor_number" integer DEFAULT 0 NOT NULL,
	"name" text NOT NULL,
	"canvas_state" jsonb NOT NULL,
	"grid_size" integer DEFAULT 100,
	"scale" real DEFAULT 1,
	"layers" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspections" (
	"id" text PRIMARY KEY NOT NULL,
	"permit_id" text NOT NULL,
	"inspection_type" text NOT NULL,
	"scheduled_date" timestamp,
	"completed_date" timestamp,
	"result" text,
	"inspector_name" text,
	"inspector_phone" text,
	"notes" text,
	"photo_keys" jsonb,
	"corrections" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspiration_boards" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"layout" text DEFAULT 'masonry',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspiration_pins" (
	"id" text PRIMARY KEY NOT NULL,
	"board_id" text NOT NULL,
	"user_id" text NOT NULL,
	"image_url" text,
	"image_key" text,
	"source_url" text,
	"note" text,
	"tags" jsonb,
	"style" text,
	"category" text,
	"position" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insurance_certificates" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"insurance_type" text NOT NULL,
	"carrier" text,
	"policy_number" text,
	"coverage_amount" real,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"certificate_key" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"sync_status" text,
	"last_sync_at" timestamp,
	"config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "labor_rates" (
	"id" text PRIMARY KEY NOT NULL,
	"trade" text NOT NULL,
	"region" text NOT NULL,
	"hourly_rate" real NOT NULL,
	"currency" text DEFAULT 'USD',
	"data_source" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"lead_id" text NOT NULL,
	"activity_type" text NOT NULL,
	"description" text NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"source" text,
	"status" text DEFAULT 'new' NOT NULL,
	"estimated_value" real,
	"notes" text,
	"next_follow_up" timestamp,
	"project_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lessons_learned" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text,
	"user_id" text NOT NULL,
	"category" text,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"tags" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lidar_scans" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"raw_point_cloud_key" text,
	"processed_point_cloud_key" text,
	"extracted_plan_key" text,
	"clash_report" jsonb,
	"status" text DEFAULT 'uploaded' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lighting_designs" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"fixtures" jsonb NOT NULL,
	"switch_zones" jsonb,
	"natural_light" jsonb,
	"lux_calculation" jsonb,
	"daylight_factor" real,
	"target_lux" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_benchmarks" (
	"id" text PRIMARY KEY NOT NULL,
	"region" text NOT NULL,
	"home_type" text,
	"quality_tier" text,
	"cost_per_sqft" real,
	"data_source" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_boards" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"room_id" text,
	"name" text NOT NULL,
	"items" jsonb NOT NULL,
	"layout" text DEFAULT 'grid',
	"branding_config" jsonb,
	"pdf_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "multi_unit_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"unit_count" integer NOT NULL,
	"units" jsonb,
	"shared_spaces" jsonb,
	"parking_spaces" integer,
	"zoning_compliance" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "openings" (
	"id" text PRIMARY KEY NOT NULL,
	"wall_segment_id" text NOT NULL,
	"opening_type" text NOT NULL,
	"sub_type" text,
	"offset_from_start" real NOT NULL,
	"width" real NOT NULL,
	"height" real NOT NULL,
	"sill_height" real DEFAULT 0,
	"swing_direction" text,
	"swing_angle" real DEFAULT 90,
	"layer" text DEFAULT 'structural',
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "outdoor_designs" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"design_type" text NOT NULL,
	"elements" jsonb,
	"materials" jsonb,
	"grade_integration" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parametric_history" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"action" text NOT NULL,
	"before_state" jsonb NOT NULL,
	"after_state" jsonb NOT NULL,
	"triggered_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parametric_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"rule_type" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"expression" jsonb NOT NULL,
	"priority" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permits" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"permit_type" text NOT NULL,
	"jurisdiction" text,
	"application_date" timestamp,
	"approval_date" timestamp,
	"permit_number" text,
	"status" text DEFAULT 'not_applied' NOT NULL,
	"expiration_date" timestamp,
	"documents" jsonb,
	"fees" real,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_occupancy_surveys" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"survey_type" text NOT NULL,
	"responses" jsonb,
	"sent_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "progress_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"report_type" text NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"content" jsonb,
	"pdf_key" text,
	"emailed_to" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"allocation_percent" integer DEFAULT 100,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_clients" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"client_user_id" text NOT NULL,
	"access_level" text DEFAULT 'view_only' NOT NULL,
	"invited_by" text,
	"invited_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_valuations" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"pre_renovation_value" real,
	"renovation_cost" real,
	"post_renovation_estimate" real,
	"roi" real,
	"comparables" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"template_id" text,
	"scope_of_work" text,
	"fee_structure" jsonb,
	"terms_and_conditions" text,
	"payment_schedule" jsonb,
	"status" text DEFAULT 'draft' NOT NULL,
	"signature_request_id" text,
	"signed_at" timestamp,
	"pdf_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "render_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"room_id" text,
	"job_id" text,
	"render_type" text NOT NULL,
	"resolution" text NOT NULL,
	"time_of_day" text,
	"season" text,
	"camera_position" jsonb,
	"scene_key" text,
	"output_key" text,
	"samples" integer DEFAULT 256,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfis" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"rfi_number" integer NOT NULL,
	"subject" text NOT NULL,
	"question" text NOT NULL,
	"response" text,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'normal',
	"asked_by" text NOT NULL,
	"assigned_to" text,
	"related_drawing_id" text,
	"related_spec_section" text,
	"attachments" jsonb,
	"due_date" timestamp,
	"responded_at" timestamp,
	"responded_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety_checklists" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"phase" text NOT NULL,
	"template_name" text NOT NULL,
	"items" jsonb NOT NULL,
	"completed_by" text,
	"completed_at" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety_incidents" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"incident_type" text NOT NULL,
	"severity" text DEFAULT 'minor' NOT NULL,
	"date" timestamp NOT NULL,
	"description" text NOT NULL,
	"location" text,
	"witnesses" jsonb,
	"photo_keys" jsonb,
	"corrective_actions" text,
	"reported_by" text,
	"status" text DEFAULT 'reported' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety_training_records" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"worker_name" text NOT NULL,
	"training_type" text NOT NULL,
	"certification_number" text,
	"completed_date" timestamp NOT NULL,
	"expiration_date" timestamp,
	"document_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sample_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text,
	"products" jsonb,
	"shipping_address" text,
	"status" text DEFAULT 'requested' NOT NULL,
	"tracking_number" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "selection_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"allowance_budget" real,
	"due_date" timestamp,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "selections" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"category_id" text NOT NULL,
	"room_id" text,
	"selected_product_id" text,
	"product_name" text,
	"actual_cost" real,
	"over_under" real,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"professional_id" text NOT NULL,
	"project_id" text,
	"client_user_id" text NOT NULL,
	"service_type" text NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"duration" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"amount" real,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_analyses" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"topo_data" jsonb,
	"setbacks" jsonb,
	"solar_data" jsonb,
	"grade_data" jsonb,
	"drainage_plan" jsonb,
	"soil_type" text,
	"flood_zone" text,
	"latitude" real,
	"longitude" real,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smart_home_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"network_rack_location" jsonb,
	"wifi_access_points" jsonb,
	"smart_devices" jsonb,
	"wiring_runs" jsonb,
	"scenes" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "space_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"layout_variant" integer DEFAULT 1 NOT NULL,
	"furniture_placements" jsonb,
	"circulation_score" real,
	"feng_shui_score" real,
	"accessibility_score" real,
	"pros_and_cons" jsonb,
	"job_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "specifications" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"division" text NOT NULL,
	"section" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"product_references" jsonb,
	"format" text DEFAULT 'prescriptive',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staircases" (
	"id" text PRIMARY KEY NOT NULL,
	"canvas_id" text NOT NULL,
	"stair_type" text NOT NULL,
	"start_x" real NOT NULL,
	"start_y" real NOT NULL,
	"total_rise" real NOT NULL,
	"riser_height" real,
	"tread_depth" real,
	"width" real DEFAULT 900 NOT NULL,
	"num_risers" integer,
	"direction" real DEFAULT 0,
	"landing_depth" real,
	"handrail_sides" text DEFAULT 'both',
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "structural_analyses" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"analysis_type" text NOT NULL,
	"input_parameters" jsonb NOT NULL,
	"result" jsonb NOT NULL,
	"standards_cited" jsonb,
	"status" text DEFAULT 'completed',
	"job_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submittals" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"submittal_number" integer NOT NULL,
	"spec_section" text,
	"description" text NOT NULL,
	"submitted_product_id" text,
	"specified_product_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewer_notes" text,
	"stamp_type" text,
	"pdf_key" text,
	"stamped_pdf_key" text,
	"submitted_by" text,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "theater_designs" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"screen_spec" jsonb,
	"speaker_layout" jsonb,
	"seating_layout" jsonb,
	"acoustic_treatment" jsonb,
	"lighting_zones" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"hours" real NOT NULL,
	"description" text,
	"billable" boolean DEFAULT true,
	"rate" real,
	"status" text DEFAULT 'draft' NOT NULL,
	"approved_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "universal_design_checks" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"room_id" text,
	"check_results" jsonb,
	"compliance_level" text,
	"recommendations" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "walkthrough_annotations" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"room_id" text,
	"position_3d" jsonb,
	"annotation_type" text NOT NULL,
	"content" text,
	"voice_recording_key" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_by" text NOT NULL,
	"resolved_by" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wall_segments" (
	"id" text PRIMARY KEY NOT NULL,
	"canvas_id" text NOT NULL,
	"room_id" text,
	"start_x" real NOT NULL,
	"start_y" real NOT NULL,
	"end_x" real NOT NULL,
	"end_y" real NOT NULL,
	"thickness" real DEFAULT 150 NOT NULL,
	"wall_type" text DEFAULT 'interior' NOT NULL,
	"material_type" text,
	"layer" text DEFAULT 'structural',
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "label" text;--> statement-breakpoint
ALTER TABLE "acoustic_analyses" ADD CONSTRAINT "acoustic_analyses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "as_built_markups" ADD CONSTRAINT "as_built_markups_drawing_result_id_drawing_results_id_fk" FOREIGN KEY ("drawing_result_id") REFERENCES "public"."drawing_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "as_built_markups" ADD CONSTRAINT "as_built_markups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bathroom_layouts" ADD CONSTRAINT "bathroom_layouts_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cabinet_layouts" ADD CONSTRAINT "cabinet_layouts_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "closet_layouts" ADD CONSTRAINT "closet_layouts_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_preferences" ADD CONSTRAINT "communication_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_queries" ADD CONSTRAINT "compliance_queries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_queries" ADD CONSTRAINT "compliance_queries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_templates" ADD CONSTRAINT "contract_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_feedback" ADD CONSTRAINT "design_feedback_design_variant_id_design_variants_id_fk" FOREIGN KEY ("design_variant_id") REFERENCES "public"."design_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_templates" ADD CONSTRAINT "design_templates_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drawing_set_configs" ADD CONSTRAINT "drawing_set_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drone_captures" ADD CONSTRAINT "drone_captures_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_models" ADD CONSTRAINT "energy_models_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "energy_models" ADD CONSTRAINT "energy_models_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exterior_designs" ADD CONSTRAINT "exterior_designs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exterior_designs" ADD CONSTRAINT "exterior_designs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floor_plan_canvases" ADD CONSTRAINT "floor_plan_canvases_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_permit_id_permits_id_fk" FOREIGN KEY ("permit_id") REFERENCES "public"."permits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspiration_boards" ADD CONSTRAINT "inspiration_boards_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspiration_pins" ADD CONSTRAINT "inspiration_pins_board_id_inspiration_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."inspiration_boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspiration_pins" ADD CONSTRAINT "inspiration_pins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_configs" ADD CONSTRAINT "integration_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons_learned" ADD CONSTRAINT "lessons_learned_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons_learned" ADD CONSTRAINT "lessons_learned_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lidar_scans" ADD CONSTRAINT "lidar_scans_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lighting_designs" ADD CONSTRAINT "lighting_designs_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_boards" ADD CONSTRAINT "material_boards_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_boards" ADD CONSTRAINT "material_boards_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "multi_unit_plans" ADD CONSTRAINT "multi_unit_plans_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "openings" ADD CONSTRAINT "openings_wall_segment_id_wall_segments_id_fk" FOREIGN KEY ("wall_segment_id") REFERENCES "public"."wall_segments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outdoor_designs" ADD CONSTRAINT "outdoor_designs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parametric_history" ADD CONSTRAINT "parametric_history_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parametric_rules" ADD CONSTRAINT "parametric_rules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permits" ADD CONSTRAINT "permits_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_occupancy_surveys" ADD CONSTRAINT "post_occupancy_surveys_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_reports" ADD CONSTRAINT "progress_reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_clients" ADD CONSTRAINT "project_clients_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_clients" ADD CONSTRAINT "project_clients_client_user_id_users_id_fk" FOREIGN KEY ("client_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_clients" ADD CONSTRAINT "project_clients_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_valuations" ADD CONSTRAINT "property_valuations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_template_id_contract_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."contract_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "render_jobs" ADD CONSTRAINT "render_jobs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "render_jobs" ADD CONSTRAINT "render_jobs_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "render_jobs" ADD CONSTRAINT "render_jobs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfis" ADD CONSTRAINT "rfis_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfis" ADD CONSTRAINT "rfis_asked_by_users_id_fk" FOREIGN KEY ("asked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfis" ADD CONSTRAINT "rfis_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfis" ADD CONSTRAINT "rfis_related_drawing_id_drawing_results_id_fk" FOREIGN KEY ("related_drawing_id") REFERENCES "public"."drawing_results"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfis" ADD CONSTRAINT "rfis_responded_by_users_id_fk" FOREIGN KEY ("responded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_checklists" ADD CONSTRAINT "safety_checklists_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_incidents" ADD CONSTRAINT "safety_incidents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_incidents" ADD CONSTRAINT "safety_incidents_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_training_records" ADD CONSTRAINT "safety_training_records_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sample_requests" ADD CONSTRAINT "sample_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sample_requests" ADD CONSTRAINT "sample_requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selection_categories" ADD CONSTRAINT "selection_categories_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selections" ADD CONSTRAINT "selections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selections" ADD CONSTRAINT "selections_category_id_selection_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."selection_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selections" ADD CONSTRAINT "selections_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "selections" ADD CONSTRAINT "selections_selected_product_id_products_id_fk" FOREIGN KEY ("selected_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_professional_id_contractors_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."contractors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_client_user_id_users_id_fk" FOREIGN KEY ("client_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_analyses" ADD CONSTRAINT "site_analyses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_home_plans" ADD CONSTRAINT "smart_home_plans_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_plans" ADD CONSTRAINT "space_plans_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_plans" ADD CONSTRAINT "space_plans_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specifications" ADD CONSTRAINT "specifications_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staircases" ADD CONSTRAINT "staircases_canvas_id_floor_plan_canvases_id_fk" FOREIGN KEY ("canvas_id") REFERENCES "public"."floor_plan_canvases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "structural_analyses" ADD CONSTRAINT "structural_analyses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "structural_analyses" ADD CONSTRAINT "structural_analyses_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submittals" ADD CONSTRAINT "submittals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submittals" ADD CONSTRAINT "submittals_submitted_product_id_products_id_fk" FOREIGN KEY ("submitted_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submittals" ADD CONSTRAINT "submittals_specified_product_id_products_id_fk" FOREIGN KEY ("specified_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submittals" ADD CONSTRAINT "submittals_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submittals" ADD CONSTRAINT "submittals_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theater_designs" ADD CONSTRAINT "theater_designs_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "universal_design_checks" ADD CONSTRAINT "universal_design_checks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "universal_design_checks" ADD CONSTRAINT "universal_design_checks_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walkthrough_annotations" ADD CONSTRAINT "walkthrough_annotations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walkthrough_annotations" ADD CONSTRAINT "walkthrough_annotations_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walkthrough_annotations" ADD CONSTRAINT "walkthrough_annotations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walkthrough_annotations" ADD CONSTRAINT "walkthrough_annotations_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wall_segments" ADD CONSTRAINT "wall_segments_canvas_id_floor_plan_canvases_id_fk" FOREIGN KEY ("canvas_id") REFERENCES "public"."floor_plan_canvases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wall_segments" ADD CONSTRAINT "wall_segments_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;