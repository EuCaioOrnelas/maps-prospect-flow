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
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
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
    "Este é um aviso automático: o contrato abaixo está próximo do vencimento. Entre em contato para tratar da renovação.",
  cta_label: "Falar sobre a renovação",
  notice_days_4_6_months: 15,
  contact_name: null,
  contact_email: null,
  contact_phone: null,
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
  expirationDate: string;
  daysLeft: number;
  /** Valor da parcela mensal já formatado */
  contractValue: string;
  contractMonths: number;
  saleTitle: string;
  ctaUrl: string;
  isTest?: boolean;
}

/** Duração formatada: 12x R$ 1.500,00 */
export function formatContractValue(months: number, installment: string): string {
  if (!months || months <= 1) return installment;
  return `${months}x ${installment}`;
}

export function renderRenewalEmail(
  settings: Partial<RenewalSettings>,
  data: RenewalEmailData
): { subject: string; html: string } {
  const header = safeColor(settings.header_color, DEFAULT_RENEWAL_SETTINGS.header_color);
  const button = safeColor(settings.button_color, DEFAULT_RENEWAL_SETTINGS.button_color);
  const title = settings.email_title || DEFAULT_RENEWAL_SETTINGS.email_title;
  const intro = settings.email_intro || DEFAULT_RENEWAL_SETTINGS.email_intro;
  const cta = settings.cta_label || DEFAULT_RENEWAL_SETTINGS.cta_label;
  const senderName = settings.sender_name || DEFAULT_RENEWAL_SETTINGS.sender_name;
  const logo = settings.logo_url || "";

  const daysLabel =
    data.daysLeft <= 0 ? "vence hoje" : data.daysLeft === 1 ? "vence em 1 dia" : `vence em ${data.daysLeft} dias`;

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:8px 0;font-size:13px;color:#71717a;">${esc(label)}</td>
      <td style="padding:8px 0;font-size:13px;color:#18181b;font-weight:600;text-align:right;">${esc(value)}</td>
    </tr>`;

  const contactName = (settings.contact_name || "").trim();
  const contactEmail = (settings.contact_email || "").trim();
  const contactPhone = (settings.contact_phone || "").trim();
  const hasContact = !!(contactName || contactEmail || contactPhone);

  const contactBlock = hasContact
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;background:#ffffff;border:1px solid #e4e4e7;border-radius:10px;">
        <tr><td style="padding:14px 16px;">
          <p style="margin:0 0 6px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:.04em;">Fale com a gente</p>
          ${contactName ? `<p style="margin:0 0 2px;font-size:14px;color:#18181b;font-weight:600;">${esc(contactName)}</p>` : ""}
          ${contactPhone ? `<p style="margin:0;font-size:13px;color:#3f3f46;">Telefone/WhatsApp: <strong>${esc(contactPhone)}</strong></p>` : ""}
          ${contactEmail ? `<p style="margin:0;font-size:13px;color:#3f3f46;">E-mail: <a href="mailto:${esc(contactEmail)}" style="color:${button};text-decoration:none;">${esc(contactEmail)}</a></p>` : ""}
        </td></tr>
      </table>`
    : "";

  const subject = `${data.isTest ? "[TESTE] " : ""}${title} — ${data.companyName || data.clientName} (${daysLabel})`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
  <tr><td style="background:${header};padding:24px 32px;text-align:center;">
    ${logo ? `<img src="${esc(logo)}" alt="${esc(senderName)}" height="36" style="display:inline-block;max-height:36px;vertical-align:middle;border:0;">` : `<span style="color:#ffffff;font-size:20px;font-weight:700;">${esc(senderName)}</span>`}
  </td></tr>
  <tr><td style="padding:32px;">
    ${data.isTest ? `<p style="margin:0 0 16px;padding:10px 12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;font-size:12px;color:#9a3412;">Este é um <strong>e-mail de teste</strong> do aviso de renovação. Os dados abaixo são fictícios.</p>` : ""}
    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#18181b;">${esc(title)}</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3f3f46;">${esc(intro)}</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #e4e4e7;border-radius:10px;padding:8px 16px;">
      ${row("Cliente", data.clientName || "—")}
      ${row("Empresa", data.companyName || "—")}
      ${row("Contrato", data.saleTitle || "—")}
      ${row("Vencimento", data.expirationDate || "—")}
      ${row("Dias restantes", data.daysLeft <= 0 ? "0" : String(data.daysLeft))}
      ${row("Duração", `${data.contractMonths} ${data.contractMonths === 1 ? "mês" : "meses"}`)}
      ${row("Valor", formatContractValue(data.contractMonths, data.contractValue))}
    </table>

    ${contactBlock}

    <div style="text-align:center;margin:26px 0 6px;">
      <a href="${esc(data.ctaUrl)}" style="display:inline-block;padding:13px 28px;background:${button};color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">${esc(cta)}</a>
    </div>
  </td></tr>
  <tr><td style="padding:16px 32px;background:#fafafa;text-align:center;border-top:1px solid #e4e4e7;">
    <p style="margin:0;font-size:12px;color:#a1a1aa;">Aviso automático de renovação de contrato enviado por ${esc(senderName)}.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, html };
}

/** Dados fictícios usados no preview/teste do e-mail. */
export const SAMPLE_RENEWAL_DATA: RenewalEmailData = {
  clientName: "João da Silva",
  companyName: "Empresa Exemplo LTDA",
  expirationDate: new Date(Date.now() + 7 * 86400000).toLocaleDateString("pt-BR"),
  daysLeft: 7,
  contractValue: (1500).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }),
  contractMonths: 12,
  saleTitle: "Contrato de prestação de serviços",
  ctaUrl: "https://wiize.com.br/crm/vendas",
  isTest: true,
};
