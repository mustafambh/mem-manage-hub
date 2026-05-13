import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { CalendarCheck, Plus } from "lucide-react";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  active: "نشط",
  expired: "منتهٍ",
  cancelled: "ملغى",
  frozen: "مجمد",
};

export const Route = createFileRoute("/_authenticated/subscriptions")({
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ member_id: "", package_id: "", start_date: new Date().toISOString().slice(0, 10), record_payment: true, method: "cash" });
  const [pendingStatus, setPendingStatus] = useState<{ id: string; status: string; memberName: string; currentStatus: string } | null>(null);

  const confirmStatusChange = async () => {
    if (!pendingStatus) return;
    const { error } = await supabase.from("subscriptions").update({ status: pendingStatus.status }).eq("id", pendingStatus.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("تم تحديث الحالة");
      qc.invalidateQueries({ queryKey: ["subscriptions"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    }
    setPendingStatus(null);
  };


  const { data: subs = [] } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, members(full_name, phone), packages(name, price)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members-list"],
    queryFn: async () => (await supabase.from("members").select("id, full_name").order("full_name")).data ?? [],
  });

  const { data: packages = [] } = useQuery({
    queryKey: ["packages-active"],
    queryFn: async () => (await supabase.from("packages").select("*").eq("is_active", true)).data ?? [],
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pkg = packages.find((p: any) => p.id === form.package_id);
    if (!pkg) return toast.error("اختر باقة");
    const start = new Date(form.start_date);
    const end = new Date(start.getTime() + pkg.duration_days * 86400000);
    const { data: { user } } = await supabase.auth.getUser();

    const { data: sub, error } = await supabase.from("subscriptions").insert({
      member_id: form.member_id,
      package_id: form.package_id,
      start_date: form.start_date,
      end_date: end.toISOString().slice(0, 10),
      status: "active",
      created_by: user?.id,
    }).select().single();
    if (error) return toast.error(error.message);

    if (form.record_payment && sub) {
      await supabase.from("payments").insert({
        subscription_id: sub.id,
        member_id: form.member_id,
        amount: pkg.price,
        method: form.method,
        status: "completed",
        created_by: user?.id,
      });
    }

    toast.success("تم تسجيل الاشتراك");
    qc.invalidateQueries({ queryKey: ["subscriptions"] });
    qc.invalidateQueries({ queryKey: ["payments"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    setOpen(false);
    setForm({ member_id: "", package_id: "", start_date: new Date().toISOString().slice(0, 10), record_payment: true, method: "cash" });
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarCheck className="w-7 h-7 text-primary" /> الاشتراكات
          </h1>
          <p className="text-muted-foreground mt-1">{subs.length} اشتراك</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary shadow-glow"><Plus className="w-4 h-4 ms-2" /> اشتراك جديد</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>إضافة اشتراك</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label>العضو *</Label>
                <Select value={form.member_id} onValueChange={(v) => setForm({ ...form, member_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر عضوًا" /></SelectTrigger>
                  <SelectContent>
                    {members.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الباقة *</Label>
                <Select value={form.package_id} onValueChange={(v) => setForm({ ...form, package_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر باقة" /></SelectTrigger>
                  <SelectContent>
                    {packages.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name} — {Number(p.price).toLocaleString("ar-EG")} ج.م</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>تاريخ البداية</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div className="space-y-2 p-3 rounded-lg border border-border/50 bg-muted/30">
                <div className="flex items-center justify-between">
                  <Label>تسجيل الدفعة الآن</Label>
                  <input type="checkbox" checked={form.record_payment} onChange={(e) => setForm({ ...form, record_payment: e.target.checked })} className="w-4 h-4 accent-primary" />
                </div>
                {form.record_payment && (
                  <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">كاش</SelectItem>
                      <SelectItem value="transfer">تحويل بنكي</SelectItem>
                      <SelectItem value="electronic">دفع إلكتروني</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <DialogFooter><Button type="submit" className="gradient-primary shadow-glow">حفظ</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4 shadow-card border-border/50 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">العضو</TableHead>
              <TableHead className="text-right">الباقة</TableHead>
              <TableHead className="text-right">من</TableHead>
              <TableHead className="text-right">إلى</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">تغيير الحالة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subs.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">لا توجد اشتراكات</TableCell></TableRow>
            ) : subs.map((s: any) => {
              const expired = s.end_date < todayStr;
              const displayStatus = s.status === "active" && expired ? "expired" : s.status;
              const isActiveLike = displayStatus === "active";
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.members?.full_name}</TableCell>
                  <TableCell>{s.packages?.name}</TableCell>
                  <TableCell>{s.start_date}</TableCell>
                  <TableCell>{s.end_date}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${isActiveLike ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                      {STATUS_LABELS[displayStatus] ?? displayStatus}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={s.status}
                      onValueChange={async (v) => {
                        const { error } = await supabase.from("subscriptions").update({ status: v }).eq("id", s.id);
                        if (error) return toast.error(error.message);
                        toast.success("تم تحديث الحالة");
                        qc.invalidateQueries({ queryKey: ["subscriptions"] });
                        qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
                      }}
                    >
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">نشط</SelectItem>
                        <SelectItem value="expired">منتهٍ</SelectItem>
                        <SelectItem value="frozen">مجمد</SelectItem>
                        <SelectItem value="cancelled">ملغى</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
