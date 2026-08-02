import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Bot,
  Target,
  Wifi,
  Clock,
  MessageSquare,
  Brain,
  BookOpen,
  Flag,
  Sparkles,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  SDR_DEFAULT_DRAFT,
  SDR_OBJECTIVES,
  SDR_OBJECTIVE_LABEL,
  SDR_PRIORITIES,
  SDR_SITUATIONS,
  SDR_WEEKDAYS,
  type SdrDraft,
} from "@/lib/sdrConfig";

interface Props {
  open: boolean;
  variant?: "dialog" | "page";
  onClose: () => void;
  onCreated: () => void;
  editing?: any | null;
}

const STEPS = [
  { title: "Objetivo", icon: Target },
  { title: "Onde atua", icon: Wifi },
  { title: "Quando entra", icon: Clock },
  { title: "Como conversa", icon: MessageSquare },
  { title: "Estratégia", icon: Brain },
  { title: "Conhecimento", icon: BookOpen },
  { title: "Encerramento", icon: Flag },
  { title: "Situações", icon: Sparkles },
  { title: "Revisão", icon: CheckCircle2 },
];

function OptionCard({
  active,
  onClick,
  title,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border p-3 transition-colors",
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-card hover:bg-muted/50 text-muted-foreground"
      )}
    >
      <span className="text-sm font-medium text-foreground">{title}</span>
      {hint && <span className="block text-xs text-muted-foreground mt-0.5">{hint}</span>}
    </button>
  );
}

function Pills({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm border transition-colors",
            value === o.id
              ? "border-primary bg-primary/10 text-foreground font-medium"
              : "border-border text-muted-foreground hover:bg-muted/50"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}


function Shell({
  variant,
  open,
  onClose,
  children,
}: {
  variant: "dialog" | "page";
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (variant === "page") {
    return <div className="w-full">{children}</div>;
  }
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">{children}</DialogContent>
    </Dialog>
  );
}

function Head({ variant, children }: { variant: "dialog" | "page"; children: React.ReactNode }) {
  if (variant === "page") return <div className="space-y-2">{children}</div>;
  return <DialogHeader>{children}</DialogHeader>;
}

function Title({
  variant,
  className,
  children,
}: {
  variant: "dialog" | "page";
  className?: string;
  children: React.ReactNode;
}) {
  if (variant === "page") return <div className={className}>{children}</div>;
  return <DialogTitle className={className}>{children}</DialogTitle>;
}

export function SDRWizard({ open, onClose, onCreated, editing, variant = "dialog" }: Props) {
  const { user, accountOwnerId } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<SdrDraft>(SDR_DEFAULT_DRAFT);
  const [numbers, setNumbers] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    if (editing) {
      setDraft({
        ...SDR_DEFAULT_DRAFT,
        name: editing.name ?? "",
        objective: editing.objective ?? "reuniao",
        objective_custom: editing.objective_custom ?? "",
        whatsapp_number_ids: editing.whatsapp_number_ids ?? [],
        schedule: { ...SDR_DEFAULT_DRAFT.schedule, ...(editing.schedule || {}) },
        triggers: { ...SDR_DEFAULT_DRAFT.triggers, ...(editing.triggers || {}) },
        personality: { ...SDR_DEFAULT_DRAFT.personality, ...(editing.personality || {}) },
        strategy: { ...SDR_DEFAULT_DRAFT.strategy, ...(editing.strategy || {}) },
        knowledge: { ...SDR_DEFAULT_DRAFT.knowledge, ...(editing.knowledge || {}) },
        closing: { ...SDR_DEFAULT_DRAFT.closing, ...(editing.closing || {}) },
        situations: { ...SDR_DEFAULT_DRAFT.situations, ...(editing.situations || {}) },
      });
    } else {
      setDraft(SDR_DEFAULT_DRAFT);
    }
  }, [open, editing]);

  useEffect(() => {
    if (!open || !accountOwnerId) return;
    supabase
      .from("user_waba_connections")
      .select("id,nickname,phone_number,phone_number_id")
      .eq("owner_user_id", accountOwnerId)
      .then(({ data }) => setNumbers(data ?? []));
  }, [open, accountOwnerId]);

  const set = <K extends keyof SdrDraft>(key: K, value: SdrDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const patch = <K extends keyof SdrDraft>(key: K, value: Partial<SdrDraft[K]>) =>
    setDraft((d) => ({ ...d, [key]: { ...(d[key] as any), ...(value as any) } }));

  const canProceed = useMemo(() => {
    switch (step) {
      case 1:
        return draft.name.trim().length >= 2;
      case 2:
        return draft.whatsapp_number_ids.length > 0;
      case 6:
        return draft.knowledge.company.trim().length > 0;
      default:
        return true;
    }
  }, [step, draft]);

  const handleSave = async () => {
    if (!user || !accountOwnerId) return;
    setSaving(true);
    try {
      const payload: any = {
        owner_user_id: accountOwnerId,
        created_by: user.id,
        name: draft.name.trim(),
        objective: draft.objective,
        objective_custom: draft.objective_custom || null,
        whatsapp_number_ids: draft.whatsapp_number_ids,
        schedule: draft.schedule,
        triggers: draft.triggers,
        personality: draft.personality,
        strategy: draft.strategy,
        knowledge: draft.knowledge,
        closing: draft.closing,
        situations: draft.situations,
      };
      const q = editing
        ? supabase.from("sdr_agents" as any).update(payload).eq("id", editing.id)
        : supabase.from("sdr_agents" as any).insert(payload);
      const { error } = await q;
      if (error) throw error;
      toast.success(editing ? "SDR atualizado com sucesso" : "SDR criado com sucesso");
      onCreated();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar SDR");
    } finally {
      setSaving(false);
    }
  };

  const toggleArray = (arr: string[], id: string) =>
    arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];

  const StepIcon = STEPS[step - 1].icon;

  return (
    <Shell variant={variant} open={open} onClose={onClose}>
      <div>
        <Head variant={variant}>
          <div className="flex items-center justify-between gap-3">
            <Title variant={variant} className="flex items-center gap-2 font-semibold">
              <span className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <StepIcon className="h-4.5 w-4.5 text-primary" size={18} />
              </span>
              <span className="flex flex-col items-start">
                <span className="text-base">{STEPS[step - 1].title}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Etapa {step} de {STEPS.length}
                </span>
              </span>
            </Title>
            <Badge variant="secondary" className="gap-1">
              <Bot size={12} /> SDR Inteligente
            </Badge>
          </div>
          <div className="flex gap-1 mt-4">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i < step ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </Head>

        <div className="py-2 space-y-5">
          {/* 1 - Objetivo */}
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>Nome do SDR</Label>
                <Input
                  value={draft.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Ex.: SDR Comercial"
                />
              </div>
              <div className="space-y-2">
                <Label>Objetivo principal</Label>
                <div className="grid sm:grid-cols-2 gap-2">
                  {SDR_OBJECTIVES.map((o) => (
                    <OptionCard
                      key={o.id}
                      active={draft.objective === o.id}
                      onClick={() => set("objective", o.id)}
                      title={o.label}
                      hint={o.hint}
                    />
                  ))}
                </div>
                {draft.objective === "outro" && (
                  <Input
                    className="mt-2"
                    value={draft.objective_custom}
                    onChange={(e) => set("objective_custom", e.target.value)}
                    placeholder="Descreva o objetivo"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Esse será o principal objetivo buscado em todas as conversas.
                </p>
              </div>
            </>
          )}

          {/* 2 - Onde atua */}
          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Números de WhatsApp (Meta)</Label>
                {numbers.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum número conectado. Conecte um número Meta em Meta → Números.
                  </p>
                )}
                <div className="space-y-2">
                  {numbers.map((n) => (
                    <label
                      key={n.id}
                      className="flex items-center gap-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={draft.whatsapp_number_ids.includes(n.id)}
                        onCheckedChange={() =>
                          set("whatsapp_number_ids", toggleArray(draft.whatsapp_number_ids, n.id))
                        }
                      />
                      <span className="text-sm">
                        {n.nickname || n.phone_number || n.phone_number_id}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Horário de atendimento</Label>
                <Pills
                  value={draft.schedule.mode}
                  onChange={(v) => patch("schedule", { mode: v as any })}
                  options={[
                    { id: "always", label: "Sempre" },
                    { id: "custom", label: "Personalizado" },
                  ]}
                />
                {draft.schedule.mode === "custom" && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {SDR_WEEKDAYS.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() =>
                            patch("schedule", {
                              days: draft.schedule.days.includes(d.id)
                                ? draft.schedule.days.filter((x) => x !== d.id)
                                : [...draft.schedule.days, d.id],
                            })
                          }
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-sm border transition-colors",
                            draft.schedule.days.includes(d.id)
                              ? "border-primary bg-primary/10 text-foreground font-medium"
                              : "border-border text-muted-foreground hover:bg-muted/50"
                          )}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Início</Label>
                        <Input
                          type="time"
                          value={draft.schedule.start}
                          onChange={(e) => patch("schedule", { start: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Fim</Label>
                        <Input
                          type="time"
                          value={draft.schedule.end}
                          onChange={(e) => patch("schedule", { end: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">Fila fora do horário</p>
                    <p className="text-xs text-muted-foreground">
                      Mensagens fora do horário são enviadas no próximo horário útil.
                    </p>
                  </div>
                  <Switch
                    checked={draft.schedule.queue_outside_hours}
                    onCheckedChange={(v) => patch("schedule", { queue_outside_hours: v })}
                  />
                </div>
              </div>
            </>
          )}

          {/* 3 - Quando entra */}
          {step === 3 && (
            <>
              <div className="space-y-2">
                <Label>Mensagem recebida</Label>
                <Pills
                  value={draft.triggers.inbound}
                  onChange={(v) => patch("triggers", { inbound: v as any })}
                  options={[
                    { id: "always", label: "Sempre" },
                    { id: "first_only", label: "Apenas primeira mensagem" },
                    { id: "after_flow", label: "Após fluxo" },
                    { id: "after_transfer", label: "Após transferência" },
                    { id: "off", label: "Não assumir" },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <Label>Conversa iniciada pelo SDR</Label>
                {[
                  { key: "outbound_prospect", label: "Prospectar automaticamente" },
                  { key: "outbound_followup", label: "Fazer follow-up" },
                  { key: "outbound_reactivate", label: "Reativar oportunidades" },
                ].map((o) => (
                  <div
                    key={o.key}
                    className="flex items-center justify-between rounded-xl border border-border p-3"
                  >
                    <span className="text-sm">{o.label}</span>
                    <Switch
                      checked={(draft.triggers as any)[o.key]}
                      onCheckedChange={(v) => patch("triggers", { [o.key]: v } as any)}
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label>Tempo para responder</Label>
                <Pills
                  value={draft.triggers.reply_delay}
                  onChange={(v) => patch("triggers", { reply_delay: v as any })}
                  options={[
                    { id: "immediate", label: "Imediatamente" },
                    { id: "30s", label: "30 segundos" },
                    { id: "1min", label: "1 minuto" },
                    { id: "custom", label: "Personalizado" },
                  ]}
                />
                {draft.triggers.reply_delay === "custom" && (
                  <Input
                    type="number"
                    min={0}
                    value={draft.triggers.reply_delay_custom_seconds}
                    onChange={(e) =>
                      patch("triggers", { reply_delay_custom_seconds: Number(e.target.value) })
                    }
                    placeholder="Segundos"
                  />
                )}
              </div>
            </>
          )}

          {/* 4 - Como conversa */}
          {step === 4 && (
            <>
              <div className="space-y-2">
                <Label>Tom</Label>
                <Pills
                  value={draft.personality.tone}
                  onChange={(v) => patch("personality", { tone: v as any })}
                  options={[
                    { id: "consultivo", label: "Consultivo" },
                    { id: "profissional", label: "Profissional" },
                    { id: "descontraido", label: "Descontraído" },
                    { id: "objetivo", label: "Objetivo" },
                  ]}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Formalidade</Label>
                  <Pills
                    value={draft.personality.formality}
                    onChange={(v) => patch("personality", { formality: v as any })}
                    options={[
                      { id: "baixo", label: "Baixa" },
                      { id: "medio", label: "Média" },
                      { id: "alto", label: "Alta" },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tamanho das respostas</Label>
                  <Pills
                    value={draft.personality.length}
                    onChange={(v) => patch("personality", { length: v as any })}
                    options={[
                      { id: "curtas", label: "Curtas" },
                      { id: "medias", label: "Médias" },
                      { id: "longas", label: "Longas" },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Emojis</Label>
                  <Pills
                    value={draft.personality.emojis}
                    onChange={(v) => patch("personality", { emojis: v as any })}
                    options={[
                      { id: "nunca", label: "Nunca" },
                      { id: "pouco", label: "Pouco" },
                      { id: "normal", label: "Normal" },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pode fazer perguntas?</Label>
                  <Pills
                    value={draft.personality.questions}
                    onChange={(v) => patch("personality", { questions: v as any })}
                    options={[
                      { id: "sempre", label: "Sempre" },
                      { id: "quando_necessario", label: "Quando necessário" },
                      { id: "evitar", label: "Evitar" },
                    ]}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl border border-border p-3">
                  <span className="text-sm">O SDR sempre conduz a conversa</span>
                  <Switch
                    checked={draft.personality.leads_conversation}
                    onCheckedChange={(v) => patch("personality", { leads_conversation: v })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border p-3">
                  <span className="text-sm">Nunca esperar o lead decidir sozinho</span>
                  <Switch
                    checked={draft.personality.never_wait_lead}
                    onCheckedChange={(v) => patch("personality", { never_wait_lead: v })}
                  />
                </div>
              </div>
            </>
          )}

          {/* 5 - Estratégia */}
          {step === 5 && (
            <>
              <div className="space-y-2">
                <Label>Prioridades (clique para ordenar)</Label>
                <div className="space-y-2">
                  {draft.strategy.priorities.map((p, i) => (
                    <div
                      key={p}
                      className="flex items-center justify-between rounded-xl border border-border p-3"
                    >
                      <span className="text-sm">
                        <span className="text-primary font-semibold mr-2">{i + 1}.</span>
                        {SDR_PRIORITIES.find((x) => x.id === p)?.label ?? p}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={i === 0}
                          onClick={() => {
                            const arr = [...draft.strategy.priorities];
                            [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
                            patch("strategy", { priorities: arr });
                          }}
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={i === draft.strategy.priorities.length - 1}
                          onClick={() => {
                            const arr = [...draft.strategy.priorities];
                            [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
                            patch("strategy", { priorities: arr });
                          }}
                        >
                          ↓
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Pode insistir?</Label>
                <Pills
                  value={draft.strategy.insistence}
                  onChange={(v) => patch("strategy", { insistence: v as any })}
                  options={[
                    { id: "pouco", label: "Pouco" },
                    { id: "medio", label: "Médio" },
                    { id: "muito", label: "Muito" },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <Label>Quando voltar ao objetivo?</Label>
                <Pills
                  value={draft.strategy.return_to_goal}
                  onChange={(v) => patch("strategy", { return_to_goal: v as any })}
                  options={[
                    { id: "imediato", label: "Imediatamente" },
                    { id: "natural", label: "Naturalmente" },
                    { id: "abertura", label: "Somente com abertura" },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <Label>Se surgir objeção</Label>
                <Pills
                  value={draft.strategy.on_objection}
                  onChange={(v) => patch("strategy", { on_objection: v as any })}
                  options={[
                    { id: "contornar", label: "Contornar" },
                    { id: "explorar", label: "Explorar" },
                    { id: "validar", label: "Validar" },
                    { id: "vendedor", label: "Chamar vendedor" },
                  ]}
                />
              </div>
            </>
          )}

          {/* 6 - Conhecimento */}
          {step === 6 && (
            <div className="space-y-3">
              {[
                { key: "company", label: "Empresa", ph: "O que a empresa faz, para quem, diferenciais gerais" },
                { key: "products", label: "Produtos e serviços", ph: "Ofertas, preços, condições" },
                { key: "faq", label: "FAQ", ph: "Perguntas frequentes e respostas" },
                { key: "policies", label: "Políticas", ph: "Garantia, cancelamento, prazos" },
                { key: "cases", label: "Cases", ph: "Resultados e provas sociais" },
                { key: "differentials", label: "Diferenciais", ph: "Por que escolher a empresa" },
                { key: "competitors", label: "Concorrentes", ph: "Como se comparar" },
              ].map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label>{f.label}</Label>
                  <Textarea
                    rows={f.key === "company" ? 4 : 3}
                    value={(draft.knowledge as any)[f.key]}
                    onChange={(e) => patch("knowledge", { [f.key]: e.target.value } as any)}
                    placeholder={f.ph}
                  />
                </div>
              ))}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Site</Label>
                  <Input
                    value={draft.knowledge.site}
                    onChange={(e) => patch("knowledge", { site: e.target.value })}
                    placeholder="https://"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Instagram</Label>
                  <Input
                    value={draft.knowledge.instagram}
                    onChange={(e) => patch("knowledge", { instagram: e.target.value })}
                    placeholder="@empresa"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Links de apoio</Label>
                <Textarea
                  rows={2}
                  value={draft.knowledge.links}
                  onChange={(e) => patch("knowledge", { links: e.target.value })}
                  placeholder="Um link por linha"
                />
              </div>
            </div>
          )}

          {/* 7 - Encerramento */}
          {step === 7 && (
            <>
              <div className="space-y-2">
                <Label>Quando considerar sucesso?</Label>
                {[
                  { id: "reuniao", label: "Reunião marcada" },
                  { id: "venda", label: "Venda" },
                  { id: "proposta", label: "Proposta enviada" },
                  { id: "qualificado", label: "Lead qualificado" },
                ].map((o) => (
                  <label
                    key={o.id}
                    className="flex items-center gap-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={draft.closing.success_criteria.includes(o.id)}
                      onCheckedChange={() =>
                        patch("closing", {
                          success_criteria: toggleArray(draft.closing.success_criteria, o.id),
                        })
                      }
                    />
                    <span className="text-sm">{o.label}</span>
                  </label>
                ))}
              </div>
              <div className="space-y-2">
                <Label>Quando parar?</Label>
                {[
                  { id: "recusou", label: "Cliente recusou" },
                  { id: "sem_resposta", label: "Sem resposta" },
                  { id: "pediu_parar", label: "Solicitou parar" },
                ].map((o) => (
                  <label
                    key={o.id}
                    className="flex items-center gap-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={draft.closing.stop_criteria.includes(o.id)}
                      onCheckedChange={() =>
                        patch("closing", {
                          stop_criteria: toggleArray(draft.closing.stop_criteria, o.id),
                        })
                      }
                    />
                    <span className="text-sm">{o.label}</span>
                  </label>
                ))}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Máximo de follow-ups</Label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={draft.closing.followup_max}
                    onChange={(e) => patch("closing", { followup_max: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Intervalo (horas)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={draft.closing.followup_interval_hours}
                    onChange={(e) =>
                      patch("closing", { followup_interval_hours: Number(e.target.value) })
                    }
                    disabled={draft.closing.followup_mode === "inteligente"}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Modo de follow-up</Label>
                <Pills
                  value={draft.closing.followup_mode}
                  onChange={(v) => patch("closing", { followup_mode: v as any })}
                  options={[
                    { id: "inteligente", label: "Inteligente" },
                    { id: "manual", label: "Manual" },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <Label>Após atingir o limite</Label>
                <Pills
                  value={draft.closing.after_limit}
                  onChange={(v) => patch("closing", { after_limit: v as any })}
                  options={[
                    { id: "arquivar", label: "Arquivar" },
                    { id: "mover_pipeline", label: "Mover no pipeline" },
                    { id: "criar_tarefa", label: "Criar tarefa" },
                    { id: "avisar_vendedor", label: "Avisar vendedor" },
                  ]}
                />
              </div>
            </>
          )}

          {/* 8 - Situações */}
          {step === 8 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Como ele deve agir quando... Personalize os comportamentos sem escrever prompts.
              </p>
              {SDR_SITUATIONS.map((s) => (
                <div key={s.id} className="space-y-2">
                  <Label>{s.label}</Label>
                  <Pills
                    value={draft.situations[s.id] ?? s.options[0].id}
                    onChange={(v) => set("situations", { ...draft.situations, [s.id]: v })}
                    options={s.options}
                  />
                </div>
              ))}
            </div>
          )}

          {/* 9 - Revisão */}
          {step === 9 && (
            <div className="rounded-2xl border border-border p-5 space-y-3">
              {[
                ["Nome", draft.name || "—"],
                [
                  "Objetivo",
                  draft.objective === "outro"
                    ? draft.objective_custom || "Outro"
                    : SDR_OBJECTIVE_LABEL(draft.objective),
                ],
                [
                  "Onde atua",
                  draft.whatsapp_number_ids
                    .map(
                      (id) =>
                        numbers.find((n) => n.id === id)?.nickname ||
                        numbers.find((n) => n.id === id)?.phone_number ||
                        "Número"
                    )
                    .join(", ") || "—",
                ],
                [
                  "Horário",
                  draft.schedule.mode === "always"
                    ? "Sempre"
                    : `${draft.schedule.days
                        .map((d) => SDR_WEEKDAYS.find((w) => w.id === d)?.label)
                        .join(", ")} · ${draft.schedule.start}–${draft.schedule.end}`,
                ],
                ["Tom", draft.personality.tone],
                ["Follow-up", `Até ${draft.closing.followup_max} tentativas`],
                [
                  "Conhecimento",
                  [
                    draft.knowledge.company && "Empresa",
                    draft.knowledge.faq && "FAQ",
                    draft.knowledge.cases && "Cases",
                    draft.knowledge.site && "Site",
                  ]
                    .filter(Boolean)
                    .join(" + ") || "—",
                ],
              ].map(([k, v]) => (
                <div key={k as string} className="flex items-start justify-between gap-6">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{k}</span>
                  <span className="text-sm font-medium text-right">{v as string}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button
            variant="ghost"
            onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
            disabled={saving}
            className="gap-1"
          >
            <ChevronLeft size={16} />
            {step === 1 ? "Cancelar" : "Voltar"}
          </Button>
          {step < STEPS.length ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed} className="gap-1">
              Continuar <ChevronRight size={16} />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving} className="gap-1">
              {saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar SDR"}
            </Button>
          )}
        </div>
      </div>
    </Shell>
  );
}
