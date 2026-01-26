-- Migration: Ontology Rename (v0.3.0)
-- Renames legacy type/category/subcategory values to new ontology

-- Rename type: journal → moment
UPDATE entries SET type = 'moment' WHERE type = 'journal';

-- Rename type: reps → tally
UPDATE entries SET type = 'tally' WHERE type = 'reps';

-- Rename category: journal → moments
UPDATE entries SET category = 'moments' WHERE category = 'journal';

-- Rename subcategory: note → journal
UPDATE entries SET subcategory = 'journal' WHERE subcategory = 'note';

-- Update rhythms that match on old values
UPDATE rhythms SET match_type = 'moment' WHERE match_type = 'journal';
UPDATE rhythms SET match_type = 'tally' WHERE match_type = 'reps';
UPDATE rhythms SET match_category = 'moments' WHERE match_category = 'journal';
UPDATE rhythms SET match_subcategory = 'journal' WHERE match_subcategory = 'note';

-- Update timer_presets if any reference old values
UPDATE timer_presets SET subcategory = 'journal' WHERE subcategory = 'note';
