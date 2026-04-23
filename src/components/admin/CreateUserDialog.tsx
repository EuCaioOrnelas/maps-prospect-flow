import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Loader2, Eye, EyeOff, ChevronLeft, ChevronRight } from "lucide-react";
import { PLAN_DEFAULTS, PAYMENT_METHODS, SUBSCRIPTION_LABELS, formatCents, parseCurrencyToCents } from "./customSubscription/customSubConfig";
import { FileUploadField } from "./customSubscription/FileUploadField";

interface Props { onUserCreated?: () => void; }

const STEPS = ["Dados", "Plano & Limites", "Pagamento & Período", "Anexos & Confirmação"] as const;

export const CreateUserDialog = ({ onUserCreated }: Props) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "", cpf: "", address: "", postal_code: "",
    plan: "scale" as "free" | "start" | "growth" | "scale",
    subscription_label: "",
    searches_limit: PLAN_DEFAULTS.scale.searches_limit,
    whatsapp_numbers_limit: PLAN_DEFAULTS.scale.whatsapp_numbers_limit,
    monthly_value_input: (PLAN_DEFAULTS.scale.monthly_value_cents / 100).toFixed(2).replace(".", ","),
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

  const onPlanChange = (plan: typeof form.plan) => {
    const def = PLAN_DEFAULTS[plan];
    set({
      plan,
      searches_limit: def.searches_limit,
      whatsapp_numbers_limit: def.whatsapp_numbers_limit,
      monthly_value_input: (def.monthly_value_cents / 100).toFixed(2).replace(".", ","),
    });
  };

  const monthlyCents = parseCurrencyToCents(form.monthly_value_input);
  const totalCents = form.total_value_input
    ? parseCurrencyToCents(form.total_value_input)
    : form.is_lifetime ? monthlyCents : monthlyCents * (form.contract_months || 1);

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$";
    let pwd = ""; for (let i = 0; i < 14; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    set({ password: pwd }); setShowPwd(true);
  };

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!form.name.trim()) return "Nome é obrigatório";
      if (!form.email.trim()) return "Email é obrigatório";
      if (form.password.length < 8) return "Senha precisa de pelo menos 8 caracteres";
    }
    if (step === 1) {
      if (form.searches_limit < 1) return "Limite de buscas inválido";
      if (form.whatsapp_numbers_limit < 1) return "Limite de números inválido";
    }
    if (step === 2) {
      if (!form.is_lifetime && (!form.contract_months || form.contract_months < 1)) return "Período do contrato inválido";
      if (form.payment_method !== "free" && monthlyCents <= 0) return "Valor mensal precisa ser > 0 para pagamento não gratuito";
    }
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) { toast({ title: "Verifique os dados", description: err, variant: "destructive" }); return; }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const submit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: form.email.trim().toLowerCase(),
          password: form.password,
          name: form.name.trim(),
          phone: form.phone || undefined,
          cpf: form.cpf || undefined,
          address: form.address || undefined,
          postal_code: form.postal_code || undefined,
          plan: form.plan,
          subscription_label: form.subscription_label || undefined,
          searches_limit: form.searches_limit,
          whatsapp_numbers_limit: form.whatsapp_numbers_limit,
          monthly_value_cents: monthlyCents,
          total_value_cents: totalCents,
          payment_method: form.payment_method,
          payment_notes: form.payment_notes || undefined,
          is_lifetime: form.is_lifetime,
          contract_months: form.is_lifetime ? undefined : form.contract_months,
          starts_at: new Date(form.starts_at).toISOString(),
          contract_file_url: form.contract_file_url || undefined,
          contract_file_name: form.contract_file_name || undefined,
          receipt_file_url: form.receipt_file_url || undefined,
          receipt_file_name: form.receipt_file_name || undefined,
          notes: form.notes || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Usuário criado!",
        description: `${form.email} criado no plano ${form.plan}. Senha: ${form.password}`,
      });
      try { await navigator.clipboard.writeText(form.password); } catch {}

      setOpen(false); setStep(0);
      onUserCreated?.();
    } catch (e) {
      toast({
        title: "Erro ao criar usuário",
        description: e instanceof Error ? e.message : "Falha desconhecida",
        variant: "destructive",
      });
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setStep(0); }}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-2">
          <UserPlus size={16} /> Criar Usuário
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Usuário Customizado</DialogTitle>
          <DialogDescription>
            Etapa {step + 1} de {STEPS.length} — {STEPS[step]}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 mb-4">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => set({ name: e.target.value })} /></div>
              <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} /></div>
            </div>
            <div>
              <div className="flex items-center justify-between"><Label>Senha *</Label>
                <Button type="button" variant="ghost" size="sm" className="text-xs h-6" onClick={generatePassword}>Gerar</Button>
              </div>
              <div className="relative">
                <Input type={showPwd ? "text" : "password"} value={form.password} onChange={(e) => set({ password: e.target.value })} className="pr-10" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} /></div>
              <div><Label>CPF / CNPJ</Label><Input value={form.cpf} onChange={(e) => set({ cpf: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div><Label>Endereço</Label><Input value={form.address} onChange={(e) => set({ address: e.target.value })} /></div>
              <div className="w-32"><Label>CEP</Label><Input value={form.postal_code} onChange={(e) => set({ postal_code: e.target.value })} /></div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Plano base</Label>
                <Select value={form.plan} onValueChange={(v) => onPlanChange(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free / Cortesia</SelectItem>
                    <SelectItem value="start">Start</SelectItem>
                    <SelectItem value="growth">Growth</SelectItem>
                    <SelectItem value="scale">Scale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Etiqueta (opcional)</Label>
                <Select value={form.subscription_label} onValueChange={(v) => set({ subscription_label: v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    {SUBSCRIPTION_LABELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Limite de buscas/oportunidades</Label>
                <Input type="number" min={1} value={form.searches_limit} onChange={(e) => set({ searches_limit: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Limite de números WhatsApp</Label>
                <Input type="number" min={1} value={form.whatsapp_numbers_limit} onChange={(e) => set({ whatsapp_numbers_limit: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Forma de pagamento</Label>
                <Select value={form.payment_method} onValueChange={(v) => set({ payment_method: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Início</Label>
                <Input type="date" value={form.starts_at} onChange={(e) => set({ starts_at: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-[var(--radius-input)] bg-muted/30">
              <div>
                <Label className="cursor-pointer">Acesso vitalício</Label>
                <p className="text-xs text-muted-foreground">Sem data de expiração</p>
              </div>
              <Switch checked={form.is_lifetime} onCheckedChange={(v) => set({ is_lifetime: v })} />
            </div>

            {!form.is_lifetime && (
              <div>
                <Label>Período do contrato (meses)</Label>
                <Input type="number" min={1} value={form.contract_months} onChange={(e) => set({ contract_months: parseInt(e.target.value) || 1 })} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor mensal (entra no MRR)</Label>
                <Input value={form.monthly_value_input} onChange={(e) => set({ monthly_value_input: e.target.value })} placeholder="0,00" />
                <p className="text-xs text-muted-foreground mt-1">{formatCents(monthlyCents)}/mês</p>
              </div>
              <div>
                <Label>Valor total {form.is_lifetime ? "(opcional)" : "(auto)"}</Label>
                <Input value={form.total_value_input} onChange={(e) => set({ total_value_input: e.target.value })} placeholder={(totalCents / 100).toFixed(2).replace(".", ",")} />
                <p className="text-xs text-muted-foreground mt-1">Total: {formatCents(totalCents)}</p>
              </div>
            </div>

            <div>
              <Label>Notas de pagamento</Label>
              <Textarea rows={2} value={form.payment_notes} onChange={(e) => set({ payment_notes: e.target.value })} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <FileUploadField label="Comprovante de pagamento" fileUrl={form.receipt_file_url || undefined} fileName={form.receipt_file_name || undefined} onChange={(url, name) => set({ receipt_file_url: url, receipt_file_name: name })} />
              <FileUploadField label="Contrato assinado" fileUrl={form.contract_file_url || undefined} fileName={form.contract_file_name || undefined} onChange={(url, name) => set({ contract_file_url: url, contract_file_name: name })} />
            </div>
            <div>
              <Label>Notas internas</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
            </div>

            <div className="rounded-[var(--radius-input)] border border-border bg-muted/30 p-3 text-xs space-y-1">
              <div className="font-semibold mb-1">Resumo</div>
              <div className="flex justify-between"><span className="text-muted-foreground">Plano:</span> <span>{form.plan} {form.subscription_label && `(${form.subscription_label})`}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Limites:</span> <span>{form.searches_limit} buscas / {form.whatsapp_numbers_limit} números</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Período:</span> <span>{form.is_lifetime ? "Vitalício" : `${form.contract_months} meses`}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">MRR:</span> <span>{formatCents(monthlyCents)}/mês</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total contrato:</span> <span>{formatCents(totalCents)}</span></div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" disabled={step === 0 || loading} onClick={() => setStep(step - 1)}>
            <ChevronLeft size={14} /> Voltar
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={next}>Avançar <ChevronRight size={14} /></Button>
          ) : (
            <Button type="button" onClick={submit} disabled={loading}>
              {loading ? <><Loader2 size={14} className="animate-spin mr-2" /> Criando...</> : "Criar Usuário"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
