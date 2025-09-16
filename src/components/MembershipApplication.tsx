import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface MembershipTier {
  id: string;
  name: string;
  display_name: string;
  description: string;
}

interface MembershipApplicationProps {
  membershipTiers: MembershipTier[];
}

const MembershipApplication = ({ membershipTiers }: MembershipApplicationProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [selectedTier, setSelectedTier] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.email || !selectedTier) {
      toast({
        title: "錯誤",
        description: "請先登入並選擇會員等級",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('apply-membership', {
        body: {
          email: user.email,
          displayName: user.email,
          membershipTierName: selectedTier
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "申請成功",
        description: "您的會員申請已提交，等待管理員審核",
      });

      // Reset form
      setSelectedTier("");
    } catch (error) {
      console.error('Application error:', error);
      toast({
        title: "申請失敗",
        description: "提交申請時發生錯誤，請稍後再試",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>申請會員</CardTitle>
        <CardDescription>
          選擇會員等級申請成為會員，管理員審核後即可使用相應權限
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!user ? (
          <div className="text-center text-muted-foreground">
            請先登入才能申請會員
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>登入帳戶</Label>
              <div className="p-3 bg-muted rounded-md">
                <span className="text-sm font-medium">{user.email}</span>
              </div>
            </div>
          
          <div className="space-y-2">
            <Label htmlFor="membershipTier">會員等級</Label>
            <Select value={selectedTier} onValueChange={setSelectedTier}>
              <SelectTrigger>
                <SelectValue placeholder="選擇會員等級" />
              </SelectTrigger>
              <SelectContent>
                {membershipTiers
                  .filter(tier => tier.name !== 'admin')
                  .map((tier) => (
                    <SelectItem key={tier.id} value={tier.name}>
                      {tier.display_name} - {tier.description}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? "提交中..." : "提交申請"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default MembershipApplication;