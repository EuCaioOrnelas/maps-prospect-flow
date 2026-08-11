import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { PAYMENT_METHODS, useSales, type Sale } from "@/hooks/useSales";

interface Props {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRenewed?: () => void;
}

const fmtMoney = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const nextDay = (iso?: string | null) => {
  const base = iso ? new Date(`${iso}T00:00:00`) : new Date();
  base.setDate(base.getDate() + 1);
  return base.toISOString().slice(0, 10);
};

export const RenewSaleDialog = ({ sale, open, onOpenChange, onRenewed }: Props) => {
  const { renewSale } = useSales();
  const [value, setValue] = useState("");
  const [months, setMonths] = useState("12");
  const [startDate, setStartDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!sale || !open) return;
    setValue(String(sale.value ?? ""));
    setMonths(String(sale.contract_months || 12));
    setStartDate(nextDay(sale.expiration_date));
    setPaymentMethod(sale.payment_method || "");
    setNotes("");
  }, [sale, open]);

  const parsedValue = Number(String(value).replace(",", ".")) || 0;
  const parsedMonths = Number(months) || 1;

  const newExpiration = useMemo(() => {
    if (!startDate) return "—";
    const d = new Date(`${startDate}T00:00:00`);
    d.setMonth(d.getMonth() + parsedMonths);
    return d.toLocaleDateString("pt-BR");
  }, [startDate, parsedMonths]);

  const handleRenew = async () => {
    if (!sale) return;
    if (parsedValue <= 0) return toast.error("Informe o valor do novo contrato");
    if (parsedMonths < 1) return toast.error("Informe a duração em meses");
    setSaving(true);
    try {
      await renewSale(sale, {
        value: parsedValue,
        contract_months: parsedMonths,
        start_date: startDate,
        payment_method: paymentMethod || null,
        notes: notes || null,
      });
      toast.success("Contrato renovado com sucesso");
      onOpenChange(false);
      onRenewed?.();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao renovar contrato");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" /> Renovar contrato
          </DialogTitle>
          <DialogDescription>
            Um novo contrato será criado e o contrato atual será marcado como vencido, mantendo o histórico.
          </DialogDescription>
        </DialogHeader>

        {sale && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs space-y-1">
              <p className="font-medium text-foreground">{sale.title || "Contrato"}</p>
              <p className="text-muted-foreground">
                {sale.lead?.company_name || sale.lead?.contact_name || "Cliente"} · atual {fmtMoney(sale.value)} ×{" "}
                {sale.contract_months} {sale.contract_months === 1 ? "mês" : "meses"}
              </p>
              <p className="text-muted-foreground">
                Vencimento atual:{" "}
                {sale.expiration_date ? new Date(`${sale.expiration_date}T00:00:00`).toLocaleDateString("pt-BR") : "—"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Novo valor mensal</Label>
                <Input value={value} onChange={(e) => setValue(e.target.value)} className="h-9" inputMode="decimal" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Duração (meses)</Label>
                <Input
                  type="number"
                  min={1}
                  value={months}
                  onChange={(e) => setMonths(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Início do novo contrato</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Forma de pagamento</Label>
                <Select value={paymentMethod || "none"} onValueChange={(v) => setPaymentMethod(v === "none" ? "" : v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não informado</SelectItem>
                    {PAYMENT_METHODS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Observações da renovação</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarClock className="w-3.5 h-3.5 text-primary" />
              Novo vencimento: <strong className="text-foreground">{newExpiration}</strong> · Total{" "}
              <strong className="text-foreground">{fmtMoney(parsedValue * parsedMonths)}</strong>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleRenew} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
                Renovar contrato
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
