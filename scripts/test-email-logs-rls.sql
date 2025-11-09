-- Test if you can view email logs as the current user
-- Run this in your Supabase SQL Editor

-- Check your current role
SELECT 
    'Your role' as check_type,
    id,
    email,
    role
FROM user_profiles
WHERE id = auth.uid();

-- Test the RLS policy - try to select from cleaning_email_logs
SELECT 
    'Can view logs' as check_type,
    COUNT(*) as visible_count
FROM cleaning_email_logs;

-- If the count is 0 but you know there's 1 email, the RLS policy is blocking
-- If the count is 1, the policy is working

