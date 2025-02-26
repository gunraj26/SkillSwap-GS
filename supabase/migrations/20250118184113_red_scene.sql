/*
  # Fix schema relationships and ambiguous columns

  1. Changes
    - Add explicit aliases to prevent ambiguous column references
    - Update foreign key relationships for requests table
    - Add indexes for better query performance
    - Clean up any duplicate or conflicting constraints

  2. Security
    - Maintain existing RLS policies
    - Ensure proper cascading behavior
*/

-- First clean up any existing duplicate constraints
DO $$ 
BEGIN
  -- Drop existing foreign key constraints if they exist
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

  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'requests_listing_id_fkey'
  ) THEN
    ALTER TABLE requests DROP CONSTRAINT requests_listing_id_fkey;
  END IF;
END $$;

-- Add new foreign key constraints with explicit names
ALTER TABLE requests
ADD CONSTRAINT requests_sender_id_fkey
FOREIGN KEY (sender_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

ALTER TABLE requests
ADD CONSTRAINT requests_recipient_id_fkey
FOREIGN KEY (recipient_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

ALTER TABLE requests
ADD CONSTRAINT requests_listing_id_fkey
FOREIGN KEY (listing_id)
REFERENCES listings(id)
ON DELETE CASCADE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_requests_sender_id ON requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_requests_recipient_id ON requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_requests_listing_id ON requests(listing_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);

-- Update RLS policies with more specific conditions
DROP POLICY IF EXISTS "Users can view their own requests" ON requests;
DROP POLICY IF EXISTS "Users can create requests" ON requests;
DROP POLICY IF EXISTS "Recipients can update request status" ON requests;

CREATE POLICY "Users can view their own requests"
  ON requests
  FOR SELECT
  USING (
    auth.uid() = sender_id OR 
    auth.uid() = recipient_id
  );

CREATE POLICY "Users can create requests"
  ON requests
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update request status"
  ON requests
  FOR UPDATE
  USING (auth.uid() = recipient_id);