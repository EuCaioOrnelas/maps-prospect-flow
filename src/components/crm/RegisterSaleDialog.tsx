import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Upload, FileText, Trash2, Loader2, Tag, AlignLeft, Repeat, DollarSign, CalendarClock, Calendar, CreditCard, Receipt, FileSignature } from "lucide-react";
import { useSales, PAYMENT_METHODS, type SaleType } from "@/hooks/useSales";
import { cn } from "@/lib/utils";
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
  embedded?: boolean;
  embeddedLayout?: "compact" | "page";
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
}: RegisterSaleDialogProps) {
  const { createSale, uploadAttachment } = useSales();
  const [submitting, setSubmitting] = useState(false);
  const compact = embedded && embeddedLayout !== "page";

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
  }, [open, initialValue, initialTitle, initialDescription, leadName, leadId]);

  const handleSubmit = async () => {
    if (!title.trim()) return toast.error("Informe um título para a venda");
    const numValue = Number(value.replace(/\./g, "").replace(",", "."));
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
            onValueChange={(v) => v && setSaleType(v as SaleType)}
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
          </div>
        </div>

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
      </div>
    </>
  );

  const footer = (
    <div className={cn("flex justify-end gap-2 pt-2 border-t border-border/60", embedded && "shrink-0")}> 
      <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={submitting} className={cn(compact && "h-8 px-2 text-xs")}>
        Cancelar
      </Button>
      <Button size="sm" onClick={handleSubmit} disabled={submitting} className={cn(compact && "h-8 px-2 text-xs")}>
        {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Registrar venda
      </Button>
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
