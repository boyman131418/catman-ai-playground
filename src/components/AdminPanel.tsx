import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Edit, ChevronUp, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Item {
  id: string;
  title: string;
  link: string;
  description: string;
  order_index: number;
}

interface AdminPanelProps {
  categoryId: string;
  categoryName: string;
  items: Item[];
  onItemsChange: () => void;
}

export default function AdminPanel({ categoryId, categoryName, items, onItemsChange }: AdminPanelProps) {
  const [newTitle, setNewTitle] = useState("");
  const [newLink, setNewLink] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAddItem = async () => {
    if (!newTitle.trim() || !newLink.trim()) {
      toast({
        title: "錯誤",
        description: "請填寫標題和連結",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Get the highest order_index for this category
      const { data: maxOrderData } = await supabase
        .from('items')
        .select('order_index')
        .eq('category_id', categoryId)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrderIndex = maxOrderData && maxOrderData.length > 0 ? maxOrderData[0].order_index + 1 : 1;

      const { error } = await supabase
        .from('items')
        .insert({
          category_id: categoryId,
          title: newTitle.trim(),
          link: newLink.trim(),
          description: newDescription.trim(),
          order_index: nextOrderIndex,
        });

      if (error) throw error;

      setNewTitle("");
      setNewLink("");
      setNewDescription("");
      setIsAddDialogOpen(false);
      onItemsChange();
      
      toast({
        title: "成功",
        description: "項目已添加",
      });
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: "錯誤",
        description: "添加項目失敗",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditItem = async () => {
    if (!editItem || !editItem.title.trim() || !editItem.link.trim()) {
      toast({
        title: "錯誤",
        description: "請填寫標題和連結",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('items')
        .update({
          title: editItem.title.trim(),
          link: editItem.link.trim(),
          description: editItem.description.trim(),
        })
        .eq('id', editItem.id);

      if (error) throw error;

      setEditItem(null);
      setIsEditDialogOpen(false);
      onItemsChange();
      
      toast({
        title: "成功",
        description: "項目已更新",
      });
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: "錯誤",
        description: "更新項目失敗",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      onItemsChange();
      
      toast({
        title: "成功",
        description: "項目已刪除",
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "錯誤",
        description: "刪除項目失敗",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveItem = async (itemId: string, direction: 'up' | 'down') => {
    const sortedItems = [...items].sort((a, b) => a.order_index - b.order_index);
    const currentIndex = sortedItems.findIndex(item => item.id === itemId);
    
    if (currentIndex === -1) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === sortedItems.length - 1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const currentItem = sortedItems[currentIndex];
    const targetItem = sortedItems[targetIndex];

    setIsLoading(true);
    try {
      // Swap order_index values
      await supabase
        .from('items')
        .update({ order_index: targetItem.order_index })
        .eq('id', currentItem.id);

      await supabase
        .from('items')
        .update({ order_index: currentItem.order_index })
        .eq('id', targetItem.id);

      onItemsChange();
      
      toast({
        title: "成功",
        description: "項目順序已更新",
      });
    } catch (error) {
      console.error('Error moving item:', error);
      toast({
        title: "錯誤",
        description: "移動項目失敗",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mt-4 border-cat-orange/30 bg-cat-orange/5">
      <CardHeader>
        <CardTitle className="text-sm text-cat-orange flex items-center justify-between">
          管理員模式 - {categoryName}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="border-cat-orange/30 text-cat-orange hover:bg-cat-orange/10">
                <Plus className="w-4 h-4 mr-1" />
                添加項目
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>添加新項目到 {categoryName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">標題</Label>
                  <Input
                    id="title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="輸入標題"
                  />
                </div>
                <div>
                  <Label htmlFor="link">連結</Label>
                  <Input
                    id="link"
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    placeholder="輸入完整網址 (包含 https://)"
                  />
                </div>
                <div>
                  <Label htmlFor="description">備註</Label>
                  <Textarea
                    id="description"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="輸入項目描述或備註"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleAddItem} disabled={isLoading}>
                    {isLoading ? "添加中..." : "添加"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.sort((a, b) => a.order_index - b.order_index).map((item, index) => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-background/50 rounded border border-border/30">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{item.title}</span>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {item.link}
                </div>
                {item.description && (
                  <div className="text-xs text-muted-foreground mt-1 max-w-md">
                    {item.description}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 ml-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleMoveItem(item.id, 'up')}
                  disabled={isLoading || index === 0}
                  className="p-1 h-7 w-7"
                >
                  <ChevronUp className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleMoveItem(item.id, 'down')}
                  disabled={isLoading || index === items.length - 1}
                  className="p-1 h-7 w-7"
                >
                  <ChevronDown className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditItem(item);
                    setIsEditDialogOpen(true);
                  }}
                  disabled={isLoading}
                  className="p-1 h-7 w-7 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                >
                  <Edit className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteItem(item.id)}
                  disabled={isLoading}
                  className="p-1 h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>編輯項目</DialogTitle>
            </DialogHeader>
            {editItem && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-title">標題</Label>
                  <Input
                    id="edit-title"
                    value={editItem.title}
                    onChange={(e) => setEditItem({...editItem, title: e.target.value})}
                    placeholder="輸入標題"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-link">連結</Label>
                  <Input
                    id="edit-link"
                    value={editItem.link}
                    onChange={(e) => setEditItem({...editItem, link: e.target.value})}
                    placeholder="輸入完整網址 (包含 https://)"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description">備註</Label>
                  <Textarea
                    id="edit-description"
                    value={editItem.description}
                    onChange={(e) => setEditItem({...editItem, description: e.target.value})}
                    placeholder="輸入項目描述或備註"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleEditItem} disabled={isLoading}>
                    {isLoading ? "更新中..." : "更新"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}