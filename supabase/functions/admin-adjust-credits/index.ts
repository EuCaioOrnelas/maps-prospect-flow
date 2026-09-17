import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const MAX_BONUS_DELTA = 100000;
const MAX_PLAN_LIMIT = 1000000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json({ error: "Não autenticado." }, 401);

    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: "Sessão inválida." }, 401);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (roleError) return json({ error: "Falha ao validar permissão." }, 500);
    if (isAdmin !== true) return json({ error: "Acesso restrito a administradores." }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    const targetUserId = String(body?.userId ?? "");
    if (!targetUserId) return json({ error: "Usuário alvo não informado." }, 400);

    const { data: target, error: targetError } = await admin
      .from("profiles")
      .select("id, email, bonus_searches, custom_searches_limit, searches_limit")
      .eq("id", targetUserId)
      .maybeSingle();
    if (targetError) return json({ error: targetError.message }, 500);
    if (!target) return json({ error: "Usuário não encontrado." }, 404);

    let patch: Record<string, unknown> | null = null;
    let auditAction = "";
    let auditMeta: Record<string, unknown> = {};

    if (action === "grant_bonus") {
      const delta = Math.round(Number(body?.amount));
      if (!Number.isFinite(delta) || delta === 0) return json({ error: "Quantidade inválida." }, 400);
      if (Math.abs(delta) > MAX_BONUS_DELTA) return json({ error: "Quantidade acima do permitido." }, 400);
      const current = Number(target.bonus_searches ?? 0);
      const next = Math.max(0, current + delta);
      patch = { bonus_searches: next };
      auditAction = "admin_grant_bonus_searches";
      auditMeta = { delta, previous: current, next };
    } else if (action === "set_plan_limit") {
      const value = Math.round(Number(body?.value));
      if (!Number.isFinite(value) || value < 0 || value > MAX_PLAN_LIMIT)
        return json({ error: "Limite inválido." }, 400);
      patch = { custom_searches_limit: value };
      auditAction = "admin_set_plan_limit";
      auditMeta = { previous: target.custom_searches_limit ?? target.searches_limit ?? null, next: value };
    } else {
      return json({ error: "Ação desconhecida." }, 400);
    }

    const { error: updateError } = await admin.from("profiles").update(patch).eq("id", targetUserId);
    if (updateError) return json({ error: updateError.message }, 500);

    await admin.from("security_audit_log").insert({
      user_id: userData.user.id,
      action: auditAction,
      resource_type: "profiles",
      resource_id: targetUserId,
      ip_address: req.headers.get("x-forwarded-for"),
      user_agent: req.headers.get("user-agent"),
      metadata: { target_email: target.email, ...auditMeta },
    });

    return json({ success: true, ...auditMeta });
  } catch (e) {
    console.error("[admin-adjust-credits]", e);
    return json({ error: e instanceof Error ? e.message : "Erro inesperado." }, 500);
  }
});
