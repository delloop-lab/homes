-- =============================================
-- MIGRATE TO PROPERTY-SPECIFIC CONTENT IN JSONB
-- =============================================
-- This changes the structure from:
--   Multiple rows per template_key (one per property)
-- To:
--   One row per template_key with property-specific content in JSONB
--
-- Structure: property_content JSONB = {
--   "property-id-1": { subject: "...", html_content: "...", text_content: "..." },
--   "property-id-2": { subject: "...", html_content: "...", text_content: "..." }
-- }

-- Step 1: Add property_content JSONB column
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS property_content JSONB DEFAULT '{}'::jsonb;

-- Step 2: Migrate existing property-specific templates to property_content
-- This consolidates multiple rows into one row per template_key
DO $$
DECLARE
    template_rec RECORD;
    property_content_obj JSONB := '{}'::jsonb;
    current_template_key VARCHAR(100);
BEGIN
    -- Group by template_key and build property_content JSONB
    FOR template_rec IN 
        SELECT 
            template_key,
            property_id,
            subject,
            html_content,
            text_content
        FROM email_templates
        WHERE property_id IS NOT NULL
        ORDER BY template_key, property_id
    LOOP
        -- If this is a new template_key, initialize the object
        IF current_template_key IS NULL OR current_template_key != template_rec.template_key THEN
            -- Save previous template_key if exists
            IF current_template_key IS NOT NULL THEN
                UPDATE email_templates
                SET property_content = property_content_obj
                WHERE template_key = current_template_key
                  AND property_id IS NULL  -- Update the default template
                LIMIT 1;
            END IF;
            
            -- Start new template_key
            current_template_key := template_rec.template_key;
            property_content_obj := '{}'::jsonb;
        END IF;
        
        -- Add property-specific content
        property_content_obj := property_content_obj || jsonb_build_object(
            template_rec.property_id::text,
            jsonb_build_object(
                'subject', template_rec.subject,
                'html_content', template_rec.html_content,
                'text_content', COALESCE(template_rec.text_content, '')
            )
        );
    END LOOP;
    
    -- Save the last template_key
    IF current_template_key IS NOT NULL THEN
        UPDATE email_templates
        SET property_content = property_content_obj
        WHERE template_key = current_template_key
          AND property_id IS NULL
        LIMIT 1;
    END IF;
    
    -- For templates that don't have property-specific versions, keep default content
    -- The default subject/html_content/text_content fields will be used as fallback
END $$;

-- Step 3: Create a default template for each template_key if it doesn't exist
-- Use the first property's content as default, or keep existing default
INSERT INTO email_templates (template_key, name, subject, html_content, text_content, is_active, property_content)
SELECT DISTINCT ON (template_key)
    template_key,
    name,
    subject,
    html_content,
    text_content,
    is_active,
    COALESCE(property_content, '{}'::jsonb) as property_content
FROM email_templates
WHERE property_id IS NULL
ON CONFLICT (template_key) DO NOTHING;

-- Step 4: Delete duplicate templates (keep only the ones with property_id IS NULL)
DELETE FROM email_templates
WHERE property_id IS NOT NULL;

-- Step 5: Remove property_id column (no longer needed)
ALTER TABLE email_templates 
DROP COLUMN IF EXISTS property_id;

-- Step 6: Drop indexes related to property_id
DROP INDEX IF EXISTS idx_email_templates_property_id;
DROP INDEX IF EXISTS idx_email_templates_key_property;
DROP INDEX IF EXISTS idx_email_templates_key_property_unique;
DROP INDEX IF EXISTS idx_email_templates_key_default_unique;

-- Step 7: Ensure unique constraint on template_key (one template per key)
ALTER TABLE email_templates 
ADD CONSTRAINT email_templates_template_key_key UNIQUE (template_key);

-- Step 8: Verify the migration
SELECT 
    template_key,
    name,
    subject as default_subject,
    jsonb_object_keys(property_content) as property_id,
    property_content->jsonb_object_keys(property_content)->>'subject' as property_subject
FROM email_templates
WHERE jsonb_typeof(property_content) = 'object'
  AND jsonb_object_keys(property_content) IS NOT NULL
ORDER BY template_key, property_id;

-- Step 9: Show final structure
SELECT 
    id,
    template_key,
    name,
    subject as default_subject,
    LEFT(html_content, 50) as default_html_preview,
    jsonb_object_keys(COALESCE(property_content, '{}'::jsonb)) as has_content_for_properties,
    property_content
FROM email_templates
ORDER BY template_key;



