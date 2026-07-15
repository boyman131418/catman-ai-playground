import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, RefreshCw, TrendingUp, TrendingDown, ExternalLink, Search, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Txn = {
  name: string;
  ticker: string;
  type: string;
  amount: string;
  transaction_date: string;
  disclosure_date: string;
  asset_description?: string | null;
};

type Payload = {
  updatedAt: string;
  windowDays: number;
  totalCount: number;
  transactions: Txn[];
  people: { name: string; count: number; transactions: Txn[] }[];
  topTickers: { ticker: string; count: number; buys: number; sells: number }[];
};

const DAY_OPTIONS = [
  { value: 7, label: "最近 7 天" },
  { value: 30, label: "最近 30 天" },
  { value: 90, label: "最近 90 天" },
  { value: 180, label: "最近 180 天" },
  { value: 365, label: "過去一年" },
];

const CACHE_TTL = 10 * 60 * 1000;

const cacheKey = (days: number) => `celebrity-tracker-cache-v2-${days}`;

const TypeBadge = ({ type }: { type: string }) => {
  const isBuy = /purchase/i.test(type);
  const isSell = /sale/i.test(type);
  return (
    <Badge
      variant="outline"
      className={
        isBuy
          ? "border-emerald-500/40 text-emerald-500 bg-emerald-500/10"
          : isSell
          ? "border-rose-500/40 text-rose-500 bg-rose-500/10"
          : "border-muted text-muted-foreground"
      }
    >
      {isBuy ? <TrendingUp className="w-3 h-3 mr-1" /> : isSell ? <TrendingDown className="w-3 h-3 mr-1" /> : null}
      {type}
    </Badge>
  );
};

const CelebrityTrackerDialog = () => {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [days, setDays] = useState(365);
  const { toast } = useToast();

  const load = useCallback(async (force = false) => {
    if (!force) {
      try {
        const raw = localStorage.getItem(cacheKey(days));
        if (raw) {
          const p = JSON.parse(raw);
          if (Date.now() - p.ts < CACHE_TTL) {
            setData(p.data);
            return;
          }
        }
      } catch {}
    }
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("celebrity-tracker", {
        body: { days },
      });
      if (error) throw error;
      if ((res as any)?.error) throw new Error((res as any).error);
      setData(res as Payload);
      try {
        localStorage.setItem(cacheKey(days), JSON.stringify({ ts: Date.now(), data: res }));
      } catch {}
    } catch (e: any) {
      console.error(e);
      toast({ title: "載入失敗", description: e?.message || "無法取得名人追蹤資料", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [days, toast]);

  useEffect(() => {
    if (open) load(false);
  }, [open, days, load]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.transactions;
    return data.transactions.filter(
      t => t.name.toLowerCase().includes(q) || t.ticker.toLowerCase().includes(q)
    );
  }, [data, query]);

  const windowLabel = useMemo(() => {
    if (!data) return "";
    return DAY_OPTIONS.find(o => o.value === data.windowDays)?.label || `最近 ${data.windowDays} 天`;
  }, [data]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-gradient-to-r from-amber-500 to-rose-500 hover:opacity-90 text-white shadow-glow"
        >
          <Users className="w-4 h-4 mr-1" /> 名人追蹤
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              名人追蹤 · 美國參議員股票披露
            </span>
            <div className="flex items-center gap-2">
              {data && (
                <span className="text-xs text-muted-foreground font-normal">
                  {data.totalCount} 筆 · {windowLabel}
                </span>
              )}
              <Select
                value={String(days)}
                onValueChange={v => setDays(Number(v))}
                disabled={loading}
              >
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <CalendarDays className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="選擇時間範圍" />
                </SelectTrigger>
                <SelectContent>
                  {DAY_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={String(o.value)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="ghost" onClick={() => load(true)} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading && !data ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mx-auto" />
              <p className="text-sm text-muted-foreground">正在抓取最新披露…</p>
            </div>
          </div>
        ) : !data ? (
          <div className="flex-1 flex items-center justify-center py-16 text-muted-foreground text-sm">
            暫無資料
          </div>
        ) : data.totalCount === 0 ? (
          <div className="flex-1 flex items-center justify-center py-16 text-muted-foreground text-sm">
            {windowLabel}沒有符合條件的披露紀錄
          </div>
        ) : (
          <Tabs defaultValue="txns" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="txns">最新交易</TabsTrigger>
              <TabsTrigger value="people">活躍人物</TabsTrigger>
              <TabsTrigger value="tickers">熱門股票</TabsTrigger>
            </TabsList>

            <TabsContent value="txns" className="flex-1 overflow-hidden flex flex-col mt-3">
              <div className="relative mb-3">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜尋人名或股票代號…"
                  className="pl-9"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              <div className="flex-1 overflow-auto space-y-2 pr-1">
                {filtered.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">找不到符合的紀錄</p>
                ) : (
                  filtered.map((t, i) => (
                    <Card key={i} className="p-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{t.name}</span>
                            <a
                              href={`https://finance.yahoo.com/quote/${t.ticker}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-sm text-primary hover:underline"
                            >
                              {t.ticker}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <TypeBadge type={t.type} />
                          </div>
                          {t.asset_description && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">{t.asset_description}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-medium">{t.amount}</div>
                          <div className="text-xs text-muted-foreground">
                            交易 {t.transaction_date} · 披露 {t.disclosure_date}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="people" className="flex-1 overflow-auto mt-3 space-y-2 pr-1">
              {data.people.map((p, i) => (
                <Card key={i} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{p.name}</span>
                    <Badge variant="secondary">{p.count} 筆交易</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.transactions.slice(0, 8).map((t, j) => (
                      <span
                        key={j}
                        className={`px-2 py-0.5 rounded text-xs font-mono ${
                          /purchase/i.test(t.type)
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-rose-500/10 text-rose-500"
                        }`}
                      >
                        {t.ticker}
                      </span>
                    ))}
                    {p.transactions.length > 8 && (
                      <span className="text-xs text-muted-foreground">+{p.transactions.length - 8}</span>
                    )}
                  </div>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="tickers" className="flex-1 overflow-auto mt-3 grid grid-cols-2 md:grid-cols-3 gap-2 pr-1">
              {data.topTickers.map((t, i) => (
                <Card key={i} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <a
                      href={`https://finance.yahoo.com/quote/${t.ticker}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono font-bold text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {t.ticker}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <Badge variant="secondary">{t.count}</Badge>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-500 inline-flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> {t.buys} 買入
                    </span>
                    <span className="text-rose-500 inline-flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" /> {t.sells} 賣出
                    </span>
                  </div>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CelebrityTrackerDialog;
