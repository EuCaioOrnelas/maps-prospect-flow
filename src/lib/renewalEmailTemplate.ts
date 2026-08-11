// Template do e-mail de Aviso de Renovação — usado no preview do frontend.
// Mantido em paralelo com supabase/functions/_shared/renewal-email.ts

export interface RenewalSettings {
  owner_user_id?: string;
  enabled: boolean;
  logo_url: string | null;
  header_color: string;
  button_color: string;
  sender_name: string;
  sender_local_part: string;
  email_title: string;
  email_intro: string;
  cta_label: string;
  notice_days_4_6_months: number | null;
}

export const DEFAULT_RENEWAL_SETTINGS: RenewalSettings = {
  enabled: false,
  logo_url: null,
  header_color: "#3daa57",
  button_color: "#3daa57",
  sender_name: "Wiize",
  sender_local_part: "renovacao",
  email_title: "Seu contrato está próximo do vencimento",
  email_intro:
    "Identificamos que o contrato abaixo está próximo do vencimento. Entre em contato para tratar da renovação.",
  cta_label: "Ver contrato no CRM",
  notice_days_4_6_months: null,
};

export const SENDER_DOMAIN = "@wiize.com.br";

/** Aceita apenas letras minúsculas, números, ponto, hífen e underline (2 a 40 chars). */
export const isValidSenderLocalPart = (v: string) => /^[a-z0-9]([a-z0-9._-]{0,38}[a-z0-9])$/.test(v);

export const normalizeSenderLocalPart = (v: string) =>
  v.split("@")[0].trim().toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 40);

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const safeColor = (c: string | null | undefined, fallback: string) =>
  c && /^#[0-9a-fA-F]{6}$/.test(c) ? c : fallback;

export interface RenewalEmailData {
  clientName: string;
  companyName: string;
  responsibleName: string;
  expirationDate: string;
  daysLeft: number;
  contractValue: string;
  contractTotal: string;
  contractMonths: number;
  saleTitle: string;
  ctaUrl: string;
  isTest?: boolean;
}

export const SAMPLE_RENEWAL_DATA: RenewalEmailData = {
  clientName: "João da Silva",
  companyName: "Empresa Exemplo LTDA",
  responsibleName: "Equipe comercial",
  expirationDate: new Date(Date.now() + 7 * 86400000).toLocaleDateString("pt-BR"),
  daysLeft: 7,
  contractValue: "R$ 1.500,00",
  contractTotal: "R$ 18.000,00",
  contractMonths: 12,
  saleTitle: "Contrato de prestação de serviços",
  ctaUrl: "https://wiize.com.br/crm/vendas",
};

export function renderRenewalEmail(
  settings: Partial<RenewalSettings>,
  data: RenewalEmailData
): { subject: string; html: string } {
  const s = { ...DEFAULT_RENEWAL_SETTINGS, ...settings };
  const header = safeColor(s.header_color, DEFAULT_RENEWAL_SETTINGS.header_color);
  const button = safeColor(s.button_color, DEFAULT_RENEWAL_SETTINGS.button_color);
  const logo = s.logo_url || "";

  const daysLabel =
    data.daysLeft <= 0 ? "vence hoje" : data.daysLeft === 1 ? "vence em 1 dia" : `vence em ${data.daysLeft} dias`;

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:8px 0;font-size:13px;color:#71717a;">${esc(label)}</td>
      <td style="padding:8px 0;font-size:13px;color:#18181b;font-weight:600;text-align:right;">${esc(value)}</td>
    </tr>`;

  const subject = `${data.isTest ? "[TESTE] " : ""}${s.email_title} — ${data.companyName || data.clientName} (${daysLabel})`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${esc(s.email_title)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
  <tr><td style="background:${header};padding:24px 32px;text-align:center;">
    ${logo ? `<img src="${esc(logo)}" alt="${esc(s.sender_name)}" height="36" style="display:inline-block;max-height:36px;vertical-align:middle;border:0;">` : `<span style="color:#ffffff;font-size:20px;font-weight:700;">${esc(s.sender_name)}</span>`}
  </td></tr>
  <tr><td style="padding:32px;">
    ${data.isTest ? `<p style="margin:0 0 16px;padding:10px 12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;font-size:12px;color:#9a3412;">Este é um <strong>e-mail de teste</strong> do aviso de renovação.</p>` : ""}
    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#18181b;">${esc(s.email_title)}</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3f3f46;">${esc(s.email_intro)}</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #e4e4e7;border-radius:10px;padding:8px 16px;">
      ${row("Cliente", data.clientName || "—")}
      ${row("Empresa", data.companyName || "—")}
      ${row("Contrato", data.saleTitle || "—")}
      ${row("Responsável", data.responsibleName || "—")}
      ${row("Vencimento", data.expirationDate || "—")}
      ${row("Dias restantes", data.daysLeft <= 0 ? "0" : String(data.daysLeft))}
      ${row("Valor", data.contractValue)}
      ${row("Duração", `${data.contractMonths} ${data.contractMonths === 1 ? "mês" : "meses"}`)}
      ${row("Valor total do contrato", data.contractTotal)}
    </table>

    <div style="text-align:center;margin:26px 0 6px;">
      <a href="${esc(data.ctaUrl)}" style="display:inline-block;padding:13px 28px;background:${button};color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">${esc(s.cta_label)}</a>
    </div>
  </td></tr>
  <tr><td style="padding:16px 32px;background:#fafafa;text-align:center;border-top:1px solid #e4e4e7;">
    <p style="margin:0;font-size:12px;color:#a1a1aa;">Aviso automático de renovação de contrato enviado por ${esc(s.sender_name)}.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, html };
}
