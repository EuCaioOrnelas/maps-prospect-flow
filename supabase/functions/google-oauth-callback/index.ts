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
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (!code || !stateParam) {
      return new Response(renderHTML("Erro", "Parâmetros inválidos"), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const state = JSON.parse(atob(stateParam));
    const userId = state.user_id;

    if (!userId) {
      return new Response(renderHTML("Erro", "Usuário não identificado"), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
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
        headers: { "Content-Type": "text/html; charset=utf-8" },
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

    // Preserva o refresh_token e acumula os escopos já concedidos:
    // conectar a Agenda não pode derrubar o acesso a Sheets/Drive e vice-versa.
    const { data: existing } = await supabase
      .from("user_google_tokens")
      .select("refresh_token, scopes")
      .eq("user_id", userId)
      .eq("google_email", userInfo.email || null)
      .maybeSingle();

    const newScopes = tokenData.scope ? tokenData.scope.split(" ") : [];
    const mergedScopes = Array.from(new Set([...(existing?.scopes || []), ...newScopes]));

    const { error: upsertError } = await supabase
      .from("user_google_tokens")
      .upsert({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || existing?.refresh_token || null,
        token_expires_at: expiresAt,
        scopes: mergedScopes,
        google_email: userInfo.email || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,google_email" });

    if (upsertError) {
      console.error("Failed to save tokens:", upsertError);
      return new Response(renderHTML("Erro", "Falha ao salvar credenciais"), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
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
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    console.error("Error in google-oauth-callback:", err);
    return new Response(renderHTML("Erro", err.message), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
});

function renderHTML(title: string, message: string): string {
  const ok = !title.toLowerCase().startsWith("erro");
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f7f6; color: #0f1712; padding: 24px; }
  .card { text-align: center; padding: 40px 32px; border-radius: 20px; background: #fff; border: 1px solid #e5e9e7; box-shadow: 0 12px 40px rgba(15,23,18,.08); max-width: 420px; width: 100%; }
  .badge { width: 56px; height: 56px; border-radius: 18px; display: flex; align-items: center; justify-content: center; margin: 0 auto 18px; font-size: 26px; background: ${ok ? "#e8f7ef" : "#fdecec"}; }
  h1 { margin: 0 0 10px; font-size: 20px; font-weight: 700; }
  p { color: #5c6b63; font-size: 14px; line-height: 1.55; margin: 0; }
  .close-btn { margin-top: 24px; padding: 12px 26px; background: #0f1712; color: #fff; border: none; border-radius: 12px; cursor: pointer; font-size: 14px; font-weight: 600; width: 100%; }
</style></head>
<body><div class="card">
  <div class="badge">${ok ? "✓" : "!"}</div>
  <h1>${title}</h1>
  <p>${message}</p>
  <button class="close-btn" onclick="window.close()">Fechar janela</button>
</div>
<script>
  try {
    if (window.opener) {
      window.opener.postMessage({ source: "wiize-google-oauth", ok: ${ok} }, "*");
      if (${ok}) setTimeout(function () { window.close(); }, 1200);
    }
  } catch (e) {}
</script>
</body></html>`;
}
