-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_successful_swap ON requests;
DROP FUNCTION IF EXISTS handle_successful_swap();

-- Recreate the function with explicit table references and aliases
CREATE OR REPLACE FUNCTION handle_successful_swap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  swap_count integer;
  achievement_id uuid;
BEGIN
  -- Count total successful swaps for the user with explicit table alias
  SELECT COUNT(*) 
  INTO swap_count
  FROM requests r
  WHERE (r.sender_id = NEW.sender_id OR r.recipient_id = NEW.sender_id)
  AND r.status = 'accepted';
  
  -- First swap achievement
  IF swap_count = 1 THEN
    SELECT award_achievement(
      NEW.sender_id,
      'first_swap',
      'First Swap!',
      'Completed your first skill swap',
      '🎯'
    ) INTO achievement_id;
  END IF;
  
  -- Five swaps achievement
  IF swap_count = 5 THEN
    SELECT award_achievement(
      NEW.sender_id,
      'five_swaps',
      'High Five!',
      'Completed 5 skill swaps',
      '🖐️'
    ) INTO achievement_id;
  END IF;
  
  -- Ten swaps achievement
  IF swap_count = 10 THEN
    SELECT award_achievement(
      NEW.sender_id,
      'ten_swaps',
      'Perfect Ten!',
      'Completed 10 skill swaps',
      '🏆'
    ) INTO achievement_id;
  END IF;
  
  -- Twenty swaps achievement
  IF swap_count = 20 THEN
    SELECT award_achievement(
      NEW.sender_id,
      'twenty_swaps',
      'Skill Master!',
      'Completed 20 skill swaps',
      '👑'
    ) INTO achievement_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_successful_swap
  AFTER UPDATE OF status ON requests
  FOR EACH ROW
  WHEN (OLD.status != 'accepted' AND NEW.status = 'accepted')
  EXECUTE FUNCTION handle_successful_swap();

-- Drop and recreate award_achievement function with explicit table references
DROP FUNCTION IF EXISTS award_achievement(uuid, text, text, text, text);

CREATE OR REPLACE FUNCTION award_achievement(
  p_profile_id uuid,
  p_achievement_type text,
  p_achievement_title text,
  p_achievement_description text,
  p_achievement_icon text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_achievement_id uuid;
BEGIN
  -- Check if achievement already exists with explicit table alias
  IF NOT EXISTS (
    SELECT 1 FROM achievements a
    WHERE a.profile_id = p_profile_id 
    AND a.type = p_achievement_type
  ) THEN
    -- Insert new achievement
    INSERT INTO achievements (
      profile_id,
      type,
      title,
      description,
      icon
    ) VALUES (
      p_profile_id,
      p_achievement_type,
      p_achievement_title,
      p_achievement_description,
      p_achievement_icon
    )
    RETURNING id INTO new_achievement_id;
    
    RETURN new_achievement_id;
  END IF;
  
  RETURN NULL;
END;
$$;