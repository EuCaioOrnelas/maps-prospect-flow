import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Upload, FileText, Trash2, Loader2, Tag, AlignLeft, Repeat, DollarSign, CalendarClock, Calendar, CreditCard, Receipt, FileSignature } from "lucide-react";
import { useSales, PAYMENT_METHODS, type SaleType } from "@/hooks/useSales";
import { toast } from "sonner";

interface RegisterSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName?: string;
  initialValue?: number;
  initialTitle?: string;
  initialDescription?: string;
  onCreated?: () => void;
  anchorRect?: { top: number; left: number; width: number; height: number };
  cardOverlayMode?: boolean;
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
  anchorRect,
  cardOverlayMode = false,
}: RegisterSaleDialogProps) {
  const { createSale, uploadAttachment } = useSales();
  const [submitting, setSubmitting] = useState(false);
  const [detectedAnchorRect, setDetectedAnchorRect] = useState<typeof anchorRect>();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saleType, setSaleType] = useState<SaleType>("recurring");
  const [value, setValue] = useState<string>("");
  const [months, setMonths] = useState<string>("12");
  const [paymentMethod, setPaymentMethod] = useState<string>("pix");
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
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
      setReceiptFile(null);
      setContractFile(null);
    }
  }, [open, initialValue, initialTitle, initialDescription, leadName]);

  useEffect(() => {
    if (!open || !cardOverlayMode || anchorRect || typeof document === "undefined") return;

    let frameOne = 0;
    let frameTwo = 0;
    const measureLeadCard = () => {
      const cardEl = document.querySelector<HTMLElement>(`[data-lead-id="${leadId}"]`);
      if (!cardEl) return;
      const rect = cardEl.getBoundingClientRect();
      setDetectedAnchorRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    };

    frameOne = requestAnimationFrame(() => {
      measureLeadCard();
      frameTwo = requestAnimationFrame(measureLeadCard);
    });

    return () => {
      cancelAnimationFrame(frameOne);
      cancelAnimationFrame(frameTwo);
    };
  }, [open, cardOverlayMode, anchorRect, leadId]);

  const handleSubmit = async () => {
    if (!title.trim()) return toast.error("Informe um título para a venda");
    const numValue = Number(value.replace(",", "."));
    if (!numValue || numValue <= 0) return toast.error("Informe um valor válido");

    setSubmitting(true);
    try {
      const sale = await createSale({
        lead_id: leadId,
        title: title.trim(),
        description: description.trim() || undefined,
        value: numValue,
        sale_type: saleType,
        contract_months: saleType === "recurring" ? Number(months) : 1,
        payment_method: paymentMethod,
        start_date: startDate,
      });

      // Uploads em paralelo
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

      toast.success("Venda registrada com sucesso!");
      onCreated?.();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao registrar venda");
    } finally {
      setSubmitting(false);
    }
  };

  const formBody = (
    <>
      <div className="space-y-4 py-2">
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
            rows={3}
            maxLength={500}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <Repeat className="w-3.5 h-3.5 text-primary" /> Tipo de venda *
          </Label>
          <ToggleGroup
            type="single"
            value={saleType}
            onValueChange={(v) => v && setSaleType(v as SaleType)}
            className="justify-start"
          >
            <ToggleGroupItem value="recurring" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              Recorrente (mensalidade)
            </ToggleGroupItem>
            <ToggleGroupItem value="one_time" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              Venda única
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
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
            />
          </div>

          {saleType === "recurring" && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-primary" /> Tempo de contrato *
              </Label>
              <Select value={months} onValueChange={setMonths}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTRACT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="sale-start" className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" /> Data de início *
            </Label>
            <Input
              id="sale-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-primary" /> Forma de pagamento
            </Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FileSlot
            label="Comprovante"
            icon={<Receipt className="w-3.5 h-3.5 text-primary" />}
            file={receiptFile}
            onChange={setReceiptFile}
          />
          <FileSlot
            label="Contrato"
            icon={<FileSignature className="w-3.5 h-3.5 text-primary" />}
            file={contractFile}
            onChange={setContractFile}
          />
        </div>
      </div>
    </>
  );

  const footer = (
    <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
      <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={submitting}>
        Cancelar
      </Button>
      <Button size="sm" onClick={handleSubmit} disabled={submitting}>
        {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Registrar venda
      </Button>
    </div>
  );

  const activeAnchorRect = anchorRect ?? (cardOverlayMode ? detectedAnchorRect : undefined);

  if (cardOverlayMode && open && typeof document !== "undefined" && !activeAnchorRect) {
    return null;
  }

  // Inline overlay mode: replaces the lead card visually
  if (activeAnchorRect && open && typeof document !== "undefined") {
    const width = activeAnchorRect.width;
    const height = activeAnchorRect.height;
    const left = activeAnchorRect.left;
    const top = activeAnchorRect.top;

    return createPortal(
      <div
        className="fixed inset-0 z-[70]"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !submitting) onOpenChange(false);
        }}
      >
        <div
          role="dialog"
          aria-label="Registrar venda"
          className="fixed bg-card border border-primary/40 rounded-[18px] shadow-lg overflow-hidden flex flex-col animate-in fade-in-0 duration-100"
          style={{
            left: `${left}px`,
            top: `${top}px`,
            width: `${width}px`,
            height: `${height}px`,
            maxHeight: `${height}px`,
          }}
        >
          <div className="px-3.5 pt-3 pb-2 border-b border-border/60 shrink-0">
            <h3 className="text-sm font-semibold text-foreground">Registrar venda</h3>
            <p className="text-xs text-muted-foreground truncate">
              {leadName ? `Venda fechada com ${leadName}` : "Detalhes da venda fechada"}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3.5">{formBody}</div>
          <div className="px-3.5 pb-3 shrink-0">{footer}</div>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-card p-4">
        <DialogHeader>
          <DialogTitle>Registrar venda</DialogTitle>
          <DialogDescription>
            {leadName ? `Cadastre a venda fechada com ${leadName}` : "Cadastre os detalhes da venda fechada"}
          </DialogDescription>
        </DialogHeader>
        {formBody}
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FileSlot({ label, icon, file, onChange }: { label: string; icon?: React.ReactNode; file: File | null; onChange: (f: File | null) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5">{icon}{label} (opcional)</Label>
      {file ? (
        <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm bg-muted/30">
          <FileText className="w-4 h-4 text-primary shrink-0" />
          <span className="truncate flex-1" title={file.name}>{file.name}</span>
          <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => onChange(null)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors">
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
