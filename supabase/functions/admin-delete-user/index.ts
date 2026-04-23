import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: any) => {
  console.log(`[admin-delete-user] ${step}`, details ? JSON.stringify(details) : "");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: isAdmin } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Acesso negado. Apenas administradores podem excluir usuários." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const targetUserId: string = body.user_id;

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "user_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (targetUserId === userData.user.id) {
      return new Response(JSON.stringify({ error: "Você não pode excluir sua própria conta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("Deleting user", { targetUserId, by: userData.user.id });

    // Snapshot do profile para audit
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("email, name, plan, payment_provider")
      .eq("id", targetUserId)
      .maybeSingle();

    // Audit log ANTES da exclusão (caso o user role seja deletado em cascata)
    await supabaseAdmin.from("security_audit_log").insert({
      user_id: userData.user.id,
      action: "admin_delete_user",
      resource_type: "profiles",
      resource_id: targetUserId,
      metadata: {
        deleted_email: targetProfile?.email,
        deleted_name: targetProfile?.name,
        plan: targetProfile?.plan,
        payment_provider: targetProfile?.payment_provider,
      },
    });

    // Apaga o usuário do Auth — cascata cuida do profile e demais tabelas com FK on delete cascade
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

    if (deleteError) {
      log("Auth delete error", { error: deleteError.message });
      // Tentativa de fallback: apaga apenas o profile (deixa Auth órfão)
      await supabaseAdmin.from("profiles").delete().eq("id", targetUserId);
      return new Response(
        JSON.stringify({
          error: `Não foi possível excluir do Auth: ${deleteError.message}. O profile foi removido.`,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Garante limpeza do profile mesmo se cascata não pegou
    await supabaseAdmin.from("profiles").delete().eq("id", targetUserId);

    log("Success", { targetUserId });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("Unexpected error", { error: msg });
    return new Response(JSON.stringify({ error: `Erro interno: ${msg}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
