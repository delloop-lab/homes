-- Add booking_id column to cleaning_email_logs table
-- This allows tracking which emails were sent about specific bookings

ALTER TABLE cleaning_email_logs 
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_cleaning_email_logs_booking_id ON cleaning_email_logs(booking_id);

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'cleaning_email_logs' 
  AND table_schema = 'public'
ORDER BY ordinal_position;



