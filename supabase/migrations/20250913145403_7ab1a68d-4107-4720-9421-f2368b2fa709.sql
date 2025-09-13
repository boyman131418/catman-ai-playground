-- Create categories table for the different tabs
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  passwords TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create items table for the content in each category
CREATE TABLE public.items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  link TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- RLS policies for categories - everyone can view, only admin can modify
CREATE POLICY "Everyone can view categories" 
ON public.categories 
FOR SELECT 
USING (true);

CREATE POLICY "Admin can manage categories" 
ON public.categories 
FOR ALL 
USING (auth.email() = 'boyman131418@gmail.com');

-- RLS policies for items - everyone can view, only admin can modify
CREATE POLICY "Everyone can view items" 
ON public.items 
FOR SELECT 
USING (true);

CREATE POLICY "Admin can manage items" 
ON public.items 
FOR ALL 
USING (auth.email() = 'boyman131418@gmail.com');

-- Insert initial categories
INSERT INTO public.categories (name, display_name, passwords) VALUES
('meta', 'Meta 學員專區', ARRAY['meta', 'symptom']),
('crypto', '加密貨幣專區', ARRAY['symptom']),
('ai', '人工智能專區', ARRAY['symptom']),
('tools', '功能性網址專區', ARRAY['symptom']);

-- Insert initial items for Meta category
INSERT INTO public.items (category_id, title, link) 
SELECT id, 'EXCEL TO EXCEL', 'https://drive.google.com/file/d/1Z-KrnrWDsd0NvfJZtORnIVO4azTeOtgi/view?usp=sharing'
FROM public.categories WHERE name = 'meta';

INSERT INTO public.items (category_id, title, link) 
SELECT id, '私人助理', 'https://drive.google.com/file/d/1AF9oCWzf1zlVLKaoBDvj3f4ygGWReb7w/view?usp=sharing'
FROM public.categories WHERE name = 'meta';

INSERT INTO public.items (category_id, title, link) 
SELECT id, '玄學案例', 'https://drive.google.com/file/d/1nAGrXEntfmAVA6pfcTkplR-MrNZwNrr9/view?usp=sharing'
FROM public.categories WHERE name = 'meta';

INSERT INTO public.items (category_id, title, link) 
SELECT id, '虛擬KOL', 'https://drive.google.com/file/d/1KO4CE-gt20IlnkWZKAmVVTZHyiBTOz2K/view?usp=drive_link'
FROM public.categories WHERE name = 'meta';

-- Insert initial items for Crypto category
INSERT INTO public.items (category_id, title, link) 
SELECT id, 'BTC 持幣情況', 'https://chainexposed.com/HoldWavesRealized.html'
FROM public.categories WHERE name = 'crypto';

INSERT INTO public.items (category_id, title, link) 
SELECT id, 'BTC彩虹通道', 'https://www.blockchaincenter.net/en/bitcoin-rainbow-chart/'
FROM public.categories WHERE name = 'crypto';

INSERT INTO public.items (category_id, title, link) 
SELECT id, 'CBBI指數', 'https://colintalkscrypto.com/cbbi/index.html'
FROM public.categories WHERE name = 'crypto';

INSERT INTO public.items (category_id, title, link) 
SELECT id, 'BTC 逃頂指數', 'https://www.coinglass.com/zh-TW/pro/i/MA'
FROM public.categories WHERE name = 'crypto';

INSERT INTO public.items (category_id, title, link) 
SELECT id, 'BTC熱力圖', 'https://buybitcoinworldwide.com/stats/stock-to-flow/'
FROM public.categories WHERE name = 'crypto';

INSERT INTO public.items (category_id, title, link) 
SELECT id, 'BTC預測圖', 'https://coindataflow.com/zh/%E9%A2%84%E6%B5%8B/bitcoin'
FROM public.categories WHERE name = 'crypto';

-- Insert initial items for AI category
INSERT INTO public.items (category_id, title, link) 
SELECT id, 'ChatGPT', 'https://chatgpt.com'
FROM public.categories WHERE name = 'ai';

INSERT INTO public.items (category_id, title, link) 
SELECT id, 'Poe', 'https://poe.com'
FROM public.categories WHERE name = 'ai';

INSERT INTO public.items (category_id, title, link) 
SELECT id, '豆包', 'https://www.doubao.com/'
FROM public.categories WHERE name = 'ai';

INSERT INTO public.items (category_id, title, link) 
SELECT id, 'CHATGPT MQL5 分析', 'https://chatgpt.com/g/g-dPlAXfGfX-mql5fen-xi-xi-tong'
FROM public.categories WHERE name = 'ai';

-- Insert initial items for Tools category
INSERT INTO public.items (category_id, title, link) 
SELECT id, '翻譯軟件', 'https://chromewebstore.google.com/detail/%E6%B2%89%E6%B5%B8%E5%BC%8F%E7%BF%BB%E8%AD%AF-%E7%B6%B2%E9%A0%81%E7%BF%BB%E8%AD%AF%E6%93%B4%E5%85%85-pdf%E7%BF%BB%E8%AD%AF-%E5%85%8D%E8%B2%BB/bpoadfkcbjbfhfodiogcnhhhpibjhbnh?hl=zh-TW&utm_source=ext_sidebar'
FROM public.categories WHERE name = 'tools';

INSERT INTO public.items (category_id, title, link) 
SELECT id, '查 流量 註冊', 'https://chromewebstore.google.com/detail/ip-whois-flags-chrome-web/kmdfbacgombndnllogoijhnggalgmkon?hl=zh-TW&utm_source=ext_sidebar'
FROM public.categories WHERE name = 'tools';

INSERT INTO public.items (category_id, title, link) 
SELECT id, '查鏈協助', 'https://chromewebstore.google.com/detail/metasuites-builders-swiss/fkhgpeojcbhimodmppkbbliepkpcgcoo?hl=zh-TW&utm_source=ext_sidebar'
FROM public.categories WHERE name = 'tools';

INSERT INTO public.items (category_id, title, link) 
SELECT id, '錢包', 'https://chromewebstore.google.com/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?utm_source=ext_app_menu'
FROM public.categories WHERE name = 'tools';

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_items_updated_at
BEFORE UPDATE ON public.items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();