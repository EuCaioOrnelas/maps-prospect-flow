import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function sendPartnerEmail(
  supabase: any,
  partnerId: string,
  type: string,
  extraData: Record<string, unknown> = {}
): Promise<void> {
  try {
    const { data: partner } = await supabase
      .from("partners")
      .select("email, full_name, referral_code, user_id")
      .eq("id", partnerId)
      .maybeSingle();

    if (!partner?.email) {
      console.warn(`[sendPartnerEmail] partner ${partnerId} has no email`);
      return;
    }

    const firstName = (partner.full_name || "").split(" ")[0] || "Parceiro";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const resp = await fetch(`${supabaseUrl}/functions/v1/send-partner-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        type,
        to: partner.email,
        data: {
          first_name: firstName,
          referral_code: partner.referral_code,
          user_id: partner.user_id,
          ...extraData,
        },
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error(`[sendPartnerEmail] ${type} failed:`, resp.status, txt);
    }
  } catch (e) {
    console.error("[sendPartnerEmail] exception:", e);
  }
}

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
  referral_code?: string;
}

const REFERRAL_CODE_REGEX = /^[a-z0-9]{3,30}$/;

function normalizeReferralCode(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
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

    const normalizedEmail = body.email.trim().toLowerCase();
    let newUserId: string | null = null;
    let userAlreadyExisted = false;

    // Try to create auth user (auto-confirmed)
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: body.full_name, is_partner: true },
    });

    if (createErr || !created?.user) {
      const msg = (createErr?.message || "").toLowerCase();
      const alreadyRegistered =
        msg.includes("already been registered") ||
        msg.includes("already registered") ||
        msg.includes("already exists") ||
        msg.includes("duplicate");

      if (!alreadyRegistered) {
        return new Response(JSON.stringify({ error: createErr?.message || "Falha ao criar usuário" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // User already exists — find them and reuse
      let foundUserId: string | null = null;
      let page = 1;
      while (page <= 20 && !foundUserId) {
        const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
        if (listErr) break;
        const match = list?.users?.find((u: any) => (u.email || "").toLowerCase() === normalizedEmail);
        if (match) foundUserId = match.id;
        if (!list?.users?.length || list.users.length < 200) break;
        page++;
      }

      if (!foundUserId) {
        return new Response(JSON.stringify({ error: "Email já cadastrado, mas não foi possível localizar o usuário" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Check if this user is already a partner
      const { data: existingPartner } = await supabaseAdmin
        .from("partners")
        .select("id")
        .eq("user_id", foundUserId)
        .maybeSingle();

      if (existingPartner) {
        return new Response(JSON.stringify({ error: "Este email já está cadastrado como parceiro" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      newUserId = foundUserId;
      userAlreadyExisted = true;

      // Update existing user password so admin-provided credentials work
      const { error: updPwdErr } = await supabaseAdmin.auth.admin.updateUserById(foundUserId, {
        password: body.password,
        email_confirm: true,
      });
      if (updPwdErr) {
        console.warn("[admin-create-partner] failed to update existing user password:", updPwdErr.message);
      }
    } else {
      newUserId = created.user.id;
    }

    // Upsert profile (handle_new_user may have created it)
    await supabaseAdmin.from("profiles").upsert({
      id: newUserId,
      email: body.email.trim().toLowerCase(),
      name: body.full_name,
      phone: body.phone || null,
    }, { onConflict: "id" });

    // Assign 'partner' role (ignore if already exists)
    const { error: roleErr } = await supabaseAdmin.from("user_roles").insert({ user_id: newUserId, role: "partner" });
    if (roleErr && !roleErr.message?.toLowerCase().includes("duplicate")) {
      console.warn("[admin-create-partner] role insert warning:", roleErr.message);
    }

    // Determine referral code: use custom (if provided & unique) or auto-generate
    let referralCode: string | null = null;
    if (body.referral_code && body.referral_code.trim()) {
      const candidate = normalizeReferralCode(body.referral_code);
      if (!REFERRAL_CODE_REGEX.test(candidate)) {
        return new Response(JSON.stringify({ error: "Código de referral inválido. Use 3 a 30 letras/números, sem espaços ou símbolos." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: existingCode } = await supabaseAdmin
        .from("partners")
        .select("id")
        .eq("referral_code", candidate)
        .maybeSingle();
      if (existingCode) {
        return new Response(JSON.stringify({ error: `Código "${candidate}" já está em uso por outro parceiro.` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      referralCode = candidate;
    } else {
      const { data: codeData, error: codeErr } = await supabaseAdmin.rpc("generate_partner_referral_code", {
        p_full_name: body.full_name,
      });
      if (codeErr) {
        console.error("[admin-create-partner] referral code error", codeErr);
      }
      referralCode = codeData || `partner${Date.now()}`;
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
        referral_code: referralCode,
        level: body.level || "bronze",
        status: body.status || "active",
        custom_commission_percent: body.custom_commission_percent ?? null,
        internal_notes: body.internal_notes || null,
        created_by_admin_id: callerData.user.id,
      })
      .select()
      .single();

    if (partnerErr) {
      // Rollback auth user only if we created it now
      if (!userAlreadyExisted) {
        await supabaseAdmin.auth.admin.deleteUser(newUserId).catch(() => {});
      }
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
