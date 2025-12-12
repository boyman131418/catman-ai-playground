import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Edit2, Save, X, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AnnouncementBoardProps {
  isAdmin: boolean;
  adminMode: boolean;
}

const AnnouncementBoard = ({ isAdmin, adminMode }: AnnouncementBoardProps) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast({
        title: "錯誤",
        description: "請填寫標題和內容",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('announcements')
        .insert({ title: newTitle, content: newContent });

      if (error) throw error;

      toast({
        title: "成功",
        description: "公告已發布",
      });
      setNewTitle("");
      setNewContent("");
      setIsAdding(false);
      loadAnnouncements();
    } catch (error) {
      console.error('Error adding announcement:', error);
      toast({
        title: "錯誤",
        description: "無法發布公告",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setEditTitle(announcement.title);
    setEditContent(announcement.content);
  };

  const handleSave = async () => {
    if (!editingId || !editTitle.trim() || !editContent.trim()) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .update({ title: editTitle, content: editContent })
        .eq('id', editingId);

      if (error) throw error;

      toast({
        title: "成功",
        description: "公告已更新",
      });
      setEditingId(null);
      loadAnnouncements();
    } catch (error) {
      console.error('Error updating announcement:', error);
      toast({
        title: "錯誤",
        description: "無法更新公告",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除此公告嗎？")) return;

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "成功",
        description: "公告已刪除",
      });
      loadAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast({
        title: "錯誤",
        description: "無法刪除公告",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card className="border-cat-orange/30 bg-gradient-to-br from-card/50 to-cat-orange/5">
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cat-orange mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  if (announcements.length === 0 && !isAdmin) {
    return null; // 沒有公告時，非管理員不顯示
  }

  return (
    <Card className="border-cat-orange/30 bg-gradient-to-br from-card/50 to-cat-orange/5 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-cat-orange/20">
              <Megaphone className="w-5 h-5 text-cat-orange" />
            </div>
            <CardTitle className="text-xl text-cat-orange">公告板</CardTitle>
            <Badge variant="secondary" className="bg-cat-orange/20 text-cat-orange border-cat-orange/30">
              {announcements.length} 則公告
            </Badge>
          </div>
          {isAdmin && adminMode && (
            <Button
              size="sm"
              onClick={() => setIsAdding(true)}
              className="bg-cat-orange hover:bg-cat-orange/90"
            >
              <Plus className="w-4 h-4 mr-1" />
              新增公告
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 新增公告表單 */}
        {isAdding && isAdmin && adminMode && (
          <div className="p-4 border border-cat-orange/30 rounded-lg bg-background/50 space-y-3">
            <Input
              placeholder="公告標題"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="border-cat-orange/30 focus:border-cat-orange"
            />
            <Textarea
              placeholder="公告內容"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={4}
              className="border-cat-orange/30 focus:border-cat-orange"
            />
            <div className="flex gap-2">
              <Button onClick={handleAdd} size="sm" className="bg-cat-orange hover:bg-cat-orange/90">
                <Save className="w-4 h-4 mr-1" />
                發布
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsAdding(false)}>
                <X className="w-4 h-4 mr-1" />
                取消
              </Button>
            </div>
          </div>
        )}

        {/* 公告列表 */}
        {announcements.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">暫無公告</p>
        ) : (
          announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="p-4 border border-border/50 rounded-lg bg-background/30 space-y-2"
            >
              {editingId === announcement.id && isAdmin && adminMode ? (
                <div className="space-y-3">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="border-cat-orange/30"
                  />
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={4}
                    className="border-cat-orange/30"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleSave} size="sm" className="bg-cat-orange hover:bg-cat-orange/90">
                      <Save className="w-4 h-4 mr-1" />
                      儲存
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                      <X className="w-4 h-4 mr-1" />
                      取消
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold text-foreground">{announcement.title}</h4>
                    {isAdmin && adminMode && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(announcement)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-cat-orange"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(announcement.id)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {announcement.content}
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    {formatDate(announcement.updated_at)}
                  </p>
                </>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default AnnouncementBoard;
