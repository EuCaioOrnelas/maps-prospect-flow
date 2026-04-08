import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

    const { user_id, summary, description, start_datetime, duration_minutes, attendee_email } = await req.json();

    if (!user_id || !summary) {
      return new Response(JSON.stringify({ error: "Missing required fields: user_id, summary" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: tokenRecord, error: tokenError } = await supabase
      .from("user_google_tokens")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (tokenError || !tokenRecord) {
      return new Response(JSON.stringify({ error: "Google not connected", requiresAuth: true }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = tokenRecord.access_token;

    // Refresh token if expired
    if (new Date(tokenRecord.token_expires_at) <= new Date()) {
      const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
          refresh_token: tokenRecord.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      const refreshData = await refreshRes.json();

      if (!refreshRes.ok || !refreshData.access_token) {
        await supabase.from("user_google_tokens").delete().eq("user_id", user_id);
        return new Response(JSON.stringify({ error: "Token expired, please reconnect", requiresAuth: true }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      accessToken = refreshData.access_token;
      await supabase.from("user_google_tokens").update({
        access_token: accessToken,
        token_expires_at: new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("user_id", user_id);
    }

    // Build event
    const startTime = start_datetime ? new Date(start_datetime) : new Date();
    const endTime = new Date(startTime.getTime() + (duration_minutes || 30) * 60000);

    const event: any = {
      summary,
      description: description || "",
      start: {
        dateTime: startTime.toISOString(),
        timeZone: "America/Sao_Paulo",
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: "America/Sao_Paulo",
      },
    };

    if (attendee_email) {
      event.attendees = [{ email: attendee_email }];
    }

    const calRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    const calData = await calRes.json();

    if (!calRes.ok) {
      console.error("Calendar API error:", calData);
      return new Response(JSON.stringify({ error: "Failed to create event", details: calData }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, eventId: calData.id, htmlLink: calData.htmlLink }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in google-calendar-action:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
