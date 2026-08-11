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

/** Monta o link do WhatsApp a partir do telefone de contato (DDI 55 automático). */
function buildWhatsappUrl(phone: string | null | undefined): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return "";
  const full = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${full}`;
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

  // O botão principal leva sempre para o WhatsApp do contato; o e-mail fica apenas informativo.
  const ctaUrl = buildWhatsappUrl(contactPhone) || data.ctaUrl;

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
      <a href="${esc(ctaUrl)}" style="display:inline-block;padding:13px 28px;background:${button};color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">${esc(cta)}</a>
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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const fmtMoney = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const APP_URL = "https://wiize.com.br";

type NoticeType = "30_days" | "15_days" | "7_days" | "custom_4_6_months";

const NOTICE_COLUMN: Record<NoticeType, string | null> = {
  "30_days": "notice_30d_sent_at",
  "15_days": "notice_15d_sent_at",
  "7_days": "notice_7d_sent_at",
  // Faixa 4–6 meses: regra de negócio ainda NÃO definida oficialmente.
  // Usa a coluna de 7 dias como marcador de "aviso único" enquanto a regra não existir.
  custom_4_6_months: "notice_7d_sent_at",
};

/**
 * Regras de aviso por duração de contrato.
 * - até 3 meses: 1 aviso, 7 dias antes (muda status para "expiring")
 * - acima de 6 meses: 30 dias (muda status) e 15 dias (não muda status)
 * - 4 a 6 meses: 15 dias antes por padrão (configurável em `notice_days_4_6_months`)
 */
function pickNotice(
  months: number,
  daysLeft: number,
  custom4to6: number | null,
): { type: NoticeType; changesStatus: boolean } | null {
  if (months <= 3) {
    if (daysLeft <= 7) return { type: "7_days", changesStatus: true };
    return null;
  }
  if (months > 6) {
    if (daysLeft <= 15) return { type: "15_days", changesStatus: false };
    if (daysLeft <= 30) return { type: "30_days", changesStatus: true };
    return null;
  }
  // 4 a 6 meses — padrão 15 dias
  const days = custom4to6 && custom4to6 > 0 ? custom4to6 : 15;
  if (daysLeft <= days) return { type: "custom_4_6_months", changesStatus: true };
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const summary = { processed: 0, expired: 0, notices: 0, emails: 0, skipped: 0, errors: 0 };
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // ── 1) Contratos vencidos viram "expired" (independe do aviso estar ativo) ──
    const todayISO = today.toISOString().slice(0, 10);
    const { data: overdue } = await admin
      .from("lead_deals")
      .select("id")
      .eq("sale_type", "recurring")
      .in("status", ["active", "expiring"])
      .not("expiration_date", "is", null)
      .lt("expiration_date", todayISO);

    if (overdue?.length) {
      await admin
        .from("lead_deals")
        .update({ status: "expired" })
        .in("id", overdue.map((d) => d.id));
      summary.expired = overdue.length;
    }

    // ── 2) Contas com aviso de renovação ATIVADO ──────────────────────────────
    const { data: accounts } = await admin.from("crm_renewal_settings").select("*").eq("enabled", true);
    if (!accounts?.length) return json({ success: true, ...summary, reason: "no_enabled_accounts" });

    for (const settings of accounts as (RenewalSettings & { owner_user_id: string })[]) {
      const ownerId = settings.owner_user_id;

      const { data: deals, error: dealsErr } = await admin
        .from("lead_deals")
        .select(
          "id, lead_id, title, value, contract_months, sale_type, start_date, expiration_date, status, responsible_user_id, renewed_at, notice_30d_sent_at, notice_15d_sent_at, notice_7d_sent_at, lead:leads(id, company_name, contact_name, email)",
        )
        .eq("owner_user_id", ownerId)
        .eq("sale_type", "recurring")
        .in("status", ["active", "expiring"])
        .is("renewed_at", null)
        .not("expiration_date", "is", null);

      if (dealsErr) {
        console.error("[crm-renewal-processor] deals error", dealsErr);
        summary.errors++;
        continue;
      }

      // E-mail do owner (fallback interno)
      const { data: ownerProfile } = await admin.from("profiles").select("email, name").eq("id", ownerId).maybeSingle();

      for (const deal of deals || []) {
        summary.processed++;
        const exp = new Date(`${deal.expiration_date}T00:00:00`);
        const daysLeft = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
        if (daysLeft < 0) continue;

        const months = Number(deal.contract_months || 0);
        if (!months) continue;

        const notice = pickNotice(months, daysLeft, settings.notice_days_4_6_months ?? null);
        if (!notice) continue;

        const column = NOTICE_COLUMN[notice.type]!;
        if ((deal as any)[column]) continue; // idempotência por contrato + tipo de aviso

        // Destinatários: cliente + responsável interno (responsável do lead/venda, senão owner)
        const recipients: { email: string; role: string }[] = [];
        const clientEmail = (deal as any).lead?.email as string | null;
        if (isValidEmail(clientEmail)) {
          recipients.push({ email: clientEmail!.trim().toLowerCase(), role: "client" });
        } else {
          await admin.from("crm_renewal_notice_logs").insert({
            owner_user_id: ownerId,
            deal_id: deal.id,
            lead_id: deal.lead_id,
            notice_type: notice.type,
            recipient_email: null,
            recipient_role: "client",
            status: "skipped",
            error_message: "Cliente sem e-mail válido cadastrado",
          });
          summary.skipped++;
        }

        let internalEmail: string | null = null;
        let internalRole = "owner";
        if (deal.responsible_user_id) {
          const { data: resp } = await admin
            .from("profiles")
            .select("email")
            .eq("id", deal.responsible_user_id)
            .maybeSingle();
          if (isValidEmail(resp?.email)) {
            internalEmail = resp!.email!.trim().toLowerCase();
            internalRole = "responsible";
          }
        }
        if (!internalEmail && isValidEmail(ownerProfile?.email)) {
          internalEmail = ownerProfile!.email!.trim().toLowerCase();
          internalRole = "owner";
        }
        if (internalEmail && !recipients.some((r) => r.email === internalEmail)) {
          recipients.push({ email: internalEmail, role: internalRole });
        }
        if (!internalEmail) {
          await admin.from("crm_renewal_notice_logs").insert({
            owner_user_id: ownerId,
            deal_id: deal.id,
            lead_id: deal.lead_id,
            notice_type: notice.type,
            recipient_email: null,
            recipient_role: "internal",
            status: "skipped",
            error_message: "Nenhum destinatário interno com e-mail válido (responsável e owner sem e-mail)",
          });
          summary.skipped++;
        }

        // Status muda mesmo que não haja destinatário — o comercial precisa enxergar na tabela
        if (notice.changesStatus && deal.status !== "expiring") {
          await admin.from("lead_deals").update({ status: "expiring" }).eq("id", deal.id);
        }

        if (!recipients.length) {
          await admin.from("lead_deals").update({ [column]: new Date().toISOString() }).eq("id", deal.id);
          continue;
        }

        const { subject, html } = renderRenewalEmail(settings, {
          clientName: (deal as any).lead?.contact_name || "Cliente",
          companyName: (deal as any).lead?.company_name || "",
          expirationDate: exp.toLocaleDateString("pt-BR"),
          daysLeft,
          contractValue: fmtMoney(Number(deal.value || 0)),
          contractMonths: months,
          saleTitle: deal.title || "Contrato",
          ctaUrl: `${APP_URL}/crm/vendas`,
        });

        for (const r of recipients) {
          // Trava extra de idempotência (execuções concorrentes)
          const { data: already } = await admin
            .from("crm_renewal_notice_logs")
            .select("id")
            .eq("deal_id", deal.id)
            .eq("notice_type", notice.type)
            .eq("recipient_email", r.email)
            .eq("status", "sent")
            .maybeSingle();
          if (already) continue;

          let ok = false;
          let providerId: string | null = null;
          let errorMsg: string | null = null;

          if (!RESEND_API_KEY) {
            errorMsg = "RESEND_API_KEY ausente";
          } else {
            try {
              const res = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({ from: buildFromAddress(settings), to: [r.email], subject, html }),
              });
              const data = await res.json().catch(() => ({}));
              ok = res.ok;
              providerId = data?.id ?? null;
              if (!ok) errorMsg = JSON.stringify(data).slice(0, 500);
            } catch (e) {
              errorMsg = (e as Error).message;
            }
          }

          const { error: logErr } = await admin.from("crm_renewal_notice_logs").insert({
            owner_user_id: ownerId,
            deal_id: deal.id,
            lead_id: deal.lead_id,
            notice_type: notice.type,
            recipient_email: r.email,
            recipient_role: r.role,
            status: ok ? "sent" : "failed",
            error_message: errorMsg,
            provider_message_id: providerId,
            sent_at: ok ? new Date().toISOString() : null,
          });
          if (logErr) console.error("[crm-renewal-processor] log error", logErr);

          if (ok) summary.emails++;
          else summary.errors++;
        }

        await admin.from("lead_deals").update({ [column]: new Date().toISOString() }).eq("id", deal.id);
        summary.notices++;
      }
    }

    return json({ success: true, ...summary });
  } catch (e) {
    console.error("[crm-renewal-processor]", e);
    return json({ error: (e as Error).message, ...summary }, 500);
  }
});
