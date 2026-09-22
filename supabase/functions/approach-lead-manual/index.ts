// PRIMEIRO CONTATO MANUAL (não é template Meta, não é follow-up).
// Toda a lógica de geração vive em ../_shared/approach-engine.ts (motor único).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  type ApproachInput,
  corsHeaders,
  formatProductCatalog,
  generateApproachMessage,
  hasContactNumber,
  resolveBusinessModel,
} from "../_shared/approach-engine.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autorizado" }, 401);
    const token = authHeader.replace("Bearer ", "");

    const internalUserId = req.headers.get("x-wiize-api-user");
    const internalMode = !!internalUserId && token === SUPABASE_SERVICE_ROLE_KEY;

    let user: { id: string } | null = null;
    if (internalMode) {
      user = { id: internalUserId! };
    } else {
      const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !authUser) return json({ error: "Usuário não autenticado" }, 401);
      user = authUser;
    }

    const body = await req.json();
    const { lead_id } = body ?? {};

    let lead: any = null;
    if (internalMode && body?.lead && typeof body.lead === "object") {
      lead = body.lead;
    } else {
      if (!lead_id) return json({ error: "lead_id é obrigatório" }, 400);
      const { data: leadRow, error: leadErr } = await supabase
        .from("leads").select("*").eq("id", lead_id).eq("user_id", user.id).single();
      if (leadErr || !leadRow) return json({ error: "Lead não encontrado" }, 404);
      lead = leadRow;
    }

    if (lead?.source === "web") {
      return json({
        error: "web_source_no_message",
        message: "Oportunidades da Prospecção Web não geram mensagem de abordagem.",
      }, 422);
    }

    if (!hasContactNumber(lead)) {
      return json({ error: "no_contact_number", message: "Número não encontrado para esta empresa." }, 422);
    }

    // Geração única: se já existe abordagem manual salva, devolve a mesma.
    const savedManualApproach = lead?.enrichment_data?.manual_approach;
    if (!internalMode && String(savedManualApproach?.message || "").trim()) {
      return json({
        mensagem: savedManualApproach.message,
        gancho: savedManualApproach.gancho || "",
        motivo: savedManualApproach.motivo || "",
        insight: savedManualApproach.insight || "",
        estrategia: savedManualApproach.estrategia || "",
        reused: true,
      });
    }

    const { data: companyProfile } = await supabase
      .from("company_profiles").select("*").eq("user_id", user.id).single();

    const { data: companyServices } = await supabase
      .from("company_services")
      .select("name, description")
      .eq("owner_user_id", companyProfile?.owner_user_id || user.id)
      .limit(20);

    const businessModel = resolveBusinessModel(companyProfile);
    const productCatalog = formatProductCatalog(companyServices);

    if (!companyProfile || (!String(companyProfile.company_products || "").trim() && !productCatalog)) {
      return json({
        error: "missing_company_profile",
        message: "Complete os produtos ou serviços da sua empresa antes de gerar a abordagem.",
      }, 422);
    }

    const enrichment = lead.enrichment_data && typeof lead.enrichment_data === "object"
      ? lead.enrichment_data as Record<string, any>
      : {};

    const input: ApproachInput = {
      messageType: "manual_first_contact",
      companyProfile,
      productCatalog,
      businessModel,
      lead,
      enrichment,
      seed: crypto.randomUUID().slice(0, 8),
    };

    const result = await generateApproachMessage(OPENAI_API_KEY, input, "approach-lead-manual");
    if ("error" in result) {
      if (result.error === "rate_limit") return json({ error: "Limite de requisições excedido. Tente novamente em instantes." }, 429);
      if (result.error === "no_credits") return json({ error: "Créditos de IA esgotados." }, 402);
      throw new Error(`AI gateway error: ${result.status}`);
    }

    const { parsed, rewriteReason } = result;
    const finalMessage = parsed.mensagem || "";

    if (!internalMode) {
      const { error: updateErr } = await supabase
        .from("leads")
        .update({
          enrichment_data: {
            ...enrichment,
            manual_approach: {
              message: finalMessage,
              gancho: parsed.gancho || "",
              motivo: parsed.motivo || "",
              insight: parsed.insight || "",
              estrategia: parsed.estrategia || "",
              business_model_used: businessModel,
              rewrite_reason: rewriteReason,
              generated_at: new Date().toISOString(),
            },
          },
        })
        .eq("id", lead_id)
        .eq("user_id", user.id);
      if (updateErr) console.error("Update error:", updateErr);
    }

    return json({
      mensagem: finalMessage,
      gancho: parsed.gancho || "",
      motivo: parsed.motivo || "",
      insight: parsed.insight || "",
      estrategia: parsed.estrategia || "",
    });
  } catch (err) {
    console.error("Approach-manual error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
