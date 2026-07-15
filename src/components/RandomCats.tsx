import { useEffect, useState } from "react";

const CAT_API_KEY = "live_fIkfeXKT79pamUmW0kvayxjDHFem9f5iama8mDlBdyVg3fzsCP30gifLS80g5kfA";
const CACHE_KEY = "catman:random-cats";

interface CatImage {
  id: string;
  url: string;
}

const fetchOneCat = async (): Promise<CatImage> => {
  const res = await fetch(
    `https://api.thecatapi.com/v1/images/search?limit=1&size=med&mime_types=jpg,png`,
    { headers: { "x-api-key": CAT_API_KEY } }
  );
  if (!res.ok) throw new Error("cat api failed");
  const data = await res.json();
  return data[0];
};

const CatFrame = ({
  cat,
  side,
  loading,
  onClick,
}: {
  cat?: CatImage;
  side: "left" | "right";
  loading: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading}
    aria-label="換一張貓咪圖"
    title="點擊換一張貓咪圖"
    className={`relative shrink-0 w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden border border-cat-orange/30 shadow-glow bg-card/40 backdrop-blur transition-all hover:scale-105 hover:shadow-xl cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
      side === "left" ? "rotate-[-4deg]" : "rotate-[4deg]"
    }`}
  >
    {cat && !loading ? (
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
  </button>
);

const saveCache = (cats: CatImage[]) => {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ data: cats, ts: Date.now() }));
};

const RandomCats = () => {
  const [cats, setCats] = useState<CatImage[]>([]);
  const [loading, setLoading] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, ts } = JSON.parse(cached);
          if (Array.isArray(data) && data.length === 2) {
            setCats(data);
            if (Date.now() - ts < 1000 * 60 * 10) return;
          }
        }
        const [first, second] = await Promise.all([fetchOneCat(), fetchOneCat()]);
        const data = [first, second];
        setCats(data);
        saveCache(data);
      } catch (e) {
        console.error("Failed to load cat images", e);
      }
    };
    load();
  }, []);

  const refreshCat = async (index: number) => {
    if (loading[index]) return;
    setLoading((prev) => ({ ...prev, [index]: true }));
    try {
      const newCat = await fetchOneCat();
      setCats((prev) => {
        const updated = [...prev];
        updated[index] = newCat;
        saveCache(updated);
        return updated;
      });
    } catch (e) {
      console.error("Failed to refresh cat image", e);
    } finally {
      setLoading((prev) => ({ ...prev, [index]: false }));
    }
  };

  return (
    <div className="flex items-center justify-center gap-4 md:gap-8">
      <CatFrame
        cat={cats[0]}
        side="left"
        loading={loading[0]}
        onClick={() => refreshCat(0)}
      />
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold text-foreground">歡迎回來！ 🎉</h2>
        <p className="text-xl text-muted-foreground">
          會員權限系統已啟用，享受個人化的內容體驗
        </p>
      </div>
      <CatFrame
        cat={cats[1]}
        side="right"
        loading={loading[1]}
        onClick={() => refreshCat(1)}
      />
    </div>
  );
};

export default RandomCats;
