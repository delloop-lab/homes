-- Fix infinite recursion in user_profiles RLS policies
-- Run this in Supabase SQL Editor

-- Step 1: Drop the problematic policies
DROP POLICY IF EXISTS "Hosts can update cleaner profiles" ON user_profiles;
DROP POLICY IF EXISTS "Hosts can view cleaner profiles" ON user_profiles;

-- Step 2: Create a helper function that bypasses RLS to check user role
-- SECURITY DEFINER allows it to read user_profiles without triggering RLS
CREATE OR REPLACE FUNCTION is_host_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('host', 'admin')
  );
$$;

-- Step 3: Create UPDATE policy using the function (avoids recursion)
CREATE POLICY "Hosts can update cleaner profiles"
ON user_profiles
FOR UPDATE
TO authenticated
USING (
  -- Allow updating your own profile
  id = auth.uid()
  OR
  -- Allow if current user is host/admin (uses function to avoid recursion)
  is_host_or_admin()
)
WITH CHECK (
  -- Same conditions for the updated data
  id = auth.uid()
  OR
  is_host_or_admin()
);

-- Step 4: Create SELECT policy using the function (avoids recursion)
CREATE POLICY "Hosts can view cleaner profiles"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  -- Allow viewing your own profile
  id = auth.uid()
  OR
  -- Allow if current user is host/admin
  is_host_or_admin()
  OR
  -- Allow viewing cleaner profiles (for hosts to manage cleaners)
  role = 'cleaner'
);

-- Step 5: Verify the policies
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- Step 6: Test the function (should return true if you're a host)
SELECT is_host_or_admin() as am_i_host;


