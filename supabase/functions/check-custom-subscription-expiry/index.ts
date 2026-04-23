import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ADMIN_NOTIFY_EMAIL = "wiize.app@gmail.com";

const log = (step: string, details?: any) =>
  console.log(`[check-custom-sub-expiry] ${step}`, details ? JSON.stringify(details) : "");

async function sendAdminEmail(subject: string, html: string) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey || !resendKey) {
    log("Skipping email - missing keys");
    return;
  }
  try {
    const r = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Connection-Api-Key": resendKey,
      },
      body: JSON.stringify({
        from: "Wiize Admin <onboarding@resend.dev>",
        to: [ADMIN_NOTIFY_EMAIL],
        subject,
        html,
      }),
    });
    log("Email sent", { status: r.status });
  } catch (e) {
    log("Email error", { e: String(e) });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date().toISOString();

    // Busca contratos ativos não-vitalícios já expirados
    const { data: expired, error } = await admin
      .from("custom_subscriptions")
      .select("id, user_id, plan, monthly_value_cents, ends_at, subscription_label")
      .eq("status", "active")
      .eq("is_lifetime", false)
      .not("ends_at", "is", null)
      .lt("ends_at", now);

    if (error) throw error;

    log("Expired contracts found", { count: expired?.length || 0 });

    let processed = 0;
    const expiredDetails: any[] = [];

    for (const sub of expired || []) {
      // 1) Marcar contrato como expirado
      await admin
        .from("custom_subscriptions")
        .update({ status: "expired" })
        .eq("id", sub.id);

      // 2) Bloquear usuário e remover do MRR (zera o valor mas preserva o vínculo)
      const { data: profile } = await admin
        .from("profiles")
        .select("email, name")
        .eq("id", sub.user_id)
        .single();

      await admin
        .from("profiles")
        .update({
          is_blocked: true,
          subscription_price_cents: 0,
        })
        .eq("id", sub.user_id);

      expiredDetails.push({
        email: profile?.email,
        name: profile?.name,
        plan: sub.plan,
        label: sub.subscription_label,
        monthly_value: (sub.monthly_value_cents || 0) / 100,
        ended_at: sub.ends_at,
      });

      processed++;
    }

    // 3) Notificar admin
    if (processed > 0) {
      const rows = expiredDetails
        .map(
          (d) =>
            `<tr><td>${d.name || "-"}</td><td>${d.email}</td><td>${d.label || d.plan}</td><td>R$ ${d.monthly_value.toFixed(2)}</td><td>${new Date(d.ended_at).toLocaleDateString("pt-BR")}</td></tr>`
        )
        .join("");

      const html = `
        <h2>Contratos customizados expirados</h2>
        <p>${processed} contrato(s) expiraram e os usuários foram bloqueados. Eles também foram removidos do cálculo de MRR.</p>
        <table border="1" cellpadding="8" style="border-collapse:collapse;">
          <thead><tr><th>Nome</th><th>Email</th><th>Plano</th><th>Valor Mensal</th><th>Expirou em</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p>Acesse o admin para renovar ou converter os planos.</p>
      `;
      await sendAdminEmail(`[Wiize] ${processed} contrato(s) customizado(s) expiraram`, html);
    }

    return new Response(JSON.stringify({ checked: expired?.length || 0, processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
