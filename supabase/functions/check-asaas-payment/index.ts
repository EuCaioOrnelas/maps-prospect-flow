import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_API = "https://api.asaas.com/v3";

const logStep = (step: string, details?: any) => {
  console.log(`[ASAAS-PAYMENT-CHECK] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

function getPlanSearchesLimit(planKey: string): number {
  const limits: Record<string, number> = { start: 1000, growth: 3000, scale: 10000 };
  return limits[planKey] || 1000;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ASAAS_API_KEY");
    if (!apiKey) throw new Error("ASAAS_API_KEY not configured");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { pixId } = await req.json();
    if (!pixId) throw new Error("pixId is required");

    logStep("Checking authorization status", { pixId });

    // pixId is actually the PIX Automático authorization ID
    const authRes = await fetch(`${ASAAS_API}/pix/automatic/authorizations/${pixId}`, {
      headers: {
        "access_token": apiKey,
        "Accept": "application/json",
      },
    });

    const authJson = await authRes.json();
    if (!authRes.ok) {
      throw new Error(`Authorization check failed: ${JSON.stringify(authJson)}`);
    }

    const status = authJson.status;
    logStep("Authorization status", { pixId, status });

    // Map status: ACTIVE means the customer paid and authorized recurrence
    let mappedStatus = status;
    if (status === "ACTIVE") {
      mappedStatus = "PAID";
    }

    // If authorization was REFUSED/CANCELLED, the bank rejected recurrence
    // BUT the immediate QR Code payment may still have gone through
    // Check payments endpoint to confirm if money was actually received
    if (status === "REFUSED" || status === "CANCELLED" || status === "AWAITING_AUTHORIZATION") {
      logStep("Authorization not active, checking if immediate payment was received", { pixId, status });
      
      try {
        // Check payments linked to this authorization
        const paymentsRes = await fetch(
          `${ASAAS_API}/payments?pixAutomaticAuthorizationId=${pixId}&status=CONFIRMED&limit=1`,
          {
            headers: {
              "access_token": apiKey,
              "Accept": "application/json",
            },
          }
        );
        
        const paymentsJson = await paymentsRes.json();
        
        if (paymentsJson.data && paymentsJson.data.length > 0) {
          logStep("Immediate payment found despite authorization status", { 
            pixId, 
            authStatus: status, 
            paymentStatus: paymentsJson.data[0].status,
            paymentId: paymentsJson.data[0].id 
          });
          mappedStatus = "PAID";
        } else {
          // Also check RECEIVED status
          const receivedRes = await fetch(
            `${ASAAS_API}/payments?pixAutomaticAuthorizationId=${pixId}&status=RECEIVED&limit=1`,
            {
              headers: {
                "access_token": apiKey,
                "Accept": "application/json",
              },
            }
          );
          const receivedJson = await receivedRes.json();
          
          if (receivedJson.data && receivedJson.data.length > 0) {
            logStep("Received payment found despite authorization status", {
              pixId,
              authStatus: status,
              paymentId: receivedJson.data[0].id
            });
            mappedStatus = "PAID";
          }
        }
      } catch (paymentCheckError) {
        logStep("Error checking payments fallback", { error: String(paymentCheckError) });
      }
    }

    // If authorization is ACTIVE, activate the plan
    if (mappedStatus === "PAID") {
      const { data: leads } = await supabaseClient
        .from("checkout_leads")
        .select("user_id, email, plan_attempted")
        .eq("stripe_session_id", `asaas_pixauto_${pixId}`)
        .eq("checkout_completed", false)
        .limit(1);

      if (leads && leads.length > 0) {
        const lead = leads[0];
        const planNameToKey: Record<string, string> = {
          "Wiize Start": "start",
          "Wiize Growth": "growth",
          "Wiize Scale": "scale",
        };
        const planKey = planNameToKey[lead.plan_attempted] || "start";
        const searchesLimit = getPlanSearchesLimit(planKey);
        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + 30);

        let targetId = lead.user_id || null;

        if (!targetId && lead.email) {
          const { data: profileByEmail } = await supabaseClient
            .from("profiles")
            .select("id")
            .eq("email", lead.email)
            .maybeSingle();
          if (profileByEmail) targetId = profileByEmail.id;
        }

        if (targetId) {
          // Check if this is an admin-assigned account - don't overwrite
          const { data: targetProfile } = await supabaseClient
            .from("profiles")
            .select("admin_assigned_plan")
            .eq("id", targetId)
            .maybeSingle();

          if (targetProfile?.admin_assigned_plan) {
            logStep("Skipping profile update - admin assigned plan", { userId: targetId });
          } else {
            await supabaseClient.from("profiles").update({
              plan: planKey,
              searches_limit: searchesLimit,
              searches_used: 0,
              subscription_current_period_end: periodEnd.toISOString(),
              payment_provider: "asaas",
              updated_at: new Date().toISOString(),
            }).eq("id", targetId);

            logStep("Profile updated", { userId: targetId, planKey });
          }
        }

        await supabaseClient.from("checkout_leads").update({
          checkout_completed: true,
          checkout_completed_at: new Date().toISOString(),
          user_id: targetId,
        }).eq("stripe_session_id", `asaas_pixauto_${pixId}`)
          .eq("checkout_completed", false);

        logStep("Checkout completed via polling", { pixId });
      }
    }

    return new Response(
      JSON.stringify({ status: mappedStatus }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
