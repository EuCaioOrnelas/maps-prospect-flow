import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  previewWiizePayCharge, useWiizePayChargeMutations,
  type WiizePaySnapshot, type WiizePayBillingType,
} from "@/hooks/useWiizePayCharges";
import { WiizePayLinkShare } from "./WiizePayLinkShare";

const METHODS = [
  { key: "pix", label: "PIX" },
  { key: "boleto", label: "Boleto" },
  { key: "credit_card", label: "Cartão" },
];

const TYPES: { key: WiizePayBillingType; label: string; hint: string }[] = [
  { key: "one_time", label: "Única", hint: "Um pagamento só" },
  { key: "installment", label: "Parcelada", hint: "Valor total dividido" },
  { key: "recurring", label: "Recorrente", hint: "Mensal pelo contrato" },
];

const fmt = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const digits = (v: string) => v.replace(/\D/g, "");
const maskDoc = (v: string) => {
  const d = digits(v).slice(0, 14);
  if (d.length <= 11) return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  leadId: string;
  dealId: string;
  /** Mostra que a venda acabou de ser registrada (fluxo "Nova venda"). */
  fromNewSale?: boolean;
}

export function WiizePayChargeDialog({ open, onOpenChange, leadId, dealId, fromNewSale }: Props) {
  const [snap, setSnap] = useState<WiizePaySnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<WiizePayBillingType>("one_time");
  const [installments, setInstallments] = useState(2);
  const [methods, setMethods] = useState<string[]>(["pix"]);
  const [doc, setDoc] = useState("");
  const [due, setDue] = useState(() => new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));
  const [result, setResult] = useState<{ url: string; expiresAt: string | null } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const idemKey = useRef<string>("");
  const { create } = useWiizePayChargeMutations(leadId);

  useEffect(() => {
    if (!open) return;
    idemKey.current = crypto.randomUUID();
    setResult(null); setFormError(null);
    setLoading(true);
    previewWiizePayCharge(dealId)
      .then((r) => {
        setSnap(r.snapshot);
        setType(r.snapshot.deal.type === "recurring" ? "recurring" : "one_time");
        setDoc(r.snapshot.customer.document ? maskDoc(r.snapshot.customer.document) : "");
      })
      .catch((e) => toast.error((e as Error).message || "Não foi possível carregar a venda."))
      .finally(() => setLoading(false));
  }, [open, dealId]);

  const single = type !== "one_time";
  useEffect(() => { if (single && methods.length > 1) setMethods([methods[0]]); }, [single]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (k: string) => setMethods((m) => {
    if (single) return [k];
    return m.includes(k) ? m.filter((x) => x !== k) : [...m, k];
  });

  const valueCents = snap ? (snap.deal.type === "recurring" ? snap.deal.amount_cents : snap.deal.total_cents) : 0;
  const months = snap?.deal.type === "recurring" ? snap.deal.installments_or_months : 1;
  const summary = !snap ? "" : type === "recurring"
    ? `${months}x de ${fmt(valueCents)} (total ${fmt(valueCents * months)})`
    : type === "installment"
      ? `${installments}x de ${fmt(Math.round(valueCents / installments))} (total ${fmt(valueCents)})`
      : `${fmt(valueCents)} à vista`;

  const docDigits = digits(doc);
  const docOk = docDigits.length === 11 || docDigits.length === 14;

  const submit = async () => {
    setFormError(null);
    if (!docOk) { setFormError("Informe um CPF (11 dígitos) ou CNPJ (14 dígitos)."); return; }
    try {
      const r = await create.mutateAsync({
        deal_id: dealId, idempotency_key: idemKey.current, payment_methods: methods, due_date: due,
        billing_type: type, installments: type === "installment" ? installments : undefined, customer_document: docDigits,
      });
      if (r.checkout_url) {
        setResult({ url: r.checkout_url, expiresAt: r.checkout_expires_at ?? null });
        toast.success("Cobrança criada no Wiize Pay.");
      } else {
        toast.success("Cobrança registrada.");
        onOpenChange(false);
      }
    } catch (e) {
      const m = (e as Error).message;
      setFormError(m === "not_connected" ? "Conecte sua conta Wiize Pay em Integrações." : m || "Não foi possível criar a cobrança.");
    }
  };

  const recurringDisabled = snap?.deal.type !== "recurring";

  return (
    <Dialog open={open} onOpenChange={(o) => !create.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {result && snap ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" /> Cobrança criada</DialogTitle>
              <DialogDescription>Envie o link de pagamento para {snap.customer.contact_name || snap.customer.company_name || "o cliente"}.</DialogDescription>
            </DialogHeader>
            <WiizePayLinkShare url={result.url} expiresAt={result.expiresAt} phone={snap.customer.phone} email={snap.customer.email} title={snap.deal.title} />
            <DialogFooter><Button onClick={() => onOpenChange(false)}>Concluir</Button></DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{fromNewSale ? "Venda salva — agora crie a cobrança" : "Criar cobrança no Wiize Pay"}</DialogTitle>
              <DialogDescription>O cliente, o contrato e a cobrança são criados na sua conta Wiize Pay. Nada é enviado antes da sua confirmação.</DialogDescription>
            </DialogHeader>

            {loading || !snap ? (
              <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <p className="font-semibold">{snap.customer.company_name || snap.customer.contact_name || "Cliente"}</p>
                  <p className="text-muted-foreground text-xs">{[snap.customer.contact_name, snap.customer.email, snap.customer.phone].filter(Boolean).join(" · ") || "Sem contato cadastrado"}</p>
                  <div className="space-y-1.5 pt-1">
                    <Label htmlFor="wp-doc">CPF ou CNPJ do cliente</Label>
                    <Input id="wp-doc" inputMode="numeric" value={doc} onChange={(e) => setDoc(maskDoc(e.target.value))} placeholder="000.000.000-00 ou 00.000.000/0000-00" />
                    <p className="text-xs text-muted-foreground">Obrigatório no Wiize Pay. Fica salvo no contato.</p>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Venda</p>
                  <p className="font-medium">{snap.deal.title}</p>
                  {(snap.deal.start_date || snap.deal.end_date) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Contrato: {snap.deal.start_date ? new Date(snap.deal.start_date + "T12:00").toLocaleDateString("pt-BR") : "—"} até {snap.deal.end_date ? new Date(snap.deal.end_date + "T12:00").toLocaleDateString("pt-BR") : "—"}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Tipo de cobrança</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {TYPES.map((t) => {
                      const disabled = t.key === "recurring" ? recurringDisabled : snap.deal.type === "recurring";
                      return (
                        <button key={t.key} type="button" disabled={disabled} onClick={() => setType(t.key)}
                          className={`rounded-lg border p-2.5 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${type === t.key ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
                          <p className="font-medium">{t.label}</p>
                          <p className="text-xs text-muted-foreground">{t.hint}</p>
                        </button>
                      );
                    })}
                  </div>
                  {type === "installment" && (
                    <div className="flex items-center gap-2">
                      <Label htmlFor="wp-inst" className="shrink-0">Parcelas</Label>
                      <Input id="wp-inst" type="number" min={2} max={24} value={installments}
                        onChange={(e) => setInstallments(Math.max(2, Math.min(24, Number(e.target.value) || 2)))} className="w-24" />
                    </div>
                  )}
                  <p className="text-sm font-semibold text-foreground">{summary}</p>
                </div>

                <div className="space-y-2">
                  <Label>Forma de pagamento {single && <span className="text-xs font-normal text-muted-foreground">(escolha uma)</span>}</Label>
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

                {formError && <p className="text-sm text-destructive">{formError}</p>}

                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-primary" />
                  O cliente paga numa página segura do Wiize Pay. Dados de cartão nunca passam pelo Wiize.
                </p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>{fromNewSale ? "Deixar para depois" : "Cancelar"}</Button>
              <Button onClick={submit} disabled={!snap || methods.length === 0 || !due || create.isPending}>
                {create.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                Criar cobrança
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
