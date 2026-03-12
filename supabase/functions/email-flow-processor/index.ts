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
    console.error("Email flow processor error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
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

    let query = supabase.from("profiles").select("id, email, name, plan, trial_start_at, created_at, updated_at");

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

    const { data: users } = await query;
    if (!users?.length) continue;

    const now = new Date();

    for (const user of users) {
      const eligible = checkTriggerEligibility(triggerType, user, flow.trigger_config || {}, now);
      if (!eligible) continue;

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
          .eq("user_id", user.id)
          .eq("status", "active");

        if ((activeCount || 0) > 0) continue;
      }

      const maxEntries = entryRules.max_entries_per_user || 1;
      const { count } = await supabase
        .from("email_flow_enrollments")
        .select("*", { count: "exact", head: true })
        .eq("flow_id", flow.id)
        .eq("user_id", user.id);

      if ((count || 0) >= maxEntries) continue;

      if (entryRules.reentry_after_days && (count || 0) > 0) {
        const { data: lastEnrollment } = await supabase
          .from("email_flow_enrollments")
          .select("entered_at")
          .eq("flow_id", flow.id)
          .eq("user_id", user.id)
          .order("entered_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastEnrollment) {
          const daysSince = Math.floor((now.getTime() - new Date(lastEnrollment.entered_at).getTime()) / 86400000);
          if (daysSince < entryRules.reentry_after_days) continue;
        }
      }

      const { data: entryNode } = await supabase
        .from("email_flow_nodes")
        .select("id")
        .eq("flow_id", flow.id)
        .eq("node_type", "entry")
        .maybeSingle();

      if (!entryNode) continue;

      const { data: firstEdge } = await supabase
        .from("email_flow_edges")
        .select("target_node_id")
        .eq("flow_id", flow.id)
        .eq("source_node_id", entryNode.id)
        .maybeSingle();

      const firstNodeId = firstEdge?.target_node_id || entryNode.id;

      await supabase.from("email_flow_enrollments").insert({
        flow_id: flow.id,
        user_id: user.id,
        current_node_id: firstNodeId,
        next_step_at: now.toISOString(),
      });

      await supabase.from("email_flow_execution_logs").insert({
        flow_id: flow.id,
        user_id: user.id,
        node_id: entryNode.id,
        action_type: "enrolled",
        status: "success",
        details: { trigger: triggerType, audience: audienceType },
      });

      results.enrollments_created++;
    }
  }
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
    case "checkout_abandoned": return true;
    case "trial_expired_10d": {
      if (!trialEnd) return false;
      const daysSinceExpiry = Math.floor((now.getTime() - trialEnd.getTime()) / 86400000);
      return daysSinceExpiry >= 10;
    }
    case "downgrade": return true;
    case "inactive": {
      const days = triggerConfig.inactive_days || 7;
      return inactiveDays >= days;
    }
    case "score_reached": return true;
    case "manual": return false;
    default: return false;
  }
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
    const { data: node } = await supabase
      .from("email_flow_nodes")
      .select("*")
      .eq("id", enrollment.current_node_id)
      .maybeSingle();

    if (!node) {
      await completeEnrollment(supabase, enrollment, "node_not_found");
      continue;
    }

    const { data: user } = await supabase
      .from("profiles")
      .select("id, email, name, plan")
      .eq("id", enrollment.user_id)
      .maybeSingle();

    if (!user) {
      await completeEnrollment(supabase, enrollment, "user_not_found");
      continue;
    }

    switch (node.node_type) {
      case "email": {
        const config = node.config || {};
        if (config.subject && config.body) {
          const templateVars: Record<string, string> = {
            user_name: user.name || user.email?.split("@")[0] || "usuário",
            user_email: user.email,
            product_name: "Wiize",
            plan: user.plan,
            cta_link: "https://maps-prospect-flow.lovable.app/dashboard",
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
          // Fallback: try any edge from this node
          const { data: fallbackEdge } = await supabase
            .from("email_flow_edges")
            .select("target_node_id")
            .eq("flow_id", enrollment.flow_id)
            .eq("source_node_id", node.id)
            .limit(1)
            .maybeSingle();

          if (fallbackEdge) {
            await moveToNextNode(supabase, enrollment, fallbackEdge.target_node_id);
          } else {
            await completeEnrollment(supabase, enrollment, "no_next_node_after_condition");
          }
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
      return user.plan !== "free";
    }

    case "checkout_started": {
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

    if (!response.ok) {
      console.error("Resend error:", await response.text());
      return false;
    }
    await response.text(); // consume body
    return true;
  } catch (error) {
    console.error("Send email error:", error);
    return false;
  }
}
