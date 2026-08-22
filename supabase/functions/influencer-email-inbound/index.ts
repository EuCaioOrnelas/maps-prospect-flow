// Wiize · Influenciadores — Recebimento de respostas por e-mail (webhook de inbound)
//
// Recebe o payload do provedor de e-mail (Resend Inbound / compatíveis) para
// parcerias@wiize.com.br, identifica a conversa pelo remetente e pelos headers
// do provedor (mantendo compatibilidade com endereços legados +INF) e:
//   1. grava a resposta na thread (influencer_messages, direction = "recebida");
//   2. marca o envio como "respondido" — SÓ quando existe resposta real;
//   3. move o influenciador para o status "respondeu".
//
// Público (verify_jwt = false). Opcionalmente protegido por INFLUENCER_INBOUND_SECRET
// via header x-inbound-secret ou query ?secret=.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-inbound-secret",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const INBOUND_SECRET = Deno.env.get("INFLUENCER_INBOUND_SECRET") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

/** Extrai o token INF de qualquer endereço parcerias+INF<token>@dominio */
function extractToken(values: string[]): string | null {
  for (const v of values) {
    const m = String(v || "").match(/\+INF([a-z0-9]{8,64})@/i);
    if (m) return m[1].toLowerCase();
  }
  return null;
}

function collectAddresses(data: any): string[] {
  const out: string[] = [];
  const push = (v: any) => {
    if (!v) return;
    if (Array.isArray(v)) v.forEach(push);
    else if (typeof v === "string") out.push(v);
    else if (typeof v === "object") { if (v.address) out.push(v.address); if (v.email) out.push(v.email); }
  };
  push(data?.to); push(data?.cc); push(data?.headers?.to); push(data?.envelope?.to);
  push(data?.recipient); push(data?.deliveredTo); push(data?.["delivered-to"]);
  return out;
}

function firstAddress(v: any): string | null {
  if (!v) return null;
  if (Array.isArray(v)) return firstAddress(v[0]);
  if (typeof v === "object") return v.address || v.email || null;
  const m = String(v).match(/<([^>]+)>/);
  return (m ? m[1] : String(v)).trim().toLowerCase();
}

function stripQuoted(text: string) {
  return String(text || "")
    .split(/\n\s*(?:Em .* escreveu:|On .* wrote:|-{2,}\s*Mensagem original)/)[0]
    .replace(/(^>.*$\n?)+/gm, "")
    .trim();
}

function htmlToText(html: string) {
  return stripQuoted(String(html || "")
    .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n"));
}

async function hydrateInbound(data: any) {
  const hasBody = Boolean(data?.text || data?.body_plain || data?.plain || data?.html || data?.body_html);
  const id = data?.email_id || data?.id;
  if (hasBody || !id || !RESEND_API_KEY) return data;
  const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
  });
  const detail = await response.json().catch(() => null);
  return response.ok && detail ? { ...data, ...detail } : data;
}

function headersText(headers: any) {
  try { return JSON.stringify(headers ?? {}); } catch { return ""; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    if (INBOUND_SECRET) {
      const provided = req.headers.get("x-inbound-secret") || url.searchParams.get("secret") || "";
      if (provided !== INBOUND_SECRET) return json({ error: "unauthorized" }, 401);
    }

    const payload = await req.json().catch(() => ({}));
    const data = await hydrateInbound(payload?.data ?? payload);
    const eventType = String(payload?.type || "");
    if (eventType && !/received|inbound|delivered_reply/i.test(eventType) && !data?.from) {
      return json({ ok: true, ignored: eventType });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = extractToken(collectAddresses(data));
    const from = firstAddress(data?.from);
    const headerBlob = headersText(data?.headers);
    const referenceIds = [...headerBlob.matchAll(/<([^<>\s]+@[^<>\s]+)>/g)].map((m) => m[1]);

    let rec: any = null;
    if (token) {
      const result = await admin.from("influencer_campaign_recipients")
        .select("id, campaign_id, prospect_id, email, subject, status")
        .ilike("reply_token", `${token}%`).order("created_at", { ascending: false }).limit(1).maybeSingle();
      rec = result.data;
    }
    if (!rec && referenceIds.length) {
      const result = await admin.from("influencer_campaign_recipients")
        .select("id, campaign_id, prospect_id, email, subject, status")
        .in("provider_message_id", referenceIds).order("created_at", { ascending: false }).limit(1).maybeSingle();
      rec = result.data;
    }
    if (!rec && from) {
      const result = await admin.from("influencer_campaign_recipients")
        .select("id, campaign_id, prospect_id, email, subject, status")
        .ilike("email", from).not("sent_at", "is", null)
        .order("sent_at", { ascending: false }).limit(1).maybeSingle();
      rec = result.data;
    }
    if (!rec) return json({ ok: true, ignored: "destinatário não encontrado" });

    const sender = from || rec.email;
    const subject = String(data?.subject || `Re: ${rec.subject ?? ""}`).slice(0, 400);
    const text = (stripQuoted(data?.text || data?.body_plain || data?.plain || "") || htmlToText(data?.html || data?.body_html || "")).slice(0, 20000);
    const html = typeof data?.html === "string" ? data.html.slice(0, 60000) : null;
    const attachments = Array.isArray(data?.attachments)
      ? data.attachments.map((a: any) => ({ filename: a?.filename ?? a?.name ?? "anexo", size: a?.size ?? null }))
      : [];

    const providerMessageId = data?.message_id ?? data?.email_id ?? data?.id ?? null;
    if (providerMessageId) {
      const { data: duplicate } = await admin.from("influencer_messages").select("id")
        .eq("provider_message_id", providerMessageId).maybeSingle();
      if (duplicate) return json({ ok: true, duplicate: true, prospect_id: rec.prospect_id });
    }

    const { error: messageError } = await admin.from("influencer_messages").insert({
      prospect_id: rec.prospect_id,
      campaign_id: rec.campaign_id,
      recipient_id: rec.id,
      direction: "recebida",
      subject,
      body_text: text || "(mensagem sem texto)",
      body_html: html,
      from_email: sender,
      to_email: "parcerias@wiize.com.br",
      attachments,
      provider_message_id: providerMessageId,
    });
    if (messageError) throw new Error(`Falha ao salvar resposta: ${messageError.message}`);

    await admin.from("influencer_campaign_recipients")
      .update({ status: "respondido", replied_at: new Date().toISOString() })
      .eq("id", rec.id);

    await admin.from("influencer_prospects")
      .update({ status: "respondeu" })
      .eq("id", rec.prospect_id)
      .in("status", ["novo", "qualificado", "sem_contato", "contato_encontrado", "contatos_identificados", "pronto_abordagem", "email_enviado"]);

    await admin.from("influencer_email_events").insert({
      recipient_id: rec.id, campaign_id: rec.campaign_id, prospect_id: rec.prospect_id,
      event_type: "resposta_recebida", detail: sender,
    }).then(() => {}, () => {});

    return json({ ok: true, prospect_id: rec.prospect_id });
  } catch (e) {
    console.error("[influencer-email-inbound]", e);
    return json({ error: (e as Error).message }, 500);
  }
});
