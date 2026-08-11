import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import {
  buildFromAddress,
  isValidEmail,
  renderRenewalEmail,
  type RenewalSettings,
} from "../_shared/renewal-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fmtMoney = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    const user = userData?.user;
    if (userErr || !user) return json({ error: "unauthorized" }, 401);

    // O teste SEMPRE vai para o e-mail de login do usuário autenticado.
    const recipient = user.email;
    if (!isValidEmail(recipient)) return json({ error: "Seu usuário não possui e-mail válido." }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // ── Rate limit (backend): 1 a cada 2 min e 10 por semana ────────────────
    const burst = await admin.rpc("check_rate_limit", {
      p_identifier: user.id,
      p_endpoint: "renewal_test_email_burst",
      p_max_requests: 1,
      p_window_seconds: 120,
    });
    if (burst.data && (burst.data as any).allowed === false) {
      const retry = (burst.data as any).retry_after ?? 120;
      return json(
        { error: `Aguarde ${retry}s para enviar outro teste (limite de 1 a cada 2 minutos).`, retry_after: retry },
        429,
      );
    }
    const weekly = await admin.rpc("check_rate_limit", {
      p_identifier: user.id,
      p_endpoint: "renewal_test_email_weekly",
      p_max_requests: 10,
      p_window_seconds: 604800,
    });
    if (weekly.data && (weekly.data as any).allowed === false) {
      return json({ error: "Você atingiu o limite de 10 e-mails de teste por semana." }, 429);
    }

    const { data: ownerId } = await userClient.rpc("current_account_owner");
    const accountOwnerId = (ownerId as string) || user.id;

    const { data: settingsRow } = await admin
      .from("crm_renewal_settings")
      .select("*")
      .eq("owner_user_id", accountOwnerId)
      .maybeSingle();

    // Permite pré-visualizar alterações ainda não salvas
    const bodyJson = await req.json().catch(() => ({}));
    const settings: RenewalSettings = { ...(settingsRow || {}), ...((bodyJson?.settings as RenewalSettings) || {}) };

    const appUrl = "https://wiize.com.br";
    const { subject, html } = renderRenewalEmail(settings, {
      clientName: "João da Silva",
      companyName: "Empresa Exemplo LTDA",
      responsibleName: user.user_metadata?.name || user.email || "Responsável",
      expirationDate: new Date(Date.now() + 7 * 86400000).toLocaleDateString("pt-BR"),
      daysLeft: 7,
      contractValue: fmtMoney(1500),
      contractTotal: fmtMoney(18000),
      contractMonths: 12,
      saleTitle: "Contrato de prestação de serviços",
      ctaUrl: `${appUrl}/crm/vendas`,
      isTest: true,
    });

    if (!RESEND_API_KEY) return json({ error: "Serviço de e-mail não configurado." }, 500);

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: buildFromAddress(settings),
        to: [recipient],
        subject,
        html,
      }),
    });
    const resendData = await resendRes.json().catch(() => ({}));

    await admin.from("crm_renewal_notice_logs").insert({
      owner_user_id: accountOwnerId,
      deal_id: null,
      notice_type: "test",
      recipient_email: recipient,
      recipient_role: "self",
      status: resendRes.ok ? "sent" : "failed",
      error_message: resendRes.ok ? null : JSON.stringify(resendData).slice(0, 500),
      provider_message_id: resendData?.id ?? null,
      sent_at: resendRes.ok ? new Date().toISOString() : null,
    });

    if (!resendRes.ok) {
      console.error("[crm-renewal-test-email] resend error", resendData);
      return json({ error: "Falha ao enviar o e-mail de teste.", details: resendData }, 502);
    }

    return json({ success: true, sent_to: recipient });
  } catch (e) {
    console.error("[crm-renewal-test-email]", e);
    return json({ error: (e as Error).message }, 500);
  }
});
