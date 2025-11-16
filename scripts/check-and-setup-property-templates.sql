-- =============================================
-- CHECK AND SETUP PROPERTY-SPECIFIC EMAIL TEMPLATES
-- =============================================
-- This script will:
-- 1. Check if property_id column exists in email_templates
-- 2. Add it if it doesn't exist
-- 3. Show you how templates are stored per property
-- 4. Show examples of templates for different properties

-- Step 1: Check if property_id column exists
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'email_templates' 
  AND table_schema = 'public'
  AND column_name = 'property_id';

-- Step 2: If property_id doesn't exist, add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'email_templates' 
          AND table_schema = 'public'
          AND column_name = 'property_id'
    ) THEN
        -- Add the property_id column
        ALTER TABLE email_templates 
        ADD COLUMN property_id UUID REFERENCES properties(id) ON DELETE CASCADE;
        
        -- Create index for faster lookups by property
        CREATE INDEX idx_email_templates_property_id ON email_templates(property_id);
        
        -- Create composite index for template_key + property_id lookups
        CREATE INDEX idx_email_templates_key_property ON email_templates(template_key, property_id);
        
        RAISE NOTICE 'Added property_id column to email_templates table';
    ELSE
        RAISE NOTICE 'property_id column already exists in email_templates table';
    END IF;
END $$;

-- Step 3: Show current template structure
-- This shows you how templates are stored:
-- - property_id = NULL means it's a default template for ALL properties
-- - property_id = <uuid> means it's specific to that property
SELECT 
    id,
    template_key,
    name,
    property_id,
    CASE 
        WHEN property_id IS NULL THEN 'Default (All Properties)'
        ELSE 'Property-Specific'
    END as template_type,
    is_active,
    created_at,
    updated_at
FROM email_templates
ORDER BY 
    CASE WHEN property_id IS NULL THEN 0 ELSE 1 END,
    template_key,
    property_id;

-- Step 4: Show templates grouped by property
-- This shows you which templates exist for which properties
SELECT 
    t.template_key,
    t.name,
    t.property_id,
    p.name as property_name,
    CASE 
        WHEN t.property_id IS NULL THEN 'Default (All Properties)'
        ELSE p.name
    END as used_for_property,
    t.is_active
FROM email_templates t
LEFT JOIN properties p ON t.property_id = p.id
ORDER BY 
    t.template_key,
    CASE WHEN t.property_id IS NULL THEN 0 ELSE 1 END,
    p.name;

-- Step 5: Show example of how multiple properties can have the same template_key
-- This demonstrates that you CAN have:
-- - Template A: template_key='check_in_instructions', property_id=NULL (default for all)
-- - Template B: template_key='check_in_instructions', property_id='<property-1-uuid>' (specific to property 1)
-- - Template C: template_key='check_in_instructions', property_id='<property-2-uuid>' (specific to property 2)
SELECT 
    template_key,
    COUNT(*) as template_count,
    COUNT(DISTINCT property_id) as unique_properties,
    array_agg(
        CASE 
            WHEN property_id IS NULL THEN 'Default'
            ELSE property_id::text
        END
    ) as property_ids,
    array_agg(name) as template_names
FROM email_templates
GROUP BY template_key
ORDER BY template_key;

-- Step 6: Check for duplicate templates (same template_key + property_id)
-- This should return 0 rows if constraints are set up correctly
SELECT 
    template_key,
    property_id,
    COUNT(*) as count,
    array_agg(id::text) as template_ids,
    array_agg(name) as template_names
FROM email_templates
GROUP BY template_key, property_id
HAVING COUNT(*) > 1;

-- Step 7: Example query to see templates for a specific property
-- Replace '<your-property-id>' with an actual property ID from your properties table
-- This shows how the system looks up templates:
-- 1. First tries to find property-specific template (property_id = <property-id>)
-- 2. If not found, falls back to default template (property_id IS NULL)
SELECT 
    'Property-Specific Template' as lookup_type,
    t.*
FROM email_templates t
WHERE t.template_key = 'check_in_instructions'
  AND t.property_id = '<your-property-id>'  -- Replace with actual property ID
  AND t.is_active = true

UNION ALL

SELECT 
    'Default Template (Fallback)' as lookup_type,
    t.*
FROM email_templates t
WHERE t.template_key = 'check_in_instructions'
  AND t.property_id IS NULL
  AND t.is_active = true
  AND NOT EXISTS (
      SELECT 1 FROM email_templates t2
      WHERE t2.template_key = 'check_in_instructions'
        AND t2.property_id = '<your-property-id>'  -- Replace with actual property ID
        AND t2.is_active = true
  )
LIMIT 1;

-- Step 8: Show all your properties (so you can see property IDs)
SELECT 
    id as property_id,
    name as property_name,
    address
FROM properties
ORDER BY name;



