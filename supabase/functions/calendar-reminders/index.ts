import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const DEFAULT_LEAD_MINUTES = 15;
const TZ_OFFSET_MS = -3 * 60 * 60 * 1000;

function leadMinutes(reminders: unknown): number | null {
  if (Array.isArray(reminders)) {
    if (reminders.length === 0) return null; // lembrete desligado
    const first = Number(reminders[0]);
    if (Number.isFinite(first) && first > 0) return first;
  }
  return DEFAULT_LEAD_MINUTES;
}

function whenLabel(iso: string) {
  const local = new Date(new Date(iso).getTime() + TZ_OFFSET_MS);
  const d = String(local.getUTCDate()).padStart(2, "0");
  const m = String(local.getUTCMonth() + 1).padStart(2, "0");
  const h = String(local.getUTCHours()).padStart(2, "0");
  const min = String(local.getUTCMinutes()).padStart(2, "0");
  return `${d}/${m} às ${h}:${min}`;
}

/**
 * Cron da Agenda: envia o e-mail de lembrete de cada compromisso respeitando
 * a antecedência configurada pelo usuário. Roda a cada 5 minutos.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Backend configuration unavailable" }, 500);

  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token || token !== serviceKey) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(supabaseUrl, serviceKey);
  const now = Date.now();
  // Janela máxima de lembrete suportada: 24h de antecedência.
  const horizon = new Date(now + 24 * 60 * 60 * 1000).toISOString();

  const { data: events, error } = await supabase
    .from("calendar_events")
    .select(
      "id, title, starts_at, reminders, status, assigned_user_id, owner_user_id, location, company_name, contact_name, notes, metadata",
    )
    .is("reminder_sent_at", null)
    .not("status", "in", "(cancelled,completed)")
    .gte("starts_at", new Date(now).toISOString())
    .lte("starts_at", horizon)
    .limit(200);

  if (error) return json({ error: error.message }, 500);

  let sent = 0;
  for (const event of events ?? []) {
    const minutes = leadMinutes(event.reminders);
    if (minutes === null) continue;
    const diff = new Date(event.starts_at).getTime() - now;
    if (diff > minutes * 60_000) continue;

    // Destinatários: responsável + participantes marcados no compromisso.
    const ids = new Set<string>([event.assigned_user_id]);
    const participants = (event.metadata as Record<string, unknown> | null)?.participants;
    if (Array.isArray(participants)) {
      for (const id of participants) if (typeof id === "string") ids.add(id);
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, name")
      .in("id", [...ids]);

    for (const profile of profiles ?? []) {
      if (!profile.email) continue;
      try {
        await supabase.functions.invoke("send-email", {
          body: {
            to: profile.email,
            email_type: "EVENT_REMINDER",
            idempotency_key: `event-reminder-${event.id}-${profile.id}`,
            payload: {
              recipient_name: profile.name || profile.email,
              title: event.title,
              when_label: whenLabel(event.starts_at),
              minutes,
              location: event.location || "",
              company_name: event.company_name || "",
              contact_name: event.contact_name || "",
              notes: event.notes || "",
            },
          },
        });
      } catch (mailError) {
        console.error("[calendar-reminders] falha ao enviar e-mail:", mailError);
      }
    }

    await supabase
      .from("calendar_events")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", event.id);
    sent += 1;
  }

  return json({ ok: true, checked: events?.length ?? 0, reminded: sent });
});
