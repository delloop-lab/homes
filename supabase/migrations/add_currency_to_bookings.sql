-- Add currency column to bookings table
-- This allows bookings to store their original currency (e.g., EUR from Booking.com)

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Update existing bookings to use USD as default if null
UPDATE bookings 
SET currency = 'USD' 
WHERE currency IS NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_currency ON bookings(currency);

-- Add comment
COMMENT ON COLUMN bookings.currency IS 'ISO 4217 currency code (e.g., USD, EUR, GBP) for the booking amount';


