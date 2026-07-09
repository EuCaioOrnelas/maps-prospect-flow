import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_API = "https://api.asaas.com/v3";

const logStep = (step: string, details?: any) => {
  console.log(`[ASAAS-PAYMENT-CHECK] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

function getPlanSearchesLimit(planKey: string): number {
  const limits: Record<string, number> = { start: 1000, growth: 3000, scale: 10000 };
  return limits[planKey] || 1000;
}

/**
 * Busca um pagamento CONFIRMED/RECEIVED vinculado ao QR Code por seu
 * conciliationIdentifier (txid). Essa é a fonte primária de verdade:
 * independe de CPF/CNPJ/conta do pagador — quem paga o QR pode ser
 * qualquer pessoa/empresa. Retorna o `id` do payment se encontrado.
 */
async function findPaymentByConciliation(
  apiKey: string,
  conciliationId: string,
): Promise<{ paymentId: string; status: string } | null> {
  if (!conciliationId) return null;
  const statuses = ["CONFIRMED", "RECEIVED"];
  for (const status of statuses) {
    try {
      const url = `${ASAAS_API}/payments?pixQrCodeId=${encodeURIComponent(conciliationId)}&status=${status}&limit=1`;
      const res = await fetch(url, {
        headers: { "access_token": apiKey, "Accept": "application/json" },
      });
      const json = await res.json();
      if (json?.data?.length > 0) {
        return { paymentId: json.data[0].id, status: json.data[0].status };
      }
    } catch (e) {
      logStep("findPaymentByConciliation error", { status, error: String(e) });
    }
  }
  return null;
}

/**
 * Fallback legado (retrocompatibilidade). Só é usado quando NÃO temos
 * conciliationId. Amarra o pagamento à autorização — funciona apenas
 * quando o CPF do pagador bate com o do customer no Asaas.
 */
async function findPaymentByAuthorization(
  apiKey: string,
  authorizationId: string,
): Promise<{ paymentId: string; status: string } | null> {
  const statuses = ["CONFIRMED", "RECEIVED"];
  for (const status of statuses) {
    try {
      const url = `${ASAAS_API}/payments?pixAutomaticAuthorizationId=${encodeURIComponent(authorizationId)}&status=${status}&limit=1`;
      const res = await fetch(url, {
        headers: { "access_token": apiKey, "Accept": "application/json" },
      });
      const json = await res.json();
      if (json?.data?.length > 0) {
        return { paymentId: json.data[0].id, status: json.data[0].status };
      }
    } catch (e) {
      logStep("findPaymentByAuthorization error", { status, error: String(e) });
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ASAAS_API_KEY");
    if (!apiKey) throw new Error("ASAAS_API_KEY not configured");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { pixId } = await req.json();
    if (!pixId) throw new Error("pixId is required");

    // `pixId` continua sendo o `authorizationId` (compat com o frontend).
    const authorizationId = pixId as string;

    // 1) Busca o checkout_lead para obter conciliationId (fonte primária).
    const { data: leadRow } = await supabaseClient
      .from("checkout_leads")
      .select("id, asaas_conciliation_id, asaas_authorization_id, asaas_payment_id, checkout_completed")
      .or(`asaas_authorization_id.eq.${authorizationId},stripe_session_id.eq.asaas_pixauto_${authorizationId}`)
      .maybeSingle();

    const conciliationId = leadRow?.asaas_conciliation_id || null;

    logStep("CONCILIATION-TRACE polling start", {
      authorizationId,
      conciliationId,
      checkoutLeadId: leadRow?.id || null,
      alreadyCompleted: leadRow?.checkout_completed || false,
      existingPaymentId: leadRow?.asaas_payment_id || null,
    });

    // 2) Se o webhook já processou, retorna PAID imediatamente.
    if (leadRow?.checkout_completed) {
      logStep("CONCILIATION-TRACE already completed via webhook", {
        authorizationId,
        conciliationId,
        paymentId: leadRow.asaas_payment_id,
      });
      return new Response(
        JSON.stringify({ status: "PAID" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3) Verifica status da autorização (informativo).
    let authStatus: string | null = null;
    try {
      const authRes = await fetch(`${ASAAS_API}/pix/automatic/authorizations/${authorizationId}`, {
        headers: { "access_token": apiKey, "Accept": "application/json" },
      });
      const authJson = await authRes.json();
      if (authRes.ok) authStatus = authJson.status;
    } catch (e) {
      logStep("Auth status fetch failed", { error: String(e) });
    }

    // 4) Fonte primária: conciliationIdentifier do QR Code.
    let matched = conciliationId
      ? await findPaymentByConciliation(apiKey, conciliationId)
      : null;
    let matchedVia: "conciliation" | "authorization" | "auth_active" | null = matched ? "conciliation" : null;

    // 5) Fallback legado: autorização (retrocompat; depende de CPF do pagador).
    if (!matched) {
      matched = await findPaymentByAuthorization(apiKey, authorizationId);
      if (matched) matchedVia = "authorization";
    }

    // 6) Fallback extra: autorização ACTIVE (fluxo feliz — sem duvida foi paga).
    if (!matched && authStatus === "ACTIVE") {
      matchedVia = "auth_active";
    }

    const mappedStatus = matched || authStatus === "ACTIVE" ? "PAID" : (authStatus || "PENDING");

    logStep("CONCILIATION-TRACE conciliation result", {
      authorizationId,
      conciliationId,
      authStatus,
      matchedVia,
      paymentId: matched?.paymentId || null,
      paymentStatus: matched?.status || null,
      mappedStatus,
    });

    // 7) Se pago, ativa o plano (o webhook faz o mesmo — este caminho é redundância defensiva).
    if (mappedStatus === "PAID" && leadRow) {
      const { data: leads } = await supabaseClient
        .from("checkout_leads")
        .select("user_id, email, plan_attempted, checkout_completed")
        .eq("id", leadRow.id)
        .limit(1);

      if (leads && leads.length > 0 && !leads[0].checkout_completed) {
        const lead = leads[0];
        const planNameToKey: Record<string, string> = {
          "Wiize Start": "start",
          "Wiize Atendimento": "start",
          "Wiize Growth": "growth",
          "Wiize Growth IA": "growth",
          "Wiize Scale": "scale",
          "Wiize Enterprise": "scale",
        };
        const planKey = planNameToKey[lead.plan_attempted] || "start";
        const searchesLimit = getPlanSearchesLimit(planKey);
        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + 30);

        let targetId = lead.user_id || null;
        if (!targetId && lead.email) {
          const { data: profileByEmail } = await supabaseClient
            .from("profiles")
            .select("id")
            .eq("email", lead.email)
            .maybeSingle();
          if (profileByEmail) targetId = profileByEmail.id;
        }

        if (targetId) {
          const { data: targetProfile } = await supabaseClient
            .from("profiles")
            .select("admin_assigned_plan")
            .eq("id", targetId)
            .maybeSingle();

          if (targetProfile?.admin_assigned_plan) {
            logStep("Skipping profile update - admin assigned plan", { userId: targetId });
          } else {
            await supabaseClient.from("profiles").update({
              plan: planKey,
              searches_limit: searchesLimit,
              searches_used: 0,
              subscription_current_period_end: periodEnd.toISOString(),
              payment_provider: "asaas",
              updated_at: new Date().toISOString(),
            }).eq("id", targetId);
            logStep("CONCILIATION-TRACE profile activated via polling", {
              userId: targetId,
              planKey,
              matchedVia,
              paymentId: matched?.paymentId || null,
            });
          }
        }

        await supabaseClient
          .from("checkout_leads")
          .update({
            checkout_completed: true,
            checkout_completed_at: new Date().toISOString(),
            user_id: targetId,
            asaas_payment_id: matched?.paymentId || null,
          })
          .eq("id", leadRow.id)
          .eq("checkout_completed", false);

        logStep("CONCILIATION-TRACE checkout completed via polling", {
          authorizationId,
          conciliationId,
          paymentId: matched?.paymentId || null,
          matchedVia,
        });
      }
    }

    return new Response(
      JSON.stringify({ status: mappedStatus }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
