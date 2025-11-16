-- Add commission_and_charges field to bookings table
-- This allows tracking platform fees and commissions separately from total amount

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS commission_and_charges DECIMAL(10,2) DEFAULT 0;

-- Add comment
COMMENT ON COLUMN bookings.commission_and_charges IS 'Platform commission and charges (subtracted from total_amount to calculate payout)';

-- Add index for reporting
CREATE INDEX IF NOT EXISTS idx_bookings_commission 
ON bookings(commission_and_charges) 
WHERE commission_and_charges IS NOT NULL AND commission_and_charges > 0;



