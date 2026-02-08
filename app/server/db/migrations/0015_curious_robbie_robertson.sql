CREATE TABLE `backronyms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`backronym` text NOT NULL,
	`slogan` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `email_verification_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`expected_behavior` text,
	`email` text,
	`system_info` text,
	`status` text DEFAULT 'new' NOT NULL,
	`internal_notes` text,
	`resolved_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `newsletter_subscribers` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`source` text DEFAULT 'blog' NOT NULL,
	`verified_at` text,
	`unsubscribed_at` text,
	`unsubscribe_reason` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `newsletter_subscribers_email_unique` ON `newsletter_subscribers` (`email`);--> statement-breakpoint
CREATE TABLE `subscription_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`event_type` text NOT NULL,
	`stripe_event_id` text,
	`data` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `rhythms` ADD `count_threshold` integer;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD `custom_categories` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `users` ADD `subscription_tier` text DEFAULT 'free';--> statement-breakpoint
ALTER TABLE `users` ADD `subscription_status` text DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `users` ADD `stripe_customer_id` text;--> statement-breakpoint
ALTER TABLE `users` ADD `subscription_expires_at` text;