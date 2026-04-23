import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Wallet } from "lucide-react";
import { fmtBRL, fmtDate, withdrawalStatusColors, withdrawalStatusLabel } from "@/lib/partnerFormat";
import { useToast } from "@/hooks/use-toast";

export default function PartnerWithdrawals() {
  const { partner } = useOutletContext<any>();
  const [balance, setBalance] = useState<any>({ pending_cents: 0, available_cents: 0, requested_cents: 0, paid_cents: 0 });
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [bankAccount, setBankAccount] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    if (!partner?.id) return;
    const [b, w, ba, s] = await Promise.all([
      supabase.rpc("compute_partner_balance", { p_partner_id: partner.id }),
      supabase.from("partner_withdrawals").select("*").eq("partner_id", partner.id).order("requested_at", { ascending: false }),
      supabase.from("partner_bank_accounts").select("*").eq("partner_id", partner.id).maybeSingle(),
      supabase.from("partner_settings").select("minimum_withdrawal_cents, allow_multiple_pending_withdrawals").eq("id", 1).maybeSingle(),
    ]);
    setBalance(b.data || { pending_cents: 0, available_cents: 0, requested_cents: 0, paid_cents: 0 });
    setWithdrawals(w.data || []);
    setBankAccount(ba.data);
    setSettings(s.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [partner?.id]);

  const hasBank = bankAccount?.pix_key && bankAccount?.holder_name;
  const hasPending = withdrawals.some((w) => w.status === "pending" || w.status === "approved");
  const minCents = settings?.minimum_withdrawal_cents || 5000;
  const canRequest = hasBank && balance.available_cents >= minCents && (settings?.allow_multiple_pending_withdrawals || !hasPending);

  const submit = async () => {
    const cents = Math.round(Number(amount) * 100);
    if (!cents || cents <= 0) { toast({ title: "Valor inválido", variant: "destructive" }); return; }
    if (cents > balance.available_cents) { toast({ title: "Saldo insuficiente", variant: "destructive" }); return; }
    if (cents < minCents) { toast({ title: `Saque mínimo: ${fmtBRL(minCents)}`, variant: "destructive" }); return; }

    setSubmitting(true);
    const { error } = await supabase.from("partner_withdrawals").insert({
      partner_id: partner.id,
      amount_cents: cents,
      bank_snapshot: bankAccount,
      status: "pending",
    });
    setSubmitting(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }

    toast({ title: "Solicitação enviada!", description: "Aguarde aprovação do admin." });
    setOpen(false);
    setAmount("");
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Saques</h1>
          <p className="text-sm text-muted-foreground">Solicite e acompanhe seus saques</p>
        </div>
        <Button onClick={() => setOpen(true)} disabled={!canRequest} className="gap-2">
          <Wallet size={16} /> Solicitar saque
        </Button>
      </div>

      {!hasBank && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 text-sm">
            ⚠️ Cadastre seus dados bancários antes de solicitar um saque. <a href="/partners/banco" className="underline font-medium">Cadastrar agora →</a>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Disponível p/ saque", value: balance.available_cents, highlight: true },
          { label: "Em saque solicitado", value: balance.requested_cents },
          { label: "Pendente liberação", value: balance.pending_cents },
          { label: "Total já recebido", value: balance.paid_cents },
        ].map((c) => (
          <Card key={c.label} className={c.highlight ? "border-primary/30 bg-primary/5" : ""}>
            <CardContent className="p-5">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">{c.label}</div>
              <div className="text-2xl font-semibold mt-1">{fmtBRL(c.value)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Solicitado</TableHead>
                  <TableHead>Pago em</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : withdrawals.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Nenhum saque ainda.</TableCell></TableRow>
                ) : withdrawals.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="text-right font-medium">{fmtBRL(w.amount_cents)}</TableCell>
                    <TableCell><Badge variant="outline" className={withdrawalStatusColors[w.status]}>{withdrawalStatusLabel[w.status]}</Badge></TableCell>
                    <TableCell className="text-sm">{fmtDate(w.requested_at)}</TableCell>
                    <TableCell className="text-sm">{fmtDate(w.paid_at)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{w.rejection_reason || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar saque</DialogTitle>
            <DialogDescription>Saldo disponível: <strong>{fmtBRL(balance.available_cents)}</strong> · Mínimo: {fmtBRL(minCents)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" min="0" step="10" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(minCents / 100)} />
            </div>
            <div className="bg-muted/40 p-3 rounded-md text-xs space-y-1">
              <div><span className="text-muted-foreground">PIX:</span> <strong>{bankAccount?.pix_key}</strong> ({bankAccount?.pix_key_type})</div>
              <div><span className="text-muted-foreground">Titular:</span> {bankAccount?.holder_name}</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? <><Loader2 className="animate-spin mr-2" size={16} />Enviando...</> : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
