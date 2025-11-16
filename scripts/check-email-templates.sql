-- Check what email templates exist in the database
-- Run this to see if templates are set up correctly

SELECT 
    id,
    template_key,
    name,
    is_active,
    LENGTH(html_content) as html_length,
    LENGTH(text_content) as text_length,
    created_at,
    updated_at
FROM email_templates
ORDER BY template_key;

-- Check specifically for the template keys used by the system
SELECT 
    template_key,
    name,
    is_active,
    CASE 
        WHEN is_active = true THEN '✅ Active - Will be used'
        ELSE '❌ Inactive - Will use default template'
    END as status
FROM email_templates
WHERE template_key IN ('check_in_instructions', 'checkout_reminder', 'thank_you_review')
ORDER BY template_key;

-- If no templates exist, you can create them using the Email Templates page in the app
-- Or run the INSERT statements from supabase/email-schema.sql



