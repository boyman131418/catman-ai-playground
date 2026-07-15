import { useEffect, useState } from "react";

const CAT_API_KEY = "live_fIkfeXKT79pamUmW0kvayxjDHFem9f5iama8mDlBdyVg3fzsCP30gifLS80g5kfA";
const CACHE_KEY = "catman:random-cats";
const CACHE_TTL = 1000 * 60 * 10; // 10 分鐘快取，避免每次載入都打 API

interface CatImage {
  id: string;
  url: string;
}

const fetchCats = async (count = 2): Promise<CatImage[]> => {
  const res = await fetch(
    `https://api.thecatapi.com/v1/images/search?limit=${count}&size=med&mime_types=jpg,png`,
    { headers: { "x-api-key": CAT_API_KEY } }
  );
  if (!res.ok) throw new Error("cat api failed");
  return res.json();
};

const CatFrame = ({ cat, side }: { cat?: CatImage; side: "left" | "right" }) => (
  <div
    className={`relative shrink-0 w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden border border-cat-orange/30 shadow-glow bg-card/40 backdrop-blur transition-transform hover:scale-105 ${
      side === "left" ? "rotate-[-4deg]" : "rotate-[4deg]"
    }`}
  >
    {cat ? (
      <img
        src={cat.url}
        alt="隨機貓咪"
        loading="lazy"
        className="w-full h-full object-cover"
      />
    ) : (
      <div className="w-full h-full flex items-center justify-center text-3xl animate-pulse">
        🐱
      </div>
    )}
  </div>
);

const RandomCats = () => {
  const [cats, setCats] = useState<CatImage[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, ts } = JSON.parse(cached);
          if (Date.now() - ts < CACHE_TTL && Array.isArray(data) && data.length === 2) {
            setCats(data);
            return;
          }
        }
        const data = await fetchCats(2);
        setCats(data);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
      } catch (e) {
        console.error("Failed to load cat images", e);
      }
    };
    load();
  }, []);

  return (
    <div className="flex items-center justify-center gap-4 md:gap-8">
      <CatFrame cat={cats[0]} side="left" />
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold text-foreground">歡迎回來！ 🎉</h2>
        <p className="text-xl text-muted-foreground">
          會員權限系統已啟用，享受個人化的內容體驗
        </p>
      </div>
      <CatFrame cat={cats[1]} side="right" />
    </div>
  );
};

export default RandomCats;
