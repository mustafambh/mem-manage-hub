import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Activity, KeyRound } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

type Mode = "admin" | "staff";

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("admin");

  // admin
  const [email, setEmail] = useState("");
  // staff
  const [clubCode, setClubCode] = useState("");
  const [username, setUsername] = useState("");
  // shared
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
      const loginEmail =
        mode === "admin"
          ? email.trim()
          : `${username.trim().toLowerCase()}@${clubCode.trim().toLowerCase()}.local`;
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
      if (error) throw error;
      toast.success("مرحبًا بعودتك");
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
          <h1 className="text-3xl font-bold text-gradient">نظام إدارة الاشتراكات</h1>
          <p className="text-muted-foreground mt-2">سجّل دخولك للمتابعة</p>
        </div>

        <Card className="p-6 shadow-card border-border/50">
          <div className="flex gap-2 mb-6 p-1 bg-muted rounded-lg">
            <button
              type="button"
              onClick={() => setMode("admin")}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                mode === "admin" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              مدير نادي
            </button>
            <button
              type="button"
              onClick={() => setMode("staff")}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                mode === "staff" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              موظف
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "admin" ? (
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
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="code" className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4" /> رمز النادي
                  </Label>
                  <Input
                    id="code"
                    required
                    value={clubCode}
                    onChange={(e) => setClubCode(e.target.value)}
                    placeholder="CLUB-..."
                    dir="ltr"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">اسم المستخدم</Label>
                  <Input
                    id="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    dir="ltr"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full gradient-primary shadow-glow">
              {loading ? "جارٍ الدخول..." : "دخول"}
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          لديك رمز نادٍ جديد؟ <Link to="/signup" className="text-primary hover:underline">سجّل ناديك</Link>
        </p>
      </div>
    </div>
  );
}
