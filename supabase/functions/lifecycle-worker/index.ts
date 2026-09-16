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
  h1: "margin:0 0 18px;font-size:28px;line-height:1.2;color:#111827;font-weight:800;letter-spacing:0;",
  h2: "margin:26px 0 12px;font-size:19px;line-height:1.35;color:#111827;font-weight:750;letter-spacing:0;",
  h3: "margin:20px 0 10px;font-size:17px;line-height:1.4;color:#18181b;font-weight:700;",
  p: "margin:0 0 16px;font-size:15px;line-height:1.7;color:#4b5563;",
  li: "margin:0 0 9px;font-size:15px;line-height:1.65;color:#374151;",
  ul: "margin:0 0 18px;padding-left:22px;",
  ol: "margin:0 0 16px;padding-left:20px;",
  a: "color:#3daa57;",
  img: "max-width:100%;height:auto;border-radius:8px;",
  blockquote: "margin:20px 0;padding:18px 20px;border-left:4px solid #199b68;background:#ecfdf5;color:#1f2937;font-size:15px;line-height:1.65;border-radius:0 10px 10px 0;",
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
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
${preheaderHtml}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:36px 16px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 32px rgba(17,24,39,0.10);max-width:600px;width:100%;border:1px solid #e5e7eb;">
${testBanner}
<tr><td style="background:#111827;padding:24px 36px;">
  <span style="color:#ffffff;font-size:23px;font-weight:800;">${LIFECYCLE_BRAND.name}</span>
</td></tr>
<tr><td style="padding:38px 36px 32px;">
${opts.body}
</td></tr>
<tr><td style="padding:20px 36px;background:#f9fafb;text-align:center;border-top:1px solid #e5e7eb;">
  <p style="margin:0;font-size:12px;color:#9ca3af;">${LIFECYCLE_BRAND.name} • Inteligência comercial para empresas</p>
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
const LIFECYCLE_SECRET_FALLBACK = "wiize-lifecycle-tracking-fallback-v1";

function resolveTrackingSecret(): string {
  const candidates = [
    Deno.env.get("LIFECYCLE_TRACKING_SECRET"),
    Deno.env.get("LIFECYCLE_CRON_KEY"),
    Deno.env.get("LIFECYCLE_CRON_SECRET"),
  ];
  for (const c of candidates) {
    const v = (c || "").trim();
    if (v) return v;
  }
  return LIFECYCLE_SECRET_FALLBACK;
}

async function signToken(secret: string, payload: string): Promise<string> {
  const material = (secret || "").trim() || LIFECYCLE_SECRET_FALLBACK;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(material),
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

// Scheduler/worker for lifecycle campaigns.
// Enrolls eligible users, evaluates eligibility, sends the due step and records everything.
// Protections: single-flight lock, unique delivery per (step,user), backlog window,
// max one email per enrollment per run, hard stop when the campaign is not active.

const TRIAL_DAYS = 7;
const BACKLOG_WINDOW_HOURS = 48; // steps due for longer than this are skipped, never blasted
const MAX_SENDS_PER_RUN = 200;
const LOCK_KEY = "lifecycle-worker";
const LOCK_MINUTES = 10;

interface RunStats {
  users_found: number;
  enrolled: number;
  eligible: number;
  skipped: number;
  sent: number;
  failed: number;
  exited: number;
  notes: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: lifecycleCors });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const resendKey = Deno.env.get("RESEND_API_KEY") || "";
  const trackingSecret = resolveTrackingSecret();
  const cronSecrets = [
    Deno.env.get("LIFECYCLE_CRON_KEY") || "",
    Deno.env.get("LIFECYCLE_CRON_SECRET") || "",
  ].filter(Boolean);

  // ── Auth: cron secret OR an authenticated admin (manual run from the panel) ──
  const provided = req.headers.get("x-cron-secret") || new URL(req.url).searchParams.get("secret") || "";
  let authorized = !!provided && cronSecrets.includes(provided);
  if (!authorized) {
    const authHeader = req.headers.get("Authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: isAdmin } = await userClient.rpc("is_current_user_admin");
      authorized = isAdmin === true;
    }
  }
  if (!authorized) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...lifecycleCors, "Content-Type": "application/json" },
    });
  }

  const stats: RunStats = {
    users_found: 0, enrolled: 0, eligible: 0, skipped: 0, sent: 0, failed: 0, exited: 0, notes: [],
  };

  // ── Single-flight lock ──
  const nowIso = new Date().toISOString();
  const lockUntil = new Date(Date.now() + LOCK_MINUTES * 60000).toISOString();
  const { data: existingLock } = await supabase
    .from("lifecycle_worker_locks")
    .select("lock_key, locked_until")
    .eq("lock_key", LOCK_KEY)
    .maybeSingle();

  if (existingLock && existingLock.locked_until > nowIso) {
    return new Response(JSON.stringify({ skipped: true, reason: "already_running" }), {
      headers: { ...lifecycleCors, "Content-Type": "application/json" },
    });
  }
  await supabase
    .from("lifecycle_worker_locks")
    .upsert({ lock_key: LOCK_KEY, locked_until: lockUntil, updated_at: nowIso }, { onConflict: "lock_key" });

  const { data: run } = await supabase
    .from("lifecycle_worker_runs")
    .insert({ status: "running" })
    .select("id")
    .single();
  const runId = run?.id;

  try {
    const { data: campaign } = await supabase
      .from("lifecycle_campaigns")
      .select("*")
      .eq("key", "trial_wiize")
      .maybeSingle();

    if (!campaign) {
      stats.notes.push("Campanha trial_wiize não encontrada.");
      return await finish(supabase, runId, "skipped", stats, null);
    }

    if (campaign.status !== "active") {
      stats.notes.push(`Campanha em status "${campaign.status}" — nenhum envio realizado.`);
      return await finish(supabase, runId, "skipped", stats, campaign.id);
    }

    const { data: steps } = await supabase
      .from("lifecycle_campaign_steps")
      .select("*")
      .eq("campaign_id", campaign.id)
      .order("day_offset");

    if (!steps?.length) {
      stats.notes.push("Campanha sem etapas configuradas.");
      return await finish(supabase, runId, "skipped", stats, campaign.id);
    }

    // ── 1. Enrollment: trials started after the campaign was activated ──
    const since = campaign.activated_at || campaign.created_at;
    const { data: candidates } = await supabase
      .from("profiles")
      .select("id, email, name, plan, trial_start_at, trial_end_at, created_at, is_archived")
      .not("trial_start_at", "is", null)
      .gte("trial_start_at", since)
      .limit(2000);

    stats.users_found = candidates?.length || 0;

    for (const user of candidates || []) {
      if (!user.email || user.is_archived) continue;
      const { error } = await supabase.from("lifecycle_enrollments").insert({
        campaign_id: campaign.id,
        user_id: user.id,
        recipient_email: user.email,
        anchor_at: user.trial_start_at,
        status: "active",
      });
      if (!error) stats.enrolled++;
    }

    // ── 2. Active enrollments ──
    const { data: enrollments } = await supabase
      .from("lifecycle_enrollments")
      .select("*")
      .eq("campaign_id", campaign.id)
      .eq("status", "active")
      .limit(2000);

    const userIds = (enrollments || []).map((e) => e.user_id);
    const profilesById = new Map<string, any>();
    for (let i = 0; i < userIds.length; i += 500) {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, name, plan, trial_start_at, trial_end_at, created_at, is_archived")
        .in("id", userIds.slice(i, i + 500));
      for (const p of data || []) profilesById.set(p.id, p);
    }

    // Suppressions / marketing opt-out
    const emails = (enrollments || []).map((e) => e.recipient_email).filter(Boolean) as string[];
    const suppressed = new Set<string>();
    for (let i = 0; i < emails.length; i += 500) {
      const { data } = await supabase
        .from("email_suppressions")
        .select("email")
        .in("email", emails.slice(i, i + 500));
      for (const s of data || []) suppressed.add((s.email || "").toLowerCase());
    }
    const optedOut = new Set<string>();
    for (let i = 0; i < userIds.length; i += 500) {
      const { data } = await supabase
        .from("email_preferences")
        .select("user_id, marketing_enabled")
        .in("user_id", userIds.slice(i, i + 500));
      for (const p of data || []) if (p.marketing_enabled === false) optedOut.add(p.user_id);
    }

    const now = Date.now();

    for (const enrollment of enrollments || []) {
      const profile = profilesById.get(enrollment.user_id);

      // ── 3. Exit rules ──
      if (!profile || !profile.email || profile.is_archived) {
        await exitEnrollment(supabase, enrollment.id, "invalid_user");
        stats.exited++;
        continue;
      }
      if (profile.plan && profile.plan !== "free") {
        await supabase
          .from("lifecycle_enrollments")
          .update({
            status: "exited",
            exited_at: new Date().toISOString(),
            exit_reason: "converted",
            converted_at: new Date().toISOString(),
          })
          .eq("id", enrollment.id)
          .eq("status", "active");
        stats.exited++;
        continue;
      }
      if (suppressed.has((profile.email || "").toLowerCase()) || optedOut.has(profile.id)) {
        await exitEnrollment(supabase, enrollment.id, "unsubscribed");
        stats.exited++;
        continue;
      }

      const anchor = new Date(enrollment.anchor_at).getTime();
      const trialEnd = profile.trial_end_at
        ? new Date(profile.trial_end_at)
        : new Date(anchor + TRIAL_DAYS * 86400000);
      const elapsedHours = (now - anchor) / 3600000;

      // ── 4. Which step is due? (only one per run) ──
      const { data: alreadySent } = await supabase
        .from("lifecycle_email_deliveries")
        .select("step_id")
        .eq("enrollment_id", enrollment.id)
        .eq("is_test", false);
      const sentSteps = new Set((alreadySent || []).map((d) => d.step_id));

      const pending = steps.filter((s) => s.is_active && !sentSteps.has(s.id) && elapsedHours >= s.day_offset * 24);

      if (!pending.length) {
        if (steps.every((s) => !s.is_active || sentSteps.has(s.id))) {
          await supabase
            .from("lifecycle_enrollments")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("id", enrollment.id)
            .eq("status", "active");
        }
        continue;
      }

      const step = pending[0];
      const dueAt = anchor + step.day_offset * 24 * 3600000;
      const lateHours = (now - dueAt) / 3600000;

      // Backlog protection: never blast old steps after a pause/reactivation
      if (lateHours > BACKLOG_WINDOW_HOURS) {
        await supabase.from("lifecycle_email_deliveries").insert({
          campaign_id: campaign.id,
          step_id: step.id,
          enrollment_id: enrollment.id,
          user_id: profile.id,
          recipient_email: profile.email,
          status: "skipped_expired",
          scheduled_at: new Date(dueAt).toISOString(),
          error_message: `Etapa vencida há ${Math.round(lateHours)}h — envio ignorado.`,
        });
        stats.skipped++;
        continue;
      }

      // Audience rule for the post-trial recovery email
      if (step.audience === "trial_ended_no_subscription") {
        if (now < trialEnd.getTime()) { stats.skipped++; continue; }
        if (profile.plan && profile.plan !== "free") { stats.skipped++; continue; }
      } else if (step.audience === "trial_active" && step.day_offset > 0 && now > trialEnd.getTime() + 86400000) {
        stats.skipped++;
        continue;
      }

      if (!step.subject || !step.content) { stats.skipped++; continue; }
      if (stats.sent >= MAX_SENDS_PER_RUN) { stats.skipped++; continue; }

      stats.eligible++;

      // ── 5. Reserve the delivery (unique index = idempotency between workers) ──
      const { data: delivery, error: deliveryError } = await supabase
        .from("lifecycle_email_deliveries")
        .insert({
          campaign_id: campaign.id,
          step_id: step.id,
          enrollment_id: enrollment.id,
          user_id: profile.id,
          recipient_email: profile.email,
          status: "pending",
          scheduled_at: new Date(dueAt).toISOString(),
        })
        .select("id")
        .single();

      if (deliveryError || !delivery) { stats.skipped++; continue; }

      // ── 6. Compile + send ──
      const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now) / 86400000));
      const vars = buildVars({
        name: profile.name,
        email: profile.email,
        trialEnd,
        daysRemaining,
      });

      const body = styleEmailHtml(cleanupEmptyGreetings(compileTemplate(step.content, vars)));
      const subject = cleanupEmptyGreetings(compileTemplate(step.subject, vars)).trim() || step.name;
      const preheader = compileTemplate(step.preheader || "", vars);
      const tracked = await injectTracking({ html: body, baseUrl: supabaseUrl, deliveryId: delivery.id, secret: trackingSecret });
      const unsubscribeUrl = await buildUnsubscribeUrl(supabaseUrl, delivery.id, trackingSecret);
      const html = lifecycleLayout({ body: tracked, preheader, unsubscribeUrl });

      if (stats.sent > 0) await new Promise((r) => setTimeout(r, 600)); // Resend rate limit

      const result = await sendWithResend(resendKey, {
        to: profile.email,
        subject,
        html,
        from: `${campaign.from_name} <${campaign.from_email}>`,
        headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      });

      if (result.ok) {
        stats.sent++;
        await supabase
          .from("lifecycle_email_deliveries")
          .update({ status: "sent", sent_at: new Date().toISOString(), provider_message_id: result.id || null })
          .eq("id", delivery.id);
        await supabase.from("lifecycle_email_events").insert({
          delivery_id: delivery.id,
          campaign_id: campaign.id,
          step_id: step.id,
          user_id: profile.id,
          event_type: "sent",
          metadata: { provider_message_id: result.id || null },
        });
      } else {
        stats.failed++;
        await supabase
          .from("lifecycle_email_deliveries")
          .update({ status: "failed", error_message: result.error?.slice(0, 500) || "erro desconhecido" })
          .eq("id", delivery.id);
        await supabase.from("lifecycle_email_events").insert({
          delivery_id: delivery.id,
          campaign_id: campaign.id,
          step_id: step.id,
          user_id: profile.id,
          event_type: "failed",
          metadata: { error: result.error?.slice(0, 300) },
        });
      }
    }

    return await finish(supabase, runId, "success", stats, campaign.id);
  } catch (error) {
    console.error("lifecycle-worker error:", error);
    stats.notes.push(error instanceof Error ? error.message : String(error));
    return await finish(supabase, runId, "error", stats, null);
  } finally {
    await supabase
      .from("lifecycle_worker_locks")
      .upsert({ lock_key: LOCK_KEY, locked_until: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "lock_key" });
  }
});

async function exitEnrollment(supabase: any, id: string, reason: string) {
  await supabase
    .from("lifecycle_enrollments")
    .update({ status: "exited", exited_at: new Date().toISOString(), exit_reason: reason })
    .eq("id", id)
    .eq("status", "active");
}

async function finish(supabase: any, runId: string | undefined, status: string, stats: RunStats, campaignId: string | null) {
  if (runId) {
    await supabase
      .from("lifecycle_worker_runs")
      .update({
        status,
        finished_at: new Date().toISOString(),
        campaign_id: campaignId,
        users_found: stats.users_found,
        enrolled: stats.enrolled,
        eligible: stats.eligible,
        skipped: stats.skipped,
        sent: stats.sent,
        failed: stats.failed,
        exited: stats.exited,
        details: { notes: stats.notes },
      })
      .eq("id", runId);
  }
  return new Response(JSON.stringify({ status, ...stats }), {
    headers: { ...lifecycleCors, "Content-Type": "application/json" },
  });
}
