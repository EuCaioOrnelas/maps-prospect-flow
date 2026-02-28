import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Email templates ───────────────────────────────────────────────────────────

const BRAND = {
  name: "Wiize",
  color: "#6C2BD9",
  url: "https://mapstack-pro.lovable.app",
  logo: "https://mapstack-pro.lovable.app/favicon.png",
  from: "Wiize <no-reply@wiize.com.br>",
};

function baseLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
<!-- Header -->
<tr><td style="background:${BRAND.color};padding:24px 32px;text-align:center;">
  <img src="${BRAND.logo}" alt="${BRAND.name}" width="32" height="32" style="display:inline-block;vertical-align:middle;border-radius:8px;">
  <span style="color:#ffffff;font-size:20px;font-weight:700;margin-left:8px;vertical-align:middle;">${BRAND.name}</span>
</td></tr>
<!-- Body -->
<tr><td style="padding:32px;">
${body}
</td></tr>
<!-- Footer -->
<tr><td style="padding:16px 32px;background:#fafafa;text-align:center;border-top:1px solid #e4e4e7;">
  <p style="margin:0;font-size:12px;color:#a1a1aa;">Você recebeu este e-mail porque tem uma conta na ${BRAND.name}.</p>
  <p style="margin:4px 0 0;font-size:12px;color:#a1a1aa;"><a href="${BRAND.url}/profile" style="color:${BRAND.color};">Gerenciar preferências de e-mail</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

interface TemplateResult {
  subject: string;
  html: string;
}

function templateCampaignStarted(payload: Record<string, unknown>): TemplateResult {
  const name = payload.campaign_name as string || "Sua campanha";
  const totalLeads = payload.total_leads as number || 0;
  const scheduledTime = payload.scheduled_time as string || "";

  return {
    subject: `🚀 Campanha "${name}" iniciada!`,
    html: baseLayout(`Campanha Iniciada`, `
      <h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">Campanha iniciada com sucesso!</h1>
      <p style="margin:0 0 8px;color:#3f3f46;font-size:15px;">Sua campanha <strong>"${name}"</strong> começou a enviar mensagens.</p>
      <table role="presentation" width="100%" style="margin:16px 0;background:#f4f4f5;border-radius:8px;padding:16px;">
        <tr><td style="padding:8px 16px;">
          <p style="margin:0;font-size:14px;color:#71717a;">📋 Total de leads: <strong style="color:#18181b;">${totalLeads}</strong></p>
          ${scheduledTime ? `<p style="margin:8px 0 0;font-size:14px;color:#71717a;">⏰ Horário: <strong style="color:#18181b;">${scheduledTime}</strong></p>` : ""}
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:14px;color:#71717a;">Você pode acompanhar o progresso em tempo real no painel.</p>
      <a href="${BRAND.url}/whatsapp" style="display:inline-block;margin-top:16px;padding:12px 24px;background:${BRAND.color};color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Ver progresso</a>
    `),
  };
}

function templateNumberDisconnected(payload: Record<string, unknown>): TemplateResult {
  const phone = payload.phone_number as string || "Número desconhecido";
  const instanceName = payload.instance_name as string || "";

  return {
    subject: `⚠️ Número WhatsApp desconectado`,
    html: baseLayout(`Número Desconectado`, `
      <h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">Atenção: número desconectado</h1>
      <p style="margin:0 0 8px;color:#3f3f46;font-size:15px;">O número <strong>${phone}</strong>${instanceName ? ` (${instanceName})` : ""} foi desconectado do WhatsApp.</p>
      <div style="margin:16px 0;padding:12px 16px;background:#fef2f2;border-left:4px solid #ef4444;border-radius:4px;">
        <p style="margin:0;font-size:14px;color:#991b1b;">⛔ Campanhas e agentes usando este número estão pausados.</p>
      </div>
      <p style="margin:16px 0 0;font-size:14px;color:#71717a;">Reconecte o número para retomar as operações.</p>
      <a href="${BRAND.url}/whatsapp" style="display:inline-block;margin-top:16px;padding:12px 24px;background:${BRAND.color};color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Reconectar agora</a>
    `),
  };
}

function templateCampaignFailed(payload: Record<string, unknown>): TemplateResult {
  const name = payload.campaign_name as string || "Sua campanha";
  const reason = payload.reason as string || "Erro desconhecido";

  return {
    subject: `❌ Campanha "${name}" falhou ao iniciar`,
    html: baseLayout(`Campanha com Falha`, `
      <h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">Falha ao iniciar campanha</h1>
      <p style="margin:0 0 8px;color:#3f3f46;font-size:15px;">A campanha <strong>"${name}"</strong> não pôde ser iniciada.</p>
      <div style="margin:16px 0;padding:12px 16px;background:#fef2f2;border-left:4px solid #ef4444;border-radius:4px;">
        <p style="margin:0;font-size:14px;color:#991b1b;">Motivo: ${reason}</p>
      </div>
      <p style="margin:16px 0 0;font-size:14px;color:#71717a;">Verifique as configurações e tente novamente.</p>
      <a href="${BRAND.url}/whatsapp" style="display:inline-block;margin-top:16px;padding:12px 24px;background:${BRAND.color};color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Configurar campanha</a>
    `),
  };
}

function templateWeeklySummary(payload: Record<string, unknown>): TemplateResult {
  const period = payload.period as string || "esta semana";
  const messagesSent = payload.messages_sent as number || 0;
  const responses = payload.responses as number || 0;
  const responseRate = payload.response_rate as number || 0;
  const newLeads = payload.new_leads as number || 0;

  return {
    subject: `📊 Seu resumo semanal — ${period}`,
    html: baseLayout(`Resumo Semanal`, `
      <h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">Resumo da semana</h1>
      <p style="margin:0 0 16px;color:#3f3f46;font-size:15px;">Confira o desempenho da ${period}:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
        <tr>
          <td width="50%" style="padding:12px;background:#f0fdf4;border-radius:8px 0 0 8px;text-align:center;">
            <p style="margin:0;font-size:24px;font-weight:700;color:#166534;">${messagesSent}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#71717a;">Mensagens enviadas</p>
          </td>
          <td width="50%" style="padding:12px;background:#eff6ff;border-radius:0 8px 8px 0;text-align:center;">
            <p style="margin:0;font-size:24px;font-weight:700;color:#1e40af;">${responses}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#71717a;">Respostas</p>
          </td>
        </tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="50%" style="padding:12px;background:#faf5ff;border-radius:8px 0 0 8px;text-align:center;">
            <p style="margin:0;font-size:24px;font-weight:700;color:${BRAND.color};">${responseRate}%</p>
            <p style="margin:4px 0 0;font-size:12px;color:#71717a;">Taxa de resposta</p>
          </td>
          <td width="50%" style="padding:12px;background:#fffbeb;border-radius:0 8px 8px 0;text-align:center;">
            <p style="margin:0;font-size:24px;font-weight:700;color:#92400e;">${newLeads}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#71717a;">Novos leads</p>
          </td>
        </tr>
      </table>
      <a href="${BRAND.url}/dashboard" style="display:inline-block;margin-top:24px;padding:12px 24px;background:${BRAND.color};color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Ver dashboard completo</a>
    `),
  };
}

const TEMPLATES: Record<string, (payload: Record<string, unknown>) => TemplateResult> = {
  CAMPAIGN_SCHEDULED_STARTED: templateCampaignStarted,
  WEEKLY_SUMMARY: templateWeeklySummary,
  NUMBER_DISCONNECTED: templateNumberDisconnected,
  CAMPAIGN_FAILED_TO_START: templateCampaignFailed,
};

// ─── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const {
      user_id,
      email_type,
      payload = {},
      idempotency_key,
    } = body as {
      user_id: string;
      email_type: string;
      payload?: Record<string, unknown>;
      idempotency_key?: string;
    };

    if (!user_id || !email_type) {
      return new Response(
        JSON.stringify({ error: "user_id and email_type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Idempotency check
    if (idempotency_key) {
      const { data: existing } = await supabase
        .from("email_logs")
        .select("id, status")
        .eq("idempotency_key", idempotency_key)
        .maybeSingle();

      if (existing) {
        console.log(`[send-email] Duplicate detected: ${idempotency_key}`);
        return new Response(
          JSON.stringify({ success: true, duplicate: true, id: existing.id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get user profile + preferences
    const [profileResult, prefsResult] = await Promise.all([
      supabase.from("profiles").select("email, name").eq("id", user_id).maybeSingle(),
      supabase.from("email_preferences").select("transactional_enabled").eq("user_id", user_id).maybeSingle(),
    ]);

    if (!profileResult.data?.email) {
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const toEmail = profileResult.data.email;

    // Check preferences (default: enabled)
    const transactionalEnabled = prefsResult.data?.transactional_enabled ?? true;
    if (!transactionalEnabled && email_type !== "ADMIN_BROADCAST") {
      console.log(`[send-email] User ${user_id} has transactional emails disabled`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "user_opted_out" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate email content
    const templateFn = TEMPLATES[email_type];
    if (!templateFn) {
      return new Response(
        JSON.stringify({ error: `Unknown email_type: ${email_type}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { subject, html } = templateFn(payload);

    // Insert log as queued
    const { data: logEntry, error: logError } = await supabase
      .from("email_logs")
      .insert({
        user_id,
        to_email: toEmail,
        email_type,
        status: "queued",
        payload,
        idempotency_key: idempotency_key || null,
      })
      .select("id")
      .single();

    if (logError) {
      console.error("[send-email] Log insert error:", logError);
    }

    // Send via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: BRAND.from,
        to: [toEmail],
        subject,
        html,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("[send-email] Resend error:", resendData);

      // Update log as failed
      if (logEntry?.id) {
        await supabase
          .from("email_logs")
          .update({
            status: "failed",
            error_message: JSON.stringify(resendData),
          })
          .eq("id", logEntry.id);
      }

      return new Response(
        JSON.stringify({ error: "Failed to send email", details: resendData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update log as sent
    if (logEntry?.id) {
      await supabase
        .from("email_logs")
        .update({
          status: "sent",
          provider_message_id: resendData.id || null,
          sent_at: new Date().toISOString(),
        })
        .eq("id", logEntry.id);
    }

    console.log(`[send-email] Sent ${email_type} to ${toEmail} (resend_id: ${resendData.id})`);

    return new Response(
      JSON.stringify({ success: true, id: logEntry?.id, provider_id: resendData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[send-email] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
