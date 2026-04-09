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

    const { user_id, to, cc, bcc, subject, body_text, body_html } = await req.json();

    if (!user_id || !to || !subject) {
      return new Response(JSON.stringify({ error: "Missing required fields: user_id, to, subject" }), {
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

    // Build CC and BCC headers
    const ccList = Array.isArray(cc) ? cc.join(", ") : (cc || "");
    const bccList = Array.isArray(bcc) ? bcc.join(", ") : (bcc || "");

    // Build email headers
    const headers: string[] = [
      `MIME-Version: 1.0`,
      `To: ${to}`,
      `Subject: ${subject}`,
    ];
    if (ccList) headers.push(`Cc: ${ccList}`);
    if (bccList) headers.push(`Bcc: ${bccList}`);

    // Build email in RFC 2822 format
    const contentType = body_html
      ? `Content-Type: text/html; charset="UTF-8"`
      : `Content-Type: text/plain; charset="UTF-8"`;
    headers.unshift(contentType);

    const emailContent = [...headers, "", body_html || body_text || ""].join("\r\n");

    // Base64url encode
    const encodedEmail = btoa(unescape(encodeURIComponent(emailContent)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const gmailRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: encodedEmail }),
    });

    const gmailData = await gmailRes.json();

    if (!gmailRes.ok) {
      console.error("Gmail API error:", gmailData);
      return new Response(JSON.stringify({ error: "Failed to send email", details: gmailData }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, messageId: gmailData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in gmail-send-action:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
