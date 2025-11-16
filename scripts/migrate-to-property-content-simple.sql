-- =============================================
-- MIGRATE TO PROPERTY-SPECIFIC CONTENT IN JSONB
-- =============================================
-- This changes from multiple rows per template_key to one row with property_content JSONB
-- Run this step by step and check results

-- Step 1: Add property_content JSONB column
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS property_content JSONB DEFAULT '{}'::jsonb;

-- Step 2: Show current state (before migration)
SELECT 
    template_key,
    property_id,
    name,
    subject,
    COUNT(*) as count
FROM email_templates
GROUP BY template_key, property_id, name, subject
ORDER BY template_key, property_id;

-- Step 3: For each template_key, consolidate property-specific content into JSONB
-- This creates property_content like: { "property-id": { subject: "...", html_content: "...", text_content: "..." } }
WITH property_templates AS (
    SELECT 
        template_key,
        jsonb_object_agg(
            property_id::text,
            jsonb_build_object(
                'subject', subject,
                'html_content', html_content,
                'text_content', COALESCE(text_content, '')
            )
        ) as property_content_json
    FROM email_templates
    WHERE property_id IS NOT NULL
    GROUP BY template_key
)
UPDATE email_templates t
SET property_content = COALESCE(t.property_content, '{}'::jsonb) || pt.property_content_json
FROM property_templates pt
WHERE t.template_key = pt.template_key
  AND t.property_id IS NULL;  -- Update the default template row

-- Step 4: Delete property-specific rows (keep only the ones with property_id IS NULL)
DELETE FROM email_templates
WHERE property_id IS NOT NULL;

-- Step 5: Remove property_id column and related constraints/indexes
ALTER TABLE email_templates 
DROP COLUMN IF EXISTS property_id;

DROP INDEX IF EXISTS idx_email_templates_property_id;
DROP INDEX IF EXISTS idx_email_templates_key_property;
DROP INDEX IF EXISTS idx_email_templates_key_property_unique;
DROP INDEX IF EXISTS idx_email_templates_key_default_unique;

-- Step 6: Ensure unique constraint on template_key
ALTER TABLE email_templates 
DROP CONSTRAINT IF EXISTS email_templates_template_key_key;

ALTER TABLE email_templates 
ADD CONSTRAINT email_templates_template_key_key UNIQUE (template_key);

-- Step 7: Verify final structure
SELECT 
    id,
    template_key,
    name,
    subject as default_subject,
    LEFT(html_content, 50) as default_html_preview,
    jsonb_object_keys(COALESCE(property_content, '{}'::jsonb)) as property_ids,
    property_content
FROM email_templates
ORDER BY template_key;

-- Step 8: Show property-specific content for each template
SELECT 
    t.template_key,
    t.name,
    p.id as property_id,
    p.name as property_name,
    t.property_content->p.id::text->>'subject' as property_subject,
    CASE 
        WHEN t.property_content->p.id::text IS NOT NULL THEN 'Has custom content'
        ELSE 'Uses default'
    END as content_status
FROM email_templates t
CROSS JOIN properties p
ORDER BY t.template_key, p.name;



