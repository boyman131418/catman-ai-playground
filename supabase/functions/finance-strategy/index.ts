import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

async function yahooScreener(scrId: string, count = 25) {
  const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=${scrId}&count=${count}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } });
  if (!res.ok) return [];
  const json = await res.json();
  const quotes = json?.finance?.result?.[0]?.quotes ?? [];
  return quotes.map((q: any) => ({
    symbol: q.symbol,
    name: q.shortName || q.longName || q.symbol,
    price: q.regularMarketPrice,
    change: q.regularMarketChange,
    changePercent: q.regularMarketChangePercent,
    volume: q.regularMarketVolume,
    marketCap: q.marketCap,
    dayHigh: q.regularMarketDayHigh,
    dayLow: q.regularMarketDayLow,
    prevClose: q.regularMarketPreviousClose,
    currency: q.currency,
    exchange: q.fullExchangeName,
  }));
}

async function coinGecko() {
  const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=25&price_change_percentage=24h';
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) return [];
  const arr = await res.json();
  return arr.map((c: any) => ({
    symbol: c.symbol?.toUpperCase(),
    name: c.name,
    image: c.image,
    price: c.current_price,
    change: c.price_change_24h,
    changePercent: c.price_change_percentage_24h,
    marketCap: c.market_cap,
    volume: c.total_volume,
    rank: c.market_cap_rank,
    high24h: c.high_24h,
    low24h: c.low_24h,
  }));
}

async function yahooIndices() {
  const symbols = ['^GSPC', '^IXIC', '^DJI', 'BTC-USD', '^VIX', '^HSI', '^N225', '000001.SS', '^FTSE', '^GDAXI'];
  const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${symbols.join(',')}&range=1d&interval=5m`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } });
  const names: Record<string, string> = {
    '^GSPC': 'S&P 500', '^IXIC': 'NASDAQ', '^DJI': 'Dow Jones', 'BTC-USD': 'BTC 比特幣',
    '^VIX': 'VIX 恐慌指數', '^HSI': '恒生指數', '^N225': '日經 225',
    '000001.SS': '上證指數', '^FTSE': '英國 FTSE 100', '^GDAXI': '德國 DAX',
  };
  if (!res.ok) return symbols.map((s) => ({ symbol: s, name: names[s] }));
  const json = await res.json();
  return symbols.map((s) => {
    const r = json?.spark?.result?.find((x: any) => x.symbol === s);
    const meta = r?.response?.[0]?.meta;
    const price = meta?.regularMarketPrice;
    const prev = meta?.chartPreviousClose ?? meta?.previousClose;
    const change = price != null && prev != null ? price - prev : null;
    const pct = change != null && prev ? (change / prev) * 100 : null;
    return {
      symbol: s,
      name: names[s] || s,
      price,
      change,
      changePercent: pct,
      currency: meta?.currency,
    };
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const [indices, gainers, losers, actives, crypto] = await Promise.all([
      yahooIndices(),
      yahooScreener('day_gainers', 25),
      yahooScreener('day_losers', 25),
      yahooScreener('most_actives', 25),
      coinGecko(),
    ]);
    const payload = {
      updatedAt: new Date().toISOString(),
      indices, gainers, losers, actives, crypto,
    };
    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
