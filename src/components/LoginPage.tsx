import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import heroImage from "@/assets/hero-cat-ai.jpg";

interface LoginPageProps {
  onLogin: (email: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "請輸入email",
        description: "請輸入有效的email地址",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    // 模擬登入過程
    setTimeout(() => {
      onLogin(email);
      toast({
        title: "登入成功！",
        description: `歡迎回來，${email}`,
      });
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Hero Section */}
        <div className="text-center lg:text-left space-y-6">
          <div className="space-y-4">
            <h1 className="text-5xl lg:text-7xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              CatMan
            </h1>
            <h2 className="text-3xl lg:text-4xl font-semibold text-foreground">
              AI 學習專家
            </h2>
            <p className="text-xl text-muted-foreground max-w-md mx-auto lg:mx-0">
              專教人善用AI的貓咪老師，讓你輕鬆掌握人工智慧的力量！
            </p>
          </div>
          
          <div className="relative">
            <img 
              src={heroImage} 
              alt="CatMan AI Teacher" 
              className="rounded-2xl shadow-elevated max-w-full h-auto"
            />
          </div>
        </div>

        {/* Login Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          <Card className="shadow-card border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-2xl bg-gradient-primary bg-clip-text text-transparent">
                開始你的AI學習之旅
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                輸入你的email來解鎖專屬內容
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">
                    Email 地址
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-background/50 border-border focus:ring-primary"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-300 transform hover:scale-105 shadow-glow"
                  disabled={isLoading}
                >
                  {isLoading ? "登入中..." : "開始學習 🐱"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}