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

function eventBody(ev: any) {
  const body: any = {
    summary: ev.title,
    description: ev.description || ev.notes || "",
    location: ev.location || undefined,
    start: { dateTime: new Date(ev.starts_at).toISOString(), timeZone: ev.timezone || TZ },
    end: { dateTime: new Date(ev.ends_at).toISOString(), timeZone: ev.timezone || TZ },
    status: ev.status === "cancelled" ? "cancelled" : "confirmed",
    extendedProperties: { private: { wiize_event_id: ev.id } },
  };
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

    // Desconectar: remove a configuração e TODO o rastro da sincronização
    // (eventos importados do Google + vínculos dos eventos da Wiize).
    if (action === "disconnect") {
      const { count: removed } = await admin
        .from("calendar_events")
        .delete({ count: "exact" })
        .eq("assigned_user_id", user.id)
        .eq("external_calendar_provider", "google_import");

      await admin
        .from("calendar_events")
        .update({ external_event_id: null, external_calendar_provider: null })
        .eq("assigned_user_id", user.id)
        .not("external_event_id", "is", null);

      await admin.from("calendar_google_sync").delete().eq("user_id", user.id);
      return json({ ok: true, removed: removed || 0 });
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
        push_enabled: s.push_enabled !== false,
        pull_enabled: s.pull_enabled !== false,
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

    if (action === "calendars") {
      const res = await gfetch("/users/me/calendarList?minAccessRole=writer");
      const data = await res.json();
      if (!res.ok) return json({ error: "Falha ao listar agendas", details: data }, res.status);
      return json({
        calendars: (data.items || []).map((c: any) => ({
          id: c.id,
          summary: c.summary,
          primary: !!c.primary,
        })),
      });
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

    if (action === "sync") {
      if (!settings) return json({ error: "Configure a sincronização primeiro." }, 400);
      if (settings.sync_enabled === false) return json({ ok: true, skipped: true });

      const calendarId = encodeURIComponent(settings.calendar_id || "primary");
      const days = settings.sync_window_days || 60;
      // Puxa tudo: um ano para trás e a janela escolhida (mínimo 365 dias) para frente.
      const from = new Date(Date.now() - 365 * 86400000);
      const to = new Date(Date.now() + Math.max(days, 365) * 86400000);

      let pushed = 0, updated = 0, pulled = 0, skipped = 0, errors: string[] = [];

      // ---- 1. Wiize -> Google ----
      if (settings.push_enabled !== false) {
        const { data: events } = await admin
          .from("calendar_events")
          .select("*")
          .eq("assigned_user_id", user.id)
          .gte("starts_at", from.toISOString())
          .lte("starts_at", to.toISOString());

        for (const ev of events || []) {
          try {
            if (ev.external_calendar_provider === "google_import") continue; // veio do Google
            const body = eventBody(ev);
            if (ev.external_event_id) {
              const res = await gfetch(
                `/calendars/${calendarId}/events/${encodeURIComponent(ev.external_event_id)}`,
                { method: "PATCH", body: JSON.stringify(body) },
              );
              if (res.status === 404) {
                const created = await gfetch(`/calendars/${calendarId}/events`, {
                  method: "POST",
                  body: JSON.stringify(body),
                });
                const cd = await created.json();
                if (created.ok) {
                  await admin.from("calendar_events").update({
                    external_event_id: cd.id,
                    external_calendar_provider: "google",
                  }).eq("id", ev.id);
                  pushed++;
                }
              } else if (res.ok) {
                updated++;
              } else {
                errors.push(`patch ${ev.id}: ${res.status}`);
              }
            } else {
              const res = await gfetch(`/calendars/${calendarId}/events`, {
                method: "POST",
                body: JSON.stringify(body),
              });
              const cd = await res.json();
              if (res.ok) {
                await admin.from("calendar_events").update({
                  external_event_id: cd.id,
                  external_calendar_provider: "google",
                }).eq("id", ev.id);
                pushed++;
              } else {
                errors.push(`create ${ev.id}: ${res.status}`);
              }
            }
          } catch (e) {
            errors.push(String((e as Error).message));
          }
        }
      }

      // ---- 2. Google -> Wiize ----
      if (settings.pull_enabled !== false) {
        // Bancos que ainda não receberam o valor 'google' no enum caem para 'other'.
        let googleType = "google";
        const isEnumError = (msg?: string) =>
          !!msg && msg.includes("invalid input value for enum calendar_event_type");

        const params = new URLSearchParams({
          timeMin: from.toISOString(),
          timeMax: to.toISOString(),
          singleEvents: "true",
          showDeleted: "true",
          maxResults: "2500",
          orderBy: "startTime",
        });
        let pageToken: string | undefined;
        let pages = 0;
        do {
          if (pageToken) params.set("pageToken", pageToken);
          const res = await gfetch(`/calendars/${calendarId}/events?${params.toString()}`);
          const data = await res.json();
          if (!res.ok) {
            errors.push(`list: ${res.status}`);
            break;
          }

          const items = (data.items || []) as any[];

          // Cancelamentos em lote (não precisam de leitura prévia).
          const cancelledIds = items.filter((i) => i.status === "cancelled").map((i) => i.id);
          const cancelledWiize = items
            .filter((i) => i.status === "cancelled" && i.extendedProperties?.private?.wiize_event_id)
            .map((i) => i.extendedProperties.private.wiize_event_id);
          if (cancelledWiize.length) {
            await admin.from("calendar_events").update({ status: "cancelled" }).in("id", cancelledWiize);
          }
          if (cancelledIds.length) {
            for (let i = 0; i < cancelledIds.length; i += 200) {
              await admin
                .from("calendar_events")
                .update({ status: "cancelled" })
                .eq("assigned_user_id", user.id)
                .in("external_event_id", cancelledIds.slice(i, i + 200));
            }
          }

          const candidates = items.filter(
            (i) =>
              i.status !== "cancelled" &&
              !i.extendedProperties?.private?.wiize_event_id &&
              (i.start?.dateTime || i.start?.date) &&
              (i.end?.dateTime || i.end?.date),
          );

          // Uma única leitura por página para saber o que já existe.
          const existingMap = new Map<string, string>();
          const ids = candidates.map((i) => i.id);
          for (let i = 0; i < ids.length; i += 200) {
            const { data: rows } = await admin
              .from("calendar_events")
              .select("id, external_event_id")
              .eq("assigned_user_id", user.id)
              .in("external_event_id", ids.slice(i, i + 200));
            for (const r of rows || []) existingMap.set(r.external_event_id as string, r.id as string);
          }

          for (const item of candidates) {
            const startsAt = item.start?.dateTime || `${item.start.date}T00:00:00-03:00`;
            const endsAt = item.end?.dateTime || `${item.end.date}T23:59:00-03:00`;

            const base = {
              title: item.summary || "(sem título)",
              description: item.description || null,
              starts_at: new Date(startsAt).toISOString(),
              ends_at: new Date(endsAt).toISOString(),
              all_day: !item.start?.dateTime,
              location: item.location || null,
              updated_at: new Date().toISOString(),
            };

            const existingId = existingMap.get(item.id);
            if (existingId) {
              const { error } = await admin
                .from("calendar_events")
                .update({ ...base, event_type: googleType })
                .eq("id", existingId);
              if (error && isEnumError(error.message)) {
                googleType = "other";
                await admin
                  .from("calendar_events")
                  .update({ ...base, event_type: googleType })
                  .eq("id", existingId);
              }
              continue;
            }

            const insertRow = () => ({
              ...base,
              owner_user_id: settings.owner_user_id || user.id,
              assigned_user_id: user.id,
              created_by: user.id,
              event_type: googleType,
              status: "scheduled",
              source: "import",
              timezone: TZ,
              external_calendar_provider: "google_import",
              external_event_id: item.id,
              metadata: { google_html_link: item.htmlLink || null },
            });

            let { error } = await admin.from("calendar_events").insert(insertRow());
            if (error && isEnumError(error.message)) {
              googleType = "other";
              ({ error } = await admin.from("calendar_events").insert(insertRow()));
            }
            if (error) {
              // Conflito de horário não deve interromper a importação.
              if ((error as any).code === "23P01") skipped++;
              else if (errors.length < 20) errors.push(`insert ${item.id}: ${error.message}`);
            } else pulled++;
          }

          pageToken = data.nextPageToken;
          pages++;
        } while (pageToken && pages < 40);

        // Padroniza compromissos importados anteriormente.
        await admin
          .from("calendar_events")
          .update({ event_type: googleType })
          .eq("assigned_user_id", user.id)
          .eq("external_calendar_provider", "google_import")
          .neq("event_type", googleType);
      }


      await admin.from("calendar_google_sync").update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: errors.length ? "partial" : "ok",
        last_sync_error: errors.length ? errors.slice(0, 5).join(" | ") : null,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);

      return json({ ok: true, pushed, updated, pulled, skipped, errors: errors.slice(0, 5) });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (err) {
    console.error("google-calendar-sync error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
