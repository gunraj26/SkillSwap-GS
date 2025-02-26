/*
  # Add photo_url column to skill_media table

  1. Changes
    - Add photo_url column to skill_media table
    - Make video_url nullable since it's not required for photos
    - Update video_url constraint to allow null for photos

  2. Security
    - Maintain existing RLS policies
*/

-- Make video_url nullable and add photo_url column
ALTER TABLE skill_media 
ALTER COLUMN video_url DROP NOT NULL,
ADD COLUMN IF NOT EXISTS photo_url text;

-- Add check constraint to ensure either video_url or photo_url is present
ALTER TABLE skill_media
ADD CONSTRAINT media_url_check 
CHECK (
  (media_type = 'video' AND video_url IS NOT NULL AND photo_url IS NULL) OR
  (media_type = 'photo' AND photo_url IS NOT NULL AND video_url IS NULL)
);