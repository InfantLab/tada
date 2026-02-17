-- Migration: Add journey threshold configuration and completion mode to rhythms
-- v0.4.1 - Rhythm UI Redesign

-- Completion mode: 'threshold' (duration/count based) or 'session' (any entry = complete)
ALTER TABLE rhythms ADD COLUMN completion_mode TEXT NOT NULL DEFAULT 'threshold';

-- Journey threshold type: 'hours', 'sessions', or 'count'
ALTER TABLE rhythms ADD COLUMN journey_threshold_type TEXT NOT NULL DEFAULT 'hours';

-- Custom journey thresholds (JSON, nullable) - overrides system defaults
ALTER TABLE rhythms ADD COLUMN journey_thresholds TEXT;

-- Set sensible defaults for existing rhythms based on match_type
UPDATE rhythms SET journey_threshold_type = 'count' WHERE match_type = 'tally';
UPDATE rhythms SET journey_threshold_type = 'sessions' WHERE match_type IN ('moment', 'tada');
UPDATE rhythms SET completion_mode = 'session' WHERE match_type IN ('moment', 'tada');
