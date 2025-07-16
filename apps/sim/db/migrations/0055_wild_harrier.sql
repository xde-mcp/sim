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
ALTER TABLE "user_rate_limits" ADD CONSTRAINT "user_rate_limits_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_execution_jobs" ADD CONSTRAINT "workflow_execution_jobs_workflow_id_workflow_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflow"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_execution_jobs" ADD CONSTRAINT "workflow_execution_jobs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_workflow_execution_jobs_status_priority" ON "workflow_execution_jobs" USING btree ("status","priority","created_at");--> statement-breakpoint
CREATE INDEX "idx_workflow_execution_jobs_user_id" ON "workflow_execution_jobs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_workflow_execution_jobs_workflow_id" ON "workflow_execution_jobs" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_execution_jobs_execution_id" ON "workflow_execution_jobs" USING btree ("execution_id");