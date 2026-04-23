import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { fmtBRL, fmtDateTime } from "@/lib/partnerFormat";

interface Props {
  withdrawal: any | null;
  onClose: () => void;
  onUpdated: () => void;
}

export const ReviewWithdrawalDialog = ({ withdrawal, onClose, onUpdated }: Props) => {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [paymentReference, setPaymentReference] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const { toast } = useToast();

  if (!withdrawal) return null;

  const bank = withdrawal.bank_snapshot || {};

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

      // Get caller for recorded_by_admin_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada");

      // Insert payout
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

      // Update withdrawal status
      const { error: updErr } = await supabase.from("partner_withdrawals").update({
        status: "paid", paid_at: new Date().toISOString(), internal_notes: internalNotes || null,
      }).eq("id", withdrawal.id);
      if (updErr) throw updErr;

      // Mark related commissions as paid
      // Available commissions up to the amount go to "paid"
      const { data: avail } = await supabase
        .from("partner_commissions")
        .select("id, commission_amount_cents")
        .eq("partner_id", withdrawal.partner_id)
        .eq("status", "available")
        .order("created_at");

      let remaining = withdrawal.amount_cents;
      const idsToPay: string[] = [];
      for (const c of avail || []) {
        if (remaining <= 0) break;
        idsToPay.push(c.id);
        remaining -= c.commission_amount_cents;
      }
      if (idsToPay.length) {
        await supabase.from("partner_commissions").update({
          status: "paid", paid_at: new Date().toISOString(),
        }).in("id", idsToPay);
      }

      // Send partner notification email (best-effort)
      supabase.functions.invoke("send-partner-email", {
        body: { template: "withdrawal-paid", partner_id: withdrawal.partner_id, data: { amount_cents: withdrawal.amount_cents, paid_at: new Date().toISOString() } },
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
    toast({ title: "Saque rejeitado" });
    onUpdated();
    onClose();
  };

  return (
    <Dialog open={!!withdrawal} onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Saque #{withdrawal.id.substring(0, 8)}</DialogTitle>
          <DialogDescription>{withdrawal.partner.full_name} — Solicitado em {fmtDateTime(withdrawal.requested_at)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="bg-muted/40 rounded-lg p-4 grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Valor:</span> <strong>{fmtBRL(withdrawal.amount_cents)}</strong></div>
            <div><span className="text-muted-foreground">Status:</span> <span className="capitalize">{withdrawal.status}</span></div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Dados bancários (snapshot)</h4>
            <div className="bg-muted/40 rounded-lg p-4 grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Titular:</span> {bank.holder_name || "—"}</div>
              <div><span className="text-muted-foreground">CPF/CNPJ:</span> {bank.holder_tax_id || "—"}</div>
              <div><span className="text-muted-foreground">Banco:</span> {bank.bank_name || "—"}</div>
              <div><span className="text-muted-foreground">Agência:</span> {bank.bank_branch || "—"}</div>
              <div><span className="text-muted-foreground">Conta:</span> {bank.bank_account || "—"}</div>
              <div><span className="text-muted-foreground">Tipo:</span> {bank.account_type || "—"}</div>
              <div className="col-span-2"><span className="text-muted-foreground">PIX ({bank.pix_key_type || "—"}):</span> <strong>{bank.pix_key || "—"}</strong></div>
            </div>
          </div>

          {withdrawal.status === "rejected" && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm">
              <strong>Motivo:</strong> {withdrawal.rejection_reason}
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
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          {withdrawal.status === "pending" && (
            <>
              <Button variant="outline" onClick={reject} disabled={loading} className="gap-2"><X size={14} /> Rejeitar</Button>
              <Button variant="outline" onClick={approve} disabled={loading} className="gap-2"><Check size={14} /> Aprovar</Button>
            </>
          )}
          {(withdrawal.status === "pending" || withdrawal.status === "approved") && (
            <Button onClick={markAsPaid} disabled={loading}>
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
