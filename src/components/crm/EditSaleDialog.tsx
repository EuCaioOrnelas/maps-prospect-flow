import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Sale, SaleStatus, SaleType, useSales, PAYMENT_METHODS } from "@/hooks/useSales";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import { toast } from "sonner";
import {
  Loader2,
  Tag,
  AlignLeft,
  Repeat,
  DollarSign,
  CalendarClock,
  Calendar,
  CreditCard,
  Activity,
  StickyNote,
  User as UserIcon,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
  /** Só o próprio responsável (ou owner/admin) pode trocar o responsável da venda. */
  canChangeResponsible?: boolean;
}

export function EditSaleDialog({ open, onOpenChange, sale, canChangeResponsible = true }: Props) {
  const { updateSale } = useSales();
  const { members } = useAccountMembers();

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
  const [responsibleUserId, setResponsibleUserId] = useState<string>("");

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
    setResponsibleUserId(sale.responsible_user_id ?? "");
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
        ...(canChangeResponsible ? { responsible_user_id: responsibleUserId || null } : {}),
      });

      toast.success("Venda atualizada");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao atualizar");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "pl-9 h-9";
  const iconCls =
    "absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary pointer-events-none";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar venda</DialogTitle>
          <DialogDescription>Atualize as informações da venda</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <Tag className="w-3.5 h-3.5 text-primary" /> Título
            </Label>
            <div className="relative">
              <Tag className={iconCls} />
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <AlignLeft className="w-3.5 h-3.5 text-primary" /> Descrição
            </Label>
            <div className="relative">
              <AlignLeft className={iconCls} style={{ top: "0.9rem", transform: "none" }} />
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <Repeat className="w-3.5 h-3.5 text-primary" /> Tipo de venda
            </Label>
            <ToggleGroup
              type="single"
              value={saleType}
              onValueChange={(v) => v && setSaleType(v as SaleType)}
              className="inline-flex justify-start gap-1 rounded-full border border-border bg-muted/40 p-0.5"
            >
              <ToggleGroupItem
                value="one_time"
                className="h-7 rounded-full px-3 text-xs text-muted-foreground hover:text-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
              >
                Única
              </ToggleGroupItem>
              <ToggleGroupItem
                value="recurring"
                className="h-7 rounded-full px-3 text-xs text-muted-foreground hover:text-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
              >
                Recorrente
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <DollarSign className="w-3.5 h-3.5 text-primary" /> Valor (R$)
              </Label>
              <div className="relative">
                <DollarSign className={iconCls} />
                <Input value={value} onChange={(e) => setValue(e.target.value)} className={inputCls} />
              </div>
            </div>
            {saleType === "recurring" && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs">
                  <CalendarClock className="w-3.5 h-3.5 text-primary" /> Meses de contrato
                </Label>
                <div className="relative">
                  <CalendarClock className={iconCls} />
                  <Input
                    type="number"
                    min={1}
                    value={contractMonths}
                    onChange={(e) => setContractMonths(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <Calendar className="w-3.5 h-3.5 text-primary" /> Data de início
              </Label>
              <div className="relative">
                <Calendar className={iconCls} />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <CreditCard className="w-3.5 h-3.5 text-primary" /> Forma de pagamento
              </Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-9">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-primary" />
                    <SelectValue placeholder="Selecione" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <UserIcon className="w-3.5 h-3.5 text-primary" /> Responsável pela venda
              </Label>
              <Select
                value={responsibleUserId || "none"}
                onValueChange={(v) => setResponsibleUserId(v === "none" ? "" : v)}
                disabled={!canChangeResponsible}
              >
                <SelectTrigger className="h-9">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-3.5 h-3.5 text-primary" />
                    <SelectValue placeholder="Selecione" />
                  </div>
                </SelectTrigger>
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
              <Label className="flex items-center gap-1.5 text-xs">
                <Activity className="w-3.5 h-3.5 text-primary" /> Status
              </Label>
              <Select value={status} onValueChange={(v) => setStatus(v as SaleStatus)}>
                <SelectTrigger className="h-9">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-primary" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
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
            <Label className="flex items-center gap-1.5 text-xs">
              <StickyNote className="w-3.5 h-3.5 text-primary" /> Notas
            </Label>
            <div className="relative">
              <StickyNote className={iconCls} style={{ top: "0.9rem", transform: "none" }} />
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="pl-9" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Salvar alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
