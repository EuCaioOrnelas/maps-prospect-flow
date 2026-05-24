import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function sendPartnerEmail(
  supabase: any,
  partnerId: string,
  type: string,
  extraData: Record<string, unknown> = {}
): Promise<void> {
  try {
    const { data: partner } = await supabase
      .from("partners")
      .select("email, full_name, referral_code, user_id")
      .eq("id", partnerId)
      .maybeSingle();

    if (!partner?.email) {
      console.warn(`[sendPartnerEmail] partner ${partnerId} has no email`);
      return;
    }

    const firstName = (partner.full_name || "").split(" ")[0] || "Parceiro";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const resp = await fetch(`${supabaseUrl}/functions/v1/send-partner-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        type,
        to: partner.email,
        data: {
          first_name: firstName,
          referral_code: partner.referral_code,
          user_id: partner.user_id,
          ...extraData,
        },
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error(`[sendPartnerEmail] ${type} failed:`, resp.status, txt);
    }
  } catch (e) {
    console.error("[sendPartnerEmail] exception:", e);
  }
}

interface RegisterPartnerSaleInput {
  userId: string;
  email?: string | null;
  amountCents: number;
  plan?: string | null;
  billingPeriod?: 'monthly' | 'yearly' | null;
  paymentMethod: 'stripe' | 'asaas_pix' | 'manual';
  stripeInvoiceId?: string | null;
  stripeSubscriptionId?: string | null;
  asaasPaymentId?: string | null;
  paidAt?: string;
  isRecurring?: boolean;
}

async function registerPartnerSale(
  supabase: any,
  input: RegisterPartnerSaleInput
): Promise<{ ok: boolean; reason?: string; saleId?: string }> {
  try {
    if (!input.userId || !input.amountCents || input.amountCents <= 0) {
      return { ok: false, reason: 'invalid_input' };
    }

    const { data: lead } = await supabase
      .from('partner_leads')
      .select('id, partner_id, click_id, referral_link_id')
      .eq('user_id', input.userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lead?.partner_id) {
      return { ok: false, reason: 'not_attributed' };
    }

    if (input.stripeInvoiceId) {
      const { data: existing } = await supabase
        .from('partner_sales')
        .select('id')
        .eq('external_reference', input.stripeInvoiceId)
        .maybeSingle();
      if (existing?.id) return { ok: true, reason: 'duplicate', saleId: existing.id };
    }

    if (input.asaasPaymentId) {
      const { data: existing } = await supabase
        .from('partner_sales')
        .select('id')
        .eq('external_reference', input.asaasPaymentId)
        .maybeSingle();
      if (existing?.id) return { ok: true, reason: 'duplicate', saleId: existing.id };
    }

    const { data: sale, error: saleErr } = await supabase
      .from('partner_sales')
      .insert({
        partner_id: lead.partner_id,
        partner_lead_id: lead.id,
        customer_user_id: input.userId,
        plan: input.plan,
        amount_cents: input.amountCents,
        payment_provider: input.paymentMethod === 'stripe' ? 'stripe' : input.paymentMethod === 'asaas_pix' ? 'asaas' : 'manual',
        payment_method: input.paymentMethod,
        external_reference: input.stripeInvoiceId || input.asaasPaymentId || input.stripeSubscriptionId || null,
        is_recurring: input.isRecurring ?? false,
        paid_at: input.paidAt || new Date().toISOString(),
      })
      .select('id')
      .single();

    if (saleErr) {
      console.error('[registerPartnerSale] insert error:', saleErr);
      return { ok: false, reason: saleErr.message };
    }

    const { data: leadUpdate } = await supabase
      .from('partner_leads')
      .update({
        is_paid: true,
        paid_at: input.paidAt || new Date().toISOString(),
        current_plan: input.plan ?? null,
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', lead.id)
      .eq('is_paid', false)
      .select('id')
      .maybeSingle();

    if (leadUpdate?.id) {
      const { data: commission } = await supabase
        .from('partner_commissions')
        .select('commission_amount_cents, commission_percent')
        .eq('partner_sale_id', sale.id)
        .maybeSingle();

      sendPartnerEmail(supabase, lead.partner_id, 'partner_first_sale', {
        amount_cents: input.amountCents,
        commission_cents: commission?.commission_amount_cents || 0,
        commission_percent: commission?.commission_percent || 0,
        release_days: 30,
      }).catch(() => {});
    }

    return { ok: true, saleId: sale.id };
  } catch (e) {
    console.error('[registerPartnerSale] exception:', e);
    return { ok: false, reason: e instanceof Error ? e.message : 'unknown' };
  }
}

// --- Evolution API credentials helper (inlined) ---
interface EvolutionCredentials { url: string; apiKey: string; tier: 'free' | 'paid'; }
const PAID_PLANS = ['start', 'growth', 'scale'];
function getEvolutionCredentials(tierOrPlan: string | null | undefined): EvolutionCredentials {
  const normalized = (tierOrPlan || 'free').toLowerCase();
  if (normalized === 'paid' || PAID_PLANS.includes(normalized)) {
    const url = Deno.env.get('EVOLUTION_API_URL_PAID'), apiKey = Deno.env.get('EVOLUTION_API_KEY_PAID');
    if (url && apiKey) return { url, apiKey, tier: 'paid' };
  }
  const url = Deno.env.get('EVOLUTION_API_URL'), apiKey = Deno.env.get('EVOLUTION_API_KEY');
  if (!url || !apiKey) throw new Error('Evolution API credentials not configured');
  return { url, apiKey, tier: 'free' };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// ============== ORDER BUMPS — webhook helpers ==============

const BUMP_PRICE_TO_DEF: Record<string, {
  id: "numbers" | "contacts" | "opportunities";
  column: "extra_numbers" | "extra_contacts_packs" | "extra_opportunities_packs";
}> = {
  "price_1TYdiXK8CM0R6xMMqnhxGM1V": { id: "numbers",       column: "extra_numbers" },
  "price_1TYdkPK8CM0R6xMMXHTfihdw": { id: "contacts",      column: "extra_contacts_packs" },
  "price_1TYdknK8CM0R6xMM9TXjGFf5": { id: "opportunities", column: "extra_opportunities_packs" },
};

async function findUserBySubscription(
  stripe: Stripe,
  supabase: any,
  subscriptionId: string,
): Promise<{ userId: string; email: string | null } | null> {
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const customer = await stripe.customers.retrieve(sub.customer as string);
    if (!customer || (customer as any).deleted) return null;
    const email = (customer as any).email;
    if (!email) return null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (!profile) return null;
    return { userId: profile.id, email };
  } catch (e) {
    console.log(`[STRIPE-WEBHOOK] findUserBySubscription failed`, e);
    return null;
  }
}

/**
 * Quando o pagamento da invoice falha, removemos TODOS os items de bump da
 * subscription (plano continua intacto) e zeramos extra_* do profile.
 */
async function revokeBumpsOnFailure(
  stripe: Stripe,
  supabase: any,
  subscriptionId: string | null,
): Promise<void> {
  if (!subscriptionId) return;
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const itemsToRemove = sub.items.data.filter((it) => BUMP_PRICE_TO_DEF[it.price.id]);
    if (itemsToRemove.length === 0) {
      console.log(`[STRIPE-WEBHOOK] No bump items to remove on sub ${subscriptionId}`);
      return;
    }

    // Remove items na Stripe (sem proration — usuário não pagou)
    await stripe.subscriptions.update(subscriptionId, {
      items: itemsToRemove.map((it) => ({ id: it.id, deleted: true })),
      proration_behavior: "none",
    });
    console.log(`[STRIPE-WEBHOOK] Removed ${itemsToRemove.length} bump item(s) from sub ${subscriptionId}`);

    // Zera no profile + audita
    const found = await findUserBySubscription(stripe, supabase, subscriptionId);
    if (!found) return;
    const zeroes: Record<string, number> = {
      extra_numbers: 0,
      extra_contacts_packs: 0,
      extra_opportunities_packs: 0,
    };
    await supabase.from("profiles").update(zeroes).eq("id", found.userId);

    for (const it of itemsToRemove) {
      const def = BUMP_PRICE_TO_DEF[it.price.id];
      if (!def) continue;
      await supabase.from("order_bump_events").insert({
        user_id: found.userId,
        bump_id: def.id,
        delta: -(it.quantity || 0),
        new_quantity: 0,
        source: "webhook_revoke",
        stripe_subscription_id: subscriptionId,
        metadata: { reason: "payment_failed" },
      });
    }
  } catch (e) {
    console.log(`[STRIPE-WEBHOOK] revokeBumpsOnFailure error`, e);
  }
}

/**
 * Reconcilia extra_* no profile a partir dos items atuais da subscription.
 * Chamado em invoice.payment_succeeded para garantir consistência.
 */
async function reconcileBumpsFromSubscription(
  stripe: Stripe,
  supabase: any,
  subscriptionId: string | null,
  source: "webhook_grant" | "webhook_revoke",
): Promise<void> {
  if (!subscriptionId) return;
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const found = await findUserBySubscription(stripe, supabase, subscriptionId);
    if (!found) return;

    const desired: Record<string, number> = {
      extra_numbers: 0,
      extra_contacts_packs: 0,
      extra_opportunities_packs: 0,
    };
    for (const it of sub.items.data) {
      const def = BUMP_PRICE_TO_DEF[it.price.id];
      if (def) desired[def.column] = it.quantity || 0;
    }

    // Lê estado atual para auditar deltas
    const { data: prof } = await supabase
      .from("profiles")
      .select("extra_numbers, extra_contacts_packs, extra_opportunities_packs")
      .eq("id", found.userId)
      .maybeSingle();

    await supabase.from("profiles").update(desired).eq("id", found.userId);

    if (prof) {
      const deltas: Array<{ id: string; column: keyof typeof desired }> = [
        { id: "numbers", column: "extra_numbers" },
        { id: "contacts", column: "extra_contacts_packs" },
        { id: "opportunities", column: "extra_opportunities_packs" },
      ];
      for (const d of deltas) {
        const prev = (prof as any)[d.column] || 0;
        const next = desired[d.column];
        if (prev !== next) {
          await supabase.from("order_bump_events").insert({
            user_id: found.userId,
            bump_id: d.id,
            delta: next - prev,
            new_quantity: next,
            source,
            stripe_subscription_id: subscriptionId,
            metadata: { reason: "invoice.payment_succeeded reconcile" },
          });
        }
      }
    }
  } catch (e) {
    console.log(`[STRIPE-WEBHOOK] reconcileBumpsFromSubscription error`, e);
  }
}

// Map price IDs to plan names - includes all historical price IDs
const PRICE_TO_PLAN: Record<string, string> = {
  // Current prices (2026-05)
  "price_1TYl5KK8CM0R6xMMeHUhKt7s": "start",   // R$196/month (atual)
  "price_1TYl6iK8CM0R6xMMd23UBpIz": "growth",  // R$696/month (atual)
  // Previous prices - mantidos para reconhecer assinaturas legadas
  "price_1TLZi1K8CM0R6xMMDOg3MSTp": "start",   // R$296/month (legado)
  "price_1TLZkSK8CM0R6xMMwr1Ke1IX": "start",   // R$246/month (annual)
  "price_1TLZlSK8CM0R6xMMFtvROCby": "growth",  // R$696/month (legado)
  "price_1TLZn8K8CM0R6xMMaEz5JuVW": "growth",  // R$596/month (annual)
  "price_1SlylcK8CM0R6xMMyHRWAd8G": "scale",   // R$897/month
  // Legacy prices - must be mapped for existing subscriptions
  "price_1SlykAK8CM0R6xMMOCM684rz": "start",   // R$197/month (legacy)
  "price_1SlykkK8CM0R6xMMZu7WJesV": "growth",  // R$497/month (legacy)
  "price_1SXrv7K8CM0R6xMMo4FlSVIk": "start",   // R$67/year (legacy)
  "price_1SXruNK8CM0R6xMMVD8Gksi4": "start",   // R$9.90/month (legacy)
  "price_1SZj5bK8CM0R6xMMFocrHWkj": "start",   // R$29.90/month (legacy)
  "price_1Sc1ehK8CM0R6xMMg1Z0kqCk": "start",   // R$39.90/month (legacy)
  "price_1SZj4hK8CM0R6xMMSZjjoEkN": "growth",  // R$249.90/year (legacy)
  "price_1SkEsEK8CM0R6xMM9Y1ip21w": "start",   // R$97/month (legacy)
  "price_1SkEsoK8CM0R6xMMF72J3hAi": "growth",  // R$497/month (legacy)
};

// Map plan names to opportunity limits (each lead = 1 opportunity)
const PLAN_LIMITS: Record<string, number> = {
  "free": 10,
  "start": 1000,
  "growth": 3000,
  "scale": 10000,
};

// Plan hierarchy for upgrade/downgrade detection
const PLAN_ORDER: Record<string, number> = {
  "free": 0,
  "start": 1,
  "growth": 2,
  "scale": 3,
};

// Map plan names to prices (for tracking revenue)
const PLAN_PRICES: Record<string, number> = {
  "free": 0,
  "start": 97,
  "growth": 247,
  "scale": 497,
};

// Determine if this is an upgrade, downgrade, or same plan
const getTransitionType = (
  currentPlan: string,
  newPlan: string
): "upgrade" | "downgrade" | "same" => {
  const currentOrder = PLAN_ORDER[currentPlan] ?? 0;
  const newOrder = PLAN_ORDER[newPlan] ?? 0;
  
  if (newOrder > currentOrder) return "upgrade";
  if (newOrder < currentOrder) return "downgrade";
  return "same";
};

// Calculate new searches limit based on transition type
const calculateSearchesForTransition = (
  currentSearchesUsed: number,
  currentSearchesLimit: number,
  currentPlan: string,
  newPlan: string,
  newPlanBaseLimit: number
): { newLimit: number; carryOver: number; transitionType: string } => {
  const transitionType = getTransitionType(currentPlan, newPlan);
  
  if (transitionType === "upgrade") {
    // UPGRADE: Add remaining searches from current plan to new plan
    const remainingSearches = Math.max(0, currentSearchesLimit - currentSearchesUsed);
    const carryOver = remainingSearches;
    const newLimit = newPlanBaseLimit + carryOver;
    return { newLimit, carryOver, transitionType };
  } else if (transitionType === "downgrade") {
    // DOWNGRADE: Lose all remaining searches, get only new plan's base limit
    // User starts fresh with new plan
    return { newLimit: newPlanBaseLimit, carryOver: 0, transitionType };
  } else {
    // SAME PLAN (renewal): Keep current limit if higher than base (due to previous carry-over)
    const newLimit = Math.max(currentSearchesLimit, newPlanBaseLimit);
    return { newLimit, carryOver: 0, transitionType };
  }
};

// Log subscription event for debugging
const logSubscriptionEvent = async (
  supabaseClient: any,
  eventType: string,
  eventSource: string,
  email: string,
  userId: string | null,
  previousPlan: string | null,
  newPlan: string,
  previousSearchesLimit: number | null,
  newSearchesLimit: number,
  carryOver: number = 0,
  stripeSubscriptionId: string | null = null,
  stripeCustomerId: string | null = null,
  stripeEventId: string | null = null,
  metadata: any = {}
) => {
  try {
    await supabaseClient.from('subscription_events').insert({
      user_id: userId,
      email,
      event_type: eventType,
      event_source: eventSource,
      previous_plan: previousPlan,
      new_plan: newPlan,
      previous_searches_limit: previousSearchesLimit,
      new_searches_limit: newSearchesLimit,
      carry_over: carryOver,
      stripe_subscription_id: stripeSubscriptionId,
      stripe_customer_id: stripeCustomerId,
      stripe_event_id: stripeEventId,
      metadata
    });
    logStep("Subscription event logged", { eventType, email, newPlan });
  } catch (error) {
    logStep("Error logging subscription event", { error: String(error) });
  }
};

// Cleanup free tier instances when user upgrades to paid
const cleanupFreeInstances = async (
  supabaseClient: any,
  userId: string,
  email: string
) => {
  try {
    logStep("Starting free tier cleanup for upgraded user", { userId, email });

    // 1. Get all user's whatsapp numbers with their instance names
    const { data: numbers } = await supabaseClient
      .from('whatsapp_numbers')
      .select('id, instance_name, api_tier')
      .eq('user_id', userId);

    if (!numbers || numbers.length === 0) {
      logStep("No WhatsApp numbers to cleanup");
      return;
    }

    // 2. Delete instances from the FREE Evolution API
    const freeCredentials = getEvolutionCredentials('free');
    
    for (const number of numbers) {
      if (number.instance_name) {
        try {
          // Logout first
          await fetch(`${freeCredentials.url}/instance/logout/${number.instance_name}`, {
            method: 'DELETE',
            headers: { 'apikey': freeCredentials.apiKey },
          });
          // Then delete
          await fetch(`${freeCredentials.url}/instance/delete/${number.instance_name}`, {
            method: 'DELETE',
            headers: { 'apikey': freeCredentials.apiKey },
          });
          logStep("Deleted free instance", { instanceName: number.instance_name });
        } catch (e) {
          logStep("Error deleting free instance (non-fatal)", { instanceName: number.instance_name, error: String(e) });
        }
      }
    }

    // 3. Clean up DB: delete dependent records first
    const numberIds = numbers.map((n: any) => n.id);

    await supabaseClient.from('campaign_daily_reservations')
      .delete().in('whatsapp_number_id', numberIds);
    await supabaseClient.from('warming_search_assignments')
      .delete().eq('user_id', userId);
    await supabaseClient.from('warming_sessions')
      .delete().eq('user_id', userId);
    
    // Unlink references
    await supabaseClient.from('whatsapp_campaigns')
      .update({ whatsapp_number_id: null }).eq('user_id', userId);
    await supabaseClient.from('ai_agents')
      .update({ whatsapp_number_id: null }).eq('user_id', userId);
    await supabaseClient.from('campaign_incidents')
      .update({ whatsapp_number_id: null }).eq('user_id', userId);
    await supabaseClient.from('ignored_contacts')
      .update({ whatsapp_number_id: null }).eq('user_id', userId);
    await supabaseClient.from('leads')
      .update({ whatsapp_number_id: null }).eq('user_id', userId);

    // 4. Delete all whatsapp numbers
    await supabaseClient.from('whatsapp_numbers')
      .delete().eq('user_id', userId);

    logStep("Free tier cleanup completed", { userId, numbersDeleted: numbers.length });
  } catch (error) {
    logStep("Error during free tier cleanup (non-fatal)", { error: String(error) });
  }
};
const trackPurchase = async (
  supabaseClient: any,
  userId: string,
  plan: string,
  amount: number
) => {
  try {
    // Get user's landing source
    const { data: source } = await supabaseClient
      .from('user_landing_source')
      .select('landing_page_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (source?.landing_page_id) {
      await supabaseClient.from('landing_page_events').insert({
        landing_page_id: source.landing_page_id,
        event_type: 'purchase',
        user_id: userId,
        metadata: { plan, amount },
      });
      logStep("Purchase tracked for landing page analytics", { userId, plan, amount });
    }
  } catch (error) {
    logStep("Error tracking purchase", { error: String(error) });
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      try {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
        logStep("Webhook signature verified");
      } catch (err: any) {
        logStep("Webhook signature verification failed", { error: err.message });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    } else {
      // Parse event without verification (for testing)
      event = JSON.parse(body);
      logStep("Webhook parsed without signature verification (testing mode)");
    }

    logStep("Event received", { type: event.type, id: event.id });

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { 
          sessionId: session.id, 
          customerEmail: session.customer_email,
          customerId: session.customer 
        });

        // Get customer email
        let customerEmail = session.customer_email;
        if (!customerEmail && session.customer) {
          const customer = await stripe.customers.retrieve(session.customer as string);
          if (customer && !customer.deleted) {
            customerEmail = customer.email;
          }
        }

        if (customerEmail) {
          // Find user by email and update their subscription
          const { data: profile, error: profileError } = await supabaseClient
            .from("profiles")
            .select("id, searches_used, searches_limit, plan")
            .eq("email", customerEmail)
            .maybeSingle();

          if (profile) {
            logStep("Found user profile", { 
              userId: profile.id, 
              email: customerEmail,
              currentSearchesUsed: profile.searches_used,
              currentSearchesLimit: profile.searches_limit,
              currentPlan: profile.plan
            });
            
            // Get subscription details from the session
            if (session.subscription) {
              const newSubscription = await stripe.subscriptions.retrieve(session.subscription as string);
              const priceItem = newSubscription.items.data[0]?.price;
              const priceId = priceItem?.id;
              const stripePriceCents = priceItem?.unit_amount || 0;
              const plan = PRICE_TO_PLAN[priceId] || "free";
              const basePlanLimit = PLAN_LIMITS[plan] || PLAN_LIMITS["free"];

              // Calculate period end from Stripe subscription (CRITICAL for check-subscription)
              const subscriptionEndIso = newSubscription.current_period_end
                ? new Date(newSubscription.current_period_end * 1000).toISOString()
                : null;

              // Calculate new limit based on transition type (upgrade/downgrade/same)
              const { newLimit, carryOver, transitionType } = calculateSearchesForTransition(
                profile.searches_used,
                profile.searches_limit,
                profile.plan,
                plan,
                basePlanLimit
              );

              logStep("Calculating new searches limit", {
                basePlanLimit,
                carryOver,
                newLimit,
                plan,
                transitionType,
                previousPlan: profile.plan
              });

              // On downgrade: reset searches_used to 0
              // On upgrade with carry-over: keep current usage
              // On upgrade without carry-over or same: reset to 0
              const newSearchesUsed = transitionType === "upgrade" && carryOver > 0 ? profile.searches_used : 0;

              const { error: updateError } = await supabaseClient
                .from("profiles")
                .update({ 
                  plan: plan,
                  searches_limit: newLimit,
                  searches_used: newSearchesUsed,
                  payment_provider: "stripe",
                  subscription_price_cents: stripePriceCents,
                  subscription_current_period_end: subscriptionEndIso,
                })
                .eq("id", profile.id);

              if (updateError) {
                logStep("Error updating profile", { error: updateError.message });
              } else {
                logStep("Profile updated successfully", { 
                  plan, 
                  searchesLimit: newLimit,
                  carryOver,
                  searchesUsed: carryOver > 0 ? profile.searches_used : 0
                });

                // Log subscription event for debugging
                await logSubscriptionEvent(
                  supabaseClient,
                  "checkout_completed",
                  "stripe-webhook",
                  customerEmail,
                  profile.id,
                  profile.plan,
                  plan,
                  profile.searches_limit,
                  newLimit,
                  carryOver,
                  session.subscription as string,
                  session.customer as string,
                  event.id,
                  {
                    priceId,
                    price_id: priceId,
                    currency: session.currency ?? newSubscription.items.data[0]?.price.currency ?? null,
                    amount_paid: typeof session.amount_total === 'number' ? session.amount_total / 100 : null,
                    stripe_event_created: event.created,
                    stripe_event_type: event.type,
                    basePlanLimit,
                    searchesUsed: profile.searches_used,
                  }
                );

                // Track purchase for landing page analytics
                const amount = PLAN_PRICES[plan] || 0;
                await trackPurchase(supabaseClient, profile.id, plan, amount);

                // Mark checkout lead as completed
                try {
                  await supabaseClient
                    .from('checkout_leads')
                    .update({ 
                      checkout_completed: true, 
                      checkout_completed_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    })
                    .eq('stripe_session_id', session.id);
                  logStep("Checkout lead marked as completed");
                } catch (e) {
                  logStep("Failed to mark checkout lead", { error: String(e) });
                }

                // If upgrading from free to paid, cleanup all free tier instances
                if (transitionType === "upgrade" && (profile.plan === "free" || !profile.plan)) {
                  logStep("Triggering free tier cleanup on upgrade", { 
                    previousPlan: profile.plan, 
                    newPlan: plan 
                  });
                  await cleanupFreeInstances(supabaseClient, profile.id, customerEmail);
                }

                // Partner program: register sale if user came from a referral
                // IMPORTANT: amountCents uses session.amount_total which is THE FINAL AMOUNT CHARGED
                // (subtotal - discounts/coupons + tax). This guarantees commission is calculated
                // on the REAL value the customer paid, not on the list price.
                try {
                  const finalAmountCents = typeof session.amount_total === 'number' ? session.amount_total : 0;
                  const subtotalCents = typeof session.amount_subtotal === 'number' ? session.amount_subtotal : finalAmountCents;
                  const discountCents = Math.max(0, subtotalCents - finalAmountCents);
                  const totalDetails = (session as any).total_details;
                  const couponDiscount = totalDetails?.amount_discount || discountCents;

                  logStep("Partner sale: amount calculation", {
                    subtotalCents,
                    finalAmountCents,
                    discountApplied: couponDiscount,
                    note: 'commission_will_be_calculated_on_finalAmountCents',
                  });

                  const partnerResult = await registerPartnerSale(supabaseClient, {
                    userId: profile.id,
                    email: customerEmail,
                    amountCents: finalAmountCents,
                    plan,
                    billingPeriod: (priceId === 'price_1TLZkSK8CM0R6xMMwr1Ke1IX' || priceId === 'price_1TLZn8K8CM0R6xMMaEz5JuVW') ? 'yearly' : 'monthly',
                    paymentMethod: 'stripe',
                    stripeInvoiceId: typeof session.invoice === 'string' ? session.invoice : null,
                    stripeSubscriptionId: session.subscription as string,
                    paidAt: new Date().toISOString(),
                    isRecurring: false,
                  });
                  logStep("Partner sale check (checkout)", { ...partnerResult, finalAmountCents, discountCents: couponDiscount });
                } catch (e) {
                  logStep("Partner sale registration failed (checkout)", { error: String(e) });
                }
              }

              // Cancel any OTHER active subscriptions for this customer (upgrade scenario)
              // This ensures user only has one active subscription at a time
              if (session.customer) {
                const allSubs = await stripe.subscriptions.list({
                  customer: session.customer as string,
                  status: "active",
                  limit: 10,
                });

                for (const sub of allSubs.data) {
                  // Skip the subscription we just created
                  if (sub.id === session.subscription) continue;

                  logStep("Canceling old subscription after upgrade", {
                    oldSubscriptionId: sub.id,
                    newSubscriptionId: session.subscription,
                  });

                  await stripe.subscriptions.cancel(sub.id, {
                    prorate: true,
                  });
                }
              }
            }
          } else {
            logStep("No user found for email - subscription will be linked when user creates account", { email: customerEmail });
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", { 
          subscriptionId: subscription.id, 
          status: subscription.status,
          customerId: subscription.customer 
        });

        // Get customer email
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        if (customer && !customer.deleted && customer.email) {
          const { data: profile } = await supabaseClient
            .from("profiles")
            .select("id, searches_used, searches_limit, plan")
            .eq("email", customer.email)
            .maybeSingle();

          if (profile) {
            if (subscription.status === "active") {
              const priceItem2 = subscription.items.data[0]?.price;
              const priceId = priceItem2?.id;
              const subPriceCents = priceItem2?.unit_amount || 0;
              const plan = PRICE_TO_PLAN[priceId] || "free";
              const basePlanLimit = PLAN_LIMITS[plan] || PLAN_LIMITS["free"];

              // Calculate period end from Stripe (CRITICAL for check-subscription)
              const subscriptionEndIso = subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : null;

              // Calculate new limit based on transition type
              const { newLimit, carryOver, transitionType } = calculateSearchesForTransition(
                profile.searches_used,
                profile.searches_limit,
                profile.plan,
                plan,
                basePlanLimit
              );

              // On downgrade: reset searches_used to 0
              const newSearchesUsed = transitionType === "upgrade" && carryOver > 0 ? profile.searches_used : 0;

              await supabaseClient
                .from("profiles")
                .update({ 
                  plan: plan,
                  searches_limit: newLimit,
                  searches_used: newSearchesUsed,
                  payment_provider: "stripe",
                  subscription_price_cents: subPriceCents,
                  subscription_current_period_end: subscriptionEndIso,
                })
                .eq("id", profile.id);

              logStep("Profile updated for active subscription", { 
                plan, 
                searchesLimit: newLimit,
                carryOver,
                transitionType,
                previousPlan: profile.plan
              });

              // Safety net: reconcilia bumps (extra_*) sempre que a subscription
              // for atualizada. Cobre o caso de compra de add-on via Stripe que
              // não passou pelo edge function update-subscription-bumps.
              try {
                await reconcileBumpsFromSubscription(stripe, supabaseClient, subscription.id, "webhook_grant");
              } catch (e) {
                logStep("reconcileBumpsFromSubscription failed (subscription.updated)", { error: String(e) });
              }

              // Log subscription event with transition type
              const eventType = transitionType === "downgrade" 
                ? "subscription_downgrade" 
                : transitionType === "upgrade" 
                  ? "subscription_upgrade" 
                  : "subscription_renewed";

              await logSubscriptionEvent(
                supabaseClient,
                eventType,
                "stripe-webhook",
                customer.email,
                profile.id,
                profile.plan,
                plan,
                profile.searches_limit,
                newLimit,
                carryOver,
                subscription.id,
                subscription.customer as string,
                event.id,
                {
                  priceId,
                  price_id: priceId,
                  currency: subscription.items.data[0]?.price.currency ?? null,
                  stripe_event_created: event.created,
                  stripe_event_type: event.type,
                  basePlanLimit,
                  status: subscription.status,
                  transitionType,
                }
              );
            } else if (["canceled", "unpaid", "past_due"].includes(subscription.status)) {
              await supabaseClient
                .from("profiles")
                .update({ 
                  plan: "free",
                  searches_limit: PLAN_LIMITS["free"],
                  searches_used: 0  // Reset usage on downgrade
                })
                .eq("id", profile.id);

              logStep("Profile downgraded due to subscription status", { 
                status: subscription.status,
                previousPlan: profile.plan,
                previousLimit: profile.searches_limit,
                previousUsed: profile.searches_used,
                newLimit: PLAN_LIMITS["free"]
              });

              // Log to subscription_cancellations for churn tracking
              if (subscription.status === "canceled") {
                try {
                  await supabaseClient.from("subscription_cancellations").insert({
                    user_id: profile.id,
                    provider: "stripe",
                    subscription_id: subscription.id,
                    billing_type: "CREDIT_CARD",
                    cancelled_at: new Date().toISOString(),
                    active_until: subscription.current_period_end 
                      ? new Date(subscription.current_period_end * 1000).toISOString() 
                      : null,
                    notes: `Assinatura Stripe status: ${subscription.status}. Plano anterior: ${profile.plan}. Email: ${customer.email}`,
                  });
                  logStep("Cancellation logged to subscription_cancellations (status update)");
                } catch (e) {
                  logStep("Error logging cancellation", { error: String(e) });
                }
              }

              // Log downgrade event
              await logSubscriptionEvent(
                supabaseClient,
                `subscription_${subscription.status}`,
                "stripe-webhook",
                customer.email,
                profile.id,
                profile.plan,
                "free",
                profile.searches_limit,
                PLAN_LIMITS["free"],
                0,
                subscription.id,
                subscription.customer as string,
                event.id,
                { 
                  status: subscription.status,
                  stripe_event_created: event.created,
                  stripe_event_type: event.type,
                  previousSearchesUsed: profile.searches_used 
                }
              );
            }
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription deleted", { 
          subscriptionId: subscription.id, 
          customerId: subscription.customer 
        });

        // Get customer email
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        if (customer && !customer.deleted && customer.email) {
          const { data: profile } = await supabaseClient
            .from("profiles")
            .select("id, plan, searches_limit, searches_used")
            .eq("email", customer.email)
            .maybeSingle();

          if (profile) {
            await supabaseClient
              .from("profiles")
              .update({ 
                plan: "free",
                searches_limit: PLAN_LIMITS["free"],
                searches_used: 0  // Reset usage on downgrade
              })
              .eq("id", profile.id);

            logStep("Profile downgraded to free after subscription deletion", {
              previousPlan: profile.plan,
              previousLimit: profile.searches_limit,
              newLimit: PLAN_LIMITS["free"]
            });

            // Log to subscription_cancellations for churn tracking
            try {
              await supabaseClient.from("subscription_cancellations").insert({
                user_id: profile.id,
                provider: "stripe",
                subscription_id: subscription.id,
                billing_type: "CREDIT_CARD",
                cancelled_at: new Date().toISOString(),
                active_until: subscription.current_period_end 
                  ? new Date(subscription.current_period_end * 1000).toISOString() 
                  : null,
                notes: `Assinatura Stripe cancelada. Plano anterior: ${profile.plan}. Email: ${customer.email}`,
              });
              logStep("Cancellation logged to subscription_cancellations");
            } catch (e) {
              logStep("Error logging cancellation", { error: String(e) });
            }

            // Log deletion event
            await logSubscriptionEvent(
              supabaseClient,
              "subscription_deleted",
              "stripe-webhook",
              customer.email,
              profile.id,
              profile.plan,
              "free",
              profile.searches_limit,
              PLAN_LIMITS["free"],
              0,
              subscription.id,
              subscription.customer as string,
              event.id,
              { 
                stripe_event_created: event.created,
                stripe_event_type: event.type,
                previousSearchesUsed: profile.searches_used 
              }
            );
          }
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice paid", { 
          invoiceId: invoice.id,
          subscriptionId: invoice.subscription,
          customerEmail: invoice.customer_email,
          billingReason: invoice.billing_reason
        });

        // Only reset searches on subscription renewal (not first payment)
        if (invoice.billing_reason === "subscription_cycle" && invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          const customerEmail = invoice.customer_email;
          
          if (customerEmail) {
            const { data: profile } = await supabaseClient
              .from("profiles")
              .select("id, plan, searches_used, searches_limit")
              .eq("email", customerEmail)
              .maybeSingle();

            if (profile) {
              const priceId = subscription.items.data[0]?.price.id;
              const plan = PRICE_TO_PLAN[priceId] || profile.plan;
              const basePlanLimit = PLAN_LIMITS[plan] || PLAN_LIMITS["free"];
              
              // Calculate subscription end date
              const subscriptionEnd = subscription.current_period_end 
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : null;

              // Reset searches on renewal + clear trial markers (trial virou pagante real)
              const { error: updateError } = await supabaseClient
                .from("profiles")
                .update({ 
                  searches_used: 0,
                  searches_limit: basePlanLimit,
                  last_searches_reset: new Date().toISOString(),
                  subscription_current_period_end: subscriptionEnd,
                  trial_will_charge_at: null,
                })
                .eq("id", profile.id);

              if (updateError) {
                logStep("Error resetting searches on renewal", { error: updateError.message });
              } else {
                logStep("Searches reset on subscription renewal", { 
                  plan,
                  newLimit: basePlanLimit,
                  previousUsed: profile.searches_used,
                  subscriptionEnd
                });
              }

              // Log renewal event
              await logSubscriptionEvent(
                supabaseClient,
                "subscription_renewed",
                "stripe-webhook",
                customerEmail,
                profile.id,
                profile.plan,
                plan,
                profile.searches_limit,
                basePlanLimit,
                0,
                subscription.id,
                invoice.customer as string,
                event.id,
                {
                  priceId,
                  billing_reason: invoice.billing_reason,
                  previousSearchesUsed: profile.searches_used,
                  subscriptionEnd
                }
              );

              // Partner program: register recurring sale on renewal
              try {
                const partnerResult = await registerPartnerSale(supabaseClient, {
                  userId: profile.id,
                  email: customerEmail,
                  amountCents: typeof invoice.amount_paid === 'number' ? invoice.amount_paid : 0,
                  plan,
                  billingPeriod: 'monthly',
                  paymentMethod: 'stripe',
                  stripeInvoiceId: invoice.id,
                  stripeSubscriptionId: subscription.id,
                  paidAt: new Date().toISOString(),
                  isRecurring: true,
                });
                logStep("Partner sale check (renewal)", partnerResult);
              } catch (e) {
                logStep("Partner sale registration failed (renewal)", { error: String(e) });
              }
            }
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment succeeded", { 
          invoiceId: invoice.id,
          subscriptionId: invoice.subscription,
          customerEmail: invoice.customer_email
        });
        // Reconcilia bumps a partir dos items atuais da subscription
        await reconcileBumpsFromSubscription(stripe, supabaseClient, invoice.subscription as string | null, "webhook_grant");
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment failed - revoking bumps from subscription", { 
          invoiceId: invoice.id,
          subscriptionId: invoice.subscription,
          customerEmail: invoice.customer_email
        });
        // Remove items de bump da subscription (mantém o plano principal) e zera extra_*.
        await revokeBumpsOnFailure(stripe, supabaseClient, invoice.subscription as string | null);
        break;
      }


      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        logStep("Charge refunded", { 
          chargeId: charge.id,
          customerId: charge.customer,
          amountRefunded: charge.amount_refunded / 100
        });

        // Get customer email
        if (charge.customer) {
          const customer = await stripe.customers.retrieve(charge.customer as string);
          if (customer && !customer.deleted && customer.email) {
            const { data: profile } = await supabaseClient
              .from("profiles")
              .select("id, plan, searches_limit, searches_used")
              .eq("email", customer.email)
              .maybeSingle();

            const refundAmount = charge.amount_refunded / 100;
            const previousPlan = profile?.plan || "free";
            const previousLimit = profile?.searches_limit || 0;

            // Cancel all active subscriptions for this customer after refund
            try {
              const activeSubs = await stripe.subscriptions.list({
                customer: charge.customer as string,
                status: "active",
                limit: 10,
              });

              for (const sub of activeSubs.data) {
                logStep("Canceling subscription after refund", { subscriptionId: sub.id });
                await stripe.subscriptions.cancel(sub.id, { prorate: false });
              }
              logStep("All active subscriptions canceled after refund", { 
                count: activeSubs.data.length 
              });
            } catch (cancelError) {
              logStep("Error canceling subscriptions after refund", { 
                error: String(cancelError) 
              });
            }

            // Downgrade user to free plan
            if (profile && profile.plan !== "free") {
              const { error: updateError } = await supabaseClient
                .from("profiles")
                .update({
                  plan: "free",
                  searches_limit: PLAN_LIMITS["free"],
                  searches_used: 0,
                  subscription_current_period_end: null,
                })
                .eq("id", profile.id);

              if (updateError) {
                logStep("Error downgrading profile after refund", { error: updateError.message });
              } else {
                logStep("Profile downgraded to free after refund", {
                  previousPlan,
                  previousLimit,
                  newLimit: PLAN_LIMITS["free"],
                });
              }
            }

            // Log refund event
            await logSubscriptionEvent(
              supabaseClient,
              "charge_refunded",
              "stripe-webhook",
              customer.email,
              profile?.id || null,
              previousPlan,
              "free",
              previousLimit,
              PLAN_LIMITS["free"],
              0,
              null,
              charge.customer as string,
              event.id,
              {
                charge_id: charge.id,
                amount_refunded: refundAmount,
                currency: charge.currency,
                stripe_event_created: event.created,
                stripe_event_type: event.type,
                previousSearchesUsed: profile?.searches_used || 0,
                action: "downgraded_to_free",
              }
            );

            logStep("Refund processed: user downgraded to free", { 
              email: customer.email, 
              amount: refundAmount,
              previousPlan,
            });
          }
        }
        break;
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription created", {
          subscriptionId: subscription.id,
          status: subscription.status,
          customerId: subscription.customer,
        });

        // Only act on trial subscriptions; paid activations are handled by subscription.updated/checkout.session.completed
        if (subscription.status !== "trialing") break;

        const customer = await stripe.customers.retrieve(subscription.customer as string);
        if (!customer || customer.deleted || !customer.email) break;

        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("id, plan, searches_limit, searches_used")
          .eq("email", customer.email)
          .maybeSingle();
        if (!profile) {
          logStep("Trial: profile not yet found, skipping", { email: customer.email });
          break;
        }

        const priceId = subscription.items.data[0]?.price.id;
        const plan = PRICE_TO_PLAN[priceId] || "free";
        const planLimit = PLAN_LIMITS[plan] || PLAN_LIMITS["free"];
        const trialEnd = subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null;

        const { error: updateError } = await supabaseClient
          .from("profiles")
          .update({
            plan,
            searches_limit: planLimit,
            searches_used: 0,
            payment_provider: "stripe",
            trial_plan_chosen: plan,
            trial_billing_period: "monthly",
            trial_will_charge_at: trialEnd,
            subscription_current_period_end: trialEnd,
            trial_asaas_subscription_id: subscription.id,
            trial_asaas_customer_id: subscription.customer as string,
            trial_auto_charge_cancelled: false,
          })
          .eq("id", profile.id);

        if (updateError) {
          logStep("Trial activation update failed", { error: updateError.message });
        } else {
          logStep("Trial plan activated on profile", { plan, planLimit, trialEnd });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in stripe-webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
