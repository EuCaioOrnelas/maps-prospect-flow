// Webhook para receber e-mails recebidos (Resend Inbound) e anexar ao ticket correspondente.
// Procura o número do ticket no destinatário (suporte+WIZ-123@wiize.com.br) ou no assunto.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

function extractTicketNumber(input: string | null | undefined): string | null {
  if (!input) return null;
  const reAddr = /suporte\+([A-Z0-9-]+)@/i;
  const m1 = input.match(reAddr);
  if (m1) return m1[1].toUpperCase();
  const reSubj = /(?:^|\b)(WIZ-?\d{3,}|TEST-?\d{8,})(?:\b|$)/i;
  const m2 = input.match(reSubj);
  if (m2) return m2[1].toUpperCase().replace(/^WIZ(\d)/, "WIZ-$1");
  return null;
}

// Converte HTML em texto preservando quebras, removendo blocos citados (gmail_quote, blockquote, "Em ... escreveu:")
function htmlToCleanText(html: string): string {
  if (!html) return "";
  let s = html;
  // Remove blocos citados típicos
  s = s.replace(/<blockquote[\s\S]*?<\/blockquote>/gi, "");
  s = s.replace(/<div[^>]*class="?gmail_quote"?[\s\S]*?<\/div>/gi, "");
  s = s.replace(/<div[^>]*class="?gmail_attr"?[\s\S]*?<\/div>/gi, "");
  s = s.replace(/<div[^>]*id="?(divRplyFwdMsg|appendonsend)"?[\s\S]*$/gi, "");
  // Quebras de linha
  s = s.replace(/<br\s*\/?>(?!\n)/gi, "\n");
  s = s.replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n");
  // Remove style/script
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  // Strip tags
  s = s.replace(/<[^>]+>/g, " ");
  // Decode common entities
  s = s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
       .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return s;
}

function stripQuotedLines(raw: string): string {
  if (!raw) return "";
  const lines = raw.split(/\r?\n/);
  const out: string[] = [];
  for (const ln of lines) {
    const t = ln.trim();
    if (/^>/.test(t)) break;
    if (/^(em|on)\s.+(escreveu|wrote):\s*$/i.test(t)) break;
    if (/^-{2,}\s*forwarded message\s*-{2,}/i.test(t)) break;
    if (/^De:\s/i.test(t) && out.length > 0) break; // header de email citado
    out.push(ln);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function extractBody(text: string, html: string): string {
  // 1) Tenta texto puro
  const fromText = stripQuotedLines(text || "");
  if (fromText && fromText.length > 1) return fromText;
  // 2) Cai para HTML limpo
  const fromHtml = stripQuotedLines(htmlToCleanText(html || ""));
  return fromHtml;
}

async function fetchReceivedEmail(data: any) {
  const hasBody = !!(data?.text || data?.body_plain || data?.plain || data?.html || data?.body_html);
  const emailId = data?.email_id || data?.id;
  if (hasBody || !emailId || !RESEND_API_KEY) return data;

  const res = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
    headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
  });
  const detail = await res.json().catch(() => null);
  if (!res.ok || !detail) {
    console.warn("[support-email-inbound] failed to fetch email content", { emailId, status: res.status, detail });
    return data;
  }
  return { ...data, ...detail };
}

function isOwnSupportEmail(from: string, subject: string) {
  const lower = `${from} ${subject}`.toLowerCase();
  return /suporte@wiize\.com\.br/.test(lower) && /(confirmação de abertura|novo chamado|avaliação do seu atendimento|encerrado por inatividade|suporte wiize)/i.test(subject);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const payload = await req.json().catch(() => ({}));
    const data = await fetchReceivedEmail(payload?.data ?? payload);
    const to = Array.isArray(data.to) ? data.to.join(",") : String(data.to || "");
    const from = String(data.from || data.sender || "");
    const subject = String(data.subject || "");
    const text = String(data.text || data.body_plain || data.plain || "");
    const html = String(data.html || data.body_html || "");

    const ticketNumber =
      extractTicketNumber(to) ||
      extractTicketNumber(subject) ||
      extractTicketNumber(data?.headers?.["In-Reply-To"] || "") ||
      extractTicketNumber(data?.headers?.["References"] || "");

    console.log("[support-email-inbound] received", { to, subject, ticketNumber, hasText: !!text, hasHtml: !!html });

    if (isOwnSupportEmail(from, subject)) {
      console.log("[support-email-inbound] ignored own support email", { from, subject, ticketNumber });
      return new Response(JSON.stringify({ ok: true, ignored: "own_support_email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ticketNumber) {
      console.warn("[support-email-inbound] sem ticket number identificado", { to, subject });
      return new Response(JSON.stringify({ ok: false, reason: "ticket_not_found" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: ticket } = await sb
      .from("support_tickets")
      .select("id, status, ticket_number, email")
      .eq("ticket_number", ticketNumber)
      .maybeSingle();

    if (!ticket) {
      console.warn("[support-email-inbound] ticket não existe:", ticketNumber);
      return new Response(JSON.stringify({ ok: false, reason: "ticket_not_found" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extracted = extractBody(text, html);
    const content = extracted || "(mensagem sem texto)";
    console.log("[support-email-inbound] extracted body length:", extracted.length);

    await sb.from("support_messages").insert({
      ticket_id: ticket.id,
      role: "user",
      content,
      metadata: { source: "email_inbound", from, subject },
    });

    const update: any = {
      last_customer_reply_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (["resolved", "closed"].includes(ticket.status)) {
      update.status = "open";
      update.phase = "human_assigned";
      update.resolved_at = null;
      update.autoclose_followup_sent_at = null;
    }
    await sb.from("support_tickets").update(update).eq("id", ticket.id);

    await sb.from("support_ticket_history").insert({
      ticket_id: ticket.id,
      author_id: null,
      author_name: from || "Cliente (e-mail)",
      action_type: "customer_email_reply",
      content,
      attachments: [],
    });

    return new Response(JSON.stringify({ ok: true, ticketId: ticket.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[support-email-inbound] error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
