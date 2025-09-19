CREATE OR REPLACE FUNCTION public.check_user_permission(user_email text, category_name text, permission_type text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  user_profile RECORD;
  category_record RECORD;
  permission_record RECORD;
  current_user_email text;
  current_role text;
BEGIN
  -- Get current user info
  current_user_email := auth.email();
  current_role := current_role();
  
  -- If called by service role (from edge function), allow execution
  -- If called by authenticated user, only allow checking own permissions or admin
  IF current_role != 'service_role' THEN
    IF current_user_email IS NULL THEN
      RETURN FALSE; -- Not authenticated
    END IF;
    
    -- Only allow users to check their own permissions, or admins to check any
    IF current_user_email != user_email AND current_user_email != 'boyman131418@gmail.com' THEN
      RETURN FALSE;
    END IF;
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
$$;