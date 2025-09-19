-- Security Fix: Restrict category_permissions access to authenticated users only
DROP POLICY IF EXISTS "Everyone can view category permissions" ON public.category_permissions;

CREATE POLICY "Authenticated users can view category permissions" 
ON public.category_permissions 
FOR SELECT 
TO authenticated
USING (true);

-- Security Fix: Update password verification function to use proper hashing
-- This function now expects hashed passwords and uses pgcrypto for verification
CREATE OR REPLACE FUNCTION public.verify_category_password(category_name text, password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  category_record RECORD;
  password_record RECORD;
BEGIN
  -- Get category by name
  SELECT id INTO category_record FROM categories WHERE name = category_name;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if any password hash matches using crypt function
  FOR password_record IN 
    SELECT password_hash FROM category_passwords WHERE category_id = category_record.id
  LOOP
    -- Use crypt to verify password against hash
    IF password_record.password_hash = crypt(password, password_record.password_hash) THEN
      RETURN TRUE;
    END IF;
  END LOOP;
  
  RETURN FALSE;
END;
$function$;

-- Security Fix: Update check_user_permission function to require authentication
CREATE OR REPLACE FUNCTION public.check_user_permission(user_email text, category_name text, permission_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_profile RECORD;
  category_record RECORD;
  permission_record RECORD;
  current_user_email text;
BEGIN
  -- Security check: Ensure the requesting user can only check their own permissions
  -- or is an admin
  current_user_email := auth.email();
  
  IF current_user_email IS NULL THEN
    RETURN FALSE; -- Not authenticated
  END IF;
  
  -- Only allow users to check their own permissions, or admins to check any
  IF current_user_email != user_email AND current_user_email != 'boyman131418@gmail.com' THEN
    RETURN FALSE;
  END IF;
  
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
$function$;