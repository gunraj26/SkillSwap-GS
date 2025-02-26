/*
  # Update Profile Relationship and Policies

  1. Changes
    - Safely handle existing foreign key constraint
    - Update profile viewing policies
  
  2. Security
    - Update RLS policies for profile viewing
*/

-- Safely handle the foreign key constraint
DO $$ 
BEGIN
  -- Drop the existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'listings_user_id_fkey'
    AND table_name = 'listings'
  ) THEN
    ALTER TABLE listings
    DROP CONSTRAINT listings_user_id_fkey;
  END IF;

  -- Add the constraint back with the correct reference
  ALTER TABLE listings
  ADD CONSTRAINT listings_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE;
END $$;

-- Update profiles policy to allow public viewing
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles
  FOR SELECT
  USING (true);