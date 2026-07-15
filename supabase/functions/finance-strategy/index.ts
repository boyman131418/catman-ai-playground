import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const API_KEY = Deno.env.get('QUIVERQUANT_API_KEY');
const BASE = 'https://api.quiverquant.com/beta';

async function fetchQuiver(path: string) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Token ${API_KEY}`,
      },
    });
    if (!res.ok) {
      console.error(`Quiver ${path} failed: ${res.status}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error(`Quiver ${path} error:`, e);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const [
      congress,
      senator,
      house,
      wsb,
      contracts,
      lobbying,
      insiders,
      offexchange,
    ] = await Promise.all([
      fetchQuiver('/live/congresstrading'),
      fetchQuiver('/live/senatetrading'),
      fetchQuiver('/live/housetrading'),
      fetchQuiver('/live/wallstreetbets'),
      fetchQuiver('/live/govcontractsall'),
      fetchQuiver('/live/lobbying'),
      fetchQuiver('/live/insiders'),
      fetchQuiver('/live/offexchange'),
    ]);

    const payload = {
      updatedAt: new Date().toISOString(),
      congress: congress.slice(0, 25),
      senator: senator.slice(0, 25),
      house: house.slice(0, 25),
      wsb: wsb.slice(0, 25),
      contracts: contracts.slice(0, 25),
      lobbying: lobbying.slice(0, 25),
      insiders: insiders.slice(0, 25),
      offexchange: offexchange.slice(0, 25),
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('finance-strategy error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
