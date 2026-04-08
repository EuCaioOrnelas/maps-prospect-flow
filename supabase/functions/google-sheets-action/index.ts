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

    const { user_id, spreadsheet_id, sheet_name, data } = await req.json();

    if (!user_id || !spreadsheet_id || !data) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get user tokens
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

    // Check if token expired, refresh if needed
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
        // Token invalid, user needs to reconnect
        await supabase.from("user_google_tokens").delete().eq("user_id", user_id);
        return new Response(JSON.stringify({ error: "Token expired, please reconnect", requiresAuth: true }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      accessToken = refreshData.access_token;
      const newExpiry = new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString();

      await supabase.from("user_google_tokens").update({
        access_token: accessToken,
        token_expires_at: newExpiry,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user_id);
    }

    // Append data to Google Sheets
    const range = sheet_name ? `${sheet_name}!A1` : "Sheet1!A1";
    const values = Array.isArray(data[0]) ? data : [data];

    const sheetsRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values }),
      }
    );

    const sheetsData = await sheetsRes.json();

    if (!sheetsRes.ok) {
      console.error("Sheets API error:", sheetsData);
      return new Response(JSON.stringify({ error: "Failed to write to Google Sheets", details: sheetsData }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, updatedRange: sheetsData.updates?.updatedRange }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in google-sheets-action:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
