// Gestão de API Keys do Wiize API (painel do cliente, autenticado por JWT).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateSecret(environment: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const body = Array.from(bytes).map((b) => alphabet[b % alphabet.length]).join("");
  return `wk_${environment}_${body}`;
}

const ALL_PERMISSIONS = ["prospecting:search", "prospecting:analyze", "prospecting:approach"];

// Aceita IPv4/IPv6 simples ou CIDR IPv4 (ex.: 200.1.2.0/24). Máx. 20 entradas.
function sanitizeAllowedIps(input: unknown): string[] | null {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input)) return null;
  const out: string[] = [];
  for (const raw of input) {
    const v = String(raw || "").trim();
    if (!v) continue;
    const ok =
      /^(\d{1,3}\.){3}\d{1,3}(\/([0-9]|[12][0-9]|3[0-2]))?$/.test(v) ||
      /^[0-9a-fA-F:]{2,45}$/.test(v);
    if (!ok) return null;
    if (!out.includes(v)) out.push(v);
    if (out.length > 20) return null;
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Não autorizado" }, 401);

    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user) return json({ error: "Sessão inválida ou expirada" }, 401);

    // Somente contas Wiize API
    const { data: apiProfile } = await admin
      .from("wiize_api_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!apiProfile) return json({ error: "Conta Wiize API não encontrada" }, 403);

    await admin.rpc("wiize_api_ensure_wallet", { _user_id: user.id });

    const body = await req.json().catch(() => ({}));
    const action = String((body as any)?.action || "list");

    if (action === "list") {
      const { data, error } = await admin
        .from("wiize_api_keys")
        .select("id, name, environment, prefix, last_four, permissions, allowed_ips, status, last_used_at, revoked_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json({ keys: data || [] });
    }

    if (action === "create") {
      const name = String((body as any)?.name || "").trim().slice(0, 60) || "Chave sem nome";
      const environment = (body as any)?.environment === "test" ? "test" : "live";
      const requested: string[] = Array.isArray((body as any)?.permissions) ? (body as any).permissions : ALL_PERMISSIONS;
      const permissions = requested.filter((p) => ALL_PERMISSIONS.includes(p));
      if (permissions.length === 0) return json({ error: "Selecione ao menos uma permissão" }, 422);

      const { count } = await admin
        .from("wiize_api_keys")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "active");
      if ((count || 0) >= 10) return json({ error: "Limite de 10 chaves ativas atingido" }, 422);

      const allowedIps = sanitizeAllowedIps((body as any)?.allowed_ips);
      if (allowedIps === null) return json({ error: "Lista de IPs inválida. Use IPv4, IPv6 ou CIDR (máx. 20)." }, 422);

      const secret = generateSecret(environment);
      const prefix = secret.slice(0, 20);
      const { data, error } = await admin
        .from("wiize_api_keys")
        .insert({
          user_id: user.id,
          name,
          environment,
          prefix,
          secret_hash: await sha256Hex(secret),
          last_four: secret.slice(-4),
          permissions,
          allowed_ips: allowedIps,
        })
        .select("id, name, environment, prefix, last_four, permissions, allowed_ips, status, created_at")
        .single();
      if (error) throw error;

      // O segredo completo é devolvido uma única vez.
      return json({ key: data, secret });
    }

    if (action === "revoke") {
      const id = String((body as any)?.id || "");
      if (!id) return json({ error: "id é obrigatório" }, 422);
      const { error } = await admin
        .from("wiize_api_keys")
        .update({ status: "revoked", revoked_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "update_ips") {
      const id = String((body as any)?.id || "");
      if (!id) return json({ error: "id é obrigatório" }, 422);
      const allowedIps = sanitizeAllowedIps((body as any)?.allowed_ips);
      if (allowedIps === null) return json({ error: "Lista de IPs inválida. Use IPv4, IPv6 ou CIDR (máx. 20)." }, 422);
      const { error } = await admin
        .from("wiize_api_keys")
        .update({ allowed_ips: allowedIps })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
      return json({ ok: true, allowed_ips: allowedIps });
    }

    if (action === "delete") {
      const id = String((body as any)?.id || "");
      if (!id) return json({ error: "id é obrigatório" }, 422);
      const { data: existing } = await admin
        .from("wiize_api_keys")
        .select("id, status")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!existing) return json({ error: "Chave não encontrada" }, 404);
      if ((existing as any).status === "active") {
        return json({ error: "Revogue a chave antes de excluí-la." }, 422);
      }
      const { error } = await admin
        .from("wiize_api_keys")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "rotate") {
      const id = String((body as any)?.id || "");
      if (!id) return json({ error: "id é obrigatório" }, 422);
      const { data: existing } = await admin
        .from("wiize_api_keys")
        .select("id, name, environment, permissions, allowed_ips")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!existing) return json({ error: "Chave não encontrada" }, 404);

      const secret = generateSecret((existing as any).environment);
      const prefix = secret.slice(0, 20);

      await admin
        .from("wiize_api_keys")
        .update({ status: "revoked", revoked_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id);

      const { data, error } = await admin
        .from("wiize_api_keys")
        .insert({
          user_id: user.id,
          name: (existing as any).name,
          environment: (existing as any).environment,
          permissions: (existing as any).permissions,
          allowed_ips: (existing as any).allowed_ips || [],
          prefix,
          secret_hash: await sha256Hex(secret),
          last_four: secret.slice(-4),
        })
        .select("id, name, environment, prefix, last_four, permissions, allowed_ips, status, created_at")
        .single();
      if (error) throw error;

      return json({ key: data, secret });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    console.error("[wiize-api-keys]", String(e));
    return json({ error: "Erro interno" }, 500);
  }
});
