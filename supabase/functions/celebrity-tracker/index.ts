import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// Fresh, actively maintained mirror (updated daily)
const DATA_URL = "https://raw.githubusercontent.com/TattooedHead/house-stock-watcher-data/main/data/all_transactions.json";

// Chinese-background ADRs / HK-listed exclusion set
const CHINA_TICKERS = new Set([
  "BABA","JD","PDD","BIDU","NIO","XPEV","LI","TME","BILI","IQ","HTHT","YMM","TAL","EDU","NTES",
  "TCEHY","TCOM","VIPS","YY","WB","SINA","ZTO","BEKE","LU","FUTU","TIGR","DIDI","QFIN","HUYA",
  "DOYU","MOMO","JOBS","GSX","ATHM","CAAS","CANG","CBAT","CCCC","CEA","CHA","CHL","CHU","CJJD",
  "CMCM","CNET","CNTG","CO","CREG","CSCW","CYD","DADA","DDL","DL","DOGZ","DQ","EH","EM",
  "EZGO","FANH","FENG","FFHL","FINV","FTFT","GDS","GHG","GOTU","GRVY","GSMG","HCM","HGSH",
  "HHT","HKIT","HLG","HNP","HOLI","HTGM","HUIZ","IMAB","JFIN","JG","JKS","JP","JRJC",
  "JZ","KC","KE","KNDI","KUKE","LEJU","LFC","LITB","LIZI","LX","MOGU","MOHR","NIU","NOAH",
  "NPD","OCFT","PLIN","PT","PUXG","QD","QH","QK","QTT","RENN","RETO","RLX","SFUN","SGOC","SHI",
  "SINO","SNP","SOGO","SOHU","SORL","SVA","SXTC","SY","TANH","TBLT","TEDU","TIRX","TKAT","TOUR",
  "TZOO","UTSI","UXIN","VNET","WAFU","WEI","XIN","XNET","XYF","YGMZ","YI","YQ","YRD","YSG",
  "ZKIN","ZLAB"
]);

const isChinaTicker = (t: string) => {
  if (!t) return true;
  const upper = t.toUpperCase().trim();
  if (CHINA_TICKERS.has(upper)) return true;
  if (/\.(HK|SS|SZ|SH)$/i.test(upper)) return true;
  return false;
};

const isInvalidTicker = (t: any) => {
  if (t == null) return true;
  const s = String(t).trim();
  if (!s) return true;
  const low = s.toLowerCase();
  if (s === "--" || low === "unknown" || low === "n/a" || low === "none" || low === "null") return true;
  return false;
};

// Parse MM/DD/YYYY
const parseUsDate = (s: string): number => {
  if (!s) return NaN;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return Date.UTC(+m[3], +m[1] - 1, +m[2]);
  const t = Date.parse(s);
  return isNaN(t) ? NaN : t;
};

const daysAgo = (ms: number) => (Date.now() - ms) / (1000 * 60 * 60 * 24);

let cache: { data: any; ts: number } | null = null;
const TTL = 30 * 60 * 1000;
const MAX_DAYS = 365 * 10;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    let windowDays = 365;
    if (req.method === 'GET') {
      const url = new URL(req.url);
      windowDays = Math.max(1, Math.min(MAX_DAYS, Number(url.searchParams.get('days')) || windowDays));
    } else if (req.method === 'POST') {
      try {
        const body = await req.json();
        windowDays = Math.max(1, Math.min(MAX_DAYS, Number(body?.days) || windowDays));
      } catch {
        // keep default
      }
    }

    if (cache && Date.now() - cache.ts < TTL && cache.data.windowDays === windowDays) {
      return new Response(JSON.stringify(cache.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch(DATA_URL);
    if (!res.ok) {
      const txt = await res.text();
      console.error('upstream fail', res.status, txt.slice(0, 300));
      return new Response(JSON.stringify({ error: 'Upstream fetch failed', status: res.status }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const raw: any[] = await res.json();

    let effectiveDays = windowDays;
    let cleaned = filterAndMap(raw, effectiveDays);

    // If the chosen range is empty, auto-expand up to one year
    while (cleaned.length === 0 && effectiveDays < MAX_DAYS) {
      effectiveDays = Math.min(effectiveDays + 30, MAX_DAYS);
      cleaned = filterAndMap(raw, effectiveDays);
    }

    cleaned.sort((a, b) => b.disclosureMs - a.disclosureMs);

    // Global flow totals
    let totalBuy = 0, totalSell = 0;

    // Aggregate by person
    const byPerson: Record<string, any> = {};
    for (const t of cleaned) {
      if (!byPerson[t.name]) byPerson[t.name] = { name: t.name, count: 0, buyAmount: 0, sellAmount: 0, transactions: [] };
      const p = byPerson[t.name];
      p.count++;
      const est = t.amountValue || 0;
      if (/purchase/i.test(t.type)) { p.buyAmount += est; totalBuy += est; }
      else if (/sale/i.test(t.type)) { p.sellAmount += est; totalSell += est; }
      p.transactions.push(strip(t));
    }
    const people = Object.values(byPerson)
      .map((p: any) => ({ ...p, netFlow: p.buyAmount - p.sellAmount, totalAmount: p.buyAmount + p.sellAmount }))
      .sort((a: any, b: any) => b.count - a.count);

    // Aggregate by ticker
    const byTicker: Record<string, any> = {};
    for (const t of cleaned) {
      if (!byTicker[t.ticker]) byTicker[t.ticker] = { ticker: t.ticker, count: 0, buys: 0, sells: 0, buyAmount: 0, sellAmount: 0 };
      const b = byTicker[t.ticker];
      b.count++;
      const est = t.amountValue || 0;
      if (/purchase/i.test(t.type)) { b.buys++; b.buyAmount += est; }
      else if (/sale/i.test(t.type)) { b.sells++; b.sellAmount += est; }
    }
    const tickers = Object.values(byTicker)
      .map((t: any) => ({ ...t, netFlow: t.buyAmount - t.sellAmount, totalAmount: t.buyAmount + t.sellAmount }))
      .sort((a: any, b: any) => b.totalAmount - a.totalAmount)
      .slice(0, 60);

    const payload = {
      updatedAt: new Date().toISOString(),
      windowDays: effectiveDays,
      totalCount: cleaned.length,
      flow: {
        totalBuy,
        totalSell,
        netFlow: totalBuy - totalSell,
        totalVolume: totalBuy + totalSell,
      },
      transactions: cleaned.slice(0, 300).map(strip),
      people: people.slice(0, 40),
      topTickers: tickers,
    };

    cache = { data: payload, ts: Date.now() };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('celebrity-tracker error:', e);
    return new Response(JSON.stringify({ error: String((e as any)?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function strip(t: any) {
  return {
    name: t.name,
    ticker: t.ticker,
    type: t.type,
    amount: t.amount,
    transaction_date: t.transaction_date,
    disclosure_date: t.disclosure_date,
    asset_description: t.asset_description,
    source_url: t.source_url,
  };
}

function parseAmountRange(s: string): number {
  // Examples: "$1,001 - $15,000", "$1,000,001 - $5,000,000", "$50,000,000 +"
  if (!s) return 0;
  const nums = String(s).match(/[\d,]+/g);
  if (!nums || nums.length === 0) return 0;
  const vals = nums.map(n => Number(n.replace(/,/g, ''))).filter(n => !isNaN(n));
  if (vals.length === 0) return 0;
  if (vals.length === 1) return vals[0]; // "$50,000,000 +"
  // midpoint
  return (vals[0] + vals[1]) / 2;
}

function filterAndMap(raw: any[], windowDays: number) {
  const out: any[] = [];
  for (const r of raw) {
    if (!r) continue;
    const name = (r.representative || r.senator || (r.first_name && r.last_name ? `${r.first_name} ${r.last_name}` : '') || '').trim();
    if (!name) continue;
    if (isInvalidTicker(r.ticker)) continue;
    const ticker = String(r.ticker).toUpperCase().trim();
    if (isChinaTicker(ticker)) continue;
    if (!r.type || !r.amount) continue;
    const disc = r.disclosure_date || r.transaction_date;
    if (!disc) continue;
    const ms = parseUsDate(disc);
    if (isNaN(ms)) continue;
    const d = daysAgo(ms);
    if (d < 0 || d > windowDays) continue;
    const amountStr = String(r.amount).trim();
    out.push({
      name,
      ticker,
      type: String(r.type).trim(),
      amount: amountStr,
      amountValue: parseAmountRange(amountStr),
      transaction_date: r.transaction_date || null,
      disclosure_date: r.disclosure_date || null,
      asset_description: r.asset_description || null,
      source_url: r.source_url || r.ptr_link || null,
      disclosureMs: ms,
    });
  }
  return out;
}
