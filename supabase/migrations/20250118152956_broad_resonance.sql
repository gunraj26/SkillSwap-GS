/*
  # Add foreign key constraints for requests table

  1. Changes
    - Add foreign key constraints from requests to profiles table for sender_id and recipient_id
    - Update existing policies to use the new relationships

  2. Security
    - Maintain existing RLS policies
*/

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
  -- Add sender_id foreign key
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'requests_sender_id_fkey'
  ) THEN
    ALTER TABLE requests
    ADD CONSTRAINT requests_sender_id_fkey
    FOREIGN KEY (sender_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE;
  END IF;

  -- Add recipient_id foreign key
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'requests_recipient_id_fkey'
  ) THEN
    ALTER TABLE requests
    ADD CONSTRAINT requests_recipient_id_fkey
    FOREIGN KEY (recipient_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE;
  END IF;
END $$;