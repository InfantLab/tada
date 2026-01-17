CREATE TABLE `encouragements` (
	`id` text PRIMARY KEY NOT NULL,
	`stage` text NOT NULL,
	`context` text NOT NULL,
	`activity_type` text DEFAULT 'general' NOT NULL,
	`message` text NOT NULL,
	`tier_name` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `rhythms` ADD `duration_threshold_seconds` integer DEFAULT 360 NOT NULL;--> statement-breakpoint
ALTER TABLE `rhythms` ADD `panel_preferences` text DEFAULT '{"showYearTracker":true,"showMonthCalendar":true,"showChainStats":true,"monthViewMode":"calendar","expandedByDefault":true}';