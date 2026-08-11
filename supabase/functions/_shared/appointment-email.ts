// Renderizador do e-mail de Lembrete de Compromisso (Agenda Wiize).
// Compartilhado entre o cron calendar-reminders e o envio de e-mail de teste.
// Mantido em paralelo com src/lib/appointmentEmailTemplate.ts

export interface AppointmentEmailSettings {
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

export interface AppointmentEmailVars {
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

export const APPOINTMENT_VARIABLES: { key: keyof AppointmentEmailVars; label: string }[] = [
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

export const DEFAULT_APPOINTMENT_BODY = `Olá, {{nome_cliente}}.
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

export const DEFAULT_APPOINTMENT_SETTINGS = {
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
export function normalizeAppointmentSender(input: string | null | undefined): string {
  const raw = String(input ?? "").split("@")[0].trim().toLowerCase();
  const cleaned = raw.replace(/[^a-z0-9._-]/g, "");
  return cleaned.length >= 2 ? cleaned.slice(0, 40) : DEFAULT_APPOINTMENT_SETTINGS.sender_local_part;
}

export function buildAppointmentFrom(s: AppointmentEmailSettings): string {
  const name = (s.sender_name || DEFAULT_APPOINTMENT_SETTINGS.sender_name)
    .replace(/["<>\r\n]/g, "")
    .slice(0, 60);
  return `${name} <${normalizeAppointmentSender(s.sender_local_part)}@wiize.com.br>`;
}

export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/** Substitui variáveis em texto simples (assunto). Variáveis vazias viram string vazia. */
export function interpolate(text: string, vars: Partial<AppointmentEmailVars>): string {
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
export function renderBodyHtml(body: string, vars: Partial<AppointmentEmailVars>): string {
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

export function renderAppointmentEmail(
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

export const SAMPLE_APPOINTMENT_VARS: AppointmentEmailVars = {
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
