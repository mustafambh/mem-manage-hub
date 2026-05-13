import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect } from "react";
import { UserCog } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/staff")({
  component: StaffPage,
});

function StaffPage() {
  const { isAdmin, loading, user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => { if (!loading && !isAdmin) navigate({ to: "/" }); }, [loading, isAdmin, navigate]);

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const [profiles, roles] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("*"),
      ]);
      const roleMap = new Map((roles.data ?? []).map((r) => [r.user_id, r.role]));
      return (profiles.data ?? []).map((p) => ({ ...p, role: roleMap.get(p.id) ?? "staff" }));
    },
  });

  const updateRole = async (userId: string, role: "admin" | "staff") => {
    if (userId === user?.id) return toast.error("لا يمكنك تغيير صلاحياتك بنفسك");
    const { error } = await supabase.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
    if (error) return toast.error(error.message);
    // delete the other role
    const otherRole = role === "admin" ? "staff" : "admin";
    await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", otherRole);
    toast.success("تم التحديث");
    qc.invalidateQueries({ queryKey: ["staff"] });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <UserCog className="w-7 h-7 text-primary" /> الموظفون
        </h1>
        <p className="text-muted-foreground mt-1">إدارة صلاحيات الفريق</p>
      </div>

      <Card className="p-4 shadow-card border-border/50">
        <p className="text-sm text-muted-foreground mb-4 p-3 rounded-lg bg-muted/30">
          💡 لإضافة موظف جديد، اطلب منه التسجيل من صفحة الدخول. سيُسجَّل تلقائيًا كموظف، ويمكنك ترقيته من هنا.
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الاسم</TableHead>
              <TableHead className="text-right">البريد</TableHead>
              <TableHead className="text-right">الصلاحية</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.full_name || "—"}</TableCell>
                <TableCell dir="ltr" className="text-right">{s.email ?? "—"}</TableCell>
                <TableCell>
                  <Select value={s.role} onValueChange={(v) => updateRole(s.id, v as "admin" | "staff")}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">مدير</SelectItem>
                      <SelectItem value="staff">موظف</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
