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

    // Get ALL subscriptions with pagination (up to 1000)
    console.log("[GET-STRIPE-MRR] Fetching all subscriptions...");
    const allSubsData = await fetchAllPages<Stripe.Subscription>(
      (params) => stripe.subscriptions.list({
        ...params,
        status: "all",
        expand: ["data.customer", "data.latest_invoice"],
      }),
      10 // max 10 pages = 1000 subscriptions
    );

    // Filter only WiizeProspect subscriptions
    const wiizeSubs = allSubsData.filter((sub: Stripe.Subscription) => {
      const priceId = sub.items.data[0]?.price.id;
      return WIIZE_PRICE_IDS.includes(priceId);
    });

    console.log(`[GET-STRIPE-MRR] Found ${wiizeSubs.length} WiizeProspect subscriptions (from ${allSubsData.length} total)`);

    // Get ALL refunds with pagination
    console.log("[GET-STRIPE-MRR] Fetching all refunds...");
    const allRefunds = await fetchAllPages<Stripe.Refund>(
      (params) => stripe.refunds.list({
        ...params,
        expand: ["data.charge"],
      }),
      5 // max 5 pages = 500 refunds
    );

    // Find refunded charges that belong to WiizeProspect subscriptions
    const refundedChargeIds = new Set<string>();
    let wiizeRefundCount = 0;
    let wiizeRefundedAmount = 0;

    for (const refund of allRefunds) {
      if (refund.status === "succeeded" && refund.charge) {
        const charge = typeof refund.charge === "string" 
          ? await stripe.charges.retrieve(refund.charge)
          : refund.charge;
        
        // Check if this charge's invoice belongs to a WiizeProspect subscription
        if (charge.invoice) {
          const invoice = await stripe.invoices.retrieve(charge.invoice as string);
          const subId = invoice.subscription;
          
          if (subId) {
            const sub = wiizeSubs.find((s: Stripe.Subscription) => s.id === subId);
            if (sub) {
              wiizeRefundCount++;
              wiizeRefundedAmount += refund.amount / 100;
              refundedChargeIds.add(charge.id);
              console.log(`[GET-STRIPE-MRR] Found WiizeProspect refund: R$ ${refund.amount / 100}`);
            }
          }
        }
      }
    }

    // Get ALL paid invoices with pagination for complete MRR history
    console.log("[GET-STRIPE-MRR] Fetching all paid invoices...");
    const allPaidInvoices = await fetchAllPages<Stripe.Invoice>(
      (params) => stripe.invoices.list({
        ...params,
        status: "paid",
        expand: ["data.customer"],
      }),
      10 // max 10 pages = 1000 invoices
    );

    console.log(`[GET-STRIPE-MRR] Found ${allPaidInvoices.length} paid invoices`);

    // Track monthly revenue by invoice paid date (not subscription start date)
    const monthlyMRR: { [month: string]: number } = {};
    
    // Track monthly refunds by refund date (amount and count)
    const monthlyRefunds: { [month: string]: { amount: number; count: number } } = {};

    // Process refunds to get monthly breakdown
    for (const refund of allRefunds) {
      if (refund.status === "succeeded") {
        const refundDate = new Date(refund.created * 1000);
        const monthKey = `${refundDate.getFullYear()}-${String(refundDate.getMonth() + 1).padStart(2, "0")}`;
        
        // Check if this refund belongs to a WiizeProspect subscription
        if (refund.charge) {
          const charge = typeof refund.charge === "string" 
            ? await stripe.charges.retrieve(refund.charge)
            : refund.charge;
          
          if (charge.invoice) {
            const invoice = await stripe.invoices.retrieve(charge.invoice as string);
            const subId = invoice.subscription;
            
            if (subId) {
              const sub = wiizeSubs.find((s: Stripe.Subscription) => s.id === subId);
              if (sub) {
                const customer = sub.customer as Stripe.Customer;
                const customerEmail = customer?.email || "";
                
                // Skip admin emails
                if (!ADMIN_EMAILS.includes(customerEmail.toLowerCase())) {
                  if (!monthlyRefunds[monthKey]) {
                    monthlyRefunds[monthKey] = { amount: 0, count: 0 };
                  }
                  monthlyRefunds[monthKey].amount += refund.amount / 100;
                  monthlyRefunds[monthKey].count += 1;
                }
              }
            }
          }
        }
      }
    }

    // Plan name mapping from price IDs
    const PRICE_TO_PLAN: { [key: string]: string } = {
      "price_1SlykAK8CM0R6xMMOCM684rz": "start",
      "price_1SlykkK8CM0R6xMMZu7WJesV": "growth",
      "price_1SlylcK8CM0R6xMMyHRWAd8G": "scale",
    };

    // Process WiizeProspect subscriptions
    let activeMRR = 0;
    let activeCount = 0;
    let canceledCount = 0;
    const planDistribution: { [plan: string]: number } = {};

    // Track monthly sales and cancellations from Stripe data
    const monthlySales: { [month: string]: { newSales: number; salesValue: number; cancellations: number } } = {};

    for (const sub of wiizeSubs) {
      const customer = sub.customer as Stripe.Customer;
      const customerEmail = customer?.email || "";
      
      // Skip admin emails
      if (ADMIN_EMAILS.includes(customerEmail.toLowerCase())) {
        continue;
      }

      const latestInvoice = sub.latest_invoice as Stripe.Invoice | null;
      const amountPaid = latestInvoice?.amount_paid ? latestInvoice.amount_paid / 100 : 0;

      // Skip if no real payment (admin-granted)
      if (amountPaid === 0) {
        continue;
      }

      const priceId = sub.items.data[0]?.price.id;
      const planName = PRICE_TO_PLAN[priceId] || "unknown";

      if (sub.status === "active") {
        // Check if this subscription's charge was refunded
        const chargeId = latestInvoice?.charge;
        const wasRefunded = chargeId && typeof chargeId === "string" && refundedChargeIds.has(chargeId);
        
        if (!wasRefunded) {
          activeMRR += amountPaid;
          activeCount++;
          planDistribution[planName] = (planDistribution[planName] || 0) + 1;
        }
      } else if (sub.status === "canceled") {
        canceledCount++;
        
        // Track cancellation month
        if (sub.canceled_at) {
          const cancelDate = new Date(sub.canceled_at * 1000);
          const monthKey = `${cancelDate.getFullYear()}-${String(cancelDate.getMonth() + 1).padStart(2, "0")}`;
          if (!monthlySales[monthKey]) {
            monthlySales[monthKey] = { newSales: 0, salesValue: 0, cancellations: 0 };
          }
          monthlySales[monthKey].cancellations++;
        }
      }

      // Track new sale month (subscription creation)
      const startDate = new Date(sub.created * 1000);
      const startMonthKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlySales[startMonthKey]) {
        monthlySales[startMonthKey] = { newSales: 0, salesValue: 0, cancellations: 0 };
      }
      monthlySales[startMonthKey].newSales++;
      // Use the first invoice amount for the sale value
      const firstInvoiceAmount = latestInvoice?.amount_paid ? latestInvoice.amount_paid / 100 : 0;
      monthlySales[startMonthKey].salesValue += firstInvoiceAmount;
    }

    // Process paid invoices to get correct monthly MRR by payment date
    for (const invoice of allPaidInvoices) {
      // Only process WiizeProspect invoices
      if (!invoice.subscription) continue;
      
      const sub = wiizeSubs.find((s: Stripe.Subscription) => s.id === invoice.subscription);
      if (!sub) continue;

      const customer = invoice.customer as Stripe.Customer;
      const customerEmail = customer?.email || "";
      
      // Skip admin emails
      if (ADMIN_EMAILS.includes(customerEmail.toLowerCase())) {
        continue;
      }

      // Skip zero amount invoices (admin-granted)
      if (invoice.amount_paid === 0) {
        continue;
      }

      // Check if this invoice's charge was refunded
      const chargeId = invoice.charge;
      const wasRefunded = chargeId && typeof chargeId === "string" && refundedChargeIds.has(chargeId);
      if (wasRefunded) continue;

      // Use the invoice paid_at timestamp (when the payment was actually made)
      // Fall back to created timestamp if paid_at is not available
      const paymentTimestamp = invoice.status_transitions?.paid_at || invoice.created;
      const paymentDate = new Date(paymentTimestamp * 1000);
      const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, "0")}`;
      
      monthlyMRR[monthKey] = (monthlyMRR[monthKey] || 0) + (invoice.amount_paid / 100);
    }

    // Calculate churn rate: canceled / (active + canceled)
    const totalBase = activeCount + canceledCount;
    const churnRate = totalBase > 0 ? ((canceledCount / totalBase) * 100) : 0;

    console.log(`[GET-STRIPE-MRR] Active MRR: R$ ${activeMRR}, Refunds: ${wiizeRefundCount}, Canceled: ${canceledCount}, Churn: ${churnRate.toFixed(1)}%`);
    console.log(`[GET-STRIPE-MRR] Monthly MRR entries: ${Object.keys(monthlyMRR).length}`);
    console.log(`[GET-STRIPE-MRR] Monthly Refunds entries: ${Object.keys(monthlyRefunds).length}`);
    console.log(`[GET-STRIPE-MRR] Monthly Sales entries: ${Object.keys(monthlySales).length}`);

    return new Response(
      JSON.stringify({
        totalMRR: activeMRR,
        activeSubscriptions: activeCount,
        totalRefunded: wiizeRefundedAmount,
        refundCount: wiizeRefundCount,
        canceledSubscriptions: canceledCount,
        churnRate: parseFloat(churnRate.toFixed(1)),
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
