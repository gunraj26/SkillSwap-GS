/*
  # Fix Avatar Storage Policies

  1. Changes
    - Drop existing avatar storage policies
    - Create new policies with correct permissions
    - Ensure public access to avatars bucket
    - Add proper user-specific folder permissions

  2. Security
    - Allow public read access to all avatars
    - Restrict write operations to authenticated users
    - Ensure users can only modify their own avatars
*/

-- Ensure avatars bucket is public
UPDATE storage.buckets
SET public = true
WHERE id = 'avatars';

-- Drop existing storage policies for avatars
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Create new storage policies for avatars
CREATE POLICY "Avatar public access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Avatar upload access"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Avatar update access"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Avatar delete access"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );