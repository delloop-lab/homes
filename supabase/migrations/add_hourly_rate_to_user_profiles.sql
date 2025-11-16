-- Add hourly_rate column to user_profiles table for cleaners
-- This allows tracking how much each cleaner is paid per hour

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(8,2);

-- Add comment
COMMENT ON COLUMN user_profiles.hourly_rate IS 'Hourly rate for cleaners in dollars (e.g., 25.00)';

-- Grant permissions (RLS policies should handle access control)
-- The column will be accessible through existing RLS policies on user_profiles


