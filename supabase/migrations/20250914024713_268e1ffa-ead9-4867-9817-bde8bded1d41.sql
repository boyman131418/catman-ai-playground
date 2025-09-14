-- Add description and order_index columns to items table
ALTER TABLE public.items 
ADD COLUMN description TEXT DEFAULT '',
ADD COLUMN order_index INTEGER DEFAULT 0;

-- Create index for better sorting performance
CREATE INDEX idx_items_category_order ON public.items(category_id, order_index);

-- Update existing items with incremental order_index
UPDATE public.items 
SET order_index = row_number() OVER (PARTITION BY category_id ORDER BY created_at);