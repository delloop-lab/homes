-- Fix RLS policy to allow hosts to view email logs
-- Run this in your Supabase SQL Editor

-- Drop and recreate the SELECT policy
DROP POLICY IF EXISTS "Hosts can view cleaning email logs" ON cleaning_email_logs;

CREATE POLICY "Hosts can view cleaning email logs" ON cleaning_email_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role IN ('host', 'admin')
        )
    );

-- Verify you can see the email log
SELECT 
    'Test query' as check_type,
    COUNT(*) as visible_logs
FROM cleaning_email_logs;

-- Show the actual logs
SELECT 
    id,
    cleaner_email,
    cleaner_name,
    subject,
    status,
    sent_at
FROM cleaning_email_logs
ORDER BY sent_at DESC;

