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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit, ChevronUp, ChevronDown } from "lucide-react";

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
  order_index: number;
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

  // Form states for adding new items
  const [newTierName, setNewTierName] = useState("");
  const [newTierDisplayName, setNewTierDisplayName] = useState("");
  const [newTierDescription, setNewTierDescription] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDisplayName, setNewCategoryDisplayName] = useState("");
  const [editingTier, setEditingTier] = useState<MembershipTier | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isTierDialogOpen, setIsTierDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isEditTierDialogOpen, setIsEditTierDialogOpen] = useState(false);
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);

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
        .order('order_index');

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
      // First check if the permission record exists
      const { data: existingPermission } = await supabase
        .from('category_permissions')
        .select('id')
        .eq('membership_tier_id', membershipTierId)
        .eq('category_id', categoryId)
        .maybeSingle();

      if (existingPermission) {
        // Update existing record
        const { error } = await supabase
          .from('category_permissions')
          .update({ [permissionType]: value })
          .eq('membership_tier_id', membershipTierId)
          .eq('category_id', categoryId);

        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('category_permissions')
          .insert({
            membership_tier_id: membershipTierId,
            category_id: categoryId,
            [permissionType]: value,
            can_view: permissionType === 'can_view' ? value : false,
            can_edit: permissionType === 'can_edit' ? value : false,
            can_delete: permissionType === 'can_delete' ? value : false
          });

        if (error) throw error;
      }

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

  const addMembershipTier = async () => {
    if (!newTierName.trim() || !newTierDisplayName.trim()) {
      toast({
        title: "錯誤",
        description: "請填寫等級名稱和顯示名稱",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('membership_tiers')
        .insert({
          name: newTierName.trim(),
          display_name: newTierDisplayName.trim(),
          description: newTierDescription.trim() || null,
        });

      if (error) throw error;

      toast({
        title: "新增成功",
        description: "會員等級已新增",
      });

      setNewTierName("");
      setNewTierDisplayName("");
      setNewTierDescription("");
      setIsTierDialogOpen(false);
      loadData();
    } catch (error) {
      toast({
        title: "新增失敗",
        description: "新增會員等級時發生錯誤",
        variant: "destructive",
      });
    }
  };

  const editMembershipTier = async () => {
    if (!editingTier || !editingTier.name.trim() || !editingTier.display_name.trim()) {
      toast({
        title: "錯誤",
        description: "請填寫等級名稱和顯示名稱",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('membership_tiers')
        .update({
          name: editingTier.name.trim(),
          display_name: editingTier.display_name.trim(),
          description: editingTier.description?.trim() || null,
        })
        .eq('id', editingTier.id);

      if (error) throw error;

      toast({
        title: "更新成功",
        description: "會員等級已更新",
      });

      setEditingTier(null);
      setIsEditTierDialogOpen(false);
      loadData();
    } catch (error) {
      toast({
        title: "更新失敗",
        description: "更新會員等級時發生錯誤",
        variant: "destructive",
      });
    }
  };

  const deleteMembershipTier = async (tierId: string) => {
    try {
      const { error } = await supabase
        .from('membership_tiers')
        .delete()
        .eq('id', tierId);

      if (error) throw error;

      toast({
        title: "刪除成功",
        description: "會員等級已刪除",
      });

      loadData();
    } catch (error) {
      toast({
        title: "刪除失敗",  
        description: "刪除會員等級時發生錯誤",
        variant: "destructive",
      });
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim() || !newCategoryDisplayName.trim()) {
      toast({
        title: "錯誤",
        description: "請填寫分類名稱和顯示名稱",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get the highest order_index to assign the next one
      const maxOrderIndex = Math.max(...categories.map(c => c.order_index), 0);
      
      const { error } = await supabase
        .from('categories')
        .insert({
          name: newCategoryName.trim(),
          display_name: newCategoryDisplayName.trim(),
          order_index: maxOrderIndex + 1,
        });

      if (error) throw error;

      toast({
        title: "新增成功",
        description: "分類已新增",
      });

      setNewCategoryName("");
      setNewCategoryDisplayName("");
      setIsCategoryDialogOpen(false);
      loadData();
    } catch (error) {
      toast({
        title: "新增失敗",
        description: "新增分類時發生錯誤",
        variant: "destructive",
      });
    }
  };

  const editCategory = async () => {
    if (!editingCategory || !editingCategory.name.trim() || !editingCategory.display_name.trim()) {
      toast({
        title: "錯誤",
        description: "請填寫分類名稱和顯示名稱",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('categories')
        .update({
          name: editingCategory.name.trim(),
          display_name: editingCategory.display_name.trim(),
        })
        .eq('id', editingCategory.id);

      if (error) throw error;

      toast({
        title: "更新成功",
        description: "分類已更新",
      });

      setEditingCategory(null);
      setIsEditCategoryDialogOpen(false);
      loadData();
    } catch (error) {
      toast({
        title: "更新失敗",
        description: "更新分類時發生錯誤",
        variant: "destructive",
      });
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      toast({
        title: "刪除成功",
        description: "分類已刪除",
      });

      loadData();
    } catch (error) {
      toast({
        title: "刪除失敗",
        description: "刪除分類時發生錯誤",
        variant: "destructive",
      });
    }
  };

  const moveCategoryUp = async (categoryId: string, currentIndex: number) => {
    const minIndex = Math.min(...categories.map(c => c.order_index));
    if (currentIndex <= minIndex) return; // Can't move up if already at top

    try {
      // Find the category that's at the target position BEFORE making changes
      const categoryAtTarget = categories.find(c => c.order_index === currentIndex - 1);
      if (!categoryAtTarget) return;

      // Swap the order indices
      await supabase
        .from('categories')
        .update({ order_index: currentIndex - 1 })
        .eq('id', categoryId);

      await supabase
        .from('categories')
        .update({ order_index: currentIndex })
        .eq('id', categoryAtTarget.id);

      loadData();
      toast({
        title: "排序成功",
        description: "分類順序已更新",
      });
    } catch (error) {
      console.error('Move up error:', error);
      toast({
        title: "排序失敗",
        description: "調整分類順序時發生錯誤",
        variant: "destructive",
      });
    }
  };

  const moveCategoryDown = async (categoryId: string, currentIndex: number) => {
    const maxIndex = Math.max(...categories.map(c => c.order_index));
    if (currentIndex >= maxIndex) return; // Can't move down if already at bottom

    try {
      // Find the category that's at the target position BEFORE making changes
      const categoryAtTarget = categories.find(c => c.order_index === currentIndex + 1);
      if (!categoryAtTarget) return;

      // Swap the order indices
      await supabase
        .from('categories')
        .update({ order_index: currentIndex + 1 })
        .eq('id', categoryId);

      await supabase
        .from('categories')
        .update({ order_index: currentIndex })
        .eq('id', categoryAtTarget.id);

      loadData();
      toast({
        title: "排序成功",
        description: "分類順序已更新",
      });
    } catch (error) {
      console.error('Move down error:', error);
      toast({
        title: "排序失敗",
        description: "調整分類順序時發生錯誤",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>會員管理</CardTitle>
        <CardDescription>管理用戶申請和權限設定</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="applications" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="applications">會員申請</TabsTrigger>
            <TabsTrigger value="permissions">權限管理</TabsTrigger>
            <TabsTrigger value="tiers">會員等級</TabsTrigger>
            <TabsTrigger value="categories">分類管理</TabsTrigger>
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
          
          <TabsContent value="tiers" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">會員等級管理</h3>
              <Dialog open={isTierDialogOpen} onOpenChange={setIsTierDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    新增等級
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>新增會員等級</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>等級名稱 (英文)</Label>
                      <Input
                        value={newTierName}
                        onChange={(e) => setNewTierName(e.target.value)}
                        placeholder="例如: premium"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>顯示名稱</Label>
                      <Input
                        value={newTierDisplayName}
                        onChange={(e) => setNewTierDisplayName(e.target.value)}
                        placeholder="例如: 高級會員"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>描述</Label>
                      <Textarea
                        value={newTierDescription}
                        onChange={(e) => setNewTierDescription(e.target.value)}
                        placeholder="等級描述"
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsTierDialogOpen(false)}>
                        取消
                      </Button>
                      <Button onClick={addMembershipTier}>
                        新增
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="space-y-4">
              {membershipTiers.map((tier) => (
                <Card key={tier.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{tier.display_name}</span>
                          <Badge variant="secondary">{tier.name}</Badge>
                        </div>
                        {tier.description && (
                          <p className="text-sm text-muted-foreground">{tier.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingTier(tier);
                            setIsEditTierDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {tier.name !== 'admin' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteMembershipTier(tier.id)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">分類管理</h3>
              <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    新增分類
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>新增分類</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>分類名稱 (英文)</Label>
                      <Input
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="例如: ai-tools"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>顯示名稱</Label>
                      <Input
                        value={newCategoryDisplayName}
                        onChange={(e) => setNewCategoryDisplayName(e.target.value)}
                        placeholder="例如: AI工具專區"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                        取消
                      </Button>
                      <Button onClick={addCategory}>
                        新增
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="space-y-4">
              {categories.map((category) => (
                <Card key={category.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{category.display_name}</span>
                          <Badge variant="secondary">{category.name}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => moveCategoryUp(category.id, category.order_index)}
                            disabled={category.order_index <= 1}
                            className="p-1 h-6 w-6"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => moveCategoryDown(category.id, category.order_index)}
                            disabled={category.order_index >= Math.max(...categories.map(c => c.order_index))}
                            className="p-1 h-6 w-6"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingCategory(category);
                            setIsEditCategoryDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteCategory(category.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Tier Dialog */}
        <Dialog open={isEditTierDialogOpen} onOpenChange={setIsEditTierDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>編輯會員等級</DialogTitle>
            </DialogHeader>
            {editingTier && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>等級名稱 (英文)</Label>
                  <Input
                    value={editingTier.name}
                    onChange={(e) => setEditingTier({...editingTier, name: e.target.value})}
                    placeholder="例如: premium"
                  />
                </div>
                <div className="space-y-2">
                  <Label>顯示名稱</Label>
                  <Input
                    value={editingTier.display_name}
                    onChange={(e) => setEditingTier({...editingTier, display_name: e.target.value})}
                    placeholder="例如: 高級會員"
                  />
                </div>
                <div className="space-y-2">
                  <Label>描述</Label>
                  <Textarea
                    value={editingTier.description || ""}
                    onChange={(e) => setEditingTier({...editingTier, description: e.target.value})}
                    placeholder="等級描述"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditTierDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={editMembershipTier}>
                    更新
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Category Dialog */}
        <Dialog open={isEditCategoryDialogOpen} onOpenChange={setIsEditCategoryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>編輯分類</DialogTitle>
            </DialogHeader>
            {editingCategory && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>分類名稱 (英文)</Label>
                  <Input
                    value={editingCategory.name}
                    onChange={(e) => setEditingCategory({...editingCategory, name: e.target.value})}
                    placeholder="例如: ai-tools"
                  />
                </div>
                <div className="space-y-2">
                  <Label>顯示名稱</Label>
                  <Input
                    value={editingCategory.display_name}
                    onChange={(e) => setEditingCategory({...editingCategory, display_name: e.target.value})}
                    placeholder="例如: AI工具專區"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditCategoryDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={editCategory}>
                    更新
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default MembershipManagement;