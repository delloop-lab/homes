-- Add property_id to email_templates to support property-specific templates
-- NULL property_id means the template is a default template for all properties

ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE CASCADE;

-- Create index for faster lookups by property
CREATE INDEX IF NOT EXISTS idx_email_templates_property_id ON email_templates(property_id);

-- Create composite index for template_key + property_id lookups
CREATE INDEX IF NOT EXISTS idx_email_templates_key_property ON email_templates(template_key, property_id);

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'email_templates' 
  AND table_schema = 'public'
  AND column_name = 'property_id';

-- Note: Existing templates will have property_id = NULL, making them default templates
-- You can create property-specific templates by setting property_id when creating new templates



