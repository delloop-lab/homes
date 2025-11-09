-- Enable authentication for the project
-- This should be run in your Supabase SQL Editor

-- First, make sure auth is properly configured
-- Enable email authentication
INSERT INTO auth.config (key, value) 
VALUES ('SITE_URL', 'http://localhost:3000')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO auth.config (key, value) 
VALUES ('EMAIL_CONFIRM_SIGNUP', 'false')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO auth.config (key, value) 
VALUES ('EMAIL_CONFIRM_CHANGE', 'false')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Create user profiles table for roles
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'host' CHECK (role IN ('host', 'cleaner', 'admin')),
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    company_name TEXT,
    company_address TEXT,
    hourly_rate DECIMAL(10,2),
    preferred_properties TEXT[],
    availability JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sign_in TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users only" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, role)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', new.email),
        COALESCE(new.raw_user_meta_data->>'role', 'host')
    );
    RETURN new;
END;
$$ language plpgsql security definer;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a test user (you can delete this later)
-- Password: testuser123
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'test@example.com',
    crypt('testuser123', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Test User", "role": "host"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
) ON CONFLICT (email) DO NOTHING;

-- Display success message
SELECT 'Supabase authentication setup complete! You can now sign up and sign in.' as message;









