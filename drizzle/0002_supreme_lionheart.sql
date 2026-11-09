ALTER TABLE `enquiries` ADD `ai_provider` text DEFAULT 'legacy-local' NOT NULL;--> statement-breakpoint
ALTER TABLE `enquiries` ADD `ai_model` text;--> statement-breakpoint
ALTER TABLE `enquiries` ADD `ai_status` text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE `enquiries` ADD `ai_reason` text DEFAULT 'Local sample or enquiry created before Gemini integration.' NOT NULL;