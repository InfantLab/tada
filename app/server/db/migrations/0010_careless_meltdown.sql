CREATE TABLE `activity_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`activity_name` text NOT NULL,
	`category` text,
	`subcategory` text,
	`entry_type` text NOT NULL,
	`use_count` integer DEFAULT 1 NOT NULL,
	`last_used_at` text DEFAULT (datetime('now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `entry_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`input` text NOT NULL,
	`parsed_from` text,
	`confidence` integer,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
