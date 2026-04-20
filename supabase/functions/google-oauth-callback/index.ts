import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return new Response(renderHTML("Erro", `Autorização negada: ${error}`), {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (!code || !stateParam) {
      return new Response(renderHTML("Erro", "Parâmetros inválidos"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const state = JSON.parse(atob(stateParam));
    const userId = state.user_id;

    if (!userId) {
      return new Response(renderHTML("Erro", "Usuário não identificado"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const redirectUri = `${supabaseUrl}/functions/v1/google-oauth-callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Token exchange failed:", tokenData);
      return new Response(renderHTML("Erro", "Falha ao obter tokens do Google"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Get user email from Google
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo = await userInfoRes.json();

    // Store tokens using service role
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

    const { error: upsertError } = await supabase
      .from("user_google_tokens")
      .upsert({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt,
        scopes: tokenData.scope ? tokenData.scope.split(" ") : [],
        google_email: userInfo.email || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,google_email" });

    if (upsertError) {
      console.error("Failed to save tokens:", upsertError);
      return new Response(renderHTML("Erro", "Falha ao salvar credenciais"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // If Drive scopes are present, also populate user_drive_connections
    const scopesList = tokenData.scope ? tokenData.scope.split(" ") : [];
    const hasDriveScope = scopesList.some((s: string) => s.includes("drive"));
    if (hasDriveScope) {
      await supabase
        .from("user_drive_connections")
        .upsert({
          user_id: userId,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || null,
          token_expires_at: expiresAt,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
    }

    return new Response(renderHTML("Sucesso! ✅", `Conta Google (${userInfo.email || ""}) conectada com sucesso. Você pode fechar esta janela.`), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    console.error("Error in google-oauth-callback:", err);
    return new Response(renderHTML("Erro", err.message), {
      headers: { "Content-Type": "text/html" },
    });
  }
});

function renderHTML(title: string, message: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0a0a0a; color: #fff; }
  .card { text-align: center; padding: 40px; border-radius: 16px; background: #1a1a1a; border: 1px solid #333; max-width: 400px; }
  h1 { margin-bottom: 12px; }
  p { color: #aaa; }
  .close-btn { margin-top: 20px; padding: 10px 24px; background: #7c3aed; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }
</style></head>
<body><div class="card">
  <h1>${title}</h1>
  <p>${message}</p>
  <button class="close-btn" onclick="window.close()">Fechar janela</button>
</div></body></html>`;
}
