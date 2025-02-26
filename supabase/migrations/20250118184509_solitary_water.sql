-- Add missing request_id column to chat_rooms if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_rooms' AND column_name = 'request_id'
  ) THEN
    ALTER TABLE chat_rooms ADD COLUMN request_id uuid REFERENCES requests(id);
  END IF;
END $$;

-- Ensure chat_rooms has correct foreign key constraints
ALTER TABLE chat_rooms
DROP CONSTRAINT IF EXISTS chat_rooms_participant1_id_fkey,
DROP CONSTRAINT IF EXISTS chat_rooms_participant2_id_fkey;

ALTER TABLE chat_rooms
ADD CONSTRAINT chat_rooms_participant1_id_fkey
  FOREIGN KEY (participant1_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE,
ADD CONSTRAINT chat_rooms_participant2_id_fkey
  FOREIGN KEY (participant2_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_rooms_participants 
  ON chat_rooms(participant1_id, participant2_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_request_id 
  ON chat_rooms(request_id);

-- Update chat_rooms RLS policies
DROP POLICY IF EXISTS "Users can view their chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can create chat rooms if they're participants" ON chat_rooms;

CREATE POLICY "Users can view their chat rooms"
  ON chat_rooms
  FOR SELECT
  USING (auth.uid() IN (participant1_id, participant2_id));

CREATE POLICY "Users can create chat rooms if they're participants"
  ON chat_rooms
  FOR INSERT
  WITH CHECK (auth.uid() IN (participant1_id, participant2_id));