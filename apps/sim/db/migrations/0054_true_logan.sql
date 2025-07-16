CREATE TABLE "template_stars" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"template_id" text NOT NULL,
	"starred_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" text PRIMARY KEY NOT NULL,
	"workflow_id" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"author" text NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"stars" integer DEFAULT 0 NOT NULL,
	"color" text DEFAULT '#3972F6' NOT NULL,
	"icon" text DEFAULT 'FileText' NOT NULL,
	"category" text NOT NULL,
	"state" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_rate_limits" (
	"user_id" text PRIMARY KEY NOT NULL,
	"sync_api_requests" integer DEFAULT 0 NOT NULL,
	"async_api_requests" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp DEFAULT now() NOT NULL,
	"last_request_at" timestamp DEFAULT now() NOT NULL,
	"is_rate_limited" boolean DEFAULT false NOT NULL,
	"rate_limit_reset_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "workflow_execution_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"workflow_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"execution_id" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"trigger_type" text DEFAULT 'api' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "template_stars" ADD CONSTRAINT "template_stars_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_stars" ADD CONSTRAINT "template_stars_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_workflow_id_workflow_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflow"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_rate_limits" ADD CONSTRAINT "user_rate_limits_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_execution_jobs" ADD CONSTRAINT "workflow_execution_jobs_workflow_id_workflow_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflow"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_execution_jobs" ADD CONSTRAINT "workflow_execution_jobs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "template_stars_user_id_idx" ON "template_stars" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "template_stars_template_id_idx" ON "template_stars" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "template_stars_user_template_idx" ON "template_stars" USING btree ("user_id","template_id");--> statement-breakpoint
CREATE INDEX "template_stars_template_user_idx" ON "template_stars" USING btree ("template_id","user_id");--> statement-breakpoint
CREATE INDEX "template_stars_starred_at_idx" ON "template_stars" USING btree ("starred_at");--> statement-breakpoint
CREATE INDEX "template_stars_template_starred_at_idx" ON "template_stars" USING btree ("template_id","starred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "template_stars_user_template_unique" ON "template_stars" USING btree ("user_id","template_id");--> statement-breakpoint
CREATE INDEX "templates_workflow_id_idx" ON "templates" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "templates_user_id_idx" ON "templates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "templates_category_idx" ON "templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "templates_views_idx" ON "templates" USING btree ("views");--> statement-breakpoint
CREATE INDEX "templates_stars_idx" ON "templates" USING btree ("stars");--> statement-breakpoint
CREATE INDEX "templates_category_views_idx" ON "templates" USING btree ("category","views");--> statement-breakpoint
CREATE INDEX "templates_category_stars_idx" ON "templates" USING btree ("category","stars");--> statement-breakpoint
CREATE INDEX "templates_user_category_idx" ON "templates" USING btree ("user_id","category");--> statement-breakpoint
CREATE INDEX "templates_created_at_idx" ON "templates" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "templates_updated_at_idx" ON "templates" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_workflow_execution_jobs_status_priority" ON "workflow_execution_jobs" USING btree ("status","priority","created_at");--> statement-breakpoint
CREATE INDEX "idx_workflow_execution_jobs_user_id" ON "workflow_execution_jobs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_workflow_execution_jobs_workflow_id" ON "workflow_execution_jobs" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_execution_jobs_execution_id" ON "workflow_execution_jobs" USING btree ("execution_id");