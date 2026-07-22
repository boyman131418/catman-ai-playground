
-- Helper: can current user view a category (by id)
CREATE OR REPLACE FUNCTION public.can_view_category(_category_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.email() = 'boyman131418@gmail.com'
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.category_permissions cp
        ON cp.membership_tier_id = p.membership_tier_id
      WHERE p.user_id = auth.uid()
        AND p.status = 'approved'
        AND cp.category_id = _category_id
        AND cp.can_view = true
    );
$$;

-- categories: restrict SELECT to permitted categories
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categories;
CREATE POLICY "Users can view permitted categories"
ON public.categories
FOR SELECT
TO authenticated
USING (public.can_view_category(id));

-- items: restrict SELECT via category permissions
DROP POLICY IF EXISTS "Authenticated users can view items" ON public.items;
CREATE POLICY "Users can view items in permitted categories"
ON public.items
FOR SELECT
TO authenticated
USING (public.can_view_category(category_id));

-- news_cache: restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view news cache" ON public.news_cache;
DROP POLICY IF EXISTS "Public can view news cache" ON public.news_cache;
DROP POLICY IF EXISTS "News cache is publicly readable" ON public.news_cache;
REVOKE SELECT ON public.news_cache FROM anon;
CREATE POLICY "Authenticated users can view news cache"
ON public.news_cache
FOR SELECT
TO authenticated
USING (true);
