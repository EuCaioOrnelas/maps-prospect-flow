import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

const respond = (payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), { status: 200, headers: jsonHeaders });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { waba_id, access_token } = await req.json();

    if (!waba_id || !access_token) {
      return respond({
        success: false,
        templates: [],
        token_expired: false,
        error: "Missing waba_id or access_token",
      });
    }

    const url = `https://graph.facebook.com/v21.0/${waba_id}/message_templates?limit=100&fields=id,name,status,category,language,components`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Meta API error:", data);
      const details = data?.error;
      const isTokenExpired = details?.code === 190 || details?.error_subcode === 463;

      return respond({
        success: false,
        templates: [],
        token_expired: isTokenExpired,
        error: isTokenExpired ? "Token expired" : "Failed to fetch templates",
        details: data,
      });
    }

    return respond({
      success: true,
      templates: data.data || [],
      token_expired: false,
    });
  } catch (err) {
    console.error("Error:", err);
    return respond({
      success: false,
      templates: [],
      token_expired: false,
      error: err instanceof Error ? err.message : "Unexpected error",
    });
  }
});
