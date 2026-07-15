import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Newspaper, RefreshCw, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Article {
  title: string;
  description: string | null;
  url: string;
  source: string;
  publishedAt: string;
  urlToImage: string | null;
}

interface RegionNews {
  region: string;
  region_label: string;
  articles: Article[];
  fetched_at?: string;
}

const News24Dialog = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [regions, setRegions] = useState<RegionNews[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const { toast } = useToast();

  const hasArticles = (rows: RegionNews[]) => rows.some((r) => r.articles?.length > 0);

  const load = useCallback(async (force = false) => {
    if (force) setRefreshing(true); else setLoading(true);
    try {
      // read cached first
      if (!force) {
        const { data } = await supabase
          .from('news_cache')
          .select('*')
          .order('region');
        if (data && data.length > 0 && hasArticles(data as any)) {
          setRegions(data as any);
          setLastUpdated(data[0].fetched_at);
        }
      }
      // call function (respects cache unless force)
      const { data, error } = await supabase.functions.invoke('news-24', {
        body: force ? { force: 1 } : {},
        method: 'POST',
      });
      if (error) throw error;
      if (data?.regions) {
        // when cached=true response returns rows directly; when fresh returns {region, region_label, articles}
        setRegions(data.regions);
        setLastUpdated(data.regions.find((r: RegionNews) => r.fetched_at)?.fetched_at || new Date().toISOString());
        if (force) toast({ title: '新聞已更新', description: `已重新載入 ${data.regions.length} 個地區` });
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: '載入新聞失敗', description: e.message || '請稍後再試', variant: 'destructive' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  const handleOpen = (o: boolean) => {
    setOpen(o);
    if (o && regions.length === 0) load(false);
  };

  const formatTime = (iso?: string | null) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('zh-HK', { hour12: false });
    } catch {
      return iso;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-gradient-to-r from-rose-500 to-orange-500 hover:opacity-90 text-white shadow-glow"
        >
          <Newspaper className="w-4 h-4 mr-1" /> 新聞24
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-rose-500" />
              新聞 24 · 過去 24 小時熱門新聞
            </DialogTitle>
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <Badge variant="outline" className="text-xs">
                  更新於 {formatTime(lastUpdated)}
                </Badge>
              )}
              <Button size="sm" variant="outline" onClick={() => load(true)} disabled={refreshing || loading}>
                <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                手動更新
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-1">
          {loading && regions.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : regions.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">暫無新聞，請點擊「手動更新」</p>
          ) : (
            <Tabs defaultValue={regions[0]?.region} className="w-full">
              <TabsList className="grid grid-cols-3 md:grid-cols-6 h-auto">
                {regions.map((r) => (
                  <TabsTrigger key={r.region} value={r.region} className="text-xs md:text-sm">
                    {r.region_label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {regions.map((r) => (
                <TabsContent key={r.region} value={r.region} className="space-y-3 mt-4">
                  {r.articles.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">此地區暫無 24 小時內熱門新聞</p>
                  ) : (
                    r.articles.slice(0, 3).map((a, i) => (
                      <Card key={i} className="overflow-hidden">
                        <CardContent className="p-4 flex gap-4">
                          {a.urlToImage && (
                            <img
                              src={a.urlToImage}
                              alt=""
                              className="w-24 h-24 object-cover rounded-md shrink-0"
                              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm md:text-base leading-snug mb-1">{a.title}</h3>
                            {a.description && (
                              <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 mb-2">{a.description}</p>
                            )}
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{a.source} · {formatTime(a.publishedAt)}</span>
                              <Button variant="ghost" size="sm" asChild className="h-6 px-2">
                                <a href={a.url} target="_blank" rel="noopener noreferrer">
                                  閱讀 <ExternalLink className="w-3 h-3 ml-1" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default News24Dialog;
