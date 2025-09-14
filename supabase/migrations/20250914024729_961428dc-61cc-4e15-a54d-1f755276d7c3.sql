-- Add description and order_index columns to items table
ALTER TABLE public.items 
ADD COLUMN description TEXT DEFAULT '',
ADD COLUMN order_index INTEGER DEFAULT 0;

-- Create index for better sorting performance  
CREATE INDEX idx_items_category_order ON public.items(category_id, order_index);

-- Set initial order_index for existing items
WITH ordered_items AS (
  SELECT id, row_number() OVER (PARTITION BY category_id ORDER BY created_at) as rn
  FROM public.items
)
UPDATE public.items 
SET order_index = ordered_items.rn
FROM ordered_items 
WHERE public.items.id = ordered_items.id;