-- Check if cleaners exist in the database
SELECT 
    id,
    email,
    full_name,
    role,
    is_active,
    created_at
FROM user_profiles
WHERE role = 'cleaner'
ORDER BY created_at DESC;

-- Check current RLS policies on user_profiles
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
WHERE tablename = 'user_profiles';

-- If the "Hosts can view cleaner profiles" policy is missing or not working,
-- create/update it:
DROP POLICY IF EXISTS "Hosts can view cleaner profiles" ON user_profiles;

CREATE POLICY "Hosts can view cleaner profiles" ON user_profiles
    FOR SELECT USING (
        is_host() AND role = 'cleaner' AND is_active = true
    );

-- Also allow hosts to view all cleaner profiles (not just active ones) for management
CREATE POLICY "Hosts can view all cleaner profiles for management" ON user_profiles
    FOR SELECT USING (
        is_host() AND role = 'cleaner'
    );

