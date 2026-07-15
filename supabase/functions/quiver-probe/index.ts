import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const API_KEY = Deno.env.get('QUIVERQUANT_API_KEY');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const url = new URL(req.url);
  const path = url.searchParams.get('path') || '/live/congresstrading';
  const res = await fetch(`https://api.quiverquant.com/beta${path}`, {
    headers: { 'Authorization': `Token ${API_KEY}`, 'Accept': 'application/json' },
  });
  const text = await res.text();
  return new Response(JSON.stringify({ status: res.status, size: text.length, preview: text.slice(0, 400) }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
