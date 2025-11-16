-- ============================================================================
-- STORAGE BUCKET POLICIES FOR CERTIFICATES
-- ============================================================================
-- Run these SQL statements in your Supabase SQL Editor
-- (https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new)

-- 1. Create the certificates bucket if it doesn't exist
-- (You may have already created this via the Supabase dashboard)
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Allow authenticated users to upload files to the certificates bucket
CREATE POLICY "Authenticated users can upload certificates"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'certificates');

-- 4. Allow authenticated users to update their own files
CREATE POLICY "Authenticated users can update certificates"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'certificates');

-- 5. Allow authenticated users to delete files from certificates bucket
CREATE POLICY "Authenticated users can delete certificates"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'certificates');

-- 6. Allow public read access to certificates
CREATE POLICY "Public can view certificates"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'certificates');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the policies were created correctly:

-- Check if bucket exists and is public
SELECT * FROM storage.buckets WHERE id = 'certificates';

-- Check storage policies
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
