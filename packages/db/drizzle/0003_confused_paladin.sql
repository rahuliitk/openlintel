CREATE TABLE "kitchen_bath_layouts" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"room_type" text NOT NULL,
	"room_name" text NOT NULL,
	"cabinet_type" text NOT NULL,
	"countertop_material" text NOT NULL,
	"edge_profile" text NOT NULL,
	"notes" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"work_triangle_score" real,
	"work_triangle_distance" real,
	"validation_results" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kitchen_bath_layouts" ADD CONSTRAINT "kitchen_bath_layouts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;