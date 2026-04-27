import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Cutoff: ignorar churns anteriores a 15/04/2026 (legado pré-relançamento)
const CHURN_CUTOFF_MS = new Date("2026-04-15T00:00:00-03:00").getTime();
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

    const [cancellationsRes, feedbacksRes, eventsRes, profilesRes, paidLeadsRes, paidInvoicesRes] = await Promise.all([
      adminClient.from("subscription_cancellations").select("*").order("cancelled_at", { ascending: false }),
      adminClient.from("cancellation_feedback").select("*").order("created_at", { ascending: false }),
      adminClient
        .from("subscription_events")
        .select("*")
        .in("event_type", ["subscription_canceled", "subscription_deleted", "charge_refunded", "pix_not_renewed"])
        .order("created_at", { ascending: false }),
      adminClient
        .from("profiles")
        .select("id, email, name, plan, payment_provider, subscription_current_period_end, admin_assigned_plan")
        .order("created_at", { ascending: false }),
      // Leads de checkout pagos: identificam usuários que de fato pagaram (não-trial puro)
      adminClient
        .from("checkout_leads")
        .select("user_id")
        .eq("checkout_completed", true)
        .not("user_id", "is", null),
      // Faturas PIX pagas (renovação confirmada)
      adminClient
        .from("pix_invoices")
        .select("user_id")
        .eq("status", "paid")
        .not("user_id", "is", null),
    ]);

    if (cancellationsRes.error) throw cancellationsRes.error;
    if (feedbacksRes.error) throw feedbacksRes.error;
    if (eventsRes.error) throw eventsRes.error;
    if (profilesRes.error) throw profilesRes.error;

    // Conjunto de user_ids que tiveram pelo menos um pagamento real confirmado.
    // Usado para descartar cancelamentos durante o trial (nunca cobrado de fato).
    const usersWithRealPayment = new Set<string>();
    (paidLeadsRes.data || []).forEach((row: any) => row.user_id && usersWithRealPayment.add(row.user_id));
    (paidInvoicesRes.data || []).forEach((row: any) => row.user_id && usersWithRealPayment.add(row.user_id));

    const profiles = profilesRes.data || [];
    const expiredProfiles = profiles.filter((profile) => {
      if (profile.admin_assigned_plan) return false;
      if (!profile.subscription_current_period_end) return false;
      if (profile.payment_provider !== "asaas") return false;
      // Only include profiles that had a paid plan (not free) — real churn
      if (!profile.plan || profile.plan === "free") return false;
      // Excluir quem nunca confirmou um pagamento real (cancelou durante trial)
      if (!usersWithRealPayment.has(profile.id)) return false;

      const periodEnd = new Date(profile.subscription_current_period_end).getTime();
      return Number.isFinite(periodEnd) && periodEnd < now;
    });

    // Filtrar subscription_cancellations: descartar quem nunca pagou nada (trial)
    const filteredCancellations = (cancellationsRes.data || []).filter((c: any) => {
      // Stripe: a verificação de trial já é feita abaixo no merge com Stripe API
      // Para nosso fluxo interno (asaas/manual), exigir pagamento real
      if (c.provider === "stripe") return true;
      if (!c.user_id) return true;
      return usersWithRealPayment.has(c.user_id);
    });

    // Filtrar subscription_events do mesmo modo
    const filteredEvents = (eventsRes.data || []).filter((e: any) => {
      if (!e.user_id) return true;
      // pix_not_renewed e similares: só conta se houve pagamento real prévio
      return usersWithRealPayment.has(e.user_id);
    });

    // Filtrar feedbacks: só inclui usuários que tiveram pelo menos 1 pagamento real.
    // Sem isso, feedbacks de quem cancelou DURANTE o trial (sem nunca ter pago)
    // entrariam no merge do frontend e gerariam churns falsos.
    const filteredFeedbacks = (feedbacksRes.data || []).filter((f: any) => {
      if (!f.user_id) return false;
      return usersWithRealPayment.has(f.user_id);
    });

    // Buscar cancelamentos diretos no Stripe (feitos fora do nosso fluxo)
    // Mescla qualquer subscription canceled pós-15/04 que não esteja já em subscription_cancellations
    const stripeChurns: any[] = [];
    try {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (stripeKey) {
        const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
        const existingStripeIds = new Set(
          (cancellationsRes.data || [])
            .filter((c: any) => c.provider === "stripe")
            .map((c: any) => c.stripe_subscription_id)
            .filter(Boolean)
        );
        const profilesByEmail = new Map(profiles.map((p: any) => [p.email?.toLowerCase(), p]));

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

            // Verificação extra: se nunca houve invoice paga, também não conta como churn
            try {
              const invoices: any = await stripe.invoices.list({
                subscription: sub.id,
                status: "paid",
                limit: 1,
              });
              if (!invoices.data || invoices.data.length === 0) {
                logStep("Skipping subscription with no paid invoices", { id: sub.id });
                continue;
              }
            } catch (_) {
              // Se falhar a verificação, segue o fluxo (já passou no filtro de trial)
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
        payingUsersCount: usersWithRealPayment.size,
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
