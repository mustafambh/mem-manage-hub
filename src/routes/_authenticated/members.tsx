import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { Search, Users } from "lucide-react";
import { MemberFormDialog } from "@/components/MemberFormDialog";
import { MemberStatusDialog } from "@/components/MemberStatusDialog";

export const Route = createFileRoute("/_authenticated/members")({
  component: MembersPage,
});

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  active: { label: "نشط", cls: "bg-success/10 text-success" },
  inactive: { label: "غير نشط", cls: "bg-muted text-muted-foreground" },
  frozen: { label: "مجمد", cls: "bg-warning/10 text-warning" },
};

function MembersPage() {
  const [q, setQ] = useState("");
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = members.filter(
    (m: any) =>
      !q ||
      m.full_name.toLowerCase().includes(q.toLowerCase()) ||
      m.phone?.includes(q) ||
      m.email?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="w-7 h-7 text-primary" /> الأعضاء
          </h1>
          <p className="text-muted-foreground mt-1">{members.length} عضو مسجّل</p>
        </div>
        <MemberFormDialog />
      </div>

      <Card className="p-4 shadow-card border-border/50">
        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ابحث بالاسم أو الهاتف أو البريد..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="ps-10"
          />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">الهاتف</TableHead>
                <TableHead className="text-right">البريد</TableHead>
                <TableHead className="text-right">تاريخ الميلاد</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">جارٍ التحميل...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">لا يوجد أعضاء</TableCell></TableRow>
              ) : (
                filtered.map((m: any) => {
                  const s = STATUS_LABELS[m.status] ?? STATUS_LABELS.active;
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.full_name}</TableCell>
                      <TableCell dir="ltr" className="text-right">{m.phone}</TableCell>
                      <TableCell dir="ltr" className="text-right">{m.email ?? "—"}</TableCell>
                      <TableCell>{m.birth_date ?? "—"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
