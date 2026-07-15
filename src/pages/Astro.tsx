import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, ArrowLeft, Star } from "lucide-react";
import { toast } from "sonner";

const SIGN_ZH: Record<string, string> = {
  Ari: "牡羊", Tau: "金牛", Gem: "雙子", Can: "巨蟹",
  Leo: "獅子", Vir: "處女", Lib: "天秤", Sco: "天蠍",
  Sag: "射手", Cap: "摩羯", Aqu: "水瓶", Pis: "雙魚",
};

const PLANET_ZH: Record<string, string> = {
  Sun: "太陽", Moon: "月亮", Mercury: "水星", Venus: "金星", Mars: "火星",
  Jupiter: "木星", Saturn: "土星", Uranus: "天王星", Neptune: "海王星", Pluto: "冥王星",
  Chiron: "凱龍", "Mean_Node": "北交點", "True_Node": "北交點", "Mean_South_Node": "南交點",
  Lilith: "莉莉絲",
};

const signName = (s?: string) => (s ? (SIGN_ZH[s] || s) : "—");
const planetName = (p?: string) => (p ? (PLANET_ZH[p] || p) : "—");

interface AstroResult {
  subject: any;
  big_three: {
    sun: { sign: string; pos: number; house: number } | null;
    moon: { sign: string; pos: number; house: number } | null;
    ascendant: { sign?: string } | null;
  };
  planets: Array<{ name: string; sign: string; pos: number; house: number; retrograde: boolean }>;
  houses: Array<{ house: number; sign: string; pos: number }>;
  aspects: Array<{ p1: string; p2: string; aspect: string; orb: number }>;
  interpretation: {
    core_identity: string;
    personality: string;
    love: string;
    career: string;
    wealth: string;
    health: string;
    life_theme: string;
    advice: string;
    lucky: { colors: string; numbers: string; direction: string; gemstone: string };
    oracle: string;
  };
}

const Astro = () => {
  const [name, setName] = useState("");
  const [date, setDate] = useState("1995-06-15");
  const [time, setTime] = useState("12:00");
  const [timeKnown, setTimeKnown] = useState("true");
  const [city, setCity] = useState("Hong Kong");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AstroResult | null>(null);

  const submit = async () => {
    if (!date) {
      toast.error("請填寫出生日期");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const [y, m, d] = date.split("-").map(Number);
      const [hh, mm] = (time || "12:00").split(":").map(Number);
      const { data, error } = await supabase.functions.invoke("astro-reading", {
        body: {
          name: name || "訪客",
          year: y, month: m, day: d,
          time_known: timeKnown === "true",
          hour: hh, minute: mm,
          city, tz_str: "AUTO",
        },
      });
      if (error) throw error;
      if (data?.errcode !== 0) {
        toast.error(data?.errmsg || "占星失敗");
        return;
      }
      setResult(data.data);
    } catch (e) {
      console.error(e);
      toast.error("網絡錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  const i = result?.interpretation;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-300 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> 返回首頁
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Star className="w-6 h-6 text-sky-300" /> 西方占星本命盤
          </h1>
          <div className="w-16" />
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-slate-100">輸入出生資料</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300 mb-2 block">姓名（選填）</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="訪客" className="bg-white/10 border-white/20 text-slate-100" />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">出生城市</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Hong Kong" className="bg-white/10 border-white/20 text-slate-100" />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">出生日期</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-white/10 border-white/20 text-slate-100" />
              </div>
              <div>
                <Label className="text-slate-300 mb-2 block">出生時間</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="bg-white/10 border-white/20 text-slate-100" disabled={timeKnown === "false"} />
              </div>
              <div className="md:col-span-2">
                <Label className="text-slate-300 mb-2 block">時間是否知道？</Label>
                <Select value={timeKnown} onValueChange={setTimeKnown}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-slate-100"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">知道準確時間（推薦，會計算宮位與上升）</SelectItem>
                    <SelectItem value="false">不知道時間（僅計算行星星座）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={submit} disabled={loading} className="w-full bg-gradient-to-r from-sky-500 to-indigo-500 hover:opacity-90">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 星象計算中...</> : <><Sparkles className="w-4 h-4 mr-2" /> 開始占星</>}
            </Button>
            <p className="text-xs text-slate-400">
              本功能使用 FreeAstroAPI 高精度計算本命盤，並由 AI 產生繁體中文解讀。
            </p>
          </CardContent>
        </Card>

        {result && i && (
          <div className="mt-8 space-y-6">
            {/* Big three */}
            <Card className="bg-gradient-to-br from-sky-500/10 to-indigo-500/10 border-sky-300/30">
              <CardHeader><CardTitle className="text-sky-200">☀️ 三大主軸</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-3xl">☀️</div>
                  <div className="text-xs text-slate-400">太陽（自我）</div>
                  <div className="text-lg font-semibold text-slate-100">{signName(result.big_three.sun?.sign)}</div>
                  {result.big_three.sun && <div className="text-xs text-slate-400">第 {result.big_three.sun.house} 宮</div>}
                </div>
                <div>
                  <div className="text-3xl">🌙</div>
                  <div className="text-xs text-slate-400">月亮（情感）</div>
                  <div className="text-lg font-semibold text-slate-100">{signName(result.big_three.moon?.sign)}</div>
                  {result.big_three.moon && <div className="text-xs text-slate-400">第 {result.big_three.moon.house} 宮</div>}
                </div>
                <div>
                  <div className="text-3xl">⬆️</div>
                  <div className="text-xs text-slate-400">上升（外顯）</div>
                  <div className="text-lg font-semibold text-slate-100">{signName(result.big_three.ascendant?.sign)}</div>
                </div>
              </CardContent>
            </Card>

            {/* Interpretations */}
            {[
              { title: "🌟 核心自我", body: i.core_identity },
              { title: "🧬 性格特質", body: i.personality },
              { title: "💖 愛情關係", body: i.love },
              { title: "💼 事業天賦", body: i.career },
              { title: "💰 財富傾向", body: i.wealth },
              { title: "🧘 健康能量", body: i.health },
              { title: "🌌 人生主題", body: i.life_theme },
              { title: "🧭 星象建議", body: i.advice },
            ].map((s) => (
              <Card key={s.title} className="bg-white/5 border-white/10">
                <CardHeader><CardTitle className="text-slate-100 text-base">{s.title}</CardTitle></CardHeader>
                <CardContent className="text-sm text-slate-200 whitespace-pre-line leading-relaxed">{s.body}</CardContent>
              </Card>
            ))}

            {/* Lucky */}
            <Card className="bg-gradient-to-br from-amber-500/10 to-pink-500/10 border-amber-300/30">
              <CardHeader><CardTitle className="text-amber-200">🍀 幸運指引</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-slate-100">
                <div><div className="text-xs text-slate-400">幸運色</div>{i.lucky?.colors}</div>
                <div><div className="text-xs text-slate-400">幸運數字</div>{i.lucky?.numbers}</div>
                <div><div className="text-xs text-slate-400">有利方向</div>{i.lucky?.direction}</div>
                <div><div className="text-xs text-slate-400">幸運寶石</div>{i.lucky?.gemstone}</div>
              </CardContent>
            </Card>

            {/* Planets table */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader><CardTitle className="text-slate-100 text-base">🪐 行星位置</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {result.planets.map((p) => (
                    <div key={p.name} className="flex justify-between bg-white/5 rounded px-2 py-1">
                      <span className="text-slate-300">{planetName(p.name)}{p.retrograde ? "℞" : ""}</span>
                      <span className="text-slate-100">{signName(p.sign)} · {p.pos?.toFixed(1)}° · {p.house}宮</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Oracle */}
            <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-300/30">
              <CardContent className="pt-6 text-center italic text-lg text-indigo-100">
                🔮 {i.oracle}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Astro;
