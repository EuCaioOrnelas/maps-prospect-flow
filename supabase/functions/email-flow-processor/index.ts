import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const results = {
    flows_processed: 0,
    enrollments_created: 0,
    steps_advanced: 0,
    emails_sent: 0,
    errors: [] as string[],
  };

  try {
    await enrollEligibleLeads(supabase, results);
    await advanceEnrollments(supabase, supabaseUrl, resendApiKey, results);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Email flow processor error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function enrollEligibleLeads(supabase: any, results: any) {
  const { data: flows } = await supabase
    .from("email_flows")
    .select("*")
    .eq("status", "active");

  if (!flows?.length) return;

  for (const flow of flows) {
    results.flows_processed++;
    const triggerType = flow.trigger_type;
    const audienceType = flow.audience_type;
    const entryRules = flow.entry_rules || {};

    // CRITICAL: Use flow.updated_at as activation cutoff date.
    // Only enroll users whose triggering event happened AFTER the flow was activated.
    const flowActivatedAt = flow.updated_at;

    // ── CHECKOUT ABANDONED: special path using checkout_leads table ──
    if (triggerType === "checkout_abandoned") {
      await enrollCheckoutAbandoned(supabase, flow, flowActivatedAt, entryRules, results);
      continue;
    }

    // ── DOWNGRADE: special path — must verify subscription_current_period_end exists ──
    if (triggerType === "downgrade") {
      await enrollDowngradedUsers(supabase, flow, flowActivatedAt, entryRules, results);
      continue;
    }

    // ── Standard profile-based triggers ──
    let query = supabase.from("profiles").select("id, email, name, plan, trial_start_at, created_at, updated_at").eq("is_blocked", false);

    switch (audienceType) {
      case "all": break;
      case "all_free": query = query.eq("plan", "free"); break;
      case "all_paid": query = query.neq("plan", "free"); break;
      case "trial_active":
        query = query.eq("plan", "free").not("trial_start_at", "is", null);
        break;
      case "trial_expired":
        query = query.eq("plan", "free");
        break;
      case "inactive_7d":
      case "inactive_30d":
        query = query.eq("plan", "free");
        break;
    }

    // Time filter: only events after flow activation
    if (triggerType === "signup" || triggerType === "free_trial") {
      query = query.gte("created_at", flowActivatedAt);
    } else {
      query = query.gte("updated_at", flowActivatedAt);
    }

    const { data: users } = await query;
    if (!users?.length) continue;

    const now = new Date();

    for (const user of users) {
      const eligible = checkTriggerEligibility(triggerType, user, flow.trigger_config || {}, now);
      if (!eligible) continue;

      const currentStateCheck = await validateCurrentEligibility(
        supabase,
        flow,
        user.id,
        user,
        undefined,
      );
      if (!currentStateCheck.eligible) continue;

      if (audienceType === "trial_expired") {
        const ts = user.trial_start_at ? new Date(user.trial_start_at) : new Date(user.created_at);
        const trialEnd = new Date(ts.getTime() + 14 * 86400000);
        if (now < trialEnd) continue;
      }
      if (audienceType === "inactive_7d" || audienceType === "inactive_30d") {
        const days = audienceType === "inactive_7d" ? 7 : 30;
        const lastActive = new Date(user.updated_at);
        const inactiveDays = Math.floor((now.getTime() - lastActive.getTime()) / 86400000);
        if (inactiveDays < days) continue;
      }

      await enrollUserIfEligible(supabase, flow, user.id, triggerType, audienceType, entryRules, results);
    }
  }
}

// ── CHECKOUT ABANDONED: uses checkout_leads table (includes non-users) ──
async function enrollCheckoutAbandoned(supabase: any, flow: any, flowActivatedAt: string, entryRules: any, results: any) {
  // Get checkout leads that started AFTER flow activation and didn't complete
  // Sort by checkout_started_at DESC so dedup keeps the most recent per email
  const { data: checkoutLeads } = await supabase
    .from("checkout_leads")
    .select("id, user_id, email, name, plan_attempted, checkout_started_at, checkout_completed")
    .eq("checkout_completed", false)
    .gte("checkout_started_at", flowActivatedAt)
    .order("checkout_started_at", { ascending: false });

  if (!checkoutLeads?.length) return;

  // Deduplicate by email (keep most recent — already sorted DESC)
  const seen = new Set<string>();
  const uniqueLeads = [];
  for (const lead of checkoutLeads) {
    if (!lead.email) continue;
    const key = lead.email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueLeads.push(lead);
  }

  const audienceType = flow.audience_type;
  const now = new Date();

  for (const lead of uniqueLeads) {
    const emailLower = lead.email.toLowerCase().trim();

    // BUG FIX #3/#4: Re-validate that this lead has NOT completed checkout
    // since enrolling. A lead can show up in `checkout_leads` with
    // `checkout_completed=false` for the abandoned attempt but later have a
    // separate row marked completed. Skip them so we don't email customers
    // who already paid.
    const completed = await hasCompletedCheckoutAfter(supabase, {
      email: emailLower,
      userId: lead.user_id || null,
      since: null,
    });
    if (completed) continue;

    // BUG FIX #1: Apply audience filter even for checkout_abandoned trigger.
    // Previously matchesAudienceState() returned true unconditionally for
    // this trigger, so a flow targeted at "trial_active" + "checkout_abandoned"
    // would still enroll non-trial users (or vice-versa).
    let profile: any = null;
    if (lead.user_id) {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, name, plan, trial_start_at, created_at, updated_at, subscription_current_period_end, is_blocked")
        .eq("id", lead.user_id)
        .maybeSingle();
      profile = data;
    } else {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, name, plan, trial_start_at, created_at, updated_at, subscription_current_period_end, is_blocked")
        .eq("email", emailLower)
        .maybeSingle();
      profile = data;
    }

    // If audience requires a profile (anything other than "all" / not set)
    // and we don't have one, skip — we cannot prove eligibility.
    if (audienceType && audienceType !== "all") {
      if (!profile) continue;
      if (profile.is_blocked) continue;
      // Reuse the same audience matcher used elsewhere, but force a
      // non-checkout trigger so it actually checks the audience.
      if (!matchesAudienceState(audienceType, profile, now, "__audience_check__")) continue;
    } else if (profile?.is_blocked) {
      continue;
    }

    const metadata = {
      email: lead.email,
      name: lead.name,
      plan_attempted: lead.plan_attempted,
      is_checkout_lead: !lead.user_id,
      checkout_lead_id: lead.id,
      checkout_started_at: lead.checkout_started_at,
    };

    const currentStateCheck = await validateCurrentEligibility(
      supabase,
      flow,
      lead.user_id || lead.id,
      profile,
      metadata,
    );
    if (!currentStateCheck.eligible) continue;

    // Use user_id if available, otherwise use a deterministic ID from email
    const enrollUserId = lead.user_id || lead.id;

    await enrollUserIfEligible(supabase, flow, enrollUserId, "checkout_abandoned", flow.audience_type, entryRules, results, metadata);
  }
}

// ── DOWNGRADE: only users who were paying and became free AFTER activation ──
async function enrollDowngradedUsers(supabase: any, flow: any, flowActivatedAt: string, entryRules: any, results: any) {
  // Downgraded = plan is 'free' BUT has subscription_current_period_end (was once paying)
  // AND updated_at is after flow activation (the downgrade happened recently)
  const { data: users } = await supabase
    .from("profiles")
    .select("id, email, name, plan, subscription_current_period_end, updated_at")
    .eq("plan", "free")
    .eq("is_blocked", false)
    .not("subscription_current_period_end", "is", null)
    .gte("updated_at", flowActivatedAt);

  if (!users?.length) return;

  for (const user of users) {
    const currentStateCheck = await validateCurrentEligibility(
      supabase,
      flow,
      user.id,
      user,
      undefined,
    );
    if (!currentStateCheck.eligible) continue;

    await enrollUserIfEligible(supabase, flow, user.id, "downgrade", flow.audience_type, entryRules, results);
  }
}

// ── Shared enrollment logic ──
async function enrollUserIfEligible(
  supabase: any, flow: any, userId: string, triggerType: string,
  audienceType: string, entryRules: any, results: any, metadata?: any
) {
  const now = new Date();

  // Check if already enrolled in any active flow with same trigger
  const { data: activeFlows } = await supabase
    .from("email_flows")
    .select("id")
    .eq("trigger_type", triggerType)
    .eq("status", "active");

  const activeFlowIds = (activeFlows || []).map((f: any) => f.id);

  if (activeFlowIds.length > 0) {
    const { count: activeCount } = await supabase
      .from("email_flow_enrollments")
      .select("*", { count: "exact", head: true })
      .in("flow_id", activeFlowIds)
      .eq("user_id", userId)
      .eq("status", "active");

    if ((activeCount || 0) > 0) return;
  }

  const maxEntries = entryRules.max_entries_per_user || 1;
  const { count } = await supabase
    .from("email_flow_enrollments")
    .select("*", { count: "exact", head: true })
    .eq("flow_id", flow.id)
    .eq("user_id", userId);

  if ((count || 0) >= maxEntries) return;

  if (entryRules.reentry_after_days && (count || 0) > 0) {
    const { data: lastEnrollment } = await supabase
      .from("email_flow_enrollments")
      .select("entered_at")
      .eq("flow_id", flow.id)
      .eq("user_id", userId)
      .order("entered_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastEnrollment) {
      const daysSince = Math.floor((now.getTime() - new Date(lastEnrollment.entered_at).getTime()) / 86400000);
      if (daysSince < entryRules.reentry_after_days) return;
    }
  }

  const { data: entryNode } = await supabase
    .from("email_flow_nodes")
    .select("id")
    .eq("flow_id", flow.id)
    .eq("node_type", "entry")
    .maybeSingle();

  if (!entryNode) return;

  const { data: firstEdge } = await supabase
    .from("email_flow_edges")
    .select("target_node_id")
    .eq("flow_id", flow.id)
    .eq("source_node_id", entryNode.id)
    .maybeSingle();

  const firstNodeId = firstEdge?.target_node_id || entryNode.id;

  await supabase.from("email_flow_enrollments").insert({
    flow_id: flow.id,
    user_id: userId,
    current_node_id: firstNodeId,
    next_step_at: now.toISOString(),
    metadata: metadata || null,
  });

  await supabase.from("email_flow_execution_logs").insert({
    flow_id: flow.id,
    user_id: userId,
    node_id: entryNode.id,
    action_type: "enrolled",
    status: "success",
    details: { trigger: triggerType, audience: audienceType, ...(metadata || {}) },
  });

  results.enrollments_created++;
}

function checkTriggerEligibility(triggerType: string, user: any, triggerConfig: any, now: Date): boolean {
  const trialStart = user.trial_start_at ? new Date(user.trial_start_at) : null;
  const trialEnd = trialStart ? new Date(trialStart.getTime() + 14 * 86400000) : null;
  const lastActive = new Date(user.updated_at);
  const inactiveDays = Math.floor((now.getTime() - lastActive.getTime()) / 86400000);

  switch (triggerType) {
    case "free_trial": return !!trialStart && trialEnd! > now;
    case "signup": return true;
    case "checkout_started": return true;
    case "checkout_abandoned": return true; // Handled separately via enrollCheckoutAbandoned
    case "trial_expired_10d": {
      if (!trialEnd) return false;
      const daysSinceExpiry = Math.floor((now.getTime() - trialEnd.getTime()) / 86400000);
      return daysSinceExpiry >= 10;
    }
    case "downgrade": return true; // Handled separately via enrollDowngradedUsers
    case "inactive": {
      const days = triggerConfig.inactive_days || 7;
      return inactiveDays >= days;
    }
    case "score_reached": return true;
    case "tag_added": return true; // Tag-based trigger — eligibility checked via tag match
    case "manual": return false;
    default: return false;
  }
}

async function validateCurrentEligibility(
  supabase: any,
  flow: any,
  userId: string,
  baseUser?: any,
  metadata?: any,
): Promise<{ eligible: boolean; reason?: string; user?: any }> {
  const now = new Date();
  const currentUser = await getCurrentUserState(supabase, userId, baseUser, metadata);

  if (currentUser?.is_blocked) {
    return { eligible: false, reason: "user_blocked", user: currentUser };
  }

  if (flow.trigger_type !== "checkout_abandoned" && !currentUser) {
    return { eligible: false, reason: "user_not_found" };
  }

  if (!matchesAudienceState(flow.audience_type, currentUser, now, flow.trigger_type)) {
    return { eligible: false, reason: "audience_state_mismatch", user: currentUser };
  }

  switch (flow.trigger_type) {
    case "checkout_abandoned": {
      const email = (metadata?.email || currentUser?.email || "").toLowerCase().trim();
      if (!email) return { eligible: false, reason: "checkout_email_missing", user: currentUser };

      const { data: latestLeads } = await supabase
        .from("checkout_leads")
        .select("id, checkout_started_at, checkout_completed, checkout_completed_at, user_id")
        .eq("email", email)
        .order("checkout_started_at", { ascending: false })
        .limit(5);

      const latestLead = latestLeads?.[0];
      if (!latestLead) return { eligible: false, reason: "checkout_not_found", user: currentUser };
      if (latestLead.checkout_completed) return { eligible: false, reason: "checkout_recovered", user: currentUser };

      if (metadata?.checkout_lead_id && latestLead.id !== metadata.checkout_lead_id) {
        return { eligible: false, reason: "stale_checkout_state", user: currentUser };
      }

      const latestStartedAt = latestLead.checkout_started_at || metadata?.checkout_started_at;
      const recoveredCheckout = latestStartedAt
        ? await hasCompletedCheckoutAfter(supabase, {
            email,
            userId: currentUser?.id,
            since: latestStartedAt,
          })
        : false;

      if (recoveredCheckout) {
        return { eligible: false, reason: "checkout_recovered", user: currentUser };
      }

      if (currentUser?.plan && currentUser.plan !== "free" && currentUser.plan !== "none") {
        return { eligible: false, reason: "already_customer", user: currentUser };
      }

      return { eligible: true, user: currentUser };
    }

    case "downgrade": {
      if (!currentUser || currentUser.plan !== "free") {
        return { eligible: false, reason: "not_downgraded", user: currentUser };
      }

      if (!currentUser.subscription_current_period_end) {
        return { eligible: false, reason: "no_paid_history", user: currentUser };
      }

      const periodEnd = new Date(currentUser.subscription_current_period_end);
      if (periodEnd > now) {
        return { eligible: false, reason: "subscription_still_active", user: currentUser };
      }

      const recoveredCheckout = await hasCompletedCheckoutAfter(supabase, {
        email: currentUser.email,
        userId: currentUser.id,
        since: currentUser.updated_at,
      });
      if (recoveredCheckout) {
        return { eligible: false, reason: "repurchased_after_downgrade", user: currentUser };
      }

      return { eligible: true, user: currentUser };
    }

    case "free_trial": {
      const trialStart = currentUser?.trial_start_at ? new Date(currentUser.trial_start_at) : null;
      const trialEnd = trialStart ? new Date(trialStart.getTime() + 14 * 86400000) : null;
      return {
        eligible: !!currentUser && currentUser.plan === "free" && !!trialEnd && trialEnd > now,
        reason: "trial_not_active",
        user: currentUser,
      };
    }

    case "trial_expired_10d": {
      const trialStart = currentUser?.trial_start_at ? new Date(currentUser.trial_start_at) : null;
      const trialEnd = trialStart ? new Date(trialStart.getTime() + 14 * 86400000) : null;
      if (!currentUser || currentUser.plan !== "free" || !trialEnd) {
        return { eligible: false, reason: "trial_not_expired", user: currentUser };
      }

      const daysSinceExpiry = Math.floor((now.getTime() - trialEnd.getTime()) / 86400000);
      if (daysSinceExpiry < 10) {
        return { eligible: false, reason: "trial_expiry_window_not_reached", user: currentUser };
      }

      const recoveredCheckout = await hasCompletedCheckoutAfter(supabase, {
        email: currentUser.email,
        userId: currentUser.id,
        since: trialEnd.toISOString(),
      });
      if (recoveredCheckout) {
        return { eligible: false, reason: "converted_after_trial", user: currentUser };
      }

      return { eligible: true, user: currentUser };
    }

    case "inactive": {
      if (!currentUser) return { eligible: false, reason: "user_not_found" };
      const days = flow.trigger_config?.inactive_days || 7;
      const lastActive = new Date(currentUser.updated_at);
      const inactiveDays = Math.floor((now.getTime() - lastActive.getTime()) / 86400000);
      return {
        eligible: inactiveDays >= days,
        reason: "user_active_again",
        user: currentUser,
      };
    }

    default:
      return { eligible: true, user: currentUser };
  }
}

function matchesAudienceState(audienceType: string, user: any, now: Date, triggerType: string): boolean {
  if (triggerType === "checkout_abandoned") return true;
  if (!user) return false;

  switch (audienceType) {
    case "all":
      return true;
    case "all_free":
      return user.plan === "free";
    case "all_paid":
      return !!user.plan && user.plan !== "free" && user.plan !== "none";
    case "trial_active": {
      if (!user.trial_start_at || user.plan !== "free") return false;
      const trialEnd = new Date(new Date(user.trial_start_at).getTime() + 14 * 86400000);
      return trialEnd > now;
    }
    case "trial_expired": {
      if (!user.trial_start_at || user.plan !== "free") return false;
      const trialEnd = new Date(new Date(user.trial_start_at).getTime() + 14 * 86400000);
      return trialEnd <= now;
    }
    case "inactive_7d": {
      const lastActive = new Date(user.updated_at);
      return Math.floor((now.getTime() - lastActive.getTime()) / 86400000) >= 7;
    }
    case "inactive_30d": {
      const lastActive = new Date(user.updated_at);
      return Math.floor((now.getTime() - lastActive.getTime()) / 86400000) >= 30;
    }
    default:
      return true;
  }
}

async function getCurrentUserState(supabase: any, userId: string, baseUser?: any, metadata?: any) {
  let currentUser = baseUser || null;

  if (userId) {
    const { data: profileById } = await supabase
      .from("profiles")
      .select("id, email, name, plan, trial_start_at, created_at, updated_at, subscription_current_period_end, is_blocked")
      .eq("id", userId)
      .maybeSingle();

    if (profileById) currentUser = profileById;
  }

  const email = (metadata?.email || currentUser?.email || "").toLowerCase().trim();
  if ((!currentUser || !currentUser.email) && email) {
    const { data: profileByEmail } = await supabase
      .from("profiles")
      .select("id, email, name, plan, trial_start_at, created_at, updated_at, subscription_current_period_end, is_blocked")
      .eq("email", email)
      .maybeSingle();

    if (profileByEmail) currentUser = profileByEmail;
  }

  if (currentUser) return currentUser;

  if (email) {
    return {
      id: userId,
      email,
      name: metadata?.name || email.split("@")[0],
      plan: "none",
      trial_start_at: null,
      created_at: metadata?.checkout_started_at || null,
      updated_at: metadata?.checkout_started_at || new Date().toISOString(),
      subscription_current_period_end: null,
      is_blocked: false,
    };
  }

  return null;
}

async function hasCompletedCheckoutAfter(
  supabase: any,
  params: { email?: string | null; userId?: string | null; since?: string | null },
): Promise<boolean> {
  const { email, userId, since } = params;
  if (!email && !userId) return false;

  let query = supabase
    .from("checkout_leads")
    .select("id", { count: "exact", head: true })
    .eq("checkout_completed", true);

  if (email) {
    query = query.eq("email", email.toLowerCase().trim());
  } else if (userId) {
    query = query.eq("user_id", userId);
  }

  if (since) {
    query = query.gte("checkout_completed_at", since);
  }

  const { count } = await query;
  return (count || 0) > 0;
}

async function advanceEnrollments(supabase: any, supabaseUrl: string, resendApiKey: string, results: any) {
  const now = new Date().toISOString();

  const { data: pendingEnrollments } = await supabase
    .from("email_flow_enrollments")
    .select("*")
    .eq("status", "active")
    .lte("next_step_at", now)
    .limit(100);

  if (!pendingEnrollments?.length) return;

  for (const enrollment of pendingEnrollments) {
    const { data: flow } = await supabase
      .from("email_flows")
      .select("id, trigger_type, audience_type, trigger_config")
      .eq("id", enrollment.flow_id)
      .maybeSingle();

    if (!flow) {
      await completeEnrollment(supabase, enrollment, "flow_not_found");
      continue;
    }

    const { data: node } = await supabase
      .from("email_flow_nodes")
      .select("*")
      .eq("id", enrollment.current_node_id)
      .maybeSingle();

    if (!node) {
      await completeEnrollment(supabase, enrollment, "node_not_found");
      continue;
    }

    // Try to get user from profiles
    let user: any = null;
    const { data: profileUser } = await supabase
      .from("profiles")
      .select("id, email, name, plan")
      .eq("id", enrollment.user_id)
      .maybeSingle();

    if (profileUser) {
      user = profileUser;
    } else {
      // Non-user enrollment (e.g. checkout_abandoned lead) — use metadata
      const meta = enrollment.metadata;
      if (meta?.is_checkout_lead && meta?.email) {
        user = {
          id: enrollment.user_id,
          email: meta.email,
          name: meta.name || meta.email.split("@")[0],
          plan: "none",
          is_blocked: false,
        };
      } else {
        await completeEnrollment(supabase, enrollment, "user_not_found");
        continue;
      }
    }

    const currentStateCheck = await validateCurrentEligibility(
      supabase,
      flow,
      enrollment.user_id,
      user,
      enrollment.metadata,
    );

    if (!currentStateCheck.eligible) {
      await completeEnrollment(supabase, enrollment, currentStateCheck.reason || "state_changed");
      continue;
    }

    user = currentStateCheck.user || user;

    switch (node.node_type) {
      case "email": {
        const config = node.config || {};
        if (config.subject && config.body) {
          // ── IDEMPOTENCY GUARD ──
          // If this exact email node has ALREADY been sent for this enrollment,
          // skip the send and just advance to the next node. This prevents
          // re-sending the same email if the flow loops back or is reprocessed.
          const { count: alreadySentCount } = await supabase
            .from("email_flow_execution_logs")
            .select("*", { count: "exact", head: true })
            .eq("enrollment_id", enrollment.id)
            .eq("node_id", node.id)
            .eq("action_type", "email_sent")
            .eq("status", "success");

          if ((alreadySentCount || 0) > 0) {
            console.log(`[email-flow] Skipping duplicate send for enrollment ${enrollment.id}, node ${node.id} — already sent`);
            break; // advance to next node without re-sending
          }

          // Check email preferences — skip if user opted out of marketing
          if (user.id && user.plan !== "none") {
            const { data: prefs } = await supabase
              .from("email_preferences")
              .select("marketing_enabled")
              .eq("user_id", user.id)
              .maybeSingle();
            if (prefs && prefs.marketing_enabled === false) {
              console.log(`[email-flow] Skipping email to ${user.email} — marketing opt-out`);
              await supabase.from("email_flow_execution_logs").insert({
                flow_id: enrollment.flow_id,
                enrollment_id: enrollment.id,
                user_id: user.id,
                node_id: node.id,
                action_type: "email_skipped",
                status: "success",
                details: { reason: "marketing_opt_out" },
              });
              // Still advance to next node
              break;
            }
          }
          const templateVars: Record<string, string> = {
            user_name: user.name || user.email?.split("@")[0] || "usuário",
            user_email: user.email,
            product_name: "Wiize",
            plan: user.plan,
            cta_link: "https://wiize.com.br/dashboard",
          };

          const compiledBody = compileTemplate(config.body, templateVars);
          const compiledSubject = compileTemplate(config.subject, templateVars);

          // Build tracking URLs
          const trackerBase = `${supabaseUrl}/functions/v1/email-flow-tracker`;
          const trackParams = `uid=${user.id}&fid=${enrollment.flow_id}&eid=${enrollment.id}&nid=${node.id}`;

          // Inject open tracking pixel
          let finalBody = compiledBody;
          if (config.track_opens !== false) {
            const openPixel = `<img src="${trackerBase}?action=open&${trackParams}" width="1" height="1" style="display:none;" alt="" />`;
            finalBody += openPixel;
          }

          // Wrap links for click tracking
          if (config.track_clicks !== false) {
            finalBody = finalBody.replace(
              /href="(https?:\/\/[^"]+)"/g,
              (match: string, url: string) => {
                const trackUrl = `${trackerBase}?action=click&${trackParams}&url=${encodeURIComponent(url)}`;
                return `href="${trackUrl}"`;
              }
            );
          }

          const fromName = config.from_name || "Wiize";
          const replyTo = config.reply_to || undefined;
          const previewText = config.preview_text || "";

          // Rate limit: 600ms delay between sends to avoid Resend throttling
          if (results.emails_sent > 0) {
            await new Promise(resolve => setTimeout(resolve, 600));
          }

          const sent = await sendEmail(resendApiKey, {
            to: user.email,
            from: `${fromName} <no-reply@wiize.com.br>`,
            replyTo,
            subject: compiledSubject,
            html: wrapEmailLayout(compiledSubject, finalBody, previewText),
          });

          await supabase.from("email_flow_execution_logs").insert({
            flow_id: enrollment.flow_id,
            enrollment_id: enrollment.id,
            user_id: user.id,
            node_id: node.id,
            action_type: "email_sent",
            status: sent ? "success" : "error",
            details: {
              subject: config.subject,
              from_name: fromName,
              reply_to: replyTo || null,
              track_opens: config.track_opens !== false,
              track_clicks: config.track_clicks !== false,
              track_purchases: config.track_purchases || false,
            },
          });

          if (sent) results.emails_sent++;
        }
        break;
      }

      case "wait": {
        await supabase.from("email_flow_execution_logs").insert({
          flow_id: enrollment.flow_id,
          enrollment_id: enrollment.id,
          user_id: user.id,
          node_id: node.id,
          action_type: "wait_completed",
          status: "success",
        });
        break;
      }

      case "condition": {
        const conditionResult = await evaluateCondition(supabase, node, enrollment, user);

        await supabase.from("email_flow_execution_logs").insert({
          flow_id: enrollment.flow_id,
          enrollment_id: enrollment.id,
          user_id: user.id,
          node_id: node.id,
          action_type: "condition_evaluated",
          status: "success",
          details: {
            condition_type: (node.config as any)?.condition_type,
            result: conditionResult,
          },
        });

        // Route to yes or no branch based on evaluation
        const handle = conditionResult ? "yes" : "no";
        const { data: nextEdge } = await supabase
          .from("email_flow_edges")
          .select("target_node_id")
          .eq("flow_id", enrollment.flow_id)
          .eq("source_node_id", node.id)
          .eq("source_handle", handle)
          .maybeSingle();

        if (nextEdge) {
          await moveToNextNode(supabase, enrollment, nextEdge.target_node_id);
        } else {
          // NO fallback — if the specific branch (yes/no) has no edge, complete the enrollment.
          // Using a fallback "any edge" would route to the WRONG branch (e.g., "yes" path when result was "no").
          console.warn(`[email-flow] Condition node ${node.id} has no "${handle}" edge — completing enrollment ${enrollment.id}`);
          await completeEnrollment(supabase, enrollment, `no_${handle}_branch`);
        }

        results.steps_advanced++;
        continue; // Skip the generic next-node logic below
      }

      case "end": {
        await completeEnrollment(supabase, enrollment, "flow_completed");
        await supabase.from("email_flow_execution_logs").insert({
          flow_id: enrollment.flow_id,
          enrollment_id: enrollment.id,
          user_id: user.id,
          node_id: node.id,
          action_type: "flow_ended",
          status: "success",
        });
        results.steps_advanced++;
        continue;
      }
    }

    // Move to next node (for email/wait nodes — conditions handle their own routing above)
    const { data: nextEdge } = await supabase
      .from("email_flow_edges")
      .select("target_node_id")
      .eq("flow_id", enrollment.flow_id)
      .eq("source_node_id", node.id)
      .limit(1)
      .maybeSingle();

    if (!nextEdge) {
      await completeEnrollment(supabase, enrollment, "no_next_node");
      results.steps_advanced++;
      continue;
    }

    // ── LOOP GUARD ──
    // If the next node has already been visited in this enrollment, do NOT revisit it
    // (would cause infinite re-sends). Complete the enrollment instead.
    const { count: alreadyVisitedCount } = await supabase
      .from("email_flow_execution_logs")
      .select("*", { count: "exact", head: true })
      .eq("enrollment_id", enrollment.id)
      .eq("node_id", nextEdge.target_node_id);

    if ((alreadyVisitedCount || 0) > 0) {
      console.warn(`[email-flow] Loop detected: enrollment ${enrollment.id} would revisit node ${nextEdge.target_node_id}. Completing.`);
      await completeEnrollment(supabase, enrollment, "loop_detected");
      results.steps_advanced++;
      continue;
    }

    await moveToNextNode(supabase, enrollment, nextEdge.target_node_id);

    results.steps_advanced++;
  }
}

// ========== CONDITION EVALUATION ==========

async function evaluateCondition(supabase: any, node: any, enrollment: any, user: any): Promise<boolean> {
  const config = node.config || {};
  const conditionType = config.condition_type;

  switch (conditionType) {
    case "email_opened": {
      // Check if the previous email node in this enrollment was opened
      const { count } = await supabase
        .from("email_flow_execution_logs")
        .select("*", { count: "exact", head: true })
        .eq("enrollment_id", enrollment.id)
        .eq("flow_id", enrollment.flow_id)
        .eq("user_id", user.id)
        .eq("action_type", "email_opened");
      return (count || 0) > 0;
    }

    case "email_clicked": {
      const { count } = await supabase
        .from("email_flow_execution_logs")
        .select("*", { count: "exact", head: true })
        .eq("enrollment_id", enrollment.id)
        .eq("flow_id", enrollment.flow_id)
        .eq("user_id", user.id)
        .eq("action_type", "email_clicked");
      return (count || 0) > 0;
    }

    case "button_clicked_checkout":
    case "button_clicked_dashboard":
    case "button_clicked_any": {
      const btnType = conditionType.replace("button_clicked_", "");
      const { data: clicks } = await supabase
        .from("email_flow_execution_logs")
        .select("details")
        .eq("enrollment_id", enrollment.id)
        .eq("flow_id", enrollment.flow_id)
        .eq("user_id", user.id)
        .eq("action_type", "email_clicked");

      if (btnType === "any") {
        return (clicks || []).some((c: any) => {
          const url = (c.details as any)?.url || "";
          return url.includes("btn=");
        });
      }
      return (clicks || []).some((c: any) => {
        const url = (c.details as any)?.url || "";
        return url.includes(`btn=${btnType}`);
      });
    }

    case "score_above": {
      const threshold = parseInt(config.value) || 50;
      // Check user_scores table (from score-processor)
      const { data: userScore } = await supabase
        .from("user_scores")
        .select("total_score")
        .eq("user_id", user.id)
        .maybeSingle();
      const score = userScore?.total_score || 0;
      return score >= threshold;
    }

    case "has_tag": {
      const tag = config.value || "";
      if (!tag) return false;
      // Check leads table for tags matching this user
      const { data: leads } = await supabase
        .from("leads")
        .select("tags")
        .eq("user_id", user.id)
        .not("tags", "is", null);
      return (leads || []).some((l: any) => (l.tags || []).includes(tag));
    }

    case "is_customer": {
      // Must be a real paying plan (not "free", not "none" for non-user leads)
      return user.plan !== "free" && user.plan !== "none" && !!user.plan;
    }

    case "checkout_started": {
      // For non-user leads (checkout_abandoned), check by email instead of user_id
      const isNonUser = enrollment.metadata?.is_checkout_lead;
      if (isNonUser) {
        const email = enrollment.metadata?.email;
        if (!email) return false;
        const { count } = await supabase
          .from("checkout_leads")
          .select("*", { count: "exact", head: true })
          .eq("email", email);
        return (count || 0) > 0;
      }
      const { count } = await supabase
        .from("checkout_leads")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      return (count || 0) > 0;
    }

    case "inactive_days": {
      const days = parseInt(config.value) || 7;
      const { data: profile } = await supabase
        .from("profiles")
        .select("updated_at")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile) return false;
      const lastActive = new Date(profile.updated_at);
      const inactiveDays = Math.floor((Date.now() - lastActive.getTime()) / 86400000);
      return inactiveDays >= days;
    }

    default:
      return false;
  }
}

// ========== HELPERS ==========

async function moveToNextNode(supabase: any, enrollment: any, nextNodeId: string) {
  const { data: nextNode } = await supabase
    .from("email_flow_nodes")
    .select("*")
    .eq("id", nextNodeId)
    .maybeSingle();

  let delayMs = 0;
  if (nextNode?.node_type === "wait") {
    const cfg = nextNode.config || {};
    const value = cfg.delay_value || 1;
    const unit = cfg.delay_unit || "days";
    switch (unit) {
      case "minutes": delayMs = value * 60000; break;
      case "hours": delayMs = value * 3600000; break;
      case "days": delayMs = value * 86400000; break;
    }
  }

  await supabase.from("email_flow_enrollments").update({
    current_node_id: nextNodeId,
    next_step_at: new Date(Date.now() + delayMs).toISOString(),
  }).eq("id", enrollment.id);
}

async function completeEnrollment(supabase: any, enrollment: any, reason: string) {
  await supabase.from("email_flow_enrollments").update({
    status: "completed",
    completed_at: new Date().toISOString(),
    exit_reason: reason,
  }).eq("id", enrollment.id);
}

function compileTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value || "");
  }
  return result;
}

function wrapEmailLayout(title: string, body: string, previewText: string): string {
  const previewHtml = previewText
    ? `<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${previewText}${"&zwnj;&nbsp;".repeat(40)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
${previewHtml}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
<tr><td style="background:#3daa57;padding:24px 32px;text-align:center;">
  <span style="color:#ffffff;font-size:20px;font-weight:700;">Wiize</span>
</td></tr>
<tr><td style="padding:32px;">
${body}
</td></tr>
<tr><td style="padding:16px 32px;background:#fafafa;text-align:center;border-top:1px solid #e4e4e7;">
  <p style="margin:0;font-size:12px;color:#a1a1aa;">Você recebeu este e-mail porque tem uma conta na Wiize.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

async function sendEmail(resendApiKey: string, options: { to: string; from: string; replyTo?: string; subject: string; html: string }): Promise<boolean> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const payload: any = {
        from: options.from,
        to: [options.to],
        subject: options.subject,
        html: options.html,
      };

      if (options.replyTo) {
        payload.reply_to = options.replyTo;
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await response.text();
        return true;
      }

      const errText = await response.text();
      const shouldRetry = (response.status === 429 || response.status >= 500) && attempt < maxAttempts;

      if (shouldRetry) {
        console.warn(`[email-flow] Resend ${response.status}, retrying (${attempt}/${maxAttempts})...`);
        await new Promise(r => setTimeout(r, 700 * attempt));
        continue;
      }

      console.error(`[email-flow] Resend error [${response.status}]:`, errText);
      return false;
    } catch (error) {
      if (attempt < maxAttempts) {
        console.warn(`[email-flow] Network error, retrying (${attempt}/${maxAttempts})...`);
        await new Promise(r => setTimeout(r, 700 * attempt));
        continue;
      }
      console.error("[email-flow] Send email error:", error);
      return false;
    }
  }

  return false;
}
