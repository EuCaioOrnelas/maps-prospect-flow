import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- Helpers locais (sem arquivos compartilhados) ---
const LIFECYCLE_BRAND = {
  name: "Wiize",
  color: "#3daa57",
  url: "https://wiize.com.br",
  from: "Wiize <no-reply@wiize.com.br>",
};

const lifecycleCors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LifecycleVars {
  "user.name": string;
  "user.email": string;
  "company.name": string;
  "trial.days_remaining": string;
  "trial.end_date": string;
  dashboard_url: string;
  checkout_url: string;
  [key: string]: string;
}

/** Replaces {{var}} tokens. Unknown/empty tokens are removed (never "undefined"). */
function compileTemplate(input: string, vars: Record<string, string>): string {
  if (!input) return "";
  return input.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_m, key: string) => {
    const value = vars[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

/** "Olá, {{user.name}}" with empty name must not leave dangling punctuation. */
function cleanupEmptyGreetings(html: string): string {
  return html
    .replace(/Olá,\s*\./g, "Olá!")
    .replace(/Olá,\s*</g, "Olá!<")
    .replace(/\s+,/g, ",")
    .replace(/\(\s*\)/g, "");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Aplica estilos inline nas tags que não têm `style` — necessário porque clientes
 * de e-mail ignoram CSS externo e o editor visual gera HTML simples.
 */
const INLINE_STYLES: Record<string, string> = {
  h1: "margin:0 0 16px;font-size:24px;line-height:1.3;color:#18181b;font-weight:700;",
  h2: "margin:24px 0 12px;font-size:20px;line-height:1.3;color:#18181b;font-weight:700;",
  h3: "margin:20px 0 10px;font-size:17px;line-height:1.4;color:#18181b;font-weight:700;",
  p: "margin:0 0 16px;font-size:16px;line-height:1.6;color:#3f3f46;",
  li: "margin:0 0 8px;font-size:16px;line-height:1.6;color:#3f3f46;",
  ul: "margin:0 0 16px;padding-left:20px;",
  ol: "margin:0 0 16px;padding-left:20px;",
  a: "color:#3daa57;",
  img: "max-width:100%;height:auto;border-radius:8px;",
  blockquote: "margin:0 0 16px;padding:12px 16px;border-left:3px solid #3daa57;background:#f4f4f5;color:#3f3f46;font-size:16px;line-height:1.6;",
};

function styleEmailHtml(html: string): string {
  let output = html;
  for (const [tag, style] of Object.entries(INLINE_STYLES)) {
    const re = new RegExp(`<${tag}(\\s[^>]*)?>`, "gi");
    output = output.replace(re, (match, attrs = "") => {
      if (/\sstyle\s*=/i.test(match)) return match;
      const cleanAttrs = attrs || "";
      return `<${tag}${cleanAttrs} style="${style}">`;
    });
  }
  return output;
}

function lifecycleLayout(opts: {
  body: string;
  preheader?: string;
  trackingPixel?: string;
  unsubscribeUrl?: string;
  isTest?: boolean;
}): string {
  const preheaderHtml = opts.preheader
    ? `<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(opts.preheader)}</div>`
    : "";
  const testBanner = opts.isTest
    ? `<tr><td style="padding:10px 32px;background:#fef3c7;color:#92400e;font-size:12px;font-weight:600;text-align:center;">E-MAIL DE TESTE — não representa um envio real de campanha</td></tr>`
    : "";
  const unsubscribe = opts.unsubscribeUrl
    ? `<p style="margin:6px 0 0;font-size:12px;color:#a1a1aa;"><a href="${opts.unsubscribeUrl}" style="color:#a1a1aa;text-decoration:underline;">Não quero mais receber estes e-mails</a></p>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
${preheaderHtml}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);max-width:560px;width:100%;">
${testBanner}
<tr><td style="background:${LIFECYCLE_BRAND.color};padding:22px 32px;text-align:center;">
  <span style="color:#ffffff;font-size:20px;font-weight:700;">${LIFECYCLE_BRAND.name}</span>
</td></tr>
<tr><td style="padding:32px;">
${opts.body}
</td></tr>
<tr><td style="padding:16px 32px;background:#fafafa;text-align:center;border-top:1px solid #e4e4e7;">
  <p style="margin:0;font-size:12px;color:#a1a1aa;">Você recebeu este e-mail porque criou uma conta na ${LIFECYCLE_BRAND.name}.</p>
  ${unsubscribe}
</td></tr>
</table>
</td></tr>
</table>
${opts.trackingPixel || ""}
</body>
</html>`;
}

/** HMAC-SHA256 signature (hex) used to protect tracking/unsubscribe links. */
async function signToken(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyToken(secret: string, payload: string, signature: string): Promise<boolean> {
  if (!signature) return false;
  const expected = await signToken(secret, payload);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

/** Rewrites links for click tracking and appends the open pixel. */
async function injectTracking(opts: {
  html: string;
  baseUrl: string;
  deliveryId: string;
  secret: string;
}): Promise<string> {
  const sig = await signToken(opts.secret, opts.deliveryId);
  const tracker = `${opts.baseUrl}/functions/v1/lifecycle-tracker`;

  const withLinks = opts.html.replace(
    /<a\s([^>]*?)href="(https?:\/\/[^"]+)"([^>]*)>([\s\S]*?)<\/a>/g,
    (match, pre: string, url: string, post: string, label: string) => {
      if (url.includes("lifecycle-tracker")) return match;
      const plain = label.replace(/<[^>]*>/g, "").trim().slice(0, 80);
      const trackUrl =
        `${tracker}?action=click&d=${opts.deliveryId}&s=${sig}` +
        `&l=${encodeURIComponent(plain)}&url=${encodeURIComponent(url)}`;
      return `<a ${pre}href="${trackUrl}"${post}>${label}</a>`;
    },
  );

  const pixel = `<img src="${tracker}?action=open&d=${opts.deliveryId}&s=${sig}" width="1" height="1" alt="" style="display:none;" />`;
  return withLinks + pixel;
}

async function buildUnsubscribeUrl(baseUrl: string, deliveryId: string, secret: string): Promise<string> {
  const sig = await signToken(secret, deliveryId);
  return `${baseUrl}/functions/v1/lifecycle-tracker?action=unsubscribe&d=${deliveryId}&s=${sig}`;
}

function buildVars(user: {
  name?: string | null;
  email?: string | null;
  company_name?: string | null;
  trialEnd?: Date | null;
  daysRemaining?: number;
}): Record<string, string> {
  const firstName = (user.name || "").trim().split(/\s+/)[0] || "";
  return {
    "user.name": firstName,
    "user.email": user.email || "",
    "company.name": user.company_name || "",
    "trial.days_remaining": user.daysRemaining === undefined ? "" : String(Math.max(0, user.daysRemaining)),
    "trial.end_date": user.trialEnd
      ? user.trialEnd.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "",
    dashboard_url: `${LIFECYCLE_BRAND.url}/dashboard`,
    checkout_url: `${LIFECYCLE_BRAND.url}/planos`,
  };
}

/** Sends through Resend (the provider already used across the project). */
async function sendWithResend(apiKey: string, payload: {
  to: string;
  subject: string;
  html: string;
  from?: string;
  headers?: Record<string, string>;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: payload.from || LIFECYCLE_BRAND.from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        headers: payload.headers,
      }),
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, error: text.slice(0, 500) };
    let id: string | undefined;
    try {
      id = JSON.parse(text)?.id;
    } catch (_) { /* provider returned non-JSON */ }
    return { ok: true, id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
// --- fim dos helpers ---

// Admin-only operations for the Trial Email Flow.
//   action=preview    -> compiled HTML for a step (no send)
//   action=send_test  -> single test email, flagged as test, never touches user state
//   action=simulate   -> eligibility/test mode for a real user
// Every call requires an authenticated admin (is_current_user_admin).

const TRIAL_DAYS = 7;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: lifecycleCors });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const trackingSecret = Deno.env.get("LIFECYCLE_TRACKING_SECRET") || "";
  const resendKey = Deno.env.get("RESEND_API_KEY") || "";

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...lifecycleCors, "Content-Type": "application/json" } });

  try {
    // Server-to-server auth (internal validation / scheduled checks) with the
    // same shared secret used by the worker. Never exposed to the browser.
    const cronSecrets = [
      Deno.env.get("LIFECYCLE_CRON_KEY") || "",
      Deno.env.get("LIFECYCLE_CRON_SECRET") || "",
    ].filter(Boolean);
    const providedSecret = req.headers.get("x-cron-secret") || "";
    const machineAuthorized = !!providedSecret && cronSecrets.includes(providedSecret);

    let userData: { user: { email?: string | null } | null } = { user: null };

    if (!machineAuthorized) {
      const authHeader = req.headers.get("Authorization") || "";
      if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: authUser } = await userClient.auth.getUser();
      if (!authUser?.user) return json({ error: "unauthorized" }, 401);
      const { data: isAdmin } = await userClient.rpc("is_current_user_admin");
      if (isAdmin !== true) return json({ error: "forbidden" }, 403);
      userData = { user: authUser.user };
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    // ── Preview ──────────────────────────────────────────────────────────────
    if (action === "preview" || action === "send_test") {
      const stepId = body?.stepId as string;
      if (!stepId) return json({ error: "stepId é obrigatório" }, 400);

      const { data: step } = await service
        .from("lifecycle_campaign_steps")
        .select("*, lifecycle_campaigns(*)")
        .eq("id", stepId)
        .maybeSingle();
      if (!step) return json({ error: "Etapa não encontrada" }, 404);

      const campaign = (step as any).lifecycle_campaigns;
      const sampleEnd = new Date(Date.now() + 3 * 86400000);
      const vars = buildVars({
        name: body?.sampleName || "Maria",
        email: body?.recipientEmail || userData.user?.email || "",
        trialEnd: sampleEnd,
        daysRemaining: 3,
      });

      const compiledBody = styleEmailHtml(cleanupEmptyGreetings(compileTemplate(step.content || "", vars)));
      const subject = cleanupEmptyGreetings(compileTemplate(step.subject || "", vars)).trim() || step.name;
      const preheader = compileTemplate(step.preheader || "", vars);

      if (action === "preview") {
        return json({
          subject,
          html: lifecycleLayout({ body: compiledBody, preheader, unsubscribeUrl: "#" }),
        });
      }

      const recipient = (body?.recipientEmail as string || "").trim();
      if (!recipient || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient)) {
        return json({ error: "Informe um e-mail válido" }, 400);
      }
      if (!resendKey) return json({ error: "RESEND_API_KEY não configurada" }, 500);

      const { data: delivery, error: deliveryError } = await service
        .from("lifecycle_email_deliveries")
        .insert({
          campaign_id: step.campaign_id,
          step_id: step.id,
          recipient_email: recipient,
          status: "pending",
          is_test: true,
        })
        .select("id")
        .single();
      if (deliveryError || !delivery) return json({ error: "Falha ao registrar o teste" }, 500);

      const tracked = await injectTracking({ html: compiledBody, baseUrl: supabaseUrl, deliveryId: delivery.id, secret: trackingSecret });
      const unsubscribeUrl = await buildUnsubscribeUrl(supabaseUrl, delivery.id, trackingSecret);
      const html = lifecycleLayout({ body: tracked, preheader, unsubscribeUrl, isTest: true });

      const result = await sendWithResend(resendKey, {
        to: recipient,
        subject: `[TESTE] ${subject}`,
        html,
        from: `${campaign?.from_name || "Wiize"} <${campaign?.from_email || "no-reply@wiize.com.br"}>`,
      });

      await service
        .from("lifecycle_email_deliveries")
        .update(
          result.ok
            ? { status: "sent", sent_at: new Date().toISOString(), provider_message_id: result.id || null }
            : { status: "failed", error_message: result.error?.slice(0, 500) },
        )
        .eq("id", delivery.id);

      return result.ok
        ? json({ success: true, message: `E-mail de teste enviado para ${recipient}` })
        : json({ error: result.error || "Falha no envio" }, 500);
    }

    // ── Test mode / eligibility simulation ───────────────────────────────────
    if (action === "simulate") {
      const email = (body?.email as string || "").trim().toLowerCase();
      if (!email) return json({ error: "Informe um e-mail" }, 400);

      const { data: profile } = await service
        .from("profiles")
        .select("id, email, name, plan, trial_start_at, trial_end_at, created_at, is_archived")
        .ilike("email", email)
        .maybeSingle();
      if (!profile) return json({ error: "Usuário não encontrado" }, 404);

      const { data: campaign } = await service
        .from("lifecycle_campaigns")
        .select("*")
        .eq("key", "trial_wiize")
        .maybeSingle();
      const { data: steps } = await service
        .from("lifecycle_campaign_steps")
        .select("*")
        .eq("campaign_id", campaign?.id)
        .order("day_offset");

      const { data: enrollment } = await service
        .from("lifecycle_enrollments")
        .select("*")
        .eq("campaign_id", campaign?.id)
        .eq("user_id", profile.id)
        .maybeSingle();

      const { data: deliveries } = await service
        .from("lifecycle_email_deliveries")
        .select("step_id, status, sent_at, opened_at, clicked_at")
        .eq("user_id", profile.id)
        .eq("is_test", false);

      const anchor = enrollment?.anchor_at || profile.trial_start_at;
      const anchorMs = anchor ? new Date(anchor).getTime() : null;
      const trialEnd = profile.trial_end_at
        ? new Date(profile.trial_end_at)
        : anchorMs
        ? new Date(anchorMs + TRIAL_DAYS * 86400000)
        : null;

      const sentSteps = new Set((deliveries || []).map((d) => d.step_id));
      const elapsedHours = anchorMs ? (Date.now() - anchorMs) / 3600000 : null;

      const checks = [
        { label: "Campanha ativa", pass: campaign?.status === "active", detail: `status: ${campaign?.status || "—"}` },
        { label: "E-mail válido", pass: !!profile.email, detail: profile.email || "—" },
        { label: "Trial registrado", pass: !!anchor, detail: anchor ? new Date(anchor).toLocaleString("pt-BR") : "sem data de início" },
        { label: "Ainda não converteu", pass: !profile.plan || profile.plan === "free", detail: `plano: ${profile.plan || "free"}` },
        { label: "Conta ativa", pass: !profile.is_archived, detail: profile.is_archived ? "arquivada" : "ok" },
        { label: "Inscrito no fluxo", pass: enrollment?.status === "active", detail: enrollment ? `status: ${enrollment.status}` : "não inscrito" },
      ];

      const nextStep = (steps || []).find((s) => s.is_active && !sentSteps.has(s.id));
      const currentStep = [...(steps || [])]
        .filter((s) => sentSteps.has(s.id))
        .sort((a, b) => b.day_offset - a.day_offset)[0] || null;

      return json({
        user: { id: profile.id, email: profile.email, name: profile.name, plan: profile.plan },
        trial: { start: anchor, end: trialEnd?.toISOString() || null, elapsed_hours: elapsedHours },
        enrollment,
        current_step: currentStep ? { day: currentStep.day_offset, name: currentStep.name } : null,
        next_step: nextStep
          ? {
              day: nextStep.day_offset,
              name: nextStep.name,
              scheduled_at: anchorMs ? new Date(anchorMs + nextStep.day_offset * 24 * 3600000).toISOString() : null,
            }
          : null,
        eligible: checks.every((c) => c.pass) && !!nextStep,
        checks,
        deliveries,
      });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (error) {
    console.error("lifecycle-admin error:", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
