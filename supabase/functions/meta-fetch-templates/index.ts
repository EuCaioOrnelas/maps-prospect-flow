import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { waba_id, access_token } = await req.json();

    if (!waba_id || !access_token) {
      return new Response(
        JSON.stringify({ error: "Missing waba_id or access_token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = `https://graph.facebook.com/v21.0/${waba_id}/message_templates?limit=100&fields=id,name,status,category,language,components`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Meta API error:", errorData);
      return new Response(
        JSON.stringify({ error: "Failed to fetch templates", details: errorData }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({ templates: data.data || [] }),
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
