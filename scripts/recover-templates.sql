-- =============================================
-- RECOVER EMAIL TEMPLATES
-- =============================================
-- This script will recreate the templates if they were deleted

-- Step 1: Check if templates exist
SELECT COUNT(*) as template_count FROM email_templates;

-- Step 2: Recreate the 3 default templates if they don't exist
INSERT INTO email_templates (template_key, name, subject, html_content, text_content, variables, is_active, property_content)
SELECT * FROM (VALUES
    (
        'check_in_instructions',
        'Check In Details',
        'Check-in Instructions for {{property_name}} - {{check_in_date}}',
        '<h1>Welcome to {{property_name}}!</h1><p>Your check-in instructions...</p>',
        'Welcome to {{property_name}}! Your check-in instructions...',
        '{"property_name": "Property name", "check_in_date": "Check-in date", "guest_name": "Guest name", "property_address": "Property address"}'::jsonb,
        true,
        '{}'::jsonb
    ),
    (
        'checkout_reminder',
        'Checkout Reminder',
        'Checkout Reminder - {{property_name}} Tomorrow',
        '<h1>Checkout Reminder</h1><p>Your checkout is tomorrow...</p>',
        'Checkout Reminder: Your checkout is tomorrow...',
        '{"property_name": "Property name", "checkout_date": "Checkout date", "guest_name": "Guest name"}'::jsonb,
        true,
        '{}'::jsonb
    ),
    (
        'thank_you_review',
        'Thank You',
        'Thank you for staying at {{property_name}}! 🌟',
        '<h1>Thank you for your stay!</h1><p>We hope you enjoyed...</p>',
        'Thank you for your stay! We hope you enjoyed...',
        '{"property_name": "Property name", "guest_name": "Guest name", "review_link": "Review platform link"}'::jsonb,
        true,
        '{}'::jsonb
    )
) AS v(template_key, name, subject, html_content, text_content, variables, is_active, property_content)
WHERE NOT EXISTS (
    SELECT 1 FROM email_templates WHERE template_key = v.template_key
)
ON CONFLICT (template_key) DO NOTHING;

-- Step 3: Verify templates were created
SELECT 
    id,
    template_key,
    name,
    subject,
    is_active,
    property_content
FROM email_templates
ORDER BY template_key;



