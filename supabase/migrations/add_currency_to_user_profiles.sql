-- Add currency column to user_profiles table
-- This allows hosts to set their preferred currency

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Update existing hosts to have USD as default if null
UPDATE user_profiles 
SET currency = 'USD' 
WHERE currency IS NULL AND role IN ('host', 'admin');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_currency ON user_profiles(currency);

-- Add comment
COMMENT ON COLUMN user_profiles.currency IS 'ISO 4217 currency code (e.g., USD, EUR, GBP, AUD)';


