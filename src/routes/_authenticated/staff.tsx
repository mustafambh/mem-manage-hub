import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { UserCog, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { createStaffMember } from "@/lib/staff.functions";

export const Route = createFileRoute("/_authenticated/staff")({
  component: StaffPage,
});

function StaffPage() {
  const { isAdmin, loading, user, clubId, clubCode } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const createStaff = useServerFn(createStaffMember);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", username: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

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
    if (!clubId) return toast.error("النادي غير محدد");
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role, club_id: clubId });
    if (error) return toast.error(error.message);
    toast.success("تم التحديث");
    qc.invalidateQueries({ queryKey: ["staff"] });
  };

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createStaff({ data: form });
      toast.success("تم إنشاء حساب الموظف");
      qc.invalidateQueries({ queryKey: ["staff"] });
      setOpen(false);
      setForm({ full_name: "", username: "", password: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UserCog className="w-7 h-7 text-primary" /> الموظفون
          </h1>
          <p className="text-muted-foreground mt-1">
            رمز ناديك: <span className="font-mono text-foreground">{clubCode ?? "—"}</span>
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary shadow-glow"><UserPlus className="w-4 h-4 ms-2" /> موظف جديد</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>إضافة موظف</DialogTitle></DialogHeader>
            <form onSubmit={submitNew} className="space-y-4">
              <div className="space-y-2">
                <Label>الاسم الكامل</Label>
                <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>اسم المستخدم (إنجليزي)</Label>
                <Input
                  required
                  pattern="[a-zA-Z0-9_.\-]{2,50}"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  dir="ltr"
                  placeholder="ahmed.salem"
                />
                <p className="text-xs text-muted-foreground">
                  سيدخل الموظف باستخدام رمز النادي + اسم المستخدم + كلمة المرور
                </p>
              </div>
              <div className="space-y-2">
                <Label>كلمة المرور</Label>
                <Input required type="text" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} dir="ltr" />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting} className="gradient-primary shadow-glow">
                  {submitting ? "..." : "إنشاء"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4 shadow-card border-border/50">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الاسم</TableHead>
              <TableHead className="text-right">البريد / اسم المستخدم</TableHead>
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
