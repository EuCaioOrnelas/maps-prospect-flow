import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function adminClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("Configuração do serviço indisponível");
  return createClient(url, serviceKey);
}

/**
 * Resolves which user the request may act for.
 * Returns the effective user id, or a Response with the error.
 */
async function resolveCaller(
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
async function getGoogleAccessToken(
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
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    if (!clientId || !clientSecret) return json({ error: "Configuração Google indisponível" }, 500);
    const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
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
async function googleFailure(res: globalThis.Response, label: string) {
  const text = await res.text();
  let details: unknown = text;
  try { details = JSON.parse(text); } catch { /* keep text */ }
  console.error(`[google] ${label} [${res.status}]: ${text.slice(0, 500)}`);
  const msg = (details as any)?.error?.message || label;
  return json({ error: msg, status: res.status, details }, res.status === 401 ? 401 : res.status >= 500 ? 502 : 400);
}

const SHEET_ID_RE = /^[A-Za-z0-9_-]{10,200}$/;

// A1 notation needs quotes around tab names ('Minha aba'!A1).
const a1 = (tab: string, cell = "A1") => `'${tab.replace(/'/g, "''")}'!${cell}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { google_account_id, spreadsheet_id, sheet_name, data, action } = body;

    if (!spreadsheet_id || !SHEET_ID_RE.test(spreadsheet_id) || !Array.isArray(data)) {
      return json({ error: "Dados obrigatórios ausentes (planilha ou linha)" }, 400);
    }

    const supabase = adminClient();
    const caller = await resolveCaller(req, supabase, body.user_id);
    if (caller instanceof Response) return caller;

    const tok = await getGoogleAccessToken(supabase, caller.userId, google_account_id, "spreadsheets");
    if (tok instanceof Response) return tok;
    const auth = { Authorization: `Bearer ${tok.accessToken}`, "Content-Type": "application/json" };
    const base = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}`;

    // Garante que a aba exista: usa a informada, cria se faltar, ou usa a primeira.
    const metaRes = await fetch(`${base}?fields=sheets.properties(sheetId,title)`, { headers: auth });
    if (!metaRes.ok) return await googleFailure(metaRes, "Não foi possível abrir a planilha");
    const meta = await metaRes.json();
    const tabs: string[] = (meta.sheets || []).map((s: any) => s.properties.title);
    let tab = typeof sheet_name === "string" && sheet_name.trim() ? sheet_name.trim() : "";
    if (!tab) tab = tabs[0] || "Dados";
    if (!tabs.includes(tab)) {
      const addRes = await fetch(`${base}:batchUpdate`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tab } } }] }),
      });
      if (!addRes.ok) return await googleFailure(addRes, "Não foi possível criar a aba na planilha");
    }

    const values = (Array.isArray(data[0]) ? data : [data]).map((row: any[]) =>
      row.map((v) => (v == null ? "" : String(v).slice(0, 50000))));

    if (action === "clear_and_set_headers") {
      const clearRes = await fetch(`${base}/values/${encodeURIComponent(a1(tab, "A:ZZ"))}:clear`, {
        method: "POST", headers: auth, body: "{}",
      });
      if (!clearRes.ok) return await googleFailure(clearRes, "Falha ao limpar a aba");
      const updRes = await fetch(
        `${base}/values/${encodeURIComponent(a1(tab))}?valueInputOption=USER_ENTERED`,
        { method: "PUT", headers: auth, body: JSON.stringify({ values }) },
      );
      if (!updRes.ok) return await googleFailure(updRes, "Falha ao gravar os cabeçalhos");
      const upd = await updRes.json();
      return json({ success: true, sheet_name: tab, updatedRange: upd.updatedRange });
    }

    const appendRes = await fetch(
      `${base}/values/${encodeURIComponent(a1(tab))}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      { method: "POST", headers: auth, body: JSON.stringify({ values }) },
    );
    if (!appendRes.ok) return await googleFailure(appendRes, "Falha ao gravar na planilha");
    const appended = await appendRes.json();
    return json({ success: true, sheet_name: tab, updatedRange: appended.updates?.updatedRange });
  } catch (err) {
    console.error("Error in google-sheets-action:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
