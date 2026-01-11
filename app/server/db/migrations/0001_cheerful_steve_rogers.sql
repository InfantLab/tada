CREATE TABLE `category_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`category` text NOT NULL,
	`subcategory` text,
	`emoji` text,
	`color` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `entries` ADD `category` text;--> statement-breakpoint
ALTER TABLE `entries` ADD `subcategory` text;--> statement-breakpoint
ALTER TABLE `entries` ADD `emoji` text;--> statement-breakpoint
ALTER TABLE `habits` ADD `match_type` text;--> statement-breakpoint
ALTER TABLE `habits` ADD `match_category` text;--> statement-breakpoint
ALTER TABLE `habits` ADD `match_subcategory` text;--> statement-breakpoint
ALTER TABLE `habits` ADD `match_name` text;--> statement-breakpoint
ALTER TABLE `timer_presets` ADD `subcategory` text NOT NULL;