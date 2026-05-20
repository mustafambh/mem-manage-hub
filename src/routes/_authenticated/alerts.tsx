import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, BellRing, Save } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/alerts")({
  component: AlertsPage,
});

function AlertsPage() {
  const { clubId, isAdmin, user } = useAuth();
  const qc = useQueryClient();
  const [days, setDays] = useState<number>(7);

  const { data: club } = useQuery({
    queryKey: ["club-settings", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data } = await supabase.from("clubs").select("*").eq("id", clubId!).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (club?.alert_days_before != null) setDays(club.alert_days_before);
  }, [club?.alert_days_before]);

  const threshold = days;
  const todayStr = new Date().toISOString().slice(0, 10);
  const limitStr = new Date(Date.now() + threshold * 86400000).toISOString().slice(0, 10);

  const { data: upcoming = [] } = useQuery({
    queryKey: ["upcoming-expirations", threshold, clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("id, end_date, status, member_id, members(full_name, phone)")
        .eq("status", "active")
        .gte("end_date", todayStr)
        .lte("end_date", limitStr)
        .order("end_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: log = [] } = useQuery({
    queryKey: ["subscription-alerts-log", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_alerts")
        .select("*, members(full_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveDays = async () => {
    if (!clubId) return;
    const n = Math.max(1, Math.min(60, Number(days) || 7));
    const { error } = await supabase.from("clubs").update({ alert_days_before: n }).eq("id", clubId);
    if (error) return toast.error(error.message);
    toast.success("تم حفظ الإعدادات");
    qc.invalidateQueries({ queryKey: ["club-settings"] });
    qc.invalidateQueries({ queryKey: ["upcoming-expirations"] });
  };

  const markNotified = async (s: any) => {
    if (!clubId) return;
    const dr = Math.ceil((new Date(s.end_date).getTime() - Date.now()) / 86400000);
    const { error } = await supabase.from("subscription_alerts").insert({
      club_id: clubId,
      subscription_id: s.id,
      member_id: s.member_id,
      days_remaining: dr,
      end_date: s.end_date,
      notified_by: user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success("تم تسجيل التنبيه");
    qc.invalidateQueries({ queryKey: ["subscription-alerts-log"] });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2">
        <Bell className="w-7 h-7 text-primary" />
        <h1 className="text-3xl font-bold">تنبيهات الاشتراكات</h1>
      </div>

      {isAdmin && (
        <Card className="p-4 shadow-card border-border/50">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Label>عدد الأيام قبل انتهاء الاشتراك لإظهار التنبيه</Label>
              <Input
                type="number"
                min={1}
                max={60}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              />
            </div>
            <Button onClick={saveDays} className="gradient-primary shadow-glow">
              <Save className="w-4 h-4 ms-2" /> حفظ
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-4 shadow-card border-border/50 overflow-x-auto">
        <div className="flex items-center gap-2 mb-3">
          <BellRing className="w-5 h-5 text-warning" />
          <h2 className="text-lg font-semibold">
            اشتراكات تنتهي خلال {threshold} يوم ({upcoming.length})
          </h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">العضو</TableHead>
              <TableHead className="text-right">الهاتف</TableHead>
              <TableHead className="text-right">تاريخ الانتهاء</TableHead>
              <TableHead className="text-right">الأيام المتبقية</TableHead>
              <TableHead className="text-right">إجراء</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {upcoming.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  لا توجد اشتراكات قاربت على الانتهاء
                </TableCell>
              </TableRow>
            ) : (
              upcoming.map((s: any) => {
                const dr = Math.ceil((new Date(s.end_date).getTime() - Date.now()) / 86400000);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.members?.full_name}</TableCell>
                    <TableCell>{s.members?.phone ?? "—"}</TableCell>
                    <TableCell>{s.end_date}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${dr <= 2 ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
                        {dr} يوم
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => markNotified(s)}>
                        تسجيل تنبيه
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-4 shadow-card border-border/50 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-3">سجل التنبيهات ({log.length})</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">العضو</TableHead>
              <TableHead className="text-right">تاريخ الانتهاء</TableHead>
              <TableHead className="text-right">الأيام المتبقية عند التنبيه</TableHead>
              <TableHead className="text-right">تاريخ التسجيل</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {log.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  لا يوجد سجل
                </TableCell>
              </TableRow>
            ) : (
              log.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.members?.full_name ?? "—"}</TableCell>
                  <TableCell>{a.end_date}</TableCell>
                  <TableCell>{a.days_remaining} يوم</TableCell>
                  <TableCell>{new Date(a.created_at).toLocaleString("ar-EG")}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
