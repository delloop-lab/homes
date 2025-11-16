-- Add DELETE policy for cleaning_email_logs to allow hosts to delete email logs
-- Run this in your Supabase SQL Editor

-- Drop existing DELETE policy if it exists
DROP POLICY IF EXISTS "Hosts can delete cleaning email logs" ON cleaning_email_logs;

-- RLS Policy: Hosts can delete cleaning email logs
CREATE POLICY "Hosts can delete cleaning email logs" ON cleaning_email_logs
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role IN ('host', 'admin')
        )
    );

-- Verify the policy was created
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'cleaning_email_logs'
  AND cmd = 'DELETE';



