import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtBRL, fmtDate, commissionStatusColors, commissionStatusLabel } from "@/lib/partnerFormat";

export default function PartnerCommissions() {
  const { partner } = useOutletContext<any>();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!partner?.id) return;
    (async () => {
      const { data } = await supabase
        .from("partner_commissions")
        .select("*, sale:partner_sales(plan, paid_at)")
        .eq("partner_id", partner.id)
        .order("created_at", { ascending: false });
      setItems(data || []);
      setLoading(false);
    })();
  }, [partner?.id]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Minhas comissões</h1>
        <p className="text-sm text-muted-foreground">Histórico completo de comissões geradas</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plano</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Libera em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Nenhuma comissão ainda.</TableCell></TableRow>
                ) : items.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell><span className="capitalize">{c.sale?.plan || "—"}</span></TableCell>
                    <TableCell className="text-right">{fmtBRL(c.base_amount_cents)}</TableCell>
                    <TableCell className="text-right">{c.commission_percent}%</TableCell>
                    <TableCell className="text-right font-medium">{fmtBRL(c.commission_amount_cents)}</TableCell>
                    <TableCell><Badge variant="outline" className={commissionStatusColors[c.status]}>{commissionStatusLabel[c.status] || c.status}</Badge></TableCell>
                    <TableCell className="text-sm">{fmtDate(c.available_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
