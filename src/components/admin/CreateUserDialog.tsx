import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  UserPlus, Loader2, Eye, EyeOff, ChevronLeft, ChevronRight,
  User, Mail, Lock, Phone, FileText as FileTextIcon, MapPin,
  Sparkles, Search, MessageSquare, Tag,
  CreditCard, Calendar, Infinity as InfinityIcon, DollarSign, Wallet,
  Paperclip, FileCheck, NotebookPen, CheckCircle2, ShieldCheck, Wand2,
} from "lucide-react";
import { PLAN_DEFAULTS, PAYMENT_METHODS, SUBSCRIPTION_LABELS, formatCents, parseCurrencyToCents } from "./customSubscription/customSubConfig";
import { FileUploadField } from "./customSubscription/FileUploadField";

interface Props { onUserCreated?: () => void; }

const STEPS = [
  { label: "Dados", icon: User, hint: "Identidade e acesso" },
  { label: "Plano & Limites", icon: Sparkles, hint: "Funcionalidades liberadas" },
  { label: "Pagamento & Período", icon: CreditCard, hint: "Receita e contrato" },
  { label: "Anexos & Confirmação", icon: ShieldCheck, hint: "Comprovantes e revisão" },
] as const;

const PLAN_OPTIONS = [
  { value: "free", label: "Free", desc: "Cortesia / Teste", color: "text-muted-foreground" },
  { value: "start", label: "Start", desc: "Plano inicial", color: "text-blue-500" },
  { value: "growth", label: "Growth", desc: "Plano intermediário", color: "text-violet-500" },
  { value: "scale", label: "Enterprise", desc: "Plano enterprise customizado", color: "text-amber-500" },
] as const;

import { FEATURE_CATALOG, type FeatureKey } from "@/lib/featurePermissions";

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
    feature_permissions: null as FeatureKey[] | null, // null = full access
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

  const reset = () => {
    setStep(0);
    setForm({
      name: "", email: "", password: "", phone: "", cpf: "", address: "", postal_code: "",
      plan: "scale", subscription_label: "",
      searches_limit: PLAN_DEFAULTS.scale.searches_limit,
      whatsapp_numbers_limit: PLAN_DEFAULTS.scale.whatsapp_numbers_limit,
      monthly_value_input: (PLAN_DEFAULTS.scale.monthly_value_cents / 100).toFixed(2).replace(".", ","),
      total_value_input: "",
      payment_method: "pix", payment_notes: "",
      is_lifetime: false, contract_months: 12,
      starts_at: new Date().toISOString().slice(0, 10),
      contract_file_url: null, contract_file_name: null,
      receipt_file_url: null, receipt_file_name: null, notes: "",
      feature_permissions: null,
    });
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
        title: "✅ Usuário criado com sucesso",
        description: `${form.email} • plano ${form.plan} • senha copiada para área de transferência`,
      });
      try { await navigator.clipboard.writeText(form.password); } catch {}

      setOpen(false); reset();
      onUserCreated?.();
    } catch (e) {
      toast({
        title: "Erro ao criar usuário",
        description: e instanceof Error ? e.message : "Falha desconhecida",
        variant: "destructive",
      });
    } finally { setLoading(false); }
  };

  const StepIcon = STEPS[step].icon;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-2">
          <UserPlus size={16} /> Criar Usuário
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[720px] max-h-[92vh] overflow-y-auto p-0 gap-0">
        {/* Header com gradiente */}
        <div className="relative px-6 pt-6 pb-5 border-b border-border bg-gradient-to-br from-primary/5 via-card to-card">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary ring-1 ring-primary/20">
              <StepIcon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
                Criar Usuário Customizado
                <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                  Admin
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {STEPS[step].label} — {STEPS[step].hint}
              </p>
            </div>
          </div>

          {/* Stepper */}
          <div className="grid grid-cols-4 gap-2 mt-5">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = i === step;
              const done = i < step;
              return (
                <div key={s.label} className="flex flex-col items-start gap-1.5">
                  <div className="flex items-center gap-1.5 w-full">
                    <div className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 transition-colors",
                      done && "bg-primary text-primary-foreground",
                      active && "bg-primary/15 text-primary ring-2 ring-primary/30",
                      !active && !done && "bg-muted text-muted-foreground"
                    )}>
                      {done ? <CheckCircle2 size={12} /> : <Icon size={12} />}
                    </div>
                    <div className={cn(
                      "h-1 flex-1 rounded-full transition-colors",
                      i <= step ? "bg-primary" : "bg-muted"
                    )} />
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium truncate w-full",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {step === 0 && (
            <div className="space-y-4">
              <SectionTitle icon={User} title="Identidade" />
              <div className="grid grid-cols-2 gap-3">
                <Field icon={User} label="Nome completo *">
                  <Input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ex: João Silva" />
                </Field>
                <Field icon={Mail} label="Email *">
                  <Input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="usuario@empresa.com" />
                </Field>
              </div>

              <Field
                icon={Lock}
                label="Senha de acesso *"
                action={
                  <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[11px] gap-1" onClick={generatePassword}>
                    <Wand2 size={11} /> Gerar
                  </Button>
                }
              >
                <div className="relative">
                  <Input
                    type={showPwd ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => set({ password: e.target.value })}
                    placeholder="Mínimo 8 caracteres"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  >
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </Field>

              <SectionTitle icon={Phone} title="Contato (opcional)" />
              <div className="grid grid-cols-2 gap-3">
                <Field icon={Phone} label="Telefone">
                  <Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="(11) 99999-9999" />
                </Field>
                <Field icon={FileTextIcon} label="CPF / CNPJ">
                  <Input value={form.cpf} onChange={(e) => set({ cpf: e.target.value })} placeholder="000.000.000-00" />
                </Field>
              </div>

              <div className="grid grid-cols-[1fr_140px] gap-3">
                <Field icon={MapPin} label="Endereço">
                  <Input value={form.address} onChange={(e) => set({ address: e.target.value })} placeholder="Rua, número, complemento" />
                </Field>
                <Field icon={MapPin} label="CEP">
                  <Input value={form.postal_code} onChange={(e) => set({ postal_code: e.target.value })} placeholder="00000-000" />
                </Field>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <SectionTitle icon={Sparkles} title="Plano base" />
              <div className="grid grid-cols-4 gap-2">
                {PLAN_OPTIONS.map((p) => {
                  const active = form.plan === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => onPlanChange(p.value)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all",
                        active
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border bg-muted/20 hover:bg-muted/40 hover:border-border/80"
                      )}
                    >
                      <div className={cn("text-sm font-semibold mb-0.5", active ? "text-foreground" : p.color)}>
                        {p.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground leading-tight">{p.desc}</div>
                    </button>
                  );
                })}
              </div>

              <Field icon={Tag} label="Etiqueta interna (opcional)">
                <Select value={form.subscription_label || "none"} onValueChange={(v) => set({ subscription_label: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {SUBSCRIPTION_LABELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>

              <SectionTitle icon={ShieldCheck} title="Limites customizados" />
              <div className="grid grid-cols-2 gap-3">
                <Field icon={Search} label="Buscas / oportunidades por mês">
                  <Input
                    type="number"
                    min={1}
                    value={form.searches_limit}
                    onChange={(e) => set({ searches_limit: parseInt(e.target.value) || 0 })}
                  />
                </Field>
                <Field icon={MessageSquare} label="Números WhatsApp conectados">
                  <Input
                    type="number"
                    min={1}
                    value={form.whatsapp_numbers_limit}
                    onChange={(e) => set({ whatsapp_numbers_limit: parseInt(e.target.value) || 0 })}
                  />
                </Field>
              </div>

              <div className="rounded-lg bg-muted/30 border border-border/60 p-3 text-[11px] text-muted-foreground flex items-start gap-2">
                <Sparkles size={12} className="text-primary mt-0.5 shrink-0" />
                <span>Os limites acima sobrescrevem os padrões do plano selecionado. Use para liberar acessos especiais (Scale custom, influenciadores, beta testers).</span>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <SectionTitle icon={CreditCard} title="Forma de pagamento" />
              <div className="grid grid-cols-2 gap-3">
                <Field icon={Wallet} label="Método">
                  <Select value={form.payment_method} onValueChange={(v) => set({ payment_method: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field icon={Calendar} label="Data de início">
                  <Input type="date" value={form.starts_at} onChange={(e) => set({ starts_at: e.target.value })} />
                </Field>
              </div>

              <SectionTitle icon={Calendar} title="Período do contrato" />
              <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <InfinityIcon size={14} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">Acesso vitalício</div>
                    <p className="text-[11px] text-muted-foreground">Sem data de expiração — entra no MRR como recorrente</p>
                  </div>
                </div>
                <Switch checked={form.is_lifetime} onCheckedChange={(v) => set({ is_lifetime: v })} />
              </div>

              {!form.is_lifetime && (
                <Field icon={Calendar} label="Duração (meses)">
                  <Input
                    type="number"
                    min={1}
                    value={form.contract_months}
                    onChange={(e) => set({ contract_months: parseInt(e.target.value) || 1 })}
                  />
                </Field>
              )}

              <SectionTitle icon={DollarSign} title="Valores" />
              <div className="grid grid-cols-2 gap-3">
                <Field icon={DollarSign} label="Valor mensal (entra no MRR)">
                  <Input
                    value={form.monthly_value_input}
                    onChange={(e) => set({ monthly_value_input: e.target.value })}
                    placeholder="0,00"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">{formatCents(monthlyCents)}/mês</p>
                </Field>
                <Field icon={DollarSign} label={`Valor total ${form.is_lifetime ? "(opcional)" : "(auto)"}`}>
                  <Input
                    value={form.total_value_input}
                    onChange={(e) => set({ total_value_input: e.target.value })}
                    placeholder={(totalCents / 100).toFixed(2).replace(".", ",")}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Total: {formatCents(totalCents)}</p>
                </Field>
              </div>

              <Field icon={NotebookPen} label="Notas de pagamento">
                <Textarea
                  rows={2}
                  value={form.payment_notes}
                  onChange={(e) => set({ payment_notes: e.target.value })}
                  placeholder="Ex: Pago via PIX em 23/04, comprovante anexado"
                />
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <SectionTitle icon={Paperclip} title="Comprovantes" />
              <div className="grid grid-cols-2 gap-3">
                <FileUploadField
                  label="Comprovante de pagamento"
                  fileUrl={form.receipt_file_url || undefined}
                  fileName={form.receipt_file_name || undefined}
                  onChange={(url, name) => set({ receipt_file_url: url, receipt_file_name: name })}
                />
                <FileUploadField
                  label="Contrato assinado"
                  fileUrl={form.contract_file_url || undefined}
                  fileName={form.contract_file_name || undefined}
                  onChange={(url, name) => set({ contract_file_url: url, contract_file_name: name })}
                />
              </div>

              <Field icon={NotebookPen} label="Notas internas (não visíveis ao usuário)">
                <Textarea rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
              </Field>

              <SectionTitle icon={FileCheck} title="Resumo final" />
              <div className="rounded-xl border border-border bg-gradient-to-br from-card to-muted/20 p-4 space-y-2.5">
                <SummaryRow icon={User} label="Usuário" value={form.name || "—"} sub={form.email} />
                <SummaryRow
                  icon={Sparkles}
                  label="Plano"
                  value={`${form.plan.toUpperCase()}${form.subscription_label ? ` • ${form.subscription_label}` : ""}`}
                />
                <SummaryRow
                  icon={ShieldCheck}
                  label="Limites"
                  value={`${form.searches_limit.toLocaleString("pt-BR")} buscas • ${form.whatsapp_numbers_limit} números`}
                />
                <SummaryRow
                  icon={Calendar}
                  label="Período"
                  value={form.is_lifetime ? "Vitalício" : `${form.contract_months} meses`}
                />
                <SummaryRow icon={Wallet} label="Pagamento" value={PAYMENT_METHODS.find((p) => p.value === form.payment_method)?.label || "—"} />
                <div className="border-t border-border/50 pt-2.5 mt-1 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">MRR</div>
                    <div className="text-base font-bold text-primary">{formatCents(monthlyCents)}</div>
                  </div>
                  <div className="rounded-lg bg-muted/40 border border-border p-2.5">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total contrato</div>
                    <div className="text-base font-bold text-foreground">{formatCents(totalCents)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border bg-muted/20 sm:justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={step === 0 || loading}
            onClick={() => setStep(step - 1)}
            className="gap-1.5"
          >
            <ChevronLeft size={14} /> Voltar
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" size="sm" onClick={next} className="gap-1.5">
              Avançar <ChevronRight size={14} />
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={submit} disabled={loading} className="gap-1.5 min-w-[140px]">
              {loading ? (
                <><Loader2 size={14} className="animate-spin" /> Criando...</>
              ) : (
                <><CheckCircle2 size={14} /> Criar Usuário</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ---------- Helpers ---------- */

const SectionTitle = ({ icon: Icon, title }: { icon: any; title: string }) => (
  <div className="flex items-center gap-2 pt-1">
    <Icon size={13} className="text-primary" />
    <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">{title}</span>
    <div className="flex-1 h-px bg-border" />
  </div>
);

const Field = ({
  icon: Icon, label, children, action,
}: { icon: any; label: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <Label className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
        <Icon size={11} /> {label}
      </Label>
      {action}
    </div>
    {children}
  </div>
);

const SummaryRow = ({
  icon: Icon, label, value, sub,
}: { icon: any; label: string; value: string; sub?: string }) => (
  <div className="flex items-start justify-between gap-3 text-xs">
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon size={12} />
      <span>{label}</span>
    </div>
    <div className="text-right">
      <div className="font-medium text-foreground">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  </div>
);
