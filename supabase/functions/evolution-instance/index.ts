// Evolution API — "Número de Atendimento"
// Gerencia instâncias conectadas por QR code (criar, QR, status, configurações, logout, excluir).
// Docs: https://docs.evolutionfoundation.com.br/
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const EVO_URL = (Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/+$/, "");
const EVO_KEY = Deno.env.get("EVOLUTION_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/evolution-webhook`;

const WEBHOOK_EVENTS = [
  "QRCODE_UPDATED",
  "CONNECTION_UPDATE",
  "MESSAGES_UPSERT",
  "MESSAGES_UPDATE",
  "MESSAGES_DELETE",
  "SEND_MESSAGE",
  "CONTACTS_UPDATE",
  "LOGOUT_INSTANCE",
  "REMOVE_INSTANCE",
];

export type EvoSettings = {
  rejectCall: boolean;
  msgCall?: string;
  groupsIgnore: boolean;
  alwaysOnline: boolean;
  readMessages: boolean;
  syncFullHistory: boolean;
  readStatus: boolean;
};

const DEFAULT_SETTINGS: EvoSettings = {
  rejectCall: false,
  msgCall: "",
  groupsIgnore: true,
  alwaysOnline: false,
  readMessages: false,
  syncFullHistory: false,
  readStatus: false,
};

const SETTING_KEYS: (keyof EvoSettings)[] = [
  "rejectCall", "groupsIgnore", "alwaysOnline", "readMessages", "syncFullHistory", "readStatus",
];

async function evo(path: string, init: RequestInit & { apikey?: string } = {}) {
  if (!EVO_URL || !EVO_KEY) throw new Error("Evolution API não configurada no servidor");
  const res = await fetch(`${EVO_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: init.apikey || EVO_KEY,
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    const msg = data?.response?.message?.[0] || data?.error?.message || data?.message || data?.error || `Evolution ${res.status}`;
    const err = new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
    (err as any).status = res.status;
    (err as any).data = data;
    throw err;
  }
  return data;
}

function sanitizeSettings(input: any, base: EvoSettings): EvoSettings {
  const out: EvoSettings = { ...base };
  for (const k of SETTING_KEYS) {
    if (typeof input?.[k] === "boolean") (out as any)[k] = input[k];
  }
  if (typeof input?.msgCall === "string") out.msgCall = input.msgCall.slice(0, 500);
  return out;
}

const PLAN_V3_CUTOFF = "2026-09-03T00:00:00.000Z";
function numbersLimit(profile: any): number {
  const plan = String(profile?.plan || "free").toLowerCase();
  const v3 = profile?.created_at && new Date(profile.created_at).getTime() >= new Date(PLAN_V3_CUTOFF).getTime();
  let base = 1;
  if (plan === "start") base = v3 ? 1 : 2;
  else if (plan === "growth") base = v3 ? 2 : 5;
  else if (plan === "scale") return Infinity;
  return base + (Number(profile?.extra_numbers) || 0);
}

function randomSuffix(len = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function extractPhone(v: any): string | null {
  const owner = v?.ownerJid || v?.owner || v?.wuid || v?.instance?.owner || null;
  if (!owner) return null;
  return String(owner).split("@")[0].split(":")[0] || null;
}

function normalizeState(s: any): string {
  const st = String(s?.instance?.state || s?.state || s || "").toLowerCase();
  if (st === "open" || st === "connected") return "open";
  if (st === "connecting" || st === "qr" || st === "pairing") return "connecting";
  return "close";
}

function publicConn(c: any) {
  if (!c) return c;
  const { access_token: _a, evolution_token: _t, raw_signup_data: _r, ...rest } = c;
  return rest;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const jwt = authHeader.slice(7);
    let userId: string | null = null;
    try {
      const { data: claims } = await (admin.auth as any).getClaims?.(jwt) ?? { data: null };
      userId = (claims?.claims?.sub as string | undefined) ?? null;
    } catch { userId = null; }
    if (!userId) {
      const { data: userData } = await admin.auth.getUser(jwt);
      userId = userData?.user?.id ?? null;
    }
    if (!userId) return json({ error: "Unauthorized" }, 401);

    // Resolve owner da conta (multiusuário)
    let ownerId = userId;
    const { data: member } = await admin
      .from("account_members")
      .select("owner_user_id, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (member?.owner_user_id) ownerId = member.owner_user_id as string;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    // Helper: carregar conexão Evolution do owner
    const loadConn = async (id: string) => {
      const { data } = await admin
        .from("user_waba_connections")
        .select("*")
        .eq("id", id)
        .eq("provider", "evolution")
        .maybeSingle();
      if (!data) return null;
      const connOwner = data.owner_user_id || data.user_id;
      if (connOwner !== ownerId) return null;
      return data;
    };

    // ---------------------------------------------------------------- create
    if (action === "create") {
      const { data: profile } = await admin
        .from("profiles")
        .select("plan, created_at, extra_numbers")
        .eq("id", ownerId)
        .maybeSingle();
      const limit = numbersLimit(profile);
      const { count } = await admin
        .from("user_waba_connections")
        .select("id", { count: "exact", head: true })
        .or(`owner_user_id.eq.${ownerId},user_id.eq.${ownerId}`)
        .neq("status", "disconnected");
      if ((count || 0) >= limit) {
        return json({ error: "limit_reached", message: `Seu plano permite ${limit} número(s). Remova um número ou contrate um adicional.` }, 403);
      }

      const nickname = typeof body.nickname === "string" ? body.nickname.trim().slice(0, 80) : null;
      const settings = sanitizeSettings(body.settings, DEFAULT_SETTINGS);
      const instanceName = `wz_${ownerId.replace(/-/g, "").slice(0, 10)}_${randomSuffix()}`;
      const token = crypto.randomUUID().replace(/-/g, "") + randomSuffix(8);

      const created = await evo("/instance/create", {
        method: "POST",
        body: JSON.stringify({
          instanceName,
          token,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
          rejectCall: settings.rejectCall,
          msgCall: settings.msgCall || "",
          groupsIgnore: settings.groupsIgnore,
          alwaysOnline: settings.alwaysOnline,
          readMessages: settings.readMessages,
          readStatus: settings.readStatus,
          syncFullHistory: settings.syncFullHistory,
          webhook: {
            url: WEBHOOK_URL,
            byEvents: false,
            base64: true,
            headers: { "x-wiize-token": token },
            events: WEBHOOK_EVENTS,
          },
        }),
      });

      // Garantia extra: alguns servidores ignoram webhook no create.
      try {
        await evo(`/webhook/set/${instanceName}`, {
          method: "POST",
          body: JSON.stringify({
            webhook: {
              enabled: true,
              url: WEBHOOK_URL,
              byEvents: false,
              base64: true,
              headers: { "x-wiize-token": token },
              events: WEBHOOK_EVENTS,
            },
          }),
        });
      } catch (e) {
        console.warn("[evolution-instance] webhook/set fallback:", (e as Error).message);
      }

      const qrBase64 = created?.qrcode?.base64 || null;
      const qrCode = created?.qrcode?.code || null;
      const instanceId = created?.instance?.instanceId || created?.instance?.id || null;

      const { data: conn, error: insErr } = await admin
        .from("user_waba_connections")
        .insert({
          user_id: ownerId,
          owner_user_id: ownerId,
          provider: "evolution",
          waba_id: null,
          access_token: null,
          phone_number_id: instanceName,
          business_name: nickname || "Número de Atendimento",
          nickname,
          status: "active",
          webhook_verified_at: new Date().toISOString(),
          evolution_instance_name: instanceName,
          evolution_instance_id: instanceId,
          evolution_token: token,
          evolution_state: "connecting",
          evolution_settings: settings,
          raw_signup_data: { provider: "evolution", created },
        })
        .select("*")
        .single();

      if (insErr || !conn) {
        console.error("[evolution-instance] insert error", insErr);
        try { await evo(`/instance/delete/${instanceName}`, { method: "DELETE" }); } catch {}
        return json({ error: "Falha ao salvar conexão" }, 500);
      }

      return json({ connection: publicConn(conn), qr: { base64: qrBase64, code: qrCode } });
    }

    // Todas as demais ações exigem connection_id
    const connectionId = String(body.connection_id || "");
    if (!connectionId) return json({ error: "connection_id obrigatório" }, 400);
    const conn = await loadConn(connectionId);
    if (!conn) return json({ error: "Conexão não encontrada" }, 404);
    const name = conn.evolution_instance_name as string;

    // -------------------------------------------------------------------- qr
    if (action === "qr") {
      const data = await evo(`/instance/connect/${name}`, { method: "GET" });
      const state = data?.instance?.state ? normalizeState(data) : (data?.base64 ? "connecting" : conn.evolution_state);
      if (state && state !== conn.evolution_state) {
        await admin.from("user_waba_connections").update({ evolution_state: state }).eq("id", conn.id);
      }
      return json({
        qr: { base64: data?.base64 || null, code: data?.code || null, pairingCode: data?.pairingCode || null },
        state,
      });
    }

    // ---------------------------------------------------------------- status
    if (action === "status") {
      let state = conn.evolution_state;
      let phone = conn.display_phone_number;
      let profileName = conn.profile_name;
      let profilePic = conn.profile_pic_url;
      try {
        const st = await evo(`/instance/connectionState/${name}`, { method: "GET" });
        state = normalizeState(st);
      } catch (e) {
        if ((e as any).status === 404) state = "close";
      }
      if (state === "open") {
        try {
          const list = await evo(`/instance/fetchInstances?instanceName=${encodeURIComponent(name)}`, { method: "GET" });
          const inst = Array.isArray(list) ? list[0] : list;
          const v = inst?.instance || inst;
          phone = extractPhone(v) || phone;
          profileName = v?.profileName || v?.profile?.name || profileName;
          profilePic = v?.profilePicUrl || v?.profilePictureUrl || profilePic;
        } catch {}
      }
      const update: Record<string, unknown> = { evolution_state: state };
      if (phone) update.display_phone_number = phone;
      if (profileName) update.profile_name = profileName;
      if (profilePic) update.profile_pic_url = profilePic;
      if (state === "open") update.last_connected_at = new Date().toISOString();
      const { data: updated } = await admin
        .from("user_waba_connections")
        .update(update)
        .eq("id", conn.id)
        .select("*")
        .single();
      return json({ state, connection: publicConn(updated || conn) });
    }

    // ---------------------------------------------------------- get settings
    if (action === "get_settings") {
      let remote: any = null;
      try { remote = await evo(`/settings/find/${name}`, { method: "GET" }); } catch {}
      const merged = sanitizeSettings(remote, { ...DEFAULT_SETTINGS, ...(conn.evolution_settings || {}) });
      return json({ settings: merged });
    }

    // ---------------------------------------------------------- set settings
    if (action === "set_settings") {
      const merged = sanitizeSettings(body.settings, { ...DEFAULT_SETTINGS, ...(conn.evolution_settings || {}) });
      await evo(`/settings/set/${name}`, {
        method: "POST",
        body: JSON.stringify({
          rejectCall: merged.rejectCall,
          msgCall: merged.msgCall || "",
          groupsIgnore: merged.groupsIgnore,
          alwaysOnline: merged.alwaysOnline,
          readMessages: merged.readMessages,
          readStatus: merged.readStatus,
          syncFullHistory: merged.syncFullHistory,
        }),
      });
      await admin.from("user_waba_connections").update({ evolution_settings: merged }).eq("id", conn.id);
      return json({ settings: merged });
    }

    // ---------------------------------------------------------------- logout
    if (action === "logout") {
      try { await evo(`/instance/logout/${name}`, { method: "DELETE" }); } catch (e) {
        if ((e as any).status !== 404) throw e;
      }
      await admin.from("user_waba_connections").update({ evolution_state: "close" }).eq("id", conn.id);
      return json({ ok: true });
    }

    // ---------------------------------------------------------------- delete
    if (action === "delete") {
      try { await evo(`/instance/logout/${name}`, { method: "DELETE" }); } catch {}
      try { await evo(`/instance/delete/${name}`, { method: "DELETE" }); } catch (e) {
        if ((e as any).status !== 404) console.warn("[evolution-instance] delete remote:", (e as Error).message);
      }
      const { error: delErr } = await admin.from("user_waba_connections").delete().eq("id", conn.id);
      if (delErr) {
        await admin.from("user_waba_connections").update({ status: "disconnected", evolution_state: "close" }).eq("id", conn.id);
      }
      return json({ ok: true });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    console.error("[evolution-instance] error:", e);
    return json({ error: (e as Error).message || "Erro interno" }, (e as any).status === 401 ? 502 : 500);
  }
});
