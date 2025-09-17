-- Create admin profile for the system administrator
INSERT INTO public.profiles (
  email, 
  display_name, 
  membership_tier_id, 
  status, 
  approved_at,
  applied_at
) 
VALUES (
  'boyman131418@gmail.com',
  '系統管理員',
  '60344baa-ce78-4066-89bc-ef71c350ff08', -- admin tier id
  'approved',
  now(),
  now()
) 
ON CONFLICT (email) DO UPDATE SET
  membership_tier_id = '60344baa-ce78-4066-89bc-ef71c350ff08',
  status = 'approved',
  display_name = '系統管理員';