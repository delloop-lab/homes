-- Fix RLS policies for email_templates to allow hosts to update and insert
-- Run this in your Supabase SQL Editor

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view email templates" ON email_templates;
DROP POLICY IF EXISTS "Hosts can manage email templates" ON email_templates;
DROP POLICY IF EXISTS "Hosts can insert email templates" ON email_templates;
DROP POLICY IF EXISTS "Hosts can update email templates" ON email_templates;
DROP POLICY IF EXISTS "Hosts can delete email templates" ON email_templates;

-- Policy: Hosts can view all email templates (not just active ones)
CREATE POLICY "Hosts can view email templates" ON email_templates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role IN ('host', 'admin')
        )
    );

-- Policy: Hosts can insert email templates
CREATE POLICY "Hosts can insert email templates" ON email_templates
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role IN ('host', 'admin')
        )
    );

-- Policy: Hosts can update email templates
-- Note: WITH CHECK is required for UPDATE operations in Supabase
CREATE POLICY "Hosts can update email templates" ON email_templates
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role IN ('host', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role IN ('host', 'admin')
        )
    );

-- Policy: Hosts can delete email templates
CREATE POLICY "Hosts can delete email templates" ON email_templates
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role IN ('host', 'admin')
        )
    );

-- Verify the policies were created
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

