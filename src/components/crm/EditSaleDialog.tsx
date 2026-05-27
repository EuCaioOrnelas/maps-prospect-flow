import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Sale, SaleStatus, SaleType, useSales, PAYMENT_METHODS } from "@/hooks/useSales";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
}

export function EditSaleDialog({ open, onOpenChange, sale }: Props) {
  const { updateSale } = useSales();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [saleType, setSaleType] = useState<SaleType>("one_time");
  const [contractMonths, setContractMonths] = useState("1");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [status, setStatus] = useState<SaleStatus>("active");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open || !sale) return;
    setTitle(sale.title ?? "");
    setDescription(sale.description ?? "");
    setValue(String(sale.value ?? ""));
    setSaleType(sale.sale_type);
    setContractMonths(String(sale.contract_months ?? 1));
    setPaymentMethod(sale.payment_method ?? "");
    setStartDate(sale.start_date ?? "");
    setStatus(sale.status);
    setNotes(sale.notes ?? "");
  }, [open, sale]);

  const handleSave = async () => {
    if (!sale) return;
    const parsedValue = Number(value.replace(",", "."));
    if (!parsedValue || parsedValue <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    setSaving(true);
    try {
      await updateSale(sale.id, {
        title,
        description,
        value: parsedValue,
        sale_type: saleType,
        contract_months: saleType === "recurring" ? Number(contractMonths) || 1 : null,
        payment_method: paymentMethod || null,
        start_date: startDate || undefined,
        notes,
        status,
      });
      toast.success("Venda atualizada");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao atualizar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar venda</DialogTitle>
          <DialogDescription>Atualize as informações da venda</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de venda</Label>
            <ToggleGroup
              type="single"
              value={saleType}
              onValueChange={(v) => v && setSaleType(v as SaleType)}
              className="inline-flex justify-start rounded-full border border-border bg-muted/40 p-1"
            >
              <ToggleGroupItem value="one_time" className="rounded-full px-4 text-sm">Única</ToggleGroupItem>
              <ToggleGroupItem value="recurring" className="rounded-full px-4 text-sm">Recorrente</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
            {saleType === "recurring" && (
              <div className="space-y-1.5">
                <Label>Meses de contrato</Label>
                <Input type="number" min={1} value={contractMonths} onChange={(e) => setContractMonths(e.target.value)} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Data de início</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Forma de pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as SaleStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                  <SelectItem value="renewed">Renovado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Salvar alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
