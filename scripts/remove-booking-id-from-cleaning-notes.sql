-- Remove all booking ID references from cleaning notes
-- This removes "for booking [UUID]" or "booking [UUID]" patterns from notes

-- First, update notes that have "Post-checkout cleaning for booking [UUID]" pattern
UPDATE cleanings
SET notes = 'Post-checkout cleaning'
WHERE notes LIKE 'Post-checkout cleaning for booking%';

-- Remove any "for booking [UUID]" pattern from notes
UPDATE cleanings
SET notes = TRIM(REGEXP_REPLACE(notes, '\s+for\s+booking\s+[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '', 'gi'))
WHERE notes ~* 'for\s+booking\s+[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

-- Remove any standalone "booking [UUID]" pattern from notes
UPDATE cleanings
SET notes = TRIM(REGEXP_REPLACE(notes, '\s*booking\s+[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s*', '', 'gi'))
WHERE notes ~* 'booking\s+[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

-- Remove any UUID pattern that might be at the end of notes (in case there are variations)
UPDATE cleanings
SET notes = TRIM(REGEXP_REPLACE(notes, '\s+[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s*$', '', 'gi'))
WHERE notes ~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s*$';

-- Show summary of updated records
SELECT 
  COUNT(*) as total_cleanings_with_notes,
  COUNT(CASE WHEN notes = 'Post-checkout cleaning' THEN 1 END) as post_checkout_cleanings,
  COUNT(CASE WHEN notes ~* 'booking' THEN 1 END) as remaining_booking_references
FROM cleanings
WHERE notes IS NOT NULL;
