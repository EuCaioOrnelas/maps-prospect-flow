import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Get all refunds with their amounts
    const refunds = await stripe.refunds.list({
      limit: 100,
    });
    
    let totalRefunded = 0;
    const refundedCharges = new Set<string>();
    
    for (const refund of refunds.data) {
      if (refund.status === "succeeded") {
        totalRefunded += refund.amount / 100;
        if (refund.charge) {
          refundedCharges.add(refund.charge as string);
        }
      }
    }
    
    console.log(`[GET-STRIPE-MRR] Total refunded: R$ ${totalRefunded}`);

    // Get all invoices with actual amounts paid (not plan prices)
    const invoices = await stripe.invoices.list({
      limit: 100,
      status: "paid",
      expand: ["data.customer", "data.charge"],
    });

    let totalPaid = 0;
    let totalNetRevenue = 0;
    const paidInvoices: Array<{
      email: string;
      amount: number;
      date: string;
      wasRefunded: boolean;
    }> = [];

    for (const invoice of invoices.data) {
      const customer = invoice.customer as Stripe.Customer;
      const customerEmail = customer?.email || "";
      
      // Skip admin emails
      if (ADMIN_EMAILS.includes(customerEmail.toLowerCase())) {
        console.log(`[GET-STRIPE-MRR] Skipping admin invoice: ${customerEmail}`);
        continue;
      }

      // Skip invoices with 0 amount (admin-granted plans)
      if (invoice.amount_paid === 0) {
        console.log(`[GET-STRIPE-MRR] Skipping zero-amount invoice: ${customerEmail}`);
        continue;
      }

      const amountBRL = invoice.amount_paid / 100;
      const chargeId = typeof invoice.charge === "string" ? invoice.charge : invoice.charge?.id;
      const wasRefunded = chargeId ? refundedCharges.has(chargeId) : false;
      
      totalPaid += amountBRL;
      
      if (!wasRefunded) {
        totalNetRevenue += amountBRL;
      }

      paidInvoices.push({
        email: customerEmail,
        amount: amountBRL,
        date: new Date(invoice.created * 1000).toISOString(),
        wasRefunded,
      });
    }

    // Get active subscriptions (only those with real payments)
    const subscriptions = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
      expand: ["data.customer", "data.latest_invoice"],
    });

    let activeMRR = 0;
    const activeSubscribers: Array<{
      email: string;
      monthlyAmount: number;
      startDate: string;
    }> = [];

    for (const sub of subscriptions.data) {
      const customer = sub.customer as Stripe.Customer;
      const customerEmail = customer?.email || "";
      
      // Skip admin emails
      if (ADMIN_EMAILS.includes(customerEmail.toLowerCase())) {
        continue;
      }

      // Get the actual recurring amount from the subscription
      const latestInvoice = sub.latest_invoice as Stripe.Invoice | null;
      const recurringAmount = latestInvoice?.amount_paid ? latestInvoice.amount_paid / 100 : 0;
      
      // Skip subscriptions that haven't paid anything (admin-granted)
      if (recurringAmount === 0) {
        console.log(`[GET-STRIPE-MRR] Skipping zero-payment subscription: ${customerEmail}`);
        continue;
      }

      activeMRR += recurringAmount;
      activeSubscribers.push({
        email: customerEmail,
        monthlyAmount: recurringAmount,
        startDate: new Date(sub.start_date * 1000).toISOString(),
      });
    }

    // Get canceled subscriptions count (only those that had real payments)
    const allSubs = await stripe.subscriptions.list({
      status: "all",
      limit: 100,
      expand: ["data.customer", "data.latest_invoice"],
    });

    let canceledCount = 0;
    let canceledWithPaymentCount = 0;

    for (const sub of allSubs.data) {
      if (sub.status === "canceled") {
        canceledCount++;
        
        const customer = sub.customer as Stripe.Customer;
        const customerEmail = customer?.email || "";
        
        // Skip admin
        if (ADMIN_EMAILS.includes(customerEmail.toLowerCase())) {
          continue;
        }

        // Check if this subscription ever had a payment
        const latestInvoice = sub.latest_invoice as Stripe.Invoice | null;
        if (latestInvoice?.amount_paid && latestInvoice.amount_paid > 0) {
          canceledWithPaymentCount++;
        }
      }
    }

    // Calculate churn rate based on real paying customers only
    const totalRealCustomers = activeSubscribers.length + canceledWithPaymentCount;
    const churnRate = totalRealCustomers > 0 
      ? ((canceledWithPaymentCount / totalRealCustomers) * 100)
      : 0;

    // Calculate refund rate
    const refundRate = totalPaid > 0 
      ? ((totalRefunded / totalPaid) * 100)
      : 0;

    console.log(`[GET-STRIPE-MRR] Active MRR: R$ ${activeMRR}, Refunded: R$ ${totalRefunded}, Churn: ${churnRate.toFixed(1)}%`);

    return new Response(
      JSON.stringify({
        // Real MRR from active paying subscriptions
        totalMRR: activeMRR,
        activeSubscriptions: activeSubscribers.length,
        activeSubscribers,
        
        // Refund metrics
        totalRefunded,
        refundCount: refundedCharges.size,
        refundRate: parseFloat(refundRate.toFixed(1)),
        
        // Churn metrics
        canceledSubscriptions: canceledWithPaymentCount,
        churnRate: parseFloat(churnRate.toFixed(1)),
        
        // Revenue summary
        totalPaid,
        totalNetRevenue,
        paidInvoices,
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