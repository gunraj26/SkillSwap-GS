-- Drop existing foreign key constraints
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

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view their own requests" ON requests;
DROP POLICY IF EXISTS "Users can create requests" ON requests;
DROP POLICY IF EXISTS "Recipients can update request status" ON requests;

CREATE POLICY "Users can view their own requests"
  ON requests
  FOR SELECT
  USING (auth.uid() IN (sender_id, recipient_id));

CREATE POLICY "Users can create requests"
  ON requests
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update request status"
  ON requests
  FOR UPDATE
  USING (auth.uid() = recipient_id);

-- Ensure all profiles exist for existing requests
INSERT INTO profiles (id)
SELECT DISTINCT sender_id FROM requests
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE id = requests.sender_id
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id)
SELECT DISTINCT recipient_id FROM requests
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE id = requests.recipient_id
)
ON CONFLICT (id) DO NOTHING;