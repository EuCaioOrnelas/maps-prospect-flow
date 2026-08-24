import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const TZ = "America/Sao_Paulo";

/** Renova o access_token quando expirado e devolve o token válido. */
async function ensureAccessToken(admin: any, token: any): Promise<string | null> {
  if (new Date(token.token_expires_at) > new Date(Date.now() + 60_000)) {
    return token.access_token;
  }
  if (!token.refresh_token) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      refresh_token: token.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    console.error("refresh failed", data);
    return null;
  }
  await admin
    .from("user_google_tokens")
    .update({
      access_token: data.access_token,
      token_expires_at: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", token.id);
  return data.access_token;
}

/** Monta o corpo do evento do Google a partir do compromisso da Wiize. */
function eventBody(ev: any) {
  const parts = [ev.description, ev.notes, ev.company_name ? `Empresa: ${ev.company_name}` : null,
    ev.contact_name ? `Contato: ${ev.contact_name}` : null,
    ev.contact_phone ? `Telefone: ${ev.contact_phone}` : null]
    .filter(Boolean);

  const body: any = {
    summary: ev.title,
    description: parts.join("\n") || "",
    location: ev.location || undefined,
    start: { dateTime: new Date(ev.starts_at).toISOString(), timeZone: ev.timezone || TZ },
    end: { dateTime: new Date(ev.ends_at).toISOString(), timeZone: ev.timezone || TZ },
    status: ev.status === "cancelled" ? "cancelled" : "confirmed",
    extendedProperties: { private: { wiize_event_id: ev.id } },
  };

  const reminders = Array.isArray(ev.reminders)
    ? ev.reminders.map((m: any) => Number(m)).filter((m: number) => Number.isFinite(m) && m > 0)
    : [];
  if (reminders.length) {
    body.reminders = {
      useDefault: false,
      overrides: reminders.slice(0, 5).map((minutes: number) => ({ method: "popup", minutes })),
    };
  }

  if (ev.contact_email) body.attendees = [{ email: ev.contact_email }];
  return body;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not authenticated" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Invalid session" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const payload = await req.json().catch(() => ({}));
    const action = payload.action || "status";

    // ---------- contas Google disponíveis + configuração atual ----------
    const loadState = async () => {
      const { data: accounts } = await admin
        .from("user_google_tokens")
        .select("id, google_email, scopes, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      const { data: settings } = await admin
        .from("calendar_google_sync")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      return {
        accounts: (accounts || []).map((a: any) => ({
          id: a.id,
          email: a.google_email,
          has_calendar_scope: (a.scopes || []).some((s: string) => s.includes("calendar")),
        })),
        settings: settings || null,
      };
    };

    if (action === "status") return json(await loadState());

    // Desconectar: apaga a configuração e limpa os vínculos dos compromissos da Wiize.
    if (action === "disconnect") {
      await admin
        .from("calendar_events")
        .update({ external_event_id: null, external_calendar_provider: null })
        .eq("assigned_user_id", user.id)
        .not("external_event_id", "is", null);

      await admin.from("calendar_google_sync").delete().eq("user_id", user.id);
      return json({ ok: true });
    }

    if (action === "save") {
      const s = payload.settings || {};
      if (!s.google_token_id) return json({ error: "Selecione uma conta Google." }, 400);

      const { data: token } = await admin
        .from("user_google_tokens")
        .select("id, google_email")
        .eq("id", s.google_token_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!token) return json({ error: "Conta Google não encontrada." }, 404);

      const { data: prof } = await admin
        .from("profiles")
        .select("parent_owner_id")
        .eq("id", user.id)
        .maybeSingle();

      const row = {
        user_id: user.id,
        owner_user_id: prof?.parent_owner_id || user.id,
        google_token_id: token.id,
        google_email: token.google_email,
        calendar_id: s.calendar_id || "primary",
        calendar_name: s.calendar_name || null,
        sync_enabled: s.sync_enabled !== false,
        push_enabled: true,
        // MVP: envio unidirecional. Nada é importado do Google.
        pull_enabled: false,
        pull_all_calendars: false,
        reminder_enabled: false,
        reminder_minutes: 30,
        sync_window_days: Math.min(Math.max(Number(s.sync_window_days) || 60, 7), 365),
        default_event_type: s.default_event_type || "meeting",
        updated_at: new Date().toISOString(),
      };
      const { error } = await admin
        .from("calendar_google_sync")
        .upsert(row, { onConflict: "user_id" });
      if (error) return json({ error: error.message }, 500);
      return json(await loadState());
    }

    // ---------- ações que precisam de token válido ----------
    const { data: settings } = await admin
      .from("calendar_google_sync")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const tokenId = payload.google_token_id || settings?.google_token_id;
    if (!tokenId) return json({ error: "Conecte uma conta Google primeiro.", requiresAuth: true }, 400);

    const { data: token } = await admin
      .from("user_google_tokens")
      .select("*")
      .eq("id", tokenId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!token) return json({ error: "Conta Google não encontrada.", requiresAuth: true }, 404);

    const accessToken = await ensureAccessToken(admin, token);
    if (!accessToken) return json({ error: "Sessão do Google expirada. Reconecte a conta.", requiresAuth: true }, 401);

    const gfetch = (path: string, init: RequestInit = {}) =>
      fetch(`https://www.googleapis.com/calendar/v3${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...(init.headers || {}),
        },
      });

    /** Todas as agendas graváveis da conta. */
    const listCalendars = async () => {
      const all: any[] = [];
      let pageToken: string | undefined;
      let pages = 0;
      do {
        const qs = new URLSearchParams({ maxResults: "250", showHidden: "true" });
        if (pageToken) qs.set("pageToken", pageToken);
        const res = await gfetch(`/users/me/calendarList?${qs.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || `Google respondeu ${res.status}`);
        all.push(...(data.items || []));
        pageToken = data.nextPageToken;
        pages++;
      } while (pageToken && pages < 10);
      return all;
    };

    if (action === "calendars") {
      try {
        const items = await listCalendars();
        return json({
          calendars: items
            .map((c: any) => ({
              id: c.id,
              summary: c.summaryOverride || c.summary,
              primary: !!c.primary,
              writable: c.accessRole === "owner" || c.accessRole === "writer",
            }))
            .filter((c: any) => c.writable),
        });
      } catch (e) {
        return json({ error: `Falha ao listar agendas: ${(e as Error).message}` }, 500);
      }
    }

    // Confere se a conexão continua válida (token + permissão de agenda).
    if (action === "verify") {
      const res = await gfetch("/users/me/calendarList?maxResults=1");
      if (res.status === 401 || res.status === 403) {
        return json({ healthy: false, requiresAuth: true, reason: "Autorização do Google expirada." });
      }
      if (!res.ok) {
        return json({ healthy: false, reason: `Google respondeu ${res.status}.` });
      }
      return json({ healthy: true, email: token.google_email });
    }

    const targetCalendar = encodeURIComponent(settings?.calendar_id || "primary");

    /** Cria o evento no Google; em 403 por convidados, repete sem attendees. */
    const createOnGoogle = async (ev: any) => {
      let res = await gfetch(`/calendars/${targetCalendar}/events`, {
        method: "POST",
        body: JSON.stringify(eventBody(ev)),
      });
      if (res.status === 403) {
        const retry = eventBody(ev);
        delete retry.attendees;
        res = await gfetch(`/calendars/${targetCalendar}/events`, {
          method: "POST",
          body: JSON.stringify(retry),
        });
      }
      return res;
    };

    /** Envia (cria ou atualiza) um compromisso da Wiize para o Google. */
    const pushEvent = async (ev: any) => {
      if (ev.external_event_id) {
        let res = await gfetch(
          `/calendars/${targetCalendar}/events/${encodeURIComponent(ev.external_event_id)}`,
          { method: "PATCH", body: JSON.stringify(eventBody(ev)) },
        );
        if (res.ok) return { result: "updated" as const };
        if (res.status === 403) {
          const retry = eventBody(ev);
          delete retry.attendees;
          res = await gfetch(
            `/calendars/${targetCalendar}/events/${encodeURIComponent(ev.external_event_id)}`,
            { method: "PATCH", body: JSON.stringify(retry) },
          );
          if (res.ok) return { result: "updated" as const };
        }
        if (res.status !== 404 && res.status !== 410) {
          const body = await res.json().catch(() => ({}));
          return { result: "error" as const, message: `atualização "${ev.title}": ${body?.error?.message || res.status}` };
        }
        // 404/410: sumiu do Google, recria abaixo.
      }

      const created = await createOnGoogle(ev);
      const cd = await created.json().catch(() => ({}));
      if (created.ok && cd.id) {
        await admin
          .from("calendar_events")
          .update({ external_event_id: cd.id, external_calendar_provider: "google" })
          .eq("id", ev.id);
        return { result: "pushed" as const };
      }
      return { result: "error" as const, message: `envio "${ev.title}": ${cd?.error?.message || created.status}` };
    };

    // Envio imediato de um único compromisso (criação/edição na Wiize).
    if (action === "push_event") {
      if (settings?.sync_enabled === false) return json({ ok: true, skipped: true });
      const eventId = String(payload.event_id || "");
      if (!eventId) return json({ error: "event_id obrigatório" }, 400);

      const { data: ev } = await admin
        .from("calendar_events")
        .select("*")
        .eq("id", eventId)
        .eq("assigned_user_id", user.id)
        .maybeSingle();
      if (!ev) return json({ ok: true, skipped: true });

      const res = await pushEvent(ev);
      if (res.result === "error") return json({ ok: false, error: res.message }, 502);
      return json({ ok: true, result: res.result });
    }

    // Remove do Google um compromisso excluído na Wiize.
    if (action === "delete_event") {
      const externalId = String(payload.external_event_id || "");
      if (!externalId) return json({ ok: true, skipped: true });
      const res = await gfetch(
        `/calendars/${targetCalendar}/events/${encodeURIComponent(externalId)}`,
        { method: "DELETE" },
      );
      if (res.ok || res.status === 404 || res.status === 410) return json({ ok: true });
      const body = await res.json().catch(() => ({}));
      return json({ ok: false, error: body?.error?.message || res.status }, 502);
    }

    // Sincronização em lote: apenas Wiize -> Google.
    if (action === "sync") {
      if (!settings) return json({ error: "Configure a sincronização primeiro." }, 400);
      if (settings.sync_enabled === false) return json({ ok: true, skipped: true });

      const days = settings.sync_window_days || 60;
      const from = new Date(Date.now() - 30 * 86400000);
      const to = new Date(Date.now() + Math.max(days, 30) * 86400000);

      let pushed = 0, updated = 0;
      const errors: string[] = [];

      const { data: events } = await admin
        .from("calendar_events")
        .select("*")
        .eq("assigned_user_id", user.id)
        .neq("source", "import")
        .gte("starts_at", from.toISOString())
        .lte("starts_at", to.toISOString());

      for (const ev of events || []) {
        try {
          const res = await pushEvent(ev);
          if (res.result === "pushed") pushed++;
          else if (res.result === "updated") updated++;
          else if (errors.length < 20) errors.push(res.message);
        } catch (e) {
          if (errors.length < 20) errors.push(String((e as Error).message));
        }
      }

      await admin.from("calendar_google_sync").update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: errors.length ? "partial" : "ok",
        last_sync_error: errors.length ? errors.slice(0, 5).join(" | ") : null,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);

      return json({ ok: true, pushed, updated, errors: errors.slice(0, 5) });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (err) {
    console.error("google-calendar-sync error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
