-- Check and fix the unique constraint on email_templates
-- This script will:
-- 1. Check if the old unique constraint on template_key exists
-- 2. Drop it if it does
-- 3. Create the new unique constraints that allow property-specific templates

-- Step 1: Check existing constraints
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'email_templates'::regclass
  AND conname LIKE '%template_key%';

-- Step 2: Check existing unique indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'email_templates'
  AND indexdef LIKE '%template_key%'
  AND indexdef LIKE '%UNIQUE%';

-- Step 3: Drop the old unique constraint on template_key if it exists
ALTER TABLE email_templates 
DROP CONSTRAINT IF EXISTS email_templates_template_key_key;

-- Step 4: Drop any unique indexes on template_key alone
DROP INDEX IF EXISTS email_templates_template_key_key;

-- Step 5: Create unique index for non-null property_id values
-- This allows multiple templates with same template_key but different property_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_templates_key_property_unique 
ON email_templates(template_key, property_id) 
WHERE property_id IS NOT NULL;

-- Step 6: Create unique index for NULL property_id (default templates)
-- This ensures only one default template per template_key
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_templates_key_default_unique 
ON email_templates(template_key) 
WHERE property_id IS NULL;

-- Step 7: Verify the new constraints
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'email_templates'
  AND indexname IN (
    'idx_email_templates_key_property_unique',
    'idx_email_templates_key_default_unique'
  );

-- Step 8: Check for any duplicate templates that might cause issues
SELECT 
    template_key,
    property_id,
    COUNT(*) as count,
    array_agg(id) as template_ids,
    array_agg(name) as template_names
FROM email_templates
GROUP BY template_key, property_id
HAVING COUNT(*) > 1;
