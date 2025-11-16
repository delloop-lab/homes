-- Drop the old unique constraint on template_key
ALTER TABLE email_templates 
DROP CONSTRAINT IF EXISTS email_templates_template_key_key;

-- Drop any unique indexes on template_key alone
DROP INDEX IF EXISTS email_templates_template_key_key;

-- Create unique index for non-null property_id values
-- This allows multiple templates with same template_key but different property_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_templates_key_property_unique 
ON email_templates(template_key, property_id) 
WHERE property_id IS NOT NULL;

-- Create unique index for NULL property_id (default templates)
-- This ensures only one default template per template_key
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_templates_key_default_unique 
ON email_templates(template_key) 
WHERE property_id IS NULL;



