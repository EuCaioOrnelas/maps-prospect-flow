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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { action, spreadsheet_id, google_account_id } = body;
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
    const tabName = typeof body.tab_name === "string" && body.tab_name.trim()
      ? body.tab_name.trim().slice(0, 100)
      : "Dados";

    const supabase = adminClient();
    const caller = await resolveCaller(req, supabase, body.user_id);
    if (caller instanceof Response) return caller;

    const tok = await getGoogleAccessToken(supabase, caller.userId, google_account_id, "spreadsheets");
    if (tok instanceof Response) return tok;
    const authHeader = { Authorization: `Bearer ${tok.accessToken}` };

    // ── Criar planilha ──
    if (action === "create") {
      if (!title) return json({ error: "Informe o nome da planilha" }, 400);
      const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          properties: { title, locale: "pt_BR", timeZone: "America/Sao_Paulo" },
          sheets: [{ properties: { title: tabName, gridProperties: { frozenRowCount: 1 } } }],
        }),
      });
      if (!createRes.ok) return await googleFailure(createRes, "Falha ao criar planilha");
      const createData = await createRes.json();
      const createdTab = createData.sheets?.[0]?.properties?.title || tabName;
      return json({
        success: true,
        spreadsheet: {
          id: createData.spreadsheetId,
          name: createData.properties?.title || title,
          url: createData.spreadsheetUrl,
          tab_name: createdTab,
        },
      });
    }

    // ── Abas de uma planilha ──
    if (action === "get_sheets") {
      if (!spreadsheet_id || !SHEET_ID_RE.test(spreadsheet_id)) return json({ error: "Planilha inválida" }, 400);
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet_id}?fields=properties.title,sheets.properties(sheetId,title)`,
        { headers: authHeader },
      );
      if (!res.ok) return await googleFailure(res, "Falha ao ler as abas da planilha");
      const data = await res.json();
      return json({
        name: data.properties?.title,
        sheets: (data.sheets || []).map((s: any) => ({ id: s.properties.sheetId, title: s.properties.title })),
      });
    }

    // ── Listar planilhas ──
    const byId = new Map<string, { id: string; name: string; modifiedTime?: string; url?: string; source: string }>();

    // 1) Planilhas já usadas nos fluxos desta conta (sempre aparecem, mesmo sem acesso ao Drive).
    const { data: flows } = await supabase
      .from("wa_automation_flows")
      .select("id")
      .or(`user_id.eq.${caller.userId},owner_user_id.eq.${caller.userId}`)
      .limit(1000);
    const flowIds = (flows || []).map((f: any) => f.id);
    if (flowIds.length) {
      const { data: nodes } = await supabase
        .from("wa_flow_nodes")
        .select("config")
        .in("flow_id", flowIds)
        .eq("node_type", "google_sheets");
      for (const n of nodes || []) {
        const c: any = n.config || {};
        if (!c.spreadsheet_id || byId.has(c.spreadsheet_id)) continue;
        if (c.google_account_id && c.google_account_id !== tok.account.id) continue;
        byId.set(c.spreadsheet_id, {
          id: c.spreadsheet_id,
          name: c.spreadsheet_name || "Planilha usada em fluxo",
          url: `https://docs.google.com/spreadsheets/d/${c.spreadsheet_id}/edit`,
          source: "wiize",
        });
      }
    }

    // 2) Planilhas visíveis no Drive (criadas pela Wiize ou liberadas pela conta).
    let driveWarning: string | null = null;
    const files: any[] = [];
    let pageToken = "";
    for (let page = 0; page < 4; page++) {
      const params = new URLSearchParams({
        q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
        orderBy: "modifiedTime desc",
        pageSize: "100",
        fields: "nextPageToken,files(id,name,modifiedTime,webViewLink)",
        supportsAllDrives: "true",
        includeItemsFromAllDrives: "true",
      });
      if (pageToken) params.set("pageToken", pageToken);
      const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, { headers: authHeader });
      if (!driveRes.ok) {
        const t = await driveRes.text();
        console.warn("[google-list-spreadsheets] Drive list failed", driveRes.status, t.slice(0, 300));
        driveWarning = "Para ver todas as planilhas do Google, reconecte a conta Google.";
        break;
      }
      const d = await driveRes.json();
      files.push(...(d.files || []));
      if (!d.nextPageToken) break;
      pageToken = d.nextPageToken;
    }

    const list: any[] = files.map((f) => ({
      id: f.id, name: f.name, modifiedTime: f.modifiedTime, url: f.webViewLink, source: "drive",
    }));
    for (const item of list) {
      const prev = byId.get(item.id);
      byId.set(item.id, prev ? { ...item, source: "wiize" } : item);
    }

    const spreadsheets = Array.from(byId.values()).sort((a, b) =>
      (b.modifiedTime || "").localeCompare(a.modifiedTime || ""));

    return json({ spreadsheets, warning: driveWarning, google_email: tok.account.google_email });
  } catch (err) {
    console.error("Error in google-list-spreadsheets:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
