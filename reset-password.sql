-- Reset password for lou@schillaci.me
-- Run this in your Supabase SQL Editor
-- This will set the password to: NewPassword123

UPDATE auth.users
SET 
  encrypted_password = crypt('NewPassword123', gen_salt('bf')),
  updated_at = NOW()
WHERE email = 'lou@schillaci.me';

-- Verify the update
SELECT email, created_at, updated_at, email_confirmed_at, last_sign_in_at
FROM auth.users
WHERE email = 'lou@schillaci.me';

