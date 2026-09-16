import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import {
  buildUnsubscribeUrl,
  buildVars,
  cleanupEmptyGreetings,
  compileTemplate,
  injectTracking,
  lifecycleCors,
  lifecycleLayout,
  sendWithResend,
} from "../_shared/lifecycle.ts";

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
  const trackingSecret = Deno.env.get("LIFECYCLE_TRACKING_SECRET") || "";
  const cronSecret = Deno.env.get("LIFECYCLE_CRON_SECRET") || "";

  // ── Auth: cron secret OR an authenticated admin (manual run from the panel) ──
  const provided = req.headers.get("x-cron-secret") || new URL(req.url).searchParams.get("secret") || "";
  let authorized = !!cronSecret && provided === cronSecret;
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

      const body = cleanupEmptyGreetings(compileTemplate(step.content, vars));
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
