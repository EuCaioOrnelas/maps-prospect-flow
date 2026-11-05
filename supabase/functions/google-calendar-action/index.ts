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

const EMAIL_RE = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { google_account_id, calendar_id, description, start_datetime, duration_minutes, attendee_email, reminder_minutes } = body;
    const summary = typeof body.summary === "string" ? body.summary.trim().slice(0, 500) : "";
    if (!summary) return json({ error: "Informe o nome do evento" }, 400);

    const supabase = adminClient();
    const caller = await resolveCaller(req, supabase, body.user_id);
    if (caller instanceof Response) return caller;

    const tok = await getGoogleAccessToken(supabase, caller.userId, google_account_id, "calendar");
    if (tok instanceof Response) return tok;

    let startTime = start_datetime ? new Date(start_datetime) : new Date();
    if (isNaN(startTime.getTime())) startTime = new Date();
    const minutes = Math.min(Math.max(Number(duration_minutes) || 30, 5), 24 * 60);
    const endTime = new Date(startTime.getTime() + minutes * 60000);

    const event: Record<string, unknown> = {
      summary,
      description: typeof description === "string" ? description.slice(0, 8000) : "",
      start: { dateTime: startTime.toISOString(), timeZone: "America/Sao_Paulo" },
      end: { dateTime: endTime.toISOString(), timeZone: "America/Sao_Paulo" },
    };

    const attendee = typeof attendee_email === "string" ? attendee_email.trim() : "";
    if (attendee && EMAIL_RE.test(attendee)) event.attendees = [{ email: attendee }];

    const rem = Number(reminder_minutes);
    if (Number.isFinite(rem) && rem > 0) {
      event.reminders = { useDefault: false, overrides: [{ method: "popup", minutes: Math.min(rem, 40320) }] };
    }

    const calId = encodeURIComponent(calendar_id || "primary");
    const sendUpdates = event.attendees ? "all" : "none";
    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calId}/events?sendUpdates=${sendUpdates}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${tok.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(event),
      },
    );
    if (!calRes.ok) return await googleFailure(calRes, "Falha ao criar o evento");
    const calData = await calRes.json();

    return json({ success: true, eventId: calData.id, htmlLink: calData.htmlLink });
  } catch (err) {
    console.error("Error in google-calendar-action:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
