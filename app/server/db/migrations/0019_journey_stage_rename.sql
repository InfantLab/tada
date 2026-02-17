-- Migration: Rename journey stage from 'starting' to 'beginning'
-- This provides internal consistency with the user-facing label "Beginning"

-- Update encouragements table
UPDATE encouragements
SET stage = 'beginning'
WHERE stage = 'starting';

-- Note: There are no other tables that store journey stage values
-- Journey stages are calculated dynamically from total hours
