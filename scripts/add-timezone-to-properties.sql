-- Add timezone column to properties table
-- This allows each property to have its own timezone for scheduling cleanings

ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';

-- Update existing properties to use UTC as default (can be changed by user)
UPDATE properties 
SET timezone = 'UTC' 
WHERE timezone IS NULL;

-- Add comment
COMMENT ON COLUMN properties.timezone IS 'IANA timezone identifier (e.g., America/New_York, Europe/London, America/Los_Angeles)';



