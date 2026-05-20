import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const STATUSES = [
  { value: "active", label: "نشط" },
  { value: "inactive", label: "غير نشط" },
  { value: "frozen", label: "مجمد" },
];

export function MemberStatusDialog({ member }: { member: { id: string; full_name: string; status: string } }) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [status, setStatus] = useState(member.status);
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const save = async () => {
    setLoading(true);
    const { error } = await supabase.from("members").update({ status }).eq("id", member.id);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("تم تحديث الحالة");
    qc.invalidateQueries({ queryKey: ["members"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    setConfirmOpen(false);
    setOpen(false);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => { setStatus(member.status); setOpen(true); }}>
        تغيير الحالة
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تغيير حالة العضو</AlertDialogTitle>
            <AlertDialogDescription>{member.full_name}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>الحالة الجديدة</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <Button
              disabled={status === member.status}
              onClick={() => setConfirmOpen(true)}
              className="gradient-primary shadow-glow"
            >
              متابعة
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد التغيير</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من تغيير حالة "{member.full_name}" إلى "{STATUSES.find(s => s.value === status)?.label}"؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={save} disabled={loading}>
              {loading ? "..." : "تأكيد"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
