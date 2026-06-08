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

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function buildWelcomeEmail(name: string, email: string, password: string, url: string) {
  const safeName = escapeHtml(name || "");
  const safeEmail = escapeHtml(email);
  const safePass = escapeHtml(password);
  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sua conta Wiize foi criada</title></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr><td style="padding:32px 40px 8px 40px;">
          <div style="font-size:22px;font-weight:700;letter-spacing:-0.02em;color:#0f172a;">Wiize</div>
        </td></tr>
        <tr><td style="padding:8px 40px 0 40px;">
          <h1 style="margin:16px 0 8px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">Bem-vindo(a) à Wiize, ${safeName}</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;">Sua conta foi criada com sucesso. Use os dados abaixo para acessar a plataforma.</p>
        </td></tr>
        <tr><td style="padding:0 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
            <tr><td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
              <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;margin-bottom:4px;">Email</div>
              <div style="font-size:15px;color:#0f172a;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${safeEmail}</div>
            </td></tr>
            <tr><td style="padding:16px 20px;">
              <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;margin-bottom:4px;">Senha temporária</div>
              <div style="font-size:15px;color:#0f172a;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${safePass}</div>
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding:28px 40px 8px 40px;">
          <a href="${url}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:10px;">Acessar minha conta</a>
        </td></tr>
        <tr><td style="padding:16px 40px 8px 40px;">
          <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">Por segurança, recomendamos alterar sua senha no primeiro login em <strong>Perfil → Segurança</strong>.</p>
        </td></tr>
        <tr><td style="padding:24px 40px 32px 40px;border-top:1px solid #f1f5f9;">
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">Você recebeu este email porque um administrador da sua conta criou um acesso para você na Wiize. Se não reconhece esta ação, ignore esta mensagem ou responda este email.</p>
          <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">Equipe Wiize · wiize.com.br</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = `Bem-vindo(a) à Wiize, ${name}

Sua conta foi criada com sucesso.

Email: ${email}
Senha temporária: ${password}

Acesse: ${url}

Por segurança, altere sua senha no primeiro login.

— Equipe Wiize`;

  return { html, text };
}

async function sendWelcomeEmail(to: string, name: string, password: string, url: string) {
  if (!RESEND_API_KEY) return;
  try {
    const { html, text } = buildWelcomeEmail(name, to, password, url);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Wiize <no-reply@wiize.com.br>",
        to: [to],
        reply_to: "suporte@wiize.com.br",
        subject: `Bem-vindo(a) à Wiize, ${name.split(" ")[0] || ""}`.trim(),
        html,
        text,
        headers: {
          "List-Unsubscribe": "<mailto:suporte@wiize.com.br?subject=unsubscribe>",
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          "X-Entity-Ref-ID": crypto.randomUUID(),
        },
        tags: [{ name: "category", value: "account_welcome" }],
      }),
    });
    if (!res.ok) console.error("[account-create-member] resend status:", res.status, await res.text());
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
    const password = String(body.password || "").trim();
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
      const msg = (createErr?.message || "").toLowerCase();
      let friendly = createErr?.message || "Falha ao criar usuário";
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists") || msg.includes("duplicate")) {
        friendly = "Este email já está cadastrado. Use outro email ou remova o usuário antigo.";
      } else if (msg.includes("password")) {
        friendly = "Senha inválida. Use no mínimo 8 caracteres.";
      } else if (msg.includes("email")) {
        friendly = "Email inválido.";
      }
      console.error("[account-create-member] createUser failed:", createErr);
      return new Response(JSON.stringify({ error: friendly }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
