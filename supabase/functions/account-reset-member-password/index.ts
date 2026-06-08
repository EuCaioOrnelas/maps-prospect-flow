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
        const escape = (s: string) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
        const memberName = (member as any).name || "";
        const memberEmail = (member as any).email;
        const safeName = escape(memberName);
        const safePass = escape(newPass);
        const url = "https://wiize.com.br";
        const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sua senha foi redefinida</title></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr><td style="padding:32px 40px 8px 40px;"><div style="font-size:22px;font-weight:700;color:#0f172a;">Wiize</div></td></tr>
        <tr><td style="padding:8px 40px 0 40px;">
          <h1 style="margin:16px 0 8px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">Sua senha foi redefinida</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;">Olá ${safeName}, o administrador da sua conta gerou uma nova senha temporária para você.</p>
        </td></tr>
        <tr><td style="padding:0 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
            <tr><td style="padding:16px 20px;">
              <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;margin-bottom:4px;">Nova senha temporária</div>
              <div style="font-size:15px;color:#0f172a;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${safePass}</div>
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding:28px 40px 8px 40px;">
          <a href="${url}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:10px;">Acessar e alterar senha</a>
        </td></tr>
        <tr><td style="padding:16px 40px 24px 40px;">
          <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">Por segurança, altere sua senha no primeiro login em <strong>Perfil → Segurança</strong>. Se você não solicitou esta redefinição, entre em contato com o administrador da conta.</p>
        </td></tr>
        <tr><td style="padding:20px 40px 32px 40px;border-top:1px solid #f1f5f9;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">Equipe Wiize · wiize.com.br</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
        const text = `Sua senha Wiize foi redefinida\n\nOlá ${memberName},\n\nNova senha temporária: ${newPass}\n\nAcesse: ${url} e altere sua senha no primeiro login.\n\n— Equipe Wiize`;
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Wiize <no-reply@wiize.com.br>",
            to: [memberEmail],
            reply_to: "suporte@wiize.com.br",
            subject: "Sua senha Wiize foi redefinida",
            html,
            text,
            headers: {
              "List-Unsubscribe": "<mailto:suporte@wiize.com.br?subject=unsubscribe>",
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              "X-Entity-Ref-ID": crypto.randomUUID(),
            },
            tags: [{ name: "category", value: "password_reset" }],
          }),
        });
        if (!res.ok) console.error("[reset] resend status:", res.status, await res.text());
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
