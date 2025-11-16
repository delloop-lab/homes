-- Fix the unique constraint on email_templates to allow property-specific templates
-- The original schema had UNIQUE on template_key alone, which prevents multiple templates
-- with the same key but different property_id values.

-- Step 1: Drop the existing unique constraint on template_key
ALTER TABLE email_templates 
DROP CONSTRAINT IF EXISTS email_templates_template_key_key;

-- Step 2: Create a unique constraint on (template_key, property_id)
-- This allows:
-- - Multiple templates with the same template_key but different property_id
-- - Only one default template (property_id IS NULL) per template_key
-- Note: PostgreSQL treats NULL values as distinct in unique constraints, so multiple NULLs are allowed
-- We'll use a partial unique index to ensure only one NULL per template_key

-- First, create a unique index for non-null property_id values
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_templates_key_property_unique 
ON email_templates(template_key, property_id) 
WHERE property_id IS NOT NULL;

-- For NULL property_id (default templates), ensure only one per template_key
-- We'll use a partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_templates_key_default_unique 
ON email_templates(template_key) 
WHERE property_id IS NULL;

-- Verify the constraints
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'email_templates'
  AND indexname IN (
    'idx_email_templates_key_property_unique',
    'idx_email_templates_key_default_unique'
  );

-- Note: If you have duplicate templates that violate the new constraint, you'll need to:
-- 1. Identify duplicates: SELECT template_key, property_id, COUNT(*) FROM email_templates GROUP BY template_key, property_id HAVING COUNT(*) > 1;
-- 2. Delete or update duplicates before applying this migration



