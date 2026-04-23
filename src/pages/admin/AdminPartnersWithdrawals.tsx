import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { fmtBRL, fmtDate, withdrawalStatusColors, withdrawalStatusLabel } from "@/lib/partnerFormat";
import { CheckCircle2, XCircle, Eye } from "lucide-react";
import { ReviewWithdrawalDialog } from "@/components/admin/partners/ReviewWithdrawalDialog";

interface Withdrawal {
  id: string;
  partner_id: string;
  amount_cents: number;
  status: string;
  requested_at: string;
  approved_at: string | null;
  paid_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  bank_snapshot: any;
  internal_notes: string | null;
  partner: { full_name: string; email: string; level: string };
}

export default function AdminPartnersWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Withdrawal | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("partner_withdrawals")
      .select("id, partner_id, amount_cents, status, requested_at, approved_at, paid_at, rejected_at, rejection_reason, bank_snapshot, internal_notes, partner:partners(full_name, email, level)")
      .order("requested_at", { ascending: false });
    setWithdrawals((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const quickApprove = async (id: string) => {
    const { error } = await supabase
      .from("partner_withdrawals")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Saque aprovado" });
    load();
  };

  const quickReject = async (id: string) => {
    const reason = window.prompt("Motivo da rejeição:");
    if (!reason) return;
    const { error } = await supabase
      .from("partner_withdrawals")
      .update({ status: "rejected", rejected_at: new Date().toISOString(), rejection_reason: reason })
      .eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Saque rejeitado" });
    load();
  };

  const renderTable = (items: Withdrawal[]) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Parceiro</TableHead>
            <TableHead>Nível</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead>Solicitado em</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Nenhum saque.</TableCell></TableRow>
          ) : items.map((w) => (
            <TableRow key={w.id}>
              <TableCell>
                <div className="font-medium">{w.partner.full_name}</div>
                <div className="text-xs text-muted-foreground">{w.partner.email}</div>
              </TableCell>
              <TableCell><Badge variant="outline" className="capitalize">{w.partner.level}</Badge></TableCell>
              <TableCell className="text-right font-medium">{fmtBRL(w.amount_cents)}</TableCell>
              <TableCell className="text-sm">{fmtDate(w.requested_at)}</TableCell>
              <TableCell><Badge variant="outline" className={withdrawalStatusColors[w.status]}>{withdrawalStatusLabel[w.status]}</Badge></TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setSelected(w)} title="Detalhes / pagar"><Eye size={14} /></Button>
                  {w.status === "pending" && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => quickApprove(w.id)} title="Aprovar"><CheckCircle2 size={14} className="text-emerald-600" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => quickReject(w.id)} title="Rejeitar"><XCircle size={14} className="text-destructive" /></Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const pending = withdrawals.filter((w) => w.status === "pending");
  const approved = withdrawals.filter((w) => w.status === "approved");
  const paid = withdrawals.filter((w) => w.status === "paid");
  const rejected = withdrawals.filter((w) => w.status === "rejected");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Solicitações de Saque</h1>
        <p className="text-sm text-muted-foreground">Gerencie pedidos de saque dos parceiros</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pendentes ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved">Aprovados ({approved.length})</TabsTrigger>
          <TabsTrigger value="paid">Pagos ({paid.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejeitados ({rejected.length})</TabsTrigger>
        </TabsList>
        {(["pending", "approved", "paid", "rejected"] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <Card><CardContent className="p-4">
              {loading ? <p className="text-center py-10 text-muted-foreground">Carregando...</p> : renderTable({ pending, approved, paid, rejected }[tab])}
            </CardContent></Card>
          </TabsContent>
        ))}
      </Tabs>

      <ReviewWithdrawalDialog withdrawal={selected} onClose={() => setSelected(null)} onUpdated={load} />
    </div>
  );
}
