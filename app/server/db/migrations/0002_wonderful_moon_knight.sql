CREATE TABLE `import_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`recipe_id` text,
	`recipe_name` text NOT NULL,
	`filename` text NOT NULL,
	`source` text NOT NULL,
	`status` text NOT NULL,
	`total_rows` integer NOT NULL,
	`successful_rows` integer NOT NULL,
	`failed_rows` integer NOT NULL,
	`skipped_rows` integer DEFAULT 0 NOT NULL,
	`errors` text DEFAULT '[]',
	`duration_ms` integer,
	`started_at` text DEFAULT (datetime('now')) NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipe_id`) REFERENCES `import_recipes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `import_recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`column_mapping` text,
	`transforms` text,
	`is_built_in` integer DEFAULT false,
	`last_used_at` text,
	`use_count` integer DEFAULT 0 NOT NULL,
	`previous_versions` text DEFAULT '[]',
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
