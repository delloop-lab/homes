-- Fix RLS policies to allow hosts to update cleaner profiles
-- Run this in Supabase SQL Editor
-- IMPORTANT: This fixes the infinite recursion issue by using JWT metadata instead of querying user_profiles

-- First, drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "Hosts can update cleaner profiles" ON user_profiles;
DROP POLICY IF EXISTS "Hosts can view cleaner profiles" ON user_profiles;

-- Check current RLS policies on user_profiles
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- Create policy to allow hosts/admins to UPDATE cleaner profiles
-- Uses JWT metadata to avoid recursion (role stored in auth.users.raw_user_meta_data)
CREATE POLICY "Hosts can update cleaner profiles"
ON user_profiles
FOR UPDATE
TO authenticated
USING (
  -- Allow if updating your own profile
  id = auth.uid()
  OR
  -- Allow if current user is host/admin (check JWT metadata to avoid recursion)
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('host', 'admin')
  OR
  -- Fallback: check if user_metadata.role exists in JWT
  COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') IN ('host', 'admin')
)
WITH CHECK (
  -- Same conditions for the updated data
  id = auth.uid()
  OR
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('host', 'admin')
  OR
  COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') IN ('host', 'admin')
);

-- Create policy to allow hosts/admins to SELECT cleaner profiles
-- Uses JWT metadata to avoid recursion
CREATE POLICY "Hosts can view cleaner profiles"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  -- Allow viewing your own profile
  id = auth.uid()
  OR
  -- Allow if current user is host/admin (check JWT metadata)
  (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' IN ('host', 'admin')
  OR
  COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') IN ('host', 'admin')
  OR
  -- Allow viewing cleaner profiles (for hosts to manage cleaners)
  role = 'cleaner'
);

-- Alternative simpler approach if JWT metadata doesn't work:
-- Use a function that bypasses RLS to check user role
CREATE OR REPLACE FUNCTION is_host_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('host', 'admin')
  );
$$;

-- If JWT approach doesn't work, use this function-based policy instead:
-- (Comment out the JWT-based policies above and uncomment these)

/*
DROP POLICY IF EXISTS "Hosts can update cleaner profiles" ON user_profiles;
DROP POLICY IF EXISTS "Hosts can view cleaner profiles" ON user_profiles;

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

CREATE POLICY "Hosts can view cleaner profiles"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid() OR is_host_or_admin() OR role = 'cleaner'
);
*/

-- Verify the policies were created
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;

