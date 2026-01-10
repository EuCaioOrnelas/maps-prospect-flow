import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Stripe price IDs to plan mapping
const PRICE_TO_PLAN: { [key: string]: { name: string; price: number } } = {
  "price_1SlykAK8CM0R6xMMOCM684rz": { name: "start", price: 197 },
  "price_1SlykkK8CM0R6xMMZu7WJesV": { name: "growth", price: 497 },
  "price_1SlylcK8CM0R6xMMyHRWAd8G": { name: "scale", price: 897 },
};

// Admin emails to exclude from MRR calculations
const ADMIN_EMAILS = ["caiowiize@gmail.com"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[GET-STRIPE-MRR] Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    // Create client with service role for admin checks
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { 
      auth: { persistSession: false } 
    });

    // Verify admin access using the user's token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) {
      console.error("[GET-STRIPE-MRR] Auth error:", userError?.message);
      throw new Error("Unauthorized");
    }

    const userId = userData.user.id;
    console.log("[GET-STRIPE-MRR] User authenticated:", userId);

    // Check if user is admin via user_roles table directly
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .single();

    if (roleError || !adminRole) {
      console.error("[GET-STRIPE-MRR] Admin check failed:", roleError?.message);
      throw new Error("Admin access required");
    }
    
    console.log("[GET-STRIPE-MRR] Admin verified");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get all refunds
    const refunds = await stripe.refunds.list({
      limit: 100,
    });
    
    let totalRefunded = 0;
    const refundedCharges = new Set<string>();
    const refundDetails: Array<{
      amount: number;
      date: string;
      reason: string | null;
    }> = [];
    
    for (const refund of refunds.data) {
      if (refund.status === "succeeded") {
        totalRefunded += refund.amount / 100; // Convert cents to BRL
        if (refund.charge) {
          refundedCharges.add(refund.charge as string);
        }
        refundDetails.push({
          amount: refund.amount / 100,
          date: new Date(refund.created * 1000).toISOString(),
          reason: refund.reason,
        });
      }
    }
    
    console.log(`[GET-STRIPE-MRR] Total refunded: R$ ${totalRefunded}, Refunds count: ${refundDetails.length}`);

    // Get all subscriptions (active and canceled) to calculate churn
    const allSubscriptions = await stripe.subscriptions.list({
      status: "all",
      limit: 100,
      expand: ["data.customer"],
    });

    const activeSubscriptions = allSubscriptions.data.filter((s: Stripe.Subscription) => s.status === "active");
    const canceledSubscriptions = allSubscriptions.data.filter((s: Stripe.Subscription) => s.status === "canceled");

    console.log(`[GET-STRIPE-MRR] Active: ${activeSubscriptions.length}, Canceled: ${canceledSubscriptions.length}`);

    let totalMRR = 0;
    let grossMRR = 0;
    const subscriptionDetails: Array<{
      email: string;
      plan: string;
      price: number;
      startDate: string;
      status: string;
    }> = [];

    const monthlyMRR: { [month: string]: number } = {};

    // Process active subscriptions
    for (const sub of activeSubscriptions) {
      const customer = sub.customer as Stripe.Customer;
      const customerEmail = customer.email || "";

      // Skip admin emails
      if (ADMIN_EMAILS.includes(customerEmail.toLowerCase())) {
        console.log(`[GET-STRIPE-MRR] Skipping admin: ${customerEmail}`);
        continue;
      }

      // Get the price from the subscription
      const priceId = sub.items.data[0]?.price.id;
      const planInfo = PRICE_TO_PLAN[priceId];

      if (planInfo) {
        grossMRR += planInfo.price;
        totalMRR += planInfo.price;
        
        subscriptionDetails.push({
          email: customerEmail,
          plan: planInfo.name,
          price: planInfo.price,
          startDate: new Date(sub.start_date * 1000).toISOString(),
          status: "active",
        });

        // Add to monthly MRR
        const startDate = new Date(sub.start_date * 1000);
        const monthKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}`;
        monthlyMRR[monthKey] = (monthlyMRR[monthKey] || 0) + planInfo.price;
      }
    }

    // Calculate canceled subscriptions value (churn)
    let canceledMRR = 0;
    const canceledDetails: Array<{
      email: string;
      plan: string;
      price: number;
      canceledAt: string;
    }> = [];

    for (const sub of canceledSubscriptions) {
      const customer = sub.customer as Stripe.Customer;
      const customerEmail = customer.email || "";

      // Skip admin emails
      if (ADMIN_EMAILS.includes(customerEmail.toLowerCase())) {
        continue;
      }

      const priceId = sub.items.data[0]?.price.id;
      const planInfo = PRICE_TO_PLAN[priceId];

      if (planInfo) {
        canceledMRR += planInfo.price;
        canceledDetails.push({
          email: customerEmail,
          plan: planInfo.name,
          price: planInfo.price,
          canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : "",
        });
      }
    }

    // Get plan distribution from active only
    const planDistribution = subscriptionDetails.reduce((acc, sub) => {
      acc[sub.plan] = (acc[sub.plan] || 0) + 1;
      return acc;
    }, {} as { [plan: string]: number });

    // Calculate churn rate
    const totalEverSubscribed = activeSubscriptions.length + canceledSubscriptions.length;
    const churnRate = totalEverSubscribed > 0 
      ? ((canceledSubscriptions.length / totalEverSubscribed) * 100).toFixed(1)
      : "0";

    console.log(`[GET-STRIPE-MRR] Net MRR: R$ ${totalMRR}, Gross: R$ ${grossMRR}, Refunded: R$ ${totalRefunded}, Churn: ${churnRate}%`);

    return new Response(
      JSON.stringify({
        totalMRR, // Net MRR (active subscriptions only)
        grossMRR,
        totalRefunded,
        refundCount: refundDetails.length,
        refundDetails,
        activeSubscriptions: subscriptionDetails.length,
        canceledSubscriptions: canceledDetails.length,
        canceledMRR,
        canceledDetails,
        churnRate: parseFloat(churnRate),
        subscriptionDetails,
        planDistribution,
        monthlyMRR: Object.entries(monthlyMRR)
          .map(([month, mrr]) => ({ month, mrr }))
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