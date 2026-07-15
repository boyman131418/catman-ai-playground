import { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, RefreshCw, ExternalLink, Activity, Bitcoin, LineChart, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Quote = {
  symbol: string;
  name?: string;
  image?: string;
  price?: number | null;
  change?: number | null;
  changePercent?: number | null;
  volume?: number | null;
  marketCap?: number | null;
  dayHigh?: number | null;
  dayLow?: number | null;
  prevClose?: number | null;
  high24h?: number | null;
  low24h?: number | null;
  currency?: string;
  exchange?: string;
  rank?: number;
};

interface Payload {
  updatedAt: string;
  indices: Quote[];
  gainers: Quote[];
  losers: Quote[];
  actives: Quote[];
  crypto: Quote[];
}

const CACHE_KEY = "finance-strategy-cache-v3";
const CACHE_TTL = 5 * 60 * 1000;

const fmtPrice = (v: any, digits = 2) => {
  const n = Number(v);
  if (!isFinite(n)) return "-";
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (Math.abs(n) < 1) return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
  return n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

const fmtCap = (v: any) => {
  const n = Number(v);
  if (!isFinite(n) || n === 0) return "-";
  if (Math.abs(n) >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
};

const PctBadge = ({ value }: { value?: number | null }) => {
  if (value == null || !isFinite(value)) return <span className="text-muted-foreground">-</span>;
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${up ? "text-emerald-500" : "text-rose-500"}`}>
      {up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {up ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
};

const IndexCard = ({ q }: { q: Quote }) => {
  const up = (q.changePercent ?? 0) >= 0;
  return (
    <Card className={`p-4 relative overflow-hidden border-2 transition-all hover:scale-[1.02] hover:shadow-lg ${up ? "border-emerald-500/20 hover:border-emerald-500/40" : "border-rose-500/20 hover:border-rose-500/40"}`}>
      <div className={`absolute inset-0 opacity-5 ${up ? "bg-emerald-500" : "bg-rose-500"}`} />
      <div className="relative">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xs text-muted-foreground font-mono">{q.symbol}</p>
            <h3 className="font-semibold text-sm">{q.name}</h3>
          </div>
          {up ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <TrendingDown className="w-4 h-4 text-rose-500" />}
        </div>
        <p className="text-2xl font-bold tabular-nums">{fmtPrice(q.price)}</p>
        <div className="flex items-center gap-2 mt-1 text-sm">
          <span className={`tabular-nums ${up ? "text-emerald-500" : "text-rose-500"}`}>
            {up ? "+" : ""}{q.change != null ? fmtPrice(q.change) : "-"}
          </span>
          <PctBadge value={q.changePercent} />
        </div>
      </div>
    </Card>
  );
};

const StockList = ({ items, kind }: { items: Quote[]; kind: "gain" | "loss" | "active" }) => {
  if (!items?.length) return <p className="text-center text-muted-foreground py-12 text-sm">暫無資料</p>;
  return (
    <div className="grid gap-2">
      {items.map((q, i) => {
        const up = (q.changePercent ?? 0) >= 0;
        return (
          <a
            key={q.symbol + i}
            href={`https://finance.yahoo.com/quote/${encodeURIComponent(q.symbol)}`}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-xs font-bold text-primary">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm">{q.symbol}</span>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 transition" />
              </div>
              <p className="text-xs text-muted-foreground truncate">{q.name}</p>
            </div>
            <div className="text-right">
              <p className="font-bold tabular-nums text-sm">${fmtPrice(q.price)}</p>
              <PctBadge value={q.changePercent} />
            </div>
            {kind === "active" && (
              <div className="text-right hidden sm:block min-w-[70px]">
                <p className="text-[10px] text-muted-foreground">成交量</p>
                <p className="text-xs font-semibold tabular-nums">{fmtCap(q.volume)}</p>
              </div>
            )}
            {kind !== "active" && q.marketCap != null && (
              <div className="text-right hidden sm:block min-w-[70px]">
                <p className="text-[10px] text-muted-foreground">市值</p>
                <p className="text-xs font-semibold tabular-nums">${fmtCap(q.marketCap)}</p>
              </div>
            )}
          </a>
        );
      })}
    </div>
  );
};

const CryptoList = ({ items }: { items: Quote[] }) => {
  if (!items?.length) return <p className="text-center text-muted-foreground py-12 text-sm">暫無資料</p>;
  return (
    <div className="grid gap-2">
      {items.map((c) => (
        <a
          key={c.symbol}
          href={`https://www.coingecko.com/en/coins/${(c.name || c.symbol || "").toLowerCase().replace(/\s+/g, "-")}`}
          target="_blank"
          rel="noreferrer"
          className="group flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/5 flex items-center justify-center text-xs font-bold text-amber-600">
            {c.rank}
          </div>
          {c.image ? (
            <img src={c.image} alt={c.symbol} className="w-8 h-8 rounded-full" loading="lazy" />
          ) : (
            <Bitcoin className="w-8 h-8 text-amber-500" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">{c.name}</span>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">{c.symbol}</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">市值 ${fmtCap(c.marketCap)} · 24h 量 ${fmtCap(c.volume)}</p>
          </div>
          <div className="text-right">
            <p className="font-bold tabular-nums text-sm">${fmtPrice(c.price)}</p>
            <PctBadge value={c.changePercent} />
          </div>
        </a>
      ))}
    </div>
  );
};

const FinanceStrategyDialog = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Payload | null>(null);
  const { toast } = useToast();

  const load = useCallback(async (force = false) => {
    setLoading(true);
    try {
      if (!force) {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.ts < CACHE_TTL) {
            setData(parsed.data);
            setLoading(false);
            return;
          }
        }
      }
      const { data: res, error } = await supabase.functions.invoke("finance-strategy", { method: "POST" });
      if (error) throw error;
      setData(res);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: res }));
    } catch (e: any) {
      console.error(e);
      toast({ title: "載入失敗", description: e.message || "無法取得財金資料", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (open && !data) load(false);
  }, [open, data, load]);

  const marketMood = useMemo(() => {
    if (!data?.indices?.length) return null;
    const us = data.indices.filter((i) => ["^GSPC", "^IXIC", "^DJI"].includes(i.symbol));
    const avg = us.reduce((s, i) => s + (i.changePercent ?? 0), 0) / (us.length || 1);
    return { avg, up: avg >= 0 };
  }, [data]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:opacity-90 text-white shadow-lg shadow-emerald-500/20">
          <LineChart className="w-4 h-4 mr-1.5" /> 財金策略
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <LineChart className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-lg font-bold">財金策略儀表板</div>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                全球市場即時脈動 · 免費實時數據
                {data?.updatedAt && ` · 更新於 ${new Date(data.updatedAt).toLocaleTimeString("zh-HK")}`}
              </p>
            </div>
            {marketMood && (
              <Badge className={`${marketMood.up ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" : "bg-rose-500/15 text-rose-600 border-rose-500/30"} border`}>
                {marketMood.up ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                美股情緒 {marketMood.up ? "+" : ""}{marketMood.avg.toFixed(2)}%
              </Badge>
            )}
            <Button size="sm" variant="ghost" onClick={() => load(true)} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && !data ? (
            <div className="text-center py-20 text-muted-foreground">
              <RefreshCw className="w-10 h-10 animate-spin mx-auto mb-4 text-emerald-500" />
              <p>正在載入全球市場數據...</p>
            </div>
          ) : !data ? (
            <p className="text-center py-20 text-muted-foreground">無資料</p>
          ) : (
            <div className="space-y-6">
              {/* Global indices */}
              <section>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" /> 全球主要指數
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {data.indices.map((q) => <IndexCard key={q.symbol} q={q} />)}
                </div>
              </section>

              <Tabs defaultValue="gainers" className="w-full">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="gainers" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                    <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> 升幅榜
                  </TabsTrigger>
                  <TabsTrigger value="losers" className="data-[state=active]:bg-rose-500 data-[state=active]:text-white">
                    <TrendingDown className="w-3.5 h-3.5 mr-1.5" /> 跌幅榜
                  </TabsTrigger>
                  <TabsTrigger value="actives" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                    <Activity className="w-3.5 h-3.5 mr-1.5" /> 最活躍
                  </TabsTrigger>
                  <TabsTrigger value="crypto" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
                    <Bitcoin className="w-3.5 h-3.5 mr-1.5" /> 加密貨幣
                  </TabsTrigger>
                </TabsList>
                <div className="mt-4">
                  <TabsContent value="gainers"><StockList items={data.gainers} kind="gain" /></TabsContent>
                  <TabsContent value="losers"><StockList items={data.losers} kind="loss" /></TabsContent>
                  <TabsContent value="actives"><StockList items={data.actives} kind="active" /></TabsContent>
                  <TabsContent value="crypto"><CryptoList items={data.crypto} /></TabsContent>
                </div>
              </Tabs>
            </div>
          )}
        </div>
        <div className="px-6 py-3 border-t bg-muted/30">
          <p className="text-[11px] text-muted-foreground text-center">
            資料來源：Yahoo Finance · CoinGecko · 僅供參考，並非投資建議
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FinanceStrategyDialog;
