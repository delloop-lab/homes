-- Test email_templates UPDATE with RLS
-- Run this in your Supabase SQL Editor to diagnose the issue

-- First, check if you can see the template
SELECT 
    id,
    template_key,
    name,
    subject,
    is_active,
    updated_at
FROM email_templates
WHERE id = 'd72c4ede-d697-4520-aa04-269768c3cb21';

-- Check your current user and role
SELECT 
    auth.uid() as current_user_id,
    (SELECT role FROM user_profiles WHERE id = auth.uid()) as current_role;

-- Test the RLS policy directly
-- This simulates what the UPDATE policy checks
SELECT 
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role IN ('host', 'admin')
    ) as can_update;

-- Check all RLS policies on email_templates
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'email_templates'
ORDER BY policyname;

-- Try to manually update (this will show if RLS is blocking)
-- Replace 'YOUR_USER_ID' with your actual user ID from the query above
UPDATE email_templates
SET name = 'Test Update ' || NOW()::text
WHERE id = 'd72c4ede-d697-4520-aa04-269768c3cb21'
RETURNING id, name, updated_at;



