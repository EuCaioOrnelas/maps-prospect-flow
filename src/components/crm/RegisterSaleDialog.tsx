import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileText, Trash2, Loader2, Tag, AlignLeft, Repeat, DollarSign, CalendarClock, Calendar, CreditCard, Receipt, FileSignature, User as UserIcon, Activity, StickyNote, ShieldCheck, QrCode, Landmark, Layers3, CheckCircle2 } from "lucide-react";
import { useSales, PAYMENT_METHODS, type SaleType, type Sale, type SaleStatus } from "@/hooks/useSales";
import { useWiizePayChargeMutations, type WiizePayBillingType, type WiizePayListMeta } from "@/hooks/useWiizePayCharges";
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
  { value: "24", label: "24 meses" },
];

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
  wiizePay,
}: RegisterSaleDialogProps) {
  const { createSale, updateSale, uploadAttachment } = useSales();
  const { members } = useAccountMembers();
  const [submitting, setSubmitting] = useState(false);
  const compact = embedded && embeddedLayout !== "page";
  const isEdit = !!sale;
  const wiizePayActive = !isEdit && !!wiizePay?.connected && !!wiizePay.can_charge;
  const { create: createCharge } = useWiizePayChargeMutations(leadId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saleType, setSaleType] = useState<SaleType>("recurring");
  const [value, setValue] = useState<string>("");
  const [months, setMonths] = useState<string>("12");
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

  const handleSubmit = async () => {
    if (!title.trim()) return toast.error("Informe um título para a venda");
    const numValue = Number(value.replace(/\./g, "").replace(",", "."));
    if (!numValue || numValue <= 0) return toast.error("Informe um valor válido");
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
        lead_id: leadId!,
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
            onCreated?.({ id: newSaleId });
            return;
          }
          toast.success("Venda e cobrança registradas com sucesso!");
        } catch (chargeFailure) {
          const message = (chargeFailure as Error).message || "Não foi possível criar a cobrança.";
          setChargeError(message);
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


  const formBody = (
    <>
      <div className={cn(compact ? "space-y-2.5 py-1" : "space-y-4 py-2")}>
        <div className="space-y-1.5">
          <Label htmlFor="sale-title" className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-primary" /> Título da venda *
          </Label>
          <Input
            id="sale-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Plano Growth Anual - João da Silva"
            maxLength={120}
            className={cn(compact && "h-8 text-xs")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sale-desc" className="flex items-center gap-1.5">
            <AlignLeft className="w-3.5 h-3.5 text-primary" /> Descrição (opcional)
          </Label>
          <Textarea
            id="sale-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalhes do acordo, escopo, condições especiais..."
            rows={compact ? 2 : 3}
            maxLength={500}
            className={cn(compact && "min-h-16 text-xs")}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <Repeat className="w-3.5 h-3.5 text-primary" /> Tipo de venda *
          </Label>
          <ToggleGroup
            type="single"
            value={saleType}
            onValueChange={(v) => {
              if (!v) return;
              setSaleType(v as SaleType);
              if (wiizePayActive) setBillingType(v === "recurring" ? "recurring" : "one_time");
            }}
            className={cn(
              "inline-flex justify-start rounded-full border border-border bg-muted/40 p-1 shadow-inner shadow-background/40",
              compact && "grid w-full grid-cols-2 gap-1"
            )}
          >
            <ToggleGroupItem
              value="recurring"
              className={cn(
                "h-8 rounded-full px-4 text-sm text-muted-foreground hover:bg-background/70 hover:text-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm",
                compact && "w-full px-2 text-[11px]"
              )}
            >
              Recorrente
            </ToggleGroupItem>
            <ToggleGroupItem
              value="one_time"
              className={cn(
                "h-8 rounded-full px-4 text-sm text-muted-foreground hover:bg-background/70 hover:text-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm",
                compact && "w-full px-2 text-[11px]"
              )}
            >
              Venda única
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className={cn("grid gap-3", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
          {!wiizePayActive && <div className="space-y-1.5">
            <Label htmlFor="sale-value" className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-primary" />
              {saleType === "recurring" ? "Valor mensal (R$) *" : "Valor total (R$) *"}
            </Label>
            <Input
              id="sale-value"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0,00"
              className={cn(compact && "h-8 text-xs")}
            />
          </div>

          {saleType === "recurring" && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-primary" /> Tempo de contrato *
              </Label>
              <Select value={months} onValueChange={setMonths}>
                <SelectTrigger className={cn(compact && "h-8 text-xs")}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTRACT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className={cn("grid gap-3", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
          <div className="space-y-1.5">
            <Label htmlFor="sale-start" className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" /> Data de início *
            </Label>
            <Input
              id="sale-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={cn(compact && "h-8 text-xs")}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-primary" /> Forma de pagamento
            </Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className={cn(compact && "h-8 text-xs")}><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>}
        </div>

        {wiizePayActive && (
          <section className="space-y-4 border-t border-border pt-4" aria-label="Cobrança Wiize Pay">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-semibold text-foreground">Cobrança Wiize Pay</h4>
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Conectado</span>
                </div>
                <p className="text-xs text-muted-foreground">Cliente, contrato e cobrança serão criados juntos. Os dados do cartão ficam somente no ambiente seguro do Wiize Pay.</p>
              </div>
            </div>

            {paymentLink ? (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2 font-medium text-foreground"><CheckCircle2 className="h-5 w-5 text-primary" /> Venda e cobrança criadas</div>
                <WiizePayLinkShare url={paymentLink.url} expiresAt={paymentLink.expiresAt} title={title} />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {([
                    ["one_time", "À vista", "Uma cobrança", DollarSign],
                    ["installment", "Parcelada", "Valor total dividido", Layers3],
                    ["recurring", "Recorrente", "Cobrança mensal", Repeat],
                  ] as const).map(([key, label, hint, Icon]) => (
                    <Button key={key} type="button" variant={billingType === key ? "default" : "outline"} className="h-auto min-h-16 justify-start gap-2 px-3 py-2 text-left" onClick={() => setBillingType(key)} disabled={!!savedSaleId}>
                      <Icon className="h-4 w-4 shrink-0" />
                      <span><span className="block text-sm font-medium">{label}</span><span className="block text-xs opacity-80">{hint}</span></span>
                    </Button>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="wp-customer-document">CPF ou CNPJ do cliente *</Label>
                    <Input id="wp-customer-document" inputMode="numeric" value={customerDocument} onChange={(event) => setCustomerDocument(formatDocument(event.target.value))} placeholder="00.000.000/0000-00" disabled={!!savedSaleId} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="wp-first-due">Primeiro vencimento *</Label>
                    <Input id="wp-first-due" type="date" min={new Date().toISOString().slice(0, 10)} value={dueDate} onChange={(event) => setDueDate(event.target.value)} disabled={!!savedSaleId} />
                  </div>
                </div>

                {billingType === "installment" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="wp-installments">Quantidade de parcelas *</Label>
                    <Select value={String(installments)} onValueChange={(next) => setInstallments(Number(next))} disabled={!!savedSaleId}>
                      <SelectTrigger id="wp-installments"><SelectValue /></SelectTrigger>
                      <SelectContent>{Array.from({ length: 23 }, (_, index) => index + 2).map((count) => <SelectItem key={count} value={String(count)}>{count}x</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Formas de pagamento *</Label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {([
                      ["pix", "PIX", QrCode],
                      ["boleto", "Boleto", Landmark],
                      ["credit_card", "Crédito", CreditCard],
                    ] as const).map(([key, label, Icon]) => (
                      <label key={key} className={cn("flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3 transition-colors", chargeMethods.includes(key) ? "border-primary bg-primary/5" : "border-border", savedSaleId && "cursor-not-allowed opacity-70")}>
                        <Checkbox checked={chargeMethods.includes(key)} onCheckedChange={() => toggleChargeMethod(key)} disabled={!!savedSaleId} />
                        <Icon className="h-4 w-4 text-primary" /><span className="text-sm font-medium">{label}</span>
                      </label>
                    ))}
                  </div>
                  {billingType !== "one_time" && <p className="text-xs text-muted-foreground">Cobranças parceladas e recorrentes aceitam uma forma de pagamento.</p>}
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                  <p className="text-xs text-muted-foreground">Resumo</p>
                  <p className="font-semibold text-foreground">
                    {billingType === "installment" && Number(value.replace(/\./g, "").replace(",", ".")) > 0
                      ? `${installments}x de ${(Number(value.replace(/\./g, "").replace(",", ".")) / installments).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
                      : billingType === "recurring"
                        ? `${months} cobranças mensais de ${Number(value.replace(/\./g, "").replace(",", ".") || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
                        : `${Number(value.replace(/\./g, "").replace(",", ".") || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} à vista`}
                  </p>
                </div>
                {chargeError && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><strong>A venda já foi salva.</strong> {chargeError} Corrija a conexão, se necessário, e tente criar a cobrança novamente.</div>}
              </>
            )}
          </section>
        )}

        <div className={cn("grid gap-3", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
          <FileSlot
            label="Comprovante"
            icon={<Receipt className="w-3.5 h-3.5 text-primary" />}
            file={receiptFile}
            onChange={setReceiptFile}
            compact={compact}
          />
          <FileSlot
            label="Contrato"
            icon={<FileSignature className="w-3.5 h-3.5 text-primary" />}
            file={contractFile}
            onChange={setContractFile}
            compact={compact}
          />
        </div>

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
      <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={submitting} className={cn(compact && "h-8 px-2 text-xs")}>
        {savedSaleId ? "Fechar" : "Cancelar"}
      </Button>
      {!paymentLink && <Button size="sm" onClick={handleSubmit} disabled={submitting} className={cn(compact && "h-8 px-2 text-xs")}>
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
