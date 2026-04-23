import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UpdatePartnerBody {
  partner_id: string;
  // partner-table updates
  full_name?: string;
  phone?: string | null;
  company?: string | null;
  tax_id?: string | null;
  level?: "bronze" | "silver" | "gold" | "platinum";
  status?: "active" | "inactive" | "blocked";
  custom_commission_percent?: number | null;
  internal_notes?: string | null;
  // auth actions
  new_password?: string;
  // referral
  reset_referral_code?: boolean;
  referral_code?: string; // custom code (overrides reset_referral_code)
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

    const body: UpdatePartnerBody = await req.json();
    if (!body.partner_id) {
      return new Response(JSON.stringify({ error: "partner_id obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch partner
    const { data: partner, error: partnerErr } = await supabaseAdmin
      .from("partners")
      .select("id, user_id, full_name, email")
      .eq("id", body.partner_id)
      .maybeSingle();
    if (partnerErr || !partner) {
      return new Response(JSON.stringify({ error: "Parceiro não encontrado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build partner table updates
    const updates: Record<string, unknown> = {};
    const fields = ["full_name", "phone", "company", "tax_id", "level", "status", "custom_commission_percent", "internal_notes"] as const;
    for (const f of fields) {
      if (body[f] !== undefined) updates[f] = body[f];
    }

    // Custom referral code (takes precedence over reset)
    if (body.referral_code && body.referral_code.trim()) {
      const candidate = normalizeReferralCode(body.referral_code);
      if (!REFERRAL_CODE_REGEX.test(candidate)) {
        return new Response(JSON.stringify({ error: "Código de referral inválido. Use 3 a 30 letras/números, sem espaços ou símbolos." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // Ensure uniqueness (allow keeping the same code for this partner)
      const { data: existingCode } = await supabaseAdmin
        .from("partners")
        .select("id")
        .eq("referral_code", candidate)
        .neq("id", partner.id)
        .maybeSingle();
      if (existingCode) {
        return new Response(JSON.stringify({ error: `Código "${candidate}" já está em uso por outro parceiro.` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      updates.referral_code = candidate;
    } else if (body.reset_referral_code) {
      // Auto-generate new code
      const { data: codeData, error: codeErr } = await supabaseAdmin.rpc("generate_partner_referral_code", {
        p_full_name: body.full_name || partner.full_name,
      });
      if (codeErr) {
        console.error("[admin-update-partner] referral code error", codeErr);
        return new Response(JSON.stringify({ error: "Falha ao gerar novo código" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      updates.referral_code = codeData;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updErr } = await supabaseAdmin.from("partners").update(updates).eq("id", partner.id);
      if (updErr) {
        return new Response(JSON.stringify({ error: updErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // Sync profiles.name if name changed
      if (updates.full_name && partner.user_id) {
        await supabaseAdmin.from("profiles").update({ name: updates.full_name as string }).eq("id", partner.user_id).catch(() => {});
      }
    }

    // Password update
    if (body.new_password) {
      if (body.new_password.length < 8) {
        return new Response(JSON.stringify({ error: "Senha deve ter pelo menos 8 caracteres" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!partner.user_id) {
        return new Response(JSON.stringify({ error: "Parceiro não possui usuário vinculado" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { error: pwdErr } = await supabaseAdmin.auth.admin.updateUserById(partner.user_id, {
        password: body.new_password,
        email_confirm: true,
      });
      if (pwdErr) {
        const msg = (pwdErr.message || "").toLowerCase();
        let friendly = pwdErr.message;
        if (msg.includes("weak") || msg.includes("pwned") || msg.includes("known to be")) {
          friendly = "Senha muito fraca ou já vazada em incidentes públicos. Use uma senha mais forte (combine letras maiúsculas, minúsculas, números e símbolos, evite sequências e palavras comuns).";
        }
        return new Response(JSON.stringify({ error: friendly }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Audit log
    // Audit log (best-effort)
    try {
      await supabaseAdmin.from("security_audit_log").insert({
        user_id: callerData.user.id,
        action: "partner_updated",
        resource_type: "partners",
        resource_id: partner.id,
        metadata: {
          fields_updated: Object.keys(updates),
          password_changed: !!body.new_password,
          referral_reset: !!body.reset_referral_code,
        },
      });
    } catch (e) {
      console.warn("[admin-update-partner] audit log failed:", e);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[admin-update-partner] error:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
