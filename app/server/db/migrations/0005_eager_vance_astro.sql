PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`subcategory` text,
	`emoji` text,
	`timestamp` text NOT NULL,
	`duration_seconds` integer,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`data` text,
	`tags` text DEFAULT '[]',
	`notes` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`external_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_entries`("id", "user_id", "type", "name", "category", "subcategory", "emoji", "timestamp", "duration_seconds", "timezone", "data", "tags", "notes", "source", "external_id", "created_at", "updated_at", "deleted_at") SELECT "id", "user_id", "type", "name", "category", "subcategory", "emoji", "timestamp", "duration_seconds", "timezone", "data", "tags", "notes", "source", "external_id", "created_at", "updated_at", "deleted_at" FROM `entries`;--> statement-breakpoint
DROP TABLE `entries`;--> statement-breakpoint
ALTER TABLE `__new_entries` RENAME TO `entries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;