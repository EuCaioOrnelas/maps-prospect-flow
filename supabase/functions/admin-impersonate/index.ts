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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No authorization header" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: "Invalid authentication" }, 401);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: isAdmin } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!isAdmin) {
      return json({ error: "Acesso negado. Apenas administradores podem acessar contas." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const targetUserId: string | undefined = body?.user_id;
    const redirectTo: string | undefined = typeof body?.redirect_to === "string" ? body.redirect_to : undefined;
    const reason: string = typeof body?.reason === "string" ? body.reason.slice(0, 500) : "";

    if (!targetUserId) return json({ error: "user_id é obrigatório" }, 400);

    const { data: targetUser, error: targetErr } = await admin.auth.admin.getUserById(targetUserId);
    if (targetErr || !targetUser?.user?.email) {
      return json({ error: "Usuário não encontrado ou sem e-mail" }, 404);
    }
    const targetEmail = targetUser.user.email;

    // Impedir acesso a outra conta admin
    const { data: targetIsAdmin } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", targetUserId)
      .eq("role", "admin")
      .maybeSingle();
    if (targetIsAdmin && targetUserId !== userData.user.id) {
      return json({ error: "Não é permitido acessar a conta de outro administrador." }, 403);
    }

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: targetEmail,
      options: redirectTo ? { redirectTo } : undefined,
    });

    if (linkErr || !linkData?.properties?.action_link) {
      return json({ error: linkErr?.message || "Falha ao gerar link de acesso" }, 500);
    }

    await admin.from("security_audit_log").insert({
      user_id: userData.user.id,
      action: "admin_impersonate_user",
      resource_type: "auth.users",
      resource_id: targetUserId,
      ip_address: req.headers.get("x-forwarded-for"),
      user_agent: req.headers.get("user-agent"),
      metadata: {
        target_email: targetEmail,
        admin_email: userData.user.email,
        reason,
      },
    });

    console.log(`[admin-impersonate] ${userData.user.email} -> ${targetEmail}`);

    return json({
      success: true,
      email: targetEmail,
      action_link: linkData.properties.action_link,
      expires_hint: "Link de uso único. Abra em janela anônima.",
    });
  } catch (e) {
    console.error("[admin-impersonate] error", e);
    return json({ error: (e as Error)?.message ?? "Erro inesperado" }, 500);
  }
});
