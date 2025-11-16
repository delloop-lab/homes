-- Update VRBO bookings from GBP to EUR
-- Run this if you previously set VRBO to GBP and need to correct it

UPDATE bookings
SET currency = 'EUR'
WHERE booking_platform = 'vrbo' AND currency = 'GBP';

-- Verify the update
SELECT 
  booking_platform,
  currency,
  COUNT(*) as count
FROM bookings
WHERE booking_platform = 'vrbo'
GROUP BY booking_platform, currency;


