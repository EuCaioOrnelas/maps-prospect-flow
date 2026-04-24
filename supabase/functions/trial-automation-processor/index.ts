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
    automations_processed: 0,
    emails_sent: 0,
    triggers_evaluated: 0,
    errors: [] as string[],
  };

  try {
    // 1. Process time-based automations
    await processTimeBasedAutomations(supabase, resendApiKey, results);

    // 2. Evaluate behaviour triggers
    await evaluateBehaviourTriggers(supabase, results);

    // 3. Process pending automation steps
    await processPendingSteps(supabase, resendApiKey, results);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Trial automation processor error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processTimeBasedAutomations(
  supabase: any,
  resendApiKey: string,
  results: any
) {
  // Get active time-based automations
  const { data: automations } = await supabase
    .from("trial_automations")
    .select("*, trial_automation_steps(*)")
    .eq("status", "active")
    .eq("automation_type", "time_based");

  if (!automations?.length) return;

  // Get all free trial users
  const { data: trialUsers } = await supabase
    .from("profiles")
    .select("id, email, name, plan, trial_start_at, created_at, updated_at")
    .eq("plan", "free")
    .not("trial_start_at", "is", null);

  if (!trialUsers?.length) return;

  for (const automation of automations) {
    for (const user of trialUsers) {
      const shouldEnter = await evaluateAutomationTrigger(
        supabase,
        automation,
        user
      );
      if (!shouldEnter) continue;

      // Check if user already in this automation
      const { data: existingState } = await supabase
        .from("trial_user_automation_state")
        .select("id")
        .eq("user_id", user.id)
        .eq("automation_id", automation.id)
        .in("status", ["active", "completed"])
        .maybeSingle();

      if (existingState) continue;

      // Enter user into automation
      const steps = automation.trial_automation_steps?.sort(
        (a: any, b: any) => a.step_order - b.step_order
      );
      if (!steps?.length) continue;

      const firstStep = steps[0];
      const nextStepAt = new Date(
        Date.now() + firstStep.delay_hours * 3600000
      ).toISOString();

      await supabase.from("trial_user_automation_state").insert({
        user_id: user.id,
        automation_id: automation.id,
        current_step_id: firstStep.id,
        status: "active",
        next_step_at: nextStepAt,
      });

      // Track event
      await supabase.from("trial_product_events").insert({
        user_id: user.id,
        event_name: "automation_entered",
        event_source: "automation",
        metadata: {
          automation_id: automation.id,
          automation_name: automation.name,
        },
      });

      results.automations_processed++;
    }
  }
}

async function evaluateAutomationTrigger(
  supabase: any,
  automation: any,
  user: any
): Promise<boolean> {
  const now = new Date();
  const trialStart = user.trial_start_at
    ? new Date(user.trial_start_at)
    : new Date(user.created_at);
  const trialDays = 14;
  const trialEnd = new Date(trialStart.getTime() + trialDays * 86400000);
  const trialDaysRemaining = Math.max(
    0,
    Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000)
  );
  const isTrialActive = now < trialEnd;
  const lastActivity = new Date(user.updated_at);
  const inactiveDays = Math.floor(
    (now.getTime() - lastActivity.getTime()) / 86400000
  );

  switch (automation.trigger_event) {
    case "user_inactive":
      return isTrialActive && inactiveDays >= 2;
    case "trial_expiring":
      return isTrialActive && trialDaysRemaining <= 7 && trialDaysRemaining > 0;
    case "trial_ended":
      return !isTrialActive;
    default:
      return false;
  }
}

async function evaluateBehaviourTriggers(supabase: any, results: any) {
  const { data: triggers } = await supabase
    .from("trial_behaviour_triggers")
    .select("*")
    .eq("status", "active");

  if (!triggers?.length) return;

  const { data: trialUsers } = await supabase
    .from("profiles")
    .select("id, email, name, plan, trial_start_at, created_at, updated_at")
    .eq("plan", "free");

  if (!trialUsers?.length) return;

  for (const trigger of triggers) {
    for (const user of trialUsers) {
      results.triggers_evaluated++;

      const matched = await evaluateBehaviourConditions(
        supabase,
        trigger,
        user
      );
      if (!matched) continue;

      // Check entry rules
      const canEnter = await checkEntryRules(supabase, trigger, user);
      if (!canEnter) continue;

      // Log trigger match
      await supabase.from("trial_behaviour_trigger_logs").insert({
        trigger_id: trigger.id,
        user_id: user.id,
        action: "behavior_trigger_matched",
        metadata: { trigger_name: trigger.name },
      });

      // Enter user into target automation if configured
      if (trigger.target_automation_id) {
        const { data: existingState } = await supabase
          .from("trial_user_automation_state")
          .select("id")
          .eq("user_id", user.id)
          .eq("automation_id", trigger.target_automation_id)
          .eq("status", "active")
          .maybeSingle();

        if (!existingState) {
          const { data: steps } = await supabase
            .from("trial_automation_steps")
            .select("*")
            .eq("automation_id", trigger.target_automation_id)
            .order("step_order");

          if (steps?.length) {
            const firstStep = steps[0];
            await supabase.from("trial_user_automation_state").insert({
              user_id: user.id,
              automation_id: trigger.target_automation_id,
              current_step_id: firstStep.id,
              status: "active",
              next_step_at: new Date(
                Date.now() + firstStep.delay_hours * 3600000
              ).toISOString(),
            });

            await supabase.from("trial_behaviour_trigger_logs").insert({
              trigger_id: trigger.id,
              user_id: user.id,
              action: "behavior_automation_entered",
              metadata: {
                automation_id: trigger.target_automation_id,
              },
            });
          }
        }
      }
    }
  }
}

async function evaluateBehaviourConditions(
  supabase: any,
  trigger: any,
  user: any
): Promise<boolean> {
  const conditions = trigger.conditions;
  if (!conditions?.conditions?.length) return false;

  const now = new Date();
  const trialStart = user.trial_start_at
    ? new Date(user.trial_start_at)
    : new Date(user.created_at);
  const trialEnd = new Date(trialStart.getTime() + 14 * 86400000);
  const isTrialActive = now < trialEnd;
  const signupAgeDays = Math.floor(
    (now.getTime() - new Date(user.created_at).getTime()) / 86400000
  );
  const lastActivity = new Date(user.updated_at);
  const inactiveDays = Math.floor(
    (now.getTime() - lastActivity.getTime()) / 86400000
  );

  // Get activation progress
  const { data: activation } = await supabase
    .from("user_activation_progress")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const activationCompleted = activation?.activation_completed || false;

  // Build context
  const context: Record<string, any> = {
    trial_active: isTrialActive,
    activation_completed: activationCompleted,
    signup_age_days: signupAgeDays,
    inactive_days: inactiveDays,
    high_value_feature_used: false, // would check events
  };

  // Check email clicks
  const { count: clickCount } = await supabase
    .from("trial_link_clicks")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  context.email_clicked = (clickCount || 0) > 0;

  // Check pricing visit
  const { count: pricingCount } = await supabase
    .from("trial_product_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("event_name", "visited_pricing_page");

  context.visited_pricing_page = (pricingCount || 0) > 0;

  // Check subscription
  context.subscription_started = user.plan !== "free";

  // Evaluate all conditions
  const operator = conditions.operator || "AND";
  const conditionResults = conditions.conditions.map((cond: any) => {
    const fieldValue = context[cond.field];
    switch (cond.comparison) {
      case "=":
        return fieldValue === cond.value;
      case "!=":
        return fieldValue !== cond.value;
      case ">=":
        return fieldValue >= cond.value;
      case "<=":
        return fieldValue <= cond.value;
      case ">":
        return fieldValue > cond.value;
      case "<":
        return fieldValue < cond.value;
      default:
        return false;
    }
  });

  return operator === "AND"
    ? conditionResults.every(Boolean)
    : conditionResults.some(Boolean);
}

async function checkEntryRules(
  supabase: any,
  trigger: any,
  user: any
): Promise<boolean> {
  const rules = trigger.entry_rules || {};

  if (rules.max_entries_per_user) {
    const { count } = await supabase
      .from("trial_behaviour_trigger_logs")
      .select("*", { count: "exact", head: true })
      .eq("trigger_id", trigger.id)
      .eq("user_id", user.id)
      .eq("action", "behavior_trigger_matched");

    if ((count || 0) >= rules.max_entries_per_user) return false;
  }

  if (rules.reentry_after_days) {
    const { data: lastEntry } = await supabase
      .from("trial_behaviour_trigger_logs")
      .select("created_at")
      .eq("trigger_id", trigger.id)
      .eq("user_id", user.id)
      .eq("action", "behavior_trigger_matched")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastEntry) {
      const daysSinceLast = Math.floor(
        (Date.now() - new Date(lastEntry.created_at).getTime()) / 86400000
      );
      if (daysSinceLast < rules.reentry_after_days) return false;
    }
  }

  return true;
}

async function processPendingSteps(
  supabase: any,
  resendApiKey: string,
  results: any
) {
  const now = new Date().toISOString();

  // Get states where next_step_at has passed
  const { data: pendingStates } = await supabase
    .from("trial_user_automation_state")
    .select(
      "*, trial_automation_steps!trial_user_automation_state_current_step_id_fkey(*)"
    )
    .eq("status", "active")
    .lte("next_step_at", now);

  if (!pendingStates?.length) return;

  for (const state of pendingStates) {
    const step = state.trial_automation_steps;
    if (!step) continue;

    // Get user info
    const { data: user } = await supabase
      .from("profiles")
      .select("id, email, name, plan")
      .eq("id", state.user_id)
      .maybeSingle();

    if (!user || user.plan !== "free") {
      // User converted, complete automation
      await supabase
        .from("trial_user_automation_state")
        .update({ status: "completed", completed_at: now })
        .eq("id", state.id);
      continue;
    }

    // Get template
    if (step.template_id) {
      const { data: template } = await supabase
        .from("trial_message_templates")
        .select("*")
        .eq("id", step.template_id)
        .maybeSingle();

      if (template) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const trackerBase = `${supabaseUrl}/functions/v1/trial-email-tracker`;

        // Calculate real trial data for variables
        const trialStart = user.trial_start_at ? new Date(user.trial_start_at) : new Date(user.created_at);
        const trialEnd = new Date(trialStart.getTime() + 14 * 86400000);
        const trialDaysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000));

        // Count user's projects/features
        const { count: featureCount } = await supabase
          .from("trial_product_events")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        // Compile template
        let compiledBody = compileTemplate(template.body, {
          user_name: user.name || user.email?.split("@")[0] || "usuário",
          product_name: "Wiize",
          cta_link: "https://wiize.com.br/dashboard",
          trial_days_left: String(trialDaysLeft),
          projects_created: "0",
          feature_usage: String(featureCount || 0),
        });

        // Inject tracking: rewrite links for click tracking
        compiledBody = compiledBody.replace(
          /href="(https?:\/\/[^"]+)"/g,
          (match: string, url: string) => {
            // Don't track the tracker itself
            if (url.includes("trial-email-tracker")) return match;
            const trackUrl = `${trackerBase}?action=click&uid=${user.id}&tid=${template.id}&aid=${state.automation_id}&url=${encodeURIComponent(url)}`;
            return `href="${trackUrl}"`;
          }
        );

        // Add tracking pixel for open tracking
        const trackPixel = `<img src="${trackerBase}?action=open&uid=${user.id}&tid=${template.id}&aid=${state.automation_id}" width="1" height="1" alt="" style="display:none;" />`;

        // Rate limit: 600ms delay between sends to avoid Resend throttling
        if (results.emails_sent > 0) {
          await new Promise(resolve => setTimeout(resolve, 600));
        }

        // Send email via Resend
        const sent = await sendEmail(resendApiKey, {
          to: user.email,
          subject: compileTemplate(template.subject, {
            user_name: user.name || "usuário",
            product_name: "Wiize",
          }),
          html: wrapInEmailLayout(template.subject, compiledBody, trackPixel),
        });

        if (sent) {
          results.emails_sent++;

          // Track email event
          await supabase.from("trial_email_events").insert({
            user_id: user.id,
            email_template_id: template.id,
            automation_id: state.automation_id,
            step_id: step.id,
            event_type: "sent",
          });

          await supabase.from("trial_product_events").insert({
            user_id: user.id,
            event_name: "automation_email_sent",
            event_source: "automation",
            metadata: {
              automation_id: state.automation_id,
              step_id: step.id,
              template_id: template.id,
            },
          });
        }
      }
    }

    // Move to next step
    const { data: nextSteps } = await supabase
      .from("trial_automation_steps")
      .select("*")
      .eq("automation_id", state.automation_id)
      .gt("step_order", step.step_order)
      .order("step_order")
      .limit(1);

    if (nextSteps?.length) {
      const nextStep = nextSteps[0];
      await supabase
        .from("trial_user_automation_state")
        .update({
          current_step_id: nextStep.id,
          next_step_at: new Date(
            Date.now() + nextStep.delay_hours * 3600000
          ).toISOString(),
        })
        .eq("id", state.id);
    } else {
      // Automation completed
      await supabase
        .from("trial_user_automation_state")
        .update({ status: "completed", completed_at: now })
        .eq("id", state.id);

      await supabase.from("trial_product_events").insert({
        user_id: state.user_id,
        event_name: "automation_completed",
        event_source: "automation",
        metadata: { automation_id: state.automation_id },
      });
    }
  }
}

function compileTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

function wrapInEmailLayout(title: string, body: string, trackPixel: string = ""): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
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
${trackPixel}
</body>
</html>`;
}

async function sendEmail(
  resendApiKey: string,
  options: { to: string; subject: string; html: string }
): Promise<boolean> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Wiize <no-reply@wiize.com.br>",
          to: [options.to],
          subject: options.subject,
          html: options.html,
        }),
      });

      if (response.ok) {
        await response.text();
        return true;
      }

      const errText = await response.text();
      const shouldRetry = (response.status === 429 || response.status >= 500) && attempt < maxAttempts;

      if (shouldRetry) {
        console.warn(`[trial-automation] Resend ${response.status}, retrying (${attempt}/${maxAttempts})...`);
        await new Promise(r => setTimeout(r, 700 * attempt));
        continue;
      }

      console.error(`[trial-automation] Resend error [${response.status}]:`, errText);
      return false;
    } catch (error) {
      if (attempt < maxAttempts) {
        console.warn(`[trial-automation] Network error, retrying (${attempt}/${maxAttempts})...`);
        await new Promise(r => setTimeout(r, 700 * attempt));
        continue;
      }
      console.error("[trial-automation] Send email error:", error);
      return false;
    }
  }

  return false;
}
