-- Run this in Supabase SQL Editor to test cleaner assignment

-- 1. Check if cleaner_id column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'cleanings' AND column_name = 'cleaner_id';

-- 2. Get lou@novita.com.au's user ID
SELECT id, email, full_name, role 
FROM user_profiles 
WHERE email = 'lou@novita.com.au';

-- 3. Check current cleanings with cleaner assignments
SELECT 
  c.id,
  c.cleaning_date,
  c.status,
  c.cleaner_id,
  p.name as property_name,
  up.full_name as cleaner_name,
  up.email as cleaner_email
FROM cleanings c
LEFT JOIN properties p ON c.property_id = p.id
LEFT JOIN user_profiles up ON c.cleaner_id = up.id
ORDER BY c.cleaning_date DESC
LIMIT 10;

-- 4. Manually test assignment (replace the UUIDs with actual values from steps 2 and 3)
-- UPDATE cleanings 
-- SET cleaner_id = 'PASTE_LOU_USER_ID_HERE'
-- WHERE id = 'PASTE_CLEANING_ID_HERE';


