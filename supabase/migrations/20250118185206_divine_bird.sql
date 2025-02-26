-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_successful_swap ON requests;
DROP FUNCTION IF EXISTS handle_successful_swap();

-- Recreate the function with explicit table references
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
  FROM requests r
  WHERE (r.sender_id = NEW.sender_id OR r.recipient_id = NEW.sender_id)
  AND r.status = 'accepted';
  
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

-- Recreate the trigger
CREATE TRIGGER on_successful_swap
  AFTER UPDATE OF status ON requests
  FOR EACH ROW
  WHEN (OLD.status != 'accepted' AND NEW.status = 'accepted')
  EXECUTE FUNCTION handle_successful_swap();