import type { CalendarEvent } from "@/lib/calendarConfig";

/** Helpers puros de data usados pelas visualizações da Agenda. */

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const endOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

export const addDays = (d: Date, days: number) => {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
};

export const startOfWeek = (d: Date) => addDays(startOfDay(d), -d.getDay());
export const endOfWeek = (d: Date) => endOfDay(addDays(startOfWeek(d), 6));

export const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
export const endOfMonth = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
});
const timeFmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
const monthFmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

export const formatLongDate = (d: Date) => dateFmt.format(d);
export const formatTime = (iso: string) => timeFmt.format(new Date(iso));
export const formatMonth = (d: Date) => monthFmt.format(d);

/** Rótulo relativo amigável para a agenda contínua. */
export const relativeDayLabel = (d: Date) => {
  const today = startOfDay(new Date());
  const diff = Math.round((startOfDay(d).getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  if (diff === -1) return "Ontem";
  if (diff > 1 && diff <= 7) return `Em ${diff} dias`;
  return null;
};

export interface DayGroup {
  key: string;
  date: Date;
  events: CalendarEvent[];
}

/** Agrupa eventos por dia, mantendo ordem cronológica. */
export const groupByDay = (events: CalendarEvent[]): DayGroup[] => {
  const map = new Map<string, DayGroup>();
  for (const ev of events) {
    const date = startOfDay(new Date(ev.starts_at));
    const key = dayKey(date);
    if (!map.has(key)) map.set(key, { key, date, events: [] });
    map.get(key)!.events.push(ev);
  }
  return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
};

/** Grade de 6 semanas para a visualização mensal. */
export const buildMonthGrid = (reference: Date): Date[] => {
  const first = startOfWeek(startOfMonth(reference));
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
};

export const eventsOfDay = (events: CalendarEvent[], date: Date) =>
  events.filter((e) => isSameDay(new Date(e.starts_at), date));
