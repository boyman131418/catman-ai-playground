import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const API_KEY = Deno.env.get('QUIVERQUANT_API_KEY');
const BASE = 'https://api.quiverquant.com/beta';

interface Result {
  data: any[];
  locked: boolean;
  error?: string;
}

async function fetchQuiver(path: string): Promise<Result> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Token ${API_KEY}`,
      },
    });
    if (res.status === 403) {
      return { data: [], locked: true };
    }
    if (!res.ok) {
      return { data: [], locked: false, error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    return { data: Array.isArray(data) ? data : [], locked: false };
  } catch (e) {
    return { data: [], locked: false, error: String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const endpoints: [string, string][] = [
      ['congress', '/live/congresstrading'],
      ['senator', '/live/senatetrading'],
      ['house', '/live/housetrading'],
      ['wsb', '/live/wallstreetbets'],
      ['contracts', '/live/govcontractsall'],
      ['lobbying', '/live/lobbying'],
      ['insiders', '/live/insiders'],
      ['offexchange', '/live/offexchange'],
    ];

    const results = await Promise.all(endpoints.map(([_, p]) => fetchQuiver(p)));
    const payload: Record<string, any> = {
      updatedAt: new Date().toISOString(),
      locked: {},
    };
    endpoints.forEach(([key], i) => {
      payload[key] = results[i].data.slice(0, 30);
      payload.locked[key] = results[i].locked;
    });

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
