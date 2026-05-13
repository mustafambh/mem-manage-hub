import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, Printer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/payments")({
  component: PaymentsPage,
});

const METHOD_LABELS: Record<string, string> = {
  cash: "كاش",
  transfer: "تحويل",
  electronic: "إلكتروني",
};

function printReceipt(p: any) {
  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) return;
  w.document.write(`
    <html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>إيصال دفع</title>
    <style>
      body{font-family:Tajawal,sans-serif;padding:24px;color:#111}
      .h{text-align:center;border-bottom:2px dashed #999;padding-bottom:12px;margin-bottom:16px}
      .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee}
      .total{font-size:24px;font-weight:bold;margin-top:16px;text-align:center;padding:12px;background:#f3f3f3;border-radius:8px}
    </style></head><body>
    <div class="h"><h2>إيصال دفع</h2><p>${new Date(p.paid_at).toLocaleString("ar-EG")}</p></div>
    <div class="row"><span>العضو</span><strong>${p.members?.full_name ?? "-"}</strong></div>
    <div class="row"><span>طريقة الدفع</span><strong>${METHOD_LABELS[p.method] ?? p.method}</strong></div>
    <div class="row"><span>الحالة</span><strong>${p.status === "completed" ? "مكتمل" : p.status}</strong></div>
    <div class="row"><span>رقم الإيصال</span><strong style="font-family:monospace">${p.id.slice(0, 8)}</strong></div>
    <div class="total">${Number(p.amount).toLocaleString("ar-EG")} ج.م</div>
    <p style="text-align:center;margin-top:24px;color:#666">شكرًا لاشتراكك</p>
    <script>window.print()</script>
    </body></html>
  `);
  w.document.close();
}

function PaymentsPage() {
  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, members(full_name)")
        .order("paid_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const total = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CreditCard className="w-7 h-7 text-primary" /> المدفوعات
        </h1>
        <p className="text-muted-foreground mt-1">{payments.length} عملية — إجمالي {total.toLocaleString("ar-EG")} ج.م</p>
      </div>

      <Card className="p-4 shadow-card border-border/50 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">التاريخ</TableHead>
              <TableHead className="text-right">العضو</TableHead>
              <TableHead className="text-right">المبلغ</TableHead>
              <TableHead className="text-right">الطريقة</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">لا توجد مدفوعات</TableCell></TableRow>
            ) : payments.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="text-xs">{new Date(p.paid_at).toLocaleDateString("ar-EG")}</TableCell>
                <TableCell className="font-medium">{p.members?.full_name ?? "—"}</TableCell>
                <TableCell className="font-bold text-primary">{Number(p.amount).toLocaleString("ar-EG")} ج.م</TableCell>
                <TableCell>{METHOD_LABELS[p.method] ?? p.method}</TableCell>
                <TableCell>
                  <span className="px-2 py-1 rounded-full text-xs bg-success/10 text-success">{p.status === "completed" ? "مكتمل" : p.status}</span>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => printReceipt(p)}>
                    <Printer className="w-4 h-4 ms-1" /> طباعة
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
