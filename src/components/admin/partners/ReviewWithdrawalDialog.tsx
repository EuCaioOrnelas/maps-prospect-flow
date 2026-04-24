import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Loader2, Upload, Check, X, AlertTriangle, ShieldCheck, CalendarClock,
  Wallet, Receipt, Landmark, Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { fmtBRL, fmtDate, fmtDateTime } from "@/lib/partnerFormat";

interface Props {
  withdrawal: any | null;
  onClose: () => void;
  onUpdated: () => void;
}

interface CommissionRow {
  id: string;
  commission_amount_cents: number;
  base_amount_cents: number;
  commission_percent: number;
  status: string;
  available_at: string;
  paid_at: string | null;
  created_at: string;
  sale: {
    id: string;
    plan: string;
    amount_cents: number;
    paid_at: string;
    refunded_at: string | null;
    chargeback_at: string | null;
    payment_provider: string;
    is_recurring: boolean;
    customer_user_id: string;
  } | null;
}

interface Issue {
  level: "error" | "warning";
  text: string;
}

export const ReviewWithdrawalDialog = ({ withdrawal, onClose, onUpdated }: Props) => {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [paymentReference, setPaymentReference] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [balance, setBalance] = useState<any>(null);
  const [bankAccount, setBankAccount] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!withdrawal?.id) return;
    (async () => {
      setLoadingData(true);
      const [commRes, balRes, baRes] = await Promise.all([
        supabase
          .from("partner_commissions")
          .select("id, commission_amount_cents, base_amount_cents, commission_percent, status, available_at, paid_at, created_at, sale:partner_sales(id, plan, amount_cents, paid_at, refunded_at, chargeback_at, payment_provider, is_recurring, customer_user_id)")
          .eq("partner_id", withdrawal.partner_id)
          .order("created_at", { ascending: true }),
        supabase.rpc("compute_partner_balance", { p_partner_id: withdrawal.partner_id }),
        supabase.from("partner_bank_accounts").select("*").eq("partner_id", withdrawal.partner_id).maybeSingle(),
      ]);
      setCommissions((commRes.data as any) || []);
      setBalance(balRes.data || null);
      setBankAccount(baRes.data || null);
      setLoadingData(false);
    })();
  }, [withdrawal?.id, withdrawal?.partner_id]);

  // Compute the FIFO selection of available commissions that compose this withdrawal,
  // following the same rule used when marking as paid.
  const composingIds = useMemo(() => {
    if (!withdrawal) return new Set<string>();
    let remaining = withdrawal.amount_cents;
    const selected: string[] = [];
    // If already paid, prefer commissions actually marked paid around the withdrawal date.
    if (withdrawal.status === "paid") {
      const paidAround = commissions.filter((c) => c.status === "paid");
      // Greedy match by created_at, taking those whose paid_at <= withdrawal.paid_at + 1d
      const cutoff = withdrawal.paid_at ? new Date(withdrawal.paid_at).getTime() + 86400000 : Infinity;
      for (const c of paidAround) {
        if (remaining <= 0) break;
        if (!c.paid_at) continue;
        if (new Date(c.paid_at).getTime() > cutoff) continue;
        selected.push(c.id);
        remaining -= c.commission_amount_cents;
      }
    } else {
      const pool = commissions.filter((c) => c.status === "available");
      for (const c of pool) {
        if (remaining <= 0) break;
        selected.push(c.id);
        remaining -= c.commission_amount_cents;
      }
    }
    return new Set(selected);
  }, [commissions, withdrawal]);

  const composing = useMemo(
    () => commissions.filter((c) => composingIds.has(c.id)),
    [commissions, composingIds]
  );

  const composedTotal = composing.reduce((s, c) => s + c.commission_amount_cents, 0);

  // Inconsistency checks
  const issues: Issue[] = useMemo(() => {
    const list: Issue[] = [];
    if (!withdrawal) return list;

    if (withdrawal.status !== "paid") {
      if (composedTotal < withdrawal.amount_cents) {
        list.push({
          level: "error",
          text: `Saldo disponível insuficiente: comissões disponíveis somam ${fmtBRL(composedTotal)}, saque pede ${fmtBRL(withdrawal.amount_cents)}.`,
        });
      }
      if (balance && withdrawal.amount_cents > (balance.available_cents + withdrawal.amount_cents)) {
        // (the requested amount itself reduces available; just sanity)
      }
    }

    // Check sales status of composing commissions
    for (const c of composing) {
      if (c.sale?.refunded_at) {
        list.push({
          level: "error",
          text: `Venda reembolsada (${fmtDate(c.sale.refunded_at)}) ainda gera comissão neste saque — revisar.`,
        });
      }
      if (c.sale?.chargeback_at) {
        list.push({
          level: "error",
          text: `Venda com chargeback (${fmtDate(c.sale.chargeback_at)}) compõe este saque — revisar.`,
        });
      }
      if (new Date(c.available_at).getTime() > Date.now()) {
        list.push({
          level: "warning",
          text: `Comissão ainda em retenção (libera em ${fmtDate(c.available_at)}).`,
        });
      }
    }

    // Bank data sanity
    if (!bankAccount?.pix_key && !bankAccount?.bank_account) {
      list.push({ level: "error", text: "Parceiro não tem dados bancários cadastrados." });
    }
    const snapshot = withdrawal.bank_snapshot || {};
    if (bankAccount && snapshot.pix_key && bankAccount.pix_key && snapshot.pix_key !== bankAccount.pix_key) {
      list.push({
        level: "warning",
        text: "Chave PIX no momento do pedido difere da chave atual cadastrada pelo parceiro.",
      });
    }

    // Are there partial sales not fully covered? Just informational
    if (withdrawal.status !== "paid" && composedTotal > withdrawal.amount_cents) {
      const overflow = composedTotal - withdrawal.amount_cents;
      list.push({
        level: "warning",
        text: `Última comissão excede ${fmtBRL(overflow)} acima do valor do saque (será marcada por inteiro como paga).`,
      });
    }

    return list;
  }, [withdrawal, composing, composedTotal, balance, bankAccount]);

  if (!withdrawal) return null;
  const bank = withdrawal.bank_snapshot || {};
  const hasBlockingError = issues.some((i) => i.level === "error");

  const markAsPaid = async () => {
    setLoading(true);
    try {
      let receiptUrl: string | null = null;
      let receiptName: string | null = null;

      if (receiptFile) {
        const path = `${withdrawal.partner_id}/${withdrawal.id}-${Date.now()}-${receiptFile.name}`;
        const { error: upErr } = await supabase.storage.from("partner-payouts").upload(path, receiptFile);
        if (upErr) throw upErr;
        receiptUrl = path;
        receiptName = receiptFile.name;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada");

      const { error: payoutErr } = await supabase.from("partner_payouts").insert({
        partner_id: withdrawal.partner_id,
        withdrawal_id: withdrawal.id,
        amount_cents: withdrawal.amount_cents,
        payment_method: paymentMethod,
        payment_reference: paymentReference || null,
        receipt_file_url: receiptUrl,
        receipt_file_name: receiptName,
        internal_notes: internalNotes || null,
        recorded_by_admin_id: user.id,
        paid_at: new Date().toISOString(),
      });
      if (payoutErr) throw payoutErr;

      const { error: updErr } = await supabase.from("partner_withdrawals").update({
        status: "paid",
        paid_at: new Date().toISOString(),
        internal_notes: internalNotes || null,
      }).eq("id", withdrawal.id);
      if (updErr) throw updErr;

      // Mark composing commissions as paid
      const ids = Array.from(composingIds);
      if (ids.length) {
        await supabase.from("partner_commissions").update({
          status: "paid",
          paid_at: new Date().toISOString(),
        }).in("id", ids);
      }

      supabase.functions.invoke("send-partner-email", {
        body: {
          type: "partner_withdrawal_paid",
          to: withdrawal.partner.email,
          data: {
            first_name: (withdrawal.partner.full_name || "").split(" ")[0] || "Parceiro",
            amount_cents: withdrawal.amount_cents,
            receipt_url: receiptUrl,
          },
        },
      }).catch(() => {});

      toast({ title: "Pagamento registrado", description: `${fmtBRL(withdrawal.amount_cents)} marcado como pago.` });
      onUpdated();
      onClose();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const approve = async () => {
    setLoading(true);
    const { error } = await supabase.from("partner_withdrawals").update({
      status: "approved", approved_at: new Date().toISOString(),
    }).eq("id", withdrawal.id);
    setLoading(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }

    supabase.functions.invoke("send-partner-email", {
      body: {
        type: "partner_withdrawal_approved",
        to: withdrawal.partner.email,
        data: {
          first_name: (withdrawal.partner.full_name || "").split(" ")[0] || "Parceiro",
          amount_cents: withdrawal.amount_cents,
        },
      },
    }).catch(() => {});

    toast({ title: "Saque aprovado" });
    onUpdated();
    onClose();
  };

  const reject = async () => {
    const reason = window.prompt("Motivo da rejeição:");
    if (!reason) return;
    setLoading(true);
    const { error } = await supabase.from("partner_withdrawals").update({
      status: "rejected", rejected_at: new Date().toISOString(), rejection_reason: reason,
    }).eq("id", withdrawal.id);
    setLoading(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }

    supabase.functions.invoke("send-partner-email", {
      body: {
        type: "partner_withdrawal_rejected",
        to: withdrawal.partner.email,
        data: {
          first_name: (withdrawal.partner.full_name || "").split(" ")[0] || "Parceiro",
          amount_cents: withdrawal.amount_cents,
          reason,
        },
      },
    }).catch(() => {});

    toast({ title: "Saque rejeitado" });
    onUpdated();
    onClose();
  };

  return (
    <Dialog open={!!withdrawal} onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet size={18} className="text-primary" /> Saque #{withdrawal.id.substring(0, 8)}
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{withdrawal.partner.full_name}</span> ({withdrawal.partner.email}) — Solicitado em {fmtDateTime(withdrawal.requested_at)}
          </DialogDescription>
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-2">
          <SummaryCard label="Valor pedido" value={fmtBRL(withdrawal.amount_cents)} highlight />
          <SummaryCard label="Comissões cobertas" value={fmtBRL(composedTotal)} />
          <SummaryCard label="Saldo disponível" value={balance ? fmtBRL(balance.available_cents) : "—"} />
          <SummaryCard label="Status" value={<Badge variant="outline" className="capitalize">{withdrawal.status}</Badge>} />
        </div>

        {/* Validation banner */}
        {issues.length > 0 ? (
          <div className={`rounded-lg border p-3 space-y-1.5 ${hasBlockingError ? "border-destructive/40 bg-destructive/10" : "border-amber-500/40 bg-amber-500/10"}`}>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle size={14} className={hasBlockingError ? "text-destructive" : "text-amber-600"} />
              {hasBlockingError ? "Inconsistências detectadas — revise antes de aprovar" : "Avisos para conferência"}
            </div>
            <ul className="text-xs space-y-1">
              {issues.map((i, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className={i.level === "error" ? "text-destructive" : "text-amber-600"}>•</span>
                  <span>{i.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center gap-2 text-sm">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Tudo certo — nenhuma inconsistência detectada.</span>
          </div>
        )}

        <Tabs defaultValue="sales" className="mt-2">
          <TabsList>
            <TabsTrigger value="sales" className="gap-2"><Receipt size={14} /> Vendas que compõem ({composing.length})</TabsTrigger>
            <TabsTrigger value="payment" className="gap-2"><Landmark size={14} /> Dados de pagamento</TabsTrigger>
            <TabsTrigger value="all" className="gap-2"><Info size={14} /> Todas as comissões ({commissions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="mt-3">
            {loadingData ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Carregando comissões…</div>
            ) : composing.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Nenhuma comissão disponível compõe este saque.</div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Plano</TableHead>
                      <TableHead className="text-right">Venda</TableHead>
                      <TableHead className="text-right">%</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                      <TableHead>Pago em</TableHead>
                      <TableHead>Liberou em</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {composing.map((c) => {
                      const refunded = !!c.sale?.refunded_at || !!c.sale?.chargeback_at;
                      return (
                        <TableRow key={c.id} className={refunded ? "bg-destructive/5" : ""}>
                          <TableCell className="capitalize text-sm">{c.sale?.plan || "—"}</TableCell>
                          <TableCell className="text-right text-sm">{fmtBRL(c.base_amount_cents)}</TableCell>
                          <TableCell className="text-right text-sm">{c.commission_percent}%</TableCell>
                          <TableCell className="text-right font-semibold">{fmtBRL(c.commission_amount_cents)}</TableCell>
                          <TableCell className="text-xs">{c.sale?.paid_at ? fmtDate(c.sale.paid_at) : "—"}</TableCell>
                          <TableCell className="text-xs flex items-center gap-1">
                            <CalendarClock size={12} className="text-muted-foreground" />
                            {fmtDate(c.available_at)}
                          </TableCell>
                          <TableCell>
                            {refunded ? (
                              <Badge variant="destructive" className="text-[10px]">Reembolso</Badge>
                            ) : (
                              <Badge variant="outline" className="capitalize text-[10px]">{c.status}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-muted/30 font-semibold">
                      <TableCell colSpan={3} className="text-right">Total coberto</TableCell>
                      <TableCell className="text-right">{fmtBRL(composedTotal)}</TableCell>
                      <TableCell colSpan={3} />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="payment" className="mt-3 space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Landmark size={14} className="text-primary" /> Dados bancários (snapshot do pedido)
              </h4>
              <div className="bg-muted/40 rounded-lg p-4 grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Titular:</span> {bank.holder_name || "—"}</div>
                <div><span className="text-muted-foreground">CPF/CNPJ:</span> {bank.holder_tax_id || "—"}</div>
                <div><span className="text-muted-foreground">Banco:</span> {bank.bank_code || "—"} {bank.bank_name || ""}</div>
                <div><span className="text-muted-foreground">Tipo:</span> {bank.account_type === "savings" ? "Poupança" : bank.account_type === "checking" ? "Corrente" : "—"}</div>
                <div><span className="text-muted-foreground">Agência:</span> {bank.bank_branch || "—"}</div>
                <div><span className="text-muted-foreground">Conta:</span> {bank.bank_account || "—"}</div>
                <div className="col-span-2 pt-1 border-t mt-1"><span className="text-muted-foreground">PIX ({bank.pix_key_type || "—"}):</span> <strong className="font-mono">{bank.pix_key || "—"}</strong></div>
              </div>
            </div>

            {withdrawal.status === "rejected" && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm">
                <strong>Motivo da rejeição:</strong> {withdrawal.rejection_reason}
              </div>
            )}

            {(withdrawal.status === "pending" || withdrawal.status === "approved") && (
              <div className="space-y-3 border-t pt-4">
                <h4 className="text-sm font-semibold">Marcar como pago</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Método de pagamento</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="ted">TED</SelectItem>
                        <SelectItem value="transfer">Transferência</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Referência (E2E ID, etc)</Label>
                    <Input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Upload size={14} /> Comprovante (PDF/imagem)</Label>
                  <Input type="file" accept="image/*,application/pdf" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
                </div>
                <div className="space-y-2">
                  <Label>Observações internas</Label>
                  <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={2} />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-3">
            {loadingData ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Carregando…</div>
            ) : commissions.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Nenhuma comissão para este parceiro.</div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Plano</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Liberou em</TableHead>
                      <TableHead>Pago em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="capitalize text-sm">{c.sale?.plan || "—"}</TableCell>
                        <TableCell className="text-right text-sm">{fmtBRL(c.commission_amount_cents)}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize text-[10px]">{c.status}</Badge></TableCell>
                        <TableCell className="text-xs">{fmtDate(c.available_at)}</TableCell>
                        <TableCell className="text-xs">{c.paid_at ? fmtDate(c.paid_at) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 flex-wrap">
          {withdrawal.status === "pending" && (
            <>
              <Button variant="outline" onClick={reject} disabled={loading} className="gap-2"><X size={14} /> Rejeitar</Button>
              <Button variant="outline" onClick={approve} disabled={loading || hasBlockingError} className="gap-2"><Check size={14} /> Aprovar</Button>
            </>
          )}
          {(withdrawal.status === "pending" || withdrawal.status === "approved") && (
            <Button onClick={markAsPaid} disabled={loading || hasBlockingError}>
              {loading ? <><Loader2 size={16} className="animate-spin mr-2" />Processando...</> : "Marcar como pago"}
            </Button>
          )}
          {!["pending", "approved"].includes(withdrawal.status) && (
            <Button variant="outline" onClick={onClose}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const SummaryCard = ({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) => (
  <div className={`rounded-lg border p-3 ${highlight ? "border-primary/40 bg-primary/5" : "bg-muted/30"}`}>
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className={`mt-1 ${highlight ? "text-lg font-bold text-primary" : "text-sm font-semibold"}`}>{value}</div>
  </div>
);
