import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { BarChart3, Download } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

function exportCSV(filename: string, rows: any[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportsPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !isAdmin) navigate({ to: "/" }); }, [loading, isAdmin, navigate]);

  const { data } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);

      const [members, subs, payments, pkgRevenue] = await Promise.all([
        supabase.from("members").select("*"),
        supabase.from("subscriptions").select("*, members(full_name), packages(name)"),
        supabase.from("payments").select("*, members(full_name)").gte("paid_at", sixMonthsAgo.toISOString()),
        supabase.from("subscriptions").select("packages(name, price)"),
      ]);

      // monthly revenue
      const monthly = new Map<string, number>();
      (payments.data ?? []).forEach((p: any) => {
        const key = new Date(p.paid_at).toISOString().slice(0, 7);
        monthly.set(key, (monthly.get(key) ?? 0) + Number(p.amount));
      });
      const monthlyArr = Array.from(monthly.entries()).sort().map(([month, total]) => ({ month, total }));

      // popular packages
      const pkgCount = new Map<string, number>();
      (pkgRevenue.data ?? []).forEach((s: any) => {
        const n = s.packages?.name ?? "—";
        pkgCount.set(n, (pkgCount.get(n) ?? 0) + 1);
      });

      return {
        members: members.data ?? [],
        subs: subs.data ?? [],
        payments: payments.data ?? [],
        monthly: monthlyArr,
        popularPkgs: Array.from(pkgCount.entries()).sort((a, b) => b[1] - a[1]),
      };
    },
  });

  const maxRevenue = Math.max(1, ...(data?.monthly.map((m) => m.total) ?? [1]));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-primary" /> التقارير
        </h1>
        <p className="text-muted-foreground mt-1">إحصاءات وتصدير البيانات</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6 shadow-card border-border/50">
          <h2 className="font-semibold mb-4">الدخل الشهري — آخر ٦ شهور</h2>
          <div className="space-y-3">
            {data?.monthly.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد بيانات</p> :
              data?.monthly.map((m) => (
                <div key={m.month}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{m.month}</span>
                    <span className="text-primary font-bold">{m.total.toLocaleString("ar-EG")} ج.م</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full gradient-primary rounded-full" style={{ width: `${(m.total / maxRevenue) * 100}%` }} />
                  </div>
                </div>
              ))
            }
          </div>
        </Card>

        <Card className="p-6 shadow-card border-border/50">
          <h2 className="font-semibold mb-4">الباقات الأكثر مبيعًا</h2>
          <div className="space-y-3">
            {data?.popularPkgs.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد بيانات</p> :
              data?.popularPkgs.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span className="font-medium">{name}</span>
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold">{count} اشتراك</span>
                </div>
              ))
            }
          </div>
        </Card>
      </div>

      <Card className="p-6 shadow-card border-border/50">
        <h2 className="font-semibold mb-4">تصدير CSV</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => exportCSV("members.csv", data?.members ?? [])}>
            <Download className="w-4 h-4 ms-2" /> الأعضاء ({data?.members.length ?? 0})
          </Button>
          <Button variant="outline" onClick={() => exportCSV("subscriptions.csv", data?.subs ?? [])}>
            <Download className="w-4 h-4 ms-2" /> الاشتراكات ({data?.subs.length ?? 0})
          </Button>
          <Button variant="outline" onClick={() => exportCSV("payments.csv", data?.payments ?? [])}>
            <Download className="w-4 h-4 ms-2" /> المدفوعات ({data?.payments.length ?? 0})
          </Button>
        </div>
      </Card>
    </div>
  );
}
