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

    // Get all active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
      expand: ["data.customer"],
    });

    console.log(`[GET-STRIPE-MRR] Found ${subscriptions.data.length} active subscriptions`);

    // Get refunds to calculate net revenue
    const refunds = await stripe.refunds.list({
      limit: 100,
    });
    
    let totalRefunded = 0;
    const refundedCustomers = new Set<string>();
    
    for (const refund of refunds.data) {
      if (refund.status === "succeeded") {
        totalRefunded += refund.amount / 100; // Convert cents to BRL
        // Get charge to find customer
        if (refund.charge) {
          const charge = await stripe.charges.retrieve(refund.charge as string);
          if (charge.customer) {
            refundedCustomers.add(charge.customer as string);
          }
        }
      }
    }
    
    console.log(`[GET-STRIPE-MRR] Total refunded: R$ ${totalRefunded}, Refunded customers: ${refundedCustomers.size}`);

    let totalMRR = 0;
    const subscriptionDetails: Array<{
      email: string;
      plan: string;
      price: number;
      startDate: string;
      hasRefund: boolean;
    }> = [];

    const monthlyMRR: { [month: string]: number } = {};

    for (const sub of subscriptions.data) {
      const customer = sub.customer as Stripe.Customer;
      const customerEmail = customer.email || "";
      const customerId = customer.id;

      // Skip admin emails
      if (ADMIN_EMAILS.includes(customerEmail.toLowerCase())) {
        console.log(`[GET-STRIPE-MRR] Skipping admin: ${customerEmail}`);
        continue;
      }

      // Check if customer has been refunded
      const hasRefund = refundedCustomers.has(customerId);

      // Get the price from the subscription
      const priceId = sub.items.data[0]?.price.id;
      const planInfo = PRICE_TO_PLAN[priceId];

      if (planInfo) {
        // Only add to MRR if customer hasn't been refunded
        if (!hasRefund) {
          totalMRR += planInfo.price;
        }
        
        subscriptionDetails.push({
          email: customerEmail,
          plan: planInfo.name,
          price: hasRefund ? 0 : planInfo.price, // Show 0 if refunded
          startDate: new Date(sub.start_date * 1000).toISOString(),
          hasRefund,
        });

        // Add to monthly MRR only if not refunded
        if (!hasRefund) {
          const startDate = new Date(sub.start_date * 1000);
          const monthKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}`;
          monthlyMRR[monthKey] = (monthlyMRR[monthKey] || 0) + planInfo.price;
        }
      }
    }

    // Get plan distribution
    const planDistribution = subscriptionDetails.reduce((acc, sub) => {
      acc[sub.plan] = (acc[sub.plan] || 0) + 1;
      return acc;
    }, {} as { [plan: string]: number });

    console.log(`[GET-STRIPE-MRR] Total MRR: R$ ${totalMRR}, Total Refunded: R$ ${totalRefunded}`);

    return new Response(
      JSON.stringify({
        totalMRR,
        totalRefunded,
        activeSubscriptions: subscriptionDetails.length,
        paidSubscriptions: subscriptionDetails.filter(s => !s.hasRefund).length,
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
