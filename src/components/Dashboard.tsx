import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ExternalLink, Sparkles, BookOpen, Zap, Lock } from "lucide-react";
import { User } from '@supabase/supabase-js';
import { useState } from "react";

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const inviteUrl = "https://lovable.dev/invite/1e206a95-c6de-4ed1-a8bc-ef322934dd0c";
  
  const [unlockedTabs, setUnlockedTabs] = useState<Set<string>>(new Set());
  const [passwords, setPasswords] = useState<{[key: string]: string}>({});

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handlePasswordSubmit = (tabId: string, password: string) => {
    const validPasswords: {[key: string]: string[]} = {
      meta: ['meta', 'symptom'],
      crypto: ['symptom'],
      ai: ['symptom'],
      tools: ['symptom']
    };

    if (validPasswords[tabId]?.includes(password)) {
      setUnlockedTabs(prev => new Set([...prev, tabId]));
      setPasswords(prev => ({...prev, [tabId]: ''}));
    }
  };

  const tabsData = {
    meta: {
      title: 'Meta 學員專區',
      data: [
        { title: 'EXCEL TO EXCEL', link: 'https://drive.google.com/file/d/1Z-KrnrWDsd0NvfJZtORnIVO4azTeOtgi/view?usp=sharing' },
        { title: '私人助理', link: 'https://drive.google.com/file/d/1AF9oCWzf1zlVLKaoBDvj3f4ygGWReb7w/view?usp=sharing' },
        { title: '玄學案例', link: 'https://drive.google.com/file/d/1nAGrXEntfmAVA6pfcTkplR-MrNZwNrr9/view?usp=sharing' },
        { title: '虛擬KOL', link: 'https://drive.google.com/file/d/1KO4CE-gt20IlnkWZKAmVVTZHyiBTOz2K/view?usp=drive_link' }
      ]
    },
    crypto: {
      title: '加密貨幣專區',
      data: [
        { title: 'BTC 持幣情況', link: 'https://chainexposed.com/HoldWavesRealized.html' },
        { title: 'BTC彩虹通道', link: 'https://www.blockchaincenter.net/en/bitcoin-rainbow-chart/' },
        { title: 'CBBI指數', link: 'https://colintalkscrypto.com/cbbi/index.html' },
        { title: 'BTC 逃頂指數', link: 'https://www.coinglass.com/zh-TW/pro/i/MA' },
        { title: 'BTC熱力圖', link: 'https://buybitcoinworldwide.com/stats/stock-to-flow/' },
        { title: 'BTC預測圖', link: 'https://coindataflow.com/zh/%E9%A2%84%E6%B5%8B/bitcoin' }
      ]
    },
    ai: {
      title: '人工智能專區',
      data: [
        { title: 'ChatGPT', link: 'https://chatgpt.com' },
        { title: 'Poe', link: 'https://poe.com' },
        { title: '豆包', link: 'https://www.doubao.com/' },
        { title: 'CHATGPT MQL5 分析', link: 'https://chatgpt.com/g/g-dPlAXfGfX-mql5fen-xi-xi-tong' }
      ]
    },
    tools: {
      title: '功能性網址專區',
      data: [
        { title: '翻譯軟件', link: 'https://chromewebstore.google.com/detail/%E6%B2%89%E6%B5%B8%E5%BC%8F%E7%BF%BB%E8%AD%AF-%E7%B6%B2%E9%A0%81%E7%BF%BB%E8%AD%AF%E6%93%B4%E5%85%85-pdf%E7%BF%BB%E8%AD%AF-%E5%85%8D%E8%B2%BB/bpoadfkcbjbfhfodiogcnhhhpibjhbnh?hl=zh-TW&utm_source=ext_sidebar' },
        { title: '查 流量 註冊', link: 'https://chromewebstore.google.com/detail/ip-whois-flags-chrome-web/kmdfbacgombndnllogoijhnggalgmkon?hl=zh-TW&utm_source=ext_sidebar' },
        { title: '查鏈協助', link: 'https://chromewebstore.google.com/detail/metasuites-builders-swiss/fkhgpeojcbhimodmppkbbliepkpcgcoo?hl=zh-TW&utm_source=ext_sidebar' },
        { title: '錢包', link: 'https://chromewebstore.google.com/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?utm_source=ext_app_menu' }
      ]
    }
  };

  const renderPasswordPrompt = (tabId: string) => (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <Lock className="w-12 h-12 text-muted-foreground" />
      <p className="text-muted-foreground">請輸入密碼以存取此專區</p>
      <div className="flex space-x-2">
        <Input
          type="password"
          placeholder="輸入密碼"
          value={passwords[tabId] || ''}
          onChange={(e) => setPasswords(prev => ({...prev, [tabId]: e.target.value}))}
          onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit(tabId, passwords[tabId] || '')}
          className="w-48"
        />
        <Button onClick={() => handlePasswordSubmit(tabId, passwords[tabId] || '')}>
          解鎖
        </Button>
      </div>
    </div>
  );

  const renderDataTable = (data: {title: string, link: string}[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>標題</TableHead>
          <TableHead>連結</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item, index) => (
          <TableRow key={index}>
            <TableCell className="font-medium">{item.title}</TableCell>
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
            <Tabs defaultValue="meta" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="meta">Meta 學員專區</TabsTrigger>
                <TabsTrigger value="crypto">加密貨幣專區</TabsTrigger>
                <TabsTrigger value="ai">人工智能專區</TabsTrigger>
                <TabsTrigger value="tools">功能性網址專區</TabsTrigger>
              </TabsList>

              {Object.entries(tabsData).map(([tabId, tabData]) => (
                <TabsContent key={tabId} value={tabId}>
                  <Card className="shadow-card">
                    <CardHeader>
                      <CardTitle className="text-xl">{tabData.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {unlockedTabs.has(tabId) 
                        ? renderDataTable(tabData.data)
                        : renderPasswordPrompt(tabId)
                      }
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
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