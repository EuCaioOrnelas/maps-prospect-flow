import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ABACATE_API_URL = "https://api.abacatepay.com/v1";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ABACATE-PIX] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ABACATE_PAY_API_KEY");
    if (!apiKey) throw new Error("ABACATE_PAY_API_KEY not configured");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { planKey, customerData } = await req.json();
    if (!planKey || !customerData) throw new Error("planKey and customerData are required");

    logStep("Request received", { planKey, email: customerData.email });

    // Plan config (prices in cents)
    const planConfig: Record<string, { name: string; priceInCents: number }> = {
      start: { name: "Wiize Start", priceInCents: 19700 },
      growth: { name: "Wiize Growth", priceInCents: 49700 },
      scale: { name: "Wiize Scale", priceInCents: 89700 },
    };

    const plan = planConfig[planKey];
    if (!plan) throw new Error(`Invalid plan: ${planKey}`);

    // Authenticate user if possible
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      if (data.user) {
        userId = data.user.id;
        logStep("User authenticated", { userId });
      }
    }

    // If no auth, try to find user by email
    if (!userId && customerData.email) {
      const { data: profileByEmail } = await supabaseClient
        .from("profiles")
        .select("id")
        .eq("email", customerData.email)
        .maybeSingle();
      if (profileByEmail) {
        userId = profileByEmail.id;
        logStep("User found by email", { userId });
      }
    }

    // Determine final price (trial discount)
    let finalPrice = plan.priceInCents;
    if (userId) {
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("plan, trial_start_at")
        .eq("id", userId)
        .maybeSingle();

      if (profile?.plan === "free" && profile?.trial_start_at) {
        finalPrice = Math.round(finalPrice / 2);
        logStep("Trial user discount applied", { originalPrice: plan.priceInCents, finalPrice });
      }
    }

    // Create PIX QR Code
    const pixRes = await fetch(`${ABACATE_API_URL}/pixQrCode/create`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        amount: finalPrice,
        expiresIn: 1800, // 30 minutes
        description: `${plan.name} - Assinatura mensal`,
        customer: {
          name: customerData.name,
          cellphone: customerData.phone,
          email: customerData.email,
          taxId: customerData.taxId,
        },
        metadata: {
          planKey,
          planName: plan.name,
          userId: userId || "anonymous",
          email: customerData.email,
        },
      }),
    });

    const pixJson = await pixRes.json();
    if (pixJson.error) {
      logStep("PIX QR Code creation failed", pixJson.error);
      throw new Error(`AbacatePay PIX error: ${JSON.stringify(pixJson.error)}`);
    }

    const pixData = pixJson.data;
    logStep("PIX QR Code created", { pixId: pixData.id, amount: pixData.amount });

    // Track checkout lead
    if (userId) {
      try {
        await supabaseClient.from("checkout_leads").insert({
          user_id: userId,
          email: customerData.email,
          name: customerData.name,
          plan_attempted: plan.name,
          stripe_session_id: `abacate_pix_${pixData.id}`,
          checkout_started_at: new Date().toISOString(),
          checkout_completed: false,
        });
      } catch (e) {
        logStep("Failed to track checkout lead", { error: String(e) });
      }
    }

    return new Response(
      JSON.stringify({
        pixId: pixData.id,
        brCode: pixData.brCode,
        brCodeBase64: pixData.brCodeBase64,
        amount: pixData.amount,
        expiresAt: pixData.expiresAt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
