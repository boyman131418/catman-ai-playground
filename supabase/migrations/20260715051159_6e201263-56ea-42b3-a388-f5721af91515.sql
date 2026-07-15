
-- Restrict public/anon read access to authenticated users only
DROP POLICY IF EXISTS "Everyone can view active announcements" ON public.announcements;
CREATE POLICY "Authenticated users can view active announcements"
  ON public.announcements FOR SELECT TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Everyone can view categories" ON public.categories;
CREATE POLICY "Authenticated users can view categories"
  ON public.categories FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Everyone can view items" ON public.items;
CREATE POLICY "Authenticated users can view items"
  ON public.items FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Everyone can view membership tiers" ON public.membership_tiers;
CREATE POLICY "Authenticated users can view membership tiers"
  ON public.membership_tiers FOR SELECT TO authenticated
  USING (true);

-- Remove anon grants (only authenticated should read these tables)
REVOKE SELECT ON public.announcements FROM anon;
REVOKE SELECT ON public.categories FROM anon;
REVOKE SELECT ON public.items FROM anon;
REVOKE SELECT ON public.membership_tiers FROM anon;

-- Scope category_permissions to the caller's own tier
DROP POLICY IF EXISTS "Authenticated users can view category permissions" ON public.category_permissions;
CREATE POLICY "Users can view their own tier permissions"
  ON public.category_permissions FOR SELECT TO authenticated
  USING (
    membership_tier_id IN (
      SELECT membership_tier_id FROM public.profiles
      WHERE user_id = auth.uid() AND status = 'approved'
    )
    OR auth.email() = 'boyman131418@gmail.com'
  );

-- Lock down SECURITY DEFINER functions: revoke public/anon EXECUTE
REVOKE ALL ON FUNCTION public.check_user_permission(text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.verify_category_password(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.link_user_profiles() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Grant only what the app legitimately needs
GRANT EXECUTE ON FUNCTION public.check_user_permission(text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_category_password(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.link_user_profiles() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;
