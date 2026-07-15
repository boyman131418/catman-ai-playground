import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const DATA_URL = "https://senate-stock-watcher-data.s3-us-west-2.amazonaws.com/aggregate/all_transactions.json";

// Chinese-background ADRs / HK-listed exclusion set
const CHINA_TICKERS = new Set([
  "BABA","JD","PDD","BIDU","NIO","XPEV","LI","TME","BILI","IQ","HTHT","YMM","TAL","EDU","NTES",
  "TCEHY","TCOM","VIPS","YY","WB","SINA","ZTO","BEKE","LU","FUTU","TIGR","DIDI","QFIN","HUYA",
  "DOYU","MOMO","JOBS","GSX","ATHM","CAAS","CANG","CBAT","CCCC","CEA","CHA","CHL","CHU","CJJD",
  "CMCM","CNET","CNTG","CO","CREG","CSCW","CYD","DADA","DDL","DL","DOGZ","DQ","ECPG","EH","EM",
  "ENLV","EZGO","FANH","FENG","FFHL","FINV","FTFT","GDS","GHG","GOTU","GRVY","GSMG","HCM","HGSH",
  "HHT","HIMX","HKIT","HLG","HNP","HOLI","HTGM","HUIZ","IHG","IMAB","JFIN","JG","JKS","JP","JRJC",
  "JZ","KC","KE","KNDI","KUKE","LEJU","LFC","LI","LITB","LIZI","LX","MOGU","MOHR","MOMO","MPNG",
  "NIU","NOAH","NPD","OCFT","OPRA","ORBS","PLIN","PT","PUXG","QD","QH","QIWI","QK","QTT","RENN",
  "RETO","RLX","SAND","SCON","SDH","SEED","SFUN","SGOC","SHI","SINO","SISI","SKYW","SNP","SOGO",
  "SOHU","SOL","SORL","SVA","SVMK","SVN","SXTC","SY","TANH","TBLT","TEDU","TIRX","TKAT","TOUR",
  "TSM","TZOO","UPC","UTSI","UXIN","VEV","VNET","WAFU","WATT","WB","WEI","WNW","XIN","XNET",
  "XYF","YGMZ","YI","YQ","YRD","YSG","YTEN","ZKIN","ZLAB","ZTO"
]);

const isChinaTicker = (t: string) => {
  if (!t) return true;
  const upper = t.toUpperCase().trim();
  if (CHINA_TICKERS.has(upper)) return true;
  // HK / China listing suffixes
  if (/\.(HK|SS|SZ|SH)$/i.test(upper)) return true;
  return false;
};

const isInvalidTicker = (t: any) => {
  if (t == null) return true;
  const s = String(t).trim();
  if (!s) return true;
  if (s === "--" || s.toLowerCase() === "unknown" || s === "N/A" || s === "n/a") return true;
  return false;
};

const daysAgo = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return Infinity;
  return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
};

let cache: { data: any; ts: number } | null = null;
const TTL = 30 * 60 * 1000; // 30 min

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (cache && Date.now() - cache.ts < TTL) {
      return new Response(JSON.stringify(cache.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch(DATA_URL);
    if (!res.ok) {
      const txt = await res.text();
      return new Response(JSON.stringify({ error: 'Upstream fetch failed', status: res.status, details: txt.slice(0, 500) }), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const raw: any[] = await res.json();

    const cleaned = raw
      .filter(r => r && r.first_name && r.last_name)
      .filter(r => !isInvalidTicker(r.ticker))
      .filter(r => !isChinaTicker(String(r.ticker)))
      .filter(r => r.transaction_date && r.disclosure_date && r.type && r.amount)
      .filter(r => daysAgo(r.disclosure_date) <= 7)
      .map(r => ({
        name: `${r.first_name} ${r.last_name}`.trim(),
        ticker: String(r.ticker).toUpperCase().trim(),
        type: r.type,
        amount: r.amount,
        transaction_date: r.transaction_date,
        disclosure_date: r.disclosure_date,
        asset_description: r.asset_description || null,
      }))
      .sort((a, b) => new Date(b.disclosure_date).getTime() - new Date(a.disclosure_date).getTime());

    // Aggregate by person
    const byPerson: Record<string, any> = {};
    for (const t of cleaned) {
      if (!byPerson[t.name]) byPerson[t.name] = { name: t.name, count: 0, transactions: [] };
      byPerson[t.name].count++;
      byPerson[t.name].transactions.push(t);
    }
    const people = Object.values(byPerson).sort((a: any, b: any) => b.count - a.count);

    // Aggregate by ticker
    const byTicker: Record<string, any> = {};
    for (const t of cleaned) {
      if (!byTicker[t.ticker]) byTicker[t.ticker] = { ticker: t.ticker, count: 0, buys: 0, sells: 0 };
      byTicker[t.ticker].count++;
      if (/purchase/i.test(t.type)) byTicker[t.ticker].buys++;
      else if (/sale/i.test(t.type)) byTicker[t.ticker].sells++;
    }
    const tickers = Object.values(byTicker).sort((a: any, b: any) => b.count - a.count).slice(0, 30);

    const payload = {
      updatedAt: new Date().toISOString(),
      totalCount: cleaned.length,
      transactions: cleaned.slice(0, 200),
      people: people.slice(0, 30),
      topTickers: tickers,
    };

    cache = { data: payload, ts: Date.now() };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('celebrity-tracker error:', e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
