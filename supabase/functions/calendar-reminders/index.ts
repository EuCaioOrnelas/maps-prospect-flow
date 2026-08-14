import { createClient } from "npm:@supabase/supabase-js@2";


// ---------------------------------------------------------------------------
// Inline: renderizador de e-mail (sem módulos compartilhados)
// ---------------------------------------------------------------------------
// Renderizador do e-mail de Lembrete de Compromisso (Agenda Wiize).
// Compartilhado entre o cron calendar-reminders e o envio de e-mail de teste.
// Mantido em paralelo com src/lib/appointmentEmailTemplate.ts

interface AppointmentEmailSettings {
  enabled?: boolean;
  logo_url?: string | null;
  header_color?: string | null;
  button_color?: string | null;
  sender_name?: string | null;
  sender_local_part?: string | null;
  email_title?: string | null;
  email_body?: string | null;
  cta_label?: string | null;
  notify_client?: boolean;
}

interface AppointmentEmailVars {
  nome_cliente: string;
  email_cliente: string;
  titulo_compromisso: string;
  data_compromisso: string;
  horario_compromisso: string;
  duracao: string;
  local_compromisso: string;
  descricao: string;
  responsavel: string;
  empresa: string;
  link_compromisso: string;
}

const APPOINTMENT_VARIABLES: { key: keyof AppointmentEmailVars; label: string }[] = [
  { key: "nome_cliente", label: "Nome do cliente/destinatário" },
  { key: "email_cliente", label: "E-mail do cliente" },
  { key: "titulo_compromisso", label: "Título do compromisso" },
  { key: "data_compromisso", label: "Data" },
  { key: "horario_compromisso", label: "Horário" },
  { key: "duracao", label: "Duração" },
  { key: "local_compromisso", label: "Local ou link da reunião" },
  { key: "descricao", label: "Descrição/observações" },
  { key: "responsavel", label: "Responsável pelo compromisso" },
  { key: "empresa", label: "Empresa do contato" },
  { key: "link_compromisso", label: "Link da call (somente se preenchido)" },
];

const DEFAULT_APPOINTMENT_BODY = `Olá, {{nome_cliente}}.
Este é um lembrete de que você possui um compromisso agendado.

{{titulo_compromisso}}

📅 Data: {{data_compromisso}}
🕐 Horário: {{horario_compromisso}}
⏱️ Duração: {{duracao}}
📍 Local: {{local_compromisso}}
👤 Responsável: {{responsavel}}
🏢 Empresa: {{empresa}}

{{descricao}}

Atenciosamente,
Equipe {{empresa}}`;

const DEFAULT_APPOINTMENT_SETTINGS = {
  enabled: true,
  logo_url: null as string | null,
  header_color: "#3daa57",
  button_color: "#3daa57",
  sender_name: "Wiize",
  sender_local_part: "agenda",
  email_title: "Lembrete de compromisso: {{titulo_compromisso}}",
  email_body: DEFAULT_APPOINTMENT_BODY,
  cta_label: "Ver compromisso",
  notify_client: true,
};

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const safeColor = (c: string | null | undefined, fallback: string) =>
  c && /^#[0-9a-fA-F]{6}$/.test(c) ? c : fallback;

/** agenda -> agenda@wiize.com.br (domínio fixo) */
function normalizeAppointmentSender(input: string | null | undefined): string {
  const raw = String(input ?? "").split("@")[0].trim().toLowerCase();
  const cleaned = raw.replace(/[^a-z0-9._-]/g, "");
  return cleaned.length >= 2 ? cleaned.slice(0, 40) : DEFAULT_APPOINTMENT_SETTINGS.sender_local_part;
}

function buildAppointmentFrom(s: AppointmentEmailSettings): string {
  const name = (s.sender_name || DEFAULT_APPOINTMENT_SETTINGS.sender_name)
    .replace(/["<>\r\n]/g, "")
    .slice(0, 60);
  return `${name} <${normalizeAppointmentSender(s.sender_local_part)}@wiize.com.br>`;
}

function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/** Substitui variáveis em texto simples (assunto). Variáveis vazias viram string vazia. */
function interpolate(text: string, vars: Partial<AppointmentEmailVars>): string {
  return String(text ?? "")
    .replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, key: string) => String((vars as any)[key] ?? "").trim())
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Converte o corpo configurado em HTML.
 * Linhas cujas variáveis não possuem valor são removidas para evitar
 * "Local:" vazio ou variáveis cruas no e-mail.
 */
function renderBodyHtml(body: string, vars: Partial<AppointmentEmailVars>): string {
  const lines = String(body ?? "").split(/\r?\n/);
  const kept: string[] = [];

  for (const line of lines) {
    const used = [...line.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/gi)].map((m) => m[1]);
    if (used.length > 0) {
      const resolved = used.map((k) => String((vars as any)[k] ?? "").trim());
      const hasAnyValue = resolved.some((v) => v.length > 0);
      // Se a linha depende exclusivamente de variáveis sem valor, ela é descartada.
      if (!hasAnyValue) continue;
      const missing = used.filter((k) => !String((vars as any)[k] ?? "").trim());
      const textWithoutVars = line.replace(/\{\{\s*[a-z_]+\s*\}\}/gi, "").trim();
      // Linha do tipo "📍 Local: {{local_compromisso}}" sem valor também é descartada.
      if (missing.length === used.length && textWithoutVars) continue;
    }
    kept.push(interpolate(line, vars));
  }

  // Agrupa em parágrafos separados por linhas em branco.
  const paragraphs: string[][] = [];
  let current: string[] = [];
  for (const line of kept) {
    if (!line.trim()) {
      if (current.length) paragraphs.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length) paragraphs.push(current);

  return paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#3f3f46;">${p
          .map((l) => esc(l))
          .join("<br>")}</p>`,
    )
    .join("");
}

function renderAppointmentEmail(
  settings: AppointmentEmailSettings,
  vars: Partial<AppointmentEmailVars>,
  options: { isTest?: boolean } = {},
): { subject: string; html: string } {
  const header = safeColor(settings.header_color, DEFAULT_APPOINTMENT_SETTINGS.header_color);
  const button = safeColor(settings.button_color, DEFAULT_APPOINTMENT_SETTINGS.button_color);
  const senderName = settings.sender_name || DEFAULT_APPOINTMENT_SETTINGS.sender_name;
  const cta = settings.cta_label || DEFAULT_APPOINTMENT_SETTINGS.cta_label;
  const titleTemplate = settings.email_title || DEFAULT_APPOINTMENT_SETTINGS.email_title;
  const body = settings.email_body?.trim() ? settings.email_body : DEFAULT_APPOINTMENT_BODY;
  const logo = settings.logo_url || "";

  const subjectBase = interpolate(titleTemplate, vars) || "Lembrete de compromisso";
  const subject = `${options.isTest ? "[TESTE] " : ""}${subjectBase}`;
  const bodyHtml = renderBodyHtml(body, vars);
  const link = String(vars.link_compromisso || "").trim();

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${esc(subjectBase)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${esc(subjectBase)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
  <tr><td style="background:${header};padding:24px 32px;text-align:center;">
    ${logo ? `<img src="${esc(logo)}" alt="${esc(senderName)}" height="36" style="display:inline-block;max-height:36px;vertical-align:middle;border:0;">` : `<span style="color:#ffffff;font-size:20px;font-weight:700;">${esc(senderName)}</span>`}
  </td></tr>
  <tr><td style="padding:32px;">
    ${options.isTest ? `<p style="margin:0 0 16px;padding:10px 12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;font-size:12px;color:#9a3412;">Este é um <strong>e-mail de teste</strong> do lembrete de compromisso. Os dados abaixo são fictícios.</p>` : ""}
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#18181b;">${esc(subjectBase)}</h1>
    ${bodyHtml}
    ${
      link
        ? `<div style="text-align:center;margin:26px 0 6px;">
      <a href="${esc(link)}" style="display:inline-block;padding:13px 28px;background:${button};color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">${esc(cta)}</a>
    </div>`
        : ""
    }
  </td></tr>
  <tr><td style="padding:16px 32px;background:#fafafa;text-align:center;border-top:1px solid #e4e4e7;">
    <p style="margin:0;font-size:12px;color:#a1a1aa;">Lembrete automático de compromisso enviado por ${esc(senderName)}.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, html };
}

const SAMPLE_APPOINTMENT_VARS: AppointmentEmailVars = {
  nome_cliente: "João da Silva",
  email_cliente: "joao.silva@empresaexemplo.com.br",
  titulo_compromisso: "Reunião de apresentação",
  data_compromisso: "15 de agosto de 2026",
  horario_compromisso: "14:00",
  duracao: "1 hora",
  local_compromisso: "Google Meet",
  descricao: "Apresentação da proposta comercial e alinhamento das próximas etapas.",
  responsavel: "Carlos Oliveira",
  empresa: "Empresa Exemplo LTDA",
  link_compromisso: "https://meet.google.com/abc-defg-hij",
};
// ---------------------------------------------------------------------------

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
  const apiKeyHeader = req.headers.get("apikey")?.trim();
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authorized =
    token === serviceKey || (!!anonKey && (token === anonKey || apiKeyHeader === anonKey));
  if (!authorized) return json({ error: "Unauthorized" }, 401);


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
      // O botão só aparece quando o compromisso tem link de call configurado.
      link_compromisso: (() => {
        const conf = String((event as any).conference_url || "").trim();
        if (/^https?:\/\//i.test(conf)) return conf;
        const loc = String(event.location || "").trim();
        const m = loc.match(/https?:\/\/\S+/i);
        return m ? m[0] : "";
      })(),
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
