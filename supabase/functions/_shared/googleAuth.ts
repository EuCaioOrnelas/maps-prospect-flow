// Shared helpers for Google integrations (Sheets, Calendar, Gmail, Drive).
// - Authenticates the caller: either the internal flow runner (service key)
//   or a signed-in user whose JWT must match the requested user_id.
// - Picks the right Google account (by id, always scoped to the user) and
//   refreshes only that account's token, never touching other accounts.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

/**
 * Resolves which user the request may act for.
 * Returns the effective user id, or a Response with the error.
 */
export async function resolveCaller(
  req: Request,
  supabase: SupabaseClient,
  requestedUserId?: string | null,
): Promise<{ userId: string; isService: boolean } | Response> {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "Não autenticado" }, 401);

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && token === serviceKey) {
    if (!requestedUserId) return json({ error: "Missing user_id" }, 400);
    return { userId: requestedUserId, isService: true };
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return json({ error: "Sessão inválida" }, 401);
  if (requestedUserId && requestedUserId !== data.user.id) {
    return json({ error: "Acesso negado" }, 403);
  }
  return { userId: data.user.id, isService: false };
}

type TokenRow = {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  scopes: string[] | null;
  google_email: string | null;
};

/**
 * Returns a valid access token for one of the user's Google accounts.
 * accountId is optional; when missing (or not owned by the user) the most
 * recent account that has the required scope is used.
 */
export async function getGoogleAccessToken(
  supabase: SupabaseClient,
  userId: string,
  accountId?: string | null,
  requiredScope?: string,
): Promise<{ accessToken: string; account: TokenRow } | Response> {
  const { data: rows, error } = await supabase
    .from("user_google_tokens")
    .select("id, user_id, access_token, refresh_token, token_expires_at, scopes, google_email")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) return json({ error: "Falha ao ler a conta Google", details: error.message }, 500);
  const accounts = (rows || []) as TokenRow[];
  if (accounts.length === 0) {
    return json({ error: "Nenhuma conta Google conectada", requiresAuth: true }, 401);
  }

  const hasScope = (a: TokenRow) =>
    !requiredScope || (a.scopes || []).some((s) => s.includes(requiredScope));

  let account = accountId ? accounts.find((a) => a.id === accountId) : undefined;
  if (!account) account = accounts.find(hasScope) || accounts[0];

  if (!hasScope(account)) {
    return json({
      error: "A conta Google conectada não deu permissão para esta função. Reconecte a conta.",
      requiresAuth: true,
    }, 401);
  }

  let accessToken = account.access_token;
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;

  // Refresh one minute early to avoid racing the expiry.
  if (!accessToken || expiresAt - 60_000 <= Date.now()) {
    if (!account.refresh_token) {
      return json({ error: "Conexão com o Google expirou. Reconecte a conta.", requiresAuth: true }, 401);
    }
    const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
        refresh_token: account.refresh_token,
        grant_type: "refresh_token",
      }),
    });
    const refreshData = await refreshRes.json().catch(() => ({}));
    if (!refreshRes.ok || !refreshData.access_token) {
      console.error("[googleAuth] refresh failed", refreshRes.status, refreshData?.error);
      return json({ error: "Conexão com o Google expirou. Reconecte a conta.", requiresAuth: true }, 401);
    }
    accessToken = refreshData.access_token;
    await supabase
      .from("user_google_tokens")
      .update({
        access_token: accessToken,
        token_expires_at: new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id);
  }

  return { accessToken, account };
}

/** Reads a Google API response and turns failures into a JSON Response. */
export async function googleFailure(res: globalThis.Response, label: string) {
  const text = await res.text();
  let details: unknown = text;
  try { details = JSON.parse(text); } catch { /* keep text */ }
  console.error(`[google] ${label} [${res.status}]: ${text.slice(0, 500)}`);
  const msg = (details as any)?.error?.message || label;
  return json({ error: msg, status: res.status, details }, res.status === 401 ? 401 : res.status >= 500 ? 502 : 400);
}
