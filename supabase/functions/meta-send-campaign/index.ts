import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      connection_id,
      phone_number_id,
      access_token,
      template_name,
      template_language,
      template_variables,
      phone_numbers,
      campaign_name,
    } = body;

    if (!phone_number_id || !access_token || !template_name || !phone_numbers?.length) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build template components with variables
    const components: any[] = [];
    const varKeys = Object.keys(template_variables || {}).sort();
    if (varKeys.length > 0) {
      components.push({
        type: "body",
        parameters: varKeys.map((key) => ({
          type: "text",
          text: template_variables[key],
        })),
      });
    }

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Send messages in batches
    const BATCH_SIZE = 50;
    for (let i = 0; i < phone_numbers.length; i += BATCH_SIZE) {
      const batch = phone_numbers.slice(i, i + BATCH_SIZE);

      const promises = batch.map(async (phone: string) => {
        try {
          const messageBody: any = {
            messaging_product: "whatsapp",
            to: phone,
            type: "template",
            template: {
              name: template_name,
              language: { code: template_language || "pt_BR" },
            },
          };

          if (components.length > 0) {
            messageBody.template.components = components;
          }

          const response = await fetch(
            `https://graph.facebook.com/v21.0/${phone_number_id}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(messageBody),
            }
          );

          if (response.ok) {
            successCount++;
          } else {
            const errData = await response.json();
            failedCount++;
            errors.push(`${phone}: ${JSON.stringify(errData?.error?.message || "Unknown error")}`);
          }
        } catch (err) {
          failedCount++;
          errors.push(`${phone}: ${err.message}`);
        }
      });

      await Promise.all(promises);

      // Small delay between batches to respect rate limits
      if (i + BATCH_SIZE < phone_numbers.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    // Save campaign record
    const campaignNameFinal = campaign_name || `Meta ${new Date().toISOString().split("T")[0]}`;
    await supabase.from("meta_campaigns").insert({
      user_id: user.id,
      connection_id: connection_id,
      campaign_name: campaignNameFinal,
      template_name: template_name,
      template_language: template_language || "pt_BR",
      total_recipients: phone_numbers.length,
      success_count: successCount,
      failed_count: failedCount,
      status: "completed",
      error_details: errors.length > 0 ? errors.slice(0, 20) : null,
    });

    // === Campaign issues notification ===
    // Trigger when campaign fully fails or failure rate is high (>30% with >=5 recipients)
    const failRate = phone_numbers.length > 0 ? failedCount / phone_numbers.length : 0;
    const isProblematic =
      (successCount === 0 && failedCount > 0) ||
      (phone_numbers.length >= 5 && failRate > 0.3);
    if (isProblematic) {
      try {
        await supabase.functions.invoke("send-email", {
          body: {
            user_id: user.id,
            email_type: "CAMPAIGN_FAILED_TO_START",
            idempotency_key: `meta-campaign-fail-${connection_id}-${Date.now()}`,
            meta_pref_key: "notify_campaign_issues",
            payload: {
              campaign_name: campaignNameFinal,
              total_contacts: phone_numbers.length,
              failed_count: failedCount,
              success_count: successCount,
              error_sample: errors.slice(0, 3).join(" | "),
            },
          },
        });
      } catch (e) {
        console.error("[meta-send-campaign] failure email error:", e);
      }
    }

    return new Response(
      JSON.stringify({
        success_count: successCount,
        failed_count: failedCount,
        total: phone_numbers.length,
        errors: errors.slice(0, 10),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
