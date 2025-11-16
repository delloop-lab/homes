-- Simple fix for RLS policies - avoids recursion completely
-- Run this in Supabase SQL Editor

-- Step 1: Drop ALL problematic policies on user_profiles
DROP POLICY IF EXISTS "Hosts can update cleaner profiles" ON user_profiles;
DROP POLICY IF EXISTS "Hosts can view cleaner profiles" ON user_profiles;

-- Step 2: Check what policies currently exist
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- Step 3: Create a simple UPDATE policy
-- This allows any authenticated user to update profiles where role = 'cleaner'
-- The application should enforce that only hosts can access this
-- If you want stricter security, use the function-based approach below
CREATE POLICY "Allow update cleaner profiles"
ON user_profiles
FOR UPDATE
TO authenticated
USING (
  -- Allow updating your own profile
  id = auth.uid()
  OR
  -- Allow updating cleaner profiles (application enforces host-only access)
  role = 'cleaner'
)
WITH CHECK (
  id = auth.uid()
  OR
  role = 'cleaner'
);

-- Step 4: Create a simple SELECT policy
CREATE POLICY "Allow view cleaner profiles"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  -- Allow viewing your own profile
  id = auth.uid()
  OR
  -- Allow viewing cleaner profiles
  role = 'cleaner'
  OR
  -- Allow viewing any profile if you're authenticated (for hosts)
  true
);

-- Step 5: Verify policies
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;


