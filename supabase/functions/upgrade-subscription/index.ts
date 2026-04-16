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
const PLAN_PRICE_MONTHLY: Record<string, number> = { start: 296, growth: 696, scale: 897 };
// Annual TOTAL price (full year, charged up-front for annual subscribers)
const PLAN_PRICE_ANNUAL: Record<string, number> = { start: 2952, growth: 7152, scale: 897 };

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

    const body = await req.json().catch(() => ({}));
    const { newPlan, newBillingPeriod, mode } = body as {
      newPlan: "start" | "growth" | "scale";
      newBillingPeriod: "monthly" | "annual";
      mode?: "preview" | "execute";
    };

    if (!PLAN_TIER[newPlan] || !["monthly", "annual"].includes(newBillingPeriod)) {
      throw new Error("Invalid plan or billing period");
    }
    const isPreview = mode !== "execute";

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
    const currentBilling = profile.billing_period ?? "monthly";

    log("Upgrade requested", {
      from: currentPlan,
      to: newPlan,
      fromBilling: currentBilling,
      toBilling: newBillingPeriod,
      mode: isPreview ? "preview" : "execute",
    });

    // RULE: monthly → annual mid-cycle is blocked
    if (
      currentBilling === "monthly" &&
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

    // Must be an actual upgrade
    if (newTier <= currentTier) {
      throw new Error("Apenas upgrades de plano são permitidos por aqui");
    }

    // Carry remaining opportunities as permanent bonus (never renews)
    const remaining = Math.max((profile.searches_limit ?? 0) - (profile.searches_used ?? 0), 0);

    // ============================================================
    // BRANCH A: ANNUAL → ANNUAL (proportional difference, keep due date)
    // ============================================================
    let annualUpgrade: any = null;
    if (currentBilling === "annual" && newBillingPeriod === "annual" && profile.subscription_current_period_end) {
      const periodEnd = new Date(profile.subscription_current_period_end);
      const now = new Date();
      const msPerDay = 24 * 60 * 60 * 1000;
      const daysRemaining = Math.max(Math.ceil((periodEnd.getTime() - now.getTime()) / msPerDay), 1);
      const yearDays = 365;
      const oldAnnual = PLAN_PRICE_ANNUAL[currentPlan];
      const newAnnual = PLAN_PRICE_ANNUAL[newPlan];
      const oldDaily = oldAnnual / yearDays;
      const newDaily = newAnnual / yearDays;
      const dailyDiff = newDaily - oldDaily;
      const totalDiff = +(dailyDiff * daysRemaining).toFixed(2);
      const monthsRemaining = Math.max(Math.floor(daysRemaining / 30), 1);
      const maxInstallments = Math.min(monthsRemaining, 12);

      annualUpgrade = {
        daysRemaining,
        monthsRemaining,
        oldAnnualPrice: oldAnnual,
        newAnnualPrice: newAnnual,
        oldDailyPrice: +oldDaily.toFixed(2),
        newDailyPrice: +newDaily.toFixed(2),
        dailyDifference: +dailyDiff.toFixed(2),
        totalDifferenceToCharge: totalDiff,
        maxInstallments,
        installmentValue: +(totalDiff / maxInstallments).toFixed(2),
        currentPeriodEnd: profile.subscription_current_period_end,
        keepsCurrentSubscription: true,
      };

      log("Annual→Annual upgrade computed", annualUpgrade);

      if (isPreview) {
        return new Response(
          JSON.stringify({
            success: true,
            preview: true,
            scenario: "annual_to_annual",
            annualUpgrade,
            carriedBonus: remaining,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // ============================================================
    // BRANCH B: MONTHLY → MONTHLY (cancel + new full price, balance as bonus)
    // ============================================================
    const monthlyUpgrade =
      currentBilling === "monthly" && newBillingPeriod === "monthly"
        ? {
            newPriceFull: PLAN_PRICE_MONTHLY[newPlan],
            keepsCurrentSubscription: false,
          }
        : null;

    if (isPreview && !annualUpgrade) {
      return new Response(
        JSON.stringify({
          success: true,
          preview: true,
          scenario: monthlyUpgrade ? "monthly_to_monthly" : "first_paid",
          monthlyUpgrade,
          carriedBonus: remaining,
          newPriceFull: monthlyUpgrade?.newPriceFull ?? PLAN_PRICE_MONTHLY[newPlan],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ============================================================
    // EXECUTE
    // ============================================================
    const { data: upgradeRow } = await supabase
      .from("subscription_upgrades")
      .insert({
        user_id: user.id,
        from_plan: currentPlan,
        to_plan: newPlan,
        from_billing_period: currentBilling,
        to_billing_period: newBillingPeriod,
        remaining_searches_carried: remaining,
        proration_credit_cents: annualUpgrade
          ? Math.round(annualUpgrade.totalDifferenceToCharge * 100)
          : 0,
        old_subscription_id: profile.asaas_subscription_id,
        provider: "asaas",
        status: "pending",
      })
      .select()
      .single();

    // For MONTHLY upgrades: cancel old subscription immediately
    if (!annualUpgrade && profile.asaas_subscription_id) {
      try {
        const cancelRes = await fetch(
          `${ASAAS_API}/subscriptions/${profile.asaas_subscription_id}`,
          { method: "DELETE", headers: { access_token: apiKey, Accept: "application/json" } },
        );
        const cancelJson = await cancelRes.json().catch(() => ({}));
        log("Old subscription cancelled (monthly upgrade)", { id: profile.asaas_subscription_id, response: cancelJson });
      } catch (e) {
        log("Cancel failed (continuing)", { error: String(e) });
      }
    }
    // For ANNUAL→ANNUAL: keep current subscription. The plan limit is upgraded in the
    // profile, and the difference is charged as a one-shot installment plan.

    // Carry remaining opportunities as permanent bonus
    await supabase
      .from("profiles")
      .update({ bonus_searches: (profile.bonus_searches ?? 0) + remaining })
      .eq("id", user.id);

    if (upgradeRow) {
      await supabase
        .from("subscription_upgrades")
        .update({ status: "ready_for_checkout" })
        .eq("id", upgradeRow.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        scenario: annualUpgrade ? "annual_to_annual" : "monthly_to_monthly",
        upgradeId: upgradeRow?.id ?? null,
        carriedBonus: remaining,
        annualUpgrade,
        monthlyUpgrade,
        newPriceFull: annualUpgrade
          ? annualUpgrade.totalDifferenceToCharge
          : PLAN_PRICE_MONTHLY[newPlan],
        message: annualUpgrade
          ? `Upgrade aplicado. Diferença de R$ ${annualUpgrade.totalDifferenceToCharge.toFixed(2)} para os ${annualUpgrade.daysRemaining} dias restantes (parcelável em até ${annualUpgrade.maxInstallments}x). ${remaining} oportunidade(s) preservadas como saldo bônus.`
          : `${remaining} oportunidade(s) do plano anterior foram convertidas em saldo bônus permanente no seu novo plano.`,
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
