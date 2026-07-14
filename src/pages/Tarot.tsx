import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const SPREADS = [
  { id: 1, name: "一張牌占卜法（1 張）" },
  { id: 2, name: "二選一牌陣（2 張）" },
  { id: 3, name: "聖三角牌陣（3 張）" },
  { id: 4, name: "時光箭牌陣（3 張）" },
  { id: 5, name: "四元素牌陣（4 張）" },
  { id: 6, name: "戀人金字塔（4 張）" },
  { id: 7, name: "五行牌陣（5 張）" },
  { id: 8, name: "戀人牌陣（5 張）" },
  { id: 9, name: "大十字牌陣（5 張）" },
  { id: 10, name: "六芒星牌陣（6 張）" },
  { id: 11, name: "復合牌陣（6 張）" },
  { id: 12, name: "七行星牌陣（7 張）" },
  { id: 13, name: "九宮格牌陣（9 張）" },
  { id: 14, name: "戀人關係深度牌陣（9 張）" },
  { id: 15, name: "凱爾特十字牌陣（10 張）" },
  { id: 16, name: "生命之樹牌陣（11 張）" },
  { id: 17, name: "年運週期牌陣（12 張）" },
];

const TOPICS = [
  { id: 1, name: "戀愛婚姻" },
  { id: 2, name: "工作學業" },
  { id: 3, name: "人際財富" },
  { id: 4, name: "健康生活" },
  { id: 5, name: "其它綜合" },
];

interface CardData {
  positions_index: number;
  positions_name: string;
  positions_desc: string;
  orientation_code: number;
  orientation_text: string;
  card_no: number;
  card_name: string;
  card_keywords: string;
  card_astrology: string;
  card_element: string;
  card_description: string;
  card_interpretation: { general: string; topic: string; advice: string };
  image_url: string;
}

interface ReadingResult {
  cards: CardData[];
  overall_interpretation: { summary_message: string; oracle_message: string };
  environment: { calculation_time: string; time_ganzhi: string; time_element: string };
}

const Tarot = () => {
  const [spreadId, setSpreadId] = useState("3");
  const [topicId, setTopicId] = useState("5");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReadingResult | null>(null);

  const draw = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("tarot-reading", {
        body: { spread_id: Number(spreadId), topic_id: Number(topicId), lang: "zh-tw" },
      });
      if (error) throw error;
      if (data?.errcode !== 0) {
        toast.error(data?.errmsg || "占卜失敗");
        return;
      }
      setResult(data.data);
    } catch (e) {
      toast.error("網絡錯誤，請稍後再試");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-300 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> 返回首頁
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-300" /> 塔羅牌占卜
          </h1>
          <div className="w-16" />
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-slate-100">選擇你的占卜方式</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-300 mb-2 block">牌陣</label>
                <Select value={spreadId} onValueChange={setSpreadId}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-slate-100"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SPREADS.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-2 block">主題</label>
                <Select value={topicId} onValueChange={setTopicId}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-slate-100"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TOPICS.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={draw} disabled={loading} className="w-full bg-gradient-to-r from-amber-500 to-pink-500 hover:opacity-90">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 洗牌中...</> : <><Sparkles className="w-4 h-4 mr-2" /> 開始占卜</>}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <div className="mt-8 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {result.cards.map((c) => (
                <Card key={c.positions_index} className="bg-white/5 border-white/10 overflow-hidden">
                  <div className="aspect-[2/3] bg-black/40 flex items-center justify-center">
                    <img
                      src={c.image_url}
                      alt={c.card_name}
                      className={`w-full h-full object-contain ${c.orientation_code === 0 ? "rotate-180" : ""}`}
                      loading="lazy"
                    />
                  </div>
                  <CardContent className="p-3">
                    <div className="text-xs text-amber-300">{c.positions_name} · {c.orientation_text}</div>
                    <div className="font-semibold text-slate-100">{c.card_name}</div>
                    <div className="text-xs text-slate-400 mt-1">{c.card_keywords}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-4">
              {result.cards.map((c) => (
                <Card key={c.positions_index} className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-slate-100 text-base">
                      {c.positions_index}. {c.positions_name} — {c.card_name}（{c.orientation_text}）
                    </CardTitle>
                    <div className="text-xs text-slate-400">{c.positions_desc}</div>
                  </CardHeader>
                  <CardContent className="text-sm text-slate-200 space-y-2">
                    <p><span className="text-amber-300">基本含義：</span>{c.card_interpretation.general}</p>
                    <p><span className="text-amber-300">主題解讀：</span>{c.card_interpretation.topic}</p>
                    <p><span className="text-amber-300">建議：</span>{c.card_interpretation.advice}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-gradient-to-br from-amber-500/10 to-pink-500/10 border-amber-300/30">
              <CardHeader><CardTitle className="text-amber-200">綜合解讀</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-slate-100">
                <p>{result.overall_interpretation.summary_message}</p>
                <p className="italic text-amber-200">🔮 {result.overall_interpretation.oracle_message}</p>
                <div className="text-xs text-slate-400 pt-2 border-t border-white/10">
                  計算時間：{result.environment.calculation_time} · 時局：{result.environment.time_ganzhi}（{result.environment.time_element}）
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tarot;
