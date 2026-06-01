// Edge function: account-create-member
// Cria sub usuário (admin/operational) dentro da conta do owner logado.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const PLAN_LIMITS: Record<string, number> = { start: 3, growth: 6 };

function planLimit(plan: string | null | undefined) {
  return PLAN_LIMITS[(plan || "").toLowerCase()] ?? Number.MAX_SAFE_INTEGER;
}

async function sendWelcomeEmail(to: string, name: string, password: string, url: string) {
  if (!RESEND_API_KEY) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Wiize <onboarding@resend.dev>",
        to: [to],
        subject: "Sua conta Wiize foi criada",
        html: `
          <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
            <h2 style="margin:0 0 12px">Olá, ${name}</h2>
            <p>Sua conta foi criada com sucesso.</p>
            <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0">
              <p style="margin:4px 0"><strong>Email:</strong> ${to}</p>
              <p style="margin:4px 0"><strong>Senha:</strong> ${password}</p>
            </div>
            <p>Acesse: <a href="${url}">${url}</a></p>
            <p style="color:#666;font-size:13px">Por segurança recomendamos alterar sua senha após o primeiro login.</p>
            <p style="color:#999;font-size:12px;margin-top:32px">Equipe Wiize</p>
          </div>
        `,
      }),
    });
  } catch (e) {
    console.error("[account-create-member] email failed:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Caller deve ser owner ou admin
    const { data: callerProfile } = await admin
      .from("profiles").select("id, plan, parent_owner_id, account_role").eq("id", user.id).maybeSingle();
    if (!callerProfile) return new Response(JSON.stringify({ error: "Perfil não encontrado" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const ownerId = (callerProfile as any).parent_owner_id || (callerProfile as any).id;
    const role = (callerProfile as any).account_role || "owner";
    if (role !== "owner" && role !== "admin") {
      return new Response(JSON.stringify({ error: "Sem permissão" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: ownerProfile } = await admin
      .from("profiles").select("plan").eq("id", ownerId).maybeSingle();
    const limit = planLimit((ownerProfile as any)?.plan);

    const { count: existingMembers } = await admin
      .from("account_members").select("*", { count: "exact", head: true })
      .eq("owner_user_id", ownerId);
    const used = 1 + (existingMembers || 0);
    if (used >= limit) {
      return new Response(JSON.stringify({ error: "Você atingiu o limite de usuários do seu plano." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const name = (body.name || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const memberRole = body.role === "admin" ? "admin" : "operational";

    if (!name || !email || password.length < 8) {
      return new Response(JSON.stringify({ error: "Dados inválidos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Criar auth user
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, full_name: name, account_member: true },
    });
    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message || "Falha ao criar usuário" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const newUserId = created.user.id;

    // Ajustar profile: sub usuário não é trial e não tem assinatura própria.
    await admin.from("profiles").upsert({
      id: newUserId,
      email,
      name,
      parent_owner_id: ownerId,
      account_role: memberRole,
      must_change_password: true,
      plan: "free",
      searches_used: 0,
      searches_limit: 0,
    } as any, { onConflict: "id" });

    // Registrar membership
    await admin.from("account_members").insert({
      owner_user_id: ownerId,
      user_id: newUserId,
      name,
      email,
      role: memberRole,
      status: "active",
      must_change_password: true,
      created_by: user.id,
    } as any);

    // Audit
    await admin.from("account_audit_log").insert({
      owner_user_id: ownerId,
      actor_user_id: user.id,
      action: "create_member",
      target_user_id: newUserId,
      metadata: { role: memberRole, email },
    } as any);

    // Email
    const appUrl = new URL(req.url).origin.replace(/functions.*$/, "");
    await sendWelcomeEmail(email, name, password, "https://wiize.com.br");

    return new Response(JSON.stringify({ ok: true, user_id: newUserId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[account-create-member] error:", e);
    return new Response(JSON.stringify({ error: e.message || "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
