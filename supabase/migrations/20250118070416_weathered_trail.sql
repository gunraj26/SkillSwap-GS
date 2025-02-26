/*
  # Create skill_media table and storage buckets

  1. New Tables
    - `skill_media`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, references profiles)
      - `title` (text)
      - `description` (text, nullable)
      - `video_url` (text, nullable)
      - `photo_url` (text, nullable)
      - `thumbnail_url` (text, nullable)
      - `media_type` (text, check constraint)
      - `order_index` (integer)
      - `caption` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on skill_media table
    - Add policies for CRUD operations
*/

-- Create skill_media table if it doesn't exist
CREATE TABLE IF NOT EXISTS skill_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  video_url text,
  photo_url text,
  thumbnail_url text,
  media_type text NOT NULL CHECK (media_type IN ('video', 'photo')),
  order_index integer DEFAULT 0,
  caption text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add media_url_check constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'media_url_check' 
    AND conrelid = 'skill_media'::regclass
  ) THEN
    ALTER TABLE skill_media
    ADD CONSTRAINT media_url_check 
    CHECK (
      (media_type = 'video' AND video_url IS NOT NULL AND photo_url IS NULL) OR
      (media_type = 'photo' AND photo_url IS NOT NULL AND video_url IS NULL)
    );
  END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE skill_media ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view all skill media" ON skill_media;
  DROP POLICY IF EXISTS "Users can insert their own skill media" ON skill_media;
  DROP POLICY IF EXISTS "Users can update their own skill media" ON skill_media;
  DROP POLICY IF EXISTS "Users can delete their own skill media" ON skill_media;
END $$;

-- Create policies for skill_media table
CREATE POLICY "Users can view all skill media"
  ON skill_media
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own skill media"
  ON skill_media
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own skill media"
  ON skill_media
  FOR UPDATE
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own skill media"
  ON skill_media
  FOR DELETE
  USING (auth.uid() = profile_id);

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('skill_videos', 'skill_videos', true),
  ('skill_photos', 'skill_photos', true),
  ('video_thumbnails', 'video_thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DO $$ 
BEGIN
  -- Videos
  DROP POLICY IF EXISTS "Anyone can view skill videos" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload skill videos" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own skill videos" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own skill videos" ON storage.objects;
  
  -- Photos
  DROP POLICY IF EXISTS "Anyone can view skill photos" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload skill photos" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own skill photos" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own skill photos" ON storage.objects;
  
  -- Thumbnails
  DROP POLICY IF EXISTS "Anyone can view video thumbnails" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload video thumbnails" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own video thumbnails" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own video thumbnails" ON storage.objects;
END $$;

-- Storage policies for videos
CREATE POLICY "Anyone can view skill videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'skill_videos');

CREATE POLICY "Authenticated users can upload skill videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'skill_videos' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own skill videos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'skill_videos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own skill videos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'skill_videos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for photos
CREATE POLICY "Anyone can view skill photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'skill_photos');

CREATE POLICY "Authenticated users can upload skill photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'skill_photos' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own skill photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'skill_photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own skill photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'skill_photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for thumbnails
CREATE POLICY "Anyone can view video thumbnails"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'video_thumbnails');

CREATE POLICY "Authenticated users can upload video thumbnails"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'video_thumbnails' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own video thumbnails"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'video_thumbnails' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own video thumbnails"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'video_thumbnails' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );