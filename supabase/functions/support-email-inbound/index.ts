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
  const lowerFrom = (from || "").toLowerCase();
  // Qualquer coisa que venha do próprio suporte@wiize.com.br é loop-back (rating, receipt, etc.) e deve ser ignorada.
  if (/suporte(\+[^@]+)?@wiize\.com\.br/.test(lowerFrom)) return true;
  return /(recebemos a sua mensagem|confirmação de abertura|novo chamado|como foi o seu atendimento|podemos encerrar o seu atendimento|sobre o seu atendimento|encerrado por inatividade|suporte wiize)/i.test(subject || "");
}

function isAutoReply(data: any, subject: string): boolean {
  const h = data?.headers || {};
  const get = (k: string) => String(h[k] ?? h[k.toLowerCase()] ?? h[k.toUpperCase()] ?? "").toLowerCase();
  const autoSubmitted = get("Auto-Submitted");
  if (autoSubmitted && autoSubmitted !== "no") return true;
  if (get("X-Autoreply") === "yes" || get("X-Autorespond")) return true;
  const precedence = get("Precedence");
  if (["auto_reply", "bulk", "junk", "list"].includes(precedence)) return true;
  if (/^(auto[- ]?reply|out of office|ausência|resposta automática|automatic reply|delivery status notification|undeliverable|mail delivery|returned mail)/i.test(subject || "")) return true;
  return false;
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const payload = await req.json().catch(() => ({}));
    const data = await fetchReceivedEmail(payload?.data ?? payload);
    const to = Array.isArray(data.to) ? data.to.join(",") : String(data.to || "");
    const cc = Array.isArray(data.cc) ? data.cc.join(",") : String(data.cc || "");
    const from = String(data.from || data.sender || "");
    const fromAddress = (from.match(/<([^>]+)>/)?.[1] || from).trim().toLowerCase();
    const subject = String(data.subject || "");
    const text = String(data.text || data.body_plain || data.plain || "");
    const html = String(data.html || data.body_html || "");

    // Headers podem vir como objeto {name: value} ou array [{name, value}] — serializamos tudo
    // para conseguir localizar o protocolo em In-Reply-To / References / X-Wiize-Ticket.
    let headersBlob = "";
    try { headersBlob = JSON.stringify(data?.headers ?? {}); } catch { headersBlob = ""; }

    const ticketNumber =
      extractTicketNumber(to) ||
      extractTicketNumber(cc) ||
      extractTicketNumber(subject) ||
      extractTicketNumber(headersBlob) ||
      extractTicketNumber(String(data?.envelope?.to || ""));

    console.log("[support-email-inbound] received", { to, subject, ticketNumber, hasText: !!text, hasHtml: !!html });

    // ─── Abordagem de influenciadores (compatibilidade com threads +INF antigas) ───
    const outreachToken =
      (`${to},${cc},${headersBlob},${String(data?.envelope?.to || "")}`.match(/parcerias\+INF([a-f0-9]{8,})@/i)?.[1] || "")
        .toLowerCase();
    const isPartnershipInbox = /(?:^|[<\s,])parcerias(?:\+INF[a-f0-9]+)?@wiize\.com\.br/i.test(`${to},${cc},${String(data?.envelope?.to || "")}`);
    if (outreachToken || isPartnershipInbox) {
      const sbOut = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      let rec: any = null;
      if (outreachToken) {
        const result = await sbOut.from("influencer_campaign_recipients")
          .select("id, campaign_id, prospect_id, email, reply_token")
          .like("reply_token", `${outreachToken}%`).order("created_at", { ascending: false }).limit(1).maybeSingle();
        rec = result.data;
      }
      if (!rec && fromAddress) {
        const result = await sbOut.from("influencer_campaign_recipients")
          .select("id, campaign_id, prospect_id, email, reply_token")
          .ilike("email", fromAddress).not("sent_at", "is", null)
          .order("sent_at", { ascending: false }).limit(1).maybeSingle();
        rec = result.data;
      }
      if (rec) {
        const replyBody = extractBody(text, html).slice(0, 8000);
        const providerMessageId = data?.message_id || data?.email_id || data?.id || null;
        const { data: duplicate } = providerMessageId
          ? await sbOut.from("influencer_messages").select("id").eq("provider_message_id", providerMessageId).maybeSingle()
          : { data: null };
        if (!duplicate) {
          const { error: messageError } = await sbOut.from("influencer_messages").insert({
            prospect_id: rec.prospect_id, campaign_id: rec.campaign_id, recipient_id: rec.id,
            direction: "recebida", subject: subject.slice(0, 400), body_text: replyBody || "(mensagem sem texto)",
            body_html: html ? html.slice(0, 60000) : null, from_email: fromAddress || from,
            to_email: "parcerias@wiize.com.br", provider_message_id: providerMessageId,
          });
          if (messageError) throw new Error(`Falha ao salvar resposta do influenciador: ${messageError.message}`);
        }
        await sbOut.from("influencer_campaign_recipients")
          .update({ status: "respondido", replied_at: new Date().toISOString() })
          .eq("id", rec.id);
        await sbOut.from("influencer_prospects").update({ status: "respondeu" }).eq("id", rec.prospect_id);
        await sbOut.from("influencer_contacts")
          .update({ status: "respondeu" })
          .eq("prospect_id", rec.prospect_id).eq("type", "email")
          .eq("normalized_value", String(rec.email).toLowerCase());
        await sbOut.from("influencer_email_events").insert({
          recipient_id: rec.id, campaign_id: rec.campaign_id, prospect_id: rec.prospect_id,
          event_type: "resposta_recebida", detail: subject.slice(0, 300),
          payload: { from, body: replyBody },
        });
        console.log("[support-email-inbound] influencer reply anexada", { recipientId: rec.id });
        return new Response(JSON.stringify({ ok: true, routed: "influencer_outreach" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

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

    if (isAutoReply(data, subject)) {
      console.log("[support-email-inbound] ignored auto-reply", { from, subject, ticketNumber });
      return new Response(JSON.stringify({ ok: true, ignored: "auto_reply" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    let extracted = extractBody(text, html);

    // Se veio vazio, tenta re-buscar o e-mail completo no Resend antes de desistir.
    if (!extracted || extracted.length < 2) {
      const refreshed = await fetchReceivedEmail(data);
      const rText = String(refreshed?.text || refreshed?.body_plain || refreshed?.plain || "");
      const rHtml = String(refreshed?.html || refreshed?.body_html || "");
      const retry = extractBody(rText, rHtml);
      if (retry && retry.length >= 2) extracted = retry;
    }

    if (!extracted || extracted.length < 2) {
      console.warn("[support-email-inbound] empty body ignored", { ticketId: ticket.id, from, subject });
      return new Response(JSON.stringify({ ok: true, ignored: "empty_body" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = extracted;
    console.log("[support-email-inbound] extracted body length:", extracted.length);

    // ─── DEDUP: provider email_id ────────────────────────────────────────────
    const providerEmailId =
      String(data.id || data.email_id || data.message_id || data?.headers?.["Message-Id"] || "")
        .trim()
        .toLowerCase();
    const dedupFingerprint =
      providerEmailId ||
      `${from}::${subject}::${content.slice(0, 200)}::${new Date().toISOString().slice(0, 16)}`;


    const { data: existingDup } = await sb
      .from("support_messages")
      .select("id")
      .eq("ticket_id", ticket.id)
      .eq("role", "user")
      .contains("metadata", { source: "email_inbound", dedup_key: dedupFingerprint })
      .limit(1)
      .maybeSingle();

    if (existingDup) {
      console.log("[support-email-inbound] duplicate webhook ignored", { ticketId: ticket.id, dedupFingerprint });
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await sb.from("support_messages").insert({
      ticket_id: ticket.id,
      role: "user",
      content,
      metadata: { source: "email_inbound", from, subject, dedup_key: dedupFingerprint, provider_email_id: providerEmailId || null },
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
