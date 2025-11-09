-- Fix the INSERT policy to ensure it works correctly
-- Run this in your Supabase SQL Editor

-- Drop and recreate the INSERT policy with explicit WITH CHECK
DROP POLICY IF EXISTS "System can insert cleaning email logs" ON cleaning_email_logs;

CREATE POLICY "System can insert cleaning email logs" ON cleaning_email_logs
    FOR INSERT 
    WITH CHECK (true);

-- Verify the policy
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'cleaning_email_logs' AND policyname = 'System can insert cleaning email logs';

