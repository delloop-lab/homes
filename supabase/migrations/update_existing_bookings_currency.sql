-- Update existing bookings to set currency based on booking_platform
-- This ensures existing bookings have the correct currency assigned

UPDATE bookings
SET currency = 'GBP'
WHERE booking_platform = 'vrbo' AND (currency IS NULL OR currency = 'USD');

UPDATE bookings
SET currency = 'AUD'
WHERE booking_platform = 'airbnb' AND (currency IS NULL OR currency = 'USD');

UPDATE bookings
SET currency = 'EUR'
WHERE booking_platform IN ('booking', 'booking.com') AND (currency IS NULL OR currency = 'USD');

-- Keep manual bookings and others as USD (or they can be updated manually)
UPDATE bookings
SET currency = 'USD'
WHERE currency IS NULL;


