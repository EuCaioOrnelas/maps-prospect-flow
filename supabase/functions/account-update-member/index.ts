// Edge function: account-update-member
// Permite owner/admin atualizar status de um sub usuário (desativar/reativar/remover).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: callerProfile } = await admin
      .from("profiles").select("id, parent_owner_id, account_role").eq("id", user.id).maybeSingle();
    if (!callerProfile) return new Response(JSON.stringify({ error: "Perfil não encontrado" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const ownerId = (callerProfile as any).parent_owner_id || (callerProfile as any).id;
    const role = (callerProfile as any).account_role || "owner";
    if (role !== "owner" && role !== "admin") {
      return new Response(JSON.stringify({ error: "Sem permissão" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { user_id, action, role: newRole, name } = await req.json();
    if (!user_id || !action) {
      return new Response(JSON.stringify({ error: "Dados inválidos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // verificar que target pertence à mesma conta e não é o owner
    const { data: member } = await admin.from("account_members").select("*").eq("owner_user_id", ownerId).eq("user_id", user_id).maybeSingle();
    if (!member) return new Response(JSON.stringify({ error: "Usuário não encontrado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (action === "deactivate") {
      await admin.from("account_members").update({ status: "inactive" }).eq("id", (member as any).id);
      // Bloquear login via ban
      await admin.auth.admin.updateUserById(user_id, { ban_duration: "876000h" });
    } else if (action === "reactivate") {
      await admin.from("account_members").update({ status: "active" }).eq("id", (member as any).id);
      await admin.auth.admin.updateUserById(user_id, { ban_duration: "none" });
    } else if (action === "delete") {
      await admin.from("account_members").delete().eq("id", (member as any).id);
      await admin.auth.admin.deleteUser(user_id);
    } else if (action === "update") {
      const patch: any = {};
      if (newRole && (newRole === "admin" || newRole === "operational")) patch.role = newRole;
      if (typeof name === "string") patch.name = name;
      if (Object.keys(patch).length) await admin.from("account_members").update(patch).eq("id", (member as any).id);
    } else {
      return new Response(JSON.stringify({ error: "Ação inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await admin.from("account_audit_log").insert({
      owner_user_id: ownerId,
      actor_user_id: user.id,
      action,
      target_user_id: user_id,
      metadata: { newRole, name },
    } as any);

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[account-update-member] error:", e);
    return new Response(JSON.stringify({ error: e.message || "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
