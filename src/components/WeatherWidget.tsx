import { useEffect, useState, useCallback } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, MapPin, Wind, Droplets, Gauge, Sunrise, Sunset, Thermometer } from "lucide-react";

const CACHE_KEY = "weather-cache-v2";
const CACHE_TTL = 15 * 60 * 1000;

interface WeatherData {
  ip?: string;
  location?: {
    city?: string;
    region?: string;
    country?: string;
    country_code?: string;
    lat?: number;
    lon?: number;
    timezone?: string;
  };
  current?: any;
  forecast?: any;
  air?: any;
  fetched_at?: string;
  error?: string;
}

const aqiLabel = (aqi?: number) => {
  switch (aqi) {
    case 1: return { text: "優", color: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30" };
    case 2: return { text: "良好", color: "bg-lime-500/20 text-lime-600 border-lime-500/30" };
    case 3: return { text: "中等", color: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30" };
    case 4: return { text: "差", color: "bg-orange-500/20 text-orange-600 border-orange-500/30" };
    case 5: return { text: "很差", color: "bg-red-500/20 text-red-600 border-red-500/30" };
    default: return { text: "無資料", color: "bg-muted text-muted-foreground" };
  }
};

const formatTime = (unix?: number, tz?: number) => {
  if (!unix) return "--:--";
  const d = new Date((unix + (tz ?? 0)) * 1000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};

const iconUrl = (icon?: string, size: "2x" | "4x" = "2x") =>
  icon ? `https://openweathermap.org/img/wn/${icon}@${size}.png` : "";

const groupDailyForecast = (list: any[] = []) => {
  const days: Record<string, any[]> = {};
  list.forEach((item) => {
    const day = item.dt_txt?.split(" ")[0];
    if (!day) return;
    if (!days[day]) days[day] = [];
    days[day].push(item);
  });
  return Object.entries(days).slice(0, 5).map(([date, items]) => {
    const temps = items.map((i) => i.main.temp);
    const noon = items.find((i) => i.dt_txt.includes("12:00:00")) || items[Math.floor(items.length / 2)];
    return {
      date,
      min: Math.min(...items.map((i) => i.main.temp_min)),
      max: Math.max(...items.map((i) => i.main.temp_max)),
      icon: noon.weather[0]?.icon,
      desc: noon.weather[0]?.description,
      pop: Math.max(...items.map((i) => i.pop ?? 0)),
    };
  });
};

const WeatherWidget = () => {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (force = false) => {
    if (!force) {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const cached = JSON.parse(raw);
          if (Date.now() - cached.ts < CACHE_TTL && cached.data?.current?.main) {
            setData(cached.data);
            return;
          }
        }
      } catch {}
    }
    setLoading(true);
    try {
      // Step 1: lookup client IP + geo from browser (真實 client IP，唔會經 Supabase 機房)
      let geo: any = {};
      try {
        const geoRes = await fetch("https://ipapi.co/json/");
        if (geoRes.ok) geo = await geoRes.json();
      } catch (e) {
        console.warn("ipapi lookup failed, falling back to server-side", e);
      }

      // Step 2: pass coords to edge function
      const { data: res, error } = await supabase.functions.invoke("weather", {
        body: {
          lat: geo.latitude,
          lon: geo.longitude,
          ip: geo.ip,
          city: geo.city,
          region: geo.region,
          country: geo.country_name,
          country_code: geo.country_code,
          timezone: geo.timezone,
        },
      });
      if (error) {
        const details = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
        throw new Error(details || "天氣載入失敗");
      }
      if (res?.error || !res?.current?.main) throw new Error(res?.error || "天氣資料不完整");
      setData(res);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: res }));
    } catch (e) {
      console.error("weather load failed", e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const city = data?.location?.city;
  const temp = data?.current?.main?.temp;
  const icon = data?.current?.weather?.[0]?.icon;
  const desc = data?.current?.weather?.[0]?.description;
  const tz = data?.current?.timezone;
  const daily = groupDailyForecast(data?.forecast?.list);
  const aqiIdx = data?.air?.list?.[0]?.main?.aqi;
  const aqi = aqiLabel(aqiIdx);
  const uvi = data?.current?.uvi;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20">
          {icon ? (
            <img src={iconUrl(icon)} alt="" className="w-6 h-6 -my-1" />
          ) : (
            <span>☁️</span>
          )}
          <span className="text-xs font-medium">
            {city || (loading ? "載入中" : "天氣")}
          </span>
          {typeof temp === "number" && (
            <span className="text-xs font-bold">{Math.round(temp)}°</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0 overflow-hidden">
        {!data ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {loading ? "偵測位置中..." : "無天氣資料"}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Header */}
            <div className="p-4 bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border-b border-border/50">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    {data.location?.city}, {data.location?.country}
                  </div>
                  <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                    IP: {data.ip}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => load(true)}
                  disabled={loading}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
              <div className="flex items-center gap-3 mt-2">
                {icon && <img src={iconUrl(icon, "4x")} alt="" className="w-16 h-16 -my-2" />}
                <div>
                  <div className="text-4xl font-bold">{Math.round(temp ?? 0)}°</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                  <div className="text-[10px] text-muted-foreground">
                    體感 {Math.round(data.current?.main?.feels_like ?? 0)}°
                  </div>
                </div>
              </div>
            </div>

            {/* Current details */}
            <div className="px-4 grid grid-cols-3 gap-2 text-xs">
              <div className="flex flex-col items-center p-2 rounded bg-muted/40">
                <Droplets className="w-3.5 h-3.5 text-sky-500 mb-1" />
                <span className="text-[10px] text-muted-foreground">濕度</span>
                <span className="font-semibold">{data.current?.main?.humidity}%</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded bg-muted/40">
                <Wind className="w-3.5 h-3.5 text-sky-500 mb-1" />
                <span className="text-[10px] text-muted-foreground">風速</span>
                <span className="font-semibold">{Math.round((data.current?.wind?.speed ?? 0) * 3.6)} km/h</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded bg-muted/40">
                <Gauge className="w-3.5 h-3.5 text-sky-500 mb-1" />
                <span className="text-[10px] text-muted-foreground">氣壓</span>
                <span className="font-semibold">{data.current?.main?.pressure} hPa</span>
              </div>
            </div>

            {/* Life indices */}
            <div className="px-4 grid grid-cols-3 gap-2 text-xs">
              <div className="flex flex-col items-center p-2 rounded bg-muted/40">
                <span className="text-[10px] text-muted-foreground mb-1">空氣</span>
                <Badge variant="outline" className={`${aqi.color} text-[10px] px-1.5 py-0`}>{aqi.text}</Badge>
              </div>
              <div className="flex flex-col items-center p-2 rounded bg-muted/40">
                <Sunrise className="w-3.5 h-3.5 text-amber-500 mb-1" />
                <span className="text-[10px] text-muted-foreground">日出</span>
                <span className="font-semibold">{formatTime(data.current?.sys?.sunrise, tz)}</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded bg-muted/40">
                <Sunset className="w-3.5 h-3.5 text-orange-500 mb-1" />
                <span className="text-[10px] text-muted-foreground">日落</span>
                <span className="font-semibold">{formatTime(data.current?.sys?.sunset, tz)}</span>
              </div>
            </div>

            {/* Forecast */}
            {daily.length > 0 && (
              <div className="px-4 pb-4">
                <div className="text-xs font-semibold mb-2 text-muted-foreground">未來 5 日預測</div>
                <div className="grid grid-cols-5 gap-1">
                  {daily.map((d) => {
                    const dt = new Date(d.date);
                    const label = ["日", "一", "二", "三", "四", "五", "六"][dt.getDay()];
                    return (
                      <div key={d.date} className="flex flex-col items-center p-1.5 rounded bg-muted/40">
                        <span className="text-[10px] text-muted-foreground">週{label}</span>
                        {d.icon && <img src={iconUrl(d.icon)} alt="" className="w-8 h-8" />}
                        <span className="text-[11px] font-semibold">{Math.round(d.max)}°</span>
                        <span className="text-[10px] text-muted-foreground">{Math.round(d.min)}°</span>
                        {d.pop > 0 && (
                          <span className="text-[9px] text-sky-500">💧{Math.round(d.pop * 100)}%</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="px-4 pb-2 text-[10px] text-muted-foreground/60 text-center">
              資料來源：OpenWeatherMap · ipapi.co
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default WeatherWidget;
