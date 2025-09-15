import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Profile {
  id: string;
  email: string;
  display_name: string;
  status: string;
  membership_tier_id: string;
  applied_at: string;
  membership_tiers: {
    name: string;
    display_name: string;
  };
}

interface MembershipTier {
  id: string;
  name: string;
  display_name: string;
  description: string;
}

interface Category {
  id: string;
  name: string;
  display_name: string;
}

interface CategoryPermission {
  id: string;
  membership_tier_id: string;
  category_id: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  categories: {
    name: string;
    display_name: string;
  };
}

const MembershipManagement = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [membershipTiers, setMembershipTiers] = useState<MembershipTier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [permissions, setPermissions] = useState<CategoryPermission[]>([]);
  const [selectedTier, setSelectedTier] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load profiles with membership tiers
      const { data: profilesData } = await supabase
        .from('profiles')
        .select(`
          *,
          membership_tiers (name, display_name)
        `)
        .order('applied_at', { ascending: false });

      // Load membership tiers
      const { data: tiersData } = await supabase
        .from('membership_tiers')
        .select('*')
        .order('name');

      // Load categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      // Load permissions
      const { data: permissionsData } = await supabase
        .from('category_permissions')
        .select(`
          *,
          categories (name, display_name)
        `);

      setProfiles(profilesData || []);
      setMembershipTiers(tiersData || []);
      setCategories(categoriesData || []);
      setPermissions(permissionsData || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfileStatus = async (profileId: string, status: string, membershipTierId?: string) => {
    try {
      const updateData: any = { status };
      if (status === 'approved') {
        updateData.approved_at = new Date().toISOString();
      }
      if (membershipTierId) {
        updateData.membership_tier_id = membershipTierId;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profileId);

      if (error) throw error;

      toast({
        title: "更新成功",
        description: "用戶狀態已更新",
      });
      
      loadData();
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast({
        title: "更新失敗",
        description: "更新用戶狀態時發生錯誤",
        variant: "destructive",
      });
    }
  };

  const updatePermission = async (
    membershipTierId: string, 
    categoryId: string, 
    permissionType: 'can_view' | 'can_edit' | 'can_delete', 
    value: boolean
  ) => {
    try {
      const { error } = await supabase
        .from('category_permissions')
        .update({ [permissionType]: value })
        .eq('membership_tier_id', membershipTierId)
        .eq('category_id', categoryId);

      if (error) throw error;

      toast({
        title: "權限更新成功",
        description: "分類權限已更新",
      });
      
      loadData();
    } catch (error) {
      console.error('Failed to update permission:', error);
      toast({
        title: "權限更新失敗",
        description: "更新權限時發生錯誤",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "待審核", variant: "secondary" as const },
      approved: { label: "已批准", variant: "default" as const },
      rejected: { label: "已拒絕", variant: "destructive" as const },
      suspended: { label: "已暫停", variant: "outline" as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPermissionsForTier = (tierId: string) => {
    return permissions.filter(p => p.membership_tier_id === tierId);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>會員管理</CardTitle>
        <CardDescription>管理用戶申請和權限設定</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="applications" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="applications">會員申請</TabsTrigger>
            <TabsTrigger value="permissions">權限管理</TabsTrigger>
          </TabsList>
          
          <TabsContent value="applications" className="space-y-4">
            <div className="space-y-4">
              {profiles.map((profile) => (
                <Card key={profile.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{profile.display_name || profile.email}</span>
                          {getStatusBadge(profile.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{profile.email}</p>
                        <p className="text-xs text-muted-foreground">
                          申請時間: {new Date(profile.applied_at).toLocaleString('zh-TW')}
                        </p>
                        {profile.membership_tiers && (
                          <p className="text-sm">
                            目前等級: {profile.membership_tiers.display_name}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Select
                          value={profile.membership_tier_id}
                          onValueChange={(value) => updateProfileStatus(profile.id, profile.status, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {membershipTiers.map((tier) => (
                              <SelectItem key={tier.id} value={tier.id}>
                                {tier.display_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {profile.status === 'pending' && (
                          <>
                            <Button 
                              size="sm"
                              onClick={() => updateProfileStatus(profile.id, 'approved')}
                            >
                              批准
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => updateProfileStatus(profile.id, 'rejected')}
                            >
                              拒絕
                            </Button>
                          </>
                        )}
                        
                        {profile.status === 'approved' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateProfileStatus(profile.id, 'suspended')}
                          >
                            暫停
                          </Button>
                        )}
                        
                        {profile.status === 'suspended' && (
                          <Button 
                            size="sm"
                            onClick={() => updateProfileStatus(profile.id, 'approved')}
                          >
                            恢復
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="permissions" className="space-y-4">
            <div className="space-y-2">
              <Label>選擇會員等級</Label>
              <Select value={selectedTier} onValueChange={setSelectedTier}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇會員等級" />
                </SelectTrigger>
                <SelectContent>
                  {membershipTiers.map((tier) => (
                    <SelectItem key={tier.id} value={tier.id}>
                      {tier.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedTier && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">權限設定</h3>
                {categories.map((category) => {
                  const permission = getPermissionsForTier(selectedTier).find(
                    p => p.category_id === category.id
                  );
                  
                  return (
                    <Card key={category.id}>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <h4 className="font-medium">{category.display_name}</h4>
                          
                          <div className="grid grid-cols-3 gap-4">
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={permission?.can_view || false}
                                onCheckedChange={(checked) => 
                                  updatePermission(selectedTier, category.id, 'can_view', checked)
                                }
                              />
                              <Label>檢視</Label>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={permission?.can_edit || false}
                                onCheckedChange={(checked) => 
                                  updatePermission(selectedTier, category.id, 'can_edit', checked)
                                }
                              />
                              <Label>編輯</Label>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={permission?.can_delete || false}
                                onCheckedChange={(checked) => 
                                  updatePermission(selectedTier, category.id, 'can_delete', checked)
                                }
                              />
                              <Label>刪除</Label>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MembershipManagement;