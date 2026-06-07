// Sender central de e-mails do sistema de Suporte Wiize (via Resend).
// Tipos:
//  - admin_new_ticket: notificação interna para wiize.app@gmail.com
//  - customer_reply: mensagem do suporte → e-mail do cliente (mantém thread por Reply-To)
//  - customer_rating_request: solicita avaliação ao fechar/resolver ticket
//  - customer_autoclose_followup: follow-up após 72h sem resposta
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM = "Suporte Wiize <suporte@wiize.com.br>";
const REPLY_DOMAIN = "wiize.com.br";
const ADMIN_INBOX = "wiize.app@gmail.com";
const APP_URL = "https://wiize.com.br";
const LOGO_URL = "https://www.wiize.com.br/__l5e/assets-v1/c1316496-9ea5-4ee1-864d-4a0400483aea/wiize-logo.png";
const BRAND = "#0E7C3A"; // verde sóbrio, alto contraste
const BRAND_SOFT = "#E8F5EE";

// Layout limpo, alto ratio texto/HTML.
// Logo oficial da Wiize em imagem pública para evitar o placeholder textual "W".
function wiizeLogoSvg() {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="vertical-align:middle;"><img src="${LOGO_URL}" width="38" height="38" alt="Wiize" style="display:block;border:0;border-radius:8px;width:38px;height:38px;object-fit:cover;"></td>
    <td style="vertical-align:middle;padding-left:10px;font-family:Helvetica,Arial,sans-serif;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:0;">Wiize</td>
  </tr></table>`;
}

function layout(title: string, bodyHtml: string, preheader: string) {
  return `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2328;">
<div style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f6f8;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;border:1px solid #e6e8eb;">
<tr><td style="padding:24px 28px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="vertical-align:middle;">${wiizeLogoSvg()}</td>
    <td align="right" style="vertical-align:middle;font-size:12px;color:#6b7280;">Equipe de Suporte</td>
  </tr></table>
  <hr style="border:none;border-top:1px solid #eef0f2;margin:18px 0 0;">
</td></tr>
<tr><td style="padding:22px 28px 6px;color:#1f2328;font-size:15px;line-height:1.6;">${bodyHtml}</td></tr>
<tr><td style="padding:18px 28px 26px;">
  <hr style="border:none;border-top:1px solid #eef0f2;margin:0 0 14px;">
  <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5;">
    Wiize Tecnologia · <a href="${APP_URL}" style="color:${BRAND};text-decoration:none;">wiize.com.br</a><br>
    Você está recebendo este e-mail porque possui um chamado ativo no nosso suporte.
  </p>
</td></tr>
</table>
</td></tr></table></body></html>`;
}


function esc(s: string) {
  return (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
function nl2br(s: string) { return esc(s).replace(/\n/g, "<br>"); }
function htmlToText(html: string) {
  return html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]+>/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function buildSubject(category: string, ticketNumber: string, override?: string) {
  if (override) return override;
  // Assunto neutro, sem promessas/emojis (reduz spam score)
  return `Re: Chamado ${ticketNumber} | Suporte Wiize`;
}

async function sendResend(payload: any) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[support-email-send] Resend error:", res.status, data);
    throw new Error(data?.message || `Resend ${res.status}`);
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const { type, ticketId, message, subjectOverride, attachments, plan: planOverride } = body as {
      type: "admin_new_ticket" | "customer_reply" | "customer_rating_request" | "customer_autoclose_followup" | "customer_ticket_receipt";
      ticketId: string;
      message?: string;
      subjectOverride?: string;
      attachments?: { filename: string; content: string; content_type?: string }[];
      plan?: string | null;
    };
    if (!type || !ticketId) {
      return new Response(JSON.stringify({ error: "type and ticketId are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: ticket, error: tErr } = await sb
      .from("support_tickets").select("*").eq("id", ticketId).maybeSingle();
    if (tErr || !ticket) throw new Error("Ticket não encontrado");

    const ticketNumber = ticket.ticket_number || ticket.id.slice(0, 8).toUpperCase();
    const category = ticket.category || "Atendimento";
    const subject = buildSubject(category, ticketNumber, subjectOverride);
    const replyTo = `suporte+${ticketNumber}@${REPLY_DOMAIN}`;
    const customerEmail = ticket.email;
    const customerName = ticket.name || "Cliente";

    if (type === "admin_new_ticket") {
      const bodyHtml = `
        <p style="margin:0 0 14px;font-size:16px;font-weight:600;color:#0f172a;">Novo chamado aberto</p>
        <table style="width:100%;border-collapse:collapse;margin:0 0 14px;">
          <tr><td style="padding:5px 0;color:#6b7280;font-size:13px;width:120px;">Protocolo</td><td style="padding:5px 0;font-weight:600;">${esc(ticketNumber)}</td></tr>
          <tr><td style="padding:5px 0;color:#6b7280;font-size:13px;">Cliente</td><td style="padding:5px 0;">${esc(customerName)}</td></tr>
          <tr><td style="padding:5px 0;color:#6b7280;font-size:13px;">E-mail</td><td style="padding:5px 0;">${esc(customerEmail || "Não informado")}</td></tr>
          <tr><td style="padding:5px 0;color:#6b7280;font-size:13px;">Telefone</td><td style="padding:5px 0;">${esc(ticket.phone || "Não informado")}</td></tr>
          <tr><td style="padding:5px 0;color:#6b7280;font-size:13px;">Categoria</td><td style="padding:5px 0;">${esc(category)}</td></tr>
          <tr><td style="padding:5px 0;color:#6b7280;font-size:13px;">Assunto</td><td style="padding:5px 0;">${esc(ticket.subject || "Não informado")}</td></tr>
          <tr><td style="padding:5px 0;color:#6b7280;font-size:13px;">Aberto em</td><td style="padding:5px 0;">${new Date(ticket.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td></tr>
        </table>
        <div style="padding:12px 14px;background:${BRAND_SOFT};border-radius:6px;border-left:3px solid ${BRAND};">
          <p style="margin:0 0 4px;font-size:11px;color:#374151;text-transform:uppercase;letter-spacing:.5px;">Mensagem</p>
          <p style="margin:0;color:#1f2328;white-space:pre-wrap;">${nl2br(ticket.ai_summary || ticket.subject || "(sem descrição)")}</p>
        </div>
        <p style="margin:18px 0 0;"><a href="${APP_URL}/admin/suporte/tickets" style="display:inline-block;padding:10px 18px;background:${BRAND};color:#ffffff;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">Abrir no painel</a></p>
      `;
      const html = layout(subject, bodyHtml, `Novo chamado ${ticketNumber} de ${customerName}`);
      await sendResend({
        from: FROM,
        to: [ADMIN_INBOX],
        subject: `Novo chamado ${ticketNumber} | ${customerName}`,
        html,
        text: htmlToText(bodyHtml) + `\n\nAbrir no painel: ${APP_URL}/admin/suporte/tickets`,
      });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!customerEmail) throw new Error("Ticket sem e-mail do cliente");

    if (type === "customer_reply") {
      const msg = (message || "").trim();
      if (!msg && !(attachments && attachments.length)) throw new Error("message ou attachments obrigatórios");
      const bodyHtml = `
        <p style="margin:0 0 10px;">Olá ${esc(customerName)},</p>
        <p style="margin:0 0 14px;color:#374151;">Segue retorno da nossa equipe sobre o seu chamado <strong>${esc(ticketNumber)}</strong>.</p>
        <div style="padding:12px 14px;background:#f7f9fb;border:1px solid #e6e8eb;border-radius:6px;margin:0 0 16px;">
          <p style="margin:0;color:#1f2328;white-space:pre-wrap;">${nl2br(msg || "(mensagem com anexos)")}</p>
        </div>
        <p style="margin:0 0 6px;color:#374151;font-size:14px;">Para continuar, basta responder este e-mail. Sua mensagem entra automaticamente no chamado.</p>
        <p style="margin:16px 0 0;color:#6b7280;font-size:13px;">Atenciosamente,<br>Equipe de Suporte Wiize</p>
      `;
      const html = layout(subject, bodyHtml, `Retorno sobre o seu chamado ${ticketNumber}`);
      const payload: any = {
        from: FROM,
        to: [customerEmail],
        subject,
        html,
        text: htmlToText(bodyHtml),
        reply_to: replyTo,
        headers: {
          "X-Wiize-Ticket": ticketNumber,
          "List-Unsubscribe": `<mailto:${replyTo}?subject=unsubscribe>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          "X-Entity-Ref-ID": ticketNumber,
        },

      };
      if (attachments && attachments.length) {
        payload.attachments = attachments.map((a) => ({
          filename: a.filename,
          content: a.content, // base64
        }));
      }
      await sendResend(payload);
      await sb.from("support_tickets")
        .update({ last_support_reply_at: new Date().toISOString() })
        .eq("id", ticketId);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (type === "customer_rating_request") {
      let token = ticket.rating_token;
      if (!token) {
        token = crypto.randomUUID().replace(/-/g, "");
        await sb.from("support_tickets").update({ rating_token: token }).eq("id", ticketId);
      }
      const ratingUrl = `${APP_URL}/avaliacao/${token}`;
      const ratingSubject = `Como foi o seu atendimento? | Chamado ${ticketNumber}`;
      const firstName = esc((customerName || "").split(" ")[0] || "");
      const bodyHtml = `
        <div style="text-align:center;font-size:28px;letter-spacing:6px;color:#F5B301;margin:4px 0 14px;line-height:1;">★ ★ ★ ★ ★</div>
        <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#0f172a;text-align:center;letter-spacing:-0.2px;">Como foi o seu atendimento?</h1>
        <p style="margin:0 0 18px;color:#6b7280;text-align:center;font-size:14px;">Sua opinião molda o nosso suporte. Leva menos de 30 segundos.</p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND_SOFT};border:1px solid #d4ead9;border-radius:10px;margin:0 0 22px;">
          <tr><td style="padding:18px 20px;">
            <p style="margin:0 0 6px;font-size:13px;text-transform:uppercase;letter-spacing:0.6px;color:${BRAND};font-weight:700;">Chamado concluído</p>
            <p style="margin:0;font-size:17px;font-weight:600;color:#0f172a;font-family:'SF Mono',Menlo,Consolas,monospace;">${esc(ticketNumber)}</p>
          </td></tr>
        </table>

        <p style="margin:0 0 18px;color:#374151;font-size:15px;line-height:1.6;">Olá${firstName ? ` <strong>${firstName}</strong>` : ""}, encerramos o seu chamado e gostaríamos de saber a sua experiência com o nosso time. A sua avaliação é o que nos faz melhorar a cada dia.</p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 20px;"><tr><td align="center">
          <a href="${ratingUrl}" style="display:inline-block;padding:15px 38px;background:${BRAND};color:#ffffff;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.2px;box-shadow:0 4px 12px rgba(14,124,58,0.25);">Avaliar atendimento →</a>
        </td></tr></table>

        <p style="margin:0 0 18px;text-align:center;color:#9ca3af;font-size:12px;">Leva menos de 30 segundos · Apenas 2 perguntas</p>

        <p style="margin:18px 0 0;color:#6b7280;font-size:13px;">Obrigado por confiar na Wiize.<br><strong style="color:#0f172a;">Equipe de Suporte</strong></p>
      `;
      const html = layout(ratingSubject, bodyHtml, `Avalie o seu atendimento ${ticketNumber} — leva 30 segundos`);
      await sendResend({
        from: FROM,
        to: [customerEmail],
        subject: ratingSubject,
        html,
        text: htmlToText(bodyHtml) + `\n\nLink direto: ${ratingUrl}`,
        reply_to: replyTo,
      });
      await sb.from("support_tickets")
        .update({ rating_email_sent_at: new Date().toISOString() })
        .eq("id", ticketId);
      return new Response(JSON.stringify({ ok: true, ratingUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (type === "customer_autoclose_followup") {
      let token = ticket.rating_token;
      if (!token) {
        token = crypto.randomUUID().replace(/-/g, "");
        await sb.from("support_tickets").update({ rating_token: token }).eq("id", ticketId);
      }
      const ratingUrl = `${APP_URL}/avaliacao/${token}`;
      const followupSubject = `Chamado ${ticketNumber} encerrado por inatividade`;
      const bodyHtml = `
        <p style="margin:0 0 10px;">Olá ${esc(customerName)},</p>
        <p style="margin:0 0 12px;color:#374151;">Como não tivemos retorno nas últimas 72 horas, encerramos o seu chamado <strong>${esc(ticketNumber)}</strong>. Se ainda precisar de algo, basta responder este e-mail e o chamado é reaberto automaticamente.</p>
        <p style="margin:0 0 14px;color:#374151;">Se puder, deixe uma avaliação rápida:</p>
        <p style="margin:18px 0;"><a href="${ratingUrl}" style="display:inline-block;padding:11px 22px;background:${BRAND};color:#ffffff;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">Avaliar atendimento</a></p>
        <p style="margin:16px 0 0;color:#6b7280;font-size:13px;">Atenciosamente,<br>Equipe de Suporte Wiize</p>
      `;
      const html = layout(followupSubject, bodyHtml, `Encerramos seu chamado ${ticketNumber} por inatividade`);
      await sendResend({
        from: FROM,
        to: [customerEmail],
        subject: followupSubject,
        html,
        text: htmlToText(bodyHtml) + `\n\nLink direto: ${ratingUrl}`,
        reply_to: replyTo,
      });
      await sb.from("support_tickets")
        .update({
          autoclose_followup_sent_at: new Date().toISOString(),
          rating_email_sent_at: new Date().toISOString(),
        })
        .eq("id", ticketId);
      return new Response(JSON.stringify({ ok: true, ratingUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (type === "customer_ticket_receipt") {
      // Determina canal de retorno conforme plano
      let planLabel: string | null = (planOverride || "").toLowerCase() || null;
      if (!planLabel && ticket.user_id) {
        const { data: prof } = await sb
          .from("profiles")
          .select("plan")
          .eq("id", ticket.user_id)
          .maybeSingle();
        planLabel = (prof?.plan || "").toLowerCase() || null;
      }
      // growth/scale/enterprise => WhatsApp; demais (start/atendimento/trial/null) => email
      const isWhatsapp = !!planLabel && /(growth|scale|enterprise|premium|pro)/.test(planLabel);
      const channelTitle = isWhatsapp ? "WhatsApp" : "e-mail";
      const channelExplain = isWhatsapp
        ? `Por você ser cliente <strong>Growth</strong>, nosso time vai retornar diretamente pelo <strong>WhatsApp</strong> no número informado no chamado (${esc(ticket.phone || "Não informado")}). Se preferir continuar por e-mail, basta responder esta mensagem.`
        : `Como você está no plano <strong>Start / Atendimento</strong>, o retorno será feito por <strong>e-mail</strong>, neste mesmo endereço (${esc(customerEmail)}). Basta responder este e-mail que sua mensagem entra automaticamente no chamado. Se não encontrar nossa confirmação na caixa de entrada, confira também o <strong>Spam</strong> ou <strong>Lixo eletrônico</strong>.`;

      const receiptSubject = `Confirmação de abertura do chamado ${ticketNumber}`;
      const bodyHtml = `
        <p style="margin:0 0 10px;font-size:16px;font-weight:600;color:#0f172a;">Recebemos o seu chamado</p>
        <p style="margin:0 0 12px;">Olá ${esc(customerName)},</p>
        <p style="margin:0 0 14px;color:#374151;">Confirmamos a abertura do seu chamado de suporte. Abaixo estão os dados de protocolo para sua referência:</p>
        <table style="width:100%;border-collapse:collapse;margin:0 0 16px;">
          <tr><td style="padding:5px 0;color:#6b7280;font-size:13px;width:130px;">Protocolo</td><td style="padding:5px 0;font-weight:600;">${esc(ticketNumber)}</td></tr>
          <tr><td style="padding:5px 0;color:#6b7280;font-size:13px;">Assunto</td><td style="padding:5px 0;">${esc(ticket.subject || category)}</td></tr>
          <tr><td style="padding:5px 0;color:#6b7280;font-size:13px;">Categoria</td><td style="padding:5px 0;">${esc(category)}</td></tr>
          <tr><td style="padding:5px 0;color:#6b7280;font-size:13px;">Aberto em</td><td style="padding:5px 0;">${new Date(ticket.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td></tr>
        </table>

        <div style="padding:14px 16px;background:${BRAND_SOFT};border-radius:6px;border-left:3px solid ${BRAND};margin:0 0 16px;">
          <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#0f172a;">Prazo de retorno</p>
          <p style="margin:0;color:#1f2328;font-size:14px;line-height:1.55;">Nossa equipe responde em <strong>até 48 horas úteis</strong> (segunda a sexta, das 9h às 18h, horário de Brasília). Casos mais simples costumam ser respondidos no mesmo dia útil.</p>
        </div>

        <div style="padding:14px 16px;background:#f7f9fb;border:1px solid #e6e8eb;border-radius:6px;margin:0 0 16px;">
          <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#0f172a;">Como você vai receber o retorno: ${channelTitle}</p>
          <p style="margin:0;color:#374151;font-size:14px;line-height:1.55;">${channelExplain}</p>
        </div>

        <p style="margin:0 0 6px;color:#374151;font-size:14px;">Se precisar adicionar alguma informação ao chamado, basta responder este e-mail. Mantenha o número do protocolo no assunto para agilizar.</p>
        <p style="margin:14px 0 0;color:#6b7280;font-size:13px;">Obrigado pela confiança,<br>Equipe de Suporte Wiize</p>
      `;
      const html = layout(receiptSubject, bodyHtml, `Chamado ${ticketNumber} aberto | retorno em até 48h úteis`);
      await sendResend({
        from: FROM,
        to: [customerEmail],
        subject: receiptSubject,
        html,
        text: htmlToText(bodyHtml),
        reply_to: replyTo,
        headers: {
          "X-Wiize-Ticket": ticketNumber,
          "List-Unsubscribe": `<mailto:${replyTo}?subject=unsubscribe>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          "X-Entity-Ref-ID": ticketNumber,
        },
      });
      // best-effort: registra envio (ignora se coluna não existir)
      try {
        await sb.from("support_tickets")
          .update({ receipt_email_sent_at: new Date().toISOString() })
          .eq("id", ticketId);
      } catch (_) { /* coluna opcional */ }
      return new Response(JSON.stringify({ ok: true, channel: isWhatsapp ? "whatsapp" : "email" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "unknown type" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[support-email-send] error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
