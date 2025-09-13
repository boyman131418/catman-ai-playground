import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Item {
  id: string;
  title: string;
  link: string;
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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
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
      const { error } = await supabase
        .from('items')
        .insert({
          category_id: categoryId,
          title: newTitle.trim(),
          link: newLink.trim(),
        });

      if (error) throw error;

      setNewTitle("");
      setNewLink("");
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
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-2 bg-background/50 rounded border border-border/30">
              <div className="flex-1">
                <span className="font-medium text-sm">{item.title}</span>
                <div className="text-xs text-muted-foreground truncate max-w-md">
                  {item.link}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDeleteItem(item.id)}
                disabled={isLoading}
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}