// Edge function: audit-mrr
// Retorna a lista detalhada de cada assinatura (Stripe + Asaas) da Wiize com a decisão
// de inclusão/exclusão no MRR, junto do motivo. Usado pelo painel admin
// "Auditoria de MRR" para diagnosticar rapidamente por que o MRR mudou.

import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Mesma lista de price IDs que get-stripe-mrr usa para identificar produtos Wiize
const WIIZE_PRICE_IDS = [
  "price_1TLZi1K8CM0R6xMMDOg3MSTp",
  "price_1TLZkSK8CM0R6xMMwr1Ke1IX",
  "price_1TLZlSK8CM0R6xMMFtvROCby",
  "price_1TLZn8K8CM0R6xMMaEz5JuVW",
  "price_1SlylcK8CM0R6xMMyHRWAd8G",
  "price_1SlykAK8CM0R6xMMOCM684rz",
  "price_1SlykkK8CM0R6xMMZu7WJesV",
  "price_1SXrv7K8CM0R6xMMo4FlSVIk",
  "price_1SXruNK8CM0R6xMMVD8Gksi4",
  "price_1SZj5bK8CM0R6xMMFocrHWkj",
  "price_1Sc1ehK8CM0R6xMMg1Z0kqCk",
  "price_1SZj4hK8CM0R6xMMSZjjoEkN",
  "price_1SkEsEK8CM0R6xMM9Y1ip21w",
  "price_1SkEsoK8CM0R6xMMF72J3hAi",
];

const PRICE_TO_PLAN: Record<string, string> = {
  price_1TLZi1K8CM0R6xMMDOg3MSTp: "start",
  price_1TLZkSK8CM0R6xMMwr1Ke1IX: "start",
  price_1TLZlSK8CM0R6xMMFtvROCby: "growth",
  price_1TLZn8K8CM0R6xMMaEz5JuVW: "growth",
  price_1SlylcK8CM0R6xMMyHRWAd8G: "scale",
  price_1SlykAK8CM0R6xMMOCM684rz: "start",
  price_1SlykkK8CM0R6xMMZu7WJesV: "growth",
};

const ADMIN_EMAILS = ["caiowiize@gmail.com"];

async function fetchAllPages<T>(
  fetchFn: (params: { limit: number; starting_after?: string }) => Promise<Stripe.ApiList<T>>,
  maxPages = 10,
): Promise<T[]> {
  const items: T[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;
  let page = 0;
  while (hasMore && page < maxPages) {
    const params: { limit: number; starting_after?: string } = { limit: 100 };
    if (startingAfter) params.starting_after = startingAfter;
    const r = await fetchFn(params);
    items.push(...r.data);
    hasMore = r.has_more;
    if (r.data.length > 0) startingAfter = (r.data[r.data.length - 1] as any).id;
    page++;
  }
  return items;
}

function getCustomerEmail(c: Stripe.Customer | string | null): string {
  if (!c || typeof c === "string") return "";
  return (c as Stripe.Customer).email || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Unauthorized");

    const { data: role } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .single();
    if (!role) throw new Error("Admin access required");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const allSubs = await fetchAllPages<Stripe.Subscription>(
      (params) =>
        stripe.subscriptions.list({
          ...params,
          status: "all",
          expand: ["data.customer", "data.latest_invoice", "data.discount"],
        }),
      10,
    );

    // Identifica produtos Wiize (igual ao get-stripe-mrr)
    const wiizeProductIds = new Set<string>();
    for (const sub of allSubs) {
      const price = sub.items.data[0]?.price;
      if (price && WIIZE_PRICE_IDS.includes(price.id)) {
        const pid = typeof price.product === "string" ? price.product : (price.product as any)?.id;
        if (pid) wiizeProductIds.add(pid);
      }
    }
    const wiizeSubs = allSubs.filter((sub) => {
      const price = sub.items.data[0]?.price;
      if (!price) return false;
      if (WIIZE_PRICE_IDS.includes(price.id)) return true;
      const pid = typeof price.product === "string" ? price.product : (price.product as any)?.id;
      return pid && wiizeProductIds.has(pid);
    });

    // Busca trial_will_charge_at e plano local da tabela profiles
    const emails = Array.from(
      new Set(wiizeSubs.map((s) => getCustomerEmail(s.customer as any).toLowerCase()).filter(Boolean)),
    );
    const profilesByEmail = new Map<string, any>();
    if (emails.length > 0) {
      const { data: profs } = await admin
        .from("profiles")
        .select("id,email,plan,trial_will_charge_at,subscription_current_period_end,payment_provider")
        .in("email", emails);
      for (const p of profs ?? []) {
        if (p.email) profilesByEmail.set(p.email.toLowerCase(), p);
      }
    }

    type Row = {
      provider: "stripe" | "asaas";
      subscription_id: string;
      customer_email: string;
      stripe_status: string;
      plan: string;
      price_id: string;
      interval: string;
      monthly_mrr: number;
      cancel_at_period_end: boolean;
      trial_end: string | null;
      current_period_end: string | null;
      canceled_at: string | null;
      trial_will_charge_at: string | null;
      profile_plan: string | null;
      counted_in_mrr: boolean;
      counted_as_trial: boolean;
      reason: string;
    };

    const rows: Row[] = [];
    let totalActiveMrr = 0;
    let totalTrialingMrr = 0;
    let activeCount = 0;
    let trialingCount = 0;

    for (const sub of wiizeSubs) {
      const email = getCustomerEmail(sub.customer as any);
      const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());

      const priceObj = sub.items.data[0]?.price;
      const priceId = priceObj?.id ?? "";
      const interval = priceObj?.recurring?.interval ?? "month";
      const intervalCount = priceObj?.recurring?.interval_count ?? 1;
      let amountCents = priceObj?.unit_amount ?? 0;

      // Mesmo tratamento de cupom recorrente do get-stripe-mrr
      const discount = (sub as any).discount;
      if (discount?.coupon?.duration === "forever") {
        const c = discount.coupon;
        if (c.percent_off) amountCents = Math.round(amountCents * (1 - c.percent_off / 100));
        else if (c.amount_off) amountCents = Math.max(0, amountCents - c.amount_off);
      }

      let monthlyCents = amountCents;
      if (interval === "year") monthlyCents = Math.round(amountCents / (12 * intervalCount));
      else if (interval === "week") monthlyCents = Math.round((amountCents * 52) / (12 * intervalCount));
      else if (interval === "day") monthlyCents = Math.round((amountCents * 365) / (12 * intervalCount));
      else monthlyCents = Math.round(amountCents / intervalCount);

      const monthlyMrr = Math.round(monthlyCents) / 100;
      const planName = PRICE_TO_PLAN[priceId] || "unknown";

      const profile = profilesByEmail.get(email.toLowerCase());
      const isTrialing = sub.status === "trialing";
      const countsForMrr = ["active", "past_due"].includes(sub.status) && !sub.cancel_at_period_end;

      let countedInMrr = false;
      let countedAsTrial = false;
      let reason = "";

      if (isAdmin) {
        reason = "Excluído: e-mail admin (caiowiize@gmail.com)";
      } else if (monthlyMrr <= 0) {
        reason = "Excluído: valor mensal = R$ 0 (cupom 100% ou plano grátis)";
      } else if (isTrialing) {
        if (sub.cancel_at_period_end) {
          reason = "Excluído: trial com cancelamento agendado (não vai cobrar)";
        } else {
          countedAsTrial = true;
          trialingCount++;
          totalTrialingMrr += monthlyMrr;
          reason = "Trial ativo: NÃO conta no MRR, contabilizado em 'Trial MRR' até a primeira cobrança";
        }
      } else if (sub.status === "canceled") {
        reason = `Excluído: assinatura cancelada${
          sub.canceled_at ? " em " + new Date(sub.canceled_at * 1000).toLocaleDateString("pt-BR") : ""
        }`;
      } else if (sub.status === "incomplete" || sub.status === "incomplete_expired") {
        reason = `Excluído: status Stripe = ${sub.status} (pagamento inicial não confirmado)`;
      } else if (sub.status === "unpaid") {
        reason = "Excluído: status Stripe = unpaid (faturas vencidas em aberto)";
      } else if (sub.cancel_at_period_end) {
        reason = "Excluído: cancel_at_period_end = true (não renovará)";
      } else if (countsForMrr) {
        countedInMrr = true;
        activeCount++;
        totalActiveMrr += monthlyMrr;
        reason = `Incluído: status Stripe = ${sub.status}, renovará normalmente`;
      } else {
        reason = `Excluído: status Stripe = ${sub.status}`;
      }

      rows.push({
        subscription_id: sub.id,
        customer_email: email,
        stripe_status: sub.status,
        plan: planName,
        price_id: priceId,
        interval,
        monthly_mrr: monthlyMrr,
        cancel_at_period_end: !!sub.cancel_at_period_end,
        trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
        current_period_end: sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null,
        canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
        trial_will_charge_at: profile?.trial_will_charge_at ?? null,
        profile_plan: profile?.plan ?? null,
        counted_in_mrr: countedInMrr,
        counted_as_trial: countedAsTrial,
        reason,
      });
    }

    // Ordenação: incluídos primeiro, depois trials, depois excluídos. Dentro de cada grupo, MRR desc.
    rows.sort((a, b) => {
      const rank = (r: Row) => (r.counted_in_mrr ? 0 : r.counted_as_trial ? 1 : 2);
      const d = rank(a) - rank(b);
      if (d !== 0) return d;
      return b.monthly_mrr - a.monthly_mrr;
    });

    return new Response(
      JSON.stringify({
        summary: {
          total_subscriptions: wiizeSubs.length,
          active_count: activeCount,
          active_mrr: Math.round(totalActiveMrr * 100) / 100,
          trialing_count: trialingCount,
          trialing_mrr: Math.round(totalTrialingMrr * 100) / 100,
          excluded_count: rows.length - activeCount - trialingCount,
        },
        rows,
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    console.error("[AUDIT-MRR] error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
