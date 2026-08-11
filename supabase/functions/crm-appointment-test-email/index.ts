import { createClient } from "npm:@supabase/supabase-js@2.49.1";


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
  { key: "link_compromisso", label: "Link para abrir na Agenda" },
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
  email_title: "Lembrete de compromisso — {{titulo_compromisso}}",
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
  link_compromisso: "https://wiize.com.br/agenda",
};
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    const user = userData?.user;
    if (userErr || !user) return json({ error: "unauthorized" }, 401);

    const recipient = user.email;
    if (!isValidEmail(recipient)) return json({ error: "Seu usuário não possui e-mail válido." }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // ── Rate limit central por tipo de aviso: 1 a cada 2 min e 10 por semana ──
    const burst = await admin.rpc("check_rate_limit", {
      p_identifier: user.id,
      p_endpoint: "appointment_test_email_burst",
      p_max_requests: 1,
      p_window_seconds: 120,
    });
    if (burst.data && (burst.data as any).allowed === false) {
      const retry = (burst.data as any).retry_after ?? 120;
      return json(
        { error: `Aguarde ${retry}s para enviar outro teste (limite de 1 a cada 2 minutos).`, retry_after: retry },
        429,
      );
    }
    const weekly = await admin.rpc("check_rate_limit", {
      p_identifier: user.id,
      p_endpoint: "appointment_test_email_weekly",
      p_max_requests: 10,
      p_window_seconds: 604800,
    });
    if (weekly.data && (weekly.data as any).allowed === false) {
      return json({ error: "Você atingiu o limite de 10 e-mails de teste por semana." }, 429);
    }

    const { data: ownerId } = await userClient.rpc("current_account_owner");
    const accountOwnerId = (ownerId as string) || user.id;

    const { data: settingsRow } = await admin
      .from("crm_appointment_email_settings")
      .select("*")
      .eq("owner_user_id", accountOwnerId)
      .maybeSingle();

    const bodyJson = await req.json().catch(() => ({}));
    const settings: AppointmentEmailSettings = {
      ...(settingsRow || {}),
      ...((bodyJson?.settings as AppointmentEmailSettings) || {}),
    };

    const vars = {
      ...SAMPLE_APPOINTMENT_VARS,
      responsavel: user.user_metadata?.name || user.email || SAMPLE_APPOINTMENT_VARS.responsavel,
      link_compromisso: "https://wiize.com.br/agenda",
    };

    const { subject, html } = renderAppointmentEmail(settings, vars, { isTest: true });

    if (!RESEND_API_KEY) return json({ error: "Serviço de e-mail não configurado." }, 500);

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: buildAppointmentFrom(settings), to: [recipient], subject, html }),
    });
    const resendData = await resendRes.json().catch(() => ({}));

    await admin.from("calendar_email_logs").insert({
      owner_user_id: accountOwnerId,
      event_id: null,
      user_id: user.id,
      email_type: "appointment",
      reminder_key: "test",
      recipient_email: recipient,
      recipient_role: "self",
      status: resendRes.ok ? "sent" : "failed",
      error_message: resendRes.ok ? null : JSON.stringify(resendData).slice(0, 500),
      provider_message_id: resendData?.id ?? null,
      sent_at: resendRes.ok ? new Date().toISOString() : null,
    });

    if (!resendRes.ok) {
      console.error("[crm-appointment-test-email] resend error", resendData);
      return json({ error: "Falha ao enviar o e-mail de teste.", details: resendData }, 502);
    }

    return json({ success: true, sent_to: recipient });
  } catch (e) {
    console.error("[crm-appointment-test-email]", e);
    return json({ error: (e as Error).message }, 500);
  }
});
