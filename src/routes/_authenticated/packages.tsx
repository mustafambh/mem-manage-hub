import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { Package, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/packages")({
  component: PackagesPage,
});

function PackagesPage() {
  const { isAdmin, loading, clubId } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", price: "", duration_days: "30", description: "", is_active: true });

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/" });
  }, [loading, isAdmin, navigate]);

  const { data: packages = [] } = useQuery({
    queryKey: ["packages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("packages").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId) return toast.error("لم يتم تحديد النادي");
    const { error } = await supabase.from("packages").insert({
      name: form.name,
      price: Number(form.price),
      duration_days: Number(form.duration_days),
      description: form.description || null,
      is_active: form.is_active,
      club_id: clubId,
    });
    if (error) return toast.error(error.message);
    toast.success("تمت إضافة الباقة");
    qc.invalidateQueries({ queryKey: ["packages"] });
    setOpen(false);
    setForm({ name: "", price: "", duration_days: "30", description: "", is_active: true });
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    const { error } = await supabase.from("packages").update({ is_active: !is_active }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["packages"] });
  };

  const remove = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الباقة؟")) return;
    const { error } = await supabase.from("packages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف");
    qc.invalidateQueries({ queryKey: ["packages"] });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="w-7 h-7 text-primary" /> الباقات
          </h1>
          <p className="text-muted-foreground mt-1">{packages.length} باقة</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary shadow-glow"><Plus className="w-4 h-4 ms-2" /> باقة جديدة</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>إضافة باقة</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2"><Label>اسم الباقة *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>السعر *</Label><Input type="number" required min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                <div className="space-y-2"><Label>المدة (أيام) *</Label><Input type="number" required min="1" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>الوصف</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="flex items-center justify-between"><Label>نشطة</Label><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /></div>
              <DialogFooter><Button type="submit" className="gradient-primary shadow-glow">حفظ</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {packages.map((p: any) => (
          <Card key={p.id} className="p-5 shadow-card border-border/50 hover:border-primary/40 transition relative">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-lg">{p.name}</h3>
                <p className="text-xs text-muted-foreground">{p.duration_days} يوم</p>
              </div>
              <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p.id, p.is_active)} />
            </div>
            <p className="text-3xl font-bold text-gradient mb-2">{Number(p.price).toLocaleString("ar-EG")} <span className="text-sm font-normal text-muted-foreground">ج.م</span></p>
            {p.description && <p className="text-sm text-muted-foreground mb-3">{p.description}</p>}
            <Button variant="ghost" size="sm" onClick={() => remove(p.id)} className="text-destructive hover:bg-destructive/10">
              <Trash2 className="w-4 h-4 ms-2" /> حذف
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
