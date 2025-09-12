import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Sparkles, BookOpen, Zap } from "lucide-react";

interface DashboardProps {
  userEmail: string;
  onLogout: () => void;
}

export default function Dashboard({ userEmail, onLogout }: DashboardProps) {
  const inviteUrl = "https://lovable.dev/invite/1e206a95-c6de-4ed1-a8bc-ef322934dd0c";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

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
            <span className="text-sm text-muted-foreground">{userEmail}</span>
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

          {/* Learning Resources */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="shadow-card hover:shadow-elevated transition-all duration-300">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-ai-blue/20">
                    <BookOpen className="w-5 h-5 text-ai-blue" />
                  </div>
                  <CardTitle className="text-xl">AI 基礎教學</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  從零開始學習人工智慧的基本概念和應用方法
                </p>
                <Button variant="outline" className="w-full">
                  開始學習
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-card hover:shadow-elevated transition-all duration-300">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-cat-orange/20">
                    <Zap className="w-5 h-5 text-cat-orange" />
                  </div>
                  <CardTitle className="text-xl">實戰技巧</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  掌握AI工具的實用技巧，提升工作效率
                </p>
                <Button variant="outline" className="w-full">
                  查看技巧
                </Button>
              </CardContent>
            </Card>
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