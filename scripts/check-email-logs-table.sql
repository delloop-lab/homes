-- Check if cleaning_email_logs table exists and has data
-- Run this in your Supabase SQL Editor

-- Check if table exists
SELECT 
    'Table exists' as check_type,
    EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'cleaning_email_logs'
    ) as table_exists;

-- If table exists, show count and recent logs
SELECT 
    'Email logs count' as check_type,
    COUNT(*) as total_emails,
    COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count
FROM cleaning_email_logs;

-- Show recent email logs (if any)
SELECT 
    id,
    cleaner_email,
    cleaner_name,
    subject,
    status,
    error_message,
    sent_at
FROM cleaning_email_logs
ORDER BY sent_at DESC
LIMIT 10;

