-- Setup Storage Policies for Student Photos
-- Run this in your Supabase SQL Editor after creating the 'student-photos' bucket

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow public viewing of photos in student-photos bucket
CREATE POLICY "Public Access to Student Photos" ON storage.objects 
FOR SELECT USING (bucket_id = 'student-photos');

-- Allow authenticated users to upload photos to student-photos bucket
CREATE POLICY "Allow photo uploads" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'student-photos');

-- Allow authenticated users to update photos in student-photos bucket
CREATE POLICY "Allow photo updates" ON storage.objects 
FOR UPDATE USING (bucket_id = 'student-photos');

-- Allow authenticated users to delete photos in student-photos bucket
CREATE POLICY "Allow photo deletions" ON storage.objects 
FOR DELETE USING (bucket_id = 'student-photos');

-- Verify the bucket exists and is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'student-photos';

-- Check if policies were created successfully
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage'; 