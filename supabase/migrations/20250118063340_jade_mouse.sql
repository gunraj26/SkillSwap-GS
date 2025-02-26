/*
  # Create profiles for existing users

  1. Insert profiles for existing users
    - Add profiles for any auth.users that don't have one
    - Ensure no duplicate profiles are created

  2. Update RLS policies
    - Allow users to insert their own profile if it doesn't exist
*/

-- Create profiles for existing users
INSERT INTO public.profiles (id)
SELECT id FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE profiles.id = auth.users.id
)
ON CONFLICT (id) DO NOTHING;

-- Add insert policy for profiles
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
  
  CREATE POLICY "Users can insert own profile"
    ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);
END $$;