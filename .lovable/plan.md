## 目標
喺 Dashboard header 右上角加一個小巧嘅天氣 widget，透過 IP 自動偵測用戶位置，顯示當前天氣同詳細預測資訊。點擊 widget 可展開完整面板睇 5 日預測、AQI、日出日落、UV 等。

## 用戶體驗

**Header widget（收起狀態）**
- 位於「西方占星」按鈕左邊
- 顯示：天氣圖示 + 城市名 + 當前溫度（例：☀️ 香港 28°）
- 點擊展開浮動彈窗（Popover）

**展開浮動面板**
- 頂部：城市、國家、IP 地址（細字）
- 當前天氣區：大溫度、體感溫度、天氣描述、濕度、風速、氣壓
- 生活指數區：AQI 空氣質素（帶顏色標籤）、UV 指數、日出 / 日落時間
- 5 日預測：橫向捲動卡片，每日顯示圖示、最高/最低溫、降雨機率
- 底部：資料來源標示

## 技術實作

**新 Edge Function：`weather`**
- 位置：`supabase/functions/weather/index.ts`
- 輸入：讀取 request 嘅 `x-forwarded-for` / `cf-connecting-ip` 取用戶真實 IP（fallback 用 query param）
- 流程：
  1. 用 `https://ipapi.co/{ip}/json/` 拎經緯度 + 城市 + 國家 + IP
  2. 並行呼叫 OpenWeatherMap：
     - `/data/2.5/weather`（當前天氣，含日出日落）
     - `/data/2.5/forecast`（5 日 / 3 小時預測，前端聚合為每日）
     - `/data/2.5/air_pollution`（AQI）
     - `/data/2.5/uvi` 已停用 → 改用 One Call 3.0 嘅 UV，或喺 forecast response 攞。改用免費穩定方案：跳過獨立 UV endpoint，喺 current weather response 取 `uvi` 若可用，否則唔顯示
  3. 統一回傳 JSON：`{ ip, location, current, forecast, air, sun }`
- 用 `units=metric`、`lang=zh_tw`
- 加 CORS headers（跟現有 edge functions 一致）
- 用 `Deno.env.get('OPENWEATHER_API_KEY')`

**Secret 設定**
- 新增 runtime secret `OPENWEATHER_API_KEY` = `544abb55e3306ac87d6b5467b0563f91`（用 set_secret，用戶已於 chat 提供）

**前端組件：`src/components/WeatherWidget.tsx`**
- 用 `useEffect` 首次載入時呼叫 `supabase.functions.invoke('weather')`
- localStorage 快取 15 分鐘（key: `weather-cache`），避免每次入頁都 call API
- UI：shadcn `Popover` + `Card`；圖示用 OpenWeatherMap icon URL（`https://openweathermap.org/img/wn/{icon}@2x.png`）
- Loading 狀態：骨架載入
- 錯誤處理：靜默失敗，widget 顯示 `--°` 唔阻塞其他功能
- 加手動刷新按鈕

**整合到 `src/components/Dashboard.tsx`**
- Import `WeatherWidget`
- 插入到 header 嘅 flex 容器內，「西方占星」按鈕之前

## 資料流圖

```text
Browser ──► Edge Function `weather`
             │
             ├─► ipapi.co (IP → lat/lon/city)
             │
             └─► OpenWeatherMap (current + forecast + AQI)
             │
             ▼
        統一 JSON ──► WeatherWidget (Popover UI)
```

## 唔會做（明確排除）
- 唔加瀏覽器 GPS 授權（按用戶選擇用 IP）
- 唔加手動搜尋其他城市（可日後擴充）
- 唔改動占星、貓圖、會員系統其他部分

## 檔案異動
- 新增：`supabase/functions/weather/index.ts`
- 新增：`src/components/WeatherWidget.tsx`
- 編輯：`src/components/Dashboard.tsx`（header 加 widget）
- 新增 secret：`OPENWEATHER_API_KEY`
