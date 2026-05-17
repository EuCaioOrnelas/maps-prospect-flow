// Daily cron: validates all Meta WABA tokens, marks invalid as disconnected,
// and sends a notification email (idempotent per connection per day).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: connections, error } = await supabase
    .from("user_waba_connections")
    .select("id, user_id, access_token, token_expires_at, display_phone_number, business_name, status")
    .neq("status", "disconnected");

  if (error) {
    console.error("[health-check] fetch error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  let checked = 0;
  let disconnected = 0;
  let notified = 0;

  for (const conn of connections || []) {
    checked++;
    let valid = false;

    if (conn.access_token) {
      // Quick check: expired by date
      if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date()) {
        valid = false;
      } else {
        try {
          const res = await fetch(
            `https://graph.facebook.com/v21.0/me?access_token=${encodeURIComponent(conn.access_token)}`,
          );
          if (res.ok) {
            const data = await res.json();
            valid = !!data.id;
          }
        } catch (e) {
          console.error(`[health-check] conn ${conn.id} validation error:`, e);
          valid = false;
        }
      }
    }

    if (!valid) {
      disconnected++;
      // Mark connection as disconnected
      await supabase
        .from("user_waba_connections")
        .update({ status: "disconnected" })
        .eq("id", conn.id);

      // Send notification email (idempotent via daily key)
      try {
        await supabase.functions.invoke("send-email", {
          body: {
            user_id: conn.user_id,
            email_type: "META_NUMBER_DISCONNECTED",
            idempotency_key: `meta-disconnect-${conn.id}-${today}`,
            meta_pref_key: "notify_number_disconnected",
            payload: {
              phone_number: conn.display_phone_number,
              business_name: conn.business_name,
            },
          },
        });
        notified++;
      } catch (e) {
        console.error(`[health-check] email error for ${conn.id}:`, e);
      }
    }
  }

  console.log(`[health-check] done: checked=${checked} disconnected=${disconnected} notified=${notified}`);
  return new Response(
    JSON.stringify({ checked, disconnected, notified }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
