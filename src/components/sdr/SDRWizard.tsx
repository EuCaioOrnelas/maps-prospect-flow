import { useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

import { cn } from "@/lib/utils";
import { SDRIntelligenceStep } from "@/components/sdr/SDRIntelligenceStep";
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
  ChevronDown,
  ArrowRight,
  ArrowDown,
  Check,
  Loader2,
  CalendarCheck,
  CalendarDays,
  MonitorPlay,
  FileText,
  ShoppingCart,
  Filter,
  RefreshCw,
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
  BellRing,
  Globe,
  Instagram,
  Link2,
  Phone,
  CalendarClock,
  Tag,
  Building2,
  Users,
  Package,
  Plus,
  Trash2,
  DollarSign,
  Lock,
  Lightbulb,
  Cpu,
  Info,
  Sparkle,
  Save,
  MessagesSquare,
  type LucideIcon,
} from "lucide-react";

import {
  SDR_ACTIVATION_TRIGGERS,
  SDR_DEFAULT_DRAFT,
  SDR_INSISTENCE_OPTIONS,
  SDR_OBJECTIVES,
  SDR_OBJECTIVE_LABEL,
  SDR_OBJECTION_OPTIONS,
  SDR_PRIORITIES,
  SDR_REPLY_DELAY_OPTIONS,
  SDR_RETURN_OPTIONS,
  SDR_SITUATIONS,
  SDR_STOP_OPTIONS,
  SDR_SUCCESS_BY_OBJECTIVE,
  SDR_WEEKDAYS,
  clearSdrDraft,
  loadSdrDraft,
  saveSdrDraft,
  type SdrDraft,
  type SdrObjective,
  type SdrSeller,
} from "@/lib/sdrConfig";
import { AI_PROVIDERS } from "@/lib/aiProviders";

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
    title: "Ativação",
    icon: Zap,
    headline: "Qual o gatilho de ativação?",
    subtitle: "Escolha quando o SDR assume a conversa e em quanto tempo responde.",
  },
  {
    title: "Como conversa",
    icon: MessageSquare,
    headline: "Como ele deve conversar?",
    subtitle: "Tom de voz, ritmo e estilo das mensagens.",
  },
  {
    title: "Estratégia",
    icon: Brain,
    headline: "Qual a estratégia de vendas?",
    subtitle: "A lógica de prioridades, insistência e objeções.",
  },
  {
    title: "Empresa",
    icon: Building2,
    headline: "Sobre a sua empresa",
    subtitle: "Usamos o perfil da empresa para o SDR falar como você.",
  },
  {
    title: "Produtos",
    icon: Package,
    headline: "O que ele pode oferecer?",
    subtitle: "Cadastre cada produto e quando ele deve ser oferecido.",
  },
  {
    title: "Materiais",
    icon: BookOpen,
    headline: "O que mais ele precisa saber?",
    subtitle: "FAQ, políticas, provas sociais e links de apoio.",
  },
  {
    title: "Encerramento",
    icon: Flag,
    headline: "Quando encerrar ou insistir?",
    subtitle: "Critérios de parada, follow-up e o que fazer com o lead.",
  },
  {
    title: "Situações",
    icon: Sparkles,
    headline: "Como ele deve agir quando...",
    subtitle: "Ajuste comportamentos específicos sem escrever prompts.",
  },
  {
    title: "Inteligência",
    icon: Cpu,
    headline: "Qual IA vai pensar por ele?",
    subtitle: "Conecte sua chave da OpenAI e escolha o modelo que vai raciocinar pelo SDR.",
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
  reuniao: CalendarCheck,
  demonstracao: MonitorPlay,
  proposta: FileText,
  venda_direta: ShoppingCart,
  qualificar: Filter,
  recuperar: RefreshCw,
  always: InfinityIcon,
  custom: SlidersHorizontal,
  inbound_all: MessageCircle,
  first_only: MessageSquare,
  after_flow: GitBranch,
  after_transfer: UserCheck,
  manual_call: PhoneCall,
  new_opportunity: Sparkle,
  off: PauseCircle,
  immediate: Zap,
  imediato: Zap,
  smart: Brain,
  "30s": Timer,
  "1min": Hourglass,
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
  inteligente: Brain,
  manual: SlidersHorizontal,
  arquivar: Archive,
  mover_pipeline: Columns3,
  avisar_vendedor: BellRing,
  aguardar: Hourglass,
  uma_pergunta: HelpCircle,
  outro_horario: CalendarClock,
  followup: Repeat,
  encerrar: Flag,
  avisar: BellRing,
  descobrir: Search,
  comparar: Columns3,
  contexto: Search,
  nunca_sem_reuniao: Lock,
  enviar: ArrowRight,
  acelerar: Zap,
  recusou: Ban,
  sem_resposta: PauseCircle,
  pediu_parar: Ban,
  venda: ShoppingCart,
  conexao: Handshake,
  necessidade: Search,
  objecoes: ShieldCheck,
  valor: TrendingUp,
};

function iconFor(id: string): LucideIcon {
  return OPTION_ICONS[id] ?? Tag;
}

/** Card no padrão do onboarding: ícone em cima, texto centralizado embaixo */
function OptionCard({
  active,
  onClick,
  title,
  hint,
  id,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  hint?: string;
  id?: string;
  icon?: LucideIcon;
}) {
  const Icon = icon ?? iconFor(id ?? "");
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex h-full w-full flex-col items-center justify-start gap-4 p-6 rounded-xl border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        active
          ? "border-primary ring-2 ring-primary/20 shadow-md"
          : "border-border hover:border-primary/40"
      )}
    >
      <span
        className={cn(
          "absolute top-3 right-3 h-5 w-5 rounded-full border flex items-center justify-center transition-colors",
          active ? "bg-primary border-primary" : "border-border group-hover:border-primary/50"
        )}
      >
        {active && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
      </span>
      <span
        className={cn(
          "h-12 w-12 rounded-lg flex items-center justify-center transition-colors",
          active
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
        )}
      >
        <Icon className="h-6 w-6" strokeWidth={1.75} />
      </span>
      <span className="flex flex-col items-center gap-1 px-1">
        <span className="text-sm font-medium text-center text-foreground leading-snug break-words">
          {title}
        </span>
        {hint && (
          <span className="text-xs text-center text-muted-foreground leading-4 break-words">
            {hint}
          </span>
        )}
      </span>
    </button>
  );
}

/** Grade de cards no padrão do onboarding */
function CardGrid({ children, cols = 3 }: { children: ReactNode; cols?: 2 | 3 }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 items-stretch",
        cols === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"
      )}
    >
      {children}
    </div>
  );
}

/** Seletor único no formato de cards do onboarding */
function CardSelect({
  value,
  onChange,
  options,
  cols = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string; hint?: string }[];
  cols?: 2 | 3;
}) {
  return (
    <CardGrid cols={cols}>
      {options.map((o) => (
        <OptionCard
          key={o.id}
          id={o.id}
          title={o.label}
          hint={o.hint}
          active={value === o.id}
          onClick={() => onChange(o.id)}
        />
      ))}
    </CardGrid>
  );
}

/** Seletor múltiplo no formato de cards do onboarding */
function CardMultiSelect({
  values,
  onToggle,
  options,
  cols = 3,
}: {
  values: string[];
  onToggle: (v: string) => void;
  options: { id: string; label: string; hint?: string }[];
  cols?: 2 | 3;
}) {
  return (
    <CardGrid cols={cols}>
      {options.map((o) => (
        <OptionCard
          key={o.id}
          id={o.id}
          title={o.label}
          hint={o.hint}
          active={values.includes(o.id)}
          onClick={() => onToggle(o.id)}
        />
      ))}
    </CardGrid>
  );
}

/** Input com ícone à esquerda */
function IconInput({
  icon: Icon,
  className,
  suffix,
  ...props
}: ComponentProps<typeof Input> & { icon?: LucideIcon; suffix?: string }) {
  return (
    <div className="relative">
      {Icon && (
        <Icon
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          strokeWidth={1.75}
        />
      )}
      <Input className={cn(Icon && "pl-9", suffix && "pr-8", className)} {...props} />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
          {suffix}
        </span>
      )}
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

/** Bloco informativo (regras obrigatórias, dicas) */
function InfoBox({
  icon: Icon = Info,
  title,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex gap-3">
      <span className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <div className="text-xs text-muted-foreground leading-relaxed space-y-1">{children}</div>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="h-9 w-9 shrink-0 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

/** Combobox pesquisável de números de WhatsApp */
function NumbersCombobox({
  numbers,
  selected,
  onToggle,
}: {
  numbers: any[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const label =
    selected.length === 0
      ? "Selecionar números..."
      : selected.length === 1
        ? numbers.find((n) => n.id === selected[0])?.nickname ||
          numbers.find((n) => n.id === selected[0])?.display_phone_number ||
          "1 número"
        : `${selected.length} números selecionados`;

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-11 w-full items-center justify-between rounded-lg border border-border bg-card px-3 text-sm transition-colors hover:border-primary/40"
          >
            <span className="flex items-center gap-2 truncate">
              <Phone className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              <span className={cn("truncate", selected.length === 0 && "text-muted-foreground")}>
                {label}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 w-[--radix-popover-trigger-width] bg-popover text-popover-foreground border-border shadow-lg z-50"
          align="start"
        >
          <Command
            filter={(value, search) =>
              value.toLowerCase().includes(search.toLowerCase().trim()) ? 1 : 0
            }
          >
            <CommandInput placeholder="Buscar por nome ou número..." />
            <CommandList>
              <CommandEmpty>Nenhum número encontrado.</CommandEmpty>
              <CommandGroup>
                {numbers.map((n) => {
                  const isOn = selected.includes(n.id);
                  return (
                    <CommandItem
                      key={n.id}
                      value={`${n.nickname ?? ""} ${n.display_phone_number ?? ""} ${n.phone_number_id ?? ""}`}
                      onSelect={() => onToggle(n.id)}
                      className={cn(
                        "gap-2 cursor-pointer rounded-lg px-2 py-2",
                        "data-[selected=true]:bg-muted data-[selected=true]:text-foreground",
                        isOn && "bg-primary/10 text-foreground data-[selected=true]:bg-primary/15",
                      )}
                    >
                      <Checkbox checked={isOn} className="pointer-events-none" />

                      <Phone className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                      <span className="flex flex-col">
                        <span className="text-sm text-foreground">
                          {n.nickname || n.display_phone_number || n.phone_number_id}
                        </span>
                        {n.nickname && n.display_phone_number && (
                          <span className="text-xs text-muted-foreground">
                            {n.display_phone_number}
                          </span>
                        )}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <div className="min-h-[38px] rounded-lg border border-dashed border-border/70 bg-muted/30 px-2 py-1.5 flex flex-wrap items-center gap-2">
        {selected.length === 0 ? (
          <span className="text-xs text-muted-foreground">Nenhum número selecionado ainda</span>
        ) : (
          selected.map((id) => {
            const n = numbers.find((x) => x.id === id);
            if (!n) return null;
            return (
              <Badge key={id} variant="secondary" className="gap-1.5 pl-2 pr-1 py-1 text-foreground">
                <Phone className="h-3 w-3" />
                {n.nickname || n.display_phone_number}
                <button
                  type="button"
                  onClick={() => onToggle(id)}
                  className="ml-1 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            );
          })
        )}
      </div>
    </div>
  );
}


/** Combobox pesquisável de vendedores (multi-seleção) */
function SellersCombobox({
  members,
  selected,
  onToggle,
  placeholder = "Selecionar vendedores...",
}: {
  members: any[];
  selected: SdrSeller[];
  onToggle: (seller: SdrSeller) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const options = (members || []).filter((m: any) => m.email);
  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? selected[0].name || selected[0].email
        : `${selected.length} vendedores selecionados`;

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-11 w-full items-center justify-between rounded-lg border border-border bg-card px-3 text-sm transition-colors hover:border-primary/40"
          >
            <span className="flex items-center gap-2 truncate">
              <UserCheck className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              <span className={cn("truncate", selected.length === 0 && "text-muted-foreground")}>
                {label}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 w-[--radix-popover-trigger-width] bg-popover text-popover-foreground border-border shadow-lg z-50"
          align="start"
        >
          <Command
            filter={(value, search) =>
              value.toLowerCase().includes(search.toLowerCase().trim()) ? 1 : 0
            }
          >
            <CommandInput placeholder="Buscar por nome ou e-mail..." />
            <CommandList>
              <CommandEmpty>Nenhum vendedor encontrado.</CommandEmpty>
              <CommandGroup>
                {options.map((m: any) => {
                  const isOn = selected.some((s) => s.email === m.email);
                  return (
                    <CommandItem
                      key={m.id}
                      value={`${m.name ?? ""} ${m.email ?? ""}`}
                      onSelect={() =>
                        onToggle({ user_id: m.user_id ?? null, name: m.name || m.email, email: m.email })
                      }
                      className={cn(
                        "gap-2 cursor-pointer rounded-lg px-2 py-2",
                        "data-[selected=true]:bg-muted data-[selected=true]:text-foreground",
                        isOn && "bg-primary/10 text-foreground data-[selected=true]:bg-primary/15"
                      )}
                    >
                      <Checkbox checked={isOn} className="pointer-events-none" />
                      <UserCheck className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                      <span className="flex flex-col">
                        <span className="text-sm text-foreground">{m.name || m.email}</span>
                        <span className="text-xs text-muted-foreground">{m.email}</span>
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <div className="min-h-[38px] rounded-lg border border-dashed border-border/70 bg-muted/30 px-2 py-1.5 flex flex-wrap items-center gap-2">
        {selected.length === 0 ? (
          <span className="text-xs text-muted-foreground">Nenhum vendedor selecionado ainda</span>
        ) : (
          selected.map((s) => (
            <Badge key={s.email} variant="secondary" className="gap-1.5 pl-2 pr-1 py-1 text-foreground">
              <UserCheck className="h-3 w-3" />
              {s.name || s.email}
              <button
                type="button"
                onClick={() => onToggle(s)}
                className="ml-1 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}

/** Seletor de etapa do CRM em formato de input pesquisável (tema claro e escuro) */
function StageSelect({
  stages,
  value,
  onChange,
  placeholder = "Selecionar etapa do CRM...",
  allowClear = true,
}: {
  stages: any[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  allowClear?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = stages.find((s) => s.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-11 w-full items-center justify-between rounded-lg border border-border bg-card px-3 text-sm transition-colors hover:border-primary/40"
        >
          <span className="flex items-center gap-2 truncate">
            <Columns3 className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
            <span className={cn("truncate", !current && "text-muted-foreground")}>
              {current?.name || placeholder}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[--radix-popover-trigger-width] bg-popover text-popover-foreground border-border shadow-lg z-50"
        align="start"
      >
        <Command
          filter={(v, search) => (v.toLowerCase().includes(search.toLowerCase().trim()) ? 1 : 0)}
        >
          <CommandInput placeholder="Buscar etapa..." />
          <CommandList>
            <CommandEmpty>Nenhuma etapa encontrada.</CommandEmpty>
            <CommandGroup>
              {allowClear && (
                <CommandItem
                  value="nao-alterar"
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="gap-2 cursor-pointer rounded-lg px-2 py-2 text-muted-foreground data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
                >
                  <Ban className="h-4 w-4" strokeWidth={1.75} />
                  Não alterar a etapa
                </CommandItem>
              )}
              {stages.map((s) => {
                const on = value === s.id;
                return (
                  <CommandItem
                    key={s.id}
                    value={s.name}
                    onSelect={() => {
                      onChange(s.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "gap-2 cursor-pointer rounded-lg px-2 py-2 text-foreground",
                      "data-[selected=true]:bg-muted data-[selected=true]:text-foreground",
                      on && "bg-primary/10 data-[selected=true]:bg-primary/15",
                    )}
                  >
                    <Columns3
                      className={cn("h-4 w-4", on ? "text-primary" : "text-muted-foreground")}
                      strokeWidth={1.75}
                    />
                    <span className="text-sm text-foreground">{s.name}</span>
                    {on && <Check className="ml-auto h-4 w-4 text-primary" strokeWidth={3} />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}


/** Shell com header e título fixos; scroll apenas no conteúdo da etapa */
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
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [stepKey]);
  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      {/* Header fixo */}
      <div className="shrink-0">
        <div className="flex items-center justify-between gap-4 mb-6">
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

        {/* Título fixo */}
        <div className="text-center mb-6 max-w-3xl mx-auto">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">
            {headline}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {/* Conteúdo com scroll */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto pr-1">
        <AnimatePresence mode="wait">
          <motion.section
            key={stepKey}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-3xl mx-auto pb-6"
          >
            {children}
          </motion.section>
        </AnimatePresence>
      </div>

      {/* Footer fixo */}
      <div className="shrink-0 pt-4 bg-background">
        <div className="max-w-3xl mx-auto">{footer}</div>
      </div>
    </div>
  );
}

export function SDRWizard({ open, onClose, onCreated, editing, variant = "dialog" }: Props) {
  const { user, accountOwnerId } = useAuth();
  const { members } = useAccountMembers();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [aiKeyConnected, setAiKeyConnected] = useState(false);
  const [draft, setDraft] = useState<SdrDraft>(SDR_DEFAULT_DRAFT);
  const [numbers, setNumbers] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [profileLoaded, setProfileLoaded] = useState(false);

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
        ai: { ...SDR_DEFAULT_DRAFT.ai, ...(editing.ai || {}) },
        schedule: { ...SDR_DEFAULT_DRAFT.schedule, ...(editing.schedule || {}) },
        triggers: { ...SDR_DEFAULT_DRAFT.triggers, ...(editing.triggers || {}) },
        personality: { ...SDR_DEFAULT_DRAFT.personality, ...(editing.personality || {}) },
        strategy: { ...SDR_DEFAULT_DRAFT.strategy, ...(editing.strategy || {}) },
        knowledge: { ...SDR_DEFAULT_DRAFT.knowledge, ...(editing.knowledge || {}) },
        closing: { ...SDR_DEFAULT_DRAFT.closing, ...(editing.closing || {}) },
        situations: { ...SDR_DEFAULT_DRAFT.situations, ...(editing.situations || {}) },
      });
    } else {
      const stored = loadSdrDraft();
      if (stored?.draft) {
        setDraft({ ...SDR_DEFAULT_DRAFT, ...stored.draft });
        setStep(Math.min(Math.max(stored.step || 1, 1), STEPS.length));
        toast.info("Rascunho retomado de onde você parou");
      } else {
        setDraft(SDR_DEFAULT_DRAFT);
      }
    }
  }, [open, editing]);

  /** Autosave do rascunho (apenas na criação) */
  useEffect(() => {
    if (!open || editing) return;
    if (!draft.name.trim() && step === 1) return;
    saveSdrDraft(draft, step);
  }, [open, editing, draft, step]);

  useEffect(() => {
    if (!open || !accountOwnerId) return;
    supabase
      .from("user_waba_connections")
      .select("id,nickname,display_phone_number,phone_number_id")
      .eq("owner_user_id", accountOwnerId)
      .then(({ data }) => setNumbers(data ?? []));

    supabase
      .from("pipeline_stages")
      .select("id,name,position")
      .eq("owner_user_id", accountOwnerId)
      .order("position")
      .then(({ data }) => setStages(data ?? []));

    supabase
      .from("wiize_message_templates")
      .select("id,name,body")
      .eq("owner_user_id", accountOwnerId)
      .eq("archived", false)
      .then(({ data }) => setTemplates(data ?? []));
  }, [open, accountOwnerId]);

  /** Puxa o perfil da empresa (e produtos) para pré-preencher o conhecimento */
  useEffect(() => {
    if (!open || !accountOwnerId || editing || profileLoaded) return;
    (async () => {
      const [{ data: profileData }, { data: services }] = await Promise.all([
        supabase
          .from("company_profiles" as any)
          .select("*")
          .eq("user_id", accountOwnerId)
          .maybeSingle(),
        supabase
          .from("company_services")
          .select("name, average_ticket, description")
          .eq("owner_user_id", accountOwnerId),
      ]);
      const p: any = profileData || {};
      setDraft((d) => ({
        ...d,
        knowledge: {
          ...d.knowledge,
          company: d.knowledge.company || p.company_name
            ? [p.company_name, p.company_objective].filter(Boolean).join(". ") || d.knowledge.company
            : d.knowledge.company,
          niche: d.knowledge.niche || p.company_niche || "",
          audience: d.knowledge.audience || p.company_target_audience || "",
          differentials: d.knowledge.differentials || p.company_differential || "",
          products: d.knowledge.products || p.company_products || "",
          products_list:
            services && services.length
              ? services.map((s: any) => ({
                  name: s.name || "",
                  description: s.description || "",
                  when_to_offer: "",
                  price: s.average_ticket ? `R$ ${Number(s.average_ticket).toLocaleString("pt-BR")}` : "",
                }))
              : d.knowledge.products_list,
        },
      }));
      setProfileLoaded(true);
    })();
  }, [open, accountOwnerId, editing, profileLoaded]);

  const set = <K extends keyof SdrDraft>(key: K, value: SdrDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const patch = <K extends keyof SdrDraft>(key: K, value: Partial<SdrDraft[K]>) =>
    setDraft((d) => ({ ...d, [key]: { ...(d[key] as any), ...(value as any) } }));

  const toggleArray = (arr: string[], id: string) =>
    arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];

  const productsValid = draft.knowledge.products_list.every(
    (p) => p.name.trim().length >= 2 && p.description.trim().length >= 5 && p.when_to_offer.trim().length >= 5
  );

  const canProceed = useMemo(() => {
    switch (step) {
      case 1:
        return draft.name.trim().length >= 2;
      case 2:
        return draft.whatsapp_number_ids.length > 0;
      case 3:
        return draft.triggers.activation.length > 0;
      case 6:
        return (
          draft.knowledge.company.trim().length >= 5 &&
          draft.knowledge.niche.trim().length >= 2 &&
          draft.knowledge.audience.trim().length >= 3 &&
          draft.knowledge.differentials.trim().length >= 3
        );
      case 7:
        return draft.knowledge.products_list.length > 0 && productsValid;
      case 9:
        return (
          draft.closing.after_limit_actions.length > 0 &&
          (!draft.closing.after_limit_actions.includes("mover_pipeline") ||
            !!draft.closing.after_limit_stage_id)
        );
      case 11:
        return aiKeyConnected;
      default:
        return true;
    }
  }, [step, draft, productsValid, aiKeyConnected]);

  const handleSave = async () => {
    if (!user || !accountOwnerId) return;
    setSaving(true);
    try {
      const { data: activeAgents, error: activeAgentsError } = await supabase
        .from("sdr_agents" as any)
        .select("id,name,whatsapp_number_ids")
        .eq("owner_user_id", accountOwnerId)
        .eq("status", "active");
      if (activeAgentsError) throw activeAgentsError;
      const existingAgents = (activeAgents ?? []) as unknown as Array<{
        id: string;
        name: string;
        whatsapp_number_ids: string[];
      }>;
      const conflictingAgent = existingAgents.find((agent) =>
        agent.id !== editing?.id &&
        (agent.whatsapp_number_ids ?? []).some((id) => draft.whatsapp_number_ids.includes(id))
      );
      if (conflictingAgent) {
        throw new Error(`Um dos números selecionados já está vinculado ao SDR “${conflictingAgent.name}”.`);
      }
      const payload: any = {
        owner_user_id: accountOwnerId,
        created_by: user.id,
        name: draft.name.trim(),
        objective: draft.objective,
        objective_custom: draft.objective_custom.trim() || null,
        whatsapp_number_ids: draft.whatsapp_number_ids,
        schedule: draft.schedule,
        triggers: draft.triggers,
        personality: { ...draft.personality },
        strategy: draft.strategy,
        knowledge: { ...draft.knowledge, ai: undefined },
        closing: {
          ...draft.closing,
          success_criteria: [SDR_SUCCESS_BY_OBJECTIVE[draft.objective as SdrObjective]],
        },
        situations: draft.situations,
        ai: { provider: "openai", model: draft.ai.model || "gpt-4o-mini" },
      };
      const q = editing
        ? supabase.from("sdr_agents" as any).update(payload).eq("id", editing.id)
        : supabase.from("sdr_agents" as any).insert(payload);
      const { error } = await q;
      if (error) throw error;
      if (!editing) clearSdrDraft();
      toast.success(editing ? "SDR atualizado com sucesso" : "SDR criado com sucesso");
      onCreated();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar SDR");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = () => {
    saveSdrDraft(draft, step);
    toast.success("Rascunho salvo. Ele aparece na lista de SDRs para você continuar depois.");
    onClose();
  };

  const StepIcon = STEPS[step - 1].icon;
  const stepDef = STEPS[step - 1];

  const updateProduct = (i: number, field: string, value: string) =>
    setDraft((d) => ({
      ...d,
      knowledge: {
        ...d.knowledge,
        products_list: d.knowledge.products_list.map((p, idx) =>
          idx === i ? { ...p, [field]: value } : p
        ),
      },
    }));

  const updateFaq = (i: number, field: string, value: string) =>
    setDraft((d) => ({
      ...d,
      knowledge: {
        ...d.knowledge,
        faq_list: d.knowledge.faq_list.map((f, idx) => (idx === i ? { ...f, [field]: value } : f)),
      },
    }));

  const updateLink = (i: number, field: string, value: string) =>
    setDraft((d) => ({
      ...d,
      knowledge: {
        ...d.knowledge,
        links_list: d.knowledge.links_list.map((l, idx) =>
          idx === i ? { ...l, [field]: value } : l
        ),
      },
    }));

  const body = (
    <div className="py-1 space-y-6">
      {/* 1 - Objetivo */}
      {step === 1 && (
        <>
          <div className="space-y-2">
            <IconLabel icon={Bot}>Nome do SDR</IconLabel>
            <IconInput
              icon={Bot}
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex.: SDR Comercial"
            />
          </div>
          <div className="space-y-3">
            <IconLabel icon={Target}>Objetivo principal</IconLabel>
            <CardSelect
              value={draft.objective}
              onChange={(v) => set("objective", v as SdrObjective)}
              options={SDR_OBJECTIVES}
            />
            <p className="text-xs text-muted-foreground">
              Esse será o objetivo buscado em todas as conversas e também o critério de sucesso do SDR.
            </p>
          </div>
        </>
      )}

      {/* 2 - Onde atua */}
      {step === 2 && (
        <>
          <div className="space-y-2">
            <IconLabel icon={Phone}>Números de WhatsApp (Meta)</IconLabel>
            {numbers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum número conectado. Conecte um número Meta em Meta → Números.
              </p>
            ) : (
              <NumbersCombobox
                numbers={numbers}
                selected={draft.whatsapp_number_ids}
                onToggle={(id) =>
                  set("whatsapp_number_ids", toggleArray(draft.whatsapp_number_ids, id))
                }
              />
            )}
          </div>

          <div className="space-y-4">
            <IconLabel icon={Clock}>Horário de atendimento</IconLabel>
            <CardSelect
              cols={2}
              value={draft.schedule.mode}
              onChange={(v) => patch("schedule", { mode: v as any })}
              options={[
                { id: "always", label: "Sempre ativo", hint: "24 horas, todos os dias" },
                { id: "custom", label: "Personalizado", hint: "Dias e horários definidos" },
              ]}
            />
            {draft.schedule.mode === "custom" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <IconLabel icon={CalendarDays}>Dias da semana</IconLabel>
                  <div className="flex flex-wrap gap-2">
                    {SDR_WEEKDAYS.map((d) => {
                      const on = draft.schedule.days.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() =>
                            patch("schedule", {
                              days: on
                                ? draft.schedule.days.filter((x) => x !== d.id)
                                : [...draft.schedule.days, d.id],
                            })
                          }
                          className={cn(
                            "inline-flex items-center gap-2 h-10 px-3 rounded-lg text-sm border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                            on
                              ? "border-primary ring-2 ring-primary/20 shadow-md text-foreground font-semibold"
                              : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          )}
                        >
                          <CalendarDays
                            className={cn("h-4 w-4", on ? "text-primary" : "text-muted-foreground")}
                            strokeWidth={1.75}
                          />
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <IconLabel icon={Clock}>Início</IconLabel>
                    <IconInput
                      type="time"
                      suffix="h"
                      value={draft.schedule.start}
                      onChange={(e) => patch("schedule", { start: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-2">
                      <span className="h-4 w-4" />
                      Fim
                    </Label>
                    <IconInput
                      type="time"
                      suffix="h"
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

      {/* 3 - Ativação */}
      {step === 3 && (
        <>
          <div className="space-y-3">
            <SectionTitle
              icon={Zap}
              title="Gatilhos de ativação"
              hint="Pode marcar mais de um. Por padrão o SDR atua livre no WhatsApp."
            />
            <CardMultiSelect
              values={draft.triggers.activation}
              onToggle={(id) =>
                patch("triggers", { activation: toggleArray(draft.triggers.activation, id) })
              }
              options={SDR_ACTIVATION_TRIGGERS}
            />
          </div>

          <div className="space-y-3">
            <SectionTitle
              icon={Timer}
              title="Tempo para responder"
              hint="Quanto tempo o SDR espera antes de enviar a resposta. Respostas instantâneas entregam menos e parecem robô."
            />
            <CardSelect
              value={draft.triggers.reply_delay}
              onChange={(v) => patch("triggers", { reply_delay: v as any })}
              options={SDR_REPLY_DELAY_OPTIONS}
            />
            {draft.triggers.reply_delay === "smart" && (
              <InfoBox icon={Brain} title="Como a pausa inteligente funciona">
                <p>
                  A IA soma o tempo de leitura da mensagem do contato (20 a 30 segundos para "abrir e
                  ler") com o tempo que um humano levaria para digitar a resposta, com base no tamanho
                  e na complexidade do texto.
                </p>
                <p>
                  O resultado é usado como atraso real do envio, deixando a conversa natural e sem
                  cara de robô.
                </p>
              </InfoBox>
            )}
            {draft.triggers.reply_delay === "custom" && (
              <IconInput
                icon={Timer}
                type="number"
                min={0}
                suffix="s"
                value={draft.triggers.reply_delay_custom_seconds}
                onChange={(e) =>
                  patch("triggers", { reply_delay_custom_seconds: Number(e.target.value) })
                }
                placeholder="Segundos"
              />
            )}
          </div>

          <div className="space-y-2">
            <SectionTitle icon={Repeat} title="Conversas iniciadas pelo SDR" />
            {[
              { key: "outbound_prospect", label: "Prospectar automaticamente", icon: Search },
              { key: "outbound_followup", label: "Fazer follow-up", icon: Repeat },
              { key: "outbound_reactivate", label: "Reativar oportunidades", icon: RefreshCw },
            ].map((o) => (
              <div
                key={o.key}
                className="flex items-center justify-between rounded-xl border border-border p-3"
              >
                <span className="flex items-center gap-2 text-sm text-foreground">
                  <o.icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                  {o.label}
                </span>
                <Switch
                  checked={(draft.triggers as any)[o.key]}
                  onCheckedChange={(v) => patch("triggers", { [o.key]: v } as any)}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* 4 - Como conversa */}
      {step === 4 && (
        <>
          <div className="space-y-3">
            <SectionTitle icon={MessageSquare} title="Tom de voz" hint="Define a forma como ele fala." />
            <CardSelect
              value={draft.personality.tone}
              onChange={(v) => patch("personality", { tone: v as any })}
              options={[
                { id: "consultivo", label: "Consultivo", hint: "Pergunta, escuta e orienta" },
                { id: "profissional", label: "Profissional", hint: "Sério, técnico e direto" },
                { id: "descontraido", label: "Descontraído", hint: "Leve, próximo e informal" },
                { id: "objetivo", label: "Objetivo", hint: "Curto, prático, sem rodeios" },
              ]}
            />
          </div>

          <div className="space-y-3">
            <SectionTitle icon={Gauge} title="Formalidade" />
            <CardSelect
              cols={3}
              value={draft.personality.formality}
              onChange={(v) => patch("personality", { formality: v as any })}
              options={[
                { id: "baixo", label: "Baixa", hint: "Você, linguagem do dia a dia" },
                { id: "medio", label: "Média", hint: "Cordial e profissional" },
                { id: "alto", label: "Alta", hint: "Formal, sem gírias" },
              ]}
            />
          </div>

          <div className="space-y-3">
            <SectionTitle icon={AlignLeft} title="Tamanho das respostas" />
            <CardSelect
              cols={3}
              value={draft.personality.length}
              onChange={(v) => patch("personality", { length: v as any })}
              options={[
                { id: "curtas", label: "Curtas", hint: "Até 2 linhas por mensagem" },
                { id: "medias", label: "Médias", hint: "3 a 4 linhas" },
                { id: "longas", label: "Longas", hint: "Explicações completas" },
              ]}
            />
          </div>

          <div className="space-y-3">
            <SectionTitle icon={Smile} title="Uso de emojis" />
            <CardSelect
              cols={3}
              value={draft.personality.emojis}
              onChange={(v) => patch("personality", { emojis: v as any })}
              options={[
                { id: "nunca", label: "Nunca" },
                { id: "pouco", label: "Pouco", hint: "Só quando faz sentido" },
                { id: "normal", label: "Normal", hint: "Conversa mais leve" },
              ]}
            />
          </div>

          <div className="space-y-3">
            <SectionTitle icon={HelpCircle} title="Perguntas ao lead" />
            <CardSelect
              cols={3}
              value={draft.personality.questions}
              onChange={(v) => patch("personality", { questions: v as any })}
              options={[
                { id: "sempre", label: "Sempre", hint: "Termina toda mensagem perguntando" },
                { id: "quando_necessario", label: "Quando necessário" },
                { id: "evitar", label: "Evitar", hint: "Só afirma e conduz" },
              ]}
            />
          </div>

          <InfoBox icon={ShieldCheck} title="Regras obrigatórias do SDR">
            <p>• O SDR sempre conduz a conversa e nunca devolve o comando ao lead.</p>
            <p>• Ele nunca espera o lead decidir sozinho: toda mensagem termina com um próximo passo.</p>
            <p>• Uma pergunta por vez, sem textão e sem inventar informação.</p>
          </InfoBox>
        </>
      )}

      {/* 5 - Estratégia */}
      {step === 5 && (
        <>
          <div className="space-y-3">
            <SectionTitle
              icon={Brain}
              title="Lógica de prioridades da IA"
              hint="É assim que ele conduz toda conversa, na ordem."
            />
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <div className="flex flex-col gap-2">
                {SDR_PRIORITIES.map((p, i) => {
                  const Icon = iconFor(p.id);
                  return (
                    <div key={p.id} className="flex flex-col">
                      <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                        <span className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {i + 1}. {p.label}
                          </p>
                          <p className="text-xs text-muted-foreground">{p.hint}</p>
                        </div>
                      </div>
                      {i < SDR_PRIORITIES.length - 1 && (
                        <div className="flex justify-center py-1">
                          <ArrowDown className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <SectionTitle
              icon={TrendingUp}
              title="Pode insistir?"
              hint="Define quantas vezes o SDR tenta contornar um 'agora não' antes de recuar."
            />
            <CardSelect
              cols={3}
              value={draft.strategy.insistence}
              onChange={(v) => patch("strategy", { insistence: v as any })}
              options={SDR_INSISTENCE_OPTIONS}
            />
          </div>

          <div className="space-y-3">
            <SectionTitle
              icon={Target}
              title="Quando voltar ao objetivo?"
              hint="Depois de responder uma dúvida ou desviar de assunto, em que momento ele retoma o objetivo principal."
            />
            <CardSelect
              cols={3}
              value={draft.strategy.return_to_goal}
              onChange={(v) => patch("strategy", { return_to_goal: v as any })}
              options={SDR_RETURN_OPTIONS}
            />
          </div>

          <div className="space-y-3">
            <SectionTitle
              icon={ShieldCheck}
              title="Se surgir objeção"
              hint="Como o SDR reage quando o lead trava (preço, tempo, confiança ou concorrente)."
            />
            <CardSelect
              value={draft.strategy.on_objection}
              onChange={(v) => patch("strategy", { on_objection: v as any })}
              options={SDR_OBJECTION_OPTIONS}
            />
            {draft.strategy.on_objection === "vendedor" && (
              <div className="space-y-2">
                <IconLabel icon={UserCheck}>Qual vendedor deve assumir?</IconLabel>
                <SellersCombobox
                  members={members}
                  selected={draft.strategy.handoff_sellers}
                  onToggle={(seller) =>
                    patch("strategy", {
                      handoff_sellers: draft.strategy.handoff_sellers.some(
                        (x) => x.email === seller.email
                      )
                        ? draft.strategy.handoff_sellers.filter((x) => x.email !== seller.email)
                        : [...draft.strategy.handoff_sellers, seller],
                    })
                  }
                  placeholder="Selecionar vendedor..."
                />
                <p className="text-xs text-muted-foreground">
                  Ao transferir, o vendedor recebe um e-mail com o resumo, o número do lead e o número
                  de WhatsApp usado na conversa, e passa a ser o responsável pela conversa no chat.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <SectionTitle
              icon={UserCheck}
              title="Quem recebe as reuniões marcadas"
              hint="O SDR consulta a agenda desses vendedores, oferece apenas horários livres e cria o compromisso no responsável escolhido."
            />
            <SellersCombobox
              members={members}
              selected={draft.strategy.meeting_sellers}
              onToggle={(seller) =>
                patch("strategy", {
                  meeting_sellers: draft.strategy.meeting_sellers.some((x) => x.email === seller.email)
                    ? draft.strategy.meeting_sellers.filter((x) => x.email !== seller.email)
                    : [...draft.strategy.meeting_sellers, seller],
                })
              }
              placeholder="Selecionar vendedores..."
            />
            <CardSelect
              cols={2}
              value={draft.strategy.meeting_distribution}
              onChange={(v) => patch("strategy", { meeting_distribution: v as any })}
              options={[
                {
                  id: "round_robin",
                  label: "Distribuir igualmente",
                  hint: "Cada nova reunião vai para o vendedor com menos compromissos futuros",
                },
                {
                  id: "fixo",
                  label: "Sempre o primeiro",
                  hint: "Todas as reuniões vão para o primeiro vendedor da lista",
                },
              ]}
            />
            {stages.length > 0 && (
              <div className="space-y-2">
                <IconLabel icon={Target}>Etapa do CRM quando a reunião for marcada</IconLabel>
                <div className="flex flex-wrap gap-2">
                  {stages.map((s) => {
                    const on = draft.closing.meeting_stage_id === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() =>
                          patch("closing", { meeting_stage_id: on ? "" : s.id })
                        }
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-xs transition-colors",
                          on
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40",
                        )}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
                <IconLabel icon={UserCheck}>Etapa do CRM ao transferir para um humano</IconLabel>
                <div className="flex flex-wrap gap-2">
                  {stages.map((s) => {
                    const on = draft.closing.handoff_stage_id === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() =>
                          patch("closing", { handoff_stage_id: on ? "" : s.id })
                        }
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-xs transition-colors",
                          on
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40",
                        )}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* 6 - Empresa */}
      {step === 6 && (
        <>
          <InfoBox icon={Sparkles} title="Preenchemos com o perfil da sua empresa">
            <p>
              Puxamos o que já existe no seu perfil da Wiize. Complete o que faltar, pois esses dados também
              deixam sua prospecção mais precisa.
            </p>
          </InfoBox>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <IconLabel icon={Building2}>Sobre a empresa</IconLabel>
              <Textarea
                rows={4}
                value={draft.knowledge.company}
                onChange={(e) => patch("knowledge", { company: e.target.value })}
                placeholder="O que a empresa faz, há quanto tempo e qual resultado entrega"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <IconLabel icon={Target}>Nicho</IconLabel>
                <IconInput
                  icon={Target}
                  value={draft.knowledge.niche}
                  onChange={(e) => patch("knowledge", { niche: e.target.value })}
                  placeholder="Ex.: Marketing digital"
                />
              </div>
              <div className="space-y-1.5">
                <IconLabel icon={Users}>Público-alvo</IconLabel>
                <IconInput
                  icon={Users}
                  value={draft.knowledge.audience}
                  onChange={(e) => patch("knowledge", { audience: e.target.value })}
                  placeholder="Ex.: Clínicas e consultórios"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <IconLabel icon={Sparkles}>Diferenciais</IconLabel>
              <Textarea
                rows={3}
                value={draft.knowledge.differentials}
                onChange={(e) => patch("knowledge", { differentials: e.target.value })}
                placeholder="Por que escolher a sua empresa e não a concorrência"
              />
            </div>
          </div>
        </>
      )}

      {/* 7 - Produtos */}
      {step === 7 && (
        <div className="space-y-4">
          <InfoBox icon={Package} title="Cada produto precisa de contexto">
            <p>
              Descreva o produto e, principalmente, <strong>quando ele deve ser oferecido</strong>. É
              assim que o SDR escolhe a oferta certa para cada lead.
            </p>
          </InfoBox>
          {draft.knowledge.products_list.map((p, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <SectionTitle icon={Package} title={`Produto ${i + 1}`} />
                {draft.knowledge.products_list.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      patch("knowledge", {
                        products_list: draft.knowledge.products_list.filter((_, idx) => idx !== i),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <IconLabel icon={Tag}>Nome</IconLabel>
                  <IconInput
                    icon={Tag}
                    value={p.name}
                    onChange={(e) => updateProduct(i, "name", e.target.value)}
                    placeholder="Ex.: Gestão de tráfego"
                  />
                </div>
                <div className="space-y-1.5">
                  <IconLabel icon={DollarSign}>Preço / ticket</IconLabel>
                  <IconInput
                    icon={DollarSign}
                    value={p.price}
                    onChange={(e) => updateProduct(i, "price", e.target.value)}
                    placeholder="Ex.: R$ 1.500/mês"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <IconLabel icon={FileText}>O que é e o que resolve</IconLabel>
                <Textarea
                  rows={2}
                  value={p.description}
                  onChange={(e) => updateProduct(i, "description", e.target.value)}
                  placeholder="Explique de forma simples o que entrega"
                />
              </div>
              <div className="space-y-1.5">
                <IconLabel icon={Lightbulb}>Quando oferecer</IconLabel>
                <Textarea
                  rows={2}
                  value={p.when_to_offer}
                  onChange={(e) => updateProduct(i, "when_to_offer", e.target.value)}
                  placeholder="Ex.: quando o lead diz que não tem clientes suficientes"
                />
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() =>
              patch("knowledge", {
                products_list: [
                  ...draft.knowledge.products_list,
                  { name: "", description: "", when_to_offer: "", price: "" },
                ],
              })
            }
          >
            <Plus className="h-4 w-4 mr-2" /> Adicionar produto
          </Button>
          {!productsValid && (
            <p className="text-xs text-muted-foreground text-center">
              Todos os campos de produto são obrigatórios (exceto preço).
            </p>
          )}
        </div>
      )}

      {/* 8 - Materiais */}
      {step === 8 && (
        <div className="space-y-5">
          <div className="space-y-3">
            <SectionTitle
              icon={MessagesSquare}
              title="Perguntas frequentes"
              hint="Escreva a pergunta possível e a resposta oficial. A IA usa isso para responder sem inventar."
            />
            {draft.knowledge.faq_list.map((f, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <IconInput
                    icon={HelpCircle}
                    className="flex-1"
                    value={f.question}
                    onChange={(e) => updateFaq(i, "question", e.target.value)}
                    placeholder="Pergunta do lead. Ex.: vocês atendem em todo o Brasil?"
                  />
                  {draft.knowledge.faq_list.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        patch("knowledge", {
                          faq_list: draft.knowledge.faq_list.filter((_, idx) => idx !== i),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Textarea
                  rows={2}
                  value={f.answer}
                  onChange={(e) => updateFaq(i, "answer", e.target.value)}
                  placeholder="Resposta que o SDR deve dar"
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() =>
                patch("knowledge", {
                  faq_list: [...draft.knowledge.faq_list, { question: "", answer: "" }],
                })
              }
            >
              <Plus className="h-4 w-4 mr-2" /> Adicionar pergunta
            </Button>
          </div>

          {[
            { key: "policies", label: "Políticas", icon: ShieldCheck, ph: "Garantia, cancelamento, prazos" },
            { key: "cases", label: "Cases e provas sociais", icon: TrendingUp, ph: "Resultados de clientes" },
            { key: "competitors", label: "Concorrentes", icon: Columns3, ph: "Como se comparar" },
          ].map((f) => (
            <div key={f.key} className="space-y-1.5">
              <IconLabel icon={f.icon}>{f.label}</IconLabel>
              <Textarea
                rows={3}
                value={(draft.knowledge as any)[f.key]}
                onChange={(e) => patch("knowledge", { [f.key]: e.target.value } as any)}
                placeholder={f.ph}
              />
            </div>
          ))}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <IconLabel icon={Globe}>Site</IconLabel>
              <IconInput
                icon={Globe}
                value={draft.knowledge.site}
                onChange={(e) => patch("knowledge", { site: e.target.value })}
                placeholder="https://"
              />
            </div>
            <div className="space-y-1.5">
              <IconLabel icon={Instagram}>Instagram</IconLabel>
              <IconInput
                icon={Instagram}
                value={draft.knowledge.instagram}
                onChange={(e) => patch("knowledge", { instagram: e.target.value })}
                placeholder="@empresa"
              />
            </div>
          </div>

          <div className="space-y-3">
            <SectionTitle icon={Link2} title="Links de apoio" hint="Informe o link e quando usá-lo." />
            {draft.knowledge.links_list.map((l, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <IconInput
                    icon={Link2}
                    className="flex-1"
                    value={l.url}
                    onChange={(e) => updateLink(i, "url", e.target.value)}
                    placeholder="https://..."
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      patch("knowledge", {
                        links_list: draft.knowledge.links_list.filter((_, idx) => idx !== i),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <IconInput
                  icon={Lightbulb}
                  value={l.when_to_use}
                  onChange={(e) => updateLink(i, "when_to_use", e.target.value)}
                  placeholder="Quando usar esse link"
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() =>
                patch("knowledge", {
                  links_list: [...draft.knowledge.links_list, { url: "", when_to_use: "" }],
                })
              }
            >
              <Plus className="h-4 w-4 mr-2" /> Adicionar link
            </Button>
          </div>
        </div>
      )}

      {/* 9 - Encerramento */}
      {step === 9 && (
        <>
          <div className="space-y-3">
            <SectionTitle icon={Flag} title="Critério de sucesso" hint="Definido pelo objetivo do SDR." />
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
              <span className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Lock className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {SDR_SUCCESS_BY_OBJECTIVE[draft.objective as SdrObjective]}
                </p>
                <p className="text-xs text-muted-foreground">
                  Para alterar, mude o objetivo na primeira etapa.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <SectionTitle
              icon={Ban}
              title="Quando parar"
              hint="Situações em que o SDR encerra a abordagem e para de enviar mensagens."
            />
            <CardMultiSelect
              values={draft.closing.stop_criteria}
              onToggle={(id) =>
                patch("closing", { stop_criteria: toggleArray(draft.closing.stop_criteria, id) })
              }
              options={SDR_STOP_OPTIONS}
            />
            {draft.closing.stop_criteria.includes("sem_resposta") && (
              <div className="space-y-1.5">
                <IconLabel icon={Hourglass}>Parar após quantas horas sem resposta?</IconLabel>
                <IconInput
                  icon={Hourglass}
                  type="number"
                  min={1}
                  suffix="h"
                  value={draft.closing.stop_no_reply_hours}
                  onChange={(e) =>
                    patch("closing", { stop_no_reply_hours: Number(e.target.value) })
                  }
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <SectionTitle
              icon={Repeat}
              title="Modo de follow-up"
              hint="Como o SDR retoma o contato quando o lead some no meio da conversa."
            />
            <CardSelect
              cols={2}
              value={draft.closing.followup_mode}
              onChange={(v) => patch("closing", { followup_mode: v as any })}
              options={[
                {
                  id: "inteligente",
                  label: "Inteligente",
                  hint: "A IA escreve e decide o melhor momento",
                },
                { id: "manual", label: "Manual", hint: "Você define intervalos e templates" },
              ]}
            />
            {draft.closing.followup_mode === "inteligente" ? (
              <>
                <InfoBox icon={Brain} title="Como funciona o follow-up inteligente">
                  <p>
                    A IA escolhe o intervalo dentro da faixa configurada, varia o horário para parecer
                    humano e envia sempre dentro do horário de atendimento.
                  </p>
                  <p>As mensagens são criadas por ela conforme o contexto da conversa.</p>
                </InfoBox>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <IconLabel icon={Hourglass}>Intervalo mínimo</IconLabel>
                    <IconInput
                      icon={Hourglass}
                      type="number"
                      min={1}
                      suffix="h"
                      value={draft.closing.followup_min_hours}
                      onChange={(e) =>
                        patch("closing", { followup_min_hours: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <IconLabel icon={Hourglass}>Intervalo máximo</IconLabel>
                    <IconInput
                      icon={Hourglass}
                      type="number"
                      min={1}
                      suffix="h"
                      value={draft.closing.followup_max_hours}
                      onChange={(e) =>
                        patch("closing", { followup_max_hours: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <IconLabel icon={Repeat}>Máximo de follow-ups</IconLabel>
                    <IconInput
                      icon={Repeat}
                      type="number"
                      min={0}
                      max={10}
                      value={draft.closing.followup_max}
                      onChange={(e) => patch("closing", { followup_max: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <IconLabel icon={Repeat}>Máximo de follow-ups</IconLabel>
                    <IconInput
                      icon={Repeat}
                      type="number"
                      min={0}
                      max={10}
                      value={draft.closing.followup_max}
                      onChange={(e) => patch("closing", { followup_max: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <IconLabel icon={Hourglass}>Intervalo entre eles</IconLabel>
                    <IconInput
                      icon={Hourglass}
                      type="number"
                      min={1}
                      suffix="h"
                      value={draft.closing.followup_interval_hours}
                      onChange={(e) =>
                        patch("closing", { followup_interval_hours: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <IconLabel icon={FileText}>Templates aprovados da Meta</IconLabel>
                  {templates.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Nenhum template encontrado. Cadastre em Meta → Templates.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {templates.map((t) => {
                        const on = draft.closing.followup_templates.includes(t.id);
                        return (
                          <label
                            key={t.id}
                            className={cn(
                              "flex items-start gap-3 rounded-xl border bg-card p-3 cursor-pointer transition-all",
                              on
                                ? "border-primary ring-2 ring-primary/20"
                                : "border-border hover:border-primary/40"
                            )}
                          >
                            <Checkbox
                              checked={on}
                              onCheckedChange={() =>
                                patch("closing", {
                                  followup_templates: toggleArray(
                                    draft.closing.followup_templates,
                                    t.id
                                  ),
                                })
                              }
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-foreground">
                                {t.name}
                              </span>
                              <span className="block text-xs text-muted-foreground line-clamp-2">
                                {t.body}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="space-y-3">
            <SectionTitle
              icon={BellRing}
              title="Avisar vendedor ao encerrar"
              hint="Opcional. Quem for marcado recebe um e-mail com o resumo da conversa e o próximo passo."
            />
            <SellersCombobox
              members={members}
              selected={draft.closing.notify_sellers}
              onToggle={(seller) =>
                patch("closing", {
                  notify_sellers: draft.closing.notify_sellers.some((x) => x.email === seller.email)
                    ? draft.closing.notify_sellers.filter((x) => x.email !== seller.email)
                    : [...draft.closing.notify_sellers, seller],
                })
              }
            />
          </div>

          <div className="space-y-3">
            <SectionTitle
              icon={Archive}
              title="O que fazer com o lead"
              hint="Pode combinar arquivar e mover no pipeline."
            />
            <CardMultiSelect
              cols={2}
              values={draft.closing.after_limit_actions}
              onToggle={(id) =>
                patch("closing", {
                  after_limit_actions: toggleArray(draft.closing.after_limit_actions, id),
                })
              }
              options={[
                { id: "arquivar", label: "Arquivar", hint: "Some da lista ativa" },
                { id: "mover_pipeline", label: "Mover no pipeline", hint: "Escolha a coluna" },
              ]}
            />
            {draft.closing.after_limit_actions.includes("mover_pipeline") && (
              <div className="space-y-2">
                <IconLabel icon={Columns3}>Coluna de destino</IconLabel>
                <div className="flex flex-wrap gap-2">
                  {stages.map((s) => {
                    const on = draft.closing.after_limit_stage_id === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => patch("closing", { after_limit_stage_id: s.id })}
                        className={cn(
                          "inline-flex items-center gap-2 h-10 px-3.5 rounded-lg text-sm border bg-card transition-all hover:-translate-y-0.5 hover:shadow-md",
                          on
                            ? "border-primary ring-2 ring-primary/20 shadow-md text-foreground font-semibold"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        <Columns3
                          className={cn("h-4 w-4", on ? "text-primary" : "text-muted-foreground")}
                          strokeWidth={1.75}
                        />
                        {s.name}
                      </button>
                    );
                  })}
                  {stages.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhuma coluna encontrada no CRM.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* 10 - Situações */}
      {step === 10 && (
        <div className="space-y-6">
          {SDR_SITUATIONS.map((s) => (
            <div key={s.id} className="space-y-3">
              <SectionTitle icon={iconFor(s.options[0].id)} title={s.label} />
              <CardSelect
                value={draft.situations[s.id] ?? s.options[0].id}
                onChange={(v) => set("situations", { ...draft.situations, [s.id]: v })}
                options={s.options}
              />
            </div>
          ))}
          <InfoBox icon={Lock} title="Regra fixa de preço">
            <p>
              Quando "Nunca falar preço sem marcar reunião" está ativo, o SDR só apresenta valores
              depois que a reunião estiver agendada.
            </p>
          </InfoBox>
        </div>
      )}

      {/* 11 - Inteligência */}
      {step === 11 && (
        <SDRIntelligenceStep
          model={draft.ai.model}
          onModelChange={(m) => patch("ai", { model: m })}
          onConnectedChange={setAiKeyConnected}
        />
      )}

      {/* 12 - Revisão */}
      {step === 12 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-4 p-5 border-b border-border bg-muted/30">
            <span className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Bot className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-semibold text-foreground truncate">
                {draft.name || "SDR sem nome"}
              </p>
              <p className="text-sm text-muted-foreground">
                {SDR_OBJECTIVE_LABEL(draft.objective)} · tom {draft.personality.tone} · GPT (
                {draft.ai.model})
              </p>
            </div>
            <Badge variant="secondary" className="ml-auto gap-1 hidden sm:flex">
              <CheckCircle2 className="h-3 w-3" /> Pronto para ativar
            </Badge>
          </div>

          <div className="p-5 space-y-5">
            {[
              {
                title: "Objetivo e sucesso",
                icon: Target,
                rows: [
                  { label: "Objetivo", value: SDR_OBJECTIVE_LABEL(draft.objective) },
                  {
                    label: "Critério de sucesso",
                    value: SDR_SUCCESS_BY_OBJECTIVE[draft.objective as SdrObjective],
                  },
                ],
              },
              {
                title: "Onde atua",
                icon: Phone,
                rows: [
                  {
                    label: "Números",
                    value:
                      draft.whatsapp_number_ids
                        .map(
                          (id) =>
                            numbers.find((n) => n.id === id)?.nickname ||
                            numbers.find((n) => n.id === id)?.display_phone_number ||
                            "Número"
                        )
                        .join(", ") || "Nenhum número",
                  },
                  {
                    label: "Horário",
                    value:
                      draft.schedule.mode === "always"
                        ? "Sempre ativo (24h)"
                        : `${draft.schedule.days
                            .map((d) => SDR_WEEKDAYS.find((w) => w.id === d)?.label)
                            .filter(Boolean)
                            .join(", ")} · ${draft.schedule.start}h às ${draft.schedule.end}h`,
                  },
                ],
              },
              {
                title: "Ativação e ritmo",
                icon: Zap,
                rows: [
                  {
                    label: "Gatilhos",
                    value:
                      draft.triggers.activation
                        .map((a) => SDR_ACTIVATION_TRIGGERS.find((t) => t.id === a)?.label)
                        .filter(Boolean)
                        .join(", ") || "Não definido",
                  },
                  {
                    label: "Tempo de resposta",
                    value:
                      draft.triggers.reply_delay === "custom"
                        ? `${draft.triggers.reply_delay_custom_seconds} segundos`
                        : SDR_REPLY_DELAY_OPTIONS.find((o) => o.id === draft.triggers.reply_delay)
                            ?.label || "Não definido",
                  },
                ],
              },
              {
                title: "Estratégia",
                icon: Brain,
                rows: [
                  {
                    label: "Insistência",
                    value:
                      SDR_INSISTENCE_OPTIONS.find((o) => o.id === draft.strategy.insistence)?.label ||
                      "Não definido",
                  },
                  {
                    label: "Objeções",
                    value:
                      SDR_OBJECTION_OPTIONS.find((o) => o.id === draft.strategy.on_objection)?.label ||
                      "Não definido",
                  },
                  {
                    label: "Vendedor no handoff",
                    value:
                      draft.strategy.handoff_sellers.map((v) => v.name || v.email).join(", ") ||
                      "Não aplicável",
                  },
                ],
              },
              {
                title: "Conhecimento",
                icon: BookOpen,
                rows: [
                  { label: "Empresa", value: draft.knowledge.company || "Não informado" },
                  {
                    label: "Produtos",
                    value:
                      draft.knowledge.products_list
                        .filter((pr) => pr.name)
                        .map((pr) => pr.name)
                        .join(", ") || "Nenhum produto",
                  },
                  {
                    label: "FAQ",
                    value: `${draft.knowledge.faq_list.filter((f) => f.question && f.answer).length} pergunta(s) cadastrada(s)`,
                  },
                ],
              },
              {
                title: "Encerramento",
                icon: Flag,
                rows: [
                  {
                    label: "Follow-up",
                    value: `${draft.closing.followup_mode === "inteligente" ? "Inteligente" : "Manual"} · até ${draft.closing.followup_max} tentativa(s)`,
                  },
                  {
                    label: "Avisar vendedor",
                    value:
                      draft.closing.notify_sellers.map((v) => v.name || v.email).join(", ") ||
                      "Ninguém selecionado",
                  },
                  {
                    label: "Ao encerrar",
                    value:
                      draft.closing.after_limit_actions
                        .map((a) =>
                          a === "arquivar"
                            ? "Arquivar lead"
                            : `Mover para ${stages.find((st) => st.id === draft.closing.after_limit_stage_id)?.name || "pipeline"}`
                        )
                        .join(" + ") || "Não definido",
                  },
                ],
              },
            ].map((block) => (
              <div key={block.title} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <block.icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <p className="text-sm font-semibold text-foreground">{block.title}</p>
                </div>
                <div className="rounded-xl border border-border divide-y divide-border">
                  {block.rows.map((row) => (
                    <div
                      key={row.label}
                      className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 px-4 py-3"
                    >
                      <p className="text-xs uppercase tracking-wide text-muted-foreground sm:w-44 shrink-0">
                        {row.label}
                      </p>
                      <p className="text-sm text-foreground break-words">{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const isPage = variant === "page";

  const footer = isPage ? (
    <div className="flex items-center justify-between border-t border-border pt-5">
      <Button
        variant="ghost"
        onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
        disabled={saving}
        className="text-muted-foreground hover:text-foreground"
      >
        {step === 1 ? "Cancelar" : "Voltar"}
      </Button>
      <div className="flex items-center gap-2">
        {!editing && (
          <Button variant="outline" onClick={handleSaveDraft} disabled={saving} className="h-11 gap-2">
            <Save className="h-4 w-4" />
            Salvar rascunho
          </Button>
        )}
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
