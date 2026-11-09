CREATE TABLE `daily_exports` (
	`date` text PRIMARY KEY NOT NULL,
	`csv` text NOT NULL,
	`count` integer NOT NULL,
	`created` integer NOT NULL,
	`delivery` text DEFAULT 'simulated' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `promos` (
	`code` text PRIMARY KEY NOT NULL,
	`percent` integer NOT NULL,
	`valid_from` text NOT NULL,
	`valid_until` text NOT NULL,
	`min_nights` integer DEFAULT 1 NOT NULL,
	`max_uses` integer NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rate_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`adjustment` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `bookings` ADD `plan_id` text DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `plan_name` text DEFAULT 'Breakfast included' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `plan_adjustment` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `promo_code` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `discount_percent` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `subtotal` integer;--> statement-breakpoint
ALTER TABLE `bookings` ADD `discount` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `tax` integer;--> statement-breakpoint
ALTER TABLE `enquiries` ADD `gm_acknowledged_at` integer;--> statement-breakpoint
ALTER TABLE `enquiries` ADD `gm_acknowledged_by` text;--> statement-breakpoint
ALTER TABLE `nights` ADD `net_rate` integer;--> statement-breakpoint
ALTER TABLE `nights` ADD `tax` integer;