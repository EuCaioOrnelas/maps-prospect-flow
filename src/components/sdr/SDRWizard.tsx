import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  ArrowRight,
  Check,
  Loader2,
  CalendarCheck,
  MonitorPlay,
  FileText,
  ShoppingCart,
  Filter,
  RefreshCw,
  Shapes,
  Infinity as InfinityIcon,
  SlidersHorizontal,
  MessageCircle,
  Repeat,
  GitBranch,
  UserCheck,
  PauseCircle,
  Zap,
  Timer,
  Hourglass,
  Smile,
  Briefcase,
  Handshake,
  Gauge,
  AlignLeft,
  AlignJustify,
  AlignCenter,
  Ban,
  HelpCircle,
  TrendingUp,
  Search,
  ShieldCheck,
  PhoneCall,
  Archive,
  Columns3,
  ListTodo,
  BellRing,
  Globe,
  Instagram,
  Link2,
  Phone,
  CalendarClock,
  Tag,
  type LucideIcon,
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
  {
    title: "Objetivo",
    icon: Target,
    headline: "Qual o objetivo do seu SDR?",
    subtitle: "Vamos definir o que ele deve buscar em toda conversa.",
  },
  {
    title: "Onde atua",
    icon: Wifi,
    headline: "Onde esse SDR vai trabalhar?",
    subtitle: "Escolha os números de WhatsApp e o horário de atendimento.",
  },
  {
    title: "Quando entra",
    icon: Clock,
    headline: "Quando ele deve entrar na conversa?",
    subtitle: "Defina os gatilhos de entrada e o tempo de resposta.",
  },
  {
    title: "Como conversa",
    icon: MessageSquare,
    headline: "Como ele deve conversar?",
    subtitle: "Personalidade, tom de voz e ritmo das mensagens.",
  },
  {
    title: "Estratégia",
    icon: Brain,
    headline: "Qual a estratégia de vendas?",
    subtitle: "Prioridades, insistência e tratamento de objeções.",
  },
  {
    title: "Conhecimento",
    icon: BookOpen,
    headline: "O que ele precisa saber?",
    subtitle: "Quanto mais contexto, mais natural e preciso ele responde.",
  },
  {
    title: "Encerramento",
    icon: Flag,
    headline: "Quando encerrar ou insistir?",
    subtitle: "Critérios de sucesso, parada e follow-up.",
  },
  {
    title: "Situações",
    icon: Sparkles,
    headline: "Como ele deve agir quando...",
    subtitle: "Ajuste comportamentos específicos sem escrever prompts.",
  },
  {
    title: "Revisão",
    icon: CheckCircle2,
    headline: "Tudo pronto para ativar?",
    subtitle: "Revise as configurações antes de criar o seu SDR.",
  },
];

/** Ícones limpos por id de opção (usados em cards e seletores) */
const OPTION_ICONS: Record<string, LucideIcon> = {
  // objetivos
  reuniao: CalendarCheck,
  demonstracao: MonitorPlay,
  proposta: FileText,
  venda_direta: ShoppingCart,
  qualificar: Filter,
  recuperar: RefreshCw,
  outro: Shapes,
  // horário / gatilhos
  always: InfinityIcon,
  custom: SlidersHorizontal,
  first_only: MessageCircle,
  after_flow: GitBranch,
  after_transfer: UserCheck,
  off: PauseCircle,
  immediate: Zap,
  imediato: Zap,
  "30s": Timer,
  "1min": Hourglass,
  // personalidade
  consultivo: Handshake,
  profissional: Briefcase,
  descontraido: Smile,
  objetivo: Target,
  baixo: Gauge,
  medio: Gauge,
  alto: Gauge,
  curtas: AlignLeft,
  medias: AlignCenter,
  longas: AlignJustify,
  nunca: Ban,
  pouco: Smile,
  normal: Smile,
  sempre: HelpCircle,
  quando_necessario: HelpCircle,
  evitar: Ban,
  muito: TrendingUp,
  natural: MessageCircle,
  abertura: Search,
  contornar: Repeat,
  explorar: Search,
  validar: ShieldCheck,
  vendedor: PhoneCall,
  // follow-up / encerramento
  inteligente: Brain,
  manual: SlidersHorizontal,
  arquivar: Archive,
  mover_pipeline: Columns3,
  criar_tarefa: ListTodo,
  avisar_vendedor: BellRing,
  // situações
  aguardar: Hourglass,
  uma_pergunta: HelpCircle,
  outro_horario: CalendarClock,
  followup: Repeat,
  encerrar: Flag,
  avisar: BellRing,
  descobrir: Search,
  comparar: Columns3,
  contexto: Search,
  enviar: ArrowRight,
  acelerar: Zap,
  recusou: Ban,
  sem_resposta: PauseCircle,
  pediu_parar: Ban,
  venda: ShoppingCart,
  // prioridades
  conexao: Handshake,
  necessidade: Search,
  objecoes: ShieldCheck,
  valor: TrendingUp,
};

function iconFor(id: string): LucideIcon {
  return OPTION_ICONS[id] ?? Tag;
}

function OptionCard({
  active,
  onClick,
  title,
  hint,
  id,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  hint?: string;
  id?: string;
}) {
  const Icon = iconFor(id ?? "");
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative w-full text-left rounded-xl border border-border bg-card p-4 pr-10 transition-colors duration-200",
        active ? "bg-muted/40" : "hover:bg-muted/40"
      )}
    >
      {active && (
        <span className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
        </span>
      )}
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "shrink-0 h-9 w-9 rounded-lg flex items-center justify-center transition-colors",
            active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-foreground leading-5">{title}</span>
          {hint && (
            <span className="block text-xs text-muted-foreground mt-1 leading-4">{hint}</span>
          )}
        </span>
      </div>
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
      {options.map((o) => {
        const Icon = iconFor(o.id);
        const selected = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              "inline-flex items-center gap-2 h-10 px-3.5 rounded-lg text-sm border transition-colors",
              selected
                ? "border-primary/60 bg-primary/10 text-primary font-medium"
                : "border-border bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span className="leading-none">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Input com ícone à esquerda */
function IconInput({
  icon: Icon,
  className,
  ...props
}: React.ComponentProps<typeof Input> & { icon: LucideIcon }) {
  return (
    <div className="relative">
      <Icon
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
        strokeWidth={1.75}
      />
      <Input className={cn("pl-9", className)} {...props} />
    </div>
  );
}

/** Label com ícone */
function IconLabel({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <Label className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
      {children}
    </Label>
  );
}






/** Etapas no padrão do onboarding, porém dentro do portal (sidebar + header) */
function OnboardingShell({
  step,
  total,
  headline,
  subtitle,
  children,
  footer,
  stepKey,
}: {
  step: number;
  total: number;
  headline: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
  stepKey: string;
}) {
  const progress = Math.round((step / total) * 100);
  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Bot className="h-4 w-4 text-primary" />
          SDR Inteligente
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            {step} de {total}
          </span>
          <div className="w-32 sm:w-40 h-1 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.section
          key={stepKey}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-3xl mx-auto"
        >
          <div className="text-center mb-10">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              {headline}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">{subtitle}</p>
          </div>

          <div>{children}</div>

          <div className="mt-12">{footer}</div>
        </motion.section>
      </AnimatePresence>
    </div>
  );
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
  const stepDef = STEPS[step - 1];

  const body = (
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
  );

  const isPage = variant === "page";

  const footer = isPage ? (
    <div className="flex items-center justify-between border-t border-border pt-6">
      <Button
        variant="ghost"
        onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
        disabled={saving}
        className="text-muted-foreground hover:text-foreground"
      >
        {step === 1 ? "Cancelar" : "Voltar"}
      </Button>
      {step < STEPS.length ? (
        <Button onClick={() => setStep(step + 1)} disabled={!canProceed} className="px-8 h-11">
          Continuar
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      ) : (
        <Button onClick={handleSave} disabled={saving} className="px-8 h-11">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : editing ? (
            "Salvar alterações"
          ) : (
            "Criar SDR"
          )}
        </Button>
      )}
    </div>

  ) : (
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
  );

  if (isPage) {

    return (
      <OnboardingShell
        step={step}
        total={STEPS.length}
        stepKey={`sdr-step-${step}`}
        headline={stepDef.headline}
        subtitle={stepDef.subtitle}
        footer={footer}
      >
        {body}
      </OnboardingShell>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="flex items-center gap-2 font-semibold">
              <span className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <StepIcon className="text-primary" size={18} />
              </span>
              <span className="flex flex-col items-start">
                <span className="text-base">{stepDef.title}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Etapa {step} de {STEPS.length}
                </span>
              </span>
            </DialogTitle>
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
        </DialogHeader>
        {body}
        {footer}
      </DialogContent>
    </Dialog>
  );
}

