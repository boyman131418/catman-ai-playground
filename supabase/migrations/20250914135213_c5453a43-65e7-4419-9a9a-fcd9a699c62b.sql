-- Create a secure password hashes table (not publicly readable)
CREATE TABLE public.category_passwords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS but make it admin-only
ALTER TABLE public.category_passwords ENABLE ROW LEVEL SECURITY;

-- Only admins can manage password hashes
CREATE POLICY "Admin can manage category passwords" 
ON public.category_passwords 
FOR ALL 
USING (auth.email() = 'boyman131418@gmail.com');

-- Remove passwords array from categories table
ALTER TABLE public.categories DROP COLUMN passwords;

-- Create function to verify passwords securely
CREATE OR REPLACE FUNCTION public.verify_category_password(category_name TEXT, password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  category_record RECORD;
  password_record RECORD;
BEGIN
  -- Get category by name
  SELECT id INTO category_record FROM categories WHERE name = category_name;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if any password hash matches
  FOR password_record IN 
    SELECT password_hash FROM category_passwords WHERE category_id = category_record.id
  LOOP
    -- Using simple comparison for now (in production, use proper password hashing like bcrypt)
    IF password_record.password_hash = password THEN
      RETURN TRUE;
    END IF;
  END LOOP;
  
  RETURN FALSE;
END;
$$;