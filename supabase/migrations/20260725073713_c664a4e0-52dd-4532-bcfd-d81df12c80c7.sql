REVOKE ALL ON FUNCTION public.link_current_user_profile() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_current_user_profile() TO authenticated;

REVOKE ALL ON FUNCTION public.set_profile_user_id_from_email() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_profile_user_id_from_email() TO service_role;