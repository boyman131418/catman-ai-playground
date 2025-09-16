-- Add order_index column to categories table
ALTER TABLE public.categories ADD COLUMN order_index INTEGER DEFAULT 0;

-- Set initial order for existing categories
UPDATE public.categories SET order_index = 1 WHERE name = '人工智能專區';
UPDATE public.categories SET order_index = 2 WHERE name = '加密貨幣專區';  
UPDATE public.categories SET order_index = 3 WHERE name = 'Ai Agent 與 自動化工作流';
UPDATE public.categories SET order_index = 4 WHERE name = '功能性網址專區';