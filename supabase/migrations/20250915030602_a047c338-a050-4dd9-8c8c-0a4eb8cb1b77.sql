-- Insert sample password hashes for testing
-- You'll need to replace these with actual category IDs and desired passwords

-- First, let's get the category IDs and insert some sample passwords
-- This assumes you have existing categories, adjust the passwords as needed

INSERT INTO public.category_passwords (category_id, password_hash)
SELECT 
  id,
  'password123'  -- Replace with actual desired passwords
FROM public.categories
WHERE name IN ('ai-tools', 'resources', 'tutorials', 'community')
ON CONFLICT DO NOTHING;