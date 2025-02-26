/*
  # Create requests table for skill swap requests

  1. New Tables
    - `requests`
      - `id` (uuid, primary key)
      - `listing_id` (uuid, references listings)
      - `sender_id` (uuid, references auth.users)
      - `recipient_id` (uuid, references auth.users)
      - `sender_name` (text)
      - `swap_conditions` (text)
      - `status` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for creating and viewing requests
*/

CREATE TABLE requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings NOT NULL,
  sender_id uuid REFERENCES auth.users NOT NULL,
  recipient_id uuid REFERENCES auth.users NOT NULL,
  sender_name text NOT NULL,
  swap_conditions text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Allow users to create requests
CREATE POLICY "Users can create requests"
  ON requests
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Allow users to view requests they're involved in
CREATE POLICY "Users can view their own requests"
  ON requests
  FOR SELECT
  USING (auth.uid() IN (sender_id, recipient_id));

-- Allow recipients to update request status
CREATE POLICY "Recipients can update request status"
  ON requests
  FOR UPDATE
  USING (auth.uid() = recipient_id);