-- Migration: Ontology v0.4.0
-- Removes 'accomplishment' category, maps to new categories (work, health, social, life_admin)
-- See design/ontology.md for full documentation

-- Smart map accomplishment entries to appropriate new categories
-- Based on subcategory values

-- home → life_admin (chores, household)
UPDATE entries
SET category = 'life_admin'
WHERE category = 'accomplishment' AND subcategory = 'home';

-- work → work (career, professional)
UPDATE entries
SET category = 'work'
WHERE category = 'accomplishment' AND subcategory = 'work';

-- hobby → creative (art, music, making)
UPDATE entries
SET category = 'creative'
WHERE category = 'accomplishment' AND subcategory = 'hobby';

-- social → social (relationships, community)
UPDATE entries
SET category = 'social'
WHERE category = 'accomplishment' AND subcategory = 'social';

-- health → health (wellness, medical)
UPDATE entries
SET category = 'health'
WHERE category = 'accomplishment' AND subcategory = 'health';

-- personal → work (best guess for general personal wins)
UPDATE entries
SET category = 'work', subcategory = NULL
WHERE category = 'accomplishment' AND subcategory = 'personal';

-- Catch any remaining accomplishment entries → work (safe default)
UPDATE entries
SET category = 'work'
WHERE category = 'accomplishment';

-- Update rhythms that match on accomplishment category
UPDATE rhythms
SET match_category = 'work'
WHERE match_category = 'accomplishment';

-- Clear subcategory for entries where it was an old accomplishment subcategory
-- (These subcategories no longer exist in the new ontology)
UPDATE entries
SET subcategory = NULL
WHERE subcategory IN ('home', 'personal', 'hobby')
  AND category IN ('work', 'creative', 'social', 'health', 'life_admin');
