import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildAppointmentFrom,
  isValidEmail,
  renderAppointmentEmail,
  type AppointmentEmailSettings,
  type AppointmentEmailVars,
} from "../_shared/appointment-email.ts";

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
const APP_URL = "https://wiize.com.br";

/** Estágios do lembrete enviado ao lead (sistema separado do lembrete da equipe). */
const LEAD_STAGES: { key: string; minutes: number }[] = [
  { key: "day", minutes: 12 * 60 },
  { key: "1h", minutes: 60 },
  { key: "10m", minutes: 10 },
];

function leadMinutes(reminders: unknown): number | null {
  if (Array.isArray(reminders)) {
    if (reminders.length === 0) return null; // lembrete desligado
    const first = Number(reminders[0]);
    if (Number.isFinite(first) && first > 0) return first;
  }
  return DEFAULT_LEAD_MINUTES;
}

function localDate(iso: string) {
  return new Date(new Date(iso).getTime() + TZ_OFFSET_MS);
}

function whenLabel(iso: string) {
  const local = localDate(iso);
  const d = String(local.getUTCDate()).padStart(2, "0");
  const m = String(local.getUTCMonth() + 1).padStart(2, "0");
  const h = String(local.getUTCHours()).padStart(2, "0");
  const min = String(local.getUTCMinutes()).padStart(2, "0");
  return `${d}/${m} às ${h}:${min}`;
}

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function dateLabel(iso: string) {
  const local = localDate(iso);
  return `${local.getUTCDate()} de ${MONTHS[local.getUTCMonth()]} de ${local.getUTCFullYear()}`;
}

function timeLabel(iso: string) {
  const local = localDate(iso);
  return `${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}`;
}

function durationLabel(startsAt: string, endsAt?: string | null) {
  if (!endsAt) return "";
  const mins = Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000);
  if (!Number.isFinite(mins) || mins <= 0) return "";
  if (mins < 60) return `${mins} minutos`;
  const h = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest ? `${h}h${String(rest).padStart(2, "0")}` : `${h} ${h === 1 ? "hora" : "horas"}`;
}

/**
 * Cron da Agenda. Dois sistemas independentes de lembrete:
 * 1) Equipe (responsável + participantes): usa a antecedência escolhida pelo criador.
 * 2) Lead convidado: e-mail no dia, 1 hora antes e 10 minutos antes.
 * Os e-mails usam a configuração de "Lembretes de compromissos" da conta
 * (identidade visual, remetente e conteúdo) e são registrados em calendar_email_logs.
 * Roda a cada 5 minutos.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
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
      "id, title, starts_at, ends_at, reminders, status, assigned_user_id, owner_user_id, location, conference_url, company_name, contact_name, contact_email, notes, metadata, reminder_sent_at",
    )
    .not("status", "in", "(cancelled,completed)")
    .gte("starts_at", new Date(now).toISOString())
    .lte("starts_at", horizon)
    .limit(200);

  if (error) return json({ error: error.message }, 500);

  // Cache das configurações por conta (uma leitura por owner).
  const settingsCache = new Map<string, AppointmentEmailSettings | null>();
  const getSettings = async (ownerId: string) => {
    if (settingsCache.has(ownerId)) return settingsCache.get(ownerId) ?? null;
    const { data } = await supabase
      .from("crm_appointment_email_settings")
      .select("*")
      .eq("owner_user_id", ownerId)
      .maybeSingle();
    settingsCache.set(ownerId, (data as AppointmentEmailSettings) ?? null);
    return (data as AppointmentEmailSettings) ?? null;
  };

  /** Envia via Resend e registra o log (índice único evita duplicidade). */
  const sendEmail = async (params: {
    ownerId: string;
    eventId: string;
    userId: string | null;
    reminderKey: string;
    recipientEmail: string;
    recipientRole: string;
    scheduledFor: string;
    settings: AppointmentEmailSettings;
    vars: Partial<AppointmentEmailVars>;
  }) => {
    if (!isValidEmail(params.recipientEmail)) return false;

    // Guarda de idempotência antes do envio.
    const { data: existing } = await supabase
      .from("calendar_email_logs")
      .select("id")
      .eq("event_id", params.eventId)
      .eq("reminder_key", params.reminderKey)
      .eq("recipient_email", params.recipientEmail)
      .eq("status", "sent")
      .maybeSingle();
    if (existing) return false;

    if (!resendKey) {
      console.error("[calendar-reminders] RESEND_API_KEY ausente");
      return false;
    }

    const { subject, html } = renderAppointmentEmail(params.settings, params.vars);
    let ok = false;
    let providerId: string | null = null;
    let errorMessage: string | null = null;

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: buildAppointmentFrom(params.settings),
          to: [params.recipientEmail],
          subject,
          html,
        }),
      });
      const data = await res.json().catch(() => ({}));
      ok = res.ok;
      providerId = (data as any)?.id ?? null;
      if (!ok) errorMessage = JSON.stringify(data).slice(0, 500);
    } catch (e) {
      errorMessage = (e as Error).message.slice(0, 500);
    }

    await supabase.from("calendar_email_logs").insert({
      owner_user_id: params.ownerId,
      event_id: params.eventId,
      user_id: params.userId,
      email_type: "appointment",
      reminder_key: params.reminderKey,
      recipient_email: params.recipientEmail,
      recipient_role: params.recipientRole,
      scheduled_for: params.scheduledFor,
      status: ok ? "sent" : "failed",
      error_message: errorMessage,
      provider_message_id: providerId,
      sent_at: ok ? new Date().toISOString() : null,
    });

    return ok;
  };

  let sent = 0;
  let leadSent = 0;

  for (const event of events ?? []) {
    const metadata = (event.metadata as Record<string, unknown> | null) ?? {};
    const diff = new Date(event.starts_at).getTime() - now;
    const settings = (await getSettings(event.owner_user_id)) ?? {};
    if (settings.enabled === false) continue;

    const baseVars: Partial<AppointmentEmailVars> = {
      titulo_compromisso: event.title || "Compromisso",
      data_compromisso: dateLabel(event.starts_at),
      horario_compromisso: timeLabel(event.starts_at),
      duracao: durationLabel(event.starts_at, (event as any).ends_at),
      local_compromisso: event.location || event.conference_url || "",
      descricao: event.notes || "",
      empresa: event.company_name || "",
      link_compromisso: `${APP_URL}/agenda`,
    };

    // ── 1) Lembrete da equipe ────────────────────────────────────────────────
    const minutes = leadMinutes(event.reminders);
    if (minutes !== null && !event.reminder_sent_at && diff <= minutes * 60_000) {
      const ids = new Set<string>([event.assigned_user_id]);
      const participants = metadata.participants;
      if (Array.isArray(participants)) {
        for (const id of participants) if (typeof id === "string") ids.add(id);
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, name")
        .in("id", [...ids]);

      const assigned = (profiles ?? []).find((p) => p.id === event.assigned_user_id);

      for (const profile of profiles ?? []) {
        if (!profile.email) continue;
        try {
          const ok = await sendEmail({
            ownerId: event.owner_user_id,
            eventId: event.id,
            userId: profile.id,
            reminderKey: "team",
            recipientEmail: profile.email,
            recipientRole: profile.id === event.assigned_user_id ? "responsible" : "participant",
            scheduledFor: event.starts_at,
            settings,
            vars: {
              ...baseVars,
              nome_cliente: profile.name || profile.email,
              email_cliente: profile.email,
              responsavel: assigned?.name || assigned?.email || "",
              empresa: event.company_name || event.contact_name || "",
            },
          });
          if (ok) sent += 1;
        } catch (mailError) {
          console.error("[calendar-reminders] falha ao enviar e-mail da equipe:", mailError);
        }
      }

      await supabase
        .from("calendar_events")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", event.id);
    }

    // ── 2) Lembretes do lead (dia / 1h / 10min) ─────────────────────────────
    if (settings.notify_client === false) continue;
    const notifyLead = metadata.notify_lead === true;
    const leadEmail = (event.contact_email || "").trim();
    if (!notifyLead || !leadEmail) continue;

    const already = Array.isArray(metadata.lead_reminders_sent)
      ? (metadata.lead_reminders_sent as string[])
      : [];

    const due = LEAD_STAGES.filter(
      (stage) => diff <= stage.minutes * 60_000 && !already.includes(stage.key),
    );
    if (due.length === 0) continue;

    // Envia apenas o estágio mais próximo pendente, marcando os anteriores como cumpridos.
    const stage = due[due.length - 1];

    const { data: responsible } = await supabase
      .from("profiles")
      .select("name, email")
      .eq("id", event.assigned_user_id)
      .maybeSingle();

    try {
      const ok = await sendEmail({
        ownerId: event.owner_user_id,
        eventId: event.id,
        userId: null,
        reminderKey: `lead-${stage.key}`,
        recipientEmail: leadEmail,
        recipientRole: "lead",
        scheduledFor: event.starts_at,
        settings,
        vars: {
          ...baseVars,
          nome_cliente: event.contact_name || "",
          email_cliente: leadEmail,
          responsavel: responsible?.name || responsible?.email || "",
        },
      });
      if (ok) leadSent += 1;
    } catch (mailError) {
      console.error("[calendar-reminders] falha ao enviar e-mail do lead:", mailError);
      continue;
    }

    await supabase
      .from("calendar_events")
      .update({
        metadata: {
          ...metadata,
          lead_reminders_sent: [...new Set([...already, ...due.map((s) => s.key)])],
        },
      })
      .eq("id", event.id);
  }

  return json({
    ok: true,
    checked: events?.length ?? 0,
    reminded: sent,
    lead_reminded: leadSent,
    when: whenLabel(new Date(now).toISOString()),
  });
});
