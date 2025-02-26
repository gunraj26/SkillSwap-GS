-- Fix ambiguous column references and relationships

-- First, ensure we have the correct indexes
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at);

-- Add explicit alias to the profiles reference in listings
COMMENT ON TABLE listings IS 'Listings table with explicit profile reference as listing_owner';

-- Create a view to handle the complex joins cleanly
CREATE OR REPLACE VIEW request_details AS
SELECT 
  r.id,
  r.created_at,
  r.status,
  r.swap_conditions,
  r.sender_id,
  r.recipient_id,
  r.listing_id,
  r.sender_name,
  l.title AS listing_title,
  l."skillCategory" AS listing_skill_category,
  l.type AS listing_type,
  l.description AS listing_description,
  l.user_id AS listing_owner_id,
  l.name AS listing_owner_name,
  p.name AS listing_owner_profile_name,
  p.avatar_url AS listing_owner_avatar_url
FROM requests r
INNER JOIN listings l ON r.listing_id = l.id
LEFT JOIN profiles p ON l.user_id = p.id
WHERE (
  auth.uid() = r.sender_id OR 
  auth.uid() = r.recipient_id
);

-- Add helper function for request validation
CREATE OR REPLACE FUNCTION validate_request_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'accepted', 'rejected') THEN
    RAISE EXCEPTION 'Invalid request status. Must be pending, accepted, or rejected.';
  END IF;
  
  IF OLD.status = 'accepted' OR OLD.status = 'rejected' THEN
    RAISE EXCEPTION 'Cannot modify a request that has already been processed.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for request validation
DROP TRIGGER IF EXISTS validate_request_status_trigger ON requests;
CREATE TRIGGER validate_request_status_trigger
  BEFORE UPDATE OF status ON requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_request_status();