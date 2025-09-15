-- Create membership tiers table
CREATE TABLE public.membership_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user profiles table for Google email authentication
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  membership_tier_id UUID REFERENCES public.membership_tiers(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create category permissions table
CREATE TABLE public.category_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  membership_tier_id UUID NOT NULL REFERENCES public.membership_tiers(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  can_view BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(membership_tier_id, category_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.membership_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for membership_tiers
CREATE POLICY "Everyone can view membership tiers" 
ON public.membership_tiers 
FOR SELECT 
USING (true);

CREATE POLICY "Admin can manage membership tiers" 
ON public.membership_tiers 
FOR ALL 
USING (auth.email() = 'boyman131418@gmail.com');

-- RLS policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can manage all profiles" 
ON public.profiles 
FOR ALL 
USING (auth.email() = 'boyman131418@gmail.com');

-- RLS policies for category_permissions
CREATE POLICY "Everyone can view category permissions" 
ON public.category_permissions 
FOR SELECT 
USING (true);

CREATE POLICY "Admin can manage category permissions" 
ON public.category_permissions 
FOR ALL 
USING (auth.email() = 'boyman131418@gmail.com');

-- Create function to check user permissions
CREATE OR REPLACE FUNCTION public.check_user_permission(
  user_email TEXT, 
  category_name TEXT, 
  permission_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile RECORD;
  category_record RECORD;
  permission_record RECORD;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile 
  FROM profiles 
  WHERE email = user_email AND status = 'approved';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Get category
  SELECT * INTO category_record 
  FROM categories 
  WHERE name = category_name;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check permissions
  SELECT * INTO permission_record 
  FROM category_permissions 
  WHERE membership_tier_id = user_profile.membership_tier_id 
    AND category_id = category_record.id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Return appropriate permission
  CASE permission_type
    WHEN 'view' THEN RETURN permission_record.can_view;
    WHEN 'edit' THEN RETURN permission_record.can_edit;
    WHEN 'delete' THEN RETURN permission_record.can_delete;
    ELSE RETURN FALSE;
  END CASE;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_membership_tiers_updated_at
BEFORE UPDATE ON public.membership_tiers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default membership tiers
INSERT INTO public.membership_tiers (name, display_name, description) VALUES
('free', '免費會員', '基礎權限'),
('premium', '高級會員', '進階功能權限'),
('vip', 'VIP會員', '完整權限'),
('admin', '管理員', '完整管理權限');

-- Set up default permissions (admin gets all permissions)
INSERT INTO public.category_permissions (membership_tier_id, category_id, can_view, can_edit, can_delete)
SELECT 
  mt.id as membership_tier_id,
  c.id as category_id,
  CASE WHEN mt.name = 'admin' THEN true ELSE false END as can_view,
  CASE WHEN mt.name = 'admin' THEN true ELSE false END as can_edit,
  CASE WHEN mt.name = 'admin' THEN true ELSE false END as can_delete
FROM public.membership_tiers mt
CROSS JOIN public.categories c;