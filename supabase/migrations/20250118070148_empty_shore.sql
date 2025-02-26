/*
  # Add captions to skill_media table

  1. Changes
    - Add caption column to skill_media table
    - Make description column nullable since we'll use captions instead

  2. Security
    - Maintain existing RLS policies
*/

-- Add caption column and make description nullable
ALTER TABLE skill_media 
ADD COLUMN IF NOT EXISTS caption text,
ALTER COLUMN description DROP NOT NULL;