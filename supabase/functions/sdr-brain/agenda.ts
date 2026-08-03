/**
 * Ponte entre o SDR Inteligente e a Agenda Wiize.
 *
 * Responsável por calcular horários realmente livres do responsável,
 * validar o horário escolhido pela IA e criar o compromisso.
 * Fuso fixo America/Sao_Paulo (UTC-3, sem horário de verão).
 */

const TZ_OFFSET_MS = -3 * 60 * 60 * 1000;
export const CALENDAR_TIMEZONE = "America/Sao_Paulo";

const WEEKDAY_LABEL = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export interface FreeSlot {
  /** Início em ISO UTC — é o valor que a IA deve devolver. */
  iso: string;
  /** Rótulo humano em pt-BR, ex.: "quarta (05/08) às 10:00". */
  label: string;
}

/** Converte um instante UTC para as partes do relógio de São Paulo. */
function toLocalParts(date: Date) {
  const local = new Date(date.getTime() + TZ_OFFSET_MS);
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth(),
    day: local.getUTCDate(),
    hours: local.getUTCHours(),
    minutes: local.getUTCMinutes(),
    weekday: local.getUTCDay(),
  };
}

/** Cria um instante UTC a partir de uma data/hora local de São Paulo. */
function fromLocal(year: number, month: number, day: number, hours: number, minutes: number) {
  return new Date(Date.UTC(year, month, day, hours, minutes, 0, 0) - TZ_OFFSET_MS);
}

function parseHm(value: unknown, fallback: string) {
  const raw = typeof value === "string" && /^\d{1,2}:\d{2}$/.test(value) ? value : fallback;
  const [h, m] = raw.split(":").map((n) => parseInt(n, 10));
  return { h, m };
}

export function formatSlotLabel(iso: string) {
  const p = toLocalParts(new Date(iso));
  const dd = String(p.day).padStart(2, "0");
  const mm = String(p.month + 1).padStart(2, "0");
  const hh = String(p.hours).padStart(2, "0");
  const mi = String(p.minutes).padStart(2, "0");
  return `${WEEKDAY_LABEL[p.weekday]} (${dd}/${mm}) às ${hh}:${mi}`;
}

interface BusyBlock {
  start: number;
  end: number;
}

/**
 * Calcula horários livres do responsável respeitando o horário de
 * atendimento configurado no SDR e os compromissos já existentes.
 */
export function buildFreeSlots(opts: {
  schedule: any;
  busy: BusyBlock[];
  durationMinutes?: number;
  daysAhead?: number;
  minLeadMinutes?: number;
  maxSlots?: number;
  now?: Date;
}): FreeSlot[] {
  const duration = (opts.durationMinutes ?? 60) * 60_000;
  const daysAhead = opts.daysAhead ?? 10;
  const minLead = (opts.minLeadMinutes ?? 120) * 60_000;
  const maxSlots = opts.maxSlots ?? 8;
  const now = opts.now ?? new Date();
  const earliest = now.getTime() + minLead;

  const schedule = opts.schedule ?? {};
  const always = schedule.mode !== "custom";
  const days: number[] = Array.isArray(schedule.days) && schedule.days.length
    ? schedule.days.map((d: unknown) => Number(d))
    : [1, 2, 3, 4, 5];
  const start = parseHm(schedule.start, always ? "09:00" : "08:30");
  const end = parseHm(schedule.end, always ? "18:00" : "18:00");

  const slots: FreeSlot[] = [];
  const base = toLocalParts(now);

  for (let offset = 0; offset <= daysAhead && slots.length < maxSlots; offset++) {
    const dayStart = fromLocal(base.year, base.month, base.day + offset, start.h, start.m);
    const dayEnd = fromLocal(base.year, base.month, base.day + offset, end.h, end.m);
    const weekday = toLocalParts(dayStart).weekday;
    if (!always && !days.includes(weekday)) continue;
    // Domingo nunca é ofertado automaticamente no modo "sempre".
    if (always && weekday === 0) continue;

    for (let t = dayStart.getTime(); t + duration <= dayEnd.getTime(); t += duration) {
      if (slots.length >= maxSlots) break;
      if (t < earliest) continue;
      const conflict = opts.busy.some((b) => t < b.end && t + duration > b.start);
      if (conflict) continue;
      const iso = new Date(t).toISOString();
      slots.push({ iso, label: formatSlotLabel(iso) });
    }
  }

  return slots;
}

/** Normaliza o horário devolvido pela IA para um slot válido (ou null). */
export function matchSlot(candidate: unknown, slots: FreeSlot[]): FreeSlot | null {
  if (typeof candidate !== "string" || !candidate.trim()) return null;
  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) return null;
  const target = parsed.getTime();
  return slots.find((s) => new Date(s.iso).getTime() === target) ?? null;
}
