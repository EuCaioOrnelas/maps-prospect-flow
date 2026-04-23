import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendPartnerEmail } from "../_shared/partner-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreatePartnerBody {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  company?: string;
  tax_id?: string;
  country?: string;
  level?: "bronze" | "silver" | "gold" | "platinum";
  custom_commission_percent?: number | null;
  internal_notes?: string;
  status?: "active" | "inactive" | "blocked";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");
    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: callerData } = await callerClient.auth.getUser(token);
    if (!callerData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const { data: roleCheck } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body: CreatePartnerBody = await req.json();
    if (!body.full_name?.trim() || !body.email?.trim() || !body.password || body.password.length < 8) {
      return new Response(JSON.stringify({ error: "Nome, email e senha (mínimo 8 caracteres) são obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create auth user (auto-confirmed)
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: body.email.trim().toLowerCase(),
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: body.full_name, is_partner: true },
    });
    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message || "Falha ao criar usuário" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const newUserId = created.user.id;

    // Upsert profile (handle_new_user may have created it)
    await supabaseAdmin.from("profiles").upsert({
      id: newUserId,
      email: body.email.trim().toLowerCase(),
      name: body.full_name,
      phone: body.phone || null,
    }, { onConflict: "id" });

    // Assign 'partner' role
    await supabaseAdmin.from("user_roles").insert({ user_id: newUserId, role: "partner" });

    // Generate referral code
    const { data: codeData, error: codeErr } = await supabaseAdmin.rpc("generate_partner_referral_code", {
      p_full_name: body.full_name,
    });
    if (codeErr) {
      console.error("[admin-create-partner] referral code error", codeErr);
    }

    // Create partner record
    const { data: partner, error: partnerErr } = await supabaseAdmin
      .from("partners")
      .insert({
        user_id: newUserId,
        full_name: body.full_name,
        email: body.email.trim().toLowerCase(),
        phone: body.phone || null,
        company: body.company || null,
        tax_id: body.tax_id || null,
        country: body.country || "BR",
        referral_code: codeData || `partner${Date.now()}`,
        level: body.level || "bronze",
        status: body.status || "active",
        custom_commission_percent: body.custom_commission_percent ?? null,
        internal_notes: body.internal_notes || null,
        created_by_admin_id: callerData.user.id,
      })
      .select()
      .single();

    if (partnerErr) {
      // Rollback auth user
      await supabaseAdmin.auth.admin.deleteUser(newUserId).catch(() => {});
      return new Response(JSON.stringify({ error: partnerErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create empty bank account
    await supabaseAdmin.from("partner_bank_accounts").insert({ partner_id: partner.id });

    // Audit log
    await supabaseAdmin.from("security_audit_log").insert({
      user_id: callerData.user.id,
      action: "partner_created",
      resource_type: "partners",
      resource_id: partner.id,
      metadata: { email: body.email, level: partner.level },
    }).catch(() => {});

    // Welcome email (best-effort)
    sendPartnerEmail(supabaseAdmin, partner.id, "partner_welcome").catch(() => {});

    return new Response(JSON.stringify({ success: true, partner }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[admin-create-partner] error:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
