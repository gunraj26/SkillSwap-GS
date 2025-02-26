/*
  # Update skill videos table structure

  1. Changes
    - Add thumbnail_url column to skill_videos table for video previews
    - Add duration column to store video length
    - Add order_index for custom ordering of videos

  2. Security
    - Maintain existing RLS policies
    - Add policies for thumbnail storage
*/

-- Add new columns to skill_videos table
ALTER TABLE skill_videos 
ADD COLUMN IF NOT EXISTS thumbnail_url text,
ADD COLUMN IF NOT EXISTS duration integer,
ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;

-- Create thumbnails bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('video_thumbnails', 'video_thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Add storage policies for thumbnails
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