import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[ASAAS-WEBHOOK] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

// ============ PARTNER PROGRAM HELPERS ============
async function registerPartnerSale(
  supabase: any,
  input: {
    userId: string;
    amountCents: number;
    plan: string | null;
    asaasPaymentId: string;
    subscriptionRef?: string | null;
    paidAt?: string;
  }
): Promise<{ ok: boolean; reason?: string; saleId?: string; isRecurring?: boolean }> {
  try {
    if (!input.userId || !input.amountCents || input.amountCents <= 0) {
      return { ok: false, reason: 'invalid_input' };
    }

    const { data: lead } = await supabase
      .from('partner_leads')
      .select('id, partner_id')
      .eq('user_id', input.userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lead?.partner_id) return { ok: false, reason: 'not_attributed' };

    // Idempotência por payment id
    const { data: existing } = await supabase
      .from('partner_sales')
      .select('id')
      .eq('external_reference', input.asaasPaymentId)
      .maybeSingle();
    if (existing?.id) return { ok: true, reason: 'duplicate', saleId: existing.id };

    // Detecta recorrência: já existe venda anterior para este customer (com este subscription/auth)?
    let isRecurring = false;
    const { data: prior } = await supabase
      .from('partner_sales')
      .select('id')
      .eq('customer_user_id', input.userId)
      .eq('partner_id', lead.partner_id)
      .limit(1);
    if (prior && prior.length > 0) isRecurring = true;

    const { data: sale, error: saleErr } = await supabase
      .from('partner_sales')
      .insert({
        partner_id: lead.partner_id,
        partner_lead_id: lead.id,
        customer_user_id: input.userId,
        plan: input.plan,
        amount_cents: input.amountCents,
        payment_provider: 'asaas',
        payment_method: 'asaas_pix',
        external_reference: input.asaasPaymentId,
        is_recurring: isRecurring,
        paid_at: input.paidAt || new Date().toISOString(),
      })
      .select('id')
      .single();

    if (saleErr) {
      if ((saleErr as any)?.code === '23505') {
        const { data: dup } = await supabase
          .from('partner_sales')
          .select('id')
          .eq('external_reference', input.asaasPaymentId)
          .maybeSingle();
        return { ok: true, reason: 'duplicate', saleId: dup?.id, isRecurring };
      }
      console.error('[registerPartnerSale-asaas] insert error:', saleErr);
      return { ok: false, reason: saleErr.message };
    }

    await supabase
      .from('partner_leads')
      .update({
        is_paid: true,
        paid_at: input.paidAt || new Date().toISOString(),
        current_plan: input.plan ?? null,
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', lead.id)
      .eq('is_paid', false);

    return { ok: true, saleId: sale.id, isRecurring };
  } catch (e) {
    console.error('[registerPartnerSale-asaas] exception:', e);
    return { ok: false, reason: e instanceof Error ? e.message : 'unknown' };
  }
}

async function cancelPartnerCommissionsForRefund(
  supabase: any,
  customerUserId: string | null,
  asaasPaymentId: string | null,
  reason: string,
) {
  try {
    if (asaasPaymentId) {
      const { data: refRes } = await supabase.rpc('mark_partner_sale_refunded', {
        p_external_reference: asaasPaymentId,
        p_kind: 'refund',
      });
      logStep('Partner sale refunded (asaas)', refRes);
    }
    if (customerUserId) {
      const { data: cancelRes } = await supabase.rpc('cancel_partner_commissions_for_customer', {
        p_customer_user_id: customerUserId,
        p_reason: reason,
        p_only_recurring: false,
      });
      logStep('Partner commissions cancelled (asaas)', cancelRes);
    }
  } catch (e) {
    logStep('Failed to cancel partner commissions (asaas)', { error: String(e) });
  }
}

function getPlanSearchesLimit(planKey: string): number {
  const limits: Record<string, number> = { start: 1000, growth: 3000, scale: 10000 };
  return limits[planKey] || 1000;
}

function extractPlanFromDescription(description: string): string | null {
  const lower = description?.toLowerCase() || "";
  if (lower.includes("start")) return "start";
  if (lower.includes("growth")) return "growth";
  if (lower.includes("scale")) return "scale";
  return null;
}

function extractPlanFromValue(value: number): string | null {
  // Support old and new prices
  if (value === 196 || value === 197 || value === 296) return "start"; // 197 legado
  if (value === 497 || value === 696) return "growth";
  if (value === 897 || value === 1496) return "scale";
  return null;
}

function planNameToKey(planName: string): string | null {
  const lower = planName?.toLowerCase() || "";
  if (lower.includes("start")) return "start";
  if (lower.includes("growth")) return "growth";
  if (lower.includes("scale")) return "scale";
  return null;
}

async function getPlanFromCheckoutLead(supabaseClient: any, checkoutIdPrefix: string): Promise<string | null> {
  const { data } = await supabaseClient
    .from("checkout_leads")
    .select("plan_attempted")
    .eq("stripe_session_id", checkoutIdPrefix)
    .limit(1);
  
  if (data && data.length > 0) {
    const key = planNameToKey(data[0].plan_attempted);
    logStep("Plan found via checkout_leads", { plan_attempted: data[0].plan_attempted, planKey: key });
    return key;
  }
  return null;
}

/**
 * Localiza um checkout_lead pelo identificador de conciliação Asaas.
 * Ordem de prioridade:
 *  1. asaas_conciliation_id (fonte primária — txid do QR Code, independente do pagador)
 *  2. asaas_authorization_id (fallback legado)
 *  3. stripe_session_id (compat com registros antigos)
 */
async function findCheckoutLead(
  supabaseClient: any,
  ids: { conciliationId?: string | null; authorizationId?: string | null; subscriptionId?: string | null }
): Promise<any | null> {
  if (ids.conciliationId) {
    const { data } = await supabaseClient
      .from("checkout_leads")
      .select("id, user_id, email, phone, tax_id, plan_attempted, asaas_conciliation_id, asaas_authorization_id, asaas_payment_id, checkout_completed, stripe_session_id")
      .eq("asaas_conciliation_id", ids.conciliationId)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }
  if (ids.authorizationId) {
    const { data } = await supabaseClient
      .from("checkout_leads")
      .select("id, user_id, email, phone, tax_id, plan_attempted, asaas_conciliation_id, asaas_authorization_id, asaas_payment_id, checkout_completed, stripe_session_id")
      .or(`asaas_authorization_id.eq.${ids.authorizationId},stripe_session_id.eq.asaas_pixauto_${ids.authorizationId}`)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }
  if (ids.subscriptionId) {
    const { data } = await supabaseClient
      .from("checkout_leads")
      .select("id, user_id, email, phone, tax_id, plan_attempted, asaas_conciliation_id, asaas_authorization_id, asaas_payment_id, checkout_completed, stripe_session_id")
      .eq("stripe_session_id", `asaas_sub_${ids.subscriptionId}`)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

async function findProfile(supabaseClient: any, externalReference: string | null, checkoutIdPrefix: string | null) {
  let profile: any = null;

  // Try as UUID
  if (externalReference && externalReference.match(/^[0-9a-f-]{36}$/i)) {
    const { data } = await supabaseClient
      .from("profiles")
      .select("id, plan, email, subscription_current_period_end")
      .eq("id", externalReference)
      .maybeSingle();
    if (data) return data;
  }

  // Try as email
  if (externalReference) {
    const { data } = await supabaseClient
      .from("profiles")
      .select("id, plan, email, subscription_current_period_end")
      .eq("email", externalReference)
      .maybeSingle();
    if (data) return data;
  }

  // Try via checkout_leads
  if (checkoutIdPrefix) {
    const { data: leads } = await supabaseClient
      .from("checkout_leads")
      .select("user_id, email")
      .eq("stripe_session_id", checkoutIdPrefix)
      .limit(1);

    if (leads && leads.length > 0) {
      const lead = leads[0];
      if (lead.user_id) {
        const { data } = await supabaseClient
          .from("profiles")
          .select("id, plan, email, subscription_current_period_end")
          .eq("id", lead.user_id)
          .maybeSingle();
        if (data) return data;
      }
      if (lead.email) {
        const { data } = await supabaseClient
          .from("profiles")
          .select("id, plan, email, subscription_current_period_end")
          .eq("email", lead.email)
          .maybeSingle();
        if (data) return data;
      }
    }
  }

  return null;
}

async function findProfileForLead(supabaseClient: any, lead: any): Promise<any | null> {
  if (lead?.user_id) {
    const { data } = await supabaseClient
      .from("profiles")
      .select("id, plan, email, subscription_current_period_end")
      .eq("id", lead.user_id)
      .maybeSingle();
    if (data) return data;
  }
  if (lead?.email) {
    const { data } = await supabaseClient
      .from("profiles")
      .select("id, plan, email, subscription_current_period_end")
      .eq("email", lead.email)
      .maybeSingle();
    if (data) return data;
  }
  return null;
}


async function activatePlan(
  supabaseClient: any,
  profile: any,
  planKey: string,
  checkoutIdPrefix: string | null,
  paymentValue?: number,
  meta?: { subscriptionId?: string | null; customerId?: string | null; billingPeriod?: string | null },
) {
  const searchesLimit = getPlanSearchesLimit(planKey);
  const currentPeriodEnd = profile.subscription_current_period_end
    ? new Date(profile.subscription_current_period_end)
    : new Date();

  // Determine billing period (annual vs monthly) from value if not provided
  const inferredAnnual = paymentValue && paymentValue >= 2000;
  const billingPeriod = meta?.billingPeriod || (inferredAnnual ? "annual" : "monthly");
  const cycleDays = billingPeriod === "annual" ? 365 : 30;

  let periodEnd: Date;
  if (profile.plan !== "free" && currentPeriodEnd > new Date()) {
    periodEnd = new Date(currentPeriodEnd);
    periodEnd.setDate(periodEnd.getDate() + cycleDays);
    logStep("Early renewal, extending", { currentEnd: currentPeriodEnd.toISOString(), newEnd: periodEnd.toISOString() });
  } else {
    periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + cycleDays);
  }

  // Calculate price in cents from payment value (grandfathering support)
  const defaultPrices: Record<string, number> = { start: 19600, growth: 69600, scale: 149600 };
  const priceCents = paymentValue ? Math.round(paymentValue * 100) : (defaultPrices[planKey] || 0);

  // Build update payload — preserve bonus_searches (carried from previous plan)
  const updatePayload: Record<string, any> = {
    plan: planKey,
    searches_limit: searchesLimit,
    searches_used: 0,
    subscription_current_period_end: periodEnd.toISOString(),
    last_searches_reset: new Date().toISOString(),
    payment_provider: "asaas",
    subscription_price_cents: priceCents,
    billing_period: billingPeriod,
    updated_at: new Date().toISOString(),
  };
  if (meta?.subscriptionId) updatePayload.asaas_subscription_id = meta.subscriptionId;
  if (meta?.customerId) updatePayload.asaas_customer_id = meta.customerId;

  const { error: updateError } = await supabaseClient
    .from("profiles")
    .update(updatePayload)
    .eq("id", profile.id);

  if (updateError) {
    throw new Error(`Profile update failed: ${updateError.message}`);
  }

  logStep("Profile updated", { userId: profile.id, plan: planKey });

  // Mark checkout lead as completed and copy phone/cpf
  if (checkoutIdPrefix) {
    await supabaseClient
      .from("checkout_leads")
      .update({
        checkout_completed: true,
        checkout_completed_at: new Date().toISOString(),
      })
      .eq("stripe_session_id", checkoutIdPrefix)
      .eq("checkout_completed", false);

    const { data: checkoutLeads } = await supabaseClient
      .from("checkout_leads")
      .select("phone, tax_id")
      .eq("stripe_session_id", checkoutIdPrefix)
      .limit(1);

    if (checkoutLeads && checkoutLeads.length > 0) {
      const lead = checkoutLeads[0];
      const profileUpdate: Record<string, string> = {};
      if (lead.phone) profileUpdate.phone = lead.phone;
      if (lead.tax_id) profileUpdate.cpf = lead.tax_id;
      if (Object.keys(profileUpdate).length > 0) {
        await supabaseClient.from("profiles").update(profileUpdate).eq("id", profile.id);
      }
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
    const receivedToken = req.headers.get("asaas-access-token");

    if (webhookToken && webhookToken !== "" && receivedToken !== webhookToken) {
      logStep("Invalid webhook token");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const event = body.event;

    logStep("Webhook received", { event });

    // ============ PIX AUTOMÁTICO: AUTHORIZATION ACTIVATED ============
    if (event === "PIX_AUTOMATIC_RECURRING_AUTHORIZATION_ACTIVATED") {
      const authorization = body.authorization;
      if (!authorization) {
        logStep("No authorization data");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const authorizationId = authorization.id;
      logStep("PIX Automático authorization activated", { authorizationId, value: authorization.value });

      const checkoutIdPrefix = `asaas_pixauto_${authorizationId}`;
      let planKey = extractPlanFromValue(authorization.value);

      // Fallback: buscar plano via checkout_leads se valor não bater (ex: teste com R$5)
      if (!planKey) {
        logStep("Value doesn't match standard prices, checking checkout_leads", { value: authorization.value });
        planKey = await getPlanFromCheckoutLead(supabaseClient, checkoutIdPrefix);
      }

      if (!planKey) {
        logStep("Could not determine plan from any source", { value: authorization.value });
      }

      // Find profile via checkout_leads
      const profile = await findProfile(supabaseClient, null, checkoutIdPrefix);

      if (profile && planKey) {
        // Autorização não é pagamento. Persiste somente os identificadores;
        // plano, vigência e créditos são concedidos em PAYMENT_RECEIVED/CONFIRMED.
        await supabaseClient.from("profiles").update({
          asaas_subscription_id: authorizationId,
          asaas_customer_id: authorization.customer || null,
          payment_provider: "asaas",
          updated_at: new Date().toISOString(),
        }).eq("id", profile.id);
        return new Response(
          JSON.stringify({ received: true, action: "pix_auto_authorized_waiting_payment", plan: planKey }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      logStep("No profile found for PIX Automático authorization", { authorizationId });
      return new Response(
        JSON.stringify({ received: true, warning: "no_profile_for_pix_auto" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ PIX AUTOMÁTICO: AUTHORIZATION CANCELLED ============
    if (event === "PIX_AUTOMATIC_RECURRING_AUTHORIZATION_CANCELLED") {
      const authorization = body.authorization;
      logStep("PIX Automático authorization cancelled", { authorizationId: authorization?.id });
      // Grace period — the subscription expiry cron handles cancellation
      return new Response(
        JSON.stringify({ received: true, action: "pix_auto_cancelled_noted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ PAYMENT CONFIRMED (PIX QR Code + recurring charges) ============
    const payment = body.payment;
    if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
      if (!payment) {
        logStep("No payment data");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const paymentId: string = payment.id;
      const externalReference = payment.externalReference || null;
      const description = payment.description || "";
      const value = payment.value;
      const subscriptionId = payment.subscription || null;
      const pixAutoAuthId = payment.pixAutomaticAuthorizationId || null;
      // FONTE PRIMÁRIA DE VERDADE: txid do QR Code, independe do CPF/CNPJ do pagador.
      const conciliationId: string | null =
        payment.pixQrCodeId ||
        payment.conciliationIdentifier ||
        payment.pixTransaction?.qrCodeId ||
        null;

      logStep("CONCILIATION-TRACE payment webhook received", {
        event,
        paymentId,
        conciliationId,
        pixAutoAuthId,
        subscriptionId,
        externalReference,
        value,
        payerCpfCnpj: payment.customerCpfCnpj || null,
      });

      // --- Idempotência: se já processamos esse payment.id, ignora reentrega. ---
      const { data: alreadyProcessed } = await supabaseClient
        .from("checkout_leads")
        .select("id, checkout_completed")
        .eq("asaas_payment_id", paymentId)
        .maybeSingle();
      if (alreadyProcessed?.checkout_completed) {
        logStep("CONCILIATION-TRACE duplicate payment webhook ignored", { paymentId });
        return new Response(
          JSON.stringify({ received: true, action: "duplicate_ignored", paymentId }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // --- Localiza checkout_lead via conciliation → authorization → subscription ---
      const lead = await findCheckoutLead(supabaseClient, {
        conciliationId,
        authorizationId: pixAutoAuthId,
        subscriptionId,
      });

      const matchedVia = lead
        ? (lead.asaas_conciliation_id === conciliationId && conciliationId
            ? "conciliation"
            : lead.asaas_authorization_id === pixAutoAuthId && pixAutoAuthId
              ? "authorization"
              : "legacy_session_id")
        : "none";

      logStep("CONCILIATION-TRACE lead lookup", {
        paymentId,
        conciliationId,
        pixAutoAuthId,
        matchedVia,
        checkoutLeadId: lead?.id || null,
      });

      // Determina plano
      let planKey = extractPlanFromDescription(description) || extractPlanFromValue(value);
      if (!planKey && lead?.plan_attempted) {
        planKey = planNameToKey(lead.plan_attempted);
      }
      const checkoutPrefix = lead?.stripe_session_id
        || (pixAutoAuthId ? `asaas_pixauto_${pixAutoAuthId}` : subscriptionId ? `asaas_sub_${subscriptionId}` : null);

      if (!planKey) {
        logStep("CONCILIATION-TRACE unknown plan", { paymentId, description, value });
        return new Response(JSON.stringify({ received: true, warning: "unknown_plan", paymentId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Localiza profile — SEMPRE via checkout_lead (nunca via dados do pagador).
      // externalReference é fallback legado apenas.
      let profile = lead ? await findProfileForLead(supabaseClient, lead) : null;
      if (!profile) {
        profile = await findProfile(supabaseClient, externalReference, checkoutPrefix);
      }

      if (!profile) {
        logStep("CONCILIATION-TRACE no profile matched — payment orphan", {
          paymentId,
          conciliationId,
          pixAutoAuthId,
          externalReference,
          checkoutLeadId: lead?.id || null,
        });
        return new Response(JSON.stringify({ received: true, warning: "no_profile", paymentId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await activatePlan(supabaseClient, profile, planKey, checkoutPrefix, value, {
        subscriptionId: subscriptionId || pixAutoAuthId || null,
        customerId: payment.customer || null,
        billingPeriod: value >= 2000 ? "annual" : "monthly",
      });

      // Persiste payment.id no lead para idempotência + auditoria futura.
      if (lead?.id) {
        await supabaseClient
          .from("checkout_leads")
          .update({ asaas_payment_id: paymentId })
          .eq("id", lead.id);
      }

      logStep("CONCILIATION-TRACE activation success", {
        paymentId,
        conciliationId,
        pixAutoAuthId,
        matchedVia,
        userId: profile.id,
        planKey,
      });

      // [PARTNERS] Registra venda
      try {
        const partnerResult = await registerPartnerSale(supabaseClient, {
          userId: profile.id,
          amountCents: Math.round(value * 100),
          plan: planKey,
          asaasPaymentId: paymentId,
          subscriptionRef: subscriptionId || pixAutoAuthId || null,
          paidAt: new Date().toISOString(),
        });
        logStep("Partner sale check (asaas payment)", partnerResult);
      } catch (e) {
        logStep("Partner sale registration failed (asaas)", { error: String(e) });
      }

      return new Response(
        JSON.stringify({ received: true, plan: planKey, userId: profile.id, action: "activated", matchedVia, paymentId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    // ============ PAYMENT OVERDUE ============
    if (event === "PAYMENT_OVERDUE") {
      logStep("Payment overdue", { paymentId: payment?.id });
      return new Response(
        JSON.stringify({ received: true, action: "overdue_noted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ PAYMENT REFUNDED / DELETED ============
    if (event === "PAYMENT_REFUNDED" || event === "PAYMENT_DELETED") {
      const externalReference = payment?.externalReference;
      const paymentId = payment?.id || null;
      logStep("Payment refunded/deleted", { event, externalReference, paymentId });

      let profileId: string | null = null;
      if (externalReference) {
        const profile = await findProfile(supabaseClient, externalReference, null);
        if (profile) {
          profileId = profile.id;
          await supabaseClient.from("profiles").update({
            plan: "free",
            searches_limit: 10,
            searches_used: 0,
            subscription_current_period_end: null,
            updated_at: new Date().toISOString(),
          }).eq("id", profile.id);
          logStep("User downgraded to free", { userId: profile.id });
        }
      }

      // [PARTNERS] Marca venda como estornada + cancela comissões pendentes/disponíveis (dentro da janela de 30 dias)
      await cancelPartnerCommissionsForRefund(
        supabaseClient,
        profileId,
        paymentId,
        event === "PAYMENT_REFUNDED" ? "payment_refunded" : "payment_deleted",
      );

      return new Response(
        JSON.stringify({ received: true, action: "refunded_downgraded" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============ PIX AUTOMÁTICO PAYMENT INSTRUCTION EVENTS ============
    if (event?.startsWith("PIX_AUTOMATIC_RECURRING_PAYMENT_INSTRUCTION_")) {
      logStep("PIX Automático payment instruction event", { event, data: body.paymentInstruction });
      return new Response(
        JSON.stringify({ received: true, action: "pix_instruction_logged" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Other events
    logStep("Unhandled event", { event });
    return new Response(
      JSON.stringify({ received: true }),
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
