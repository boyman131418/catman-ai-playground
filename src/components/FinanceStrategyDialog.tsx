import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, RefreshCw, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Row = Record<string, any>;

interface FinancePayload {
  updatedAt: string;
  locked: Record<string, boolean>;
  congress: Row[];
  senator: Row[];
  house: Row[];
  wsb: Row[];
  contracts: Row[];
  lobbying: Row[];
  insiders: Row[];
  offexchange: Row[];
}

const CACHE_KEY = "finance-strategy-cache-v1";
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

const fmtDate = (v: any) => {
  if (!v) return "-";
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("zh-HK");
};

const fmtNum = (v: any) => {
  const n = Number(v);
  if (!isFinite(n) || n === 0) return v ? String(v) : "-";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
};

const tickerLink = (t: string) =>
  t ? `https://www.quiverquant.com/stock/${encodeURIComponent(t)}` : "#";

const LockedNotice = () => (
  <div className="text-center py-10 space-y-2">
    <p className="text-sm font-medium">此數據集需要升級 Quiver Quantitative 訂閱</p>
    <p className="text-xs text-muted-foreground">你目前的 API Key 為免費層級，未包含此資料。</p>
    <Button size="sm" variant="outline" asChild>
      <a href="https://www.quiverquant.com/pricing/" target="_blank" rel="noreferrer">升級方案 <ExternalLink className="w-3 h-3 ml-1" /></a>
    </Button>
  </div>
);

const DataTable = ({ rows, cols, locked }: { rows: Row[]; cols: { key: string; label: string; render?: (v: any, r: Row) => any }[]; locked?: boolean }) => {
  if (locked) return <LockedNotice />;
  if (!rows || rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">暫無資料</p>;
  }
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {cols.map((c) => (
              <TableHead key={c.key} className="whitespace-nowrap">{c.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              {cols.map((c) => (
                <TableCell key={c.key} className="whitespace-nowrap text-sm">
                  {c.render ? c.render(r[c.key], r) : (r[c.key] ?? "-")}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const TickerCell = (v: any) =>
  v ? (
    <a href={tickerLink(v)} target="_blank" rel="noreferrer" className="font-mono font-semibold text-primary hover:underline inline-flex items-center gap-1">
      {v} <ExternalLink className="w-3 h-3" />
    </a>
  ) : "-";

const TxCell = (v: any) => {
  const s = String(v || "").toLowerCase();
  if (s.includes("purchase") || s.includes("buy")) return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">買入</Badge>;
  if (s.includes("sale") || s.includes("sell")) return <Badge className="bg-red-500/20 text-red-600 border-red-500/30">賣出</Badge>;
  return v || "-";
};

const FinanceStrategyDialog = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FinancePayload | null>(null);
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

  const congressCols = [
    { key: "Representative", label: "議員" },
    { key: "Ticker", label: "股票", render: TickerCell },
    { key: "Transaction", label: "類型", render: TxCell },
    { key: "Trade_Size_USD", label: "金額", render: (v: any, r: Row) => fmtNum(v ?? r.Amount ?? r.Range) },
    { key: "TransactionDate", label: "交易日", render: fmtDate },
    { key: "ReportDate", label: "申報日", render: fmtDate },
  ];

  const senatorCols = [
    { key: "Senator", label: "參議員" },
    { key: "Ticker", label: "股票", render: TickerCell },
    { key: "Transaction", label: "類型", render: TxCell },
    { key: "Amount", label: "金額範圍" },
    { key: "Date", label: "交易日", render: fmtDate },
  ];

  const houseCols = [
    { key: "Representative", label: "眾議員" },
    { key: "Ticker", label: "股票", render: TickerCell },
    { key: "Transaction", label: "類型", render: TxCell },
    { key: "Amount", label: "金額範圍" },
    { key: "TransactionDate", label: "交易日", render: fmtDate },
  ];

  const wsbCols = [
    { key: "Ticker", label: "股票", render: TickerCell },
    { key: "Count", label: "提及次數", render: (v: any, r: Row) => v ?? r.Mentions ?? "-" },
    { key: "Sentiment", label: "情緒", render: (v: any) => v != null ? Number(v).toFixed(3) : "-" },
    { key: "Rank", label: "排名" },
    { key: "Date", label: "日期", render: fmtDate },
  ];

  const contractsCols = [
    { key: "Ticker", label: "股票", render: TickerCell },
    { key: "Agency", label: "機構" },
    { key: "Amount", label: "合約金額", render: fmtNum },
    { key: "Description", label: "描述", render: (v: any) => <span className="max-w-md truncate inline-block">{v || "-"}</span> },
    { key: "Date", label: "日期", render: fmtDate },
  ];

  const lobbyingCols = [
    { key: "Ticker", label: "股票", render: TickerCell },
    { key: "Client", label: "客戶" },
    { key: "Registrant", label: "遊說機構" },
    { key: "Amount", label: "支出", render: fmtNum },
    { key: "Date", label: "日期", render: fmtDate },
  ];

  const insidersCols = [
    { key: "Ticker", label: "股票", render: TickerCell },
    { key: "Name", label: "內部人" },
    { key: "Title", label: "職位" },
    { key: "AcquiredDisposedCode", label: "類型", render: (v: any) => v === "A" ? <Badge className="bg-green-500/20 text-green-600">取得</Badge> : v === "D" ? <Badge className="bg-red-500/20 text-red-600">處置</Badge> : v },
    { key: "Shares", label: "股數", render: (v: any) => v ? Number(v).toLocaleString() : "-" },
    { key: "PricePerShare", label: "每股價" },
    { key: "Date", label: "日期", render: fmtDate },
  ];

  const offexchangeCols = [
    { key: "Ticker", label: "股票", render: TickerCell },
    { key: "DPI", label: "暗盤指數" },
    { key: "ShortVolume", label: "沽空量", render: (v: any) => v ? Number(v).toLocaleString() : "-" },
    { key: "TotalVolume", label: "總成交量", render: (v: any) => v ? Number(v).toLocaleString() : "-" },
    { key: "Date", label: "日期", render: fmtDate },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-white shadow-glow">
          <TrendingUp className="w-4 h-4 mr-1" /> 財金策略
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            財金策略 · Quiver Quantitative
            <Button size="sm" variant="ghost" onClick={() => load(true)} disabled={loading} className="ml-auto">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </DialogTitle>
          {data?.updatedAt && (
            <p className="text-xs text-muted-foreground">更新時間：{new Date(data.updatedAt).toLocaleString("zh-HK")}</p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading && !data ? (
            <div className="text-center py-16 text-muted-foreground">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
              載入中...
            </div>
          ) : !data ? (
            <p className="text-center py-16 text-muted-foreground">無資料</p>
          ) : (
            <Tabs defaultValue="congress" className="w-full">
              <TabsList className="grid grid-cols-4 lg:grid-cols-8 gap-1 h-auto">
                <TabsTrigger value="congress" className="text-xs">國會交易</TabsTrigger>
                <TabsTrigger value="senator" className="text-xs">參議員</TabsTrigger>
                <TabsTrigger value="house" className="text-xs">眾議員</TabsTrigger>
                <TabsTrigger value="insiders" className="text-xs">內部人</TabsTrigger>
                <TabsTrigger value="wsb" className="text-xs">WSB熱門</TabsTrigger>
                <TabsTrigger value="contracts" className="text-xs">政府合約</TabsTrigger>
                <TabsTrigger value="lobbying" className="text-xs">遊說</TabsTrigger>
                <TabsTrigger value="offexchange" className="text-xs">暗盤</TabsTrigger>
              </TabsList>
              <Card className="mt-4 p-3">
                <TabsContent value="congress"><DataTable rows={data.congress} cols={congressCols} locked={data.locked?.congress} /></TabsContent>
                <TabsContent value="senator"><DataTable rows={data.senator} cols={senatorCols} locked={data.locked?.senator} /></TabsContent>
                <TabsContent value="house"><DataTable rows={data.house} cols={houseCols} locked={data.locked?.house} /></TabsContent>
                <TabsContent value="insiders"><DataTable rows={data.insiders} cols={insidersCols} locked={data.locked?.insiders} /></TabsContent>
                <TabsContent value="wsb"><DataTable rows={data.wsb} cols={wsbCols} locked={data.locked?.wsb} /></TabsContent>
                <TabsContent value="contracts"><DataTable rows={data.contracts} cols={contractsCols} locked={data.locked?.contracts} /></TabsContent>
                <TabsContent value="lobbying"><DataTable rows={data.lobbying} cols={lobbyingCols} locked={data.locked?.lobbying} /></TabsContent>
                <TabsContent value="offexchange"><DataTable rows={data.offexchange} cols={offexchangeCols} locked={data.locked?.offexchange} /></TabsContent>
              </Card>
            </Tabs>
          )}
        </div>
        <p className="text-xs text-muted-foreground text-center pt-2 border-t">
          資料來源：<a href="https://www.quiverquant.com/" target="_blank" rel="noreferrer" className="underline">Quiver Quantitative</a>
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default FinanceStrategyDialog;
