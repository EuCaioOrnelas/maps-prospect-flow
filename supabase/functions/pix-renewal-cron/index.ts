import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

serve(async (req) => {
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

    // Find users whose subscription expires in the next 7 days
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const { data: expiringUsers, error } = await supabaseClient
      .from("profiles")
      .select("id, email, name, plan, subscription_current_period_end")
      .neq("plan", "free")
      .not("subscription_current_period_end", "is", null)
      .lt("subscription_current_period_end", sevenDaysFromNow.toISOString())
      .gt("subscription_current_period_end", now.toISOString())
      .eq("admin_assigned_plan", false);

    if (error) {
      logStep("Error querying expiring users", { error: error.message });
      throw error;
    }

    logStep("Found expiring subscriptions", { count: expiringUsers?.length || 0 });

    let renewalsSent = 0;

    for (const user of expiringUsers || []) {
      // Check if we already sent a renewal for this period
      const { data: existingRenewal } = await supabaseClient
        .from("checkout_leads")
        .select("id")
        .eq("user_id", user.id)
        .eq("checkout_completed", false)
        .like("stripe_session_id", "abacate_renewal_%")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (existingRenewal && existingRenewal.length > 0) {
        logStep("Renewal already pending for user, skipping", { userId: user.id });
        continue;
      }

      const productId = PRODUCT_IDS[user.plan];
      if (!productId) {
        logStep("No product ID for plan, skipping", { userId: user.id, plan: user.plan });
        continue;
      }

      try {
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
              currentPeriodEnd: user.subscription_current_period_end,
            },
          }),
        });

        const checkoutJson = await checkoutRes.json();
        if (checkoutJson.error || !checkoutRes.ok) {
          logStep("Failed to create renewal checkout", { userId: user.id, error: checkoutJson });
          continue;
        }

        const checkoutData = checkoutJson.data;
        const checkoutUrl = checkoutData.url;

        // Track the renewal checkout
        await supabaseClient.from("checkout_leads").insert({
          user_id: user.id,
          email: user.email,
          name: user.name,
          plan_attempted: PLAN_NAMES[user.plan] || user.plan,
          stripe_session_id: `abacate_renewal_${checkoutData.id}`,
          checkout_started_at: new Date().toISOString(),
          checkout_completed: false,
        });

        // Send renewal email
        const remainingDays = daysUntil(user.subscription_current_period_end);
        const expiryDate = formatDate(user.subscription_current_period_end);
        const planName = PLAN_NAMES[user.plan] || user.plan;
        const planPrice = PLAN_PRICES[user.plan] || "";

        await supabaseClient.functions.invoke("send-email", {
          body: {
            user_id: user.id,
            email_type: "SUBSCRIPTION_RENEWAL",
            payload: {
              plan_name: planName,
              plan_price: planPrice,
              expiry_date: expiryDate,
              remaining_days: remainingDays,
              checkout_url: checkoutUrl,
              user_name: user.name || "Cliente",
            },
            idempotency_key: `renewal_${user.id}_${user.subscription_current_period_end}`,
          },
        });

        logStep("Renewal checkout + email sent", {
          userId: user.id,
          email: user.email,
          plan: user.plan,
          checkoutUrl,
          expiresAt: user.subscription_current_period_end,
        });

        renewalsSent++;
      } catch (e) {
        logStep("Error processing renewal for user", { userId: user.id, error: String(e) });
      }
    }

    return new Response(
      JSON.stringify({
        checked: expiringUsers?.length || 0,
        renewalsSent,
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
