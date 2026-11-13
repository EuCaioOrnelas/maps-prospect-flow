import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

export type StripeInvoicePayment = {
  paid?: boolean;
  amount_paid?: number | null;
  amount_remaining?: number | null;
  created?: number;
  status_transitions?: { paid_at?: number | null } | null;
};

/**
 * Churn exige dinheiro efetivamente recebido antes do cancelamento.
 * A data do trial não exclui quem pagou antecipadamente; a invoice paga é a prova.
 */
export function hasRealPaymentBeforeCancellation(
  invoices: StripeInvoicePayment[],
  canceledAtUnix: number,
): boolean {
  if (!Number.isFinite(canceledAtUnix)) return false;

  return invoices.some((invoice) => {
    const paidAt = invoice.status_transitions?.paid_at || invoice.created;
    return invoice.paid === true &&
      Number(invoice.amount_paid) > 0 &&
      Number(invoice.amount_remaining || 0) === 0 &&
      Number.isFinite(paidAt) &&
      Number(paidAt) <= canceledAtUnix;
  });
}

export function paymentPrecedesCancellation(paidAt: number | undefined, canceledAt: string): boolean {
  const cancellation = new Date(canceledAt).getTime();
  return paidAt !== undefined && Number.isFinite(paidAt) && Number.isFinite(cancellation) && paidAt <= cancellation;
}

/** Só inadimplência atual de quem já pagou é churn por falta de pagamento. */
export function isUnpaidChurn(status: string, invoices: StripeInvoicePayment[], failedAt: number): boolean {
  return ["past_due", "unpaid"].includes(status) && hasRealPaymentBeforeCancellation(invoices, failedAt);
}

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

    const [cancellationsRes, feedbacksRes, eventsRes, profilesRes, paidSalesRes, paidInvoicesRes, customPaymentsRes, customSubsRes] = await Promise.all([
      adminClient.from("subscription_cancellations").select("*").order("cancelled_at", { ascending: false }),
      adminClient.from("cancellation_feedback").select("*").order("created_at", { ascending: false }),
      adminClient
        .from("subscription_events")
        .select("*")
        .in("event_type", [
          "subscription_canceled",
          "subscription_deleted",
          "charge_refunded",
          "pix_not_renewed",
          "subscription_expired",
          "subscription_not_renewed",
        ])
        .order("created_at", { ascending: false }),
      adminClient
        .from("profiles")
        .select("id, email, name, plan, payment_provider, subscription_current_period_end, subscription_price_cents, admin_assigned_plan, first_paid_at, created_at, trial_start_at")
        .order("created_at", { ascending: false }),

      // Vendas registradas somente após pagamento recebido. Checkout concluído não
      // é prova de pagamento porque também é criado ao iniciar um trial.
      adminClient
        .from("partner_sales")
        .select("customer_user_id, paid_at, created_at, amount_cents")
        .gt("amount_cents", 0)
        .not("customer_user_id", "is", null),
      // Faturas PIX pagas (renovação confirmada)
      adminClient
        .from("pix_invoices")
        .select("user_id, paid_at, created_at, amount_cents")
        .in("status", ["paid", "RECEIVED", "CONFIRMED", "received", "confirmed"])
        .gt("amount_cents", 0)
        .not("user_id", "is", null),
      adminClient
        .from("custom_subscription_payments")
        .select("user_id, amount_cents, paid_at, custom_subscription_id")
        .gt("amount_cents", 0)
        .not("paid_at", "is", null),
      adminClient.from("custom_subscriptions")
        .select("id, user_id, status, canceled_at, ends_at, cancel_reason, renewed_into_id, payment_method")
        .in("status", ["canceled", "expired"]),
    ]);

    if (cancellationsRes.error) throw cancellationsRes.error;
    if (feedbacksRes.error) throw feedbacksRes.error;
    if (eventsRes.error) throw eventsRes.error;
    if (profilesRes.error) throw profilesRes.error;
    for (const result of [paidSalesRes, paidInvoicesRes, customPaymentsRes, customSubsRes]) {
      if (result.error) throw result.error;
    }

    // Conjunto de user_ids que tiveram pelo menos um pagamento real confirmado.
    // Usado para descartar cancelamentos durante o trial (nunca cobrado de fato).
    const usersWithRealPayment = new Set<string>();
    const firstPaymentByUser = new Map<string, number>();
    const rememberPayment = (userId: string, date: string) => {
      const timestamp = new Date(date).getTime();
      if (!userId || !Number.isFinite(timestamp)) return;
      usersWithRealPayment.add(userId);
      firstPaymentByUser.set(userId, Math.min(firstPaymentByUser.get(userId) ?? Infinity, timestamp));
    };
    (paidSalesRes.data || []).forEach((row: any) => rememberPayment(row.customer_user_id, row.paid_at || row.created_at));
    (paidInvoicesRes.data || []).forEach((row: any) => rememberPayment(row.user_id, row.paid_at || row.created_at));
    (customPaymentsRes.data || []).forEach((row: any) => rememberPayment(row.user_id, row.paid_at));
    const profiles = profilesRes.data || [];
    // first_paid_at é gravado pelo webhook do cartão no 1º pagamento com valor > 0.
    profiles.forEach((p: any) => { if (p.first_paid_at) rememberPayment(p.id, p.first_paid_at); });

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

    // Busca todos os cancelamentos pós-01/06 e comprova o pagamento por assinatura.
    // A tela e os totais removem duplicidades com os registros locais depois.
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
              (inv.amount_remaining && inv.amount_remaining > 0)
            ) continue;
            const email = inv.customer_email || inv.customer_address?.email;
            if (email) {
              const normalizedEmail = String(email).toLowerCase();
              payingEmails.add(normalizedEmail);
              const paidProfile = profilesByEmail.get(normalizedEmail);
              if (paidProfile?.id) {
                rememberPayment(paidProfile.id, new Date((inv.status_transitions?.paid_at || inv.created) * 1000).toISOString());
              }
            }
          }
          invHasMore = invRes.has_more;
          invStartingAfter = invRes.data[invRes.data.length - 1]?.id;
          invPages++;
        }


        const localCancellationsByStripeId = new Map(
          (cancellationsRes.data || [])
            .filter((c: any) => c.provider === "stripe" && c.subscription_id)
            .map((c: any) => [c.subscription_id, c])
        );
        let hasMore = true;
        let startingAfter: string | undefined;
        while (hasMore) {
          const res: any = await stripe.subscriptions.list({
            status: "all",
            limit: 100,
            expand: ["data.latest_invoice"],
            ...(startingAfter ? { starting_after: startingAfter } : {}),
          });
          for (const sub of res.data) {
            // MRR exclui cancelamento agendado imediatamente; churn deve registrar
            // a mesma decisão de não renovar, ainda que o período pago esteja aberto.
            const isUnpaid = ["past_due", "unpaid"].includes(sub.status);
            if (sub.status !== "canceled" && !sub.cancel_at_period_end && !isUnpaid) continue;
            const latestInvoice = typeof sub.latest_invoice === "object" ? sub.latest_invoice : null;
            // Não usar period_end: na falha de renovação ele já pode apontar para o mês seguinte.
            const canceledAt = isUnpaid ? latestInvoice?.due_date || latestInvoice?.created : sub.canceled_at;
            if (!canceledAt || canceledAt < CHURN_CUTOFF_UNIX) continue;

            // A única regra é pagamento real anterior ao cancelamento. Não usar
            // trial_end como atalho: quem pagou antecipadamente também é churn.
            // Essa conferência vale inclusive para cancelamentos já gravados
            // localmente, evitando depender apenas do backfill de first_paid_at.
            try {
              const invoices: any = await stripe.invoices.list({
                subscription: sub.id,
                status: "paid",
                limit: 100,
              });
              const hasEvidence = isUnpaid
                ? isUnpaidChurn(sub.status, invoices.data || [], canceledAt)
                : hasRealPaymentBeforeCancellation(invoices.data || [], canceledAt);
              if (!hasEvidence) {
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
            const localCancellation = localCancellationsByStripeId.get(sub.id);
            const localProfile = localCancellation?.user_id
              ? profiles.find((p: any) => p.id === localCancellation.user_id)
              : null;
            const profile = localProfile || (email ? profilesByEmail.get(email.toLowerCase()) : null);
            if (profile?.id) usersWithRealPayment.add(profile.id);

            stripeChurns.push({
              id: `stripe-${sub.id}`,
              user_id: profile?.id || null,
              stripe_subscription_id: sub.id,
              email,
              provider: "stripe",
              cancelled_at: new Date(canceledAt * 1000).toISOString(),
              active_until: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
              billing_type: "Cartão",
              notes: isUnpaid ? "Renovação não paga — assinatura em atraso; não é cancelamento voluntário." : "Cancelamento direto no Stripe (fora do fluxo interno)",
              cancellation_reason: isUnpaid ? "falta_pagamento" : sub.cancellation_details?.reason || null,
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
      if (!["asaas", "stripe", "manual", "pix", "abacate_pay"].includes(profile.payment_provider || "")) return false;
      // Quem não renovou é rebaixado para "free" pelo cron de expiração. Exigir
      // plano pago aqui escondia justamente o churn por não renovação.
      if (!paymentPrecedesCancellation(firstPaymentByUser.get(profile.id), profile.subscription_current_period_end)) return false;
      const periodEnd = new Date(profile.subscription_current_period_end).getTime();
      return Number.isFinite(periodEnd) && periodEnd >= CHURN_CUTOFF_MS && periodEnd < now;
    });

    // Todas as fontes locais também exigem pagamento confirmado. Isso impede
    // feedback, evento ou perfil expirado de trial de reaparecer como churn.
    const filteredCancellations = (cancellationsRes.data || []).filter((c: any) =>
      Boolean(c.user_id) &&
      new Date(c.cancelled_at).getTime() >= CHURN_CUTOFF_MS &&
      paymentPrecedesCancellation(firstPaymentByUser.get(c.user_id), c.cancelled_at)
    );
    const filteredEvents = (eventsRes.data || []).filter((e: any) =>
      Boolean(e.user_id) &&
      new Date(e.created_at).getTime() >= CHURN_CUTOFF_MS &&
      paymentPrecedesCancellation(firstPaymentByUser.get(e.user_id), e.created_at)
    );
    const filteredFeedbacks = (feedbacksRes.data || []).filter((f: any) =>
      Boolean(f.user_id) &&
      new Date(f.created_at).getTime() >= CHURN_CUTOFF_MS &&
      paymentPrecedesCancellation(firstPaymentByUser.get(f.user_id), f.created_at)
    );

    const manualChurns = (customSubsRes.data || []).filter((sub: any) => {
      if (sub.cancel_reason === "voided_by_admin" || sub.renewed_into_id) return false;
      const cancelledAt = sub.canceled_at || sub.ends_at;
      if (!cancelledAt || new Date(cancelledAt).getTime() < CHURN_CUTOFF_MS || new Date(cancelledAt).getTime() > now) return false;
      return (customPaymentsRes.data || []).some((payment: any) =>
        payment.custom_subscription_id === sub.id &&
        paymentPrecedesCancellation(new Date(payment.paid_at).getTime(), cancelledAt));
    }).map((sub: any) => ({
      id: `manual-${sub.id}`, user_id: sub.user_id, provider: "manual",
      cancelled_at: sub.canceled_at || sub.ends_at, active_until: sub.ends_at,
      cancellation_reason: sub.cancel_reason || "falta_pagamento", billing_type: sub.payment_method,
    }));

    const metricRows = [
      ...filteredCancellations.map((row: any) => ({ ...row, occurred_at: row.cancelled_at })),
      ...filteredEvents.map((row: any) => ({ ...row, occurred_at: row.created_at,
        cancellation_reason: ["pix_not_renewed", "subscription_expired", "subscription_not_renewed"].includes(row.event_type) ? "falta_pagamento" : row.cancellation_reason,
      })),
      ...filteredFeedbacks.map((row: any) => ({ ...row, occurred_at: row.created_at })),
      ...expiredProfiles.map((row: any) => ({ ...row, user_id: row.id, occurred_at: row.subscription_current_period_end, cancellation_reason: "falta_pagamento" })),
      ...stripeChurns.map((row: any) => ({ ...row, occurred_at: row.cancelled_at })),
      ...manualChurns.map((row: any) => ({ ...row, occurred_at: row.cancelled_at })),
    ].sort((a: any, b: any) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
    const uniqueChurns = new Map<string, any>();
    for (const row of metricRows) {
      const key = row.user_id || (row.email ? `email:${String(row.email).toLowerCase()}` : `row:${row.id}`);
      if (!uniqueChurns.has(key)) uniqueChurns.set(key, row);
    }
    // Feedback é complemento do cancelamento: não descartá-lo por filtros de
    // pagamento/data do evento nem substituir a resposta por um motivo genérico Stripe.
    const uniqueRows = Array.from(uniqueChurns.values()).map((row: any) => {
      const cancellationMs = new Date(row.occurred_at).getTime();
      const feedback = (feedbacksRes.data || []).find((f: any) => {
        if (!row.user_id || f.user_id !== row.user_id || !f.cancellation_reason?.trim()) return false;
        const difference = new Date(f.created_at).getTime() - cancellationMs;
        return difference >= -30 * 24 * 60 * 60 * 1000 && difference <= 24 * 60 * 60 * 1000;
      });
      return { ...row,
        cancellation_reason: row.cancellation_reason === "falta_pagamento" ? "falta_pagamento" : feedback?.cancellation_reason || row.cancellation_reason || null,
        usage_level: feedback?.usage_level || row.usage_level || null,
        additional_comments: feedback?.additional_comments || row.additional_comments || null,
        details: feedback?.details || row.details || null,
        intends_to_return: feedback?.intends_to_return || row.intends_to_return || null,
      };
    });
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
        churnRows: uniqueRows,
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
