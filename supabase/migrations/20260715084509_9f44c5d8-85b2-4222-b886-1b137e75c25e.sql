CREATE TABLE IF NOT EXISTS public.news_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text NOT NULL,
  region_label text NOT NULL,
  articles jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(region)
);

GRANT SELECT ON public.news_cache TO anon;
GRANT SELECT ON public.news_cache TO authenticated;
GRANT ALL ON public.news_cache TO service_role;

ALTER TABLE public.news_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read news" ON public.news_cache FOR SELECT TO anon, authenticated USING (true);

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;