/*
  # Add support for both photos and videos in skill media

  1. Changes
    - Rename skill_videos table to skill_media
    - Add media_type column to distinguish between photos and videos
    - Add photos bucket for skill photos
    - Update policies for new structure

  2. Security
    - Maintain existing RLS policies
    - Add policies for photo storage
*/

-- Rename skill_videos table to skill_media
ALTER TABLE skill_videos RENAME TO skill_media;

-- Add media_type column
ALTER TABLE skill_media 
ADD COLUMN media_type text NOT NULL DEFAULT 'video'
CHECK (media_type IN ('video', 'photo'));

-- Create photos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('skill_photos', 'skill_photos', true)
ON CONFLICT (id) DO NOTHING;

-- Add storage policies for photos
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