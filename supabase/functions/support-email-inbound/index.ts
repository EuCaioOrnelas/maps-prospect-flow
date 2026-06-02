// Webhook para receber e-mails recebidos (Resend Inbound) e anexar ao ticket correspondente.
// Procura o número do ticket no destinatário (suporte+WIZ-123@wiize.com.br) ou no assunto.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractTicketNumber(input: string | null | undefined): string | null {
  if (!input) return null;
  // Padrão suporte+WIZ-123@... ou Ticket #WIZ-123 / #WIZ-123
  const reAddr = /suporte\+([A-Z0-9-]+)@/i;
  const m1 = input.match(reAddr);
  if (m1) return m1[1].toUpperCase();
  const reSubj = /#\s*([A-Z]{2,4}-?\d+|WIZ-\d+|[A-Z0-9]{4,})/i;
  const m2 = input.match(reSubj);
  if (m2) return m2[1].toUpperCase();
  return null;
}

function cleanReplyText(raw: string): string {
  if (!raw) return "";
  // Remove quoted history (linhas começando com >, "Em ... escreveu", "On ... wrote")
  const lines = raw.split(/\r?\n/);
  const out: string[] = [];
  for (const ln of lines) {
    if (/^\s*>/.test(ln)) break;
    if (/^(em|on)\s.+(escreveu|wrote):\s*$/i.test(ln.trim())) break;
    if (/^-{2,}\s*forwarded message\s*-{2,}/i.test(ln)) break;
    out.push(ln);
  }
  return out.join("\n").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const payload = await req.json().catch(() => ({}));
    // Resend inbound formato: { from, to, subject, text, html, ...} ou { data: {...} }
    const data = payload?.data ?? payload;
    const to = Array.isArray(data.to) ? data.to.join(",") : String(data.to || "");
    const from = String(data.from || data.sender || "");
    const subject = String(data.subject || "");
    const text = String(data.text || data.body_plain || "");
    const html = String(data.html || data.body_html || "");

    const ticketNumber =
      extractTicketNumber(to) ||
      extractTicketNumber(subject) ||
      extractTicketNumber(data?.headers?.["In-Reply-To"] || "");

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

    const cleaned = cleanReplyText(text || html.replace(/<[^>]+>/g, " "));
    const content = cleaned || "(mensagem sem texto)";

    await sb.from("support_messages").insert({
      ticket_id: ticket.id,
      role: "user",
      content,
      metadata: { source: "email_inbound", from, subject },
    });

    // Reabrir se fechado, atualizar last reply
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
