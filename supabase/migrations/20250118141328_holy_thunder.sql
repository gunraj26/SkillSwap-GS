/*
  # Add teachable skills to profiles

  1. Changes
    - Add `teachable_skills` column to profiles table
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'teachable_skills'
  ) THEN
    ALTER TABLE profiles ADD COLUMN teachable_skills text;
  END IF;
END $$;