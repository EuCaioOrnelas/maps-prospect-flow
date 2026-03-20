import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Email templates ───────────────────────────────────────────────────────────

const BRAND = {
  name: "Wiize",
  color: "#3daa57",
  url: "https://wiize.com.br",
  logo: "https://lqfqnqfeuneorxocybru.supabase.co/storage/v1/object/public/avatars/email/logo_wiize.png",
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
  const totalContacts = payload.total_leads as number || payload.total_contacts as number || 0;
  const scheduledTime = payload.scheduled_time as string || "";

  return {
    subject: `🚀 Campanha "${name}" iniciada!`,
    html: baseLayout(`Campanha Iniciada`, `
      <h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">Campanha iniciada com sucesso!</h1>
      <p style="margin:0 0 8px;color:#3f3f46;font-size:15px;">Sua campanha <strong>"${name}"</strong> começou a enviar mensagens.</p>
      <div style="margin:16px 0;padding:16px;background:#f0fdf4;border-radius:8px;text-align:center;">
        <p style="margin:0;font-size:28px;font-weight:700;color:#166534;">${totalContacts}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#71717a;">Contatos na campanha</p>
      </div>
      ${scheduledTime ? `<p style="margin:0 0 8px;font-size:14px;color:#71717a;">⏰ Horário: <strong style="color:#18181b;">${scheduledTime}</strong></p>` : ""}
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
      <div style="margin:16px 0;padding:12px 16px;background:#fffbeb;border-left:4px solid #f59e0b;border-radius:4px;">
        <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#92400e;">📱 Por que isso aconteceu?</p>
        <p style="margin:0;font-size:13px;color:#78350f;line-height:1.6;">Essa desconexão foi causada pelo próprio WhatsApp. Isso pode ocorrer quando:</p>
        <ul style="margin:8px 0 0;padding-left:20px;font-size:13px;color:#78350f;line-height:1.8;">
          <li>O WhatsApp Web/Desktop foi aberto em outro dispositivo ou navegador</li>
          <li>A sessão expirou por inatividade prolongada</li>
          <li>O aplicativo do WhatsApp no celular foi atualizado ou reinstalado</li>
          <li>O WhatsApp encerrou sessões ativas por motivos de segurança</li>
        </ul>
      </div>
      <div style="margin:12px 0;padding:12px 16px;background:#fef2f2;border-left:4px solid #ef4444;border-radius:4px;">
        <p style="margin:0;font-size:14px;color:#991b1b;">⛔ Campanhas e agentes usando este número estão pausados até a reconexão.</p>
      </div>
      <p style="margin:16px 0 0;font-size:14px;color:#71717a;">Reconecte o número para retomar as operações normalmente.</p>
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

function templateAdminBroadcast(payload: Record<string, unknown>): TemplateResult {
  const subject = payload.subject as string || "Novidades da Wiize";
  const content = payload.content as string || "";

  return {
    subject,
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
<!-- HEADER FIXO -->
<tr><td style="background:${BRAND.color};padding:24px 32px;text-align:center;">
  <img src="${BRAND.logo}" alt="${BRAND.name}" width="32" height="32" style="display:inline-block;vertical-align:middle;border-radius:8px;">
  <span style="color:#ffffff;font-size:20px;font-weight:700;margin-left:8px;vertical-align:middle;">${BRAND.name}</span>
</td></tr>
<!-- BODY (conteúdo do admin) -->
<tr><td style="padding:32px;">
  <div style="color:#3f3f46;font-size:15px;line-height:1.7;">
    ${content}
  </div>
</td></tr>
<!-- FOOTER FIXO -->
<tr><td style="padding:20px 32px;background:#fafafa;text-align:center;border-top:1px solid #e4e4e7;">
  <p style="margin:0 0 6px;font-size:12px;color:#a1a1aa;font-weight:600;">Este é um e-mail automático — por favor, não responda.</p>
  <p style="margin:0 0 4px;font-size:11px;color:#a1a1aa;">Enviado por <strong>${BRAND.name}</strong> • <a href="${BRAND.url}" style="color:${BRAND.color};text-decoration:none;">${BRAND.url.replace('https://', '')}</a></p>
  <p style="margin:0;font-size:11px;color:#a1a1aa;"><a href="${BRAND.url}/profile" style="color:${BRAND.color};text-decoration:none;">Gerenciar preferências de e-mail</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  };
}

function templateCampaignCompleted(payload: Record<string, unknown>): TemplateResult {
  const name = payload.campaign_name as string || "Sua campanha";
  const totalContacts = payload.total_contacts as number || payload.total_leads as number || 0;
  const totalSent = payload.total_sent as number || 0;
  const sendRate = totalContacts > 0 ? Math.round((totalSent / totalContacts) * 100) : 0;

  return {
    subject: `✅ Campanha "${name}" concluída!`,
    html: baseLayout(`Campanha Concluída`, `
      <h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">Campanha concluída!</h1>
      <p style="margin:0 0 16px;color:#3f3f46;font-size:15px;">A campanha <strong>"${name}"</strong> foi finalizada com sucesso.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
        <tr>
          <td width="33%" style="padding:12px;background:#f0fdf4;border-radius:8px 0 0 8px;text-align:center;">
            <p style="margin:0;font-size:24px;font-weight:700;color:#166534;">${totalContacts}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#71717a;">Contatos</p>
          </td>
          <td width="33%" style="padding:12px;background:#eff6ff;text-align:center;">
            <p style="margin:0;font-size:24px;font-weight:700;color:#1e40af;">${totalSent}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#71717a;">Enviadas</p>
          </td>
          <td width="33%" style="padding:12px;background:#faf5ff;border-radius:0 8px 8px 0;text-align:center;">
            <p style="margin:0;font-size:24px;font-weight:700;color:${BRAND.color};">${sendRate}%</p>
            <p style="margin:4px 0 0;font-size:12px;color:#71717a;">Taxa de envio</p>
          </td>
        </tr>
      </table>
      <a href="${BRAND.url}/whatsapp" style="display:inline-block;margin-top:16px;padding:12px 24px;background:${BRAND.color};color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Ver detalhes</a>
    `),
  };
}

function templateWeeklySummary(payload: Record<string, unknown>): TemplateResult {
  const totalContacts = payload.total_contacts as number || 0;
  const totalSent = payload.total_sent as number || 0;
  const activeCampaigns = payload.active_campaigns as number || 0;
  const sendRate = totalContacts > 0 ? Math.round((totalSent / totalContacts) * 100) : 0;

  return {
    subject: `📊 Resumo semanal da sua conta Wiize`,
    html: baseLayout(`Resumo Semanal`, `
      <h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">Seu resumo da semana</h1>
      <p style="margin:0 0 16px;color:#3f3f46;font-size:15px;">Confira os números da sua conta nos últimos 7 dias:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
        <tr>
          <td width="33%" style="padding:12px;background:#f0fdf4;border-radius:8px 0 0 8px;text-align:center;">
            <p style="margin:0;font-size:24px;font-weight:700;color:#166534;">${totalContacts}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#71717a;">Contatos</p>
          </td>
          <td width="33%" style="padding:12px;background:#eff6ff;text-align:center;">
            <p style="margin:0;font-size:24px;font-weight:700;color:#1e40af;">${totalSent}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#71717a;">Enviadas</p>
          </td>
          <td width="33%" style="padding:12px;background:#faf5ff;border-radius:0 8px 8px 0;text-align:center;">
            <p style="margin:0;font-size:24px;font-weight:700;color:${BRAND.color};">${sendRate}%</p>
            <p style="margin:4px 0 0;font-size:12px;color:#71717a;">Taxa de envio</p>
          </td>
        </tr>
      </table>
      ${activeCampaigns > 0 ? `<p style="margin:0 0 8px;font-size:14px;color:#71717a;">📣 Campanhas ativas: <strong style="color:#18181b;">${activeCampaigns}</strong></p>` : ""}
      <a href="${BRAND.url}/dashboard" style="display:inline-block;margin-top:16px;padding:12px 24px;background:${BRAND.color};color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Ver dashboard</a>
    `),
  };
}
function templateSubscriptionRenewal(payload: Record<string, unknown>): TemplateResult {
  const userName = payload.user_name as string || "Cliente";
  const planName = payload.plan_name as string || "Seu plano";
  const planPrice = payload.plan_price as string || "";
  const expiryDate = payload.expiry_date as string || "";
  const remainingDays = payload.remaining_days as number || 0;
  const checkoutUrl = payload.checkout_url as string || "";

  const urgencyColor = remainingDays <= 2 ? "#ef4444" : remainingDays <= 4 ? "#f59e0b" : "#3daa57";
  const urgencyText = remainingDays <= 1 
    ? "⚠️ Sua assinatura vence amanhã!" 
    : remainingDays <= 3 
      ? `⚠️ Faltam apenas ${remainingDays} dias para o vencimento` 
      : `Faltam ${remainingDays} dias para o vencimento`;

  return {
    subject: remainingDays <= 2 
      ? `⚠️ Último aviso: seu plano ${planName} vence em ${remainingDays} dia${remainingDays > 1 ? 's' : ''}!`
      : `🔔 Seu plano ${planName} vence em ${remainingDays} dias — renove agora`,
    html: baseLayout(`Renovação de Assinatura`, `
      <h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">Olá, ${userName}!</h1>
      
      <div style="margin:16px 0;padding:16px;background:#fafafa;border-radius:8px;border-left:4px solid ${urgencyColor};">
        <p style="margin:0;font-size:16px;font-weight:600;color:${urgencyColor};">${urgencyText}</p>
        <p style="margin:8px 0 0;font-size:14px;color:#71717a;">Data de vencimento: <strong style="color:#18181b;">${expiryDate}</strong></p>
      </div>

      <p style="margin:16px 0 8px;color:#3f3f46;font-size:15px;">
        Para manter seu acesso ao <strong>${planName}</strong> sem interrupções, renove sua assinatura via PIX.
      </p>

      <div style="margin:16px 0;padding:16px;background:#f0fdf4;border-radius:8px;text-align:center;">
        <p style="margin:0;font-size:13px;color:#71717a;">Valor da renovação</p>
        <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#166534;">${planPrice}<span style="font-size:14px;font-weight:400;color:#71717a;">/mês</span></p>
      </div>

      <div style="text-align:center;margin:24px 0;">
        <a href="${checkoutUrl}" style="display:inline-block;padding:14px 32px;background:${BRAND.color};color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Renovar Assinatura via PIX</a>
      </div>

      <div style="margin:16px 0;padding:12px 16px;background:#fffbeb;border-radius:8px;">
        <p style="margin:0;font-size:13px;color:#92400e;">
          💡 <strong>Pode pagar com antecedência!</strong> Se você pagar antes do vencimento, a renovação será contabilizada a partir da data de vencimento atual, sem perder nenhum dia.
        </p>
      </div>

      <div style="margin:16px 0;padding:12px 16px;background:#fef2f2;border-radius:8px;">
        <p style="margin:0;font-size:13px;color:#991b1b;">
          ⚠️ Caso o pagamento não seja realizado, o acesso ao sistema será suspenso <strong>1 dia após o vencimento</strong>.
        </p>
      </div>

      <p style="margin:16px 0 0;font-size:13px;color:#a1a1aa;">Se tiver dúvidas, entre em contato com nosso suporte.</p>
    `),
  };
}

const TEMPLATES: Record<string, (payload: Record<string, unknown>) => TemplateResult> = {
  CAMPAIGN_SCHEDULED_STARTED: templateCampaignStarted,
  WEEKLY_SUMMARY: templateWeeklySummary,
  NUMBER_DISCONNECTED: templateNumberDisconnected,
  CAMPAIGN_FAILED_TO_START: templateCampaignFailed,
  ADMIN_BROADCAST: templateAdminBroadcast,
  CAMPAIGN_COMPLETED: templateCampaignCompleted,
  SUBSCRIPTION_RENEWAL: templateSubscriptionRenewal,
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
      override_email,
    } = body as {
      user_id: string;
      email_type: string;
      payload?: Record<string, unknown>;
      idempotency_key?: string;
      override_email?: string;
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

    const toEmail = override_email || profileResult.data.email;

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

    // Insert log as queued (with subject)
    const { data: logEntry, error: logError } = await supabase
      .from("email_logs")
      .insert({
        user_id,
        to_email: toEmail,
        email_type,
        status: "queued",
        subject,
        payload,
        idempotency_key: idempotency_key || null,
      })
      .select("id")
      .single();

    if (logError) {
      console.error("[send-email] Log insert error:", logError);
    }

    // Inject tracking into HTML
    let trackedHtml = html;
    if (logEntry?.id) {
      const trackerBase = `${supabaseUrl}/functions/v1/email-tracker`;

      // 1) Rewrite <a href="..."> links for click tracking (skip mailto: and #)
      trackedHtml = trackedHtml.replace(
        /(<a\s[^>]*href=["'])([^"'#][^"']*)(["'][^>]*>)/gi,
        (match, prefix, url, suffix) => {
          if (url.startsWith("mailto:") || url.startsWith("#")) return match;
          const trackUrl = `${trackerBase}?lid=${logEntry.id}&action=click&url=${encodeURIComponent(url)}`;
          return `${prefix}${trackUrl}${suffix}`;
        }
      );

      // 2) Inject open tracking pixel before </body>
      const pixelUrl = `${trackerBase}?lid=${logEntry.id}&action=open`;
      const pixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none;" alt="" />`;
      trackedHtml = trackedHtml.replace("</body>", `${pixel}</body>`);
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
        html: trackedHtml,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("[send-email] Resend error:", resendData);

      const serializedError = JSON.stringify({
        status: resendResponse.status,
        ...(typeof resendData === "object" && resendData !== null ? resendData : { message: String(resendData) }),
      });

      // Update log as failed
      if (logEntry?.id) {
        await supabase
          .from("email_logs")
          .update({
            status: "failed",
            error_message: serializedError,
          })
          .eq("id", logEntry.id);
      }

      return new Response(
        JSON.stringify({ error: "Failed to send email", details: resendData }),
        { status: resendResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
