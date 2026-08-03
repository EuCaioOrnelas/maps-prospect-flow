import {
  CalendarDays,
  Presentation,
  Phone,
  RotateCcw,
  MapPin,
  CircleDot,
  type LucideIcon,
} from "lucide-react";

/**
 * Configuração central da Agenda Wiize.
 * Mantém tipos, rótulos, cores e helpers de horário em um único lugar
 * para que UI, hooks e (futuramente) o SDR compartilhem a mesma fonte.
 */

export const CALENDAR_TIMEZONE = "America/Sao_Paulo";

export type CalendarEventType =
  | "meeting"
  | "demo"
  | "call"
  | "followup"
  | "visit"
  | "other";

export type CalendarEventStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type CalendarEventSource = "manual" | "sdr" | "flow" | "import";

export interface CalendarEvent {
  id: string;
  owner_user_id: string;
  assigned_user_id: string;
  created_by: string | null;
  title: string;
  description: string | null;
  event_type: CalendarEventType;
  status: CalendarEventStatus;
  source: CalendarEventSource;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  timezone: string;
  lead_id: string | null;
  conversation_id: string | null;
  sdr_agent_id: string | null;
  contact_name: string | null;
  company_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  location: string | null;
  notes: string | null;
  lead_origin: string | null;
  reminders: unknown;
  conference_provider: string | null;
  conference_url: string | null;
  external_calendar_provider: string | null;
  external_event_id: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
}

interface TypeMeta {
  value: CalendarEventType;
  label: string;
  icon: LucideIcon;
  /** classes de cor semânticas (funcionam em tema claro e escuro) */
  dot: string;
  chip: string;
  bar: string;
}

export const EVENT_TYPES: TypeMeta[] = [
  {
    value: "meeting",
    label: "Reunião",
    icon: CalendarDays,
    dot: "bg-primary",
    chip: "bg-primary/10 text-primary border-primary/20",
    bar: "border-l-primary bg-primary/5",
  },
  {
    value: "demo",
    label: "Demonstração",
    icon: Presentation,
    dot: "bg-violet-500",
    chip: "bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-500/20",
    bar: "border-l-violet-500 bg-violet-500/5",
  },
  {
    value: "call",
    label: "Ligação",
    icon: Phone,
    dot: "bg-sky-500",
    chip: "bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/20",
    bar: "border-l-sky-500 bg-sky-500/5",
  },
  {
    value: "followup",
    label: "Follow-up",
    icon: RotateCcw,
    dot: "bg-amber-500",
    chip: "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20",
    bar: "border-l-amber-500 bg-amber-500/5",
  },
  {
    value: "visit",
    label: "Visita",
    icon: MapPin,
    dot: "bg-rose-500",
    chip: "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20",
    bar: "border-l-rose-500 bg-rose-500/5",
  },
  {
    value: "other",
    label: "Outro",
    icon: CircleDot,
    dot: "bg-muted-foreground",
    chip: "bg-muted text-muted-foreground border-border",
    bar: "border-l-muted-foreground bg-muted/40",
  },
];

export const getEventType = (value?: string | null): TypeMeta =>
  EVENT_TYPES.find((t) => t.value === value) ?? EVENT_TYPES[EVENT_TYPES.length - 1];

interface StatusMeta {
  value: CalendarEventStatus;
  label: string;
  chip: string;
}

export const EVENT_STATUSES: StatusMeta[] = [
  { value: "scheduled", label: "Agendado", chip: "bg-muted text-muted-foreground border-border" },
  { value: "confirmed", label: "Confirmado", chip: "bg-primary/10 text-primary border-primary/20" },
  {
    value: "completed",
    label: "Concluído",
    chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20",
  },
  {
    value: "cancelled",
    label: "Cancelado",
    chip: "bg-destructive/10 text-destructive border-destructive/20",
  },
  {
    value: "no_show",
    label: "Não compareceu",
    chip: "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20",
  },
];

export const getEventStatus = (value?: string | null): StatusMeta =>
  EVENT_STATUSES.find((s) => s.value === value) ?? EVENT_STATUSES[0];

export const EVENT_SOURCE_LABELS: Record<CalendarEventSource, string> = {
  manual: "Criado manualmente",
  sdr: "Criado pelo SDR Inteligente",
  flow: "Criado por fluxo",
  import: "Importado",
};

export const DURATION_OPTIONS = [15, 30, 45, 60, 90] as const;

export const REMINDER_OPTIONS = [
  { value: 10, label: "10 minutos antes" },
  { value: 30, label: "30 minutos antes" },
  { value: 60, label: "1 hora antes" },
  { value: 1440, label: "1 dia antes" },
];

/** Faixa de horas exibida nas visualizações de dia e semana. */
export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 21;

export const pad = (n: number) => String(n).padStart(2, "0");

export const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const toTimeInput = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const combineDateTime = (date: string, time: string) =>
  new Date(`${date}T${time}:00`);

export const addMinutes = (date: Date, minutes: number) =>
  new Date(date.getTime() + minutes * 60_000);

export const minutesBetween = (a: string, b: string) =>
  Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60_000));

export const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${pad(m)}` : `${h}h`;
};

/** Dois intervalos se sobrepõem? Usado para pré-checagem no cliente. */
export const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
  aStart < bEnd && bStart < aEnd;
