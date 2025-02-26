/*
  # Add achievements system

  1. New Tables
    - `achievements`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, references profiles)
      - `type` (text) - Type of achievement (e.g., 'first_swap', 'five_swaps', etc.)
      - `title` (text) - Display title
      - `description` (text) - Achievement description
      - `icon` (text) - Icon identifier
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on achievements table
    - Add policies for viewing and creating achievements
  
  3. Functions
    - Add function to award achievements
    - Add function to handle successful swaps
    - Add trigger for successful swaps
*/

-- Safely create achievements table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'achievements') THEN
    CREATE TABLE achievements (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
      type text NOT NULL,
      title text NOT NULL,
      description text NOT NULL,
      icon text NOT NULL,
      created_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Enable RLS
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- Safely create policies
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Achievements are viewable by everyone" ON achievements;
  DROP POLICY IF EXISTS "System can create achievements" ON achievements;

  -- Create new policies
  CREATE POLICY "Achievements are viewable by everyone"
    ON achievements
    FOR SELECT
    USING (true);

  CREATE POLICY "System can create achievements"
    ON achievements
    FOR INSERT
    WITH CHECK (true);
END $$;

-- Safely create or replace award achievement function
CREATE OR REPLACE FUNCTION award_achievement(
  profile_id uuid,
  achievement_type text,
  achievement_title text,
  achievement_description text,
  achievement_icon text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_achievement_id uuid;
BEGIN
  -- Check if achievement already exists
  IF NOT EXISTS (
    SELECT 1 FROM achievements 
    WHERE profile_id = award_achievement.profile_id 
    AND type = award_achievement.achievement_type
  ) THEN
    -- Insert new achievement
    INSERT INTO achievements (
      profile_id,
      type,
      title,
      description,
      icon
    ) VALUES (
      award_achievement.profile_id,
      award_achievement.achievement_type,
      award_achievement.achievement_title,
      award_achievement.achievement_description,
      award_achievement.achievement_icon
    )
    RETURNING id INTO new_achievement_id;
    
    RETURN new_achievement_id;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Safely create or replace swap handler function
CREATE OR REPLACE FUNCTION handle_successful_swap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  swap_count integer;
BEGIN
  -- Count total successful swaps for the user
  SELECT COUNT(*) 
  INTO swap_count
  FROM requests
  WHERE (sender_id = NEW.sender_id OR recipient_id = NEW.sender_id)
  AND status = 'accepted';
  
  -- First swap achievement
  IF swap_count = 1 THEN
    PERFORM award_achievement(
      NEW.sender_id,
      'first_swap',
      'First Swap!',
      'Completed your first skill swap',
      '🎯'
    );
  END IF;
  
  -- Five swaps achievement
  IF swap_count = 5 THEN
    PERFORM award_achievement(
      NEW.sender_id,
      'five_swaps',
      'High Five!',
      'Completed 5 skill swaps',
      '🖐️'
    );
  END IF;
  
  -- Ten swaps achievement
  IF swap_count = 10 THEN
    PERFORM award_achievement(
      NEW.sender_id,
      'ten_swaps',
      'Perfect Ten!',
      'Completed 10 skill swaps',
      '🏆'
    );
  END IF;
  
  -- Twenty swaps achievement
  IF swap_count = 20 THEN
    PERFORM award_achievement(
      NEW.sender_id,
      'twenty_swaps',
      'Skill Master!',
      'Completed 20 skill swaps',
      '👑'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Safely create trigger
DO $$ 
BEGIN
  -- Drop existing trigger if it exists
  DROP TRIGGER IF EXISTS on_successful_swap ON requests;
  
  -- Create new trigger
  CREATE TRIGGER on_successful_swap
    AFTER UPDATE OF status ON requests
    FOR EACH ROW
    WHEN (OLD.status != 'accepted' AND NEW.status = 'accepted')
    EXECUTE FUNCTION handle_successful_swap();
END $$;