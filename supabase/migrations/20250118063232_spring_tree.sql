/*
  # Add skill videos support

  1. New Tables
    - `skill_videos`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, references profiles)
      - `title` (text)
      - `description` (text)
      - `video_url` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Storage
    - Create skill_videos bucket for storing video files

  3. Security
    - Enable RLS on skill_videos table
    - Add policies for video access and management
*/

-- Create skill_videos table
CREATE TABLE IF NOT EXISTS skill_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE skill_videos ENABLE ROW LEVEL SECURITY;

-- Create skill_videos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('skill_videos', 'skill_videos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for skill_videos table
CREATE POLICY "Users can view all skill videos"
  ON skill_videos
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own skill videos"
  ON skill_videos
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own skill videos"
  ON skill_videos
  FOR UPDATE
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own skill videos"
  ON skill_videos
  FOR DELETE
  USING (auth.uid() = profile_id);

-- Storage bucket policies
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