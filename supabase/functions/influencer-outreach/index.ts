// Wiize · Influenciadores — Abordagem por e-mail (campanhas + envio via Resend)
//
// Ações (admin):
//   create_campaign  → cria campanha + destinatários já renderizados/editados no front
//   process          → processa um lote de envios pendentes (fila controlada)
//   retry            → reenfileira envios que falharam por erro temporário
//   cancel           → cancela envios pendentes de uma campanha
//   mark_replied     → registro manual de resposta recebida
//
// Ação pública (sem JWT): unsubscribe → opt-out do destinatário
//
// Reutiliza a infraestrutura de e-mail já existente do projeto: mesma RESEND_API_KEY,
// mesmo domínio verificado wiize.com.br e o mesmo padrão de layout/thread por Reply-To
// usado em supabase/functions/support-email-send.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM = "Wiize Parcerias <parcerias@wiize.com.br>";
const REPLY_LOCAL = "parcerias";
const REPLY_DOMAIN = "wiize.com.br";
const APP_URL = "https://wiize.com.br";
const LOGO_URL = "https://www.wiize.com.br/__l5e/assets-v1/c1316496-9ea5-4ee1-864d-4a0400483aea/wiize-logo.png";
const BRAND = "#0E7C3A";

const BATCH_SIZE = 12;              // envios por invocação (não bloqueia a interface)
const SEND_INTERVAL_MS = 600;       // respeita o rate limit do Resend (~2 req/s)
const MAX_ATTEMPTS = 3;

const PERMANENT_ERROR = /(invalid.*(email|recipient)|not a valid|does not exist|blocked|suppress|unsubscrib|bounce)/i;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

const esc = (s: string) =>
  (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function htmlToText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Layout de e-mail alinhado ao branding já usado no suporte/renovações. */
function layout(bodyHtml: string, preheader: string, unsubscribeUrl: string) {
  return `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2328;">
<div style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f6f8;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;border:1px solid #e6e8eb;">
<tr><td style="padding:24px 28px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="vertical-align:middle;"><img src="${LOGO_URL}" width="38" height="38" alt="Wiize" style="display:block;border:0;border-radius:8px;"></td>
    <td style="vertical-align:middle;padding-left:10px;font-size:22px;font-weight:700;color:#0f172a;">Wiize</td>
  </tr></table>
  <hr style="border:none;border-top:1px solid #eef0f2;margin:18px 0 0;">
</td></tr>
<tr><td style="padding:22px 28px 6px;font-size:15px;line-height:1.6;color:#1f2328;">${bodyHtml}</td></tr>
<tr><td style="padding:18px 28px 26px;">
  <hr style="border:none;border-top:1px solid #eef0f2;margin:0 0 14px;">
  <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5;">
    Wiize Tecnologia · <a href="${APP_URL}" style="color:${BRAND};text-decoration:none;">wiize.com.br</a><br>
    Você recebeu este contato porque encontramos seus dados públicos de contato profissional.
    <a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">Não quero receber novos contatos</a>.
  </p>
</td></tr>
</table></td></tr></table></body></html>`;
}

async function logEvent(admin: any, row: Record<string, unknown>) {
  try { await admin.from("influencer_email_events").insert(row); } catch (_) { /* log best-effort */ }
}

async function refreshCampaignStatus(admin: any, campaignId: string) {
  const { data: rows } = await admin
    .from("influencer_campaign_recipients").select("status").eq("campaign_id", campaignId);
  const pending = (rows ?? []).filter((r: any) => ["pendente", "enviando"].includes(r.status)).length;
  const patch: Record<string, unknown> = { status: pending > 0 ? "enviando" : "concluida" };
  if (pending === 0) patch.finished_at = new Date().toISOString();
  await admin.from("influencer_campaigns").update(patch).eq("id", campaignId);
  return pending;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const url = new URL(req.url);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = String(body.action || url.searchParams.get("action") || "");

    // ---------- OPT-OUT (público) ----------
    if (action === "unsubscribe") {
      const token = String(body.token || url.searchParams.get("token") || "");
      if (!token) return json({ error: "Token inválido." }, 400);
      const { data: rec } = await admin
        .from("influencer_campaign_recipients")
        .select("id, email, prospect_id, campaign_id").eq("reply_token", token).maybeSingle();
      if (!rec) return json({ error: "Token inválido." }, 404);

      await admin.from("influencer_email_suppressions")
        .upsert({ email: rec.email.toLowerCase(), reason: "opt_out", prospect_id: rec.prospect_id }, { onConflict: "email" });
      await admin.from("influencer_contacts")
        .update({ status: "nao_contatar" })
        .eq("prospect_id", rec.prospect_id).eq("type", "email").eq("normalized_value", rec.email.toLowerCase());
      await logEvent(admin, {
        recipient_id: rec.id, campaign_id: rec.campaign_id, prospect_id: rec.prospect_id,
        event_type: "opt_out", detail: rec.email,
      });

      const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Descadastro confirmado</title></head>
        <body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f5f6f8;padding:48px;text-align:center;color:#1f2328;">
        <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e6e8eb;border-radius:12px;padding:32px;">
        <h1 style="font-size:20px;margin:0 0 12px;">Descadastro confirmado</h1>
        <p style="font-size:15px;color:#4b5563;margin:0;">Não enviaremos novos contatos comerciais para <strong>${esc(rec.email)}</strong>.</p>
        </div></body></html>`;
      return new Response(html, { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } });
    }

    // ---------- autenticação admin ----------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado." }, 401);
    const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await caller.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!u?.user) return json({ error: "Não autenticado." }, 401);
    const { data: roleCheck } = await admin
      .from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!roleCheck) return json({ error: "Acesso restrito a administradores." }, 403);

    // ---------- CREATE CAMPAIGN ----------
    if (action === "create_campaign") {
      const name = String(body.name || "").trim();
      const items: any[] = Array.isArray(body.items) ? body.items : [];
      if (name.length < 3) return json({ error: "Informe um nome para a campanha." }, 400);
      if (items.length === 0) return json({ error: "Selecione ao menos um destinatário." }, 400);
      if (items.length > 500) return json({ error: "Máximo de 500 destinatários por campanha." }, 400);

      const allowDuplicates = body.allow_duplicates === true;

      // suppressions (opt-out / não contatar)
      const emails = items.map((i) => String(i.email || "").toLowerCase().trim());
      const { data: suppressed } = await admin
        .from("influencer_email_suppressions").select("email").in("email", emails);
      const blocked = new Set((suppressed ?? []).map((s: any) => s.email));

      // já abordados anteriormente (controle de duplicidade)
      const { data: previous } = await admin
        .from("influencer_campaign_recipients").select("email").in("email", emails).not("sent_at", "is", null);
      const already = new Set((previous ?? []).map((r: any) => String(r.email).toLowerCase()));

      const rows: any[] = [];
      const skipped: any[] = [];
      const seen = new Set<string>();

      for (const it of items) {
        const email = String(it.email || "").toLowerCase().trim();
        const subject = String(it.subject || "").trim();
        const bodyHtml = String(it.body_html || "").trim();
        if (!EMAIL_RE.test(email)) { skipped.push({ email, reason: "E-mail inválido" }); continue; }
        if (!subject || !bodyHtml) { skipped.push({ email, reason: "Assunto ou corpo vazio" }); continue; }
        if (blocked.has(email)) { skipped.push({ email, reason: "Contato marcado como Não contatar" }); continue; }
        if (!allowDuplicates && already.has(email)) { skipped.push({ email, reason: "Este contato já recebeu uma abordagem" }); continue; }
        if (seen.has(email)) { skipped.push({ email, reason: "Duplicado na seleção" }); continue; }
        seen.add(email);
        rows.push({
          prospect_id: it.prospect_id,
          contact_id: it.contact_id ?? null,
          email, subject, body_html: bodyHtml,
        });
      }

      if (rows.length === 0) return json({ error: "Nenhum destinatário válido.", skipped }, 400);

      const { data: campaign, error: cErr } = await admin.from("influencer_campaigns").insert({
        name,
        description: body.description ?? null,
        template_id: body.template_id ?? null,
        subject: rows[0].subject,
        body_html: body.body_html ?? rows[0].body_html,
        status: "rascunho",
        created_by: u.user.id,
      }).select("id").single();
      if (cErr) return json({ error: cErr.message }, 400);

      const { error: rErr } = await admin
        .from("influencer_campaign_recipients")
        .insert(rows.map((r) => ({ ...r, campaign_id: campaign.id })));
      if (rErr) return json({ error: rErr.message }, 400);

      return json({ ok: true, campaign_id: campaign.id, queued: rows.length, skipped });
    }

    // ---------- PROCESS (fila em lotes) ----------
    if (action === "process") {
      const campaignId = String(body.campaign_id || "");
      if (!campaignId) return json({ error: "campaign_id obrigatório." }, 400);
      if (!RESEND_API_KEY) return json({ error: "Serviço de e-mail não configurado." }, 500);

      await admin.from("influencer_campaigns")
        .update({ status: "enviando", started_at: new Date().toISOString() })
        .eq("id", campaignId).is("started_at", null);

      const limit = Math.min(Number(body.batch_size) || BATCH_SIZE, 25);
      const { data: batch } = await admin
        .from("influencer_campaign_recipients")
        .select("*").eq("campaign_id", campaignId).eq("status", "pendente")
        .order("created_at", { ascending: true }).limit(limit);

      let sent = 0, failed = 0;

      for (const r of batch ?? []) {
        await admin.from("influencer_campaign_recipients")
          .update({ status: "enviando", attempts: (r.attempts ?? 0) + 1 }).eq("id", r.id);

        const unsubscribeUrl = `${supabaseUrl}/functions/v1/influencer-outreach?action=unsubscribe&token=${r.reply_token}`;
        const replyTo = `${REPLY_LOCAL}+INF${r.reply_token.slice(0, 16)}@${REPLY_DOMAIN}`;
        const html = layout(r.body_html, htmlToText(r.body_html).slice(0, 120), unsubscribeUrl);

        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: FROM,
              to: [r.email],
              reply_to: replyTo,
              subject: r.subject,
              html,
              text: htmlToText(r.body_html),
              headers: {
                "List-Unsubscribe": `<${unsubscribeUrl}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              },
            }),
          });
          const payload = await res.json().catch(() => ({}));

          if (!res.ok) {
            const message = payload?.message || payload?.error?.message || `Resend ${res.status}`;
            const permanent = PERMANENT_ERROR.test(String(message)) || res.status === 422;
            const exhausted = (r.attempts ?? 0) + 1 >= MAX_ATTEMPTS;
            await admin.from("influencer_campaign_recipients").update({
              status: permanent || exhausted ? "falhou" : "pendente",
              error_message: String(message).slice(0, 500),
              failed_at: new Date().toISOString(),
            }).eq("id", r.id);
            await logEvent(admin, {
              recipient_id: r.id, campaign_id: campaignId, prospect_id: r.prospect_id,
              event_type: "erro", detail: String(message).slice(0, 400),
              payload: { status: res.status, permanent },
            });
            failed++;
          } else {
            await admin.from("influencer_campaign_recipients").update({
              status: "enviado",
              provider_message_id: payload?.id ?? null,
              sent_at: new Date().toISOString(),
              error_message: null,
            }).eq("id", r.id);
            await logEvent(admin, {
              recipient_id: r.id, campaign_id: campaignId, prospect_id: r.prospect_id,
              event_type: "enviado", detail: r.subject, payload: { provider_message_id: payload?.id ?? null },
            });
            if (r.contact_id) {
              await admin.from("influencer_contacts")
                .update({ status: "contatado", last_contacted_at: new Date().toISOString() })
                .eq("id", r.contact_id);
            }
            await admin.from("influencer_prospects")
              .update({ status: "email_enviado" }).eq("id", r.prospect_id)
              .in("status", ["novo", "qualificado", "contato_encontrado", "contatos_identificados", "pronto_abordagem"]);
            sent++;
          }
        } catch (e) {
          const exhausted = (r.attempts ?? 0) + 1 >= MAX_ATTEMPTS;
          await admin.from("influencer_campaign_recipients").update({
            status: exhausted ? "falhou" : "pendente",
            error_message: String((e as Error).message).slice(0, 500),
            failed_at: new Date().toISOString(),
          }).eq("id", r.id);
          failed++;
        }

        await new Promise((ok) => setTimeout(ok, SEND_INTERVAL_MS));
      }

      const remaining = await refreshCampaignStatus(admin, campaignId);
      return json({ ok: true, sent, failed, remaining });
    }

    // ---------- RETRY ----------
    if (action === "retry") {
      const campaignId = String(body.campaign_id || "");
      const recipientIds: string[] = Array.isArray(body.recipient_ids) ? body.recipient_ids : [];
      let q = admin.from("influencer_campaign_recipients")
        .update({ status: "pendente", attempts: 0, error_message: null, failed_at: null })
        .eq("status", "falhou");
      q = recipientIds.length ? q.in("id", recipientIds) : q.eq("campaign_id", campaignId);
      const { error } = await q;
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    // ---------- CANCEL ----------
    if (action === "cancel") {
      const campaignId = String(body.campaign_id || "");
      if (!campaignId) return json({ error: "campaign_id obrigatório." }, 400);
      await admin.from("influencer_campaign_recipients")
        .update({ status: "cancelado" }).eq("campaign_id", campaignId).eq("status", "pendente");
      await admin.from("influencer_campaigns").update({ status: "cancelada" }).eq("id", campaignId);
      return json({ ok: true });
    }

    // ---------- MARK REPLIED (manual) ----------
    if (action === "mark_replied") {
      const recipientId = String(body.recipient_id || "");
      if (!recipientId) return json({ error: "recipient_id obrigatório." }, 400);
      const { data: rec } = await admin
        .from("influencer_campaign_recipients")
        .update({ status: "respondido", replied_at: new Date().toISOString() })
        .eq("id", recipientId).select("prospect_id, campaign_id, email").maybeSingle();
      if (rec) {
        await admin.from("influencer_prospects").update({ status: "respondeu" }).eq("id", rec.prospect_id);
        await logEvent(admin, {
          recipient_id: recipientId, campaign_id: rec.campaign_id, prospect_id: rec.prospect_id,
          event_type: "resposta_recebida", detail: rec.email,
        });
      }
      return json({ ok: true });
    }

    return json({ error: "Ação desconhecida." }, 400);
  } catch (e) {
    console.error("[influencer-outreach]", e);
    return json({ error: (e as Error).message }, 500);
  }
});
