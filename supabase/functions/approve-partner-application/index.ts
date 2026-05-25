// Admin-only: approves a partner application.
// Reuses admin-create-partner internally (with the password chosen
// by the candidate during signup), then marks the application as
// approved and sends the welcome email.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) return json(401, { error: "Unauthorized" });
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: callerData } = await callerClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!callerData?.user) return json(401, { error: "Unauthorized" });

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: roleCheck } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleCheck) return json(403, { error: "Forbidden — admin only" });

    const { application_id, level, custom_commission_percent } = await req.json();
    if (!application_id) return json(400, { error: "application_id obrigatório" });

    const { data: app, error: appErr } = await supabase
      .from("partner_applications")
      .select("*")
      .eq("id", application_id)
      .maybeSingle();

    if (appErr || !app) return json(404, { error: "Candidatura não encontrada" });
    if (app.status === "approved") return json(400, { error: "Candidatura já aprovada" });
    if (!app.password_hash) return json(400, { error: "Candidatura sem senha definida — aprove via cadastro manual" });

    // Generate a secure transient password (rotated on first login)
    // and use it to create the auth user. We then invalidate it by
    // calling password reset, but for a smoother UX we use the user-chosen
    // password — which we already validated. To honor the bcrypt hash and
    // not store the plain password anywhere, we store the chosen password
    // in a temporary one-shot secret column, but here we cannot recover it.
    // Strategy: candidate chose a password during apply → we hashed it → we
    // CANNOT recreate that password server-side. So at approval time we
    // generate a new temporary password and email it.
    const tempPassword = `Wiize${crypto.randomUUID().slice(0, 8)}!${Math.floor(Math.random() * 9000 + 1000)}`;

    // Call admin-create-partner internally
    const createResp = await fetch(`${supabaseUrl}/functions/v1/admin-create-partner`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        full_name: app.full_name,
        email: app.access_email || app.email,
        password: tempPassword,
        phone: app.phone,
        company: app.company_name,
        tax_id: app.cnpj || app.cpf,
        country: app.country || "BR",
        level: level || "bronze",
        custom_commission_percent: custom_commission_percent ?? null,
        internal_notes: `Aprovado via candidatura #${app.id}. Score: ${app.internal_score || 0}.`,
        status: "active",
      }),
    });

    const createResult = await createResp.json();
    if (!createResp.ok) {
      console.error("[approve-partner-application] create error:", createResult);
      return json(createResp.status, { error: createResult?.error || "Falha ao criar parceiro" });
    }

    const partnerId = createResult.partner?.id;

    // Mark application as approved
    await supabase
      .from("partner_applications")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by_admin_id: callerData.user.id,
        approved_partner_id: partnerId,
      })
      .eq("id", app.id);

    // Send welcome email with temporary password + official certificate PDF in attach
    const portalUrl = "https://wiize.com.br/partners/login";
    const { data: createdPartner } = await supabase
      .from("partners")
      .select("full_name, tax_id, verification_code, created_at")
      .eq("id", partnerId)
      .maybeSingle();

    fetch(`${supabaseUrl}/functions/v1/send-partner-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({
        type: "partner_welcome",
        to: app.access_email || app.email,
        data: {
          first_name: app.full_name.split(" ")[0] || "Parceiro",
          temp_password: tempPassword,
          portal_url: portalUrl,
          login_email: app.access_email || app.email,
          certificate: createdPartner
            ? {
                full_name: createdPartner.full_name,
                tax_id: createdPartner.tax_id,
                partner_since: createdPartner.created_at,
                verification_code: createdPartner.verification_code,
              }
            : undefined,
        },
      }),
    }).catch((e) => console.warn("[approve-partner-application] email err:", e));

    return json(200, {
      success: true,
      partner_id: partnerId,
      temp_password: tempPassword,
    });
  } catch (e) {
    console.error("[approve-partner-application] fatal:", e);
    return json(500, { error: "Erro inesperado" });
  }
});
