import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Activity } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
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
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب بنجاح");
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("مرحبًا بعودتك");
        navigate({ to: "/" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
      toast.error(msg);
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
          <h1 className="text-3xl font-bold text-gradient">نظام إدارة الاشتراكات</h1>
          <p className="text-muted-foreground mt-2">للنوادي، المسابح، والأكاديميات</p>
        </div>

        <Card className="p-6 shadow-card border-border/50">
          <div className="flex gap-2 mb-6 p-1 bg-muted rounded-lg">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                mode === "signin" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                mode === "signup" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              حساب جديد
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">الاسم الكامل</Label>
                <Input
                  id="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="أدخل اسمك الكامل"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full gradient-primary shadow-glow">
              {loading ? "جارٍ المعالجة..." : mode === "signup" ? "إنشاء حساب" : "دخول"}
            </Button>
          </form>

          {mode === "signup" && (
            <p className="text-xs text-muted-foreground mt-4 text-center">
              أول مستخدم يتم تسجيله يصبح مديرًا تلقائيًا. باقي الحسابات تُسجّل كموظفين.
            </p>
          )}
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link to="/" className="hover:text-primary">العودة للرئيسية</Link>
        </p>
      </div>
    </div>
  );
}
