-- Create storage bucket for passport/identification documents
-- Run this in your Supabase SQL Editor

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('indentification', 'indentification', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload their own identification documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own identification documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own identification documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own identification documents" ON storage.objects;

-- Set up storage policies to allow authenticated users to upload
CREATE POLICY "Users can upload their own identification documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'indentification' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own uploaded documents
CREATE POLICY "Users can view their own identification documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'indentification'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own documents
CREATE POLICY "Users can update their own identification documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'indentification'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own documents
CREATE POLICY "Users can delete their own identification documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'indentification'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

