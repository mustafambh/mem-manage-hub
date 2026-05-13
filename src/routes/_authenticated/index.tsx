import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, CreditCard, CalendarCheck, TrendingUp, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

function StatCard({
  title,
  value,
  icon: Icon,
  hint,
  accent,
}: {
  title: string;
  value: string | number;
  icon: typeof Users;
  hint?: string;
  accent?: string;
}) {
  return (
    <Card className="p-5 shadow-card border-border/50 hover:border-primary/40 transition">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-3xl font-bold mt-2 ${accent ?? ""}`}>{value}</p>
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        </div>
        <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
          <Icon className="w-5 h-5 text-primary-foreground" />
        </div>
      </div>
    </Card>
  );
}

function Dashboard() {
  const { isAdmin } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthIso = monthStart.toISOString();

      const [members, activeSubs, expiring, monthRevenue] = await Promise.all([
        supabase.from("members").select("id", { count: "exact", head: true }),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active").gte("end_date", today),
        supabase.from("subscriptions").select("id, end_date, member_id, members(full_name)").eq("status", "active").gte("end_date", today).lte("end_date", new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)).order("end_date"),
        supabase.from("payments").select("amount").gte("paid_at", monthIso).eq("status", "completed"),
      ]);

      const revenue = (monthRevenue.data ?? []).reduce((sum, p) => sum + Number(p.amount), 0);

      return {
        members: members.count ?? 0,
        activeSubs: activeSubs.count ?? 0,
        expiring: expiring.data ?? [],
        revenue,
      };
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">لوحة التحكم</h1>
        <p className="text-muted-foreground mt-1">نظرة عامة على نشاط النادي</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="إجمالي الأعضاء" value={stats?.members ?? "-"} icon={Users} />
        <StatCard title="الاشتراكات النشطة" value={stats?.activeSubs ?? "-"} icon={CalendarCheck} accent="text-success" />
        <StatCard
          title="إيرادات الشهر"
          value={stats ? `${stats.revenue.toLocaleString("ar-EG")} ج.م` : "-"}
          icon={TrendingUp}
          hint="من بداية الشهر"
        />
        <StatCard
          title="ينتهي خلال ٧ أيام"
          value={stats?.expiring.length ?? "-"}
          icon={AlertCircle}
          accent="text-warning"
        />
      </div>

      <Card className="p-6 shadow-card border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-warning" />
          <h2 className="text-lg font-semibold">اشتراكات قاربت على الانتهاء</h2>
        </div>
        {stats && stats.expiring.length > 0 ? (
          <div className="divide-y divide-border/50">
            {stats.expiring.map((s: any) => {
              const daysLeft = Math.ceil((new Date(s.end_date).getTime() - Date.now()) / 86400000);
              return (
                <div key={s.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{s.members?.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">ينتهي في {s.end_date}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium">
                    باقي {daysLeft} يوم
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">لا توجد اشتراكات قاربت على الانتهاء.</p>
        )}
      </Card>

      {isAdmin && (
        <Card className="p-6 shadow-card border-border/50 bg-gradient-to-br from-card to-accent/10">
          <p className="text-sm">
            👋 أنت مسجَّل كمدير. يمكنك إدارة الباقات والموظفين وعرض التقارير من القائمة الجانبية.
          </p>
        </Card>
      )}
    </div>
  );
}
