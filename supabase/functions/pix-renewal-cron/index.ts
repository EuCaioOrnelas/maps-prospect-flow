import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Asaas handles recurring billing automatically, but this cron sends email reminders

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PIX-RENEWAL] ${step}${detailsStr}`);
};

// Legacy product IDs kept for backward compatibility with existing pix_invoices
const PRODUCT_IDS: Record<string, string> = {
  start: "prod_bBzpH4uBuq4dE1uFb45SMXam",
  growth: "prod_66shDJxarcQZcNrtQnDQ15BF",
  scale: "prod_gf051bgXLGqKaJ0rzmWpsaqE",
};

const PLAN_NAMES: Record<string, string> = {
  start: "Wiize Start",
  growth: "Wiize Growth",
  scale: "Wiize Scale",
};

// New prices for NEW subscribers (used as fallback)
const PLAN_PRICES: Record<string, string> = {
  start: "R$ 296",
  growth: "R$ 696",
  scale: "R$ 897",
};

const PLAN_PRICES_CENTS: Record<string, number> = {
  start: 29600,
  growth: 69600,
  scale: 89700,
};

// Helper to format cents to BRL string
function formatPrice(cents: number): string {
  return `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  const diffMs = target.getTime() - now.getTime();
  // Use floor for negative (past) and ceil for positive (future) to get correct day count
  if (diffMs < 0) return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function getCurrentStage(daysRemaining: number): string | null {
  if (daysRemaining <= -1) return "D+1";
  if (daysRemaining === 0) return "D0";
  if (daysRemaining === 1) return "D-1";
  if (daysRemaining <= 3) return "D-3";
  if (daysRemaining <= 5) return "D-5";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // No external API key needed — Asaas handles billing automatically
    // This cron only sends email reminders

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

    const { data: targetUsers, error } = await supabaseClient
      .from("profiles")
      .select("id, email, name, plan, subscription_current_period_end, is_blocked, subscription_price_cents")
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
    let skippedPaid = 0;

    for (let i = 0; i < (targetUsers || []).length; i++) {
      const user = targetUsers![i];
      const daysRemaining = daysUntil(user.subscription_current_period_end);
      const currentStage = getCurrentStage(daysRemaining);

      if (!currentStage) {
        logStep("No stage for user, skipping", { userId: user.id, daysRemaining });
        continue;
      }

      // Check if there's already a PAID invoice for this period — skip all emails
      const { data: existingInvoice } = await supabaseClient
        .from("pix_invoices")
        .select("id, checkout_url, status, renewal_stage, automation_paused, abacate_checkout_id")
        .eq("user_id", user.id)
        .eq("subscription_period_end", user.subscription_current_period_end)
        .order("created_at", { ascending: false })
        .limit(1);

      const invoice = existingInvoice?.[0];

      // ✅ CRITICAL: If invoice is already paid, skip entirely — no more emails
      if (invoice?.status === "paid") {
        logStep("Invoice already paid, skipping all emails", { userId: user.id });
        skippedPaid++;
        continue;
      }

      if (invoice?.automation_paused) {
        logStep("Automation paused for user, skipping", { userId: user.id });
        continue;
      }

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

        const origin = "https://wiize.com.br";
        const planName = PLAN_NAMES[user.plan] || user.plan;
        // Use user's locked-in price (grandfathering), fallback to current prices
        const userPriceCents = user.subscription_price_cents || PLAN_PRICES_CENTS[user.plan] || 0;
        const planPrice = formatPrice(userPriceCents);
        const priceNumber = String(Math.round(userPriceCents / 100));

        // Build checkout URL pointing to our own /checkout-pix page
        const ownCheckoutUrl = `${origin}/checkout-pix?plan=${user.plan}&planName=${encodeURIComponent(planName)}&planPrice=${priceNumber}&email=${encodeURIComponent(user.email || "")}&name=${encodeURIComponent(user.name || "")}&renewal=true`;

        if (!checkoutUrl || invoice?.status === "expired") {
          checkoutUrl = ownCheckoutUrl;

          if (invoiceId) {
            await supabaseClient
              .from("pix_invoices")
              .update({
                checkout_url: checkoutUrl,
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
                amount_cents: userPriceCents,
                status: "pending",
                checkout_url: checkoutUrl,
                renewal_stage: currentStage,
                subscription_period_end: user.subscription_current_period_end,
              })
              .select("id")
              .single();

            invoiceId = newInvoice?.id;
            invoicesCreated++;
          }
        } else {
          // Update to own checkout URL if needed
          if (!checkoutUrl.includes("/checkout-pix")) {
            checkoutUrl = ownCheckoutUrl;
          }

          await supabaseClient
            .from("pix_invoices")
            .update({
              checkout_url: checkoutUrl,
              renewal_stage: currentStage,
              updated_at: new Date().toISOString(),
            })
            .eq("id", invoiceId);
        }

        // Send stage-specific email
        const expiryDate = formatDate(user.subscription_current_period_end);

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

        if (invoiceId) {
          await supabaseClient
            .from("pix_invoices")
            .update({
              last_email_sent_at: new Date().toISOString(),
              last_email_status: emailError ? "failed" : "sent",
            })
            .eq("id", invoiceId);
        }

        await supabaseClient.from("pix_tracking_events").insert({
          invoice_id: invoiceId,
          user_id: user.id,
          event_type: emailError ? "email_failed" : "email_sent",
          renewal_stage: currentStage,
          metadata: { plan: user.plan, daysRemaining },
        });

        // D+1: Downgrade to free if not paid
        if (currentStage === "D+1" && !user.is_blocked) {
          await supabaseClient
            .from("profiles")
            .update({
              plan: "free",
              is_blocked: false,
              searches_limit: 10,
              searches_used: 0,
              subscription_current_period_end: null,
            })
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

        // Add delay between users to avoid rate limits (650ms)
        if (i < (targetUsers!.length - 1)) {
          await new Promise(resolve => setTimeout(resolve, 650));
        }
      } catch (e) {
        logStep("Error processing user", { userId: user.id, error: String(e) });

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
        skippedPaid,
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
