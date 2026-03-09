import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// This function handles two tracking endpoints:
// - /open?uid=USER_ID&tid=TEMPLATE_ID&aid=AUTOMATION_ID  → 1x1 pixel (tracks opens)
// - /click?uid=USER_ID&tid=TEMPLATE_ID&aid=AUTOMATION_ID&url=ENCODED_URL → redirect (tracks clicks)

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
    const action = url.searchParams.get("action"); // "open" or "click"
    const redirectUrl = url.searchParams.get("url");

    if (!userId || !action) {
      return new Response("Missing params", { status: 400 });
    }

    if (action === "open") {
      // Record open event (deduplicate by checking if already exists)
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

      // Record click event
      await supabase.from("trial_email_events").insert({
        user_id: userId,
        email_template_id: templateId,
        automation_id: automationId || null,
        event_type: "clicked",
        metadata: { url: redirectUrl },
      });

      // Also record in trial_link_clicks if table exists
      try {
        await supabase.from("trial_link_clicks").insert({
          user_id: userId,
          email_template_id: templateId,
          url: redirectUrl,
        });
      } catch (_) {
        // Ignore if table doesn't exist
      }

      // Redirect user to actual URL
      return new Response(null, {
        status: 302,
        headers: {
          Location: decodeURIComponent(redirectUrl),
          "Cache-Control": "no-store",
        },
      });
    }

    return new Response("Invalid action", { status: 400 });
  } catch (error) {
    console.error("Tracking error:", error);
    // Even on error, return pixel/redirect so user experience isn't broken
    return new Response(null, { status: 204 });
  }
});
