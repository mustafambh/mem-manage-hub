import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Activity, KeyRound } from "lucide-react";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [clubCode, setClubCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate({ to: "/" });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const code = clubCode.trim();
      const { data: club } = await supabase
        .from("clubs")
        .select("id")
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle();
      if (!club) {
        throw new Error("رمز النادي غير صحيح أو غير مفعّل");
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: fullName, club_code: code },
        },
      });
      if (error) throw error;
      toast.success("تم إنشاء حساب المدير بنجاح");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-glow mb-4">
            <Activity className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-gradient">تسجيل نادٍ جديد</h1>
          <p className="text-muted-foreground mt-2">أنشئ حساب المدير لناديك باستخدام الرمز المُعطى لك</p>
        </div>

        <Card className="p-6 shadow-card border-border/50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code" className="flex items-center gap-2">
                <KeyRound className="w-4 h-4" /> رمز النادي
              </Label>
              <Input
                id="code"
                required
                value={clubCode}
                onChange={(e) => setClubCode(e.target.value)}
                placeholder="مثال: CLUB-AHLI-2026"
                dir="ltr"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">اسم المدير الكامل</Label>
              <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" placeholder="name@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" placeholder="••••••••" />
            </div>
            <Button type="submit" disabled={loading} className="w-full gradient-primary shadow-glow">
              {loading ? "جارٍ الإنشاء..." : "إنشاء حساب المدير"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            لا يصلح هذا الرمز لتسجيل أكثر من مدير. الموظفون يُضافون من داخل لوحة التحكم.
          </p>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          عندك حساب؟ <Link to="/login" className="text-primary hover:underline">تسجيل الدخول</Link>
        </p>
      </div>
    </div>
  );
}
