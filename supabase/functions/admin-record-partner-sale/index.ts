import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: callerData } = await callerClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!callerData?.user) return json({ error: "Unauthorized" }, 401);

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const { data: roleCheck } = await supabaseAdmin
      .from("user_roles").select("role")
      .eq("user_id", callerData.user.id).eq("role", "admin").maybeSingle();
    if (!roleCheck) return json({ error: "Forbidden — admin only" }, 403);

    const body = await req.json();
    const { partner_id, customer_email, amount_cents, plan, payment_provider, payment_method, is_recurring, external_reference, paid_at } = body;

    if (!partner_id || !customer_email || !amount_cents || amount_cents <= 0) {
      return json({ error: "Parceiro, email do cliente e valor (>0) são obrigatórios" }, 400);
    }

    // Find customer profile
    const { data: profile } = await supabaseAdmin
      .from("profiles").select("id").eq("email", customer_email).maybeSingle();
    if (!profile) return json({ error: `Nenhum perfil encontrado com email ${customer_email}` }, 404);

    // Check partner exists
    const { data: partner } = await supabaseAdmin
      .from("partners").select("id, status, user_id").eq("id", partner_id).maybeSingle();
    if (!partner) return json({ error: "Parceiro não encontrado" }, 404);
    if (partner.user_id === profile.id) return json({ error: "Auto-indicação não permitida" }, 400);

    // Try to find or create the partner_lead linkage
    let partnerLeadId: string | null = null;
    const { data: existingLead } = await supabaseAdmin
      .from("partner_leads").select("id").eq("partner_id", partner_id).eq("user_id", profile.id).maybeSingle();
    if (existingLead) {
      partnerLeadId = existingLead.id;
      await supabaseAdmin.from("partner_leads").update({
        is_paid: true, paid_at: paid_at || new Date().toISOString(),
        current_plan: plan, last_activity_at: new Date().toISOString(),
      }).eq("id", existingLead.id);
    } else {
      const { data: newLead } = await supabaseAdmin.from("partner_leads").insert({
        partner_id, user_id: profile.id, email: customer_email,
        is_trial: false, is_paid: true, paid_at: paid_at || new Date().toISOString(),
        current_plan: plan,
      }).select("id").single();
      partnerLeadId = newLead?.id || null;
    }

    // Insert sale (the trigger generate_commission_for_sale will create the commission)
    const { data: sale, error: saleErr } = await supabaseAdmin.from("partner_sales").insert({
      partner_id, customer_user_id: profile.id, partner_lead_id: partnerLeadId,
      amount_cents, plan, payment_provider, payment_method,
      is_recurring: !!is_recurring, external_reference,
      paid_at: paid_at || new Date().toISOString(),
    }).select().single();

    if (saleErr) return json({ error: saleErr.message }, 400);

    return json({ success: true, sale });
  } catch (err: any) {
    console.error("[admin-record-partner-sale]", err);
    return json({ error: err.message || "Erro interno" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
