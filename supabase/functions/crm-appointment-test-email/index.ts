import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import {
  buildAppointmentFrom,
  isValidEmail,
  renderAppointmentEmail,
  SAMPLE_APPOINTMENT_VARS,
  type AppointmentEmailSettings,
} from "../_shared/appointment-email.ts";

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

    const recipient = user.email;
    if (!isValidEmail(recipient)) return json({ error: "Seu usuário não possui e-mail válido." }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // ── Rate limit central por tipo de aviso: 1 a cada 2 min e 10 por semana ──
    const burst = await admin.rpc("check_rate_limit", {
      p_identifier: user.id,
      p_endpoint: "appointment_test_email_burst",
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
      p_endpoint: "appointment_test_email_weekly",
      p_max_requests: 10,
      p_window_seconds: 604800,
    });
    if (weekly.data && (weekly.data as any).allowed === false) {
      return json({ error: "Você atingiu o limite de 10 e-mails de teste por semana." }, 429);
    }

    const { data: ownerId } = await userClient.rpc("current_account_owner");
    const accountOwnerId = (ownerId as string) || user.id;

    const { data: settingsRow } = await admin
      .from("crm_appointment_email_settings")
      .select("*")
      .eq("owner_user_id", accountOwnerId)
      .maybeSingle();

    const bodyJson = await req.json().catch(() => ({}));
    const settings: AppointmentEmailSettings = {
      ...(settingsRow || {}),
      ...((bodyJson?.settings as AppointmentEmailSettings) || {}),
    };

    const vars = {
      ...SAMPLE_APPOINTMENT_VARS,
      responsavel: user.user_metadata?.name || user.email || SAMPLE_APPOINTMENT_VARS.responsavel,
      link_compromisso: "https://wiize.com.br/agenda",
    };

    const { subject, html } = renderAppointmentEmail(settings, vars, { isTest: true });

    if (!RESEND_API_KEY) return json({ error: "Serviço de e-mail não configurado." }, 500);

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: buildAppointmentFrom(settings), to: [recipient], subject, html }),
    });
    const resendData = await resendRes.json().catch(() => ({}));

    await admin.from("calendar_email_logs").insert({
      owner_user_id: accountOwnerId,
      event_id: null,
      user_id: user.id,
      email_type: "appointment",
      reminder_key: "test",
      recipient_email: recipient,
      recipient_role: "self",
      status: resendRes.ok ? "sent" : "failed",
      error_message: resendRes.ok ? null : JSON.stringify(resendData).slice(0, 500),
      provider_message_id: resendData?.id ?? null,
      sent_at: resendRes.ok ? new Date().toISOString() : null,
    });

    if (!resendRes.ok) {
      console.error("[crm-appointment-test-email] resend error", resendData);
      return json({ error: "Falha ao enviar o e-mail de teste.", details: resendData }, 502);
    }

    return json({ success: true, sent_to: recipient });
  } catch (e) {
    console.error("[crm-appointment-test-email]", e);
    return json({ error: (e as Error).message }, 500);
  }
});
