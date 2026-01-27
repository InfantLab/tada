PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`entry_id` text,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`storage_key` text NOT NULL,
	`thumbnail_key` text,
	`width` integer,
	`height` integer,
	`duration_seconds` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_message` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`processed_at` text,
	`deleted_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_attachments`("id", "user_id", "entry_id", "filename", "mime_type", "size_bytes", "storage_key", "thumbnail_key", "width", "height", "duration_seconds", "status", "error_message", "created_at", "processed_at", "deleted_at") SELECT "id", "user_id", "entry_id", "filename", "mime_type", "size_bytes", "storage_key", "thumbnail_key", "width", "height", "duration_seconds", "status", "error_message", "created_at", "processed_at", "deleted_at" FROM `attachments`;--> statement-breakpoint
DROP TABLE `attachments`;--> statement-breakpoint
ALTER TABLE `__new_attachments` RENAME TO `attachments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;