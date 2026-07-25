CREATE OR REPLACE FUNCTION public.link_current_user_profile()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  linked_profile_id uuid;
BEGIN
  IF auth.uid() IS NULL OR auth.email() IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.profiles
     SET user_id = auth.uid()
   WHERE lower(email) = lower(auth.email())
     AND (user_id IS NULL OR user_id = auth.uid())
  RETURNING id INTO linked_profile_id;

  RETURN linked_profile_id;
END;
$$;

REVOKE ALL ON FUNCTION public.link_current_user_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_current_user_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.set_profile_user_id_from_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.user_id IS NULL AND NEW.email IS NOT NULL THEN
    SELECT u.id
      INTO NEW.user_id
      FROM auth.users u
     WHERE lower(u.email) = lower(NEW.email)
     ORDER BY u.created_at DESC
     LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_user_id_from_email ON public.profiles;
CREATE TRIGGER profiles_set_user_id_from_email
BEFORE INSERT OR UPDATE OF email, status, membership_tier_id ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_profile_user_id_from_email();