-- Check email logs data and RLS policies
-- Run this in your Supabase SQL Editor

-- Check if there are any email logs
SELECT 
    'Email logs count' as check_type,
    COUNT(*) as total_emails,
    COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count
FROM cleaning_email_logs;

-- Show all email logs (if any)
SELECT 
    id,
    cleaner_email,
    cleaner_name,
    subject,
    status,
    error_message,
    sent_at
FROM cleaning_email_logs
ORDER BY sent_at DESC;

-- Check RLS policies on cleaning_email_logs
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'cleaning_email_logs';

-- Test if you can see the logs as the current user
SELECT 
    'Can view logs' as check_type,
    COUNT(*) as visible_count
FROM cleaning_email_logs;

