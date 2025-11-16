-- Final fix for RLS infinite recursion
-- Uses auth.users table instead of user_profiles to avoid recursion
-- Run this in Supabase SQL Editor

-- Step 1: Drop problematic policies
DROP POLICY IF EXISTS "Hosts can update cleaner profiles" ON user_profiles;
DROP POLICY IF EXISTS "Hosts can view cleaner profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow update cleaner profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow view cleaner profiles" ON user_profiles;

-- Step 2: Drop the function if it exists
DROP FUNCTION IF EXISTS is_host_or_admin();

-- Step 3: Create a function that checks auth.users.raw_user_meta_data instead
-- This avoids querying user_profiles which causes recursion
CREATE OR REPLACE FUNCTION is_host_or_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- Get role from auth.users metadata (doesn't trigger RLS)
  SELECT COALESCE(
    (raw_user_meta_data->>'role')::text,
    (raw_user_meta_data->>'user_role')::text,
    ''
  ) INTO user_role
  FROM auth.users
  WHERE id = auth.uid();
  
  RETURN user_role IN ('host', 'admin');
END;
$$;

-- Step 4: Create UPDATE policy
CREATE POLICY "Hosts can update cleaner profiles"
ON user_profiles
FOR UPDATE
TO authenticated
USING (
  id = auth.uid() OR is_host_or_admin()
)
WITH CHECK (
  id = auth.uid() OR is_host_or_admin()
);

-- Step 5: Create SELECT policy  
CREATE POLICY "Hosts can view cleaner profiles"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid() 
  OR is_host_or_admin() 
  OR role = 'cleaner'
);

-- Step 6: Verify policies
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- Step 7: Test - this will return FALSE in SQL editor (no auth context)
-- But will work correctly in the application
SELECT is_host_or_admin() as am_i_host;

-- Step 8: If the function still doesn't work, ensure role is in auth.users metadata
-- Run this to check your current user's metadata:
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role_in_metadata,
  raw_user_meta_data
FROM auth.users
WHERE email = 'lou@schillaci.me';  -- Replace with your host email

-- If role is not in metadata, update it:
-- UPDATE auth.users 
-- SET raw_user_meta_data = jsonb_set(
--   COALESCE(raw_user_meta_data, '{}'::jsonb),
--   '{role}',
--   '"host"'
-- )
-- WHERE email = 'lou@schillaci.me';


