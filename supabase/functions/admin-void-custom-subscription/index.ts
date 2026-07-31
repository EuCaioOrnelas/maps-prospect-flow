import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: userData } = await authClient.auth.getUser();
    const adminId = userData.user?.id;
    if (!adminId) throw new Error("Sessão inválida");

    const { data: role } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", adminId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) {
      return new Response(JSON.stringify({ error: "Apenas administradores" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const subscriptionId = typeof body?.subscription_id === "string" ? body.subscription_id : "";
    if (!subscriptionId) throw new Error("Assinatura não informada");

    const { data: subscription, error: subscriptionError } = await admin
      .from("custom_subscriptions")
      .select("id, user_id, status")
      .eq("id", subscriptionId)
      .maybeSingle();
    if (subscriptionError) throw subscriptionError;
    if (!subscription) throw new Error("Assinatura customizada não encontrada");
    if (subscription.status !== "active") throw new Error("A assinatura não está ativa");

    const now = new Date().toISOString();
    const { error: updateError } = await admin
      .from("custom_subscriptions")
      .update({
        status: "canceled",
        monthly_value_cents: 0,
        total_value_cents: 0,
        canceled_at: now,
        cancel_reason: "voided_by_admin",
      })
      .eq("id", subscription.id)
      .eq("status", "active");
    if (updateError) throw updateError;

    // Um contrato desfeito não representa receita recebida. Remove somente os
    // pagamentos técnicos ligados a este contrato, sem tocar em outros contratos.
    const { error: paymentsError } = await admin
      .from("custom_subscription_payments")
      .delete()
      .eq("custom_subscription_id", subscription.id);
    if (paymentsError) throw paymentsError;

    const { data: profile } = await admin
      .from("profiles")
      .select("custom_subscription_id")
      .eq("id", subscription.user_id)
      .maybeSingle();

    if (profile?.custom_subscription_id === subscription.id) {
      const { error: profileError } = await admin
        .from("profiles")
        .update({
          plan: "free",
          is_custom_subscription: false,
          custom_subscription_id: null,
          custom_searches_limit: null,
          custom_whatsapp_numbers_limit: null,
          custom_feature_permissions: null,
          admin_assigned_plan: false,
          payment_provider: null,
          subscription_current_period_end: null,
          subscription_price_cents: 0,
        })
        .eq("id", subscription.user_id);
      if (profileError) throw profileError;
    }

    await admin.from("security_audit_log").insert({
      user_id: adminId,
      action: "admin_void_custom_subscription",
      resource_type: "custom_subscriptions",
      resource_id: subscription.id,
      metadata: { affected_user_id: subscription.user_id, excludes_mrr: true, excludes_churn: true },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});