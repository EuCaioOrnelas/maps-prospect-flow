import { useEffect, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Wallet, Clock, CheckCircle2, ShieldAlert, ChevronRight } from "lucide-react";
import { fmtBRL, fmtDate, withdrawalStatusColors, withdrawalStatusLabel } from "@/lib/partnerFormat";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/partners/PageHeader";
import { StatCard } from "@/components/partners/StatCard";

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

  const isBankComplete = !!(
    bankAccount?.holder_name && bankAccount?.holder_tax_id &&
    bankAccount?.pix_key && bankAccount?.pix_key_type &&
    bankAccount?.bank_name && bankAccount?.bank_code &&
    bankAccount?.bank_branch && bankAccount?.bank_account && bankAccount?.account_type
  );
  const hasPending = withdrawals.some((w) => w.status === "pending" || w.status === "approved");
  const minCents = settings?.minimum_withdrawal_cents || 5000;
  const canRequest = isBankComplete && balance.available_cents >= minCents && (settings?.allow_multiple_pending_withdrawals || !hasPending);

  const submit = async () => {
    const cents = Math.round(Number(amount) * 100);
    if (!cents || cents <= 0) { toast({ title: "Valor inválido", variant: "destructive" }); return; }
    if (cents < minCents) { toast({ title: `Saque mínimo: ${fmtBRL(minCents)}`, variant: "destructive" }); return; }

    setSubmitting(true);
    // Server-side secure RPC: locks partner row, recomputes balance, snapshots bank
    const { data, error } = await supabase.rpc("request_partner_withdrawal", { p_amount_cents: cents });
    setSubmitting(false);

    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    const result = data as any;
    if (result?.error) { toast({ title: "Não foi possível", description: result.error, variant: "destructive" }); return; }

    // Best-effort notifications: confirmation to partner + alert to admin
    const firstName = (partner?.full_name || "").split(" ")[0] || "Parceiro";
    supabase.functions.invoke("send-partner-email", {
      body: {
        type: "partner_withdrawal_requested",
        to: partner?.email,
        data: { first_name: firstName, amount_cents: cents, user_id: partner?.user_id },
      },
    }).catch(() => {});
    supabase.functions.invoke("send-partner-email", {
      body: {
        type: "admin_partner_alert",
        to: "parceiros@wiize.com.br",
        data: {
          subject: `💰 Novo saque solicitado — ${partner?.full_name || "Parceiro"}`,
          title: "Novo pedido de saque",
          lines: [
            `Parceiro: <strong>${partner?.full_name}</strong> (${partner?.email})`,
            `Valor: <strong>R$ ${(cents / 100).toFixed(2).replace(".", ",")}</strong>`,
            "Acesse o admin para revisar os dados bancários e aprovar.",
          ],
          cta_url: `${window.location.origin}/admin/partners/saques`,
          cta_label: "Revisar saque",
        },
      },
    }).catch(() => {});

    toast({ title: "Solicitação enviada!", description: "Aguarde aprovação do admin." });
    setOpen(false);
    setAmount("");
    load();
  };

  const cards = [
    { label: "Disponível p/ saque", value: fmtBRL(balance.available_cents), icon: Wallet, accent: "emerald" as const, highlight: true, hint: "Pronto para resgate" },
    { label: "Em saque solicitado", value: fmtBRL(balance.requested_cents), icon: Clock, accent: "blue" as const, hint: "Em análise" },
    { label: "Pendente liberação", value: fmtBRL(balance.pending_cents), icon: Clock, accent: "amber" as const, hint: "Após período de retenção" },
    { label: "Total recebido", value: fmtBRL(balance.paid_cents), icon: CheckCircle2, accent: "primary" as const, hint: "Histórico" },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Saques"
        subtitle="Solicite resgates do seu saldo de comissões"
        icon={Wallet}
        actions={
          <Button onClick={() => setOpen(true)} disabled={!canRequest} className="gap-2">
            <Wallet size={16} /> Solicitar saque
          </Button>
        }
      />

      {!isBankComplete && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 ring-1 ring-amber-500/30 shrink-0">
              <ShieldAlert size={16} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">Complete seus dados bancários</div>
              <p className="text-xs text-muted-foreground mt-0.5">Para liberar saques precisamos de: titular, CPF/CNPJ, banco completo (nome, número, agência, conta, tipo) e chave PIX.</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/partners/dados-bancarios" className="gap-1">Cadastrar <ChevronRight size={14} /></Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-3"><CardTitle className="text-base">Histórico de saques</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Solicitado</TableHead>
                  <TableHead>Aprovado</TableHead>
                  <TableHead>Pago em</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : withdrawals.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Nenhum saque ainda.</TableCell></TableRow>
                ) : withdrawals.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="text-right font-semibold">{fmtBRL(w.amount_cents)}</TableCell>
                    <TableCell><Badge variant="outline" className={withdrawalStatusColors[w.status]}>{withdrawalStatusLabel[w.status]}</Badge></TableCell>
                    <TableCell className="text-sm">{fmtDate(w.requested_at)}</TableCell>
                    <TableCell className="text-sm">{fmtDate(w.approved_at)}</TableCell>
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
            <DialogDescription>
              Saldo disponível: <strong className="text-foreground">{fmtBRL(balance.available_cents)}</strong> · Mínimo: {fmtBRL(minCents)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                min="0"
                step="10"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={String(minCents / 100)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
              <button
                type="button"
                onClick={() => setAmount(String(balance.available_cents / 100))}
                className="text-xs text-primary hover:underline"
              >
                Usar saldo total disponível
              </button>
            </div>
            <div className="bg-muted/40 p-3 rounded-md text-xs space-y-1.5">
              <div className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Destino do saque</div>
              <div><span className="text-muted-foreground">PIX:</span> <strong>{bankAccount?.pix_key}</strong> ({bankAccount?.pix_key_type})</div>
              <div><span className="text-muted-foreground">Titular:</span> {bankAccount?.holder_name} · {bankAccount?.holder_tax_id}</div>
              <div><span className="text-muted-foreground">Banco:</span> {bankAccount?.bank_code} - {bankAccount?.bank_name} · Ag {bankAccount?.bank_branch} · Cc {bankAccount?.bank_account}</div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              ✅ Validação executada no servidor. O saldo é recalculado e travado no momento da solicitação para impedir falsificação.
            </p>
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
