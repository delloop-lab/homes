-- Check the actual content of email templates
-- This will show if templates have proper HTML content

SELECT 
    template_key,
    name,
    is_active,
    subject,
    LENGTH(html_content) as html_length,
    LENGTH(text_content) as text_length,
    LEFT(html_content, 200) as html_preview,
    LEFT(text_content, 200) as text_preview,
    variables
FROM email_templates
WHERE template_key IN ('check_in_instructions', 'checkout_reminder', 'thank_you_review')
ORDER BY template_key;

-- Check if templates have minimal or empty content
SELECT 
    template_key,
    name,
    CASE 
        WHEN LENGTH(html_content) < 100 THEN '⚠️ Very short HTML content'
        WHEN LENGTH(html_content) < 500 THEN '⚠️ Short HTML content'
        ELSE '✅ Has HTML content'
    END as html_status,
    CASE 
        WHEN text_content IS NULL OR LENGTH(text_content) = 0 THEN '⚠️ No text content'
        WHEN LENGTH(text_content) < 50 THEN '⚠️ Very short text content'
        ELSE '✅ Has text content'
    END as text_status
FROM email_templates
WHERE template_key IN ('check_in_instructions', 'checkout_reminder', 'thank_you_review')
ORDER BY template_key;



