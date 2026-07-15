import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const NEWSAPI_KEY = Deno.env.get('NEWSAPI_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// query per region using /v2/everything (top-headlines?country= is empty on free tier)
const REGIONS: { code: string; label: string; query: string; language: string }[] = [
  { code: 'hk', label: '香港', query: '"Hong Kong"', language: 'en' },
  { code: 'tw', label: '台灣', query: 'Taiwan', language: 'en' },
  { code: 'cn', label: '中國大陸', query: 'China', language: 'en' },
  { code: 'us', label: '美國', query: '"United States" OR USA', language: 'en' },
  { code: 'gb', label: '英國', query: '"United Kingdom" OR Britain', language: 'en' },
  { code: 'jp', label: '日本', query: 'Japan', language: 'en' },
];

async function translateToChinese(texts: string[]): Promise<string[]> {
  if (!LOVABLE_API_KEY || texts.length === 0) return texts;
  try {
    const prompt = `將以下英文/日文新聞標題與描述翻譯成繁體中文，逐條輸出，保留編號格式，不要加解釋：\n\n${texts.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;
    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!resp.ok) return texts;
    const data = await resp.json();
    const content: string = data.choices?.[0]?.message?.content ?? '';
    const lines = content.split('\n').map((l) => l.replace(/^\s*\d+[\.\)、]\s*/, '').trim()).filter(Boolean);
    if (lines.length >= texts.length) return lines.slice(0, texts.length);
    return texts;
  } catch (e) {
    console.error('translate error', e);
    return texts;
  }
}

async function fetchRegion(region: { code: string; label: string; query: string; language: string }) {
  const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(region.query)}&language=${region.language}&from=${from}&sortBy=popularity&pageSize=10&apiKey=${NEWSAPI_KEY}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const body = await resp.text();
    console.error(`newsapi ${region.code} failed: ${resp.status} ${body}`);
    return { region: region.code, region_label: region.label, articles: [] };
  }
  const data = await resp.json();
  const articles = (data.articles || [])
    .filter((a: any) => a.publishedAt && new Date(a.publishedAt).getTime() >= Date.now() - 24 * 60 * 60 * 1000)
    .slice(0, 3);

  // translate title+description
  const toTranslate: string[] = [];
  articles.forEach((a: any) => {
    toTranslate.push(a.title || '');
    toTranslate.push(a.description || '');
  });
  const translated = await translateToChinese(toTranslate);
  const out = articles.map((a: any, i: number) => ({
    title: translated[i * 2] || a.title,
    description: translated[i * 2 + 1] || a.description,
    url: a.url,
    source: a.source?.name || '',
    publishedAt: a.publishedAt,
    urlToImage: a.urlToImage,
  }));
  return { region: region.code, region_label: region.label, articles: out };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const url = new URL(req.url);
    let body: any = {};
    if (req.method !== 'GET') {
      try { body = await req.json(); } catch {}
    }
    const force = url.searchParams.get('force') === '1' || body.force === 1 || body.force === true || body.force === '1';

    // Check cache freshness (skip if within 1 hour and not forced)
    if (!force) {
      const { data: cached } = await supabase
        .from('news_cache')
        .select('*')
        .order('fetched_at', { ascending: false });
      if (cached && cached.length >= REGIONS.length) {
        const newest = new Date(cached[0].fetched_at).getTime();
        if (Date.now() - newest < 60 * 60 * 1000) {
          return new Response(JSON.stringify({ regions: cached, cached: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    const results = await Promise.all(REGIONS.map(fetchRegion));

    // upsert cache
    for (const r of results) {
      await supabase.from('news_cache').upsert(
        { region: r.region, region_label: r.region_label, articles: r.articles, fetched_at: new Date().toISOString() },
        { onConflict: 'region' }
      );
    }

    return new Response(JSON.stringify({ regions: results, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('news-24 error', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
