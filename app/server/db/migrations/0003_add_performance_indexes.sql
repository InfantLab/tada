-- Add performance indexes for faster queries
-- These indexes speed up filtering by userId and deleted entries

CREATE INDEX `entries_user_id_idx` ON `entries`(`user_id`);
CREATE INDEX `entries_user_id_deleted_at_idx` ON `entries`(`user_id`, `deleted_at`);
CREATE INDEX `habits_user_id_idx` ON `habits`(`user_id`);
CREATE INDEX `timer_presets_user_id_idx` ON `timer_presets`(`user_id`);
CREATE INDEX `category_settings_user_id_idx` ON `category_settings`(`user_id`);
CREATE INDEX `import_recipes_user_id_idx` ON `import_recipes`(`user_id`);
CREATE INDEX `import_logs_user_id_idx` ON `import_logs`(`user_id`);
CREATE INDEX `sessions_user_id_idx` ON `sessions`(`user_id`);
