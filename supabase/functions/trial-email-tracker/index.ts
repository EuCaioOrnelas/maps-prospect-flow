import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// This function handles tracking endpoints:
// - ?action=open → 1x1 pixel (tracks opens)
// - ?action=click → redirect with tracking (tracks clicks)
// - ?action=conversion → records purchase attribution from email CTA

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("uid");
    const templateId = url.searchParams.get("tid");
    const automationId = url.searchParams.get("aid");
    const action = url.searchParams.get("action"); // "open", "click", or "conversion"
    const redirectUrl = url.searchParams.get("url");

    if (!userId || !action) {
      return new Response("Missing params", { status: 400 });
    }

    if (action === "open") {
      // Record open event (deduplicate)
      const { data: existing } = await supabase
        .from("trial_email_events")
        .select("id")
        .eq("user_id", userId)
        .eq("email_template_id", templateId)
        .eq("event_type", "opened")
        .maybeSingle();

      if (!existing) {
        await supabase.from("trial_email_events").insert({
          user_id: userId,
          email_template_id: templateId,
          automation_id: automationId || null,
          event_type: "opened",
        });
      }

      // Return 1x1 transparent pixel
      const pixel = new Uint8Array([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80,
        0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04,
        0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01,
        0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
      ]);

      return new Response(pixel, {
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      });
    }

    if (action === "click") {
      if (!redirectUrl) {
        return new Response("Missing redirect URL", { status: 400 });
      }

      const decodedUrl = decodeURIComponent(redirectUrl);

      // Record click event
      await supabase.from("trial_email_events").insert({
        user_id: userId,
        email_template_id: templateId,
        automation_id: automationId || null,
        event_type: "clicked",
        metadata: { url: decodedUrl },
      });

      // Also record in trial_link_clicks
      try {
        await supabase.from("trial_link_clicks").insert({
          user_id: userId,
          email_template_id: templateId,
          redirect_url: decodedUrl,
        });
      } catch (_) {
        // Ignore if table doesn't exist
      }

      // Append UTM params to the redirect URL for conversion attribution
      const finalUrl = new URL(decodedUrl);
      finalUrl.searchParams.set("utm_source", "trial_email");
      finalUrl.searchParams.set("utm_medium", "email");
      finalUrl.searchParams.set("utm_campaign", automationId || "direct");
      finalUrl.searchParams.set("utm_content", templateId || "unknown");
      finalUrl.searchParams.set("tuid", userId);
      finalUrl.searchParams.set("ttid", templateId || "");
      finalUrl.searchParams.set("taid", automationId || "");

      // Redirect user to actual URL with attribution params
      return new Response(null, {
        status: 302,
        headers: {
          Location: finalUrl.toString(),
          "Cache-Control": "no-store",
        },
      });
    }

    if (action === "conversion") {
      // Record conversion attribution from a purchase
      const revenueAmount = url.searchParams.get("amount") || "0";
      const planName = url.searchParams.get("plan") || "unknown";

      await supabase.from("trial_email_events").insert({
        user_id: userId,
        email_template_id: templateId,
        automation_id: automationId || null,
        event_type: "converted",
        metadata: {
          revenue_amount: parseFloat(revenueAmount),
          plan: planName,
          converted_at: new Date().toISOString(),
        },
      });

      // Also record in revenue attribution
      try {
        await supabase.from("trial_revenue_attribution").insert({
          user_id: userId,
          email_template_id: templateId,
          automation_id: automationId || null,
          revenue_amount: parseFloat(revenueAmount),
          plan_name: planName,
          attribution_type: "email_cta_click",
        });
      } catch (_) {
        // Ignore if table doesn't exist yet
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response("Invalid action", { status: 400 });
  } catch (error) {
    console.error("Tracking error:", error);
    return new Response(null, { status: 204 });
  }
});
