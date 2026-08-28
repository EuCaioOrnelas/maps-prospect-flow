// Wiize — Conexão de contas profissionais do Instagram (Meta oficial)
// Ações: list | connect | disconnect | refresh
// Autocontido (sem _shared).
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const META_APP_ID = Deno.env.get("META_APP_ID") ?? "988774494328539";
const META_APP_SECRET = Deno.env.get("META_APP_SECRET") ?? "";
const GRAPH = "https://graph.facebook.com/v21.0";
const MAX_ACCOUNTS = 2;
const IG_SUBSCRIBED_FIELDS = "messages,messaging_postbacks,messaging_optins,message_reactions,comments,mentions";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Campos públicos — o access_token nunca sai daqui. */
const PUBLIC_COLS =
  "id,ig_user_id,ig_username,ig_name,profile_picture_url,page_id,page_name,status,last_error,token_expires_at,created_at";

async function graph(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${GRAPH}${path}?${qs}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Meta ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const { data: claims, error: authError } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (authError || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const { data: profile } = await supabase.from("profiles").select("id,owner_user_id").eq("id", userId).maybeSingle();
    const ownerId = (profile?.owner_user_id as string) || userId;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "list");

    // ---------------- LIST ----------------
    if (action === "list") {
      const { data } = await supabase
        .from("user_instagram_connections")
        .select(PUBLIC_COLS)
        .eq("owner_user_id", ownerId)
        .order("created_at", { ascending: true });
      return json({ success: true, accounts: data || [], max: MAX_ACCOUNTS });
    }

    // ---------------- DISCONNECT ----------------
    if (action === "disconnect") {
      const id = String(body.connection_id || "");
      if (!id) return json({ error: "connection_id obrigatório" }, 400);
      const { error } = await supabase
        .from("user_instagram_connections")
        .delete()
        .eq("id", id)
        .eq("owner_user_id", ownerId);
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    // ---------------- CONNECT ----------------
    if (action === "connect") {
      if (!META_APP_SECRET) return json({ error: "META_APP_SECRET não configurado" }, 500);
      const code = String(body.code || "");
      const redirectUri = String(body.redirect_uri || "");
      if (!code) return json({ error: "code obrigatório" }, 400);

      // 1) code -> user access token
      const tokenRes = await graph("/oauth/access_token", {
        client_id: META_APP_ID,
        client_secret: META_APP_SECRET,
        redirect_uri: redirectUri,
        code,
      });
      let userToken = String(tokenRes.access_token || "");
      if (!userToken) return json({ error: "Meta não retornou token" }, 400);

      // 2) troca por token de longa duração
      try {
        const longLived = await graph("/oauth/access_token", {
          grant_type: "fb_exchange_token",
          client_id: META_APP_ID,
          client_secret: META_APP_SECRET,
          fb_exchange_token: userToken,
        });
        if (longLived.access_token) userToken = String(longLived.access_token);
      } catch (e) {
        console.warn("[instagram-connect] long-lived falhou, usando token curto:", e);
      }

      // 3) páginas + contas profissionais do Instagram vinculadas
      const pages = await graph("/me/accounts", {
        access_token: userToken,
        fields: "id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}",
        limit: "50",
      });

      const candidates = (pages.data || [])
        .filter((p: any) => p.instagram_business_account?.id)
        .map((p: any) => ({
          page_id: String(p.id),
          page_name: String(p.name || ""),
          page_token: String(p.access_token || userToken),
          ig_user_id: String(p.instagram_business_account.id),
          ig_username: p.instagram_business_account.username || null,
          ig_name: p.instagram_business_account.name || null,
          profile_picture_url: p.instagram_business_account.profile_picture_url || null,
        }));

      if (!candidates.length) {
        return json(
          {
            error:
              "Nenhuma conta profissional do Instagram vinculada a uma Página do Facebook foi encontrada. Converta o perfil para Empresa/Criador e vincule-o a uma Página.",
          },
          400,
        );
      }

      const { data: existing } = await supabase
        .from("user_instagram_connections")
        .select("id,ig_user_id")
        .eq("owner_user_id", ownerId);
      const existingIds = new Set((existing || []).map((r: any) => r.ig_user_id));
      let slots = MAX_ACCOUNTS - (existing?.length || 0);

      const connected: string[] = [];
      const updated: string[] = [];
      const skipped: string[] = [];

      for (const c of candidates) {
        // Assina os webhooks da página (mensagens + comentários)
        try {
          const subRes = await fetch(`${GRAPH}/${c.page_id}/subscribed_apps`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subscribed_fields: IG_SUBSCRIBED_FIELDS, access_token: c.page_token }),
          });
          if (!subRes.ok) {
            console.error("[instagram-connect] subscribe falhou:", c.page_id, await subRes.text());
          }
        } catch (e) {
          console.error("[instagram-connect] subscribe erro:", e);
        }

        if (existingIds.has(c.ig_user_id)) {
          await supabase
            .from("user_instagram_connections")
            .update({
              access_token: c.page_token,
              ig_username: c.ig_username,
              ig_name: c.ig_name,
              profile_picture_url: c.profile_picture_url,
              page_id: c.page_id,
              page_name: c.page_name,
              status: "active",
              last_error: null,
              last_checked_at: new Date().toISOString(),
            })
            .eq("owner_user_id", ownerId)
            .eq("ig_user_id", c.ig_user_id);
          updated.push(c.ig_username || c.ig_user_id);
          continue;
        }

        if (slots <= 0) {
          skipped.push(c.ig_username || c.ig_user_id);
          continue;
        }

        const { error } = await supabase.from("user_instagram_connections").insert({
          user_id: userId,
          owner_user_id: ownerId,
          ig_user_id: c.ig_user_id,
          ig_username: c.ig_username,
          ig_name: c.ig_name,
          profile_picture_url: c.profile_picture_url,
          page_id: c.page_id,
          page_name: c.page_name,
          access_token: c.page_token,
          status: "active",
          last_checked_at: new Date().toISOString(),
        });
        if (error) {
          if (String(error.message).includes("instagram_connection_limit_reached")) {
            skipped.push(c.ig_username || c.ig_user_id);
            slots = 0;
            continue;
          }
          console.error("[instagram-connect] insert erro:", error);
          skipped.push(c.ig_username || c.ig_user_id);
          continue;
        }
        slots--;
        connected.push(c.ig_username || c.ig_user_id);
      }

      const { data: accounts } = await supabase
        .from("user_instagram_connections")
        .select(PUBLIC_COLS)
        .eq("owner_user_id", ownerId)
        .order("created_at", { ascending: true });

      return json({ success: true, connected, updated, skipped, accounts: accounts || [], max: MAX_ACCOUNTS });
    }

    // ---------------- REFRESH (health check) ----------------
    if (action === "refresh") {
      const { data: conns } = await supabase
        .from("user_instagram_connections")
        .select("id,ig_user_id,access_token")
        .eq("owner_user_id", ownerId);

      for (const c of conns || []) {
        try {
          const me = await graph(`/${c.ig_user_id}`, {
            access_token: c.access_token as string,
            fields: "id,username,name,profile_picture_url",
          });
          await supabase
            .from("user_instagram_connections")
            .update({
              status: "active",
              last_error: null,
              ig_username: me.username || null,
              ig_name: me.name || null,
              profile_picture_url: me.profile_picture_url || null,
              last_checked_at: new Date().toISOString(),
            })
            .eq("id", c.id);
        } catch (e) {
          await supabase
            .from("user_instagram_connections")
            .update({
              status: "error",
              last_error: e instanceof Error ? e.message.slice(0, 300) : "Erro desconhecido",
              last_checked_at: new Date().toISOString(),
            })
            .eq("id", c.id);
        }
      }

      const { data: accounts } = await supabase
        .from("user_instagram_connections")
        .select(PUBLIC_COLS)
        .eq("owner_user_id", ownerId)
        .order("created_at", { ascending: true });
      return json({ success: true, accounts: accounts || [], max: MAX_ACCOUNTS });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    console.error("[instagram-connect]", e);
    return json({ error: e instanceof Error ? e.message : "Erro" }, 500);
  }
});
