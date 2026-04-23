import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";
import { fmtBRL, fmtDate } from "@/lib/partnerFormat";

interface Payout {
  id: string;
  partner_id: string;
  amount_cents: number;
  paid_at: string;
  payment_method: string;
  payment_reference: string | null;
  receipt_file_url: string | null;
  receipt_file_name: string | null;
  internal_notes: string | null;
  partner: { full_name: string; email: string };
}

export default function AdminPartnersPayouts() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("partner_payouts")
        .select("id, partner_id, amount_cents, paid_at, payment_method, payment_reference, receipt_file_url, receipt_file_name, internal_notes, partner:partners(full_name, email)")
        .order("paid_at", { ascending: false });
      setPayouts((data as any) || []);
      setLoading(false);
    })();
  }, []);

  const downloadReceipt = async (path: string, name: string | null) => {
    const { data, error } = await supabase.storage.from("partner-payouts").createSignedUrl(path, 60);
    if (error || !data) return;
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = name || "comprovante";
    a.target = "_blank";
    a.click();
  };

  const total = payouts.reduce((s, p) => s + p.amount_cents, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pagamentos Realizados</h1>
        <p className="text-sm text-muted-foreground">Histórico de comissões pagas — Total: <strong>{fmtBRL(total)}</strong></p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parceiro</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead>Pago em</TableHead>
                  <TableHead className="text-right">Comprovante</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : payouts.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Nenhum pagamento realizado ainda.</TableCell></TableRow>
                ) : payouts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">{p.partner.full_name}</div>
                      <div className="text-xs text-muted-foreground">{p.partner.email}</div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{fmtBRL(p.amount_cents)}</TableCell>
                    <TableCell><span className="capitalize text-sm">{p.payment_method}</span></TableCell>
                    <TableCell className="text-xs font-mono">{p.payment_reference || "—"}</TableCell>
                    <TableCell className="text-sm">{fmtDate(p.paid_at)}</TableCell>
                    <TableCell className="text-right">
                      {p.receipt_file_url ? (
                        <Button size="sm" variant="ghost" onClick={() => downloadReceipt(p.receipt_file_url!, p.receipt_file_name)}>
                          <Download size={14} />
                        </Button>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
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
