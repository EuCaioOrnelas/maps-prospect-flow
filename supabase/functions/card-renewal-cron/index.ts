import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Stripe (provider atual) e Asaas (legado) cobram cartão automaticamente na renovação.
// Este cron envia apenas e-mails informativos para o usuário verificar o cartão.

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CARD-RENEWAL] ${step}${detailsStr}`);
};

const PLAN_NAMES: Record<string, string> = {
  start: "Wiize Start",
  growth: "Wiize Growth",
  scale: "Wiize Scale",
};

const PLAN_PRICES_CENTS: Record<string, number> = {
  start: 29700,
  growth: 69600,
  scale: 89700,
};

const PLAN_ANNUAL_TOTAL_CENTS: Record<string, number> = {
  start: 295200,
  growth: 715200,
  scale: 920400,
};

function formatBRL(cents: number): string {
  return `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
}

function formatPlanPrice(totalCents: number, billingPeriod: string | null, installments?: number | null): string {
  if (!totalCents) return "—";
  if (billingPeriod === "annual") {
    const inst = installments && installments > 1 ? installments : 12;
    const perInstallment = Math.round(totalCents / inst);
    return `${formatBRL(totalCents)} em ${inst}× ${formatBRL(perInstallment)}`;
  }
  return `${formatBRL(totalCents)}/mês`;
}

async function fetchInstallmentsFromAsaas(subscriptionId: string): Promise<number | null> {
  const apiKey = Deno.env.get("ASAAS_API_KEY");
  if (!apiKey || !subscriptionId) return null;
  try {
    const res = await fetch(`https://api.asaas.com/v3/subscriptions/${subscriptionId}`, {
      headers: { access_token: apiKey, "Content-Type": "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.maxPayments || data?.installmentCount || data?.creditCard?.installmentCount || null;
  } catch {
    return null;
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  const diffMs = target.getTime() - now.getTime();
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" }) : null;

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Inclui Stripe (provider atual) E Asaas (legado).
    const { data: targetUsers, error } = await supabase
      .from("profiles")
      .select(
        "id, email, name, plan, billing_period, subscription_current_period_end, subscription_price_cents, payment_provider, asaas_subscription_id",
      )
      .neq("plan", "free")
      .not("subscription_current_period_end", "is", null)
      .lt("subscription_current_period_end", sevenDaysFromNow.toISOString())
      .gt("subscription_current_period_end", twoDaysAgo.toISOString())
      .eq("admin_assigned_plan", false)
      .in("payment_provider", ["stripe", "asaas"]);

    if (error) throw error;

    logStep("Found card users", { count: targetUsers?.length || 0 });

    let processed = 0;
    let emailsSent = 0;

    for (let i = 0; i < (targetUsers || []).length; i++) {
      const user = targetUsers![i];
      const daysRemaining = daysUntil(user.subscription_current_period_end);
      const stage = getCurrentStage(daysRemaining);
      if (!stage) continue;

      const idempotencyKey = `card_renewal_${user.id}_${stage}_${user.subscription_current_period_end}`;
      const { data: existingLog } = await supabase
        .from("email_logs")
        .select("id")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existingLog) {
        logStep("Already sent", { userId: user.id, stage });
        continue;
      }

      const planName = PLAN_NAMES[user.plan] || user.plan;
      const isAnnual = user.billing_period === "annual";
      const fallbackCents = isAnnual
        ? PLAN_ANNUAL_TOTAL_CENTS[user.plan] || 0
        : PLAN_PRICES_CENTS[user.plan] || 0;
      const userPriceCents = user.subscription_price_cents || fallbackCents;

      // Stripe assinaturas anuais são cobradas em parcela única (1×) por padrão.
      // Asaas (legado) suporta parcelamento real — buscamos o número de parcelas.
      let installments: number | null = null;
      if (isAnnual) {
        if (user.payment_provider === "asaas" && user.asaas_subscription_id) {
          installments = (await fetchInstallmentsFromAsaas(user.asaas_subscription_id)) || 1;
        } else {
          installments = 1; // Stripe = 1x à vista por padrão
        }
      }

      const planPrice = formatPlanPrice(userPriceCents, user.billing_period, installments);
      const expiryDate = formatDate(user.subscription_current_period_end);
      const checkoutUrl = "https://wiize.com.br/minha-assinatura";

      try {
        const { error: emailError } = await supabase.functions.invoke("send-email", {
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
              stage,
              payment_method: "card",
              provider: user.payment_provider,
            },
            idempotency_key: idempotencyKey,
          },
        });

        processed++;
        if (!emailError) emailsSent++;
        logStep("Processed", { userId: user.id, stage, provider: user.payment_provider, sent: !emailError });

        if (i < targetUsers!.length - 1) {
          await new Promise((r) => setTimeout(r, 650));
        }
      } catch (e) {
        logStep("Error", { userId: user.id, error: String(e) });
      }
    }

    return new Response(
      JSON.stringify({ checked: targetUsers?.length || 0, processed, emailsSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
