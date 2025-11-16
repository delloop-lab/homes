-- Fix existing cleaning times that are scheduled at 3AM
-- This updates them to 10:00 AM (checkout time) on the same date

-- First, let's see what we're dealing with
SELECT 
  COUNT(*) as total_3am_cleanings,
  COUNT(DISTINCT property_id) as affected_properties
FROM cleanings
WHERE EXTRACT(HOUR FROM cleaning_date AT TIME ZONE 'UTC') = 3
  AND notes LIKE 'Post-checkout cleaning%';

-- Update cleanings scheduled at 3AM to 10:00 AM on the same date
-- Checkout is typically at 10AM, so cleaning should be at 10AM
UPDATE cleanings
SET cleaning_date = (
  DATE_TRUNC('day', cleaning_date) + INTERVAL '10 hours'
)
WHERE EXTRACT(HOUR FROM cleaning_date AT TIME ZONE 'UTC') = 3
  AND notes LIKE 'Post-checkout cleaning%';

-- Show results
SELECT 
  id,
  property_id,
  cleaning_date,
  notes,
  EXTRACT(HOUR FROM cleaning_date AT TIME ZONE 'UTC') as hour_utc
FROM cleanings
WHERE notes LIKE 'Post-checkout cleaning%'
ORDER BY cleaning_date DESC
LIMIT 10;

