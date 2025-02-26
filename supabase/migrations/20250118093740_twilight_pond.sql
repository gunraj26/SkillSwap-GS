/*
  # Add location field to listings table

  1. Changes
    - Add location column to listings table
    - Make it nullable initially to not break existing records
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'listings' AND column_name = 'location'
  ) THEN
    ALTER TABLE listings ADD COLUMN location text;
  END IF;
END $$;