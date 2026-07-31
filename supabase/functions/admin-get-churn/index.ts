import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// O histórico oficial das métricas de churn começa em junho/2026.
const CHURN_CUTOFF_MS = new Date("2026-06-01T00:00:00Z").getTime();
const CHURN_CUTOFF_UNIX = Math.floor(CHURN_CUTOFF_MS / 1000);

const logStep = (step: string, details?: unknown) => {
  const suffix = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ADMIN-GET-CHURN] ${step}${suffix}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const publishableKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const authClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { data: isAdmin, error: adminError } = await authClient.rpc("is_current_user_admin");
    if (adminError || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const now = Date.now();

    const [cancellationsRes, feedbacksRes, eventsRes, profilesRes, paidSalesRes, paidInvoicesRes, customPaymentsRes] = await Promise.all([
      adminClient.from("subscription_cancellations").select("*").order("cancelled_at", { ascending: false }),
      adminClient.from("cancellation_feedback").select("*").order("created_at", { ascending: false }),
      adminClient
        .from("subscription_events")
        .select("*")
        .in("event_type", ["subscription_canceled", "subscription_deleted", "charge_refunded", "pix_not_renewed"])
        .order("created_at", { ascending: false }),
      adminClient
        .from("profiles")
        .select("id, email, name, plan, payment_provider, subscription_current_period_end, subscription_price_cents, admin_assigned_plan, first_paid_at")
        .order("created_at", { ascending: false }),

      // Vendas registradas somente após pagamento recebido. Checkout concluído não
      // é prova de pagamento porque também é criado ao iniciar um trial.
      adminClient
        .from("partner_sales")
        .select("customer_user_id")
        .not("customer_user_id", "is", null),
      // Faturas PIX pagas (renovação confirmada)
      adminClient
        .from("pix_invoices")
        .select("user_id")
        .eq("status", "paid")
        .not("user_id", "is", null),
      adminClient
        .from("custom_subscription_payments")
        .select("user_id, amount_cents")
        .gt("amount_cents", 0)
        .not("paid_at", "is", null),
    ]);

    if (cancellationsRes.error) throw cancellationsRes.error;
    if (feedbacksRes.error) throw feedbacksRes.error;
    if (eventsRes.error) throw eventsRes.error;
    if (profilesRes.error) throw profilesRes.error;

    // Conjunto de user_ids que tiveram pelo menos um pagamento real confirmado.
    // Usado para descartar cancelamentos durante o trial (nunca cobrado de fato).
    const usersWithRealPayment = new Set<string>();
    (paidSalesRes.data || []).forEach((row: any) => row.customer_user_id && usersWithRealPayment.add(row.customer_user_id));
    (paidInvoicesRes.data || []).forEach((row: any) => row.user_id && usersWithRealPayment.add(row.user_id));
    (customPaymentsRes.data || []).forEach((row: any) => row.user_id && usersWithRealPayment.add(row.user_id));
    const profiles = profilesRes.data || [];
    // first_paid_at é gravado pelo webhook do cartão no 1º pagamento com valor > 0.
    profiles.forEach((p: any) => { if (p.first_paid_at) usersWithRealPayment.add(p.id); });

    const profilesByEmail = new Map(
      profiles
        .filter((profile: any) => profile.email)
        .map((profile: any) => [String(profile.email).toLowerCase(), profile])
    );

    // Base de pagantes reais. Campos do perfil (preço/período/provider) NÃO são
    // prova de pagamento: eles também são preenchidos ao iniciar um trial.
    const payingEmails = new Set<string>();
    (profilesRes.data || []).forEach((p: any) => {
      if (usersWithRealPayment.has(p.id) && p.email) payingEmails.add(p.email.toLowerCase());
    });

    // Buscar cancelamentos diretos no Stripe (feitos fora do nosso fluxo)
    // Mescla qualquer subscription canceled pós-01/06 que não esteja já em subscription_cancellations.
    const stripeChurns: any[] = [];
    try {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (stripeKey) {
        const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

        // Todo cliente com invoice paga (valor > 0) é pagante real.
        let invHasMore = true;
        let invStartingAfter: string | undefined;
        let invPages = 0;
        while (invHasMore && invPages < 10) {
          const invRes: any = await stripe.invoices.list({
            status: "paid",
            limit: 100,
            ...(invStartingAfter ? { starting_after: invStartingAfter } : {}),
          });
          for (const inv of invRes.data) {
            if (
              !inv.amount_paid ||
              inv.amount_paid <= 0 ||
              inv.paid !== true ||
              !inv.charge ||
              (inv.amount_remaining && inv.amount_remaining > 0)
            ) continue;
            const email = inv.customer_email || inv.customer_address?.email;
            if (email) {
              const normalizedEmail = String(email).toLowerCase();
              payingEmails.add(normalizedEmail);
              const paidProfile = profilesByEmail.get(normalizedEmail);
              if (paidProfile?.id) {
                usersWithRealPayment.add(paidProfile.id);
                // Persiste a prova de pagamento para o guarda do banco (anti falso churn)
                if (!paidProfile.first_paid_at) {
                  const paidAtIso = new Date(
                    (inv.status_transitions?.paid_at || inv.created) * 1000
                  ).toISOString();
                  paidProfile.first_paid_at = paidAtIso;
                  await adminClient.from("profiles").update({ first_paid_at: paidAtIso }).eq("id", paidProfile.id);
                }
              }
            }
          }
          invHasMore = invRes.has_more;
          invStartingAfter = invRes.data[invRes.data.length - 1]?.id;
          invPages++;
        }


        const existingStripeIds = new Set(
          (cancellationsRes.data || [])
            .filter((c: any) => c.provider === "stripe")
            .map((c: any) => c.stripe_subscription_id)
            .filter(Boolean)
        );
        let hasMore = true;
        let startingAfter: string | undefined;
        while (hasMore) {
          const res: any = await stripe.subscriptions.list({
            status: "canceled",
            limit: 100,
            ...(startingAfter ? { starting_after: startingAfter } : {}),
          });
          for (const sub of res.data) {
            if (!sub.canceled_at || sub.canceled_at < CHURN_CUTOFF_UNIX) continue;
            if (existingStripeIds.has(sub.id)) continue;

            // Ignorar cancelamentos durante o trial (nunca houve cobrança real = não é churn)
            // Detecção: subscription cancelada antes/durante o trial_end, OU sem nenhuma invoice paga
            const canceledDuringTrial =
              sub.trial_end && sub.canceled_at <= sub.trial_end;
            if (canceledDuringTrial) {
              logStep("Skipping trial cancellation", { id: sub.id, canceled_at: sub.canceled_at, trial_end: sub.trial_end });
              continue;
            }

            // Pagamento real exige valor positivo, cobrança efetiva e quitação
            // anterior ao cancelamento. Invoice de R$ 0 gerada no trial não vale.
            try {
              const invoices: any = await stripe.invoices.list({
                subscription: sub.id,
                status: "paid",
                limit: 100,
              });
              const hasRealPaymentBeforeCancellation = (invoices.data || []).some((invoice: any) => {
                const paidAt = invoice.status_transitions?.paid_at || invoice.created;
                return invoice.paid === true &&
                  invoice.amount_paid > 0 &&
                  invoice.charge &&
                  (!invoice.amount_remaining || invoice.amount_remaining === 0) &&
                  paidAt <= sub.canceled_at;
              });
              if (!hasRealPaymentBeforeCancellation) {
                logStep("Skipping trial/unpaid cancellation", { id: sub.id });
                continue;
              }
            } catch (_) {
              // Falha fechada: sem conseguir comprovar invoice paga, não classifica churn.
              continue;
            }

            let email: string | null = null;
            if (sub.customer) {
              try {
                const customer: any = await stripe.customers.retrieve(sub.customer as string);
                email = customer?.email || null;
              } catch (_) {}
            }
            const profile = email ? profilesByEmail.get(email.toLowerCase()) : null;

            stripeChurns.push({
              id: `stripe-${sub.id}`,
              user_id: profile?.id || null,
              stripe_subscription_id: sub.id,
              email,
              provider: "stripe",
              cancelled_at: new Date(sub.canceled_at * 1000).toISOString(),
              active_until: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
              billing_type: "Cartão",
              notes: "Cancelamento direto no Stripe (fora do fluxo interno)",
              cancellation_reason: sub.cancellation_details?.reason || null,
              additional_comments: sub.cancellation_details?.comment || null,
            });
          }
          hasMore = res.has_more;
          startingAfter = res.data[res.data.length - 1]?.id;
        }
      }
    } catch (err) {
      logStep("Stripe lookup error", { message: err instanceof Error ? err.message : String(err) });
    }

    const expiredProfiles = profiles.filter((profile: any) => {
      if (profile.admin_assigned_plan || !profile.subscription_current_period_end) return false;
      if (!["asaas", "stripe", "manual"].includes(profile.payment_provider || "")) return false;
      if (!profile.plan || profile.plan === "free" || !usersWithRealPayment.has(profile.id)) return false;
      const periodEnd = new Date(profile.subscription_current_period_end).getTime();
      return Number.isFinite(periodEnd) && periodEnd >= CHURN_CUTOFF_MS && periodEnd < now;
    });

    // Todas as fontes locais também exigem pagamento confirmado. Isso impede
    // feedback, evento ou perfil expirado de trial de reaparecer como churn.
    const filteredCancellations = (cancellationsRes.data || []).filter((c: any) =>
      Boolean(c.user_id) &&
      new Date(c.cancelled_at).getTime() >= CHURN_CUTOFF_MS &&
      usersWithRealPayment.has(c.user_id)
    );
    const filteredEvents = (eventsRes.data || []).filter((e: any) =>
      Boolean(e.user_id) &&
      new Date(e.created_at).getTime() >= CHURN_CUTOFF_MS &&
      usersWithRealPayment.has(e.user_id)
    );
    const filteredFeedbacks = (feedbacksRes.data || []).filter((f: any) =>
      Boolean(f.user_id) &&
      new Date(f.created_at).getTime() >= CHURN_CUTOFF_MS &&
      usersWithRealPayment.has(f.user_id)
    );

    const metricRows = [
      ...filteredCancellations.map((row: any) => ({ ...row, occurred_at: row.cancelled_at })),
      ...filteredEvents.map((row: any) => ({ ...row, occurred_at: row.created_at })),
      ...filteredFeedbacks.map((row: any) => ({ ...row, occurred_at: row.created_at })),
      ...expiredProfiles.map((row: any) => ({ ...row, user_id: row.id, occurred_at: row.subscription_current_period_end })),
      ...stripeChurns.map((row: any) => ({ ...row, occurred_at: row.cancelled_at })),
    ].sort((a: any, b: any) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
    const uniqueChurns = new Map<string, any>();
    for (const row of metricRows) {
      const key = row.user_id || (row.email ? `email:${String(row.email).toLowerCase()}` : `row:${row.id}`);
      if (!uniqueChurns.has(key)) uniqueChurns.set(key, row);
    }
    const uniqueRows = Array.from(uniqueChurns.values());
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const payingUsersCount = Math.max(payingEmails.size, usersWithRealPayment.size);
    const churnMetrics = {
      total: uniqueRows.length,
      last30d: uniqueRows.filter((row: any) => new Date(row.occurred_at).getTime() > thirtyDaysAgo).length,
      last7d: uniqueRows.filter((row: any) => new Date(row.occurred_at).getTime() > sevenDaysAgo).length,
      payingUsersCount,
    };

    logStep("Churn payload ready", {
      cancellationsRaw: cancellationsRes.data?.length || 0,
      cancellationsFiltered: filteredCancellations.length,
      feedbacksRaw: feedbacksRes.data?.length || 0,
      feedbacksFiltered: filteredFeedbacks.length,
      eventsRaw: eventsRes.data?.length || 0,
      eventsFiltered: filteredEvents.length,
      profiles: profiles.length,
      expiredProfiles: expiredProfiles.length,
      stripeChurns: stripeChurns.length,
      usersWithRealPayment: usersWithRealPayment.size,
      payingBase: payingEmails.size,
      churnMetrics,
    });

    return new Response(
      JSON.stringify({
        cancellations: filteredCancellations,
        feedbacks: filteredFeedbacks,
        subEvents: filteredEvents,
        profiles,
        expiredProfiles,
        stripeChurns,
        // Base "paying" usada para cálculo correto de churn rate (não inclui trial-only)
        payingUsersCount,
        churnMetrics,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
