-- Verify and fix email_templates constraints to ensure property-specific templates work correctly
-- This script checks for the old unique constraint and fixes it if needed

-- Step 1: Check for the old unique constraint on template_key alone
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'email_templates'::regclass
  AND conname LIKE '%template_key%';

-- Step 2: Check for unique indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'email_templates'
  AND indexname LIKE '%template_key%'
ORDER BY indexname;

-- Step 3: Drop the old unique constraint if it exists (this prevents property-specific templates)
DO $$
BEGIN
    -- Drop the old unique constraint on template_key alone
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'email_templates'::regclass 
        AND conname = 'email_templates_template_key_key'
    ) THEN
        ALTER TABLE email_templates DROP CONSTRAINT email_templates_template_key_key;
        RAISE NOTICE 'Dropped old unique constraint on template_key';
    ELSE
        RAISE NOTICE 'Old unique constraint on template_key does not exist';
    END IF;
END $$;

-- Step 4: Create the correct unique indexes for property-specific templates
-- This allows multiple templates with the same template_key but different property_id

-- For non-null property_id: unique constraint on (template_key, property_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_templates_key_property_unique 
ON email_templates(template_key, property_id) 
WHERE property_id IS NOT NULL;

-- For NULL property_id (default templates): only one default per template_key
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_templates_key_default_unique 
ON email_templates(template_key) 
WHERE property_id IS NULL;

-- Step 5: Verify the new constraints
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'email_templates'
  AND indexname IN (
    'idx_email_templates_key_property_unique',
    'idx_email_templates_key_default_unique'
  )
ORDER BY indexname;

-- Step 6: Check for any duplicate templates that might cause issues
SELECT 
    template_key,
    property_id,
    COUNT(*) as count,
    array_agg(id::text) as template_ids,
    array_agg(name) as template_names
FROM email_templates
GROUP BY template_key, property_id
HAVING COUNT(*) > 1;

-- Step 7: Verify property_id column exists
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'email_templates' 
  AND table_schema = 'public'
  AND column_name = 'property_id';

-- Note: If duplicates are found in Step 6, you'll need to manually resolve them
-- by either deleting duplicates or updating them to have different property_id values



