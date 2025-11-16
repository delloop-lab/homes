-- Add email_type column to cleaning_email_logs to support template emails
-- This allows the same table to track both cleaning emails and template emails (check-in, checkout, thank you)

ALTER TABLE cleaning_email_logs 
ADD COLUMN IF NOT EXISTS email_type VARCHAR(50);

-- Add check constraint
ALTER TABLE cleaning_email_logs
DROP CONSTRAINT IF EXISTS cleaning_email_logs_email_type_check;

ALTER TABLE cleaning_email_logs
ADD CONSTRAINT cleaning_email_logs_email_type_check 
CHECK (email_type IN ('cleaning', 'check_in_instructions', 'checkout_reminder', 'thank_you_review'));

-- Set default for existing rows
UPDATE cleaning_email_logs 
SET email_type = 'cleaning' 
WHERE email_type IS NULL;

-- Make email_type NOT NULL after setting defaults
ALTER TABLE cleaning_email_logs 
ALTER COLUMN email_type SET DEFAULT 'cleaning';

-- Add index for faster queries by email type
CREATE INDEX IF NOT EXISTS idx_cleaning_email_logs_email_type ON cleaning_email_logs(email_type);

-- Add recipient_name column if it doesn't exist (for template emails to guests)
ALTER TABLE cleaning_email_logs 
ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255);

-- Verify the columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'cleaning_email_logs' 
  AND table_schema = 'public'
  AND column_name IN ('email_type', 'recipient_name', 'booking_id')
ORDER BY ordinal_position;

