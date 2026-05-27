import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Upload, FileText, Trash2, Loader2 } from "lucide-react";
import { useSales, PAYMENT_METHODS, type SaleType } from "@/hooks/useSales";
import { toast } from "sonner";

interface RegisterSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName?: string;
  onCreated?: () => void;
}

const CONTRACT_OPTIONS = [
  { value: "1", label: "1 mês" },
  { value: "3", label: "3 meses" },
  { value: "6", label: "6 meses" },
  { value: "12", label: "12 meses" },
  { value: "24", label: "24 meses" },
];

export function RegisterSaleDialog({ open, onOpenChange, leadId, leadName, onCreated }: RegisterSaleDialogProps) {
  const { createSale, uploadAttachment } = useSales();
  const [submitting, setSubmitting] = useState(false);

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
      setTitle("");
      setDescription("");
      setSaleType("recurring");
      setValue("");
      setMonths("12");
      setPaymentMethod("pix");
      setStartDate(new Date().toISOString().slice(0, 10));
      setReceiptFile(null);
      setContractFile(null);
    }
  }, [open]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle>Registrar venda</DialogTitle>
          <DialogDescription>
            {leadName ? `Cadastre a venda fechada com ${leadName}` : "Cadastre os detalhes da venda fechada"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="sale-title">Título da venda *</Label>
            <Input
              id="sale-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Plano Growth Anual - João da Silva"
              maxLength={120}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sale-desc">Descrição (opcional)</Label>
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
            <Label>Tipo de venda *</Label>
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
              <Label htmlFor="sale-value">
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
                <Label>Tempo de contrato *</Label>
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
              <Label htmlFor="sale-start">Data de início *</Label>
              <Input
                id="sale-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Forma de pagamento</Label>
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
              file={receiptFile}
              onChange={setReceiptFile}
            />
            <FileSlot
              label="Contrato"
              file={contractFile}
              onChange={setContractFile}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Pular por ora
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Registrar venda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FileSlot({ label, file, onChange }: { label: string; file: File | null; onChange: (f: File | null) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label} (opcional)</Label>
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
