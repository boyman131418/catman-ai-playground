import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LogOut, Copy, Settings, Eye, EyeOff, ExternalLink, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { User } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminPanel from "./AdminPanel";
import MembershipApplication from "./MembershipApplication";
import MembershipManagement from "./MembershipManagement";
import AnnouncementBoard from "./AnnouncementBoard";

interface Category {
  id: string;
  name: string;
  display_name: string;
  order_index: number;
}

interface MembershipTier {
  id: string;
  name: string;
  display_name: string;
  description: string;
}

interface Item {
  id: string;
  category_id: string;
  title: string;
  link: string;
  description: string;
  order_index: number;
}

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const Dashboard = ({ user, onLogout }: DashboardProps) => {
  const inviteUrl = "https://lovable.dev/invite/1e206a95-c6de-4ed1-a8bc-ef322934dd0c";
  const isAdmin = user.email === 'boyman131418@gmail.com';
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<{ [categoryId: string]: Item[] }>({});
  const [membershipTiers, setMembershipTiers] = useState<MembershipTier[]>([]);
  const [userPermissions, setUserPermissions] = useState<{ [categoryName: string]: { view: boolean; edit: boolean; delete: boolean } }>({});
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userMembershipTier, setUserMembershipTier] = useState<MembershipTier | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [adminMode, setAdminMode] = useState(false);
  const [showApplication, setShowApplication] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setDataLoading(true);
    try {
      // Load categories, items, and tiers in PARALLEL
      const [categoriesRes, itemsRes, tiersRes] = await Promise.all([
        supabase.from('categories').select('*').order('order_index'),
        supabase.from('items').select('*').order('order_index'),
        supabase.from('membership_tiers').select('*').order('name'),
      ]);

      if (categoriesRes.error || itemsRes.error || tiersRes.error) {
        console.error('Error loading data:', categoriesRes.error, itemsRes.error, tiersRes.error);
        return;
      }

      const cats = categoriesRes.data || [];
      const tiers = tiersRes.data || [];
      
      setCategories(cats);
      setMembershipTiers(tiers);
      
      // Group items by category
      const itemsByCategory: { [categoryId: string]: Item[] } = {};
      (itemsRes.data || []).forEach((item: Item) => {
        if (!itemsByCategory[item.category_id]) {
          itemsByCategory[item.category_id] = [];
        }
        itemsByCategory[item.category_id].push(item);
      });
      setItems(itemsByCategory);
      setDataLoading(false);

      // Load permissions and profile in parallel (non-blocking)
      if (user?.email) {
        setPermissionsLoading(true);
        Promise.all([
          loadUserPermissions(user.email, cats),
          loadUserProfile(user.id, user.email, tiers),
        ]).finally(() => setPermissionsLoading(false));
      } else {
        setPermissionsLoading(false);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const loadUserPermissions = async (userEmail: string, categories: Category[]) => {
    const permissions: { [categoryName: string]: { view: boolean; edit: boolean; delete: boolean } } = {};
    
    // Fire ALL permission checks in parallel instead of sequentially
    const permissionPromises = categories.flatMap((category) => [
      supabase.functions.invoke('check-user-permission', {
        body: { userEmail, categoryName: category.name, permissionType: 'view' }
      }).then(({ data }) => ({ category: category.name, type: 'view' as const, result: data?.hasPermission || false })),
      supabase.functions.invoke('check-user-permission', {
        body: { userEmail, categoryName: category.name, permissionType: 'edit' }
      }).then(({ data }) => ({ category: category.name, type: 'edit' as const, result: data?.hasPermission || false })),
      supabase.functions.invoke('check-user-permission', {
        body: { userEmail, categoryName: category.name, permissionType: 'delete' }
      }).then(({ data }) => ({ category: category.name, type: 'delete' as const, result: data?.hasPermission || false })),
    ]);

    try {
      const results = await Promise.all(permissionPromises);
      for (const r of results) {
        if (!permissions[r.category]) {
          permissions[r.category] = { view: false, edit: false, delete: false };
        }
        permissions[r.category][r.type] = r.result;
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      for (const category of categories) {
        permissions[category.name] = { view: false, edit: false, delete: false };
      }
    }
    
    setUserPermissions(permissions);
  };

  const loadUserProfile = async (userId: string, userEmail: string, membershipTiers: MembershipTier[]) => {
    try {
      console.log('Loading profile for user ID:', userId, 'email:', userEmail);
      
      // First try to find by user_id
      let { data: profileData, error } = await supabase
        .from('profiles')
        .select('*, membership_tier_id')
        .eq('user_id', userId)
        .maybeSingle();

      console.log('Profile by user_id:', profileData, 'Error:', error);

      // If not found, try to find by email and update user_id
      if (!profileData && !error) {
        console.log('No profile found by user_id, trying by email...');
        
        const { data: profileByEmail, error: emailError } = await supabase
          .from('profiles')
          .select('*, membership_tier_id')
          .eq('email', userEmail)
          .eq('status', 'approved')
          .maybeSingle();

        console.log('Profile by email:', profileByEmail, 'Error:', emailError);

        if (profileByEmail && !emailError) {
          // Update the profile with user_id using admin privileges
          console.log('Updating profile with user_id...');
          const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({ user_id: userId })
            .eq('id', profileByEmail.id)
            .select('*, membership_tier_id')
            .single();

          if (!updateError && updatedProfile) {
            profileData = updatedProfile;
            console.log('Successfully updated profile with user_id:', profileData);
          } else {
            console.error('Error updating profile with user_id:', updateError);
            // Still use the email-found profile for display
            profileData = profileByEmail;
          }
        }
      }

      if (!profileData) {
        console.log('No approved profile found for user');
        return;
      }

      setUserProfile(profileData);

      // Find the membership tier for this user
      if (profileData?.membership_tier_id) {
        const userTier = membershipTiers.find(tier => tier.id === profileData.membership_tier_id);
        console.log('Found user tier:', userTier);
        setUserMembershipTier(userTier || null);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "複製成功",
      description: "連結已複製到剪貼板",
    });
  };

  const hasViewPermission = (categoryName: string) => {
    // Admin always has permission
    if (isAdmin) return true;
    // Check user permissions
    return userPermissions[categoryName]?.view || false;
  };

  const renderAccessDenied = (category: Category) => (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <EyeOff className="h-12 w-12 text-muted-foreground" />
      <p className="text-center text-muted-foreground">
        您沒有權限查看此分類的內容
      </p>
      {!user && (
        <Button onClick={() => setShowApplication(true)}>
          申請會員權限
        </Button>
      )}
    </div>
  );

  const renderDataTable = (categoryItems: Item[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>標題</TableHead>
          <TableHead>描述</TableHead>
          <TableHead>連結</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {categoryItems
          .sort((a, b) => a.order_index - b.order_index)
          .map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.title}</TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-xs">
                {item.description || '-'}
              </TableCell>
              <TableCell>
                <Button variant="outline" size="sm" asChild>
                  <a href={item.link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    前往
                  </a>
                </Button>
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-bg">
      {/* Header */}
      <header className="border-b border-border/20 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              CatMan AI
            </h1>
            <Badge variant="secondary" className="bg-cat-orange/20 text-cat-orange border-cat-orange/30">
              會員系統
            </Badge>
          </div>
          <div className="flex items-center space-x-4">
            {isAdmin && (
              <>
                <Badge variant="outline" className="bg-cat-orange/10 text-cat-orange border-cat-orange/30">
                  <Settings className="w-3 h-3 mr-1" />
                  {adminMode ? '管理模式' : '一般模式'}
                </Badge>
                <Switch
                  checked={adminMode}
                  onCheckedChange={setAdminMode}
                />
                <Label htmlFor="admin-mode" className="text-xs">
                  管理員模式
                </Label>
              </>
            )}
            <div className="flex items-center space-x-2">
              {user.user_metadata?.avatar_url && (
                <img 
                  src={user.user_metadata.avatar_url} 
                  alt="Profile" 
                  className="w-6 h-6 rounded-full"
                />
              )}
              <span className="text-sm text-muted-foreground">
                {user.user_metadata?.full_name || user.email}
              </span>
            </div>
            {(userMembershipTier || isAdmin) && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                {userMembershipTier?.display_name || '管理員'}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              登出
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold text-foreground">
              歡迎回來！ 🎉
            </h2>
            <p className="text-xl text-muted-foreground">
              會員權限系統已啟用，享受個人化的內容體驗
            </p>
          </div>

          {/* Announcement Board */}
          <AnnouncementBoard isAdmin={isAdmin} adminMode={adminMode} />

          {/* Special Access Card */}
          <Card className="shadow-elevated border-ai-purple/30 bg-gradient-to-br from-card/50 to-ai-purple/5 backdrop-blur">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-gradient-primary shadow-glow">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl bg-gradient-primary bg-clip-text text-transparent">
                專屬邀請連結
              </CardTitle>
              <CardDescription className="text-base">
                這是你的專屬Lovable邀請連結，快來體驗AI編程的魅力！
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-background/50 p-4 rounded-lg border border-border/50">
                <div className="flex items-center justify-between">
                  <code className="text-sm text-ai-blue break-all">
                    {inviteUrl}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(inviteUrl)}
                    className="ml-4 shrink-0"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    複製
                  </Button>
                </div>
              </div>
              
              <div className="flex gap-4">
                <Button 
                  asChild 
                  className="flex-1 bg-gradient-primary hover:opacity-90 transition-all shadow-glow"
                >
                  <a href={inviteUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    前往 Lovable
                  </a>
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowApplication(true)}
                  className="flex-1"
                >
                  申請會員
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Resource Tabs */}
          <div className="space-y-6">
            <Tabs defaultValue={categories[0]?.name} className="w-full">
              <TabsList className="grid grid-cols-4 gap-2 p-2 h-auto w-full">
                {categories.map((category) => (
                  <TabsTrigger 
                    key={category.name} 
                    value={category.name}
                    className="text-sm font-medium px-4 py-3 whitespace-nowrap text-center data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md transition-all hover:bg-muted/50"
                  >
                    {category.display_name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {categories.map((category) => {
                const categoryItems = items[category.id] || [];
                const hasAccess = hasViewPermission(category.name);

                return (
                  <TabsContent key={category.id} value={category.name}>
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              {category.display_name}
                              {hasAccess ? (
                                <Eye className="h-4 w-4 text-green-600" />
                              ) : (
                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                              )}
                            </CardTitle>
                            <CardDescription>
                              {hasAccess ? `${categoryItems.length} 個項目` : '需要會員權限'}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {hasAccess ? renderDataTable(categoryItems) : renderAccessDenied(category)}
                      </CardContent>
                    </Card>
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>

          {/* Admin Panel - only visible to admin users in admin mode */}
          {isAdmin && adminMode && (
            <div className="space-y-6">
              <Tabs defaultValue="content" className="w-full">
                <TabsList>
                  <TabsTrigger value="content">內容管理</TabsTrigger>
                  <TabsTrigger value="members">會員管理</TabsTrigger>
                </TabsList>
                <TabsContent value="content">
                  <h2 className="text-2xl font-bold mb-6">內容管理</h2>
                  {categories.map((category) => (
                    <AdminPanel
                      key={category.id}
                      categoryId={category.id}
                      categoryName={category.display_name}
                      items={items[category.id] || []}
                      onItemsChange={loadData}
                    />
                  ))}
                </TabsContent>
                <TabsContent value="members">
                  <MembershipManagement />
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Membership Application Modal */}
          {showApplication && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">申請會員</h2>
                  <Button variant="ghost" onClick={() => setShowApplication(false)}>
                    ✕
                  </Button>
                </div>
                <MembershipApplication 
                  membershipTiers={membershipTiers}
                />
              </div>
            </div>
          )}

          {/* Footer Message */}
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              有任何問題嗎？CatMan 隨時為你服務！ 🐱
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;