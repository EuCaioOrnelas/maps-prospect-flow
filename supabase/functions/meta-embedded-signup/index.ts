import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

const META_APP_ID = "988774494328539";

const respond = (payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), { status: 200, headers: jsonHeaders });

const normalizeRedirectUri = (value?: string | null) => {
  if (!value) return null;

  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return url.toString();
  } catch {
    return value;
  }
};

const buildRedirectUriCandidates = (value?: string | null) => {
  const normalized = normalizeRedirectUri(value);
  if (!normalized) return [null];

  const candidates = new Set<string | null>([normalized]);

  try {
    const url = new URL(normalized);
    if (url.pathname !== "/") {
      candidates.add(url.origin);
    }
  } catch {
    // Ignore invalid URL parsing and keep the raw value only
  }

  return Array.from(candidates);
};

const exchangeCodeForToken = async (code: string, appSecret: string, redirectUri: string | null) => {
  const params = new URLSearchParams({
    client_id: META_APP_ID,
    client_secret: appSecret,
    code,
  });

  if (redirectUri) {
    params.set("redirect_uri", redirectUri);
  }

  const response = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?${params.toString()}`);
  const data = await response.json();

  return { data, redirectUri };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const META_APP_SECRET = Deno.env.get("META_APP_SECRET")!;

  try {
    const body = await req.json();
    const { code, user_id, redirect_uri } = body;

    if (!code || !user_id) {
      return respond({
        success: false,
        error: "Missing code or user_id",
        message: "Código de autorização inválido ou sessão expirada.",
      });
    }

    console.log("[meta-embedded-signup] Exchanging code for token, user:", user_id);

    const redirectUriCandidates = buildRedirectUriCandidates(redirect_uri);
    let tokenData: any = null;
    let tokenError: any = null;
    let redirectUriUsed: string | null = null;

    for (const candidate of redirectUriCandidates) {
      const result = await exchangeCodeForToken(code, META_APP_SECRET, candidate);

      if (!result.data?.error && result.data?.access_token) {
        tokenData = result.data;
        redirectUriUsed = candidate;
        break;
      }

      tokenError = result.data?.error ?? { message: "Token exchange failed" };
      const isRedirectMismatch = tokenError?.code === 100 && tokenError?.error_subcode === 36008;

      if (!isRedirectMismatch) {
        break;
      }
    }

    if (!tokenData?.access_token) {
      console.error("[meta-embedded-signup] Token exchange error:", tokenError);

      const isRedirectMismatch = tokenError?.code === 100 && tokenError?.error_subcode === 36008;

      return respond({
        success: false,
        error: "Token exchange failed",
        message: isRedirectMismatch
          ? "A Meta recusou o código de autorização por divergência no redirect URI. Tente novamente nessa mesma aba; se continuar, use o link publicado do app."
          : tokenError?.message || "Não foi possível concluir a conexão com a Meta.",
        details: tokenError,
        redirect_uri_received: redirect_uri ?? null,
        redirect_uri_tried: redirectUriCandidates,
      });
    }

    const accessToken = tokenData.access_token;
    console.log("[meta-embedded-signup] ✅ Token obtained");

    const debugUrl = `https://graph.facebook.com/v21.0/debug_token?input_token=${accessToken}&access_token=${META_APP_ID}|${META_APP_SECRET}`;
    const debugRes = await fetch(debugUrl);
    const debugData = await debugRes.json();

    console.log("[meta-embedded-signup] Debug token data:", JSON.stringify(debugData).substring(0, 500));

    let wabaId = null;
    let phoneNumberId = null;
    let businessName = null;
    let displayPhone = null;

    const granularScopes = debugData?.data?.granular_scopes || [];
    for (const scope of granularScopes) {
      if (scope.scope === "whatsapp_business_management" && scope.target_ids?.length > 0) {
        wabaId = scope.target_ids[0];
        break;
      }
    }

    if (wabaId) {
      const wabaRes = await fetch(`https://graph.facebook.com/v21.0/${wabaId}?access_token=${accessToken}`);
      const wabaData = await wabaRes.json();
      businessName = wabaData.name || null;
      console.log("[meta-embedded-signup] WABA info:", JSON.stringify(wabaData).substring(0, 300));

      const phonesRes = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/phone_numbers?access_token=${accessToken}`);
      const phonesData = await phonesRes.json();

      if (phonesData.data?.length > 0) {
        phoneNumberId = phonesData.data[0].id;
        displayPhone = phonesData.data[0].display_phone_number;
        console.log("[meta-embedded-signup] Phone:", displayPhone, "ID:", phoneNumberId);
      }
    }

    if (!wabaId || !phoneNumberId) {
      return respond({
        success: false,
        error: "Incomplete WhatsApp connection",
        message: "A Meta autorizou o acesso, mas não retornou uma conta WhatsApp Business válida para conectar.",
        details: {
          waba_id: wabaId,
          phone_number_id: phoneNumberId,
        },
        redirect_uri_used: redirectUriUsed,
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: connection, error: dbError } = await supabase
      .from("user_waba_connections")
      .upsert(
        {
          user_id,
          waba_id: wabaId,
          phone_number_id: phoneNumberId,
          display_phone_number: displayPhone,
          business_name: businessName,
          access_token: accessToken,
          status: "active",
          raw_signup_data: {
            debug_token: debugData,
            redirect_uri_received: redirect_uri ?? null,
            redirect_uri_used: redirectUriUsed,
            token_data: { ...tokenData, access_token: "***REDACTED***" },
          },
        },
        { onConflict: "user_id,waba_id" }
      )
      .select()
      .single();

    if (dbError) {
      console.error("[meta-embedded-signup] DB error:", dbError);
      return respond({
        success: false,
        error: "Failed to save connection",
        message: dbError.message,
      });
    }

    try {
      const subscribeRes = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken }),
      });
      const subscribeData = await subscribeRes.json();
      console.log("[meta-embedded-signup] Webhook subscription:", JSON.stringify(subscribeData));
    } catch (e) {
      console.error("[meta-embedded-signup] Webhook subscription error:", e);
    }

    console.log("[meta-embedded-signup] ✅ Connection saved successfully");

    return respond({
      success: true,
      connection: {
        id: connection.id,
        waba_id: connection.waba_id,
        phone_number_id: connection.phone_number_id,
        display_phone_number: connection.display_phone_number,
        business_name: connection.business_name,
        access_token: connection.access_token,
        status: connection.status,
        nickname: connection.nickname,
      },
      redirect_uri_used: redirectUriUsed,
    });
  } catch (error) {
    console.error("[meta-embedded-signup] Error:", error);
    return respond({
      success: false,
      error: "Unexpected error",
      message: error instanceof Error ? error.message : "Erro interno inesperado.",
    });
  }
});
