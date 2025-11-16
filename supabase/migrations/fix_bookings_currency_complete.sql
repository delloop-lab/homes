-- Complete fix for bookings currency support
-- Run this entire script in Supabase SQL Editor

-- Step 1: Add currency column to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Step 2: Update existing bookings to set currency based on booking_platform
UPDATE bookings
SET currency = 'EUR'
WHERE booking_platform = 'vrbo' AND (currency IS NULL OR currency = 'USD' OR currency = 'GBP');

UPDATE bookings
SET currency = 'AUD'
WHERE booking_platform = 'airbnb' AND (currency IS NULL OR currency = 'USD');

UPDATE bookings
SET currency = 'EUR'
WHERE booking_platform IN ('booking', 'booking.com') AND (currency IS NULL OR currency = 'USD');

-- Set remaining bookings to USD if null
UPDATE bookings
SET currency = 'USD'
WHERE currency IS NULL;

-- Step 3: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_currency ON bookings(currency);

-- Step 4: Recreate the bookings_with_properties view to include currency
DROP VIEW IF EXISTS bookings_with_properties;

CREATE VIEW bookings_with_properties AS
SELECT 
    b.*,
    p.name as property_name,
    p.address as property_address,
    p.host_id
FROM bookings b
JOIN properties p ON b.property_id = p.id;

-- Step 5: Grant permissions
GRANT SELECT ON bookings_with_properties TO authenticated;

-- Step 6: Add comment
COMMENT ON COLUMN bookings.currency IS 'ISO 4217 currency code (e.g., USD, EUR, GBP) for the booking amount';

-- Step 7: Verify the view includes currency
-- You can run this query to verify:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'bookings_with_properties' AND column_name = 'currency';

