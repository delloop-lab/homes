-- Add cleaner_id column to cleanings table
-- This allows assigning cleanings to specific cleaner users

ALTER TABLE cleanings 
ADD COLUMN cleaner_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_cleanings_cleaner_id ON cleanings(cleaner_id);

-- Update the cleanings view to include cleaner information
DROP VIEW IF EXISTS cleanings_with_properties;

CREATE VIEW cleanings_with_properties AS
SELECT 
  c.*,
  p.name as property_name,
  p.address as property_address,
  up.full_name as cleaner_full_name,
  up.email as cleaner_email
FROM cleanings c
LEFT JOIN properties p ON c.property_id = p.id
LEFT JOIN user_profiles up ON c.cleaner_id = up.id;

-- Grant permissions to authenticated users
GRANT SELECT ON cleanings_with_properties TO authenticated;

COMMENT ON COLUMN cleanings.cleaner_id IS 'Reference to user_profiles table for assigned cleaner';


