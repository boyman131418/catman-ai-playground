-- Create a function to link auth users with their profiles based on email
CREATE OR REPLACE FUNCTION public.link_user_profiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update profiles table with auth user IDs where email matches
  UPDATE public.profiles 
  SET user_id = auth.users.id
  FROM auth.users 
  WHERE profiles.email = auth.users.email 
    AND profiles.user_id IS NULL 
    AND profiles.status = 'approved';
END;
$$;

-- Execute the function to link existing users
SELECT public.link_user_profiles();