-- Check if cleaners exist
SELECT 'Cleaners count' as check_type, COUNT(*) as count
FROM user_profiles
WHERE role = 'cleaner';

-- List all cleaners
SELECT 'All cleaners' as check_type, id, email, full_name, role, is_active
FROM user_profiles
WHERE role = 'cleaner';

-- Check your current user and role
SELECT 'Your profile' as check_type, id, email, full_name, role, is_active
FROM user_profiles
WHERE id = auth.uid();

-- Test if is_host() function works for you
SELECT 'is_host() result' as check_type, is_host() as is_host_result, get_user_role() as your_role;

-- Test the actual query that the app uses
SELECT 'App query test' as check_type, id, email, full_name, role
FROM user_profiles
WHERE role = 'cleaner'
ORDER BY full_name;

