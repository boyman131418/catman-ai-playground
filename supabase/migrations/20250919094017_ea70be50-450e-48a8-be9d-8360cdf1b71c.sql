-- 為新分類創建權限記錄
-- 首先獲取所有會員等級和分類的組合，並為缺失的組合創建權限記錄

-- 為"自動化工作流案例 與 功能節點區"分類創建權限記錄
INSERT INTO category_permissions (membership_tier_id, category_id, can_view, can_edit, can_delete)
SELECT 
  mt.id as membership_tier_id,
  c.id as category_id,
  CASE 
    WHEN mt.name = 'admin' THEN true
    WHEN mt.name = 'premium' AND c.name = 'Library' THEN true
    WHEN mt.name = 'Crypto AI EA' AND c.name = 'Library' THEN true
    ELSE false
  END as can_view,
  CASE 
    WHEN mt.name = 'admin' THEN true
    ELSE false
  END as can_edit,
  CASE 
    WHEN mt.name = 'admin' THEN true
    ELSE false
  END as can_delete
FROM membership_tiers mt
CROSS JOIN categories c
WHERE c.name = 'Library'
  AND NOT EXISTS (
    SELECT 1 FROM category_permissions cp 
    WHERE cp.membership_tier_id = mt.id 
    AND cp.category_id = c.id
  );

-- 為"不應該到的網站"分類創建權限記錄
INSERT INTO category_permissions (membership_tier_id, category_id, can_view, can_edit, can_delete)
SELECT 
  mt.id as membership_tier_id,
  c.id as category_id,
  CASE 
    WHEN mt.name = 'admin' THEN true
    ELSE false
  END as can_view,
  CASE 
    WHEN mt.name = 'admin' THEN true
    ELSE false
  END as can_edit,
  CASE 
    WHEN mt.name = 'admin' THEN true
    ELSE false
  END as can_delete
FROM membership_tiers mt
CROSS JOIN categories c
WHERE c.name = '18+'
  AND NOT EXISTS (
    SELECT 1 FROM category_permissions cp 
    WHERE cp.membership_tier_id = mt.id 
    AND cp.category_id = c.id
  );

-- 為"外滙 金融 EA"分類創建權限記錄
INSERT INTO category_permissions (membership_tier_id, category_id, can_view, can_edit, can_delete)
SELECT 
  mt.id as membership_tier_id,
  c.id as category_id,
  CASE 
    WHEN mt.name = 'admin' THEN true
    WHEN mt.name = 'Crypto AI EA' AND c.name = 'FX' THEN true
    ELSE false
  END as can_view,
  CASE 
    WHEN mt.name = 'admin' THEN true
    ELSE false
  END as can_edit,
  CASE 
    WHEN mt.name = 'admin' THEN true
    ELSE false
  END as can_delete
FROM membership_tiers mt
CROSS JOIN categories c
WHERE c.name = 'FX'
  AND NOT EXISTS (
    SELECT 1 FROM category_permissions cp 
    WHERE cp.membership_tier_id = mt.id 
    AND cp.category_id = c.id
  );

-- 為synontem用戶創建profile記錄（如果不存在）
INSERT INTO profiles (email, display_name, status, membership_tier_id, approved_at)
SELECT 
  'synontem@gmail.com',
  'Synontem',
  'approved',
  mt.id,
  now()
FROM membership_tiers mt
WHERE mt.name = 'Crypto AI EA'
  AND NOT EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.email = 'synontem@gmail.com'
  );