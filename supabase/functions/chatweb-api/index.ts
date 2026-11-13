// Wiize ChatWeb — API pública do visitante (sem login).
// O visitante nunca acessa tabelas: tudo passa por aqui com validação de sessão.
// Ações: config | start | resume | send | poll
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/;
const VISITOR_RE = /^[A-Za-z0-9_-]{8,64}$/;
const MAX_TEXT = 2000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } });
}

function cleanText(v: unknown): string {
  // Texto puro: remove caracteres de controle (exceto quebra de linha) e limita tamanho.
  return String(v ?? "").replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "").trim().slice(0, MAX_TEXT);
}

async function sha256(v: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function hostOf(origin: string | null | undefined): string | null {
  try { return origin ? new URL(origin).hostname.toLowerCase() : null; } catch { return null; }
}

/** Restrição de domínio (não é prova de identidade — apenas bloqueia incorporações não autorizadas). */
function domainAllowed(cfg: any, hostOrigin: string | null): boolean {
  const list: string[] = (cfg.allowed_domains || []).map((d: string) => d.toLowerCase().trim()).filter(Boolean);
  if (!list.length || !hostOrigin) return true;
  const host = hostOf(hostOrigin);
  if (!host) return false;
  return list.some((d) => host === d || host.endsWith(`.${d.replace(/^\*\./, "")}`));
}

async function rateLimit(id: string, endpoint: string, max: number, windowSec: number) {
  const { data } = await db.rpc("check_rate_limit", { p_identifier: id, p_endpoint: endpoint, p_max_requests: max, p_window_seconds: windowSec });
  return (data as any)?.allowed !== false;
}

async function loadConfig(slug: string) {
  if (!SLUG_RE.test(slug)) return null;
  const { data } = await db.from("chatweb_configurations").select("*").eq("slug", slug).maybeSingle();
  return data;
}

const avatarCache = new Map<string, { url: string; exp: number }>();
async function avatarUrl(path: string | null) {
  if (!path) return null;
  const hit = avatarCache.get(path);
  if (hit && hit.exp > Date.now()) return hit.url;
  const { data } = await db.storage.from("chatweb-avatars").createSignedUrl(path, 60 * 60 * 24);
  if (data?.signedUrl) { if (avatarCache.size > 500) avatarCache.clear(); avatarCache.set(path, { url: data.signedUrl, exp: Date.now() + 6 * 3600_000 }); }
  return data?.signedUrl || null;
}

async function publicConfig(cfg: any) {
  return {
    slug: cfg.slug,
    display_name: cfg.display_name,
    description: cfg.description,
    avatar_url: await avatarUrl(cfg.avatar_path),
    theme: cfg.theme_config || {},
    widget: cfg.widget_config || {},
    welcome_message: cfg.welcome_message,
    input_placeholder: cfg.input_placeholder,
    enabled: cfg.enabled,
  };
}

async function sessionByToken(token: unknown) {
  const t = String(token || "");
  if (t.length < 30 || t.length > 100) return null;
  const { data } = await db.from("chatweb_sessions").select("*").eq("session_token_hash", await sha256(t)).maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now() && data.status === "active") {
    await db.from("chatweb_sessions").update({ status: "abandoned", ended_at: new Date().toISOString() }).eq("id", data.id);
    data.status = "abandoned";
  }
  return data;
}

async function syncStatus(sess: any) {
  if (!sess.execution_id || !["active"].includes(sess.status)) return sess.status;
  const { data: ex } = await db.from("wa_flow_executions").select("status").eq("id", sess.execution_id).maybeSingle();
  if (ex?.status === "completed") {
    await db.from("chatweb_sessions").update({ status: "completed", ended_at: new Date().toISOString() }).eq("id", sess.id);
    return "completed";
  }
  return sess.status;
}

async function messagesSince(sessionId: string, since?: string | null) {
  let q = db.from("chatweb_messages").select("id,sender_type,message_type,content,metadata,created_at").eq("session_id", sessionId).order("created_at", { ascending: true }).limit(300);
  if (since && !Number.isNaN(Date.parse(since))) q = q.gt("created_at", since);
  const { data } = await q;
  return (data || []).map((m: any) => ({
    ...m,
    // Só expõe metadados de exibição (nunca dados internos do fluxo).
    metadata: { options: m.metadata?.options, style: m.metadata?.style, header: m.metadata?.header, footer: m.metadata?.footer, url: m.metadata?.url, filename: m.metadata?.filename, ai: !!m.metadata?.ai },
  }));
}

async function callRunner(cfg: any, sess: any, extra: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/wa-flow-runner`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel: "chatweb", chatweb_session_id: sess.id, user_id: cfg.owner_user_id, ...extra }),
  });
  if (!res.ok) console.error("[chatweb-api] runner", res.status, await res.text());
}

async function startSession(cfg: any, rawVisitor: unknown, ip: string, hostOrigin: string | null): Promise<{ error: string } | { token: string; visitor_id: string; status: string; messages: any[] }> {
  const visitorId = VISITOR_RE.test(String(rawVisitor || "")) ? String(rawVisitor) : crypto.randomUUID().replace(/-/g, "");
  if (!(await rateLimit(`ip:${ip}`, "chatweb-start", 10, 600))) return { error: "rate_limited" };
  const token = newToken();
  const { data: sess, error } = await db.from("chatweb_sessions").insert({
    config_id: cfg.id, owner_user_id: cfg.owner_user_id, flow_id: cfg.flow_id, visitor_id: visitorId,
    session_token_hash: await sha256(token), origin: hostOrigin ? hostOf(hostOrigin) : "link",
    expires_at: new Date(Date.now() + cfg.session_ttl_minutes * 60_000).toISOString(),
  }).select("*").single();
  if (error || !sess) return { error: "start_failed" };
  if (cfg.welcome_message) {
    await db.from("chatweb_messages").insert({ session_id: sess.id, owner_user_id: cfg.owner_user_id, sender_type: "bot", content: cleanText(cfg.welcome_message), metadata: { welcome: true } });
  }
  // O fluxo roda em segundo plano: o visitante já vê o chat e as respostas chegam pela consulta rápida.
  const run = callRunner(cfg, sess, { incoming_text: "", chatweb_start: true }).catch((e) => console.error("[chatweb-api] runner", e));
  const rt = (globalThis as any).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(run); else await run;
  return { token, visitor_id: visitorId, status: "active", messages: await messagesSince(sess.id) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
    const hostOrigin = typeof body?.host_origin === "string" ? body.host_origin.slice(0, 300) : null;

    if (!(await rateLimit(`ip:${ip}`, "chatweb-api", 120, 60))) return json({ error: "rate_limited" }, 429);

    if (action === "config") {
      const cfg = await loadConfig(String(body.slug || "").toLowerCase());
      if (!cfg) return json({ error: "not_found" }, 404);
      if (!domainAllowed(cfg, hostOrigin)) return json({ error: "domain_not_allowed" }, 403);
      return json({ config: await publicConfig(cfg) });
    }

    if (action === "boot") {
      // Configuração + retomada/início numa única ida ao servidor (abre mais rápido).
      const cfg = await loadConfig(String(body.slug || "").toLowerCase());
      if (!cfg) return json({ error: "not_found" }, 404);
      if (!domainAllowed(cfg, hostOrigin)) return json({ error: "domain_not_allowed" }, 403);
      const [config, existing] = await Promise.all([publicConfig(cfg), body.token ? sessionByToken(body.token) : Promise.resolve(null)]);
      if (existing && existing.config_id === cfg.id) {
        const status = await syncStatus(existing);
        return json({ config, token: String(body.token), status, messages: await messagesSince(existing.id) });
      }
      if (!cfg.enabled) return json({ config });
      const started = await startSession(cfg, body.visitor_id, ip, hostOrigin);
      if ("error" in started) return json({ config, error: started.error });
      return json({ config, ...started, started: true });
    }

    if (action === "start") {
      const cfg = await loadConfig(String(body.slug || "").toLowerCase());
      if (!cfg) return json({ error: "not_found" }, 404);
      if (!cfg.enabled) return json({ error: "disabled" }, 403);
      if (!domainAllowed(cfg, hostOrigin)) return json({ error: "domain_not_allowed" }, 403);
      const started = await startSession(cfg, body.visitor_id, ip, hostOrigin);
      if ("error" in started) return json({ error: started.error }, started.error === "rate_limited" ? 429 : 500);
      return json(started);
    }
    // Ações com sessão
    const sess = await sessionByToken(body.token);
    if (!sess) return json({ error: "invalid_session" }, 401);
    const { data: cfg } = await db.from("chatweb_configurations").select("*").eq("id", sess.config_id).maybeSingle();
    if (!cfg) return json({ error: "not_found" }, 404);
    if (body.slug && String(body.slug).toLowerCase() !== cfg.slug) return json({ error: "invalid_session" }, 401);

    if (action === "poll" && !(await rateLimit(`s:${sess.id}`, "chatweb-poll", 90, 60))) return json({ error: "rate_limited" }, 429);
    if (action === "resume" || action === "poll") {
      const status = await syncStatus(sess);
      return json({ status, messages: await messagesSince(sess.id, action === "poll" ? body.since : null) });
    }

    if (action === "send") {
      if (!["active", "handoff"].includes(sess.status)) return json({ error: "session_closed", status: sess.status }, 409);
      if (!cfg.enabled && cfg.disable_policy === "close") return json({ error: "disabled" }, 403);
      if (!(await rateLimit(`s:${sess.id}`, "chatweb-send", 20, 60))) return json({ error: "rate_limited" }, 429);
      const text = cleanText(body.text);
      const buttonId = cleanText(body.button_id).slice(0, 120);
      const buttonTitle = cleanText(body.button_title).slice(0, 120);
      if (!text && !buttonId) return json({ error: "empty" }, 400);
      const since = new Date().toISOString();
      await db.from("chatweb_messages").insert({
        session_id: sess.id, owner_user_id: sess.owner_user_id, sender_type: "visitor",
        message_type: buttonId ? "option_reply" : "text", content: text || buttonTitle,
        metadata: buttonId ? { button_id: buttonId } : {},
      });
      await db.from("chatweb_sessions").update({ last_activity_at: since, expires_at: new Date(Date.now() + cfg.session_ttl_minutes * 60_000).toISOString() }).eq("id", sess.id);
      if (sess.status === "active") {
        await callRunner(cfg, sess, { incoming_text: text || buttonTitle, button_id: buttonId, button_title: buttonTitle });
      }
      const status = await syncStatus({ ...sess });
      return json({ status, messages: await messagesSince(sess.id, new Date(Date.parse(since) - 1000).toISOString()) });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("[chatweb-api]", e);
    return json({ error: "internal_error" }, 500);
  }
});
