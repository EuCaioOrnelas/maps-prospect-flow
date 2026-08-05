import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const TZ_OFFSET_MS = -3 * 60 * 60 * 1000;
const CALENDAR_TIMEZONE = "America/Sao_Paulo";
const WEEKDAY_LABEL = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const RequestSchema = z.object({
  responsibleUserId: z.string().uuid(),
  schedule: z.record(z.unknown()).optional().default({}),
  durationMinutes: z.number().int().min(15).max(480).optional().default(60),
  daysAhead: z.number().int().min(1).max(30).optional().default(10),
  minLeadMinutes: z.number().int().min(0).max(10_080).optional().default(120),
  maxSlots: z.number().int().min(1).max(30).optional().default(8),
});

interface FreeSlot {
  iso: string;
  label: string;
}

interface BusyBlock {
  start: number;
  end: number;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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

function fromLocal(year: number, month: number, day: number, hours: number, minutes: number) {
  return new Date(Date.UTC(year, month, day, hours, minutes, 0, 0) - TZ_OFFSET_MS);
}

function parseHm(value: unknown, fallback: string) {
  const raw = typeof value === "string" && /^\d{1,2}:\d{2}$/.test(value) ? value : fallback;
  const [hours, minutes] = raw.split(":").map((part) => Number.parseInt(part, 10));
  return { hours, minutes };
}

function formatSlotLabel(iso: string) {
  const parts = toLocalParts(new Date(iso));
  const day = String(parts.day).padStart(2, "0");
  const month = String(parts.month + 1).padStart(2, "0");
  const hours = String(parts.hours).padStart(2, "0");
  const minutes = String(parts.minutes).padStart(2, "0");
  return `${WEEKDAY_LABEL[parts.weekday]} (${day}/${month}) às ${hours}:${minutes}`;
}

function buildFreeSlots(options: {
  schedule: Record<string, unknown>;
  busy: BusyBlock[];
  durationMinutes: number;
  daysAhead: number;
  minLeadMinutes: number;
  maxSlots: number;
}) {
  const duration = options.durationMinutes * 60_000;
  const now = new Date();
  const earliest = now.getTime() + options.minLeadMinutes * 60_000;
  const always = options.schedule.mode !== "custom";
  const configuredDays = Array.isArray(options.schedule.days) ? options.schedule.days : [];
  const days = configuredDays.length ? configuredDays.map((day) => Number(day)) : [1, 2, 3, 4, 5];
  const start = parseHm(options.schedule.start, always ? "09:00" : "08:30");
  const end = parseHm(options.schedule.end, "18:00");
  const slots: FreeSlot[] = [];
  const base = toLocalParts(now);

  for (let offset = 0; offset <= options.daysAhead && slots.length < options.maxSlots; offset += 1) {
    const dayStart = fromLocal(base.year, base.month, base.day + offset, start.hours, start.minutes);
    const dayEnd = fromLocal(base.year, base.month, base.day + offset, end.hours, end.minutes);
    const weekday = toLocalParts(dayStart).weekday;
    if (!days.includes(weekday)) continue;

    for (let time = dayStart.getTime(); time + duration <= dayEnd.getTime(); time += duration) {
      if (slots.length >= options.maxSlots) break;
      if (time < earliest) continue;
      if (options.busy.some((block) => time < block.end && time + duration > block.start)) continue;
      const iso = new Date(time).toISOString();
      slots.push({ iso, label: formatSlotLabel(iso) });
    }
  }

  return slots;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Backend configuration unavailable" }, 500);

  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token || token !== serviceKey) return json({ error: "Unauthorized" }, 401);

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = RequestSchema.safeParse(rawBody);
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);

  const { responsibleUserId, schedule, durationMinutes, daysAhead, minLeadMinutes, maxSlots } = parsed.data;
  const horizonEnd = new Date(Date.now() + (daysAhead + 1) * 24 * 60 * 60 * 1000).toISOString();
  const backend = createClient(supabaseUrl, serviceKey);
  const { data: busyRows, error } = await backend
    .from("calendar_events")
    .select("starts_at, ends_at")
    .eq("assigned_user_id", responsibleUserId)
    .neq("status", "cancelled")
    .lte("starts_at", horizonEnd)
    .gte("ends_at", new Date().toISOString());

  if (error) return json({ error: "Unable to read calendar availability" }, 500);

  const slots = buildFreeSlots({
    schedule,
    durationMinutes,
    daysAhead,
    minLeadMinutes,
    maxSlots,
    busy: (busyRows ?? []).map((row) => ({
      start: new Date(row.starts_at).getTime(),
      end: new Date(row.ends_at).getTime(),
    })),
  });

  return json({ timezone: CALENDAR_TIMEZONE, slots });
});