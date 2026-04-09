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

    const { user_id, action, spreadsheet_id, title, tab_name } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "Missing user_id" }), {
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
        return new Response(JSON.stringify({ error: "Token expired", requiresAuth: true }), {
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

    // Action: create a new spreadsheet
    if (action === "create") {
      const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: { title: title || "Wiize - Leads" },
          sheets: [{ properties: { title: tab_name || "Dados" } }],
        }),
      });

      const createData = await createRes.json();

      if (!createRes.ok) {
        return new Response(JSON.stringify({ error: "Failed to create spreadsheet", details: createData }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        spreadsheet: {
          id: createData.spreadsheetId,
          name: createData.properties?.title,
          url: createData.spreadsheetUrl,
        },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Action: get sheets (tabs) from a spreadsheet
    if (action === "get_sheets" && spreadsheet_id) {
      const sheetsRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}?fields=sheets.properties`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const sheetsData = await sheetsRes.json();

      if (!sheetsRes.ok) {
        return new Response(JSON.stringify({ error: "Failed to get sheets", details: sheetsData }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const sheets = (sheetsData.sheets || []).map((s: any) => ({
        id: s.properties.sheetId,
        title: s.properties.title,
      }));

      return new Response(JSON.stringify({ sheets }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: list spreadsheets from Drive
    const driveRes = await fetch(
      "https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'&orderBy=modifiedTime desc&pageSize=50&fields=files(id,name,modifiedTime,webViewLink)",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const driveData = await driveRes.json();

    if (!driveRes.ok) {
      console.error("Drive API error:", driveData);
      return new Response(JSON.stringify({ error: "Failed to list spreadsheets", details: driveData }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const spreadsheets = (driveData.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      modifiedTime: f.modifiedTime,
      url: f.webViewLink,
    }));

    return new Response(JSON.stringify({ spreadsheets }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in google-list-spreadsheets:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
