import { createClient } from "npm:@supabase/supabase-js@2.49.1";


// ---------------------------------------------------------------------------
// Inline: renderizador de e-mail (sem módulos compartilhados)
// ---------------------------------------------------------------------------
// Renderizador do e-mail de Aviso de Renovação (CRM Vendas & Receita).
// Compartilhado entre o processador automático e o envio de e-mail de teste.
// O mesmo e-mail é enviado ao cliente e ao responsável interno — linguagem neutra.

interface RenewalSettings {
  enabled?: boolean;
  logo_url?: string | null;
  header_color?: string | null;
  button_color?: string | null;
  sender_name?: string | null;
  sender_local_part?: string | null;
  email_title?: string | null;
  email_intro?: string | null;
  cta_label?: string | null;
  notice_days_4_6_months?: number | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
}

interface RenewalEmailData {
  clientName: string;
  companyName: string;
  expirationDate: string; // dd/mm/aaaa
  daysLeft: number;
  /** Valor da parcela mensal já formatado (ex.: R$ 1.500,00) */
  contractValue: string;
  contractMonths: number;
  saleTitle: string;
  ctaUrl: string;
  isTest?: boolean;
}

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const safeColor = (c: string | null | undefined, fallback: string) =>
  c && /^#[0-9a-fA-F]{6}$/.test(c) ? c : fallback;

const DEFAULT_RENEWAL_SETTINGS: Required<
  Pick<
    RenewalSettings,
    "header_color" | "button_color" | "sender_name" | "sender_local_part" | "email_title" | "email_intro" | "cta_label"
  >
> = {
  header_color: "#3daa57",
  button_color: "#3daa57",
  sender_name: "Wiize",
  sender_local_part: "renovacao",
  email_title: "Seu contrato está próximo do vencimento",
  email_intro:
    "Este é um aviso automático: o contrato abaixo está próximo do vencimento. Entre em contato para tratar da renovação.",
  cta_label: "Falar sobre a renovação",
};

/** Duração formatada: 12x R$ 1.500,00 */
function formatContractValue(months: number, installment: string): string {
  if (!months || months <= 1) return installment;
  return `${months}x ${installment}`;
}

/** renovacao -> renovacao@wiize.com.br (domínio fixo) */
function normalizeSenderLocalPart(input: string | null | undefined): string {
  const raw = String(input ?? "").split("@")[0].trim().toLowerCase();
  const cleaned = raw.replace(/[^a-z0-9._-]/g, "");
  return cleaned.length >= 2 ? cleaned.slice(0, 40) : DEFAULT_RENEWAL_SETTINGS.sender_local_part;
}

function buildFromAddress(s: RenewalSettings): string {
  const name = (s.sender_name || DEFAULT_RENEWAL_SETTINGS.sender_name).replace(/["<>\r\n]/g, "").slice(0, 60);
  return `${name} <${normalizeSenderLocalPart(s.sender_local_part)}@wiize.com.br>`;
}

function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function renderRenewalEmail(settings: RenewalSettings, data: RenewalEmailData): { subject: string; html: string } {
  const header = safeColor(settings.header_color, DEFAULT_RENEWAL_SETTINGS.header_color);
  const button = safeColor(settings.button_color, DEFAULT_RENEWAL_SETTINGS.button_color);
  const title = settings.email_title || DEFAULT_RENEWAL_SETTINGS.email_title;
  const intro = settings.email_intro || DEFAULT_RENEWAL_SETTINGS.email_intro;
  const cta = settings.cta_label || DEFAULT_RENEWAL_SETTINGS.cta_label;
  const senderName = settings.sender_name || DEFAULT_RENEWAL_SETTINGS.sender_name;
  const logo = settings.logo_url || "";

  const daysLabel =
    data.daysLeft <= 0
      ? "vence hoje"
      : data.daysLeft === 1
        ? "vence em 1 dia"
        : `vence em ${data.daysLeft} dias`;

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

  const subject = `${data.isTest ? "[TESTE] " : ""}${title}: ${data.companyName || data.clientName} (${daysLabel})`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${esc(title)}: ${esc(daysLabel)}</div>
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
      ${row("Cliente", data.clientName || "Não informado")}
      ${row("Empresa", data.companyName || "Não informado")}
      ${row("Contrato", data.saleTitle || "Não informado")}
      ${row("Vencimento", data.expirationDate || "Não informado")}
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

const fmtMoney = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

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

    // O teste SEMPRE vai para o e-mail de login do usuário autenticado.
    const recipient = user.email;
    if (!isValidEmail(recipient)) return json({ error: "Seu usuário não possui e-mail válido." }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // ── Rate limit (backend): 1 a cada 2 min e 10 por semana ────────────────
    const burst = await admin.rpc("check_rate_limit", {
      p_identifier: user.id,
      p_endpoint: "renewal_test_email_burst",
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
      p_endpoint: "renewal_test_email_weekly",
      p_max_requests: 10,
      p_window_seconds: 604800,
    });
    if (weekly.data && (weekly.data as any).allowed === false) {
      return json({ error: "Você atingiu o limite de 10 e-mails de teste por semana." }, 429);
    }

    const { data: ownerId } = await userClient.rpc("current_account_owner");
    const accountOwnerId = (ownerId as string) || user.id;

    const { data: settingsRow } = await admin
      .from("crm_renewal_settings")
      .select("*")
      .eq("owner_user_id", accountOwnerId)
      .maybeSingle();

    // Permite pré-visualizar alterações ainda não salvas
    const bodyJson = await req.json().catch(() => ({}));
    const settings: RenewalSettings = { ...(settingsRow || {}), ...((bodyJson?.settings as RenewalSettings) || {}) };

    const appUrl = "https://wiize.com.br";
    const { subject, html } = renderRenewalEmail(settings, {
      clientName: "João da Silva",
      companyName: "Empresa Exemplo LTDA",
      expirationDate: new Date(Date.now() + 7 * 86400000).toLocaleDateString("pt-BR"),
      daysLeft: 7,
      contractValue: fmtMoney(1500),
      contractMonths: 12,
      saleTitle: "Contrato de prestação de serviços",
      ctaUrl: `${appUrl}/crm/vendas`,
      isTest: true,
    });

    if (!RESEND_API_KEY) return json({ error: "Serviço de e-mail não configurado." }, 500);

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: buildFromAddress(settings),
        to: [recipient],
        subject,
        html,
      }),
    });
    const resendData = await resendRes.json().catch(() => ({}));

    await admin.from("crm_renewal_notice_logs").insert({
      owner_user_id: accountOwnerId,
      deal_id: null,
      notice_type: "test",
      recipient_email: recipient,
      recipient_role: "self",
      status: resendRes.ok ? "sent" : "failed",
      error_message: resendRes.ok ? null : JSON.stringify(resendData).slice(0, 500),
      provider_message_id: resendData?.id ?? null,
      sent_at: resendRes.ok ? new Date().toISOString() : null,
    });

    if (!resendRes.ok) {
      console.error("[crm-renewal-test-email] resend error", resendData);
      return json({ error: "Falha ao enviar o e-mail de teste.", details: resendData }, 502);
    }

    return json({ success: true, sent_to: recipient });
  } catch (e) {
    console.error("[crm-renewal-test-email]", e);
    return json({ error: (e as Error).message }, 500);
  }
});
