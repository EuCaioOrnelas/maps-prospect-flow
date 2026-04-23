import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw } from "lucide-react";
import { PLAN_DEFAULTS, PAYMENT_METHODS, SUBSCRIPTION_LABELS, parseCurrencyToCents, formatCents } from "./customSubConfig";
import { FileUploadField } from "./FileUploadField";

interface Props {
  userId: string;
  previousSubscription: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRenewed?: () => void;
}

export const RenewSubscriptionDialog = ({ userId, previousSubscription, open, onOpenChange, onRenewed }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    plan: "scale" as "free" | "start" | "growth" | "scale",
    subscription_label: "",
    searches_limit: PLAN_DEFAULTS.scale.searches_limit,
    whatsapp_numbers_limit: PLAN_DEFAULTS.scale.whatsapp_numbers_limit,
    monthly_value_input: "",
    total_value_input: "",
    payment_method: "pix" as typeof PAYMENT_METHODS[number]["value"],
    payment_notes: "",
    is_lifetime: false,
    contract_months: 12,
    starts_at: new Date().toISOString().slice(0, 10),
    contract_file_url: null as string | null,
    contract_file_name: null as string | null,
    receipt_file_url: null as string | null,
    receipt_file_name: null as string | null,
    notes: "",
  });

  const set = (patch: Partial<typeof form>) => setForm((p) => ({ ...p, ...patch }));

  // Pré-popula com base no contrato anterior
  useEffect(() => {
    if (open && previousSubscription) {
      setForm((p) => ({
        ...p,
        plan: previousSubscription.plan || "scale",
        subscription_label: previousSubscription.subscription_label || "",
        searches_limit: previousSubscription.searches_limit || PLAN_DEFAULTS.scale.searches_limit,
        whatsapp_numbers_limit: previousSubscription.whatsapp_numbers_limit || PLAN_DEFAULTS.scale.whatsapp_numbers_limit,
        monthly_value_input: ((previousSubscription.monthly_value_cents || 0) / 100).toFixed(2).replace(".", ","),
        contract_months: previousSubscription.contract_months || 12,
        is_lifetime: previousSubscription.is_lifetime || false,
        payment_method: previousSubscription.payment_method || "pix",
      }));
    }
  }, [open, previousSubscription]);

  const monthlyCents = parseCurrencyToCents(form.monthly_value_input);
  const totalCents = form.total_value_input
    ? parseCurrencyToCents(form.total_value_input)
    : (form.is_lifetime ? monthlyCents : monthlyCents * (form.contract_months || 1));

  const onPlanChange = (plan: typeof form.plan) => {
    const def = PLAN_DEFAULTS[plan];
    set({
      plan,
      searches_limit: def.searches_limit,
      whatsapp_numbers_limit: def.whatsapp_numbers_limit,
      monthly_value_input: (def.monthly_value_cents / 100).toFixed(2).replace(".", ","),
    });
  };

  const handleRenew = async () => {
    if (monthlyCents <= 0 && form.payment_method !== "free") {
      toast({ title: "Valor mensal obrigatório", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-renew-custom-subscription", {
        body: {
          user_id: userId,
          previous_subscription_id: previousSubscription.id,
          plan: form.plan,
          subscription_label: form.subscription_label || null,
          searches_limit: form.searches_limit,
          whatsapp_numbers_limit: form.whatsapp_numbers_limit,
          monthly_value_cents: monthlyCents,
          total_value_cents: totalCents,
          payment_method: form.payment_method,
          payment_notes: form.payment_notes || null,
          is_lifetime: form.is_lifetime,
          contract_months: form.is_lifetime ? null : form.contract_months,
          starts_at: form.starts_at,
          contract_file_url: form.contract_file_url,
          contract_file_name: form.contract_file_name,
          receipt_file_url: form.receipt_file_url,
          receipt_file_name: form.receipt_file_name,
          notes: form.notes || null,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast({ title: "Contrato renovado com sucesso!" });
      onOpenChange(false);
      onRenewed?.();
    } catch (e: any) {
      toast({ title: "Erro ao renovar", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Renovar Contrato Customizado
          </DialogTitle>
          <DialogDescription>
            Cria um novo contrato e arquiva o anterior como renovado. O usuário será desbloqueado automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Plan */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Plano</Label>
              <Select value={form.plan} onValueChange={(v: any) => onPlanChange(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="start">Start</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="scale">Scale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Rótulo (opcional)</Label>
              <Select value={form.subscription_label} onValueChange={(v) => set({ subscription_label: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {SUBSCRIPTION_LABELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Limits */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Limite de buscas</Label>
              <Input type="number" value={form.searches_limit} onChange={(e) => set({ searches_limit: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Limite de números WhatsApp</Label>
              <Input type="number" value={form.whatsapp_numbers_limit} onChange={(e) => set({ whatsapp_numbers_limit: parseInt(e.target.value) || 0 })} />
            </div>
          </div>

          {/* Payment */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Forma de pagamento</Label>
              <Select value={form.payment_method} onValueChange={(v: any) => set({ payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Valor mensal (R$)</Label>
              <Input value={form.monthly_value_input} onChange={(e) => set({ monthly_value_input: e.target.value })} placeholder="0,00" />
            </div>
          </div>

          {/* Period */}
          <div className="flex items-center justify-between p-3 rounded-[var(--radius-input)] border border-border bg-muted/20">
            <div>
              <Label className="text-sm">Vitalício</Label>
              <p className="text-xs text-muted-foreground">Sem data de expiração</p>
            </div>
            <Switch checked={form.is_lifetime} onCheckedChange={(v) => set({ is_lifetime: v })} />
          </div>

          {!form.is_lifetime && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Início</Label>
                <Input type="date" value={form.starts_at} onChange={(e) => set({ starts_at: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Duração (meses)</Label>
                <Input type="number" value={form.contract_months} onChange={(e) => set({ contract_months: parseInt(e.target.value) || 1 })} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Valor total (R$) — opcional</Label>
              <Input value={form.total_value_input} onChange={(e) => set({ total_value_input: e.target.value })} placeholder={formatCents(totalCents)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notas do pagamento</Label>
              <Input value={form.payment_notes} onChange={(e) => set({ payment_notes: e.target.value })} placeholder="Ex: PIX João" />
            </div>
          </div>

          {/* Files */}
          <div className="grid grid-cols-2 gap-3">
            <FileUploadField label="Contrato (PDF)" fileUrl={form.contract_file_url || undefined} fileName={form.contract_file_name || undefined} onChange={(url, name) => set({ contract_file_url: url, contract_file_name: name })} />
            <FileUploadField label="Comprovante de pagamento" fileUrl={form.receipt_file_url || undefined} fileName={form.receipt_file_name || undefined} onChange={(url, name) => set({ receipt_file_url: url, receipt_file_name: name })} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Observações da renovação</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Notas internas..." />
          </div>

          <div className="p-3 rounded-[var(--radius-input)] bg-primary/5 border border-primary/20 text-xs space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">MRR a adicionar:</span><span className="font-bold">{formatCents(monthlyCents)}/mês</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total do contrato:</span><span className="font-bold">{formatCents(totalCents)}</span></div>
            {!form.is_lifetime && <div className="flex justify-between"><span className="text-muted-foreground">Expira em:</span><span className="font-medium">{new Date(new Date(form.starts_at).getTime() + form.contract_months * 30 * 86400000).toLocaleDateString("pt-BR")}</span></div>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleRenew} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Confirmar Renovação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
