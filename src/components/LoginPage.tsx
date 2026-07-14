import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-cat-ai.jpg";
import { Sparkles } from "lucide-react";

interface LoginPageProps {
  // No props needed as auth state is managed globally
}

export default function LoginPage({}: LoginPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/catman-ai-playground/`
        }
      });

      if (error) {
        toast({
          title: "登入失敗",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "登入失敗",
        description: "請稍後再試",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
              loading="eager"
              decoding="async"
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
                使用 Google 帳戶快速登入
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button 
                  onClick={handleGoogleLogin}
                  className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-300 transform hover:scale-105 shadow-glow"
                  disabled={isLoading}
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {isLoading ? "登入中..." : "使用 Google 登入 🐱"}
                </Button>
              </div>
              <div className="mt-4 pt-4 border-t border-border/50">
                <Link to="/tarot">
                  <Button variant="outline" className="w-full gap-2">
                    <Sparkles className="w-4 h-4" /> 免費體驗塔羅牌占卜
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}