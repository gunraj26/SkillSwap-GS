/*
  # Update listings table fields

  1. Changes
    - Rename skill_category to skillCategory to match frontend
    - Add default values for required fields
    - Ensure all necessary columns exist
*/

DO $$ 
BEGIN
  -- Rename skill_category to skillCategory if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'listings' AND column_name = 'skill_category'
  ) THEN
    ALTER TABLE listings RENAME COLUMN skill_category TO "skillCategory";
  END IF;

  -- Add skillCategory if neither column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'listings' AND (column_name = 'skill_category' OR column_name = 'skillCategory')
  ) THEN
    ALTER TABLE listings ADD COLUMN "skillCategory" text NOT NULL;
  END IF;
END $$;