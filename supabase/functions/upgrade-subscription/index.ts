import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_API = "https://api.asaas.com/v3";

const log = (step: string, details?: any) => {
  console.log(`[UPGRADE-SUB] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

const PLAN_TIER: Record<string, number> = { free: 0, start: 1, growth: 2, scale: 3 };
const PLAN_LIMIT: Record<string, number> = { start: 1000, growth: 3000, scale: 10000 };
const PLAN_PRICE_MONTHLY: Record<string, number> = { start: 296, growth: 696, scale: 897 };
const PLAN_PRICE_ANNUAL: Record<string, number> = { start: 2952, growth: 5952, scale: 897 };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("ASAAS_API_KEY");
    if (!apiKey) throw new Error("ASAAS_API_KEY missing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Auth required");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData.user;
    if (!user) throw new Error("Invalid user");

    const body = await req.json();
    const { newPlan, newBillingPeriod } = body as {
      newPlan: "start" | "growth" | "scale";
      newBillingPeriod: "monthly" | "annual";
    };

    if (!PLAN_TIER[newPlan] || !["monthly", "annual"].includes(newBillingPeriod)) {
      throw new Error("Invalid plan or billing period");
    }

    // Load current profile
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select(
        "id, email, plan, searches_used, searches_limit, bonus_searches, billing_period, asaas_subscription_id, subscription_current_period_end",
      )
      .eq("id", user.id)
      .single();
    if (profErr || !profile) throw new Error("Profile not found");

    const currentPlan = profile.plan ?? "free";
    const currentTier = PLAN_TIER[currentPlan] ?? 0;
    const newTier = PLAN_TIER[newPlan];

    log("Upgrade requested", {
      from: currentPlan,
      to: newPlan,
      fromBilling: profile.billing_period,
      toBilling: newBillingPeriod,
    });

    // RULE 1: monthly → annual mid-cycle is blocked
    if (
      profile.billing_period === "monthly" &&
      newBillingPeriod === "annual" &&
      profile.subscription_current_period_end &&
      new Date(profile.subscription_current_period_end) > new Date()
    ) {
      return new Response(
        JSON.stringify({
          error: "monthly_to_annual_blocked",
          message:
            "Para mudar para o plano anual, aguarde o vencimento do seu plano mensal atual. Isso garante que você não pague duplicado.",
          currentPeriodEnd: profile.subscription_current_period_end,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // RULE 2: must be an upgrade (higher tier OR monthly→same-tier-annual handled above)
    if (newTier <= currentTier && !(newTier === currentTier && profile.billing_period === newBillingPeriod)) {
      throw new Error("Apenas upgrades de plano são permitidos por aqui");
    }

    // Compute remaining opportunities (carry as bonus — NO financial proration)
    // The "value" of unused days is preserved as bonus opportunities, not as discount.
    const remaining = Math.max((profile.searches_limit ?? 0) - (profile.searches_used ?? 0), 0);
    log("Carrying remaining opportunities as permanent bonus", { remaining });

    // Log upgrade attempt
    const { data: upgradeRow } = await supabase
      .from("subscription_upgrades")
      .insert({
        user_id: user.id,
        from_plan: currentPlan,
        to_plan: newPlan,
        from_billing_period: profile.billing_period,
        to_billing_period: newBillingPeriod,
        remaining_searches_carried: remaining,
        proration_credit_cents: prorationCents,
        old_subscription_id: profile.asaas_subscription_id,
        provider: "asaas",
        status: "pending",
      })
      .select()
      .single();

    // === Step 1: cancel old Asaas subscription (if any) ===
    if (profile.asaas_subscription_id) {
      try {
        const cancelRes = await fetch(
          `${ASAAS_API}/subscriptions/${profile.asaas_subscription_id}`,
          {
            method: "DELETE",
            headers: { access_token: apiKey, Accept: "application/json" },
          },
        );
        const cancelJson = await cancelRes.json().catch(() => ({}));
        log("Old subscription cancelled", { id: profile.asaas_subscription_id, response: cancelJson });
      } catch (e) {
        log("Cancel failed (continuing)", { error: String(e) });
      }
    }

    // === Step 2: compute new price minus proration ===
    const newPriceFull = newBillingPeriod === "annual"
      ? PLAN_PRICE_ANNUAL[newPlan]
      : PLAN_PRICE_MONTHLY[newPlan];
    const prorationReais = prorationCents / 100;
    const firstChargeValue = Math.max(newPriceFull - prorationReais, 1); // never below R$1
    log("New plan pricing", { newPriceFull, prorationReais, firstChargeValue });

    // === Step 3: register the new opportunities balance immediately ===
    // The new subscription will be created by the regular checkout flow.
    // Here we only carry the bonus + clear searches_used so the user can use the carried opportunities + the new plan limit when activated.
    await supabase
      .from("profiles")
      .update({
        bonus_searches: (profile.bonus_searches ?? 0) + remaining,
      })
      .eq("id", user.id);

    // Update upgrade log
    if (upgradeRow) {
      await supabase
        .from("subscription_upgrades")
        .update({ status: "ready_for_checkout" })
        .eq("id", upgradeRow.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        upgradeId: upgradeRow?.id ?? null,
        carriedBonus: remaining,
        prorationCents,
        firstChargeValue,
        newPriceFull,
        message: `Saldo de ${remaining} oportunidade(s) preservado. Crédito proporcional de R$ ${prorationReais.toFixed(2)} aplicado na próxima fatura.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", { msg });
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
