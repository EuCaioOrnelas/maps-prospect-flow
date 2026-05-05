import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// WiizeProspect price IDs válidos para MRR (atuais + legados)
const WIIZE_PRICE_IDS = [
  "price_1TLZi1K8CM0R6xMMDOg3MSTp", // Start - R$296/mês
  "price_1TLZkSK8CM0R6xMMwr1Ke1IX", // Start - anual (equiv. mensal R$246)
  "price_1TLZlSK8CM0R6xMMFtvROCby", // Growth - R$696/mês
  "price_1TLZn8K8CM0R6xMMaEz5JuVW", // Growth - anual (equiv. mensal R$596)
  "price_1SlylcK8CM0R6xMMyHRWAd8G", // Scale - R$897
  "price_1SlykAK8CM0R6xMMOCM684rz", // Start - legado
  "price_1SlykkK8CM0R6xMMZu7WJesV", // Growth - legado
  "price_1SXrv7K8CM0R6xMMo4FlSVIk", // Start anual - legado
  "price_1SXruNK8CM0R6xMMVD8Gksi4", // Start mensal - legado
  "price_1SZj5bK8CM0R6xMMFocrHWkj", // Start mensal - legado
  "price_1Sc1ehK8CM0R6xMMg1Z0kqCk", // Start mensal - legado
  "price_1SZj4hK8CM0R6xMMSZjjoEkN", // Growth anual - legado
  "price_1SkEsEK8CM0R6xMM9Y1ip21w", // Start mensal - legado
  "price_1SkEsoK8CM0R6xMMF72J3hAi", // Growth mensal - legado
];

// Admin emails to exclude from MRR calculations
const ADMIN_EMAILS = ["caiowiize@gmail.com"];

// Plan name mapping from price IDs
const PRICE_TO_PLAN: { [key: string]: string } = {
  "price_1TLZi1K8CM0R6xMMDOg3MSTp": "start",
  "price_1TLZkSK8CM0R6xMMwr1Ke1IX": "start",
  "price_1TLZlSK8CM0R6xMMFtvROCby": "growth",
  "price_1TLZn8K8CM0R6xMMaEz5JuVW": "growth",
  "price_1SlylcK8CM0R6xMMyHRWAd8G": "scale",
  // Legacy
  "price_1SlykAK8CM0R6xMMOCM684rz": "start",
  "price_1SlykkK8CM0R6xMMZu7WJesV": "growth",
};

// Helper to paginate through all Stripe list results
async function fetchAllPages<T>(
  fetchFn: (params: { limit: number; starting_after?: string }) => Promise<Stripe.ApiList<T>>,
  maxPages = 10
): Promise<T[]> {
  const allItems: T[] = [];
  let hasMore = true;
  let startingAfter: string | undefined = undefined;
  let pageCount = 0;

  while (hasMore && pageCount < maxPages) {
    const params: { limit: number; starting_after?: string } = { limit: 100 };
    if (startingAfter) params.starting_after = startingAfter;
    
    const response = await fetchFn(params);
    allItems.push(...response.data);
    
    hasMore = response.has_more;
    if (response.data.length > 0) {
      startingAfter = (response.data[response.data.length - 1] as any).id;
    }
    pageCount++;
  }

  return allItems;
}

function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

function getCustomerEmail(customer: Stripe.Customer | string): string {
  if (typeof customer === "string") return "";
  return customer?.email || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[GET-STRIPE-MRR] Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { 
      auth: { persistSession: false } 
    });

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("Unauthorized");
    }

    const userId = userData.user.id;
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .single();

    if (roleError || !adminRole) {
      throw new Error("Admin access required");
    }
    
    console.log("[GET-STRIPE-MRR] Admin verified");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Fetch all data in parallel
    console.log("[GET-STRIPE-MRR] Fetching subscriptions, refunds, and invoices...");
    
    const [allSubsData, allRefunds, allPaidInvoices] = await Promise.all([
      fetchAllPages<Stripe.Subscription>(
        (params) => stripe.subscriptions.list({
          ...params,
          status: "all",
          expand: ["data.customer", "data.latest_invoice", "data.discount"],
        }),
        10
      ),
      fetchAllPages<Stripe.Refund>(
        (params) => stripe.refunds.list({
          ...params,
          expand: ["data.charge"],
        }),
        5
      ),
      fetchAllPages<Stripe.Invoice>(
        (params) => stripe.invoices.list({
          ...params,
          status: "paid",
          expand: ["data.customer"],
        }),
        10
      ),
    ]);

    // Build product IDs from known prices, then filter by product (catches old price IDs too)
    const wiizeProductIds = new Set<string>();
    for (const sub of allSubsData) {
      const price = sub.items.data[0]?.price;
      if (price && WIIZE_PRICE_IDS.includes(price.id)) {
        const productId = typeof price.product === 'string' ? price.product : (price.product as any)?.id;
        if (productId) wiizeProductIds.add(productId);
      }
    }

    // Filter by product (not just current price IDs) to catch legacy prices
    const wiizeSubs = allSubsData.filter((sub: Stripe.Subscription) => {
      const price = sub.items.data[0]?.price;
      if (!price) return false;
      // Match by current price ID OR by product
      if (WIIZE_PRICE_IDS.includes(price.id)) return true;
      const productId = typeof price.product === 'string' ? price.product : (price.product as any)?.id;
      return productId && wiizeProductIds.has(productId);
    });

    console.log(`[GET-STRIPE-MRR] Products: ${JSON.stringify([...wiizeProductIds])}`);
    console.log(`[GET-STRIPE-MRR] Found ${wiizeSubs.length} WiizeProspect subs (from ${allSubsData.length} total), ${allRefunds.length} refunds, ${allPaidInvoices.length} paid invoices`);

    // Build set of WiizeProspect subscription IDs for quick lookup
    const wiizeSubIds = new Set(wiizeSubs.map((s: Stripe.Subscription) => s.id));

    // --- Process refunds ---
    const refundedChargeIds = new Set<string>();
    let wiizeRefundCount = 0;
    let wiizeRefundedAmount = 0;
    const monthlyRefunds: { [month: string]: { amount: number; count: number } } = {};

    for (const refund of allRefunds) {
      if (refund.status !== "succeeded" || !refund.charge) continue;

      const charge = typeof refund.charge === "string" 
        ? await stripe.charges.retrieve(refund.charge)
        : refund.charge;
      
      if (!charge.invoice) continue;

      const invoice = await stripe.invoices.retrieve(charge.invoice as string);
      const subId = invoice.subscription;
      
      if (!subId || !wiizeSubIds.has(subId as string)) continue;

      // Check if admin email
      const sub = wiizeSubs.find((s: Stripe.Subscription) => s.id === subId);
      if (!sub) continue;
      const customerEmail = getCustomerEmail(sub.customer as Stripe.Customer);
      if (isAdminEmail(customerEmail)) continue;

      wiizeRefundCount++;
      wiizeRefundedAmount += refund.amount / 100;
      refundedChargeIds.add(charge.id);

      // Track monthly refunds by refund date
      const refundDate = new Date(refund.created * 1000);
      const monthKey = `${refundDate.getFullYear()}-${String(refundDate.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyRefunds[monthKey]) {
        monthlyRefunds[monthKey] = { amount: 0, count: 0 };
      }
      monthlyRefunds[monthKey].amount += refund.amount / 100;
      monthlyRefunds[monthKey].count += 1;
      
      console.log(`[GET-STRIPE-MRR] WiizeProspect refund: R$ ${refund.amount / 100}`);
    }

    // --- Process paid invoices FIRST to know which subs had real payments ---
    const invoicesBySubId: { [subId: string]: Stripe.Invoice[] } = {};

    for (const invoice of allPaidInvoices) {
      if (!invoice.subscription) continue;
      const subId = invoice.subscription as string;
      if (!wiizeSubIds.has(subId)) continue;

      const customerEmail = getCustomerEmail(invoice.customer as Stripe.Customer);
      if (isAdminEmail(customerEmail)) continue;
      if (invoice.amount_paid === 0) continue;

      // Skip invoices that aren't truly paid (e.g. boletos still pending)
      if (invoice.paid !== true || (invoice.amount_remaining && invoice.amount_remaining > 0)) {
        console.log(`[GET-STRIPE-MRR] Skipping invoice ${invoice.id}: paid=${invoice.paid}, amount_remaining=${invoice.amount_remaining}, status=${invoice.status}`);
        continue;
      }

      // Skip if no actual charge was made
      if (!invoice.charge) {
        console.log(`[GET-STRIPE-MRR] Skipping invoice ${invoice.id}: no charge associated`);
        continue;
      }

      // Check if refunded
      const chargeId = invoice.charge;
      const wasRefunded = chargeId && typeof chargeId === "string" && refundedChargeIds.has(chargeId);
      if (wasRefunded) continue;

      if (!invoicesBySubId[subId]) {
        invoicesBySubId[subId] = [];
      }
      invoicesBySubId[subId].push(invoice);
    }

    // Set of sub IDs that ever had a real (non-refunded) payment
    const subsWithPayment = new Set(Object.keys(invoicesBySubId));

    // --- Process subscriptions for active MRR, cancellations ---
    let activeMRR = 0;
    let activeCount = 0;
    let trialingCount = 0;
    let trialingMRR = 0;
    let pastDueCount = 0;
    let pastDueMRR = 0;
    let canceledCount = 0;
    let cancellationsLast30d = 0;
    const planDistribution: { [plan: string]: number } = {};
    const monthlySales: { [month: string]: { newSales: number; salesValue: number; cancellations: number } } = {};
    const thirtyDaysAgoUnix = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

    // Dedupe: mesmo customer com múltiplas subs ativas conta apenas a mais cara.
    const bestSubByCustomer = new Map<string, { subId: string; mrr: number; planName: string; email: string }>();

    for (const sub of wiizeSubs) {
      const customerEmail = getCustomerEmail(sub.customer as Stripe.Customer);
      if (isAdminEmail(customerEmail)) continue;

      const latestInvoice = sub.latest_invoice as Stripe.Invoice | null;
      const priceObj = sub.items.data[0]?.price;
      let effectiveAmountCents = priceObj?.unit_amount || 0;
      const interval = priceObj?.recurring?.interval || "month";
      const intervalCount = priceObj?.recurring?.interval_count || 1;

      const discount = (sub as any).discount;
      if (discount?.coupon?.duration === "forever") {
        const coupon = discount.coupon;
        if (coupon.percent_off) {
          effectiveAmountCents = Math.round(effectiveAmountCents * (1 - coupon.percent_off / 100));
        } else if (coupon.amount_off) {
          effectiveAmountCents = Math.max(0, effectiveAmountCents - coupon.amount_off);
        }
      }

      let monthlyAmountCents = effectiveAmountCents;
      if (interval === "year") {
        monthlyAmountCents = Math.round(effectiveAmountCents / (12 * intervalCount));
      } else if (interval === "week") {
        monthlyAmountCents = Math.round((effectiveAmountCents * 52) / (12 * intervalCount));
      } else if (interval === "day") {
        monthlyAmountCents = Math.round((effectiveAmountCents * 365) / (12 * intervalCount));
      } else {
        monthlyAmountCents = Math.round(effectiveAmountCents / intervalCount);
      }

      const baseAmount = monthlyAmountCents / 100;
      const mrrAmount = Math.round(baseAmount * 100) / 100;

      const priceId = sub.items.data[0]?.price.id;
      const planName = PRICE_TO_PLAN[priceId] || "unknown";

      const hadAnyPayment = subsWithPayment.has(sub.id) ||
        (latestInvoice?.charge && typeof latestInvoice.charge === "string" && refundedChargeIds.has(latestInvoice.charge));

      const CHURN_CUTOFF_UNIX = Math.floor(new Date("2026-04-15T00:00:00-03:00").getTime() / 1000);
      const canceledDuringTrial =
        sub.status === "canceled" && sub.trial_end && sub.canceled_at && sub.canceled_at <= sub.trial_end;

      if (
        sub.status === "canceled" &&
        hadAnyPayment &&
        !canceledDuringTrial &&
        sub.canceled_at &&
        sub.canceled_at >= CHURN_CUTOFF_UNIX
      ) {
        canceledCount++;
        if (sub.canceled_at >= thirtyDaysAgoUnix) cancellationsLast30d++;
        const cancelDate = new Date(sub.canceled_at * 1000);
        const monthKey = `${cancelDate.getFullYear()}-${String(cancelDate.getMonth() + 1).padStart(2, "0")}`;
        if (!monthlySales[monthKey]) monthlySales[monthKey] = { newSales: 0, salesValue: 0, cancellations: 0 };
        monthlySales[monthKey].cancellations++;
      }

      const chargeId = latestInvoice?.charge;
      const wasRefunded = chargeId && typeof chargeId === "string" && refundedChargeIds.has(chargeId);
      const isTrialing = sub.status === "trialing";

      if (isTrialing && !sub.cancel_at_period_end && mrrAmount > 0 && !wasRefunded) {
        trialingCount++;
        trialingMRR += mrrAmount;
        console.log(`[GET-STRIPE-MRR] Trial sub (NOT in MRR): ${sub.id} | ${customerEmail} | R$${mrrAmount}`);
        continue;
      }

      // past_due = cartão falhou. NÃO é receita real.
      if (sub.status === "past_due" && !sub.cancel_at_period_end && mrrAmount > 0 && !wasRefunded) {
        pastDueCount++;
        pastDueMRR += mrrAmount;
        console.log(`[GET-STRIPE-MRR] Past_due sub (NOT in MRR): ${sub.id} | ${customerEmail} | R$${mrrAmount}`);
        continue;
      }

      // MRR real = ACTIVE + ao menos 1 pagamento confirmado
      const countsForMrr =
        sub.status === "active" &&
        !sub.cancel_at_period_end &&
        hadAnyPayment &&
        mrrAmount > 0 &&
        !wasRefunded;

      if (!countsForMrr) continue;

      // Dedupe por customer
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
      if (!customerId) continue;
      const existing = bestSubByCustomer.get(customerId);
      if (!existing || mrrAmount > existing.mrr) {
        bestSubByCustomer.set(customerId, { subId: sub.id, mrr: mrrAmount, planName, email: customerEmail });
      }
    }

    // Consolidar MRR pós-dedupe
    for (const [, info] of bestSubByCustomer) {
      activeMRR += info.mrr;
      activeCount++;
      planDistribution[info.planName] = (planDistribution[info.planName] || 0) + 1;
      console.log(`[GET-STRIPE-MRR] MRR sub (counted): ${info.subId} | ${info.email} | plan=${info.planName} | mrr=R$${info.mrr}`);
    }
    console.log(`[GET-STRIPE-MRR] Excluded past_due: ${pastDueCount} subs / R$${pastDueMRR}`);

    // Count ALL paid invoices as sales (including renewals)
    let totalSalesValue = 0;
    let totalSalesCount = 0;

    for (const invoices of Object.values(invoicesBySubId)) {
      for (const inv of invoices) {
        totalSalesValue += inv.amount_paid / 100;
        totalSalesCount++;

        const paymentTimestamp = inv.status_transitions?.paid_at || inv.created;
        const paymentDate = new Date(paymentTimestamp * 1000);
        const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, "0")}`;

        if (!monthlySales[monthKey]) {
          monthlySales[monthKey] = { newSales: 0, salesValue: 0, cancellations: 0 };
        }
        monthlySales[monthKey].newSales++;
        monthlySales[monthKey].salesValue += inv.amount_paid / 100;
      }
    }

    const totalNewSales = totalSalesCount;

    // Calculate churn rate: canceled / (active + canceled)
    const totalBase = activeCount + canceledCount;
    const churnRate = totalBase > 0 ? ((canceledCount / totalBase) * 100) : 0;

    // --- Compute real monthly MRR by tracking subscription lifecycles ---
    // For each month, calculate which subs were active and sum their monthly value
    const PLAN_MRR: { [priceId: string]: number } = {
      "price_1TLZi1K8CM0R6xMMDOg3MSTp": 296,
      "price_1TLZkSK8CM0R6xMMwr1Ke1IX": 246,
      "price_1TLZlSK8CM0R6xMMFtvROCby": 696,
      "price_1TLZn8K8CM0R6xMMaEz5JuVW": 596,
      "price_1SlylcK8CM0R6xMMyHRWAd8G": 897,
      "price_1SlykAK8CM0R6xMMOCM684rz": 197,
      "price_1SlykkK8CM0R6xMMZu7WJesV": 497,
      "price_1SXrv7K8CM0R6xMMo4FlSVIk": 67,
      "price_1SXruNK8CM0R6xMMVD8Gksi4": 9.9,
      "price_1SZj5bK8CM0R6xMMFocrHWkj": 29.9,
      "price_1Sc1ehK8CM0R6xMMg1Z0kqCk": 39.9,
      "price_1SZj4hK8CM0R6xMMSZjjoEkN": 249.9 / 12,
      "price_1SkEsEK8CM0R6xMM9Y1ip21w": 97,
      "price_1SkEsoK8CM0R6xMMF72J3hAi": 497,
    };

    const monthlyMRR: { [month: string]: { mrr: number; activeCount: number } } = {};

    // Generate list of months from earliest sub start to now
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    
    // Find earliest subscription start
    let earliestStart = now;
    for (const sub of wiizeSubs) {
      const startDate = new Date(sub.start_date * 1000);
      if (startDate < earliestStart) earliestStart = startDate;
    }

    // Generate month keys
    const monthKeys: string[] = [];
    const cursor = new Date(earliestStart.getFullYear(), earliestStart.getMonth(), 1);
    while (cursor <= now) {
      monthKeys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
      cursor.setMonth(cursor.getMonth() + 1);
    }

    // For each month, check which subs were active
    for (const monthKey of monthKeys) {
      const [yearStr, monthStr] = monthKey.split("-");
      const monthStart = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
      const monthEnd = new Date(parseInt(yearStr), parseInt(monthStr), 0, 23, 59, 59);
      
      // For current month, snapshot = now. For past months, snapshot = end of month.
      const isCurrentMonth = monthKey === currentMonthKey;
      const snapshotDate = isCurrentMonth ? now : monthEnd;
      
      let mrrForMonth = 0;
      let activeForMonth = 0;

      for (const sub of wiizeSubs) {
        const customerEmail = getCustomerEmail(sub.customer as Stripe.Customer);
        if (isAdminEmail(customerEmail)) continue;

        const priceId = sub.items.data[0]?.price.id;
        const subMrr = PLAN_MRR[priceId] || 0;
        if (subMrr === 0) continue;

        // Sub must have started before or on the snapshot date
        const subStart = new Date(sub.start_date * 1000);
        if (subStart > snapshotDate) continue;

        // Sub must still be active at the snapshot date (end-of-month or now)
        if (sub.status === "canceled" && sub.canceled_at) {
          const cancelDate = new Date(sub.canceled_at * 1000);
          // If canceled before the snapshot, it doesn't count
          if (cancelDate <= snapshotDate) continue;
        }

        // For current month active subs, also exclude cancel_at_period_end
        if (isCurrentMonth && sub.cancel_at_period_end) continue;

        const hadPayment = invoicesBySubId[sub.id] && invoicesBySubId[sub.id].length > 0;
        if (!hadPayment) continue;

        const latestInvoice = sub.latest_invoice as Stripe.Invoice | null;
        const chargeId = latestInvoice?.charge;
        const wasRefunded = chargeId && typeof chargeId === "string" && refundedChargeIds.has(chargeId);
        if (wasRefunded) continue;

        let effectiveAmount = subMrr;
        const discount = (sub as any).discount;
        if (discount?.coupon?.duration === "forever") {
          const coupon = discount.coupon;
          if (coupon.percent_off) {
            effectiveAmount = Math.round(effectiveAmount * (1 - coupon.percent_off / 100));
          } else if (coupon.amount_off) {
            effectiveAmount = Math.max(0, effectiveAmount - coupon.amount_off / 100);
          }
        }

        mrrForMonth += effectiveAmount;
        activeForMonth++;
      }

      monthlyMRR[monthKey] = { mrr: mrrForMonth, activeCount: activeForMonth };
    }

    // ============================================================
    // Custom subscriptions (admin-managed manual contracts)
    // - MRR uses monthly_value_cents directly
    // - Active = status='active' AND (is_lifetime OR ends_at > now)
    // - Total sales/LTV uses sum of payments
    // ============================================================
    const { data: customSubs } = await supabaseAdmin
      .from("custom_subscriptions")
      .select("id, status, monthly_value_cents, total_value_cents, is_lifetime, starts_at, ends_at, created_at, plan, canceled_at");

    const { data: customPayments } = await supabaseAdmin
      .from("custom_subscription_payments")
      .select("amount_cents, paid_at");

    let customMRR = 0;
    let customActiveCount = 0;
    let customCanceledCount = 0;
    const nowMs = Date.now();

    for (const cs of customSubs || []) {
      const isActive =
        cs.status === "active" &&
        (cs.is_lifetime || (cs.ends_at && new Date(cs.ends_at).getTime() > nowMs));
      if (isActive) {
        customMRR += (cs.monthly_value_cents || 0) / 100;
        customActiveCount++;
        const planKey = `${cs.plan}_custom`;
        planDistribution[planKey] = (planDistribution[planKey] || 0) + 1;
      } else if (cs.status === "canceled" || cs.status === "expired") {
        customCanceledCount++;
        if (cs.canceled_at) {
          const canceledMs = new Date(cs.canceled_at).getTime();
          if (canceledMs >= nowMs - 30 * 24 * 60 * 60 * 1000) cancellationsLast30d++;
        }
      }
    }

    let customSalesValue = 0;
    let customSalesCount = 0;
    for (const p of customPayments || []) {
      const amount = (p.amount_cents || 0) / 100;
      customSalesValue += amount;
      customSalesCount++;
      const d = new Date(p.paid_at);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlySales[monthKey]) {
        monthlySales[monthKey] = { newSales: 0, salesValue: 0, cancellations: 0 };
      }
      monthlySales[monthKey].newSales++;
      monthlySales[monthKey].salesValue += amount;
    }

    // Add custom MRR to monthly snapshot for current month
    if (monthlyMRR[currentMonthKey]) {
      monthlyMRR[currentMonthKey].mrr += customMRR;
      monthlyMRR[currentMonthKey].activeCount += customActiveCount;
    } else {
      monthlyMRR[currentMonthKey] = { mrr: customMRR, activeCount: customActiveCount };
    }

    const finalMRR = activeMRR + customMRR;
    const finalActiveCount = activeCount + customActiveCount;
    const finalCanceledCount = canceledCount + customCanceledCount;
    const finalSalesValue = totalSalesValue + customSalesValue;
    const finalSalesCount = totalSalesCount + customSalesCount;
    const finalBase = finalActiveCount + finalCanceledCount;
    const finalChurn = finalBase > 0 ? (finalCanceledCount / finalBase) * 100 : 0;

    console.log(
      `[GET-STRIPE-MRR] Stripe MRR: R$ ${activeMRR} (${activeCount}) | Custom MRR: R$ ${customMRR} (${customActiveCount}) | Total: R$ ${finalMRR}`
    );
    console.log(`[GET-STRIPE-MRR] Total Sales: R$ ${finalSalesValue} (${finalSalesCount})`);

    return new Response(
      JSON.stringify({
        totalMRR: finalMRR,
        stripeMRR: activeMRR,
        customMRR,
        activeSubscriptions: finalActiveCount,
        stripeActiveSubscriptions: activeCount,
        customActiveSubscriptions: customActiveCount,
        trialingSubscriptions: trialingCount,
        trialingMRR,
        totalRefunded: wiizeRefundedAmount,
        refundCount: wiizeRefundCount,
        canceledSubscriptions: finalCanceledCount,
        cancellationsLast30d,
        churnRate: parseFloat(finalChurn.toFixed(1)),
        totalSalesValue: finalSalesValue,
        totalSalesCount: finalSalesCount,
        totalNewSales: finalSalesCount,
        planDistribution,
        monthlyMRR: Object.entries(monthlyMRR)
          .map(([month, data]) => ({ month, mrr: data.mrr, activeCount: data.activeCount }))
          .sort((a, b) => a.month.localeCompare(b.month)),
        monthlyRefunds: Object.entries(monthlyRefunds)
          .map(([month, data]) => ({ month, amount: data.amount, count: data.count }))
          .sort((a, b) => a.month.localeCompare(b.month)),
        monthlySales: Object.entries(monthlySales)
          .map(([month, data]) => ({ month, newSales: data.newSales, salesValue: data.salesValue, cancellations: data.cancellations }))
          .sort((a, b) => a.month.localeCompare(b.month)),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[GET-STRIPE-MRR] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
