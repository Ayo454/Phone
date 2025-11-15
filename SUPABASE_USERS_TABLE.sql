-- Create the 'users' table in Supabase for registration
-- Run this SQL in the Supabase SQL Editor: https://app.supabase.com/project/[YOUR_PROJECT_ID]/sql/new

CREATE TABLE public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    user_type VARCHAR(50) NOT NULL,
    organization VARCHAR(255),
    newsletter_subscribed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create an index on email for faster lookups
CREATE INDEX idx_users_email ON public.users(email);

-- Create an index on created_at for sorting/filtering by registration date
CREATE INDEX idx_users_created_at ON public.users(created_at);

-- Enable Row Level Security (RLS) - optional but recommended for production
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (registration form)
CREATE POLICY "Allow insert for registration" ON public.users
    FOR INSERT
    WITH CHECK (true);

-- Allow anyone to read users (for lookups, etc.)
CREATE POLICY "Allow select users" ON public.users
    FOR SELECT
    USING (true);

-- Optional: Allow updates only by the user (if you add user auth later)
-- CREATE POLICY "Allow update own user" ON public.users
--     FOR UPDATE
--     USING (auth.uid() = id)
--     WITH CHECK (auth.uid() = id);
