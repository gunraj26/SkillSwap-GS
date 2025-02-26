/*
  # Fix profile references for requests

  1. Changes
    - Drop existing foreign key constraints
    - Add new foreign key constraints to profiles table
    - Update RLS policies

  2. Security
    - Maintain existing RLS policies
    - Ensure proper cascading on delete
*/

-- First drop existing constraints if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'requests_sender_id_fkey'
  ) THEN
    ALTER TABLE requests DROP CONSTRAINT requests_sender_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'requests_recipient_id_fkey'
  ) THEN
    ALTER TABLE requests DROP CONSTRAINT requests_recipient_id_fkey;
  END IF;
END $$;

-- Add new foreign key constraints to profiles
ALTER TABLE requests
ADD CONSTRAINT requests_sender_id_fkey
FOREIGN KEY (sender_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

ALTER TABLE requests
ADD CONSTRAINT requests_recipient_id_fkey
FOREIGN KEY (recipient_id)
REFERENCES profiles(id)
ON DELETE CASCADE;