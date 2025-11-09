-- Database Health Check Script
-- Run this in your Supabase SQL Editor to verify database integrity

-- 1. Check if all required tables exist
SELECT 'Tables Check' as check_type, 
       EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'properties') as properties_exists,
       EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') as bookings_exists,
       EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cleanings') as cleanings_exists,
       EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calendar_sources') as calendar_sources_exists,
       EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') as user_profiles_exists;

-- 2. Check auth users
SELECT 'Auth Users' as check_type, 
       COUNT(*) as total_users,
       COUNT(*) FILTER (WHERE email_confirmed_at IS NOT NULL) as confirmed_users,
       COUNT(*) FILTER (WHERE last_sign_in_at IS NOT NULL) as users_who_signed_in
FROM auth.users;

-- 3. List all users with their status
SELECT 'User Details' as info,
       email,
       email_confirmed_at IS NOT NULL as email_confirmed,
       last_sign_in_at,
       created_at
FROM auth.users
ORDER BY created_at DESC;

-- 4. Check user_profiles table
SELECT 'User Profiles' as check_type,
       COUNT(*) as total_profiles
FROM public.user_profiles;

-- 5. Check data in main tables
SELECT 'Data Counts' as check_type,
       (SELECT COUNT(*) FROM public.properties) as properties_count,
       (SELECT COUNT(*) FROM public.bookings) as bookings_count,
       (SELECT COUNT(*) FROM public.cleanings) as cleanings_count,
       (SELECT COUNT(*) FROM public.calendar_sources) as calendar_sources_count;

-- 6. Check RLS (Row Level Security) status
SELECT 'RLS Status' as check_type,
       schemaname,
       tablename,
       rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 7. Verify foreign key constraints are intact
SELECT 'Foreign Keys' as check_type,
       COUNT(*) as total_foreign_keys
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
  AND table_schema = 'public';

-- 8. Check if there are any broken relationships (orphaned records)
SELECT 'Orphaned Bookings' as check_type,
       COUNT(*) as orphaned_count
FROM public.bookings b
WHERE NOT EXISTS (SELECT 1 FROM public.properties p WHERE p.id = b.property_id);

-- 9. Check triggers (for auto-updating timestamps)
SELECT 'Triggers' as check_type,
       COUNT(*) as total_triggers
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- 10. Overall Health Summary
SELECT 'HEALTH SUMMARY' as status,
       CASE 
         WHEN (SELECT COUNT(*) FROM auth.users) > 0 THEN '✓ Users exist'
         ELSE '✗ No users found'
       END as user_status,
       CASE 
         WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'properties') THEN '✓ Schema OK'
         ELSE '✗ Schema incomplete'
       END as schema_status,
       '✓ Database responding' as connection_status;

