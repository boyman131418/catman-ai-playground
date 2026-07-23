
-- Backfill profiles.user_id from auth.users by matching email
UPDATE public.profiles p
SET user_id = u.id
FROM auth.users u
WHERE p.user_id IS NULL AND lower(p.email) = lower(u.email);

-- Trigger: when a new auth user signs up, link any existing profile row by email
CREATE OR REPLACE FUNCTION public.link_profile_on_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
     SET user_id = NEW.id
   WHERE user_id IS NULL
     AND lower(email) = lower(NEW.email);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_link_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_link_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.link_profile_on_auth_user();

DROP TRIGGER IF EXISTS on_auth_user_email_updated_link_profile ON auth.users;
CREATE TRIGGER on_auth_user_email_updated_link_profile
AFTER UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.link_profile_on_auth_user();
