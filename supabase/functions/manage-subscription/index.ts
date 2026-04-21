import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_API = "https://api.asaas.com/v3";

const logStep = (step: string, details?: any) => {
  console.log(`[MANAGE-SUB] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

async function dispatchCancellationEmails(
  supabaseClient: any,
  userId: string,
  email: string,
  provider: string,
  activeUntil: string | null,
) {
  try {
    const { data: feedback } = await supabaseClient
      .from("cancellation_feedback")
      .select("cancellation_reason, usage_level, additional_comments")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: prof } = await supabaseClient
      .from("profiles")
      .select("name, plan")
      .eq("id", userId)
      .maybeSingle();

    await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-cancellation-emails`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          userEmail: email,
          userName: prof?.name || null,
          plan: prof?.plan || null,
          activeUntil,
          provider,
          reason: feedback?.cancellation_reason || null,
          usageLevel: feedback?.usage_level || null,
          comments: feedback?.additional_comments || null,
        }),
      },
    );
  } catch (e) {
    console.log("[MANAGE-SUB] Email dispatch failed:", String(e));
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autenticado");

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !authData.user) throw new Error("Token inválido");

    const userId = authData.user.id;
    const userEmail = authData.user.email;
    logStep("User authenticated", { userId, email: userEmail });

    const body = await req.json();
    const { action } = body;

    // Get profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("email, cpf, plan, payment_provider, subscription_current_period_end")
      .eq("id", userId)
      .single();

    if (!profile) throw new Error("Perfil não encontrado");

    const email = profile.email || userEmail;
    const paymentProvider = profile.payment_provider || "";

    // Check if Stripe user
    const isStripe = paymentProvider === "stripe";

    if (isStripe) {
      // For Stripe, return profile info and indicate stripe provider
      // Get cancellation history
      const { data: cancellations } = await supabaseClient
        .from("subscription_cancellations")
        .select("*")
        .eq("user_id", userId)
        .order("cancelled_at", { ascending: false })
        .limit(5);

      if (action === "get-info") {
        // Try to get Stripe portal URL
        let portalUrl = null;
        try {
          const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
          if (stripeKey && email) {
            // Find Stripe customer by email
            const custSearchRes = await fetch(`https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=1`, {
              headers: { "Authorization": `Bearer ${stripeKey}` },
            });
            const custSearchData = await custSearchRes.json();
            const stripeCustomerId = custSearchData.data?.[0]?.id;

            if (stripeCustomerId) {
              const portalRes = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${stripeKey}`,
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: `customer=${stripeCustomerId}&return_url=${encodeURIComponent("https://maps-prospect-flow.lovable.app/minha-assinatura")}`,
              });
              const portalData = await portalRes.json();
              if (portalData.url) portalUrl = portalData.url;
            }
          }
        } catch (e) {
          logStep("Stripe portal error", { error: String(e) });
        }

        return new Response(JSON.stringify({
          profile,
          subscriptions: [],
          payments: [],
          paymentMethod: null,
          asaasCustomerFound: false,
          provider: "stripe",
          stripePortalUrl: portalUrl,
          cancellations: cancellations || [],
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Cancel Stripe subscription directly via API (cancel_at_period_end)
      if (action === "cancel-subscription") {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
        if (!email) throw new Error("Email não encontrado");

        // 1. Find Stripe customer
        const custRes = await fetch(
          `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=1`,
          { headers: { Authorization: `Bearer ${stripeKey}` } },
        );
        const custData = await custRes.json();
        const stripeCustomerId = custData.data?.[0]?.id;
        if (!stripeCustomerId) throw new Error("Cliente Stripe não encontrado");

        // 2. List active subscriptions
        const subsRes = await fetch(
          `https://api.stripe.com/v1/subscriptions?customer=${stripeCustomerId}&status=active&limit=10`,
          { headers: { Authorization: `Bearer ${stripeKey}` } },
        );
        const subsData = await subsRes.json();
        const activeSubs = (subsData.data || []).filter(
          (s: any) => !s.cancel_at_period_end,
        );

        // Also check trialing
        const trialRes = await fetch(
          `https://api.stripe.com/v1/subscriptions?customer=${stripeCustomerId}&status=trialing&limit=10`,
          { headers: { Authorization: `Bearer ${stripeKey}` } },
        );
        const trialData = await trialRes.json();
        const trialingSubs = (trialData.data || []).filter(
          (s: any) => !s.cancel_at_period_end,
        );

        const allSubs = [...activeSubs, ...trialingSubs];
        if (allSubs.length === 0) {
          throw new Error("Nenhuma assinatura Stripe ativa encontrada");
        }

        const targetSub = allSubs[0];
        logStep("Cancelling Stripe subscription", { id: targetSub.id });

        // 3. Cancel at period end (keeps access until paid period ends)
        const cancelRes = await fetch(
          `https://api.stripe.com/v1/subscriptions/${targetSub.id}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${stripeKey}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "cancel_at_period_end=true",
          },
        );
        const cancelData = await cancelRes.json();
        if (cancelData.error) {
          throw new Error(`Stripe: ${cancelData.error.message}`);
        }
        logStep("Stripe subscription scheduled to cancel", {
          id: cancelData.id,
          period_end: cancelData.current_period_end,
        });

        const activeUntil = cancelData.current_period_end
          ? new Date(cancelData.current_period_end * 1000).toISOString()
          : profile.subscription_current_period_end;

        await supabaseClient.from("subscription_cancellations").insert({
          user_id: userId,
          provider: "stripe",
          subscription_id: targetSub.id,
          billing_type: "CREDIT_CARD",
          cancelled_at: new Date().toISOString(),
          active_until: activeUntil,
          notes: `Cancelamento Stripe via portal. Acesso até ${activeUntil}.`,
        });

        await dispatchCancellationEmails(supabaseClient, userId, email, "stripe", activeUntil);

        return new Response(
          JSON.stringify({
            success: true,
            message:
              "Renovação cancelada com sucesso. Seu plano permanece ativo até o final do período pago.",
            cancellationDetails: {
              cancelledAt: new Date().toISOString(),
              activeUntil,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Asaas flow
    const apiKey = Deno.env.get("ASAAS_API_KEY");
    if (!apiKey) throw new Error("ASAAS_API_KEY not configured");

    const cpf = profile.cpf?.replace(/\D/g, "") || "";

    // Find customer on Asaas
    let customerId: string | null = null;

    if (cpf) {
      const findRes = await fetch(`${ASAAS_API}/customers?cpfCnpj=${cpf}`, {
        headers: { "access_token": apiKey, "Accept": "application/json" },
      });
      const findJson = await findRes.json();
      if (findJson.data?.length > 0) customerId = findJson.data[0].id;
    }

    if (!customerId && email) {
      const findRes = await fetch(`${ASAAS_API}/customers?email=${encodeURIComponent(email)}`, {
        headers: { "access_token": apiKey, "Accept": "application/json" },
      });
      const findJson = await findRes.json();
      if (findJson.data?.length > 0) customerId = findJson.data[0].id;
    }

    // Get cancellation history
    const { data: cancellations } = await supabaseClient
      .from("subscription_cancellations")
      .select("*")
      .eq("user_id", userId)
      .order("cancelled_at", { ascending: false })
      .limit(5);

    if (!customerId) {
      logStep("No Asaas customer found", { email, cpf });
      return new Response(JSON.stringify({
        profile,
        subscriptions: [],
        payments: [],
        paymentMethod: null,
        asaasCustomerFound: false,
        provider: "asaas",
        cancellations: cancellations || [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    logStep("Asaas customer found", { customerId });

    if (action === "get-info") {
      // Fetch subscriptions
      const subsRes = await fetch(`${ASAAS_API}/subscriptions?customer=${customerId}`, {
        headers: { "access_token": apiKey, "Accept": "application/json" },
      });
      const subsJson = await subsRes.json();
      const subscriptions = subsJson.data || [];

      // Fetch payments (last 20)
      const paymentsRes = await fetch(`${ASAAS_API}/payments?customer=${customerId}&limit=20&offset=0`, {
        headers: { "access_token": apiKey, "Accept": "application/json" },
      });
      const paymentsJson = await paymentsRes.json();
      const payments = (paymentsJson.data || []).map((p: any) => ({
        id: p.id,
        value: p.value,
        netValue: p.netValue,
        status: p.status,
        billingType: p.billingType,
        dueDate: p.dueDate,
        paymentDate: p.paymentDate,
        description: p.description,
        invoiceUrl: p.invoiceUrl,
        installment: p.installment,
        creditCard: p.creditCard ? {
          creditCardBrand: p.creditCard.creditCardBrand,
          creditCardNumber: p.creditCard.creditCardNumber,
        } : null,
      }));

      // Get credit card info
      let paymentMethod = null;
      const activeCardSub = subscriptions.find((s: any) => s.billingType === "CREDIT_CARD" && s.status === "ACTIVE");
      if (activeCardSub) {
        const subDetailRes = await fetch(`${ASAAS_API}/subscriptions/${activeCardSub.id}`, {
          headers: { "access_token": apiKey, "Accept": "application/json" },
        });
        const subDetail = await subDetailRes.json();
        if (subDetail.creditCard) {
          paymentMethod = {
            type: "CREDIT_CARD",
            brand: subDetail.creditCard.creditCardBrand,
            lastDigits: subDetail.creditCard.creditCardNumber,
          };
        }
      }

      const formattedSubs = subscriptions.map((s: any) => ({
        id: s.id,
        status: s.status,
        billingType: s.billingType,
        cycle: s.cycle,
        value: s.value,
        nextDueDate: s.nextDueDate,
        description: s.description,
        dateCreated: s.dateCreated,
      }));

      logStep("Info fetched", { subs: formattedSubs.length, payments: payments.length });

      return new Response(JSON.stringify({
        profile,
        subscriptions: formattedSubs,
        payments,
        paymentMethod,
        asaasCustomerFound: true,
        provider: "asaas",
        cancellations: cancellations || [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "cancel-subscription") {
      const { subscriptionId } = body;

      let targetSubId = subscriptionId;
      if (!targetSubId) {
        const subsRes = await fetch(`${ASAAS_API}/subscriptions?customer=${customerId}&status=ACTIVE`, {
          headers: { "access_token": apiKey, "Accept": "application/json" },
        });
        const subsJson = await subsRes.json();
        if (subsJson.data?.length > 0) {
          targetSubId = subsJson.data[0].id;
        }
      }

      // If no traditional subscription found, try PIX Automático authorizations
      if (!targetSubId) {
        logStep("No traditional subscription found, checking PIX Automático authorizations");
        const pixAuthRes = await fetch(`${ASAAS_API}/pix/automatic/authorizations?customer=${customerId}&status=ACTIVE`, {
          headers: { "access_token": apiKey, "Accept": "application/json" },
        });
        const pixAuthJson = await pixAuthRes.json();
        
        if (pixAuthJson.data?.length > 0) {
          const pixAuth = pixAuthJson.data[0];
          logStep("Found PIX Automático authorization", { id: pixAuth.id, value: pixAuth.value });

          // Cancel PIX Automático authorization
          const cancelPixRes = await fetch(`${ASAAS_API}/pix/automatic/authorizations/${pixAuth.id}/cancel`, {
            method: "POST",
            headers: { "access_token": apiKey, "Accept": "application/json" },
          });
          const cancelPixJson = await cancelPixRes.json();
          logStep("PIX Automático authorization cancelled", { result: cancelPixJson });

          // Log cancellation
          await supabaseClient.from("subscription_cancellations").insert({
            user_id: userId,
            provider: "asaas",
            subscription_id: pixAuth.id,
            billing_type: "PIX",
            cancelled_at: new Date().toISOString(),
            active_until: profile.subscription_current_period_end,
            notes: `Cancelamento PIX Automático. Valor: R$${pixAuth.value || "N/A"}`,
          });

          await dispatchCancellationEmails(supabaseClient, userId, email, "asaas", profile.subscription_current_period_end);

          return new Response(JSON.stringify({
            success: true,
            message: "Assinatura PIX Automático cancelada com sucesso",
            cancellationDetails: {
              cancelledAt: new Date().toISOString(),
              activeUntil: profile.subscription_current_period_end,
            },
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        throw new Error("Nenhuma assinatura ativa encontrada");
      }

      // Get subscription details before cancelling
      const subDetailRes = await fetch(`${ASAAS_API}/subscriptions/${targetSubId}`, {
        headers: { "access_token": apiKey, "Accept": "application/json" },
      });
      const subDetail = await subDetailRes.json();

      // Cancel subscription
      const cancelRes = await fetch(`${ASAAS_API}/subscriptions/${targetSubId}`, {
        method: "DELETE",
        headers: { "access_token": apiKey, "Accept": "application/json" },
      });
      const cancelJson = await cancelRes.json();
      logStep("Subscription cancelled", { targetSubId, result: cancelJson });

      // Find last paid payment date
      const lastPaidPayment = (await (await fetch(`${ASAAS_API}/payments?customer=${customerId}&status=RECEIVED&limit=1&offset=0`, {
        headers: { "access_token": apiKey, "Accept": "application/json" },
      })).json()).data?.[0];

      // Log cancellation
      await supabaseClient.from("subscription_cancellations").insert({
        user_id: userId,
        provider: "asaas",
        subscription_id: targetSubId,
        billing_type: subDetail.billingType || "CREDIT_CARD",
        cancelled_at: new Date().toISOString(),
        last_charge_date: lastPaidPayment?.paymentDate || lastPaidPayment?.dueDate || null,
        active_until: subDetail.nextDueDate || profile.subscription_current_period_end,
        notes: `Cancelamento da assinatura ${subDetail.description || targetSubId}. Ciclo: ${subDetail.cycle || "N/A"}. Valor: ${subDetail.value || "N/A"}`,
      });

      await dispatchCancellationEmails(
        supabaseClient,
        userId,
        email,
        "asaas",
        subDetail.nextDueDate || profile.subscription_current_period_end,
      );

      return new Response(JSON.stringify({
        success: true,
        message: "Assinatura cancelada com sucesso",
        cancellationDetails: {
          cancelledAt: new Date().toISOString(),
          lastChargeDate: lastPaidPayment?.paymentDate || lastPaidPayment?.dueDate || null,
          activeUntil: subDetail.nextDueDate || profile.subscription_current_period_end,
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error(`Ação inválida: ${action}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
