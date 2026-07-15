import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Chiron: "凱龍", Mean_Node: "北交點", True_Node: "北交點", Mean_South_Node: "南交點", Lilith: "莉莉絲",
};
const signName = (s?: string) => (s ? SIGN_ZH[s] || s : "—");
const planetName = (p?: string) => (p ? PLANET_ZH[p] || p : "—");

interface Birth {
  name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  timeKnown: "true" | "false";
  city: string;
  sex: "M" | "F";
}

const DEFAULT_BIRTH: Birth = {
  name: "訪客", date: "1995-06-15", time: "12:00", timeKnown: "true", city: "Hong Kong", sex: "M",
};

const loadBirth = (): Birth => {
  try {
    const raw = localStorage.getItem("astro:birth");
    if (raw) return { ...DEFAULT_BIRTH, ...JSON.parse(raw) };
  } catch { /* noop */ }
  return DEFAULT_BIRTH;
};

const birthToPayload = (b: Birth) => {
  const [y, m, d] = b.date.split("-").map(Number);
  const [hh, mm] = (b.time || "12:00").split(":").map(Number);
  return {
    name: b.name || "訪客",
    year: y, month: m, day: d,
    hour: hh, minute: mm,
    city: b.city, sex: b.sex,
    time_known: b.timeKnown === "true",
  };
};

// ---------- Shared Birth Form ----------
const BirthForm = ({ birth, setBirth, showSex = false }: { birth: Birth; setBirth: (b: Birth) => void; showSex?: boolean }) => (
  <div className="grid md:grid-cols-2 gap-4">
    <div>
      <Label className="text-slate-300 mb-2 block">姓名</Label>
      <Input value={birth.name} onChange={(e) => setBirth({ ...birth, name: e.target.value })} className="bg-white/10 border-white/20 text-slate-100" />
    </div>
    <div>
      <Label className="text-slate-300 mb-2 block">出生城市</Label>
      <Input value={birth.city} onChange={(e) => setBirth({ ...birth, city: e.target.value })} className="bg-white/10 border-white/20 text-slate-100" />
    </div>
    <div>
      <Label className="text-slate-300 mb-2 block">出生日期</Label>
      <Input type="date" value={birth.date} onChange={(e) => setBirth({ ...birth, date: e.target.value })} className="bg-white/10 border-white/20 text-slate-100" />
    </div>
    <div>
      <Label className="text-slate-300 mb-2 block">出生時間</Label>
      <Input type="time" value={birth.time} onChange={(e) => setBirth({ ...birth, time: e.target.value })} className="bg-white/10 border-white/20 text-slate-100" disabled={birth.timeKnown === "false"} />
    </div>
    <div>
      <Label className="text-slate-300 mb-2 block">時間準確？</Label>
      <Select value={birth.timeKnown} onValueChange={(v) => setBirth({ ...birth, timeKnown: v as any })}>
        <SelectTrigger className="bg-white/10 border-white/20 text-slate-100"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="true">知道（推薦）</SelectItem>
          <SelectItem value="false">不知道</SelectItem>
        </SelectContent>
      </Select>
    </div>
    {showSex && (
      <div>
        <Label className="text-slate-300 mb-2 block">性別（八字必需）</Label>
        <Select value={birth.sex} onValueChange={(v) => setBirth({ ...birth, sex: v as any })}>
          <SelectTrigger className="bg-white/10 border-white/20 text-slate-100"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="M">男</SelectItem>
            <SelectItem value="F">女</SelectItem>
          </SelectContent>
        </Select>
      </div>
    )}
  </div>
);

const RunButton = ({ loading, onClick, label = "開始占算" }: { loading: boolean; onClick: () => void; label?: string }) => (
  <Button onClick={onClick} disabled={loading} className="w-full mt-4 bg-gradient-to-r from-sky-500 to-indigo-500 hover:opacity-90">
    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 計算中...</> : <><Sparkles className="w-4 h-4 mr-2" /> {label}</>}
  </Button>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card className="bg-white/5 border-white/10">
    <CardHeader><CardTitle className="text-slate-100 text-base">{title}</CardTitle></CardHeader>
    <CardContent className="text-sm text-slate-200 whitespace-pre-line leading-relaxed">{children}</CardContent>
  </Card>
);

// ---------- Tabs ----------

// 1. Natal (uses existing astro-reading)
const NatalTab = ({ birth }: { birth: Birth }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const run = async () => {
    setLoading(true); setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("astro-reading", { body: birthToPayload(birth) });
      if (error) throw error;
      if (data?.errcode !== 0) { toast.error(data?.errmsg || "失敗"); return; }
      setResult(data.data);
    } catch (e) { console.error(e); toast.error("網絡錯誤"); }
    finally { setLoading(false); }
  };
  const i = result?.interpretation;
  return (
    <div className="space-y-4">
      <RunButton loading={loading} onClick={run} label="開始本命盤解讀" />
      {result && i && (
        <div className="space-y-4">
          <Card className="bg-gradient-to-br from-sky-500/10 to-indigo-500/10 border-sky-300/30">
            <CardHeader><CardTitle className="text-sky-200">☀️ 三大主軸</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-4 text-center">
              <div><div className="text-3xl">☀️</div><div className="text-xs text-slate-400">太陽</div><div className="text-lg font-semibold">{signName(result.big_three.sun?.sign)}</div></div>
              <div><div className="text-3xl">🌙</div><div className="text-xs text-slate-400">月亮</div><div className="text-lg font-semibold">{signName(result.big_three.moon?.sign)}</div></div>
              <div><div className="text-3xl">⬆️</div><div className="text-xs text-slate-400">上升</div><div className="text-lg font-semibold">{signName(result.big_three.ascendant?.sign)}</div></div>
            </CardContent>
          </Card>
          <Section title="🌟 核心自我">{i.core_identity}</Section>
          <Section title="🧬 性格特質">{i.personality}</Section>
          <Section title="💖 愛情關係">{i.love}</Section>
          <Section title="💼 事業天賦">{i.career}</Section>
          <Section title="💰 財富傾向">{i.wealth}</Section>
          <Section title="🧘 健康能量">{i.health}</Section>
          <Section title="🌌 人生主題">{i.life_theme}</Section>
          <Section title="🧭 星象建議">{i.advice}</Section>
          <Card className="bg-gradient-to-br from-amber-500/10 to-pink-500/10 border-amber-300/30">
            <CardHeader><CardTitle className="text-amber-200">🍀 幸運指引</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><div className="text-xs text-slate-400">幸運色</div>{i.lucky?.colors}</div>
              <div><div className="text-xs text-slate-400">幸運數字</div>{i.lucky?.numbers}</div>
              <div><div className="text-xs text-slate-400">有利方向</div>{i.lucky?.direction}</div>
              <div><div className="text-xs text-slate-400">幸運寶石</div>{i.lucky?.gemstone}</div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardHeader><CardTitle className="text-slate-100 text-base">🪐 行星位置</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                {result.planets.map((p: any) => (
                  <div key={p.name} className="flex justify-between bg-white/5 rounded px-2 py-1">
                    <span className="text-slate-300">{planetName(p.name)}{p.retrograde ? "℞" : ""}</span>
                    <span className="text-slate-100">{signName(p.sign)} · {p.pos?.toFixed(1)}° · {p.house}宮</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-300/30">
            <CardContent className="pt-6 text-center italic text-lg text-indigo-100">🔮 {i.oracle}</CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// 2. SVG Chart
const SvgTab = ({ birth }: { birth: Birth }) => {
  const [loading, setLoading] = useState(false);
  const [svg, setSvg] = useState<string | null>(null);
  const run = async () => {
    setLoading(true); setSvg(null);
    try {
      const { data, error } = await supabase.functions.invoke("astro-tools", { body: { action: "svg", payload: birthToPayload(birth) } });
      if (error) throw error;
      if (data?.errcode !== 0) { toast.error(data?.errmsg || "失敗"); return; }
      setSvg(data.data.svg);
    } catch (e) { console.error(e); toast.error("網絡錯誤"); }
    finally { setLoading(false); }
  };
  const download = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${birth.name || 'natal'}-chart.svg`; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-4">
      <RunButton loading={loading} onClick={run} label="生成星盤圖" />
      {svg && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-slate-100 text-base">🎨 {birth.name} 的本命星盤圖</CardTitle>
            <Button size="sm" variant="outline" onClick={download}>⬇ 下載 SVG</Button>
          </CardHeader>
          <CardContent>
            <div className="bg-white rounded-lg overflow-hidden p-2" dangerouslySetInnerHTML={{ __html: svg }} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// 3. Daily
const DailyTab = ({ birth }: { birth: Birth }) => {
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [result, setResult] = useState<any>(null);
  const run = async () => {
    setLoading(true); setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("astro-tools", { body: { action: "daily", payload: { ...birthToPayload(birth), date } } });
      if (error) throw error;
      if (data?.errcode !== 0) { toast.error(data?.errmsg || "失敗"); return; }
      setResult(data.data);
    } catch (e) { console.error(e); toast.error("網絡錯誤"); }
    finally { setLoading(false); }
  };
  const scores = result?.raw?.data?.scores;
  const i = result?.interpretation;
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-slate-300 mb-2 block">查詢日期</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-white/10 border-white/20 text-slate-100" />
      </div>
      <RunButton loading={loading} onClick={run} label="查看今日運勢" />
      {result && i && (
        <div className="space-y-4">
          {scores && (
            <Card className="bg-gradient-to-br from-sky-500/10 to-indigo-500/10 border-sky-300/30">
              <CardHeader><CardTitle className="text-sky-200">📊 今日運勢分數</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-5 gap-2 text-center">
                {["overall", "love", "career", "money", "health"].map((k) => (
                  <div key={k}>
                    <div className="text-2xl font-bold text-slate-100">{scores[k] ?? "—"}</div>
                    <div className="text-xs text-slate-400">{({ overall: "整體", love: "愛情", career: "事業", money: "財運", health: "健康" } as any)[k]}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          <Section title="🌟 今日總覽">{i.summary}</Section>
          <Section title="💖 愛情">{i.love}</Section>
          <Section title="💼 事業">{i.career}</Section>
          <Section title="💰 財運">{i.money}</Section>
          <Section title="🧘 健康">{i.health}</Section>
          <Card className="bg-gradient-to-br from-amber-500/10 to-pink-500/10 border-amber-300/30">
            <CardContent className="pt-6 text-center italic text-lg text-amber-100">🔮 {i.advice}</CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// 4. Weekly
const WeeklyTab = ({ birth }: { birth: Birth }) => {
  const [loading, setLoading] = useState(false);
  const [weekStart, setWeekStart] = useState(new Date().toISOString().slice(0, 10));
  const [result, setResult] = useState<any>(null);
  const run = async () => {
    setLoading(true); setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("astro-tools", { body: { action: "weekly", payload: { ...birthToPayload(birth), week_start: weekStart } } });
      if (error) throw error;
      if (data?.errcode !== 0) { toast.error(data?.errmsg || "失敗"); return; }
      setResult(data.data);
    } catch (e) { console.error(e); toast.error("網絡錯誤"); }
    finally { setLoading(false); }
  };
  const i = result?.interpretation;
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-slate-300 mb-2 block">週開始日期</Label>
        <Input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className="bg-white/10 border-white/20 text-slate-100" />
      </div>
      <RunButton loading={loading} onClick={run} label="查看本週運勢" />
      {result && i && (
        <div className="space-y-4">
          <Section title="🌌 本週總覽">{i.summary}</Section>
          {Array.isArray(i.highlights) && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader><CardTitle className="text-slate-100 text-base">⭐ 關鍵日重點</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-200">
                {i.highlights.map((h: string, idx: number) => <div key={idx} className="border-l-2 border-sky-400 pl-3">{h}</div>)}
              </CardContent>
            </Card>
          )}
          <Section title="💖 愛情人際">{i.love}</Section>
          <Section title="💼 事業學業">{i.career}</Section>
          <Section title="💰 財富">{i.money}</Section>
          <Card className="bg-gradient-to-br from-amber-500/10 to-pink-500/10 border-amber-300/30">
            <CardContent className="pt-6 text-center italic text-lg text-amber-100">🔮 {i.advice}</CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// 5. Transits
const TransitsTab = ({ birth }: { birth: Birth }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const run = async () => {
    setLoading(true); setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("astro-tools", { body: { action: "transits", payload: { natal: birthToPayload(birth) } } });
      if (error) throw error;
      if (data?.errcode !== 0) { toast.error(data?.errmsg || "失敗"); return; }
      setResult(data.data);
    } catch (e) { console.error(e); toast.error("網絡錯誤"); }
    finally { setLoading(false); }
  };
  const i = result?.interpretation;
  return (
    <div className="space-y-4">
      <RunButton loading={loading} onClick={run} label="查看當前流年" />
      {result && i && (
        <div className="space-y-4">
          <Section title="🌠 當前宇宙氣場">{i.summary}</Section>
          {Array.isArray(i.key_transits) && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader><CardTitle className="text-slate-100 text-base">🔭 重點行運相位</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-200">
                {i.key_transits.map((t: any, idx: number) => (
                  <div key={idx} className="border-l-2 border-purple-400 pl-3">
                    <div className="font-semibold text-purple-200">{t.title}</div>
                    <div className="text-xs text-slate-400 mb-1">{t.period}</div>
                    <div>{t.meaning}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          <Section title="✨ 機會">{i.opportunities}</Section>
          <Section title="⚠️ 注意事項">{i.cautions}</Section>
          <Card className="bg-gradient-to-br from-amber-500/10 to-pink-500/10 border-amber-300/30">
            <CardContent className="pt-6 text-center italic text-lg text-amber-100">🔮 {i.advice}</CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// 6. Synastry
const SynastryTab = ({ birth }: { birth: Birth }) => {
  const [personB, setPersonB] = useState<Birth>({ ...DEFAULT_BIRTH, name: "對方", date: "1993-08-20" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const run = async () => {
    setLoading(true); setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("astro-tools", { body: { action: "synastry", payload: { person_a: birthToPayload(birth), person_b: birthToPayload(personB) } } });
      if (error) throw error;
      if (data?.errcode !== 0) { toast.error(data?.errmsg || "失敗"); return; }
      setResult(data.data);
    } catch (e) { console.error(e); toast.error("網絡錯誤"); }
    finally { setLoading(false); }
  };
  const i = result?.interpretation;
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-pink-500/10 border border-pink-300/20">
        <div className="text-pink-200 font-semibold mb-3">💑 對方的出生資料</div>
        <BirthForm birth={personB} setBirth={setPersonB} />
      </div>
      <RunButton loading={loading} onClick={run} label="開始合盤配對" />
      {result && i && (
        <div className="space-y-4">
          <Card className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 border-pink-300/30">
            <CardHeader><CardTitle className="text-pink-200">💕 關係原型</CardTitle></CardHeader>
            <CardContent className="text-slate-100">{i.archetype}</CardContent>
          </Card>
          {i.scores && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader><CardTitle className="text-slate-100 text-base">📊 契合分數</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-5 gap-2 text-center">
                {[["overall", "整體"], ["romance", "浪漫"], ["communication", "溝通"], ["stability", "穩定"], ["growth", "成長"]].map(([k, l]) => (
                  <div key={k}>
                    <div className="text-2xl font-bold text-slate-100">{i.scores[k] ?? "—"}</div>
                    <div className="text-xs text-slate-400">{l}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          <Section title="✅ 關係優勢">{i.strengths}</Section>
          <Section title="⚠️ 潛在挑戰">{i.challenges}</Section>
          {Array.isArray(i.key_aspects) && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader><CardTitle className="text-slate-100 text-base">🔭 關鍵相位</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-200">
                {i.key_aspects.map((k: string, idx: number) => <div key={idx} className="border-l-2 border-pink-400 pl-3">{k}</div>)}
              </CardContent>
            </Card>
          )}
          <Section title="💝 維繫建議">{i.advice}</Section>
        </div>
      )}
    </div>
  );
};

// 7. BaZi
const BaziTab = ({ birth }: { birth: Birth }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const run = async () => {
    setLoading(true); setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("astro-tools", { body: { action: "bazi", payload: birthToPayload(birth) } });
      if (error) throw error;
      if (data?.errcode !== 0) { toast.error(data?.errmsg || "失敗"); return; }
      setResult(data.data);
    } catch (e) { console.error(e); toast.error("網絡錯誤"); }
    finally { setLoading(false); }
  };
  const raw = result?.raw;
  const i = result?.interpretation;
  return (
    <div className="space-y-4">
      <RunButton loading={loading} onClick={run} label="排八字四柱" />
      {result && i && (
        <div className="space-y-4">
          {Array.isArray(raw?.pillars) && (
            <Card className="bg-gradient-to-br from-red-500/10 to-yellow-500/10 border-red-300/30">
              <CardHeader><CardTitle className="text-yellow-200">🀄 四柱八字</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-4 gap-3 text-center">
                {raw.pillars.map((p: any) => (
                  <div key={p.label} className="bg-black/30 rounded-lg p-3">
                    <div className="text-xs text-slate-400">{({ year: "年柱", month: "月柱", day: "日柱", hour: "時柱" } as any)[p.label] || p.label}</div>
                    <div className="text-3xl font-bold text-yellow-300 mt-2">{p.gan}</div>
                    <div className="text-3xl font-bold text-red-300">{p.zhi}</div>
                    <div className="text-xs text-slate-400 mt-2">{p.nayin}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {raw?.day_master && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader><CardTitle className="text-slate-100 text-base">日主</CardTitle></CardHeader>
              <CardContent className="text-slate-200 text-sm">
                日主：<span className="text-yellow-300 text-xl font-bold">{raw.day_master.stem}</span> · {raw.day_master.info?.name} · 五行：{raw.day_master.info?.element}
              </CardContent>
            </Card>
          )}
          <Section title="🌊 日主分析">{i.day_master}</Section>
          <Section title="🧬 性格特質">{i.personality}</Section>
          <Section title="💼 事業運">{i.career}</Section>
          <Section title="💰 財運">{i.wealth}</Section>
          <Section title="💖 感情婚姻">{i.love}</Section>
          <Section title="🧘 健康">{i.health}</Section>
          <Section title="🌀 當前大運">{i.luck_cycle}</Section>
          <Card className="bg-gradient-to-br from-amber-500/10 to-pink-500/10 border-amber-300/30">
            <CardHeader><CardTitle className="text-amber-200">🍀 喜用神與利勢</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-slate-100">
              <div><div className="text-xs text-slate-400">喜用神</div>{i.favorable?.elements}</div>
              <div><div className="text-xs text-slate-400">利色</div>{i.favorable?.colors}</div>
              <div><div className="text-xs text-slate-400">利方位</div>{i.favorable?.direction}</div>
              <div><div className="text-xs text-slate-400">利數字</div>{i.favorable?.numbers}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-300/30">
            <CardContent className="pt-6 text-center italic text-lg text-indigo-100">🔮 {i.advice}</CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// ---------- Page ----------
const Astro = () => {
  const [birth, setBirth] = useState<Birth>(loadBirth());
  useEffect(() => { localStorage.setItem("astro:birth", JSON.stringify(birth)); }, [birth]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-300 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> 返回首頁
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Star className="w-6 h-6 text-sky-300" /> 玄學總站
          </h1>
          <div className="w-16" />
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur mb-6">
          <CardHeader>
            <CardTitle className="text-slate-100 text-base">你的出生資料（自動儲存）</CardTitle>
          </CardHeader>
          <CardContent>
            <BirthForm birth={birth} setBirth={setBirth} showSex />
          </CardContent>
        </Card>

        <Tabs defaultValue="natal" className="w-full">
          <TabsList className="grid grid-cols-4 md:grid-cols-7 bg-white/5 mb-4 h-auto">
            <TabsTrigger value="natal">🌟 本命盤</TabsTrigger>
            <TabsTrigger value="svg">🎨 星盤圖</TabsTrigger>
            <TabsTrigger value="daily">📅 每日</TabsTrigger>
            <TabsTrigger value="weekly">📆 每週</TabsTrigger>
            <TabsTrigger value="transits">🌠 流年</TabsTrigger>
            <TabsTrigger value="synastry">💑 合盤</TabsTrigger>
            <TabsTrigger value="bazi">🀄 八字</TabsTrigger>
          </TabsList>

          <TabsContent value="natal"><NatalTab birth={birth} /></TabsContent>
          <TabsContent value="svg"><SvgTab birth={birth} /></TabsContent>
          <TabsContent value="daily"><DailyTab birth={birth} /></TabsContent>
          <TabsContent value="weekly"><WeeklyTab birth={birth} /></TabsContent>
          <TabsContent value="transits"><TransitsTab birth={birth} /></TabsContent>
          <TabsContent value="synastry"><SynastryTab birth={birth} /></TabsContent>
          <TabsContent value="bazi"><BaziTab birth={birth} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Astro;
