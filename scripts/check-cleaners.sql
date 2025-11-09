-- Check if cleaners exist in the database
SELECT 
    id,
    email,
    full_name,
    role,
    phone,
    hourly_rate,
    is_active,
    created_at
FROM user_profiles
WHERE role = 'cleaner'
ORDER BY created_at DESC;

