-- Rename weekly_messages → system_messages
-- Rename weekly_delivery_attempts → system_message_deliveries
-- These tables are generalised to hold any system-generated message (celebrations,
-- encouragements, and future types like monthly digests or milestone alerts).

ALTER TABLE weekly_messages RENAME TO system_messages;
ALTER TABLE weekly_delivery_attempts RENAME TO system_message_deliveries;
