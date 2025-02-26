/*
  # Chat System Implementation Update

  1. Changes
    - Add chat_rooms table if it doesn't exist
    - Add new trigger for updating chat room timestamps
    - Update existing messages table with new foreign key
    - Add new RLS policies for both tables

  2. Security
    - Enable RLS on both tables
    - Add policies for chat room access and message creation
*/

-- Create chat_rooms table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'chat_rooms') THEN
    CREATE TABLE chat_rooms (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      participant1_id uuid REFERENCES auth.users NOT NULL,
      participant2_id uuid REFERENCES auth.users NOT NULL,
      request_id uuid REFERENCES requests NOT NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Enable RLS on chat_rooms
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

-- Add chat rooms policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_rooms' AND policyname = 'Users can view their chat rooms'
  ) THEN
    CREATE POLICY "Users can view their chat rooms"
      ON chat_rooms
      FOR SELECT
      USING (auth.uid() IN (participant1_id, participant2_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_rooms' AND policyname = 'Users can create chat rooms if they''re participants'
  ) THEN
    CREATE POLICY "Users can create chat rooms if they're participants"
      ON chat_rooms
      FOR INSERT
      WITH CHECK (auth.uid() IN (participant1_id, participant2_id));
  END IF;
END $$;

-- Update messages table to reference chat_rooms if needed
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'chat_room_id'
  ) THEN
    ALTER TABLE messages 
    ADD COLUMN chat_room_id uuid REFERENCES chat_rooms;
  END IF;
END $$;

-- Add messages policies if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'messages' AND policyname = 'Users can view messages in their chat rooms'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'messages' AND policyname = 'Users can send messages in their chat rooms'
  ) THEN
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
  END IF;
END $$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_chat_room_timestamp ON messages;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_chat_room_timestamp();

-- Create function for updating chat room timestamp
CREATE OR REPLACE FUNCTION update_chat_room_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_rooms
  SET updated_at = now()
  WHERE id = NEW.chat_room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating chat room timestamp
CREATE TRIGGER update_chat_room_timestamp
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_chat_room_timestamp();