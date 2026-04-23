import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RenewRequest {
  user_id: string;
  previous_subscription_id: string;

  // Novo contrato
  plan: "free" | "start" | "growth" | "scale";
  subscription_label?: string;
  searches_limit: number;
  whatsapp_numbers_limit: number;

  monthly_value_cents: number;
  total_value_cents: number;
  payment_method: "free" | "pix" | "transfer" | "card" | "cash" | "other";
  payment_notes?: string;

  is_lifetime: boolean;
  contract_months?: number;
  starts_at?: string;

  contract_file_url?: string;
  contract_file_name?: string;
  receipt_file_url?: string;
  receipt_file_name?: string;

  notes?: string;
}

const log = (step: string, details?: any) =>
  console.log(`[admin-renew-custom-sub] ${step}`, details ? JSON.stringify(details) : "");

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
    const { data: userData } = await supabaseAuth.auth.getUser(token);
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: isAdmin } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Apenas admins" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RenewRequest = await req.json();

    // 1) Marcar contrato anterior como renovado
    const { data: prevSub } = await admin
      .from("custom_subscriptions")
      .select("*")
      .eq("id", body.previous_subscription_id)
      .single();

    if (!prevSub) {
      return new Response(JSON.stringify({ error: "Contrato anterior não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Cria novo contrato
    const startsAt = body.starts_at ? new Date(body.starts_at) : new Date();
    const endsAt = body.is_lifetime
      ? null
      : (() => {
          const d = new Date(startsAt);
          d.setMonth(d.getMonth() + (body.contract_months || 1));
          return d;
        })();

    const { data: newSub, error: insErr } = await admin
      .from("custom_subscriptions")
      .insert({
        user_id: body.user_id,
        created_by_admin_id: userData.user.id,
        plan: body.plan,
        subscription_label: body.subscription_label || null,
        searches_limit: body.searches_limit,
        whatsapp_numbers_limit: body.whatsapp_numbers_limit,
        monthly_value_cents: body.monthly_value_cents,
        total_value_cents: body.total_value_cents,
        payment_method: body.payment_method,
        payment_notes: body.payment_notes || null,
        is_lifetime: body.is_lifetime,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt?.toISOString() || null,
        contract_months: body.is_lifetime ? null : body.contract_months || null,
        contract_file_url: body.contract_file_url || null,
        contract_file_name: body.contract_file_name || null,
        notes: body.notes || null,
        status: "active",
      })
      .select()
      .single();

    if (insErr || !newSub) {
      log("Insert new sub error", { error: insErr });
      return new Response(JSON.stringify({ error: insErr?.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Atualiza contrato anterior como renewed
    await admin
      .from("custom_subscriptions")
      .update({
        status: "renewed",
        renewed_into_id: newSub.id,
      })
      .eq("id", prevSub.id);

    // 4) Log de renovação
    await admin.from("custom_subscription_renewals").insert({
      user_id: body.user_id,
      renewed_by_admin_id: userData.user.id,
      previous_subscription_id: prevSub.id,
      new_subscription_id: newSub.id,
      notes: body.notes || null,
    });

    // 5) Pagamento da renovação
    if (body.total_value_cents > 0 || body.receipt_file_url) {
      await admin.from("custom_subscription_payments").insert({
        custom_subscription_id: newSub.id,
        user_id: body.user_id,
        recorded_by_admin_id: userData.user.id,
        amount_cents: body.total_value_cents,
        payment_method: body.payment_method,
        paid_at: startsAt.toISOString(),
        receipt_file_url: body.receipt_file_url || null,
        receipt_file_name: body.receipt_file_name || null,
        notes: "Pagamento de renovação",
      });
    }

    // 6) Atualiza profile do usuário
    await admin
      .from("profiles")
      .update({
        plan: body.plan,
        searches_limit: body.searches_limit,
        is_custom_subscription: true,
        custom_searches_limit: body.searches_limit,
        custom_whatsapp_numbers_limit: body.whatsapp_numbers_limit,
        custom_subscription_id: newSub.id,
        admin_assigned_plan: true,
        is_blocked: false,
        payment_provider: "manual",
        subscription_current_period_end: endsAt?.toISOString() || null,
        subscription_price_cents: body.monthly_value_cents,
      })
      .eq("id", body.user_id);

    await admin.from("security_audit_log").insert({
      user_id: userData.user.id,
      action: "admin_renew_custom_subscription",
      resource_type: "custom_subscriptions",
      resource_id: newSub.id,
      metadata: {
        previous_subscription_id: prevSub.id,
        plan: body.plan,
        monthly_value_cents: body.monthly_value_cents,
      },
    });

    return new Response(JSON.stringify({ success: true, subscription: newSub }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("Unexpected", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
