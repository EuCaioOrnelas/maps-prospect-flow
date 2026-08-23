// Wiize · Influenciadores — Abordagem por e-mail (campanhas + envio via Resend)
//
// Ações (admin):
//   create_campaign  → cria campanha + destinatários já renderizados/editados no front
//   process          → processa um lote de envios pendentes (fila controlada)
//   retry            → reenfileira envios que falharam por erro temporário
//   cancel           → cancela envios pendentes de uma campanha
//   mark_replied     → registro manual de resposta recebida
//   send_reply       → responde a thread do influenciador (com anexo opcional)
//   add_note         → anotação interna na thread (não envia e-mail)
//   send_test        → envia o modelo renderizado para o e-mail do próprio admin
//
// Ação pública (sem JWT): unsubscribe → opt-out do destinatário
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const REPLY_LOCAL = "parcerias";
const REPLY_DOMAIN = "wiize.com.br";
const FROM = `Parcerias Wiize <${REPLY_LOCAL}@${REPLY_DOMAIN}>`;
const APP_URL = "https://wiize.com.br";
const BRAND = "#0E7C3A";
const RESEND_API_URL = "https://api.resend.com/emails";
const FOLLOW_UP_MIN_DAYS = 5;

// Cadência conservadora: reputação de domínio > velocidade.
const BATCH_SIZE = 8;
const SEND_INTERVAL_MS = 4000;
const MAX_ATTEMPTS = 3;

const PERMANENT_ERROR = /(invalid.*(email|recipient)|not a valid|does not exist|blocked|suppress|unsubscrib|bounce)/i;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const esc = (s: string) =>
  (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function htmlToText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const unsubscribeUrlFor = (token: string) => `${APP_URL}/descadastro?token=${token}`;
const cleanReplyTo = `${REPLY_LOCAL}@${REPLY_DOMAIN}`;

function oneClickUnsubscribeUrl(supabaseUrl: string, token: string) {
  return `${supabaseUrl}/functions/v1/influencer-outreach?action=unsubscribe&confirm=1&token=${encodeURIComponent(token)}`;
}

function removeDuplicatedSignature(text: string) {
  return String(text || "")
    .replace(/\n*(?:abraços?|atenciosamente|cordialmente)?,?\s*\n*equipe\s+(?:de\s+parcerias\s+)?wiize\s*$/i, "")
    .replace(/\n*equipe\s+de\s+parcerias\s*[·|-]\s*wiize\s*$/i, "")
    .trim();
}

/**
 * Layout com identidade visual da Wiize: HTML em tabela, logo oficial hospedada
 * no domínio autenticado e boa proporção texto/markup (entregabilidade alta).
 */
// Logo hospedada em storage público (URL absoluta, sem redirecionos — os
// clientes de e-mail não seguem 308 e a imagem quebrava no domínio do site).
// v2: mesma logo da landing page (ícone + wordmark), 261x80px, ~4KB otimizada.
const LOGO_URL = "https://wgokhkawjdxsmvfuhazb.supabase.co/storage/v1/object/public/agent-media/email%2Fwiize-logo-v2.png";

function layout(bodyHtml: string, unsubscribeUrl: string) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#eef1ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2328;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#eef1ef;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e3e7e4;border-radius:18px;overflow:hidden;">
<tr><td style="height:5px;background:${BRAND};font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:26px 32px 18px;border-bottom:1px solid #f0f2f1;">
<img src="${LOGO_URL}" width="131" height="40" alt="Wiize" style="display:block;width:131px;max-width:131px;height:40px;border:0;outline:none;text-decoration:none;">
<div style="margin-top:8px;font-size:11px;color:#7a8580;letter-spacing:1.2px;text-transform:uppercase;font-weight:600;">Parcerias &amp; Criadores</div>
</td></tr>
<tr><td style="padding:26px 32px 8px;font-size:15.5px;line-height:1.7;color:#1f2328;">
${bodyHtml}
</td></tr>
<tr><td style="padding:6px 32px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
<td style="border-top:1px solid #eceeed;font-size:0;line-height:0;height:1px;">&nbsp;</td></tr></table>
</td></tr>
<tr><td style="padding:18px 32px 8px;font-size:14px;line-height:1.6;color:#4b5563;">
Atenciosamente,<br>
<strong style="color:#0f172a;">Equipe de Parcerias Wiize</strong><br>
<a href="${APP_URL}" style="color:${BRAND};text-decoration:none;font-weight:600;">wiize.com.br</a>
</td></tr>
<tr><td style="padding:12px 32px 26px;">
<div style="background:#f7f9f8;border-radius:12px;padding:14px 16px;font-size:12px;line-height:1.6;color:#8b9490;">
Você recebeu este e-mail porque identificamos seu canal como potencial parceiro da Wiize.
Se preferir não receber novos contatos, <a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">clique aqui para se descadastrar</a>.
</div>
</td></tr>
</table>
<div style="max-width:600px;margin:14px auto 0;font-size:11px;color:#9aa2a8;text-align:center;">Wiize · Plataforma de crescimento comercial · Brasil</div>
</td></tr></table>
</body></html>`;
}


async function logEvent(admin: any, row: Record<string, unknown>) {
  try { await admin.from("influencer_email_events").insert(row); } catch (_) { /* best-effort */ }
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

/** Envio genérico via Resend com cabeçalhos que ajudam a entregabilidade. */
async function sendEmail(payload: Record<string, unknown>, idempotencyKey: string) {
  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey.slice(0, 256),
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

/**
 * Token de descadastro permanente por e-mail. Não depende de campanha/destinatário
 * (o link antigo quebrava quando o recipient era apagado).
 */
async function ensureOptoutToken(admin: any, email: string, prospectId: string | null) {
  const lower = String(email).toLowerCase().trim();
  const { data: existing } = await admin
    .from("email_optout_tokens").select("token").eq("email", lower).maybeSingle();
  if (existing?.token) return existing.token as string;
  const token = crypto.randomUUID().replace(/-/g, "");
  const { data } = await admin
    .from("email_optout_tokens")
    .upsert({ token, email: lower, prospect_id: prospectId }, { onConflict: "email" })
    .select("token").maybeSingle();
  return (data?.token as string) || token;
}

/** Guarda central: nenhum envio comercial passa sem esta checagem. */
async function isSuppressed(admin: any, email: string) {
  const lower = String(email).toLowerCase().trim();
  const [{ data: a }, { data: b }] = await Promise.all([
    admin.from("email_suppressions").select("email").eq("email", lower).maybeSingle(),
    admin.from("influencer_email_suppressions").select("email").eq("email", lower).maybeSingle(),
  ]);
  return !!(a || b);
}

async function suppressedSet(admin: any, emails: string[]) {
  if (!emails.length) return new Set<string>();
  const [{ data: a }, { data: b }] = await Promise.all([
    admin.from("email_suppressions").select("email").in("email", emails),
    admin.from("influencer_email_suppressions").select("email").in("email", emails),
  ]);
  return new Set([...(a ?? []), ...(b ?? [])].map((s: any) => String(s.email).toLowerCase()));
}

/** Encerra sequências de follow-up ativas do endereço (resposta, opt-out, takeover). */
async function killFollowups(admin: any, email: string, reason: string) {
  const lower = String(email).toLowerCase().trim();
  const { data: rows } = await admin
    .from("followup_enrollments").select("id, prospect_id, current_step").eq("status", "active").ilike("email", lower);
  for (const e of rows ?? []) {
    await admin.from("followup_enrollments").update({
      status: "cancelled", end_reason: reason, ended_at: new Date().toISOString(), next_run_at: null,
    }).eq("id", e.id);
    await admin.from("followup_events").insert({
      enrollment_id: e.id, prospect_id: e.prospect_id, step: e.current_step,
      action: "cancelled", reason,
    }).then(() => {}, () => {});
  }
}

/** Matricula o contato na sequência de 30 dias logo após a 1ª abordagem. */
async function enrollFollowup(admin: any, payload: Record<string, unknown>) {
  try {
    const email = String(payload.email).toLowerCase().trim();
    const { data: active } = await admin
      .from("followup_enrollments").select("id").eq("status", "active").ilike("email", email).maybeSingle();
    if (active) return;
    const startedAt = new Date().toISOString();
    const nextRun = new Date(Date.now() + 5 * 86_400_000);
    nextRun.setUTCHours(12, 0, 0, 0); // 09h local
    const day = nextRun.getUTCDay();
    if (day === 0) nextRun.setUTCDate(nextRun.getUTCDate() + 1);
    if (day === 6) nextRun.setUTCDate(nextRun.getUTCDate() + 2);
    const { data: created } = await admin.from("followup_enrollments").insert({
      email,
      prospect_id: payload.prospect_id ?? null,
      campaign_id: payload.campaign_id ?? null,
      recipient_id: payload.recipient_id ?? null,
      status: "active",
      started_at: startedAt,
      next_run_at: nextRun.toISOString(),
      first_subject: String(payload.subject || "").slice(0, 300),
      first_body: String(payload.body_text || "").slice(0, 8000),
      created_by: payload.created_by ?? null,
    }).select("id").maybeSingle();
    if (created?.id) {
      await admin.from("followup_events").insert({
        enrollment_id: created.id, prospect_id: payload.prospect_id ?? null, step: 0,
        action: "enrolled", reason: "primeira abordagem enviada",
        payload: { next_run_at: nextRun.toISOString() },
      });
    }
  } catch (e) {
    console.error("[influencer-outreach] enroll follow-up failed", e);
  }
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

    // ---------- OPT-OUT (público, com confirmação) ----------
    if (action === "unsubscribe") {
      const token = String(body.token || url.searchParams.get("token") || "").trim();
      const wantsJson = req.method === "POST";
      // Só remove de fato quando houver confirmação explícita (site) ou
      // quando o cliente de e-mail usa o one-click (RFC 8058, confirm=1).
      const confirm = body.confirm === true || url.searchParams.get("confirm") === "1";
      if (!token) return json({ error: "Token inválido." }, 400);

      // 1) token permanente (novo padrão) → 2) reply_token de campanha (links antigos)
      const { data: durable } = await admin
        .from("email_optout_tokens").select("email, prospect_id").eq("token", token).maybeSingle();
      let email = durable?.email as string | undefined;
      let prospectId: string | null = (durable?.prospect_id as string) ?? null;
      let recipient: any = null;

      if (!email) {
        const { data: rec } = await admin
          .from("influencer_campaign_recipients")
          .select("id, email, prospect_id, campaign_id").eq("reply_token", token).maybeSingle();
        if (rec) {
          recipient = rec;
          email = String(rec.email);
          prospectId = rec.prospect_id ?? null;
          // migra o link antigo para o token permanente
          await admin.from("email_optout_tokens")
            .upsert({ token, email: email.toLowerCase(), prospect_id: prospectId }, { onConflict: "email" });
        }
      }
      if (!email) return json({ error: "Token inválido." }, 404);

      const emailLower = email.toLowerCase();
      const already = await isSuppressed(admin, emailLower);

      if (!confirm) {
        // Etapa 1 — apenas valida o token e devolve os dados para confirmação.
        if (wantsJson) return json({ ok: true, pending: true, email, already });
        return Response.redirect(`${APP_URL}/descadastro?token=${encodeURIComponent(token)}`, 302);
      }

      // Bloqueio central: vale para campanhas, respostas e follow-ups automáticos.
      await admin.from("email_suppressions")
        .upsert({ email: emailLower, reason: "opt_out", source: "influencer_outreach", prospect_id: prospectId }, { onConflict: "email" });
      await admin.from("influencer_email_suppressions")
        .upsert({ email: emailLower, reason: "opt_out", prospect_id: prospectId }, { onConflict: "email" });
      await killFollowups(admin, emailLower, "unsubscribed");

      let contactQuery = admin.from("influencer_contacts")
        .update({ status: "nao_contatar" }).eq("type", "email").eq("normalized_value", emailLower);
      if (prospectId) contactQuery = contactQuery.eq("prospect_id", prospectId);
      await contactQuery;

      // Campanhas agendadas/pendentes para este endereço não podem mais disparar.
      await admin.from("influencer_campaign_recipients")
        .update({ status: "falhou", error_message: "Contato descadastrado", failed_at: new Date().toISOString() })
        .ilike("email", emailLower).in("status", ["pendente", "enviando"]);

      await logEvent(admin, {
        recipient_id: recipient?.id ?? null, campaign_id: recipient?.campaign_id ?? null, prospect_id: prospectId,
        event_type: "opt_out", detail: email,
      });

      if (wantsJson) return json({ ok: true, confirmed: true, email });

      const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Descadastro confirmado</title></head>
        <body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f5f6f8;padding:48px;text-align:center;color:#1f2328;">
        <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e6e8eb;border-radius:12px;padding:32px;">
        <h1 style="font-size:20px;margin:0 0 12px;">Descadastro confirmado</h1>
        <p style="font-size:15px;color:#4b5563;margin:0;">Não enviaremos novos contatos comerciais para <strong>${esc(email)}</strong>.</p>
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

      const emails = items.map((i) => String(i.email || "").toLowerCase().trim());
      const blocked = await suppressedSet(admin, emails);

      const { data: previous } = await admin
        .from("influencer_campaign_recipients").select("email").in("email", emails).not("sent_at", "is", null);
      const already = new Set((previous ?? []).map((r: any) => String(r.email).toLowerCase()));

      // Só aceitamos prospects que realmente existem (evita falha silenciosa por FK).
      const prospectIds = [...new Set(items.map((i) => String(i.prospect_id || "")).filter((id) => UUID_RE.test(id)))];
      const { data: existingProspects } = await admin
        .from("influencer_prospects").select("id").in("id", prospectIds.length ? prospectIds : [crypto.randomUUID()]);
      const validProspects = new Set((existingProspects ?? []).map((p: any) => p.id));

      const rows: any[] = [];
      const skipped: any[] = [];
      const seen = new Set<string>();

      for (const it of items) {
        const email = String(it.email || "").toLowerCase().trim();
        const subject = String(it.subject || "").trim();
        const bodyHtml = String(it.body_html || "").trim();
        const prospectId = String(it.prospect_id || "");
        if (!validProspects.has(prospectId)) { skipped.push({ email, reason: "Influenciador não encontrado" }); continue; }
        if (!EMAIL_RE.test(email)) { skipped.push({ email, reason: "E-mail inválido" }); continue; }
        if (!subject || !bodyHtml) { skipped.push({ email, reason: "Assunto ou corpo vazio" }); continue; }
        if (blocked.has(email)) { skipped.push({ email, reason: "Contato marcado como Não contatar" }); continue; }
        if (!allowDuplicates && already.has(email)) { skipped.push({ email, reason: "Este contato já recebeu uma abordagem" }); continue; }
        if (seen.has(email)) { skipped.push({ email, reason: "Duplicado na seleção" }); continue; }
        seen.add(email);
        rows.push({ prospect_id: prospectId, contact_id: it.contact_id ?? null, email, subject, body_html: bodyHtml });
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
      if (rErr) {
        // sem destinatários a campanha não pode existir — evita campanha órfã "travada"
        await admin.from("influencer_campaigns").delete().eq("id", campaign.id);
        return json({ error: `Falha ao criar destinatários: ${rErr.message}` }, 400);
      }

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

      const limit = Math.min(Number(body.batch_size) || BATCH_SIZE, 15);
      const { data: batch } = await admin
        .from("influencer_campaign_recipients")
        .select("*").eq("campaign_id", campaignId).eq("status", "pendente")
        .order("created_at", { ascending: true }).limit(limit);

      let sent = 0, failed = 0;

      for (const r of batch ?? []) {
        // Guarda final de opt-out: mesmo campanhas já agendadas respeitam o descadastro.
        if (await isSuppressed(admin, r.email)) {
          await admin.from("influencer_campaign_recipients").update({
            status: "falhou", error_message: "Contato descadastrado", failed_at: new Date().toISOString(),
          }).eq("id", r.id);
          await logEvent(admin, {
            recipient_id: r.id, campaign_id: campaignId, prospect_id: r.prospect_id,
            event_type: "bloqueado", detail: "opt_out",
          });
          failed++;
          continue;
        }

        await admin.from("influencer_campaign_recipients")
          .update({ status: "enviando", attempts: (r.attempts ?? 0) + 1 }).eq("id", r.id);

        const optoutToken = await ensureOptoutToken(admin, r.email, r.prospect_id);
        const unsubscribeUrl = unsubscribeUrlFor(optoutToken);
         const cleanText = removeDuplicatedSignature(htmlToText(r.body_html));
         const cleanHtml = cleanText.split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;">${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
         const text = `${cleanText}\n\nAtenciosamente,\nEquipe de Parcerias Wiize\n${APP_URL}\n\nPara não receber novos contatos: ${unsubscribeUrl}`;
         const html = layout(cleanHtml, unsubscribeUrl);

        try {
          const oneClickUrl = oneClickUnsubscribeUrl(supabaseUrl, optoutToken);
          const { ok, status, body: payload } = await sendEmail({
            from: FROM,
            to: [r.email],
             reply_to: cleanReplyTo,
            subject: r.subject,
            html,
            text,
            headers: {
               "List-Unsubscribe": `<${oneClickUrl}>, <mailto:${REPLY_LOCAL}@${REPLY_DOMAIN}?subject=unsubscribe>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          }, `influencer-campaign/${campaignId}/${r.id}`);

          if (!ok) {
            const message = payload?.message || payload?.error?.message || `Resend ${status}`;
            const permanent = PERMANENT_ERROR.test(String(message)) || status === 422;
            const exhausted = (r.attempts ?? 0) + 1 >= MAX_ATTEMPTS;
            await admin.from("influencer_campaign_recipients").update({
              status: permanent || exhausted ? "falhou" : "pendente",
              error_message: String(message).slice(0, 500),
              failed_at: new Date().toISOString(),
            }).eq("id", r.id);
            await logEvent(admin, {
              recipient_id: r.id, campaign_id: campaignId, prospect_id: r.prospect_id,
              event_type: "erro", detail: String(message).slice(0, 400),
              payload: { status, permanent },
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
             const { error: messageError } = await admin.from("influencer_messages").insert({
              prospect_id: r.prospect_id, campaign_id: campaignId, recipient_id: r.id,
              direction: "enviada", subject: r.subject, body_text: htmlToText(r.body_html),
              body_html: r.body_html, from_email: `${REPLY_LOCAL}@${REPLY_DOMAIN}`, to_email: r.email,
              provider_message_id: payload?.id ?? null, author_id: u.user.id,
            });
             if (messageError) {
               console.error("[influencer-outreach] sent email history failed", { recipientId: r.id, error: messageError.message });
               await logEvent(admin, {
                 recipient_id: r.id, campaign_id: campaignId, prospect_id: r.prospect_id,
                 event_type: "erro_historico", detail: messageError.message.slice(0, 400),
               });
             }
            if (r.contact_id) {
              await admin.from("influencer_contacts")
                .update({ status: "contatado", last_contacted_at: new Date().toISOString() })
                .eq("id", r.contact_id);
            }
            // qualquer estágio anterior à resposta avança para "e-mail enviado"
            await admin.from("influencer_prospects")
              .update({ status: "email_enviado" }).eq("id", r.prospect_id)
              .in("status", ["novo", "qualificado", "sem_contato", "contato_encontrado", "contatos_identificados", "pronto_abordagem"]);
            // Ciclo de follow-up de 30 dias começa aqui, sem ação do operador.
            await enrollFollowup(admin, {
              email: r.email, prospect_id: r.prospect_id, campaign_id: campaignId, recipient_id: r.id,
              subject: r.subject, body_text: cleanText, created_by: u.user.id,
            });
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

    // ---------- RESEND UNANSWERED ----------
    if (action === "resend_unanswered") {
      const campaignId = String(body.campaign_id || "");
      if (!UUID_RE.test(campaignId)) return json({ error: "campaign_id inválido." }, 400);
      const { data: rows, error: readError } = await admin
        .from("influencer_campaign_recipients")
        .select("id, email, status, sent_at")
        .eq("campaign_id", campaignId)
        .in("status", ["enviado", "falhou", "cancelado"]);
      if (readError) return json({ error: readError.message }, 400);

      const emails = (rows ?? []).map((r: any) => String(r.email).toLowerCase());
      const { data: suppressed } = emails.length
        ? await admin.from("influencer_email_suppressions").select("email").in("email", emails)
        : { data: [] };
      const blocked = new Set((suppressed ?? []).map((s: any) => String(s.email).toLowerCase()));
      const followUpCutoff = Date.now() - FOLLOW_UP_MIN_DAYS * 24 * 60 * 60 * 1000;
      const ids = (rows ?? []).filter((r: any) => {
        if (blocked.has(String(r.email).toLowerCase())) return false;
        if (!r.sent_at) return true;
        return new Date(r.sent_at).getTime() <= followUpCutoff;
      }).map((r: any) => r.id);
      if (ids.length) {
        const { error } = await admin.from("influencer_campaign_recipients").update({
          status: "pendente", attempts: 0, error_message: null, failed_at: null,
          provider_message_id: null, sent_at: null,
        }).in("id", ids);
        if (error) return json({ error: error.message }, 400);
      }
      await admin.from("influencer_campaigns").update({ status: ids.length ? "enviando" : "concluida", finished_at: null }).eq("id", campaignId);
      return json({ ok: true, queued: ids.length });
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
        await admin.from("influencer_prospects").update({ status: "respondeu" }).eq("id", rec.prospect_id)
          .in("status", ["novo", "qualificado", "sem_contato", "contato_encontrado", "contatos_identificados", "pronto_abordagem", "email_enviado"]);
        await logEvent(admin, {
          recipient_id: recipientId, campaign_id: rec.campaign_id, prospect_id: rec.prospect_id,
          event_type: "resposta_recebida", detail: rec.email,
        });
      }
      return json({ ok: true });
    }

    // ---------- ADD NOTE (anotação interna na thread) ----------
    if (action === "add_note") {
      const prospectId = String(body.prospect_id || "");
      const note = String(body.body_text || "").trim();
      if (!UUID_RE.test(prospectId)) return json({ error: "prospect_id inválido." }, 400);
      if (!note) return json({ error: "Escreva a anotação." }, 400);
      const { error } = await admin.from("influencer_messages").insert({
        prospect_id: prospectId, direction: "nota", body_text: note.slice(0, 8000), author_id: u.user.id,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    // ---------- SEND REPLY (thread com o influenciador) ----------
    if (action === "send_reply") {
      if (!RESEND_API_KEY) return json({ error: "Serviço de e-mail não configurado." }, 500);
      const prospectId = String(body.prospect_id || "");
      const to = String(body.to || "").toLowerCase().trim();
      const subject = String(body.subject || "").trim();
      const text = String(body.body_text || "").trim();
      const attachments: any[] = Array.isArray(body.attachments) ? body.attachments.slice(0, 3) : [];
      if (!UUID_RE.test(prospectId)) return json({ error: "prospect_id inválido." }, 400);
      if (!EMAIL_RE.test(to)) return json({ error: "E-mail de destino inválido." }, 400);
      if (subject.length < 2) return json({ error: "Informe o assunto." }, 400);
      if (!text) return json({ error: "Escreva a mensagem." }, 400);

      const { data: sup } = await admin
        .from("influencer_email_suppressions").select("email").eq("email", to).maybeSingle();
      if (sup) return json({ error: "Este contato pediu descadastro e não pode ser contatado." }, 400);

      // Reaproveita o destinatário anterior; respostas novas são correlacionadas pelo
      // remetente e pelos headers do provedor, sem expor plus-addressing ao contato.
      const { data: lastRec } = await admin
        .from("influencer_campaign_recipients")
        .select("id, campaign_id, reply_token, status")
        .eq("prospect_id", prospectId).order("created_at", { ascending: false }).limit(1).maybeSingle();

      let threadRec = lastRec;
      if (!threadRec) {
        const { data: prospect } = await admin.from("influencer_prospects").select("channel_name").eq("id", prospectId).maybeSingle();
        const { data: directCampaign, error: campaignError } = await admin.from("influencer_campaigns").insert({
          name: `Conversa direta · ${prospect?.channel_name || to}`.slice(0, 180),
          subject, body_html: esc(text), status: "enviando", created_by: u.user.id, started_at: new Date().toISOString(),
        }).select("id").single();
        if (campaignError) return json({ error: campaignError.message }, 400);
        const { data: directRecipient, error: recipientError } = await admin.from("influencer_campaign_recipients").insert({
          campaign_id: directCampaign.id, prospect_id: prospectId, email: to, subject,
          body_html: esc(text), status: "enviando", attempts: 1,
        }).select("id, campaign_id, reply_token").single();
        if (recipientError) {
          await admin.from("influencer_campaigns").delete().eq("id", directCampaign.id);
          return json({ error: recipientError.message }, 400);
        }
        threadRec = directRecipient;
      }

      const token = threadRec.reply_token;
      const unsubscribeUrl = unsubscribeUrlFor(token);
       const cleanText = removeDuplicatedSignature(text);
       const html = layout(
         cleanText.split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;">${esc(p).replace(/\n/g, "<br>")}</p>`).join(""),
        unsubscribeUrl,
      );

      const files: any[] = [];
      for (const a of attachments) {
        const content = String(a?.content || "");
        if (!content || content.length > 4_000_000) continue; // ~3MB por anexo
        files.push({ filename: String(a?.filename || "anexo").slice(0, 120), content });
      }

      const { ok, status, body: payload } = await sendEmail({
        from: FROM,
        to: [to],
         reply_to: cleanReplyTo,
        subject,
        html,
         text: `${cleanText}\n\nAtenciosamente,\nEquipe de Parcerias Wiize\n${APP_URL}`,
        ...(files.length ? { attachments: files } : {}),
      }, `influencer-thread/${prospectId}/${threadRec.id}/${crypto.randomUUID()}`);
      if (!ok) {
        const message = payload?.message || payload?.error?.message || `Resend ${status}`;
         await admin.from("influencer_campaign_recipients").update({
           status: "falhou", error_message: String(message).slice(0, 500), failed_at: new Date().toISOString(),
         }).eq("id", threadRec.id);
         await refreshCampaignStatus(admin, threadRec.campaign_id);
        return json({ error: String(message) }, 400);
      }

       await admin.from("influencer_campaign_recipients").update({
         status: threadRec.status === "respondido" ? "respondido" : "enviado",
         provider_message_id: payload?.id ?? null, sent_at: new Date().toISOString(), error_message: null,
       }).eq("id", threadRec.id);
       await refreshCampaignStatus(admin, threadRec.campaign_id);

       const { error: historyError } = await admin.from("influencer_messages").insert({
        prospect_id: prospectId,
         campaign_id: threadRec.campaign_id,
         recipient_id: threadRec.id,
         direction: "enviada", subject, body_text: cleanText, body_html: html,
        from_email: `${REPLY_LOCAL}@${REPLY_DOMAIN}`, to_email: to,
        attachments: files.map((f) => ({ filename: f.filename })),
        provider_message_id: payload?.id ?? null, author_id: u.user.id,
      });
       if (historyError) return json({ error: `E-mail enviado, mas o histórico não foi salvo: ${historyError.message}` }, 500);
       await admin.from("influencer_prospects").update({ status: "email_enviado" }).eq("id", prospectId)
         .in("status", ["novo", "qualificado", "sem_contato", "contato_encontrado", "contatos_identificados", "pronto_abordagem"]);
       await admin.from("influencer_contacts").update({ status: "contatado", last_contacted_at: new Date().toISOString() })
         .eq("prospect_id", prospectId).eq("type", "email").eq("normalized_value", to);
      return json({ ok: true });
    }

    // ---------- SEND TEST (modelo para o próprio admin) ----------
    if (action === "send_test") {
      if (!RESEND_API_KEY) return json({ error: "Serviço de e-mail não configurado." }, 500);
      const subject = String(body.subject || "").trim();
      const bodyHtml = String(body.body_html || "").trim();
      const to = String(body.to || u.user.email || "").toLowerCase().trim();
      if (!subject || !bodyHtml) return json({ error: "Assunto e mensagem são obrigatórios." }, 400);
      if (!EMAIL_RE.test(to)) return json({ error: "E-mail de destino inválido." }, 400);

      const token = crypto.randomUUID().replace(/-/g, "");
      const { ok, status, body: payload } = await sendEmail({
        from: FROM,
        to: [to],
        reply_to: `${REPLY_LOCAL}@${REPLY_DOMAIN}`,
        subject: `[TESTE] ${subject}`,
        html: layout(bodyHtml, unsubscribeUrlFor(token)),
        text: htmlToText(bodyHtml),
      }, `influencer-test/${u.user.id}/${crypto.randomUUID()}`);
      if (!ok) {
        const message = payload?.message || payload?.error?.message || `Resend ${status}`;
        return json({ error: String(message) }, 400);
      }
      return json({ ok: true, to });
    }

    return json({ error: "Ação desconhecida." }, 400);
  } catch (e) {
    console.error("[influencer-outreach]", e);
    return json({ error: (e as Error).message }, 500);
  }
});
