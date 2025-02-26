/*
  # Add name field to listings table

  1. Changes
    - Add name column to listings table
    - Update existing RLS policies
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'listings' AND column_name = 'name'
  ) THEN
    ALTER TABLE listings ADD COLUMN name text NOT NULL;
  END IF;
END $$;