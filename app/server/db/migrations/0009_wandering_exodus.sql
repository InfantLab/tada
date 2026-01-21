ALTER TABLE `rhythms` ADD `chain_type` text DEFAULT 'weekly_low' NOT NULL;--> statement-breakpoint
ALTER TABLE `rhythms` ADD `chain_target_minutes` integer;