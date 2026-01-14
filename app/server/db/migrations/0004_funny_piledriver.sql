CREATE TABLE `rhythms` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`match_type` text,
	`match_category` text,
	`match_subcategory` text,
	`match_name` text,
	`activity_matchers` text,
	`goal_type` text NOT NULL,
	`goal_value` integer NOT NULL,
	`goal_unit` text,
	`frequency` text NOT NULL,
	`frequency_target` integer,
	`current_streak` integer DEFAULT 0 NOT NULL,
	`longest_streak` integer DEFAULT 0 NOT NULL,
	`last_completed_date` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
DROP TABLE `habits`;