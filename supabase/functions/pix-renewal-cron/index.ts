import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ABACATE_API = "https://api.abacatepay.com/v2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PIX-RENEWAL] ${step}${detailsStr}`);
};

const PRODUCT_IDS: Record<string, string> = {
  start: "prod_YuGfZ0UukSSPPjbjn3DZJkMK",
  growth: "prod_fNftUU0Pd5bEgdpnKTADKUgT",
  scale: "prod_2KNLMQM5QHe0bb1TZxWenx2N",
};

const PLAN_NAMES: Record<string, string> = {
  start: "Wiize Start",
  growth: "Wiize Growth",
  scale: "Wiize Scale",
};

const PLAN_PRICES: Record<string, string> = {
  start: "R$ 197",
  growth: "R$ 497",
  scale: "R$ 897",
};

const PLAN_PRICES_CENTS: Record<string, number> = {
  start: 19700,
  growth: 49700,
  scale: 89700,
};

// Stage definitions: days before expiry -> stage name
const STAGES = [
  { daysBeforeExpiry: 5, stage: "D-5" },
  { daysBeforeExpiry: 3, stage: "D-3" },
  { daysBeforeExpiry: 1, stage: "D-1" },
  { daysBeforeExpiry: 0, stage: "D0" },
  { daysBeforeExpiry: -1, stage: "D+1" },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getCurrentStage(daysRemaining: number): string | null {
  if (daysRemaining <= -1) return "D+1";
  if (daysRemaining === 0) return "D0";
  if (daysRemaining === 1) return "D-1";
  if (daysRemaining <= 3) return "D-3";
  if (daysRemaining <= 5) return "D-5";
  return null; // Too early, no stage yet
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ABACATE_PAY_API_KEY");
    if (!apiKey) throw new Error("ABACATE_PAY_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // Find users with subscriptions expiring within 7 days OR expired up to 1 day ago
    const { data: targetUsers, error } = await supabaseClient
      .from("profiles")
      .select("id, email, name, plan, subscription_current_period_end, is_blocked")
      .neq("plan", "free")
      .not("subscription_current_period_end", "is", null)
      .lt("subscription_current_period_end", sevenDaysFromNow.toISOString())
      .gt("subscription_current_period_end", oneDayAgo.toISOString())
      .eq("admin_assigned_plan", false);

    if (error) {
      logStep("Error querying users", { error: error.message });
      throw error;
    }

    logStep("Found target users", { count: targetUsers?.length || 0 });

    let processed = 0;
    let emailsSent = 0;
    let invoicesCreated = 0;

    for (const user of targetUsers || []) {
      const daysRemaining = daysUntil(user.subscription_current_period_end);
      const currentStage = getCurrentStage(daysRemaining);

      if (!currentStage) {
        logStep("No stage for user, skipping", { userId: user.id, daysRemaining });
        continue;
      }

      // Check if automation is paused for this user
      const { data: existingInvoice } = await supabaseClient
        .from("pix_invoices")
        .select("id, checkout_url, status, renewal_stage, automation_paused, abacate_checkout_id")
        .eq("user_id", user.id)
        .eq("subscription_period_end", user.subscription_current_period_end)
        .order("created_at", { ascending: false })
        .limit(1);

      const invoice = existingInvoice?.[0];

      if (invoice?.automation_paused) {
        logStep("Automation paused for user, skipping", { userId: user.id });
        continue;
      }

      // Check if we already sent email for this stage
      if (invoice?.renewal_stage === currentStage) {
        logStep("Already processed this stage", { userId: user.id, stage: currentStage });
        continue;
      }

      const productId = PRODUCT_IDS[user.plan];
      if (!productId) {
        logStep("No product ID for plan", { userId: user.id, plan: user.plan });
        continue;
      }

      try {
        let checkoutUrl = invoice?.checkout_url;
        let invoiceId = invoice?.id;

        // Create new checkout if no valid one exists
        if (!checkoutUrl || invoice?.status === "expired") {
          const origin = "https://maps-prospect-flow.lovable.app";

          const checkoutRes = await fetch(`${ABACATE_API}/checkouts/create`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
            body: JSON.stringify({
              items: [{ id: productId, quantity: 1 }],
              methods: ["PIX"],
              returnUrl: `${origin}/upgrade`,
              completionUrl: `${origin}/checkout-success?provider=abacate&renewal=true`,
              metadata: {
                userId: user.id,
                planKey: user.plan,
                email: user.email,
                type: "renewal",
                stage: currentStage,
                currentPeriodEnd: user.subscription_current_period_end,
              },
            }),
          });

          const checkoutJson = await checkoutRes.json();
          if (checkoutJson.error || !checkoutRes.ok) {
            logStep("Failed to create checkout", { userId: user.id, error: checkoutJson });
            continue;
          }

          const checkoutData = checkoutJson.data;
          checkoutUrl = checkoutData.url;

          // Create or update pix_invoice
          if (invoiceId) {
            await supabaseClient
              .from("pix_invoices")
              .update({
                checkout_url: checkoutUrl,
                abacate_checkout_id: checkoutData.id,
                status: "pending",
                renewal_stage: currentStage,
                updated_at: new Date().toISOString(),
              })
              .eq("id", invoiceId);
          } else {
            const { data: newInvoice } = await supabaseClient
              .from("pix_invoices")
              .insert({
                user_id: user.id,
                email: user.email,
                user_name: user.name,
                plan: user.plan,
                amount_cents: PLAN_PRICES_CENTS[user.plan] || 0,
                status: "pending",
                checkout_url: checkoutUrl,
                abacate_checkout_id: checkoutData.id,
                renewal_stage: currentStage,
                subscription_period_end: user.subscription_current_period_end,
              })
              .select("id")
              .single();

            invoiceId = newInvoice?.id;
            invoicesCreated++;
          }

          // Also track in checkout_leads
          await supabaseClient.from("checkout_leads").insert({
            user_id: user.id,
            email: user.email,
            name: user.name,
            plan_attempted: PLAN_NAMES[user.plan] || user.plan,
            stripe_session_id: `abacate_renewal_${checkoutData.id}`,
            checkout_started_at: new Date().toISOString(),
            checkout_completed: false,
          });
        } else {
          // Update stage on existing invoice
          await supabaseClient
            .from("pix_invoices")
            .update({
              renewal_stage: currentStage,
              updated_at: new Date().toISOString(),
            })
            .eq("id", invoiceId);
        }

        // Send stage-specific email
        const expiryDate = formatDate(user.subscription_current_period_end);
        const planName = PLAN_NAMES[user.plan] || user.plan;
        const planPrice = PLAN_PRICES[user.plan] || "";

        const { error: emailError } = await supabaseClient.functions.invoke("send-email", {
          body: {
            user_id: user.id,
            email_type: "SUBSCRIPTION_RENEWAL",
            payload: {
              plan_name: planName,
              plan_price: planPrice,
              expiry_date: expiryDate,
              remaining_days: daysRemaining,
              checkout_url: checkoutUrl,
              user_name: user.name || "Cliente",
              stage: currentStage,
            },
            idempotency_key: `renewal_${user.id}_${currentStage}_${user.subscription_current_period_end}`,
          },
        });

        // Update invoice with email status
        if (invoiceId) {
          await supabaseClient
            .from("pix_invoices")
            .update({
              last_email_sent_at: new Date().toISOString(),
              last_email_status: emailError ? "failed" : "sent",
            })
            .eq("id", invoiceId);
        }

        // Track event
        await supabaseClient.from("pix_tracking_events").insert({
          invoice_id: invoiceId,
          user_id: user.id,
          event_type: emailError ? "email_failed" : "email_sent",
          renewal_stage: currentStage,
          metadata: { plan: user.plan, daysRemaining },
        });

        // D+1: Block access if not already blocked
        if (currentStage === "D+1" && !user.is_blocked) {
          await supabaseClient
            .from("profiles")
            .update({ plan: "free", is_blocked: false })
            .eq("id", user.id);

          await supabaseClient.from("pix_tracking_events").insert({
            invoice_id: invoiceId,
            user_id: user.id,
            event_type: "access_suspended",
            renewal_stage: "D+1",
            metadata: { reason: "subscription_expired_no_payment" },
          });

          logStep("Access suspended for user", { userId: user.id });
        }

        logStep("Processed user", {
          userId: user.id,
          stage: currentStage,
          daysRemaining,
          emailSent: !emailError,
        });

        processed++;
        if (!emailError) emailsSent++;
      } catch (e) {
        logStep("Error processing user", { userId: user.id, error: String(e) });

        // Track error
        await supabaseClient.from("pix_tracking_events").insert({
          user_id: user.id,
          event_type: "processing_error",
          renewal_stage: currentStage,
          metadata: { error: String(e) },
        }).catch(() => {});
      }
    }

    return new Response(
      JSON.stringify({
        checked: targetUsers?.length || 0,
        processed,
        emailsSent,
        invoicesCreated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
