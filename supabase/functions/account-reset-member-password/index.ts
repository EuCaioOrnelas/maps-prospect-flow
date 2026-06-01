// Edge function: account-reset-member-password
// Gera senha temporária para um sub usuário, marca must_change_password=true e envia email.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

function genPassword() {
  const alpha = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#";
  let s = "";
  for (let i = 0; i < 12; i++) s += alpha[Math.floor(Math.random() * alpha.length)];
  return s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: callerProfile } = await admin
      .from("profiles").select("id, parent_owner_id, account_role").eq("id", user.id).maybeSingle();
    const ownerId = (callerProfile as any)?.parent_owner_id || (callerProfile as any)?.id;
    const role = (callerProfile as any)?.account_role || "owner";
    if (role !== "owner" && role !== "admin") {
      return new Response(JSON.stringify({ error: "Sem permissão" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { user_id } = await req.json();
    const { data: member } = await admin.from("account_members").select("*").eq("owner_user_id", ownerId).eq("user_id", user_id).maybeSingle();
    if (!member) return new Response(JSON.stringify({ error: "Usuário não encontrado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const newPass = genPassword();
    const { error } = await admin.auth.admin.updateUserById(user_id, { password: newPass });
    if (error) throw error;

    await admin.from("account_members").update({ must_change_password: true }).eq("id", (member as any).id);
    await admin.from("profiles").update({ must_change_password: true }).eq("id", user_id);

    if (RESEND_API_KEY) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Wiize <onboarding@resend.dev>",
            to: [(member as any).email],
            subject: "Sua senha Wiize foi redefinida",
            html: `<p>Olá, ${(member as any).name || ""}</p><p>Sua senha foi redefinida pelo administrador da conta.</p><p><strong>Nova senha:</strong> ${newPass}</p><p>Acesse <a href="https://wiize.com.br">wiize.com.br</a> e altere sua senha no primeiro login.</p>`,
          }),
        });
      } catch (e) { console.error("email error:", e); }
    }

    await admin.from("account_audit_log").insert({
      owner_user_id: ownerId,
      actor_user_id: user.id,
      action: "reset_password",
      target_user_id: user_id,
      metadata: {},
    } as any);

    return new Response(JSON.stringify({ ok: true, password: newPass }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[account-reset-member-password] error:", e);
    return new Response(JSON.stringify({ error: e.message || "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
