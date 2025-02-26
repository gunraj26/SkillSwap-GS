-- Drop existing trigger and function first
DROP TRIGGER IF EXISTS validate_request_status_trigger ON requests;
DROP FUNCTION IF EXISTS validate_request_status();

-- Create improved request validation function
CREATE OR REPLACE FUNCTION validate_request_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Only allow transitions from pending to accepted/rejected
  IF OLD.status != 'pending' THEN
    RAISE EXCEPTION 'Cannot modify a request that has already been processed';
  END IF;

  -- Validate status values
  IF NEW.status NOT IN ('pending', 'accepted', 'rejected') THEN
    RAISE EXCEPTION 'Invalid request status. Must be pending, accepted, or rejected';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for request validation
CREATE TRIGGER validate_request_status_trigger
  BEFORE UPDATE OF status ON requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_request_status();

-- Drop existing view if it exists
DROP VIEW IF EXISTS request_details;

-- Create a view for request details to avoid ambiguous joins
CREATE VIEW request_details AS
SELECT 
  r.id,
  r.created_at,
  r.listing_id,
  r.sender_id,
  r.recipient_id,
  r.sender_name,
  r.swap_conditions,
  r.status,
  sp.id as sender_profile_id,
  sp.name as sender_profile_name,
  sp.avatar_url as sender_profile_avatar,
  rp.id as recipient_profile_id,
  rp.name as recipient_profile_name,
  rp.avatar_url as recipient_profile_avatar,
  l.title as listing_title,
  l."skillCategory" as listing_skill_category,
  l.type as listing_type,
  l.description as listing_description,
  l.user_id as listing_owner_id,
  lp.name as listing_owner_name,
  lp.avatar_url as listing_owner_avatar
FROM requests r
LEFT JOIN profiles sp ON r.sender_id = sp.id
LEFT JOIN profiles rp ON r.recipient_id = rp.id
LEFT JOIN listings l ON r.listing_id = l.id
LEFT JOIN profiles lp ON l.user_id = lp.id;