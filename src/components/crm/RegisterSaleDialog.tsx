import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileText, Trash2, Loader2, Tag, AlignLeft, Repeat, DollarSign, CalendarClock, Calendar, CreditCard, Receipt, FileSignature, User as UserIcon, Activity, StickyNote, ShieldCheck, QrCode, Landmark, Layers3, CheckCircle2, Wallet, ExternalLink, PenLine } from "lucide-react";
import { useSales, PAYMENT_METHODS, type SaleType, type Sale, type SaleStatus } from "@/hooks/useSales";
import { useWiizePayCharges, attachWiizePayEmbed, type WiizePayListMeta } from "@/hooks/useWiizePayCharges";
import { WiizePayEmbedFrame, type WiizePayEmbedEvent } from "./WiizePayEmbedFrame";
import { WiizePayPromo } from "./WiizePayPromo";
import { WiizePayExistingList } from "./WiizePayExistingList";
import { WiizePayLinkShare } from "./WiizePayLinkShare";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
/** Limite aceito pela API da WiizePay (installments_or_months ≤ 60). */
const MAX_CONTRACT_MONTHS = 60;
/** A WiizePay parcela em até 21x. */
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
  const wiizePayActive = false; // Integração na venda desativada: registro manual normal.
  /** Status ainda não carregado: evita mostrar o formulário interno e trocar de tela em seguida. */
  const wiizePayChecking = false;
  const [manualChosen, setManualChosen] = useState(false);
  useEffect(() => { if (!open) setManualChosen(false); }, [open]);
  const choosing = !isEdit && !!wiizePay?.connected && !manualChosen;

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
  const [customerDocument, setCustomerDocument] = useState("");
  const [chargeError, setChargeError] = useState<string | null>(null);
  const [savedSaleId, setSavedSaleId] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<{ url: string; expiresAt: string | null } | null>(null);
  const [embedIds, setEmbedIds] = useState<{ contract_id?: string; service_id?: string }>({});
  const [step, setStep] = useState(1);
  const [leadDocument, setLeadDocument] = useState<string | null>(null);
  const [serviceInfo, setServiceInfo] = useState<{ name?: string; amount_cents?: number; type?: "one_time" | "installment" | "recurring" }>({});
  const embedVisible = wiizePayActive && step > 1 && !paymentLink;

  /** Busca o documento já cadastrado no lead (preenche o passo 1). */
  useEffect(() => {
    if (!open || !leadId || sale) { setLeadDocument(null); return; }
    let alive = true;
    supabase.from("leads").select("document").eq("id", leadId).maybeSingle().then(({ data }) => {
      if (!alive) return;
      const d = String((data as { document?: string | null } | null)?.document ?? "").replace(/\D/g, "");
      setLeadDocument(d);
      if (d) setCustomerDocument(formatDocument(d));
    });
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, leadId, sale]);

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
    setCustomerDocument("");
    setChargeError(null);
    setSavedSaleId(null);
    setPaymentLink(null);
    setEmbedIds({});
    setServiceInfo({});
    setStep(1);
  }, [open, sale, initialValue, initialTitle, initialDescription, leadName, leadId]);

  const documentDigits = customerDocument.replace(/\D/g, "");
  const formatDocument = (raw: string) => {
    const d = raw.replace(/\D/g, "").slice(0, 14);
    if (d.length <= 11) return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
  };


  const parsedValue = Number(value.replace(/\./g, "").replace(",", "."));
  /** Etapa 1 valida os dados; as demais avançam pelos avisos da janela WiizePay. */
  const goNext = async () => {
    if (![11, 14].includes(documentDigits.length)) return toast.error("Informe um CPF ou CNPJ válido");
    if (leadId && leadDocument !== documentDigits && !leadDocument) {
      const { error } = await supabase.from("leads").update({ document: documentDigits }).eq("id", leadId);
      if (error) return toast.error("Não foi possível salvar o CPF/CNPJ do cliente.");
      setLeadDocument(documentDigits);
    }
    setStep(2);
  };

  /** Recebe os IDs da WiizePay; a venda só é criada quando a cobrança é criada. */
  const handleEmbedEvent = async (e: WiizePayEmbedEvent) => {
    if (e.type === "wiizepay:contract.selected") { setEmbedIds((c) => ({ ...c, contract_id: e.contract_id })); setStep(3); return; }
    if (e.type === "wiizepay:service.selected") {
      setEmbedIds((c) => ({ ...c, service_id: e.service_id }));
      setServiceInfo({ name: e.name, amount_cents: e.amount_cents, type: e.service_type });
      setStep(4);
      return;
    }
    if (submitting || savedSaleId || !leadId) return;
    setSubmitting(true);
    setChargeError(null);
    try {
      const recurring = serviceInfo.type === "recurring";
      const created = await createSale({
        lead_id: leadId,
        title: serviceInfo.name?.trim() || `Venda - ${leadName || "cliente"}`,
        description: description.trim() || undefined,
        value: (serviceInfo.amount_cents ?? 0) / 100,
        sale_type: recurring ? "recurring" : "one_time",
        contract_months: recurring ? 12 : 1,
        payment_method: "wiize_pay",
        start_date: startDate,
      });
      if (!created?.id) throw new Error("sale_not_created");
      setSavedSaleId(created.id);
      await attachWiizePayEmbed({ deal_id: created.id, ...embedIds, charge_group_id: e.charge_group_id, checkout_url: e.checkout_url });
      setPaymentLink({ url: e.checkout_url, expiresAt: null });
      toast.success("Venda e cobrança criadas com sucesso!");
    } catch (err) {
      setChargeError("A cobrança foi criada na WiizePay, mas não conseguimos salvar tudo na venda. " + ((err as Error).message || ""));
      toast.error("Não foi possível salvar a venda.");
    } finally {
      setSubmitting(false);
    }
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
        payment_method: paymentMethod,
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

      toast.success("Venda registrada com sucesso!");

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
  /** Fora da WiizePay mostra tudo; com WiizePay, só a etapa atual. */
  const showStep = (s: number) => !wiizePayActive || (!paymentLink && step === s);

  const titleField = (
    <div className="space-y-1.5">
      <Label htmlFor="sale-title" className="flex items-center gap-1.5">
        <Tag className="w-3.5 h-3.5 text-primary" /> Título da venda *
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
          {wiizePayActive && ` · até ${MAX_CONTRACT_MONTHS} meses na WiizePay`}
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
    <section className="space-y-4" aria-label="Cobrança WiizePay">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-foreground">Cobrança WiizePay</h4>
            <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Conectado</span>
          </div>
          <p className="text-xs text-muted-foreground">Os dados do cartão ficam somente no ambiente seguro da WiizePay.</p>
        </div>
      </div>

      <ol className="grid grid-cols-4 gap-1.5" aria-label="Etapas na WiizePay">
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
          <p className="text-xs text-muted-foreground">A situação (aguardando, paga, vencida…) é atualizada sozinha quando a WiizePay avisar.</p>
          <WiizePayLinkShare url={paymentLink.url} expiresAt={paymentLink.expiresAt} title={title} />
        </div>
      )}
    </section>
  );

  const stepCliente = (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm">
        <p className="text-xs text-muted-foreground">Cliente</p>
        <p className="font-medium text-foreground">{leadName || "Cliente selecionado"}</p>
      </div>
      {leadDocument !== null && !leadDocument ? (
        <div className="space-y-1.5">
          <Label htmlFor="wp-customer-document">CPF ou CNPJ do cliente *</Label>
          <Input id="wp-customer-document" inputMode="numeric" value={customerDocument} onChange={(event) => setCustomerDocument(formatDocument(event.target.value))} placeholder="00.000.000/0000-00" disabled={locked} />
        </div>
      ) : leadDocument ? (
        <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm">
          <p className="text-xs text-muted-foreground">CPF/CNPJ</p>
          <p className="font-medium text-foreground">{formatDocument(leadDocument)}</p>
        </div>
      ) : null}
    </div>
  );

  const embedStep = (kind: "contract" | "service" | "charge", resource?: "services" | "contracts") => (
    <div className={cn("min-h-0 space-y-2", !embedded && "flex-1", embedVisible && !embedded && "flex flex-col")}>
      {resource && (
        <WiizePayExistingList resource={resource} leadId={kind === "service" ? undefined : leadId} className="shrink-0" />
      )}
      <WiizePayEmbedFrame
        kind={kind}
        leadId={kind === "service" ? undefined : leadId}
        customerDocument={documentDigits || undefined}
        onEvent={handleEmbedEvent}
        className={cn(!embedded && "h-full min-h-0 flex-1")}
      />
    </div>
  );
  const stepContrato = embedStep("contract", "contracts");
  const stepServico = embedStep("service", "services");
  const stepCobranca = (
    <div className={cn("space-y-3", embedVisible && !embedded && "flex min-h-0 flex-1 flex-col")}>
      {submitting && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Salvando a venda…</div>}
      {chargeError && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{chargeError}</div>}
      {!locked && embedStep("charge")}
    </div>
  );

  const formBodyRaw = (
    <>
      <div className={cn(compact ? "space-y-2.5 py-1" : "space-y-4 py-2", embedVisible && !embedded && "flex min-h-0 flex-1 flex-col")}>
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
                <Loader2 className="h-4 w-4 animate-spin" /> Verificando a conexão com a WiizePay…
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

  const footerRaw = (
    <div className={cn("flex justify-end gap-2 pt-2 border-t border-border/60", embedded && "shrink-0")}> 
      <Button variant="outline" size="sm" onClick={() => {
        if (savedSaleId) onCreated?.({ id: savedSaleId });
        onOpenChange(false);
      }} disabled={submitting} className={cn(compact && "h-8 px-2 text-xs")}>
        {paymentLink ? "Concluir" : savedSaleId ? "Fechar" : "Cancelar"}
      </Button>
      {wiizePayActive && !paymentLink && step > 1 && !submitting && (
        <Button variant="ghost" size="sm" onClick={() => setStep((s) => Math.max(1, s - 1))} className={cn(compact && "h-8 px-2 text-xs")}>
          Voltar
        </Button>
      )}
      {wiizePayActive && !paymentLink && step === 1 && (
        <Button size="sm" onClick={goNext} className={cn(compact && "h-8 px-2 text-xs")}>Próximo</Button>
      )}
      {!paymentLink && !wiizePayChecking && !wiizePayActive && <Button size="sm" onClick={handleSubmit} disabled={submitting} className={cn(compact && "h-8 px-2 text-xs")}>
        {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {isEdit ? "Salvar alterações" : savedSaleId ? "Tentar cobrança novamente" : wiizePayActive ? "Criar venda e cobrança" : "Registrar venda"}
      </Button>}
    </div>
  );


  const formBody = choosing ? (
    <div className="grid gap-3 py-2 sm:grid-cols-2">
      <button type="button" onClick={() => setManualChosen(true)} className="flex flex-col items-start gap-2 rounded-lg border border-border bg-background p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/40">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground"><PenLine className="h-5 w-5" /></span>
        <span className="font-semibold text-foreground">Registrar manual</span>
        <span className="text-xs text-muted-foreground">Cadastre a venda aqui no CRM, como sempre.</span>
      </button>
      <button type="button" onClick={() => { window.open("https://wiizepay.com/cobrancas", "_blank", "noopener,noreferrer"); onOpenChange(false); }} className="flex flex-col items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-4 text-left transition-colors hover:border-primary/60 hover:bg-primary/10">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><ExternalLink className="h-5 w-5" /></span>
        <span className="font-semibold text-foreground">Registrar na WiizePay</span>
        <span className="text-xs text-muted-foreground">Abre a área de cobranças da WiizePay em uma nova aba.</span>
      </button>
    </div>
  ) : formBodyRaw;
  const footer = choosing ? (
    <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
  ) : footerRaw;

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
      <DialogContent className={cn("sm:max-w-xl max-h-[90dvh] overflow-y-auto bg-card p-4", wiizePayActive && "sm:max-w-4xl", embedVisible && "flex h-[90dvh] min-h-0 flex-col overflow-hidden")}>
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
