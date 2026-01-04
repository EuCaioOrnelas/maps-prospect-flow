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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: isAdmin } = await supabaseClient.rpc("is_current_user_admin");
    if (!isAdmin) {
      throw new Error("Admin access required");
    }

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

    let totalMRR = 0;
    const subscriptionDetails: Array<{
      email: string;
      plan: string;
      price: number;
      startDate: string;
    }> = [];

    const monthlyMRR: { [month: string]: number } = {};

    for (const sub of subscriptions.data) {
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
        totalMRR += planInfo.price;
        subscriptionDetails.push({
          email: customerEmail,
          plan: planInfo.name,
          price: planInfo.price,
          startDate: new Date(sub.start_date * 1000).toISOString(),
        });

        // Add to monthly MRR
        const startDate = new Date(sub.start_date * 1000);
        const monthKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}`;
        monthlyMRR[monthKey] = (monthlyMRR[monthKey] || 0) + planInfo.price;
      }
    }

    // Get plan distribution
    const planDistribution = subscriptionDetails.reduce((acc, sub) => {
      acc[sub.plan] = (acc[sub.plan] || 0) + 1;
      return acc;
    }, {} as { [plan: string]: number });

    console.log(`[GET-STRIPE-MRR] Total MRR: R$ ${totalMRR}`);

    return new Response(
      JSON.stringify({
        totalMRR,
        activeSubscriptions: subscriptionDetails.length,
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
