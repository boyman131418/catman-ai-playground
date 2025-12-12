-- 創建公告表
CREATE TABLE public.announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 啟用 RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- 所有人可以查看活躍的公告
CREATE POLICY "Everyone can view active announcements" 
ON public.announcements 
FOR SELECT 
USING (is_active = true);

-- 只有管理員可以管理公告
CREATE POLICY "Admin can manage announcements" 
ON public.announcements 
FOR ALL 
USING (auth.email() = 'boyman131418@gmail.com');

-- 自動更新 updated_at
CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();