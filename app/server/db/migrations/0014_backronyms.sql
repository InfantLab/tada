-- Migration: Add backronyms table for rotating taglines
-- Created: 2026-02-02

CREATE TABLE IF NOT EXISTS backronyms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  backronym TEXT NOT NULL,
  slogan TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

-- Insert the backronyms with slogans
INSERT INTO backronyms (backronym, slogan) VALUES
  ('Track Activities, Discover Achievements', 'Do the work. Notice the wins.'),
  ('Tally Adventures, Declare Accomplishments', 'Every moment counts. Every win deserves celebration.'),
  ('Treasure Actions, Document Aspirations', 'Collecting seashells on the beach of your life.'),
  ('Tag Artifacts, Detect Associations', 'Mark what matters. Uncover what connects.'),
  ('Trace Activities, Discern Archetypes', 'Follow your rhythms. Recognize your patterns.'),
  ('Take Account, Discover Archaeology', 'Your daily collection becomes your life story.'),
  ('Time Accumulates, Days Assemble', 'Moments build. Life takes shape.'),
  ('Try Anything, Deserve Acknowledgment', 'No minimums. Just start. You already did enough.'),
  ('Today''s Attempt, Day''s Achievement', 'What you did today is worth noticing—however small.'),
  ('Tend Activities, Develop Attentively', 'Gentle cultivation. Mindful growth.'),
  ('Timestamp Adventures, Diary Automatically', 'Capture your moments. Remember your life.'),
  ('The Accumulation, Day''s Archive', 'Building your personal history, one entry at a time.');

CREATE INDEX idx_backronyms_created ON backronyms(created_at);
