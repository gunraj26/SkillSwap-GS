/*
  # Fix messages table schema

  1. Changes
    - Drop old messages table
    - Recreate messages table with correct schema
    - Re-add RLS policies
*/

-- Drop existing messages table and recreate with correct schema
DROP TABLE IF EXISTS messages;

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_room_id uuid REFERENCES chat_rooms NOT NULL,
  sender_id uuid REFERENCES auth.users NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Messages policies
CREATE POLICY "Users can view messages in their chat rooms"
  ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_rooms
      WHERE id = messages.chat_room_id
      AND auth.uid() IN (participant1_id, participant2_id)
    )
  );

CREATE POLICY "Users can send messages in their chat rooms"
  ON messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM chat_rooms
      WHERE id = chat_room_id
      AND auth.uid() IN (participant1_id, participant2_id)
    )
  );

-- Function to update chat room updated_at
CREATE OR REPLACE FUNCTION update_chat_room_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_rooms
  SET updated_at = now()
  WHERE id = NEW.chat_room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update chat room timestamp on new message
CREATE TRIGGER update_chat_room_timestamp
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_chat_room_timestamp();