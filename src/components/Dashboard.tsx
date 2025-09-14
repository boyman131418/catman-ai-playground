import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ExternalLink, Sparkles, Lock, Settings } from "lucide-react";
import { User } from '@supabase/supabase-js';
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminPanel from "./AdminPanel";

interface Category {
  id: string;
  name: string;
  display_name: string;
  passwords: string[];
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

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const inviteUrl = "https://lovable.dev/invite/1e206a95-c6de-4ed1-a8bc-ef322934dd0c";
  const isAdmin = user.email === 'boyman131418@gmail.com';
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<{[key: string]: Item[]}>({});
  const [unlockedTabs, setUnlockedTabs] = useState<Set<string>>(new Set());
  const [passwords, setPasswords] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'admin' | 'member'>('admin');
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('created_at');

      if (categoriesError) throw categoriesError;

      // Load items
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .order('order_index');

      if (itemsError) throw itemsError;

      setCategories(categoriesData || []);
      
      // Group items by category_id
      const groupedItems: {[key: string]: Item[]} = {};
      (itemsData || []).forEach(item => {
        if (!groupedItems[item.category_id]) {
          groupedItems[item.category_id] = [];
        }
        groupedItems[item.category_id].push(item);
      });
      
      setItems(groupedItems);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "錯誤",
        description: "載入資料失敗",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "成功",
      description: "已複製到剪貼板",
    });
  };

  const handlePasswordSubmit = (categoryName: string, password: string) => {
    const category = categories.find(cat => cat.name === categoryName);
    
    if (category && category.passwords.includes(password)) {
      setUnlockedTabs(prev => new Set([...prev, categoryName]));
      setPasswords(prev => ({...prev, [categoryName]: ''}));
      toast({
        title: "成功",
        description: "解鎖成功！",
      });
    } else {
      toast({
        title: "錯誤",
        description: "密碼錯誤",
        variant: "destructive",
      });
    }
  };


  const renderPasswordPrompt = (category: Category) => (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <Lock className="w-12 h-12 text-muted-foreground" />
      <p className="text-muted-foreground">請輸入密碼以存取此專區</p>
      <div className="flex space-x-2">
        <Input
          type="password"
          placeholder="輸入密碼"
          value={passwords[category.name] || ''}
          onChange={(e) => setPasswords(prev => ({...prev, [category.name]: e.target.value}))}
          onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit(category.name, passwords[category.name] || '')}
          className="w-48"
        />
        <Button onClick={() => handlePasswordSubmit(category.name, passwords[category.name] || '')}>
          解鎖
        </Button>
      </div>
    </div>
  );

  const renderDataTable = (categoryItems: Item[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>標題</TableHead>
          <TableHead>備註</TableHead>
          <TableHead>連結</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {categoryItems.sort((a, b) => a.order_index - b.order_index).map((item) => (
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

  if (loading) {
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
              專屬會員
            </Badge>
          </div>
          <div className="flex items-center space-x-4">
            {isAdmin && (
              <>
                <Badge variant="outline" className="bg-cat-orange/10 text-cat-orange border-cat-orange/30">
                  <Settings className="w-3 h-3 mr-1" />
                  {viewMode === 'admin' ? '管理模式' : '會員模式'}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'admin' ? 'member' : 'admin')}
                  className="text-xs"
                >
                  切換到{viewMode === 'admin' ? '會員' : '管理'}模式
                </Button>
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
            <Button variant="outline" size="sm" onClick={onLogout}>
              登出
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold text-foreground">
              歡迎回來！ 🎉
            </h2>
            <p className="text-xl text-muted-foreground">
              準備好探索AI的無限可能了嗎？
            </p>
          </div>

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
              </div>
            </CardContent>
          </Card>

          {/* Resource Tabs */}
          <div className="space-y-6">
            {categories.length > 0 && (
              <Tabs defaultValue={categories[0]?.name} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  {categories.map((category) => (
                    <TabsTrigger key={category.name} value={category.name}>
                      {category.display_name}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {categories.map((category) => (
                  <TabsContent key={category.name} value={category.name}>
                    <Card className="shadow-card">
                      <CardHeader>
                        <CardTitle className="text-xl">{category.display_name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {unlockedTabs.has(category.name) || (isAdmin && viewMode === 'admin')
                          ? renderDataTable(items[category.id] || [])
                          : renderPasswordPrompt(category)
                        }
                        {isAdmin && viewMode === 'admin' && (
                          <AdminPanel
                            categoryId={category.id}
                            categoryName={category.display_name}
                            items={items[category.id] || []}
                            onItemsChange={loadData}
                          />
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>

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
}