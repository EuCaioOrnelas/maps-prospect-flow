import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// WiizeProspect price IDs (only count these for MRR)
const WIIZE_PRICE_IDS = [
  "price_1SlykAK8CM0R6xMMOCM684rz", // Start - R$197
  "price_1SlykkK8CM0R6xMMZu7WJesV", // Growth - R$497
  "price_1SlylcK8CM0R6xMMyHRWAd8G", // Scale - R$897
];

// Admin emails to exclude from MRR calculations
const ADMIN_EMAILS = ["caiowiize@gmail.com"];

// Plan name mapping from price IDs
const PRICE_TO_PLAN: { [key: string]: string } = {
  "price_1SlykAK8CM0R6xMMOCM684rz": "start",
  "price_1SlykkK8CM0R6xMMZu7WJesV": "growth",
  "price_1SlylcK8CM0R6xMMyHRWAd8G": "scale",
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
          expand: ["data.customer", "data.latest_invoice"],
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

    // Filter only WiizeProspect subscriptions
    const wiizeSubs = allSubsData.filter((sub: Stripe.Subscription) => {
      const priceId = sub.items.data[0]?.price.id;
      return WIIZE_PRICE_IDS.includes(priceId);
    });

    console.log(`[GET-STRIPE-MRR] Found ${wiizeSubs.length} WiizeProspect subs, ${allRefunds.length} refunds, ${allPaidInvoices.length} paid invoices`);

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

    // --- Process subscriptions for active MRR, cancellations ---
    let activeMRR = 0;
    let activeCount = 0;
    let canceledCount = 0;
    const planDistribution: { [plan: string]: number } = {};
    const monthlySales: { [month: string]: { newSales: number; salesValue: number; cancellations: number } } = {};

    // Set of refunded subscription IDs (subs whose charge was refunded)
    const refundedSubIds = new Set<string>();

    for (const sub of wiizeSubs) {
      const customerEmail = getCustomerEmail(sub.customer as Stripe.Customer);
      if (isAdminEmail(customerEmail)) continue;

      const latestInvoice = sub.latest_invoice as Stripe.Invoice | null;
      const amountPaid = latestInvoice?.amount_paid ? latestInvoice.amount_paid / 100 : 0;
      const priceId = sub.items.data[0]?.price.id;
      const planName = PRICE_TO_PLAN[priceId] || "unknown";

      // Check if latest invoice charge was refunded
      const chargeId = latestInvoice?.charge;
      const wasRefunded = chargeId && typeof chargeId === "string" && refundedChargeIds.has(chargeId);
      if (wasRefunded) {
        refundedSubIds.add(sub.id);
      }

      // Count cancellations REGARDLESS of amountPaid (fix: was skipping $0 subs)
      if (sub.status === "canceled") {
        canceledCount++;
        
        if (sub.canceled_at) {
          const cancelDate = new Date(sub.canceled_at * 1000);
          const monthKey = `${cancelDate.getFullYear()}-${String(cancelDate.getMonth() + 1).padStart(2, "0")}`;
          if (!monthlySales[monthKey]) {
            monthlySales[monthKey] = { newSales: 0, salesValue: 0, cancellations: 0 };
          }
          monthlySales[monthKey].cancellations++;
        }
      }

      // For active MRR, skip $0 or refunded subs
      if (sub.status === "active" && amountPaid > 0 && !wasRefunded) {
        activeMRR += amountPaid;
        activeCount++;
        planDistribution[planName] = (planDistribution[planName] || 0) + 1;
      }
    }

    // --- Process paid invoices for accurate sales tracking ---
    // Group invoices by subscription to find first invoice per sub
    const invoicesBySubId: { [subId: string]: Stripe.Invoice[] } = {};
    const monthlyMRR: { [month: string]: number } = {};
    let totalSalesValue = 0;
    let totalSalesCount = 0;

    for (const invoice of allPaidInvoices) {
      if (!invoice.subscription) continue;
      const subId = invoice.subscription as string;
      if (!wiizeSubIds.has(subId)) continue;

      const customerEmail = getCustomerEmail(invoice.customer as Stripe.Customer);
      if (isAdminEmail(customerEmail)) continue;
      if (invoice.amount_paid === 0) continue;

      // Check if refunded
      const chargeId = invoice.charge;
      const wasRefunded = chargeId && typeof chargeId === "string" && refundedChargeIds.has(chargeId);
      if (wasRefunded) continue;

      // Track for monthly MRR (all valid paid invoices)
      const paymentTimestamp = invoice.status_transitions?.paid_at || invoice.created;
      const paymentDate = new Date(paymentTimestamp * 1000);
      const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, "0")}`;
      monthlyMRR[monthKey] = (monthlyMRR[monthKey] || 0) + (invoice.amount_paid / 100);

      // Track total sales (non-refunded paid invoices)
      totalSalesValue += invoice.amount_paid / 100;
      totalSalesCount++;

      // Group by sub for first-invoice detection
      if (!invoicesBySubId[subId]) {
        invoicesBySubId[subId] = [];
      }
      invoicesBySubId[subId].push(invoice);
    }

    // Determine first invoice per subscription for newSales tracking
    for (const [subId, invoices] of Object.entries(invoicesBySubId)) {
      // Sort by created date ascending to find the first invoice
      invoices.sort((a, b) => a.created - b.created);
      const firstInvoice = invoices[0];

      const paymentTimestamp = firstInvoice.status_transitions?.paid_at || firstInvoice.created;
      const paymentDate = new Date(paymentTimestamp * 1000);
      const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, "0")}`;

      if (!monthlySales[monthKey]) {
        monthlySales[monthKey] = { newSales: 0, salesValue: 0, cancellations: 0 };
      }
      monthlySales[monthKey].newSales++;
      monthlySales[monthKey].salesValue += firstInvoice.amount_paid / 100;
    }

    // Calculate churn rate: canceled / (active + canceled)
    const totalBase = activeCount + canceledCount;
    const churnRate = totalBase > 0 ? ((canceledCount / totalBase) * 100) : 0;

    const totalNewSales = Object.values(monthlySales).reduce((sum, m) => sum + m.newSales, 0);

    console.log(`[GET-STRIPE-MRR] Active MRR: R$ ${activeMRR}, Active: ${activeCount}, Canceled: ${canceledCount}, Churn: ${churnRate.toFixed(1)}%`);
    console.log(`[GET-STRIPE-MRR] Total Sales: R$ ${totalSalesValue} (${totalSalesCount} transactions), New Sales: ${totalNewSales}`);
    console.log(`[GET-STRIPE-MRR] Refunds: ${wiizeRefundCount} (R$ ${wiizeRefundedAmount})`);

    return new Response(
      JSON.stringify({
        totalMRR: activeMRR,
        activeSubscriptions: activeCount,
        totalRefunded: wiizeRefundedAmount,
        refundCount: wiizeRefundCount,
        canceledSubscriptions: canceledCount,
        churnRate: parseFloat(churnRate.toFixed(1)),
        totalSalesValue,
        totalSalesCount,
        totalNewSales,
        planDistribution,
        monthlyMRR: Object.entries(monthlyMRR)
          .map(([month, mrr]) => ({ month, mrr }))
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
