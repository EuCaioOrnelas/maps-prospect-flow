// Wiize · Influenciadores — Recebimento de respostas por e-mail (webhook de inbound)
//
// Recebe o payload do provedor de e-mail (Resend Inbound / compatíveis) para
// endereços do tipo parcerias+INF<token>@wiize.com.br, identifica o destinatário
// da campanha pelo token e:
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    if (INBOUND_SECRET) {
      const provided = req.headers.get("x-inbound-secret") || url.searchParams.get("secret") || "";
      if (provided !== INBOUND_SECRET) return json({ error: "unauthorized" }, 401);
    }

    const payload = await req.json().catch(() => ({}));
    const data = payload?.data ?? payload;
    const eventType = String(payload?.type || "");
    if (eventType && !/received|inbound|delivered_reply/i.test(eventType) && !data?.from) {
      return json({ ok: true, ignored: eventType });
    }

    const token = extractToken(collectAddresses(data));
    if (!token) return json({ ok: true, ignored: "sem token de thread" });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: rec } = await admin
      .from("influencer_campaign_recipients")
      .select("id, campaign_id, prospect_id, email, subject, status")
      .ilike("reply_token", `${token}%`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!rec) return json({ ok: true, ignored: "destinatário não encontrado" });

    const from = firstAddress(data?.from) || rec.email;
    const subject = String(data?.subject || `Re: ${rec.subject ?? ""}`).slice(0, 400);
    const text = stripQuoted(data?.text || "").slice(0, 20000);
    const html = typeof data?.html === "string" ? data.html.slice(0, 60000) : null;
    const attachments = Array.isArray(data?.attachments)
      ? data.attachments.map((a: any) => ({ filename: a?.filename ?? a?.name ?? "anexo", size: a?.size ?? null }))
      : [];

    await admin.from("influencer_messages").insert({
      prospect_id: rec.prospect_id,
      campaign_id: rec.campaign_id,
      recipient_id: rec.id,
      direction: "recebida",
      subject,
      body_text: text || "(mensagem sem texto)",
      body_html: html,
      from_email: from,
      to_email: `parcerias+INF${token}@wiize.com.br`,
      attachments,
      provider_message_id: data?.message_id ?? data?.id ?? null,
    });

    await admin.from("influencer_campaign_recipients")
      .update({ status: "respondido", replied_at: new Date().toISOString() })
      .eq("id", rec.id);

    await admin.from("influencer_prospects")
      .update({ status: "respondeu" })
      .eq("id", rec.prospect_id)
      .in("status", ["novo", "qualificado", "sem_contato", "contato_encontrado", "contatos_identificados", "pronto_abordagem", "email_enviado"]);

    await admin.from("influencer_email_events").insert({
      recipient_id: rec.id, campaign_id: rec.campaign_id, prospect_id: rec.prospect_id,
      event_type: "resposta_recebida", detail: from,
    }).then(() => {}, () => {});

    return json({ ok: true, prospect_id: rec.prospect_id });
  } catch (e) {
    console.error("[influencer-email-inbound]", e);
    return json({ error: (e as Error).message }, 500);
  }
});
