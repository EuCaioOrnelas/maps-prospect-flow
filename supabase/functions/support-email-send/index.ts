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
const REPLY_DOMAIN = "wiize.com.br"; // suporte+TICKETNUMBER@wiize.com.br
const ADMIN_INBOX = "wiize.app@gmail.com";
const APP_URL = "https://wiize.com.br";
const BRAND_COLOR = "#3daa57";
const LOGO = "https://lqfqnqfeuneorxocybru.supabase.co/storage/v1/object/public/avatars/email/logo_wiize.png";

function layout(title: string, body: string, preheader?: string) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
${preheader ? `<div style="display:none;font-size:1px;opacity:0;max-height:0;overflow:hidden;">${preheader}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
<tr><td style="background:${BRAND_COLOR};padding:20px 32px;">
  <img src="${LOGO}" alt="Wiize" width="28" height="28" style="vertical-align:middle;border-radius:6px;">
  <span style="color:#fff;font-size:18px;font-weight:700;margin-left:8px;vertical-align:middle;">Wiize • Suporte</span>
</td></tr>
<tr><td style="padding:28px 32px;color:#27272a;font-size:15px;line-height:1.6;">${body}</td></tr>
<tr><td style="padding:14px 32px;background:#fafafa;text-align:center;border-top:1px solid #e4e4e7;">
  <p style="margin:0;font-size:12px;color:#a1a1aa;">Wiize Tecnologia — <a href="${APP_URL}" style="color:${BRAND_COLOR};text-decoration:none;">wiize.com.br</a></p>
</td></tr>
</table></td></tr></table></body></html>`;
}

function esc(s: string) {
  return (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function nl2br(s: string) {
  return esc(s).replace(/\n/g, "<br>");
}

function buildSubject(category: string, ticketNumber: string, override?: string) {
  if (override) return override;
  const cat = category || "Atendimento";
  return `Suporte Wiize - ${cat} - Ticket #${ticketNumber}`;
}

async function sendResend(payload: any) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
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
    const { type, ticketId, message, subjectOverride } = body as {
      type: "admin_new_ticket" | "customer_reply" | "customer_rating_request" | "customer_autoclose_followup";
      ticketId: string;
      message?: string;
      subjectOverride?: string;
    };
    if (!type || !ticketId) {
      return new Response(JSON.stringify({ error: "type and ticketId are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: ticket, error: tErr } = await sb
      .from("support_tickets")
      .select("*")
      .eq("id", ticketId)
      .maybeSingle();
    if (tErr || !ticket) throw new Error("Ticket não encontrado");

    const ticketNumber = ticket.ticket_number || ticket.id.slice(0, 8).toUpperCase();
    const category = ticket.category || "Atendimento";
    const subject = buildSubject(category, ticketNumber, subjectOverride);
    const replyTo = `suporte+${ticketNumber}@${REPLY_DOMAIN}`;
    const customerEmail = ticket.email;
    const customerName = ticket.name || "Cliente";

    if (type === "admin_new_ticket") {
      const html = layout("Novo ticket", `
        <h2 style="margin:0 0 12px;font-size:20px;color:#18181b;">📬 Novo ticket aberto</h2>
        <p style="margin:0 0 16px;color:#52525b;">Um cliente acabou de abrir um chamado no suporte.</p>
        <table style="width:100%;border-collapse:collapse;margin:8px 0 18px;">
          <tr><td style="padding:6px 0;color:#71717a;font-size:13px;width:130px;">Protocolo</td><td style="padding:6px 0;font-weight:600;">${esc(ticketNumber)}</td></tr>
          <tr><td style="padding:6px 0;color:#71717a;font-size:13px;">Nome</td><td style="padding:6px 0;">${esc(customerName)}</td></tr>
          <tr><td style="padding:6px 0;color:#71717a;font-size:13px;">E-mail</td><td style="padding:6px 0;">${esc(customerEmail || "—")}</td></tr>
          <tr><td style="padding:6px 0;color:#71717a;font-size:13px;">Telefone</td><td style="padding:6px 0;">${esc(ticket.phone || "—")}</td></tr>
          <tr><td style="padding:6px 0;color:#71717a;font-size:13px;">Categoria</td><td style="padding:6px 0;">${esc(category)}</td></tr>
          <tr><td style="padding:6px 0;color:#71717a;font-size:13px;">Assunto</td><td style="padding:6px 0;">${esc(ticket.subject || "—")}</td></tr>
          <tr><td style="padding:6px 0;color:#71717a;font-size:13px;">Aberto em</td><td style="padding:6px 0;">${new Date(ticket.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td></tr>
        </table>
        <div style="padding:14px 16px;background:#f4f4f5;border-radius:8px;border-left:3px solid ${BRAND_COLOR};">
          <p style="margin:0 0 6px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:.5px;">Mensagem inicial</p>
          <p style="margin:0;white-space:pre-wrap;color:#27272a;">${nl2br(ticket.ai_summary || ticket.subject || "(sem descrição)")}</p>
        </div>
        <p style="margin:22px 0 0;"><a href="${APP_URL}/admin/suporte/tickets" style="display:inline-block;padding:12px 22px;background:${BRAND_COLOR};color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Abrir no painel</a></p>
      `, `Novo ticket ${ticketNumber} — ${customerName}`);

      await sendResend({
        from: FROM,
        to: [ADMIN_INBOX],
        subject: `[NOVO] ${subject}`,
        html,
      });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!customerEmail) throw new Error("Ticket sem e-mail do cliente");

    if (type === "customer_reply") {
      const msg = (message || "").trim();
      if (!msg) throw new Error("message é obrigatória");
      const html = layout(subject, `
        <p style="margin:0 0 12px;color:#27272a;">Olá ${esc(customerName)},</p>
        <p style="margin:0 0 14px;color:#52525b;">Você recebeu uma nova resposta da equipe Wiize referente ao seu atendimento <strong>#${esc(ticketNumber)}</strong>.</p>
        <div style="padding:16px;background:#f4f4f5;border-left:3px solid ${BRAND_COLOR};border-radius:8px;margin:12px 0 18px;">
          <p style="margin:0;white-space:pre-wrap;color:#18181b;">${nl2br(msg)}</p>
        </div>
        <p style="margin:0 0 8px;color:#52525b;font-size:14px;">Para responder, basta <strong>responder este e-mail</strong>. Sua resposta entra automaticamente no seu chamado.</p>
        <p style="margin:18px 0 0;color:#71717a;font-size:13px;">Atenciosamente,<br><strong>Equipe Wiize</strong></p>
      `, `Resposta no ticket ${ticketNumber}`);

      await sendResend({
        from: FROM,
        to: [customerEmail],
        subject,
        html,
        reply_to: replyTo,
        headers: { "X-Wiize-Ticket": ticketNumber },
      });

      await sb.from("support_tickets")
        .update({ last_support_reply_at: new Date().toISOString() })
        .eq("id", ticketId);

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (type === "customer_rating_request") {
      // Gera token caso não exista
      let token = ticket.rating_token;
      if (!token) {
        token = crypto.randomUUID().replace(/-/g, "");
        await sb.from("support_tickets").update({ rating_token: token }).eq("id", ticketId);
      }
      const ratingUrl = `${APP_URL}/avaliacao/${token}`;
      const ratingSubject = `Sua opinião é importante para a Wiize 🚀 (Ticket #${ticketNumber})`;
      const html = layout(ratingSubject, `
        <h2 style="margin:0 0 12px;font-size:22px;color:#18181b;">Sua opinião vale ouro pra gente 💚</h2>
        <p style="margin:0 0 14px;color:#52525b;">Olá ${esc(customerName)},</p>
        <p style="margin:0 0 14px;color:#52525b;">Acabamos de encerrar o seu atendimento <strong>#${esc(ticketNumber)}</strong>. Queremos saber se conseguimos te ajudar de verdade — leva menos de 30 segundos e nos ajuda a evoluir o suporte da Wiize.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${ratingUrl}" style="display:inline-block;padding:14px 28px;background:${BRAND_COLOR};color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">Avaliar atendimento</a>
        </div>
        <p style="margin:18px 0 0;color:#71717a;font-size:13px;">Obrigado por confiar na Wiize.<br><strong>Equipe Wiize</strong></p>
      `, "Conta pra gente como foi seu atendimento");

      await sendResend({
        from: FROM,
        to: [customerEmail],
        subject: ratingSubject,
        html,
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
      const followupSubject = `Encerramos seu ticket #${ticketNumber} — nos conta como foi? 💚`;
      const html = layout(followupSubject, `
        <h2 style="margin:0 0 12px;font-size:22px;color:#18181b;">A gente te ajudou — agora sua opinião ajuda a gente 🚀</h2>
        <p style="margin:0 0 14px;color:#52525b;">Olá ${esc(customerName)},</p>
        <p style="margin:0 0 14px;color:#52525b;">Como não tivemos retorno nas últimas 72 horas, encerramos seu chamado <strong>#${esc(ticketNumber)}</strong>. Se ainda precisar de algo, é só responder este e-mail que o ticket é reaberto na hora.</p>
        <p style="margin:0 0 14px;color:#52525b;">Antes de ir, deixa um feedback rápido pra gente? Leva 30 segundos e ajuda muito o time a melhorar.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${ratingUrl}" style="display:inline-block;padding:14px 28px;background:${BRAND_COLOR};color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">Quero avaliar</a>
        </div>
        <p style="margin:18px 0 0;color:#71717a;font-size:13px;">Valeu pela parceria.<br><strong>Equipe Wiize</strong></p>
      `, "Encerramos seu ticket por inatividade — conta como foi");

      await sendResend({
        from: FROM,
        to: [customerEmail],
        subject: followupSubject,
        html,
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
