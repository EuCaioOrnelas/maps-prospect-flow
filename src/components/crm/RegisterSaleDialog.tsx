import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileText, Trash2, Loader2, Tag, AlignLeft, Repeat, DollarSign, CalendarClock, Calendar, CreditCard, Receipt, FileSignature, User as UserIcon, Activity, StickyNote, ShieldCheck, QrCode, Landmark, Layers3, CheckCircle2, Wallet } from "lucide-react";
import { useSales, PAYMENT_METHODS, type SaleType, type Sale, type SaleStatus } from "@/hooks/useSales";
import { useWiizePayCharges, useWiizePayChargeMutations, type WiizePayBillingType, type WiizePayListMeta } from "@/hooks/useWiizePayCharges";
import { WiizePayPromo } from "./WiizePayPromo";
import { WiizePayLinkShare } from "./WiizePayLinkShare";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface RegisterSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string;
  leadName?: string;
  initialValue?: number;
  initialTitle?: string;
  initialDescription?: string;
  onCreated?: (created?: { id: string }) => void;
  embedded?: boolean;
  embeddedLayout?: "compact" | "page";
  /** Quando informado, o dialog entra em modo edição da venda. */
  sale?: Sale | null;
  /** Só o responsável atual, owner ou admin podem trocar o responsável. */
  canChangeResponsible?: boolean;
  wiizePay?: WiizePayListMeta | null;
}

const CONTRACT_OPTIONS = [
  { value: "1", label: "1 mês" },
  { value: "3", label: "3 meses" },
  { value: "6", label: "6 meses" },
  { value: "12", label: "12 meses" },
  { value: "18", label: "18 meses" },
  { value: "24", label: "24 meses" },
  { value: "36", label: "36 meses" },
  { value: "48", label: "48 meses" },
  { value: "60", label: "60 meses" },
];
/** Limite aceito pela API do Wiize Pay (installments_or_months ≤ 60). */
const MAX_CONTRACT_MONTHS = 60;
/** Wiize Pay parcela em até 21x. */
const MAX_INSTALLMENTS = 21;
const isPresetMonths = (m: string) => CONTRACT_OPTIONS.some((o) => o.value === m);
const WIZARD_STEPS = [
  { n: 1, label: "Cliente", Icon: UserIcon },
  { n: 2, label: "Contrato", Icon: FileSignature },
  { n: 3, label: "Serviço", Icon: Layers3 },
  { n: 4, label: "Cobrança", Icon: Receipt },
] as const;

export function RegisterSaleDialog({
  open,
  onOpenChange,
  leadId,
  leadName,
  initialValue,
  initialTitle,
  initialDescription,
  onCreated,
  embedded = false,
  embeddedLayout = "compact",
  sale = null,
  canChangeResponsible = true,
  wiizePay: wiizePayProp,
}: RegisterSaleDialogProps) {
  // Quem abre a tela pode já ter o status; senão (ex.: chat), buscamos aqui mesmo (mesmo cache).
  const ownMeta = useWiizePayCharges(wiizePayProp === undefined && open && !sale ? leadId ?? "" : "");
  const wiizePay: WiizePayListMeta | null | undefined = wiizePayProp !== undefined
    ? wiizePayProp
    : ownMeta.data ?? (ownMeta.isError || !leadId ? null : undefined);
  const { createSale, updateSale, uploadAttachment } = useSales();
  const { members } = useAccountMembers();
  const [submitting, setSubmitting] = useState(false);
  const compact = embedded && embeddedLayout !== "page";
  const isEdit = !!sale;
  const wiizePayActive = !isEdit && !!wiizePay?.connected && !!wiizePay.can_charge;
  /** Status ainda não carregado: evita mostrar o formulário interno e trocar de tela em seguida. */
  const wiizePayChecking = !isEdit && wiizePay === undefined;
  const { create: createCharge } = useWiizePayChargeMutations(leadId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saleType, setSaleType] = useState<SaleType>("recurring");
  const [value, setValue] = useState<string>("");
  const [months, setMonths] = useState<string>("12");
  const [customMonths, setCustomMonths] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("pix");
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [status, setStatus] = useState<SaleStatus>("active");
  const [notes, setNotes] = useState("");
  const [responsibleUserId, setResponsibleUserId] = useState<string>("");
  const [billingType, setBillingType] = useState<WiizePayBillingType>("recurring");
  const [installments, setInstallments] = useState(2);
  const [chargeMethods, setChargeMethods] = useState<string[]>(["pix"]);
  const [customerDocument, setCustomerDocument] = useState("");
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));
  const [chargeError, setChargeError] = useState<string | null>(null);
  const [savedSaleId, setSavedSaleId] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<{ url: string; expiresAt: string | null } | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (!open) return;
    if (sale) {
      setTitle(sale.title ?? "");
      setDescription(sale.description ?? "");
      setSaleType(sale.sale_type);
      setValue(
        Number(sale.value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      );
      setMonths(String(sale.contract_months ?? 12));
      setCustomMonths(!isPresetMonths(String(sale.contract_months ?? 12)));
      setPaymentMethod(sale.payment_method ?? "pix");
      setStartDate(sale.start_date ?? new Date().toISOString().slice(0, 10));
      setStatus(sale.status);
      setNotes(sale.notes ?? "");
      setResponsibleUserId(sale.responsible_user_id ?? "");
      setReceiptFile(null);
      setContractFile(null);
      return;
    }
    setTitle(initialTitle ?? (leadName ? `Venda - ${leadName}` : ""));
    setDescription(initialDescription ?? "");
    setSaleType("recurring");
    setValue(
      initialValue && initialValue > 0
        ? initialValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : ""
    );
    setMonths("12");
    setCustomMonths(false);
    setPaymentMethod("pix");
    setStartDate(new Date().toISOString().slice(0, 10));
    setStatus("active");
    setNotes("");
    setResponsibleUserId("");
    setReceiptFile(null);
    setContractFile(null);
    setBillingType("recurring");
    setInstallments(2);
    setChargeMethods(["pix"]);
    setCustomerDocument("");
    setDueDate(new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));
    setChargeError(null);
    setSavedSaleId(null);
    setPaymentLink(null);
    setIdempotencyKey(crypto.randomUUID());
    setStep(1);
  }, [open, sale, initialValue, initialTitle, initialDescription, leadName, leadId]);

  useEffect(() => {
    if (!wiizePayActive) return;
    setSaleType(billingType === "recurring" ? "recurring" : "one_time");
    if (billingType !== "one_time" && chargeMethods.length > 1) setChargeMethods([chargeMethods[0]]);
  }, [billingType, wiizePayActive]); // eslint-disable-line react-hooks/exhaustive-deps

  const documentDigits = customerDocument.replace(/\D/g, "");
  const formatDocument = (raw: string) => {
    const d = raw.replace(/\D/g, "").slice(0, 14);
    if (d.length <= 11) return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
  };

  const toggleChargeMethod = (method: string) => {
    setChargeMethods((current) => {
      if (billingType !== "one_time") return [method];
      return current.includes(method) ? current.filter((item) => item !== method) : [...current, method];
    });
  };

  const parsedValue = Number(value.replace(/\./g, "").replace(",", "."));
  /** Valida a etapa atual do fluxo Wiize Pay antes de avançar. */
  const goNext = () => {
    if (step === 1 && ![11, 14].includes(documentDigits.length)) return toast.error("Informe um CPF ou CNPJ válido");
    if (step === 2) {
      if (!startDate) return toast.error("Informe a data de início");
      const m = Number(months);
      if (billingType === "recurring" && (!Number.isInteger(m) || m < 1 || m > MAX_CONTRACT_MONTHS)) {
        return toast.error(`Informe um tempo de contrato entre 1 e ${MAX_CONTRACT_MONTHS} meses`);
      }
    }
    if (step === 3) {
      if (!title.trim()) return toast.error("Informe o nome do serviço");
      if (!parsedValue || parsedValue <= 0) return toast.error("Informe um valor válido");
    }
    setStep((s) => Math.min(4, s + 1));
  };

  const handleSubmit = async () => {
    if (!title.trim()) return toast.error("Informe um título para a venda");
    if (!isEdit && !leadId) return toast.error("Selecione um cliente para registrar a venda");
    const numValue = Number(value.replace(/\./g, "").replace(",", "."));
    if (!numValue || numValue <= 0) return toast.error("Informe um valor válido");
    const monthsNum = Number(months);
    if (saleType === "recurring" && (!Number.isInteger(monthsNum) || monthsNum < 1 || monthsNum > MAX_CONTRACT_MONTHS)) {
      return toast.error(`Informe um tempo de contrato entre 1 e ${MAX_CONTRACT_MONTHS} meses`);
    }
    if (wiizePayActive && !savedSaleId) {
      if (![11, 14].includes(documentDigits.length)) return toast.error("Informe um CPF ou CNPJ válido");
      if (!chargeMethods.length) return toast.error("Escolha uma forma de pagamento");
      if (!dueDate) return toast.error("Informe o primeiro vencimento");
    }

    setSubmitting(true);
    try {
      if (isEdit && sale) {
        await updateSale(sale.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          value: numValue,
          sale_type: saleType,
          contract_months: saleType === "recurring" ? Number(months) : null,
          payment_method: paymentMethod || null,
          start_date: startDate,
          notes,
          status,
          ...(canChangeResponsible ? { responsible_user_id: responsibleUserId || null } : {}),
        });

        const uploads: Promise<unknown>[] = [];
        if (receiptFile) {
          uploads.push(
            uploadAttachment(sale.id, receiptFile, "receipt").then((path) =>
              import("@/integrations/supabase/client").then(({ supabase }) =>
                supabase.from("lead_deals").update({ receipt_url: path }).eq("id", sale.id)
              )
            )
          );
        }
        if (contractFile) {
          uploads.push(
            uploadAttachment(sale.id, contractFile, "contract").then((path) =>
              import("@/integrations/supabase/client").then(({ supabase }) =>
                supabase.from("lead_deals").update({ contract_url: path }).eq("id", sale.id)
              )
            )
          );
        }
        await Promise.all(uploads);

        toast.success("Venda atualizada com sucesso!");
        onCreated?.();
        onOpenChange(false);
        return;
      }

      const created = savedSaleId ? null : await createSale({
        lead_id: leadId,
        title: title.trim(),
        description: description.trim() || undefined,
        value: numValue,
        sale_type: saleType,
        contract_months: saleType === "recurring" ? Number(months) : 1,
        payment_method: wiizePayActive ? (chargeMethods.length === 1 ? chargeMethods[0] : "wiize_pay") : paymentMethod,
        start_date: startDate,
      });
      const newSaleId = savedSaleId || created?.id;
      if (!newSaleId) throw new Error("sale_not_created");
      if (!savedSaleId) setSavedSaleId(newSaleId);

      // Uploads em paralelo
      const uploads: Promise<unknown>[] = [];
      if (receiptFile) {
        uploads.push(
          uploadAttachment(newSaleId, receiptFile, "receipt").then((path) =>
            import("@/integrations/supabase/client").then(({ supabase }) =>
              supabase.from("lead_deals").update({ receipt_url: path }).eq("id", newSaleId)
            )
          )
        );
      }
      if (contractFile) {
        uploads.push(
          uploadAttachment(newSaleId, contractFile, "contract").then((path) =>
            import("@/integrations/supabase/client").then(({ supabase }) =>
              supabase.from("lead_deals").update({ contract_url: path }).eq("id", newSaleId)
            )
          )
        );
      }
      if (!savedSaleId) await Promise.all(uploads);

      if (wiizePayActive) {
        setChargeError(null);
        try {
          const charge = await createCharge.mutateAsync({
            deal_id: newSaleId,
            idempotency_key: idempotencyKey,
            payment_methods: chargeMethods,
            due_date: dueDate,
            billing_type: billingType,
            installments: billingType === "installment" ? installments : undefined,
            customer_document: documentDigits,
          });
          if (charge.checkout_url) {
            setPaymentLink({ url: charge.checkout_url, expiresAt: charge.checkout_expires_at ?? null });
            toast.success("Venda e cobrança criadas com sucesso!");
            return;
          }
          toast.success("Venda e cobrança registradas com sucesso!");
        } catch (chargeFailure) {
          const message = (chargeFailure as Error).message || "Não foi possível criar a cobrança.";
          setChargeError(message);
          setIdempotencyKey(crypto.randomUUID());
          toast.error("A venda foi salva, mas a cobrança não foi criada.");
          return;
        }
      } else {
        toast.success("Venda registrada com sucesso!");
      }

      onCreated?.({ id: newSaleId });
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(isEdit ? "Erro ao atualizar venda" : "Erro ao registrar venda");
    } finally {
      setSubmitting(false);
    }
  };


  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const inputCls = cn(compact && "h-8 text-xs");
  const locked = !!savedSaleId;
  /** Fora do Wiize Pay mostra tudo; com Wiize Pay, só a etapa atual. */
  const showStep = (s: number) => !wiizePayActive || (!paymentLink && step === s);

  const titleField = (
    <div className="space-y-1.5">
      <Label htmlFor="sale-title" className="flex items-center gap-1.5">
        <Tag className="w-3.5 h-3.5 text-primary" /> {wiizePayActive ? "Nome do serviço *" : "Título da venda *"}
      </Label>
      <Input id="sale-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Plano Growth Anual - João da Silva" maxLength={120} className={inputCls} disabled={locked} />
    </div>
  );

  const descriptionField = (
    <div className="space-y-1.5">
      <Label htmlFor="sale-desc" className="flex items-center gap-1.5">
        <AlignLeft className="w-3.5 h-3.5 text-primary" /> Descrição (opcional)
      </Label>
      <Textarea id="sale-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes do acordo, escopo, condições especiais..." rows={compact ? 2 : 3} maxLength={500} className={cn(compact && "min-h-16 text-xs")} disabled={locked} />
    </div>
  );

  const valueField = (
    <div className="space-y-1.5">
      <Label htmlFor="sale-value" className="flex items-center gap-1.5">
        <DollarSign className="w-3.5 h-3.5 text-primary" />
        {saleType === "recurring" ? "Valor mensal (R$) *" : "Valor total (R$) *"}
      </Label>
      <Input id="sale-value" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0,00" className={inputCls} disabled={locked} />
    </div>
  );

  const monthsField = (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5">
        <CalendarClock className="w-3.5 h-3.5 text-primary" /> Tempo de contrato *
      </Label>
      <div className="flex gap-2">
        <Select
          value={customMonths ? "custom" : months}
          onValueChange={(v) => {
            if (v === "custom") { setCustomMonths(true); return; }
            setCustomMonths(false);
            setMonths(v);
          }}
          disabled={locked}
        >
          <SelectTrigger className={cn(customMonths ? "w-40 shrink-0" : "w-full", inputCls)}><SelectValue /></SelectTrigger>
          <SelectContent>
            {CONTRACT_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            <SelectItem value="custom">Outro prazo…</SelectItem>
          </SelectContent>
        </Select>
        {customMonths && (
          <div className="relative flex-1">
            <Input aria-label="Quantidade de meses do contrato" type="number" inputMode="numeric" min={1} max={MAX_CONTRACT_MONTHS} value={months} onChange={(e) => setMonths(e.target.value.replace(/\D/g, "").slice(0, 2))} className={cn("pr-14", inputCls)} autoFocus disabled={locked} />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">meses</span>
          </div>
        )}
      </div>
      {startDate && Number(months) >= 1 && (
        <p className="text-xs text-muted-foreground">
          Termina em {(() => { const d = new Date(startDate + "T12:00"); d.setMonth(d.getMonth() + Number(months)); return d.toLocaleDateString("pt-BR"); })()}
          {wiizePayActive && ` · até ${MAX_CONTRACT_MONTHS} meses no Wiize Pay`}
        </p>
      )}
    </div>
  );

  const startField = (
    <div className="space-y-1.5">
      <Label htmlFor="sale-start" className="flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5 text-primary" /> Data de início *
      </Label>
      <Input id="sale-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} disabled={locked} />
    </div>
  );

  const contractFileField = (
    <FileSlot label="Contrato" icon={<FileSignature className="w-3.5 h-3.5 text-primary" />} file={contractFile} onChange={setContractFile} compact={compact} />
  );

  const optionCls = (active: boolean) => cn(
    "flex min-h-12 items-center gap-3 rounded-lg border px-3 text-left transition-colors",
    active ? "border-foreground/25 bg-muted/60 text-foreground" : "border-border text-muted-foreground hover:bg-muted/30 hover:text-foreground",
    locked && "cursor-not-allowed opacity-70",
  );

  const wiizePaySection = wiizePayActive && (
    <section className="space-y-4" aria-label="Cobrança Wiize Pay">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-foreground">Cobrança Wiize Pay</h4>
            <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Conectado</span>
          </div>
          <p className="text-xs text-muted-foreground">Os dados do cartão ficam somente no ambiente seguro do Wiize Pay.</p>
        </div>
      </div>

      <ol className="grid grid-cols-4 gap-1.5" aria-label="Etapas no Wiize Pay">
        {WIZARD_STEPS.map(({ n, label, Icon }) => {
          const done = !!paymentLink || n < step;
          const current = !paymentLink && n === step;
          return (
            <li key={n}>
              <button
                type="button"
                disabled={!done || !!paymentLink || locked}
                onClick={() => setStep(n)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors",
                  current ? "border-foreground/25 bg-muted/60 text-foreground" : done ? "border-border text-foreground hover:bg-muted/30" : "border-border text-muted-foreground",
                )}
              >
                <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold", done ? "bg-foreground text-background" : "bg-muted text-foreground")}>
                  {done ? <CheckCircle2 className="h-3 w-3" /> : n}
                </span>
                <Icon className="hidden h-3.5 w-3.5 shrink-0 sm:block" />
                <span className="truncate font-medium">{label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {paymentLink && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-2 font-medium text-foreground"><CheckCircle2 className="h-5 w-5 text-primary" /> Venda e cobrança criadas</div>
          <p className="text-xs text-muted-foreground">A situação (aguardando, paga, vencida…) é atualizada sozinha quando o Wiize Pay avisar.</p>
          <WiizePayLinkShare url={paymentLink.url} expiresAt={paymentLink.expiresAt} title={title} />
        </div>
      )}
    </section>
  );

  const stepCliente = (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm">
        <p className="text-xs text-muted-foreground">Cliente</p>
        <p className="font-medium text-foreground">{leadName || "Cliente selecionado"}</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="wp-customer-document">CPF ou CNPJ do cliente *</Label>
        <Input id="wp-customer-document" inputMode="numeric" value={customerDocument} onChange={(event) => setCustomerDocument(formatDocument(event.target.value))} placeholder="00.000.000/0000-00" disabled={locked} />
      </div>
    </div>
  );

  const stepContrato = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Tipo de cobrança *</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {([
            ["one_time", "À vista", "Uma cobrança", DollarSign],
            ["installment", "Parcelada", `Até ${MAX_INSTALLMENTS}x`, Layers3],
            ["recurring", "Recorrente", "Cobrança mensal", Repeat],
          ] as const).map(([key, label, hint, Icon]) => (
            <button key={key} type="button" aria-pressed={billingType === key} className={cn(optionCls(billingType === key), "py-2")} onClick={() => setBillingType(key)} disabled={locked}>
              <Icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{label}</span><span className="block text-xs text-muted-foreground">{hint}</span></span>
              <span className={cn("h-2 w-2 shrink-0 rounded-full", billingType === key ? "bg-foreground" : "bg-transparent")} />
            </button>
          ))}
        </div>
      </div>
      <div className={cn("grid gap-3", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
        {startField}
        {billingType === "recurring" && monthsField}
      </div>
      {contractFileField}
    </div>
  );

  const stepServico = (
    <div className="space-y-4">
      {titleField}
      {descriptionField}
      <div className={cn("grid gap-3", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
        {valueField}
        {billingType === "installment" && (
          <div className="space-y-1.5">
            <Label htmlFor="wp-installments">Quantidade de parcelas *</Label>
            <Select value={String(installments)} onValueChange={(next) => setInstallments(Number(next))} disabled={locked}>
              <SelectTrigger id="wp-installments"><SelectValue /></SelectTrigger>
              <SelectContent>{Array.from({ length: MAX_INSTALLMENTS - 1 }, (_, index) => index + 2).map((count) => <SelectItem key={count} value={String(count)}>{count}x</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );

  const stepCobranca = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="wp-first-due">Primeiro vencimento *</Label>
        <Input id="wp-first-due" type="date" min={new Date().toISOString().slice(0, 10)} value={dueDate} onChange={(event) => setDueDate(event.target.value)} disabled={locked} />
      </div>
      <div className="space-y-2">
        <Label>Formas de pagamento *</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {([
            ["pix", "PIX", QrCode],
            ["boleto", "Boleto", Landmark],
            ["credit_card", "Crédito", CreditCard],
            ["debit", "Débito em conta", Wallet],
          ] as const).map(([key, label, Icon]) => (
            <label key={key} className={cn(optionCls(chargeMethods.includes(key)), "cursor-pointer")}>
              <Checkbox checked={chargeMethods.includes(key)} onCheckedChange={() => toggleChargeMethod(key)} disabled={locked} />
              <Icon className="h-4 w-4" /><span className="text-sm font-medium">{label}</span>
            </label>
          ))}
        </div>
        {billingType !== "one_time" && <p className="text-xs text-muted-foreground">Cobranças parceladas e recorrentes aceitam uma forma de pagamento.</p>}
      </div>
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
        <p className="text-xs text-muted-foreground">Resumo</p>
        <p className="font-semibold text-foreground">
          {billingType === "installment" && parsedValue > 0
            ? `${installments}x de ${brl(parsedValue / installments)}`
            : billingType === "recurring"
              ? `${months} cobranças mensais de ${brl(parsedValue || 0)}`
              : `${brl(parsedValue || 0)} à vista`}
        </p>
        {title && <p className="text-xs text-muted-foreground">{title}{leadName ? ` · ${leadName}` : ""}</p>}
      </div>
      {chargeError && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><strong>A venda já foi salva.</strong> {chargeError} Corrija a conexão, se necessário, e tente criar a cobrança novamente.</div>}
    </div>
  );

  const formBody = (
    <>
      <div className={cn(compact ? "space-y-2.5 py-1" : "space-y-4 py-2")}>
        {!isEdit && wiizePay && !wiizePay.connected && <WiizePayPromo variant="strip" connected={false} />}
        {wiizePayActive ? (
          <>
            {wiizePaySection}
            {showStep(1) && stepCliente}
            {showStep(2) && stepContrato}
            {showStep(3) && stepServico}
            {showStep(4) && stepCobranca}
          </>
        ) : (
          <>
            {titleField}
            {descriptionField}

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-primary" /> Tipo de venda *
              </Label>
              <ToggleGroup
                type="single"
                value={saleType}
                onValueChange={(v) => { if (v) setSaleType(v as SaleType); }}
                className={cn(
                  "inline-flex justify-start rounded-full border border-border bg-muted/40 p-1 shadow-inner shadow-background/40",
                  compact && "grid w-full grid-cols-2 gap-1"
                )}
              >
                {([["recurring", "Recorrente"], ["one_time", "Venda única"]] as const).map(([v, l]) => (
                  <ToggleGroupItem key={v} value={v} className={cn(
                    "h-8 rounded-full px-4 text-sm text-muted-foreground hover:bg-background/70 hover:text-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm",
                    compact && "w-full px-2 text-[11px]"
                  )}>{l}</ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div className={cn("grid gap-3", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
              {valueField}
              {saleType === "recurring" && monthsField}
            </div>

            <div className={cn("grid gap-3", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
              {startField}
              {!wiizePayChecking && <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-primary" /> Forma de pagamento
                </Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>}
            </div>

            {wiizePayChecking ? (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Verificando a conexão com o Wiize Pay…
              </div>
            ) : (
              <div className={cn("grid gap-3", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
                <FileSlot label="Comprovante" icon={<Receipt className="w-3.5 h-3.5 text-primary" />} file={receiptFile} onChange={setReceiptFile} compact={compact} />
                {contractFileField}
              </div>
            )}
          </>
        )}

        {isEdit && (
          <>
            <div className={cn("grid gap-3", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-primary" /> Responsável pela venda
                </Label>
                <Select
                  value={responsibleUserId || "none"}
                  onValueChange={(v) => setResponsibleUserId(v === "none" ? "" : v)}
                  disabled={!canChangeResponsible}
                >
                  <SelectTrigger className={cn(compact && "h-8 text-xs")}><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem responsável</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.name || m.email || m.user_id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!canChangeResponsible && (
                  <p className="text-[10.5px] text-muted-foreground">
                    Somente o responsável atual, o dono da conta ou um admin podem alterar este campo.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-primary" /> Status
                </Label>
                <Select value={status} onValueChange={(v) => setStatus(v as SaleStatus)}>
                  <SelectTrigger className={cn(compact && "h-8 text-xs")}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="expiring">Vencendo</SelectItem>
                    <SelectItem value="expired">Expirado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                    <SelectItem value="renewed">Renovado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5 text-primary" /> Notas
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={compact ? 2 : 3}
                className={cn(compact && "min-h-16 text-xs")}
              />
            </div>
          </>
        )}
      </div>
    </>
  );

  const footer = (
    <div className={cn("flex justify-end gap-2 pt-2 border-t border-border/60", embedded && "shrink-0")}> 
      <Button variant="outline" size="sm" onClick={() => {
        if (savedSaleId) onCreated?.({ id: savedSaleId });
        onOpenChange(false);
      }} disabled={submitting} className={cn(compact && "h-8 px-2 text-xs")}>
        {paymentLink ? "Concluir" : savedSaleId ? "Fechar" : "Cancelar"}
      </Button>
      {wiizePayActive && !paymentLink && step > 1 && !locked && (
        <Button variant="ghost" size="sm" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={submitting} className={cn(compact && "h-8 px-2 text-xs")}>
          Voltar
        </Button>
      )}
      {wiizePayActive && !paymentLink && step < 4 && (
        <Button size="sm" onClick={goNext} className={cn(compact && "h-8 px-2 text-xs")}>Próximo</Button>
      )}
      {!paymentLink && !wiizePayChecking && (!wiizePayActive || step === 4) && <Button size="sm" onClick={handleSubmit} disabled={submitting} className={cn(compact && "h-8 px-2 text-xs")}>
        {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {isEdit ? "Salvar alterações" : savedSaleId ? "Tentar cobrança novamente" : wiizePayActive ? "Criar venda e cobrança" : "Registrar venda"}
      </Button>}
    </div>
  );


  if (!open) {
    return null;
  }

  if (embedded) {
    return (
      <div className="w-full">
        <div className="pb-4 mb-2">
          <h3 className="text-xl font-semibold text-foreground">Registrar venda</h3>
          <p className="text-sm text-muted-foreground">
            {leadName ? `Venda fechada com ${leadName}` : "Detalhes da venda fechada"}
          </p>
        </div>
        {formBody}
        <div className="pt-2">
          {footer}
        </div>
      </div>
    );
  }

  const clientName = leadName || sale?.lead?.company_name || sale?.lead?.contact_name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-card p-4">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar venda" : "Registrar venda"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? clientName
                ? `Atualize os detalhes da venda com ${clientName}`
                : "Atualize os detalhes desta venda"
              : clientName
                ? `Cadastre a venda fechada com ${clientName}`
                : "Cadastre os detalhes da venda fechada"}
          </DialogDescription>
        </DialogHeader>

        {formBody}
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FileSlot({ label, icon, file, onChange, compact = false }: { label: string; icon?: React.ReactNode; file: File | null; onChange: (f: File | null) => void; compact?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5">{icon}{label} (opcional)</Label>
      {file ? (
        <div className={cn("flex items-center gap-2 rounded-md border px-3 py-2 text-sm bg-muted/30", compact && "py-1.5 text-xs")}>
          <FileText className="w-4 h-4 text-primary shrink-0" />
          <span className="truncate flex-1" title={file.name}>{file.name}</span>
          <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => onChange(null)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <label className={cn("flex items-center justify-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors", compact && "py-1.5 text-xs")}>
          <Upload className="w-4 h-4" />
          Enviar arquivo
          <input
            type="file"
            className="hidden"
            accept="image/*,application/pdf"
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          />
        </label>
      )}
    </div>
  );
}
