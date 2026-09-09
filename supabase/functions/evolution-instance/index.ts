// Evolution API — "Número de Atendimento"
// Gerencia instâncias conectadas por QR code (criar, QR, status, configurações, logout, excluir).
// Docs: https://docs.evolutionfoundation.com.br/
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
// Identidade estável de uma linha WhatsApp (Número de Atendimento).
// Chave = DDD + 8 últimos dígitos (ignora o "9" extra e o DDI 55), para que as
// conversas salvas na Wiize sobrevivam a desconexões, exclusões e novas instâncias.
function lineKey(phone: string | null | undefined): string | null {
  let d = String(phone || "").replace(/\D/g, "");
  if (!d) return null;
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
  if (d.length < 10) return null;
  return `${d.slice(0, 2)}${d.slice(-8)}`;
}

function lineRef(phone: string | null | undefined): string | null {
  const k = lineKey(phone);
  return k ? `evo:${k}` : null;
}

// Reanexa à conexão atual todas as conversas salvas para a mesma linha
// (mesmo que pertençam a uma instância antiga ou já excluída).
async function relinkConversationsToLine(
  supabase: any,
  conn: { id: string; user_id: string; owner_user_id?: string | null; evolution_instance_name?: string | null },
  phone: string | null | undefined,
): Promise<number> {
  const ref = lineRef(phone);
  if (!ref) return 0;
  const ownerId = conn.owner_user_id || conn.user_id;

  await supabase
    .from("chat_conversations")
    .update({ phone_number_id: ref })
    .eq("waba_connection_id", conn.id)
    .neq("phone_number_id", ref);

  const { data, error } = await supabase
    .from("chat_conversations")
    .update({ waba_connection_id: conn.id })
    .eq("phone_number_id", ref)
    .or(`owner_user_id.eq.${ownerId},user_id.eq.${conn.user_id}`)
    .or(`waba_connection_id.is.null,waba_connection_id.neq.${conn.id}`)
    .select("id");
  if (error) {
    console.warn("[lineRef] relink error", error.message);
    return 0;
  }
  return (data || []).length;
}

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
  "CONTACTS_UPSERT",
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

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Consulta o estado real da sessão na Evolution.
// `transient: true` = não deu para confirmar (rede/erro do servidor). Nesses casos
// NUNCA marcamos a linha como fora do ar — só o WhatsApp pode derrubar a conexão.
async function probeState(iname: string): Promise<{ state: string; transient: boolean }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return { state: normalizeState(await evo(`/instance/connectionState/${iname}`, { method: "GET" })), transient: false };
    } catch (e) {
      const status = (e as any).status;
      if (status === 404) {
        // 404 pode ser rota instável: confirma se a instância sumiu mesmo
        try {
          const list = await evo(`/instance/fetchInstances?instanceName=${encodeURIComponent(iname)}`, { method: "GET" });
          const arr = Array.isArray(list) ? list : list ? [list] : [];
          if (arr.length) return { state: normalizeState(arr[0]?.instance || arr[0]), transient: false };
          return { state: "missing", transient: false };
        } catch {
          return { state: "close", transient: true };
        }
      }
      if (attempt === 0) { await new Promise((r) => setTimeout(r, 1500)); continue; }
      return { state: "close", transient: true };
    }
  }
  return { state: "close", transient: true };
}

// Apaga definitivamente as conversas guardadas de uma linha que ficou 30 dias fora do ar.
async function purgeEvolutionLine(admin: any, c: any) {
  try {
    const iname = c.evolution_instance_name;
    if (iname) {
      try { await evo(`/instance/logout/${iname}`, { method: "DELETE" }); } catch {}
      try { await evo(`/instance/delete/${iname}`, { method: "DELETE" }); } catch {}
    }
    const ownerId = c.owner_user_id || c.user_id;
    const ref = c.display_phone_number ? lineRef(c.display_phone_number) : null;

    const ids = new Set<string>();
    const { data: byConn } = await admin.from("chat_conversations").select("id").eq("waba_connection_id", c.id);
    (byConn || []).forEach((r: any) => ids.add(r.id));
    if (ref) {
      const { data: byLine } = await admin
        .from("chat_conversations").select("id").eq("phone_number_id", ref).eq("owner_user_id", ownerId);
      (byLine || []).forEach((r: any) => ids.add(r.id));
    }
    const list = Array.from(ids);
    for (let i = 0; i < list.length; i += 200) {
      const chunk = list.slice(i, i + 200);
      await admin.from("chat_messages").delete().in("conversation_id", chunk);
      await admin.from("chat_conversations").delete().in("id", chunk);
    }
    await admin.from("user_waba_connections").delete().eq("id", c.id);
    console.log(`[evolution-instance] purge 30d: ${c.id} (${list.length} conversas)`);
  } catch (e) {
    console.warn("[evolution-instance] purge falhou", (e as Error).message);
  }
}

// Avisa o cliente por e-mail quando a religação automática não resolve e é preciso ler o QR code.
async function sendReconnectEmail(admin: any, c: any): Promise<boolean> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return false;
  try {
    const ownerId = c.owner_user_id || c.user_id;
    const { data: profile } = await admin.from("profiles").select("email, full_name").eq("id", ownerId).maybeSingle();
    const to = profile?.email;
    if (!to) return false;
    const label = c.nickname || (c.display_phone_number ? `+${c.display_phone_number}` : "Número de Atendimento");
    const link = "https://app.wiize.com.br/numeros";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Wiize <no-reply@wiize.com.br>",
        to: [to],
        subject: `Seu Número de Atendimento ${label} está desconectado`,
        html: `
          <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
            <h2 style="font-size:18px;margin:0 0 12px">Reconecte seu WhatsApp</h2>
            <p style="font-size:14px;line-height:1.6">Olá${profile?.full_name ? `, ${profile.full_name}` : ""}. O número <strong>${label}</strong> saiu do ar e não conseguimos religar sozinhos.</p>
            <p style="font-size:14px;line-height:1.6">Enquanto isso, o chat, o CRM e a IA não recebem novas mensagens nessa linha. Abra a página de Números, clique em <strong>Reconectar</strong> e leia o novo QR code pelo celular.</p>
            <p style="margin:20px 0"><a href="${link}" style="background:#16a34a;color:#fff;text-decoration:none;padding:11px 18px;border-radius:10px;font-size:14px;font-weight:600">Reconectar agora</a></p>
            <p style="font-size:12px;color:#64748b;line-height:1.6">Se a linha ficar 30 dias sem reconectar, o histórico guardado dessas conversas será apagado.</p>
          </div>`,
      }),
    });
    return res.ok;
  } catch (e) {
    console.warn("[evolution-instance] e-mail de reconexão falhou", (e as Error).message);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Health check (sem dados sensíveis): confirma se o servidor Evolution responde.
    if (new URL(req.url).searchParams.get("ping") === "1") {
      if (!EVO_URL || !EVO_KEY) return json({ ok: false, configured: false }, 200);
      try {
        const r = await fetch(`${EVO_URL}/instance/fetchInstances`, { headers: { apikey: EVO_KEY } });
        return json({ ok: r.ok, configured: true, status: r.status }, 200);
      } catch (e) {
        return json({ ok: false, configured: true, error: String((e as Error)?.message || e) }, 200);
      }
    }

    const authHeader = req.headers.get("Authorization") || "";

    // ------------------------------------------------------------- keepalive
    // Chamado pelo cron (service role): mantém todos os Números de Atendimento
    // conectados o máximo possível — religa sessões caídas e reaplica o webhook.
    if (new URL(req.url).searchParams.get("keepalive") === "1") {
      if (authHeader !== `Bearer ${SERVICE_KEY}`) return json({ error: "Unauthorized" }, 401);
      const COLS = "id, user_id, owner_user_id, nickname, evolution_instance_name, evolution_token, evolution_state, evolution_disconnected_since, evolution_qr_alert_sent_at, last_connected_at, display_phone_number, status";
      const report: Record<string, string> = {};

      // Varredura de 30 dias: linhas removidas ou fora do ar há muito tempo perdem o histórico guardado
      const cutoff = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
      const { data: stale } = await admin
        .from("user_waba_connections").select(COLS)
        .eq("provider", "evolution")
        .not("evolution_disconnected_since", "is", null)
        .lt("evolution_disconnected_since", cutoff);
      for (const c of stale || []) {
        await purgeEvolutionLine(admin, c);
        report[(c.evolution_instance_name as string) || c.id] = "purged_30d";
      }

      const staleIds = new Set((stale || []).map((c: any) => c.id));
      const { data: conns } = await admin
        .from("user_waba_connections")
        .select(COLS)
        .eq("provider", "evolution")
        .neq("status", "disconnected");
      for (const c of conns || []) {
        const iname = c.evolution_instance_name as string;
        if (!iname || staleIds.has(c.id)) continue;
        const probe = await probeState(iname);
        if (probe.transient) { report[iname] = "skipped_unconfirmed"; continue; }
        const state = probe.state;

        if (state === "open") {
          if (c.evolution_state !== "open" || c.evolution_disconnected_since || c.evolution_qr_alert_sent_at) {
            await admin.from("user_waba_connections").update({
              evolution_state: "open",
              last_connected_at: new Date().toISOString(),
              evolution_disconnected_since: null,
              evolution_qr_alert_sent_at: null,
            }).eq("id", c.id);
            if (c.display_phone_number) await relinkConversationsToLine(admin, c as any, c.display_phone_number);
          }
          // Auto-cura do webhook: garante que eventos continuem chegando
          try {
            const wh = await evo(`/webhook/find/${iname}`, { method: "GET" });
            const url = wh?.url || wh?.webhook?.url;
            if (url !== WEBHOOK_URL || wh?.enabled === false) {
              await evo(`/webhook/set/${iname}`, {
                method: "POST",
                body: JSON.stringify({ webhook: { enabled: true, url: WEBHOOK_URL, byEvents: false, base64: true, headers: { "x-wiize-token": c.evolution_token }, events: WEBHOOK_EVENTS } }),
              });
              report[iname] = "open+webhook_fixed";
              continue;
            }
          } catch {}
          report[iname] = "open";
          continue;
        }

        // Fora do ar: marca desde quando (base para o aviso e para a limpeza de 30 dias)
        const since = c.evolution_disconnected_since ? new Date(c.evolution_disconnected_since).getTime() : Date.now();
        const patch: Record<string, unknown> = { evolution_state: state === "missing" ? "close" : state };
        if (!c.evolution_disconnected_since) patch.evolution_disconnected_since = new Date(since).toISOString();

        // 30 dias sem voltar: apaga conversas guardadas e a conexão
        if (Date.now() - since > THIRTY_DAYS_MS) {
          await purgeEvolutionLine(admin, c);
          report[iname] = "purged_30d";
          continue;
        }

        let needsQr = state === "missing";
        if (state !== "missing" && c.last_connected_at) {
          // já esteve conectada: tenta religar sem QR code
          try {
            const r = await evo(`/instance/connect/${iname}`, { method: "GET" });
            const st = r?.instance?.state ? normalizeState(r) : (r?.base64 ? "connecting" : state);
            patch.evolution_state = st;
            needsQr = !!(r?.base64 || r?.code) && st !== "open";
            report[iname] = `reconnect:${st}${needsQr ? "+qr" : ""}`;
          } catch (e) {
            report[iname] = `reconnect_failed:${(e as Error).message}`;
          }
        } else {
          report[iname] = state;
        }

        // Só avisa o cliente quando a religação automática não resolve (precisa de QR code)
        const alerted = c.evolution_qr_alert_sent_at ? new Date(c.evolution_qr_alert_sent_at).getTime() : 0;
        if (needsQr && Date.now() - alerted > 24 * 60 * 60 * 1000) {
          const sent = await sendReconnectEmail(admin, c);
          if (sent) patch.evolution_qr_alert_sent_at = new Date().toISOString();
        }

        await admin.from("user_waba_connections").update(patch).eq("id", c.id);
      }
      return json({ ok: true, checked: (conns || []).length, report });
    }
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
          syncFullHistory: false, // Wiize nunca importa histórico antigo
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
      // 1) Tenta reaproveitar a MESMA instância (credenciais podem voltar sozinhas)
      let data: any = null;
      try {
        data = await evo(`/instance/connect/${name}`, { method: "GET" });
      } catch (e) {
        console.warn("[evolution-instance] connect falhou:", (e as Error).message);
      }
      let state = data?.instance?.state ? normalizeState(data) : (data?.base64 ? "connecting" : conn.evolution_state);
      if (state === "open") {
        await admin.from("user_waba_connections").update({ evolution_state: "open" }).eq("id", conn.id);
        return json({ qr: { base64: null, code: null, pairingCode: null }, state: "open" });
      }

      // 2) Sem QR? Faz logout da sessão presa e tenta de novo na mesma instância.
      if (!data?.base64) {
        try { await evo(`/instance/logout/${name}`, { method: "DELETE" }); } catch {}
        try { data = await evo(`/instance/connect/${name}`, { method: "GET" }); } catch {}
      }

      // 3) Ainda sem QR: apaga a instância e cria uma nova para a MESMA conexão.
      if (!data?.base64) {
        const settings = sanitizeSettings(conn.evolution_settings, DEFAULT_SETTINGS);
        const newName = `wz_${ownerId.replace(/-/g, "").slice(0, 10)}_${randomSuffix()}`;
        const newToken = crypto.randomUUID().replace(/-/g, "") + randomSuffix(8);
        try { await evo(`/instance/delete/${name}`, { method: "DELETE" }); } catch {}
        const created = await evo("/instance/create", {
          method: "POST",
          body: JSON.stringify({
            instanceName: newName,
            token: newToken,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS",
            rejectCall: settings.rejectCall,
            msgCall: settings.msgCall || "",
            groupsIgnore: settings.groupsIgnore,
            alwaysOnline: settings.alwaysOnline,
            readMessages: settings.readMessages,
            readStatus: settings.readStatus,
            syncFullHistory: false,
            webhook: {
              url: WEBHOOK_URL,
              byEvents: false,
              base64: true,
              headers: { "x-wiize-token": newToken },
              events: WEBHOOK_EVENTS,
            },
          }),
        });
        try {
          await evo(`/webhook/set/${newName}`, {
            method: "POST",
            body: JSON.stringify({
              webhook: { enabled: true, url: WEBHOOK_URL, byEvents: false, base64: true, headers: { "x-wiize-token": newToken }, events: WEBHOOK_EVENTS },
            }),
          });
        } catch {}
        await admin.from("user_waba_connections").update({
          phone_number_id: newName,
          evolution_instance_name: newName,
          evolution_instance_id: created?.instance?.instanceId || created?.instance?.id || null,
          evolution_token: newToken,
          evolution_state: "connecting",
        }).eq("id", conn.id);
        let qrBase64 = created?.qrcode?.base64 || null;
        let qrCode = created?.qrcode?.code || null;
        if (!qrBase64) {
          try {
            const c2 = await evo(`/instance/connect/${newName}`, { method: "GET" });
            qrBase64 = c2?.base64 || null;
            qrCode = c2?.code || null;
          } catch {}
        }
        return json({ qr: { base64: qrBase64, code: qrCode, pairingCode: null }, state: "connecting", recreated: true });
      }

      state = "connecting";
      if (state !== conn.evolution_state) {
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
      else if (state === "close" && conn.last_connected_at) {
        // Sessão caiu: tenta religar automaticamente (credenciais ainda salvas na Evolution)
        try { await evo(`/instance/connect/${name}`, { method: "GET" }); } catch {}
      }
      const { data: updated } = await admin
        .from("user_waba_connections")
        .update(update)
        .eq("id", conn.id)
        .select("*")
        .single();
      if (state === "open" && phone) await relinkConversationsToLine(admin, conn, phone);
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
          syncFullHistory: false, // Wiize nunca importa histórico antigo
        }),
      });
      await admin.from("user_waba_connections").update({ evolution_settings: merged }).eq("id", conn.id);
      return json({ settings: merged });
    }

    // -------------------------------------------------------------- mark_read
    // Marca como lidas (ticks azuis) as últimas mensagens recebidas de uma conversa.
    if (action === "mark_read") {
      const conversationId = String(body.conversation_id || "");
      if (!conversationId) return json({ error: "conversation_id obrigatório" }, 400);
      const { data: conv } = await admin
        .from("chat_conversations")
        .select("id, contact_phone, waba_connection_id")
        .eq("id", conversationId)
        .maybeSingle();
      if (!conv || conv.waba_connection_id !== conn.id) return json({ error: "Conversa não encontrada" }, 404);
      const { data: msgs } = await admin
        .from("chat_messages")
        .select("waba_message_id")
        .eq("conversation_id", conv.id)
        .eq("direction", "inbound")
        .not("waba_message_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(20);
      const remoteJid = `${String(conv.contact_phone).replace(/\D/g, "")}@s.whatsapp.net`;
      const readMessages = (msgs || []).map((m) => ({ remoteJid, fromMe: false, id: m.waba_message_id }));
      if (readMessages.length === 0) return json({ ok: true, marked: 0 });
      try {
        await evo(`/chat/markMessageAsRead/${name}`, { method: "POST", body: JSON.stringify({ readMessages }) });
      } catch (e) {
        console.warn("[evolution-instance] markMessageAsRead:", (e as Error).message);
        return json({ ok: false, error: (e as Error).message });
      }
      return json({ ok: true, marked: readMessages.length });
    }

    // ------------------------------------------------------ fetch_profile_pic
    // Busca a foto de perfil atual do contato no WhatsApp e guarda na conversa
    // (cache no banco) para o chat carregar mais rápido.
    if (action === "fetch_profile_pic") {
      const conversationId = String(body.conversation_id || "");
      if (!conversationId) return json({ error: "conversation_id obrigatório" }, 400);
      const { data: conv } = await admin
        .from("chat_conversations")
        .select("id, contact_phone, waba_connection_id")
        .eq("id", conversationId)
        .maybeSingle();
      if (!conv || conv.waba_connection_id !== conn.id) return json({ error: "Conversa não encontrada" }, 404);
      const number = String(conv.contact_phone).replace(/\D/g, "");
      let url: string | null = null;
      try {
        const r: any = await evo(`/chat/fetchProfilePictureUrl/${name}`, {
          method: "POST",
          body: JSON.stringify({ number }),
        });
        url = r?.profilePictureUrl || r?.profilePicUrl || null;
      } catch (e) {
        console.warn("[evolution-instance] fetchProfilePictureUrl:", (e as Error).message);
        return json({ ok: false, error: "Não foi possível obter a foto agora." }, 200);
      }
      await admin
        .from("chat_conversations")
        .update({ contact_profile_pic: url })
        .eq("id", conv.id);
      return json({ ok: true, url });
    }

    // ---------------------------------------------------------- sync_webhook
    // Reaplica a configuração do webhook na instância (auto-cura).
    if (action === "sync_webhook") {
      await evo(`/webhook/set/${name}`, {
        method: "POST",
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: WEBHOOK_URL,
            byEvents: false,
            base64: true,
            headers: { "x-wiize-token": conn.evolution_token },
            events: WEBHOOK_EVENTS,
          },
        }),
      });
      return json({ ok: true });
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
    // O número sai da conta na hora (libera vaga no plano), mas as conversas ficam
    // guardadas por 30 dias caso a mesma linha volte. Depois disso são apagadas.
    if (action === "delete") {
      try { await evo(`/instance/logout/${name}`, { method: "DELETE" }); } catch {}
      try { await evo(`/instance/delete/${name}`, { method: "DELETE" }); } catch (e) {
        if ((e as any).status !== 404) console.warn("[evolution-instance] delete remote:", (e as Error).message);
      }
      await admin.from("user_waba_connections").update({
        status: "disconnected",
        evolution_state: "close",
        evolution_disconnected_since: conn.evolution_disconnected_since || new Date().toISOString(),
      }).eq("id", conn.id);
      return json({ ok: true });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    console.error("[evolution-instance] error:", e);
    return json({ error: (e as Error).message || "Erro interno" }, (e as any).status === 401 ? 502 : 500);
  }
});
