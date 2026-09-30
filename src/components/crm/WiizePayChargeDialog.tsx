import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { previewWiizePayCharge, useWiizePayChargeMutations, type WiizePaySnapshot } from "@/hooks/useWiizePayCharges";

const METHODS = [
  { key: "pix", label: "PIX" },
  { key: "boleto", label: "Boleto" },
  { key: "credit_card", label: "Cartão (no Wiize Pay)" },
];

const fmt = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  leadId: string;
  dealId: string;
}

export function WiizePayChargeDialog({ open, onOpenChange, leadId, dealId }: Props) {
  const [snap, setSnap] = useState<WiizePaySnapshot | null>(null);
  const [apiReady, setApiReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [methods, setMethods] = useState<string[]>(["pix"]);
  const [due, setDue] = useState(() => new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));
  const idemKey = useRef<string>("");
  const { create, refresh } = useWiizePayChargeMutations(leadId);

  useEffect(() => {
    if (!open) return;
    idemKey.current = crypto.randomUUID();
    setLoading(true);
    previewWiizePayCharge(dealId)
      .then((r) => { setSnap(r.snapshot); setApiReady(r.api_configured); })
      .catch(() => toast.error("Não foi possível carregar a venda."))
      .finally(() => setLoading(false));
  }, [open, dealId]);

  const toggle = (k: string) => setMethods((m) => (m.includes(k) ? m.filter((x) => x !== k) : [...m, k]));

  const submit = async () => {
    try {
      const r = await create.mutateAsync({ deal_id: dealId, idempotency_key: idemKey.current, payment_methods: methods, due_date: due });
      if (r.checkout_url) {
        const w = window.open(r.checkout_url, "wiize-pay-checkout", "popup,width=520,height=760,noopener=no");
        if (!w) { toast.error("Libere as janelas pop-up para abrir o Wiize Pay."); return; }
        const timer = window.setInterval(() => {
          if (w.closed) { window.clearInterval(timer); refresh.mutate(r.charge.id); }
        }, 1000);
        toast.success("Cobrança enviada ao Wiize Pay.");
      } else {
        toast.success("Pedido salvo. Será enviado quando o Wiize Pay estiver disponível.");
      }
      onOpenChange(false);
    } catch (e) {
      const m = (e as Error).message;
      toast.error(m === "not_connected" ? "Conecte sua conta Wiize Pay em Configurações → Integrações." : "Não foi possível criar a cobrança.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Cobrar com Wiize Pay
            {!apiReady && <Badge variant="outline">READY_FOR_WIIZE_PAY</Badge>}
          </DialogTitle>
          <DialogDescription>Revise os dados. Nada é enviado antes da sua confirmação.</DialogDescription>
        </DialogHeader>

        {loading || !snap ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border border-border p-3 space-y-1">
              <p className="font-semibold">{snap.customer.company_name || snap.customer.contact_name || "Cliente"}</p>
              <p className="text-muted-foreground text-xs">{[snap.customer.contact_name, snap.customer.email, snap.customer.phone].filter(Boolean).join(" · ") || "Sem contato cadastrado"}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3">
              <div><p className="text-xs text-muted-foreground">Venda</p><p className="font-medium">{snap.deal.title}</p></div>
              <div><p className="text-xs text-muted-foreground">Tipo</p><p className="font-medium">{snap.deal.type === "recurring" ? `Recorrente · ${snap.deal.installments_or_months} meses` : "Pagamento único"}</p></div>
              <div><p className="text-xs text-muted-foreground">{snap.deal.type === "recurring" ? "Mensal" : "Valor"}</p><p className="font-semibold">{fmt(snap.deal.amount_cents)}</p></div>
              <div><p className="text-xs text-muted-foreground">Total</p><p className="font-semibold">{fmt(snap.deal.total_cents)}</p></div>
            </div>
            <div className="space-y-2">
              <Label>Formas de pagamento</Label>
              <div className="flex flex-wrap gap-4">
                {METHODS.map((m) => (
                  <label key={m.key} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={methods.includes(m.key)} onCheckedChange={() => toggle(m.key)} />
                    {m.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wp-due">Primeiro vencimento</Label>
              <Input id="wp-due" type="date" value={due} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDue(e.target.value)} />
            </div>
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-4 h-4 shrink-0 text-primary" />
              O contrato e o pagamento são finalizados numa janela segura do Wiize Pay. Dados de cartão nunca passam pelo Wiize.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={!snap || methods.length === 0 || !due || create.isPending}>
            {create.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Confirmar e cobrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
