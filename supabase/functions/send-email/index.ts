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

function baseLayout(title: string, body: string, preheader?: string): string {
  // Hidden preheader trick: shows in email client preview, invisible in body
  const preheaderHtml = preheader ? `<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : '';
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
${preheaderHtml}
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
// SUBSCRIPTION_RENEWAL is handled as async — fetches from renewal_email_templates DB table
// so the actual email matches what's configured in the admin panel.

function templateAgentHumanHandoff(payload: Record<string, unknown>): TemplateResult {
  const agentName = payload.agent_name as string || "Seu agente";
  const leadPhone = payload.lead_phone as string || "Número desconhecido";
  const leadName = payload.lead_name as string || null;
  const stageName = payload.stage_name as string || "Atendimento humano";
  const reason = payload.reason as string || "O agente não soube responder a pergunta do lead.";

  const leadLabel = leadName ? `<strong>${leadName}</strong> (${leadPhone})` : `<strong>${leadPhone}</strong>`;

  return {
    subject: `🤝 Lead transferido para atendimento humano`,
    html: baseLayout(`Transferência para Atendimento Humano`, `
      <h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">Lead transferido para você</h1>
      <p style="margin:0 0 12px;color:#3f3f46;font-size:15px;">O agente <strong>"${agentName}"</strong> transferiu um lead para atendimento humano.</p>
      
      <div style="margin:16px 0;padding:16px;background:#f0f9ff;border-radius:8px;border-left:4px solid #3b82f6;">
        <p style="margin:0 0 8px;font-size:14px;color:#1e40af;font-weight:600;">📋 Detalhes da transferência</p>
        <table role="presentation" width="100%" style="font-size:14px;color:#3f3f46;">
          <tr><td style="padding:4px 0;font-weight:600;width:100px;">Lead:</td><td style="padding:4px 0;">${leadLabel}</td></tr>
          <tr><td style="padding:4px 0;font-weight:600;">Agente:</td><td style="padding:4px 0;">${agentName}</td></tr>
          <tr><td style="padding:4px 0;font-weight:600;">Coluna:</td><td style="padding:4px 0;">${stageName}</td></tr>
        </table>
      </div>

      <div style="margin:16px 0;padding:12px 16px;background:#fffbeb;border-left:4px solid #f59e0b;border-radius:4px;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#92400e;">💡 Motivo:</p>
        <p style="margin:0;font-size:13px;color:#78350f;line-height:1.5;">${reason}</p>
      </div>

      <p style="margin:16px 0 0;font-size:14px;color:#71717a;">O agente foi silenciado para este lead. Acesse o CRM para dar continuidade ao atendimento.</p>
      <a href="${BRAND.url}/crm" style="display:inline-block;margin-top:16px;padding:12px 24px;background:${BRAND.color};color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Abrir CRM</a>
    `, `Lead transferido para atendimento humano pelo agente ${agentName}`),
  };
}

function templateAgentObjectiveCompleted(payload: Record<string, unknown>): TemplateResult {
  const agentName = payload.agent_name as string || "Seu agente";
  const leadPhone = payload.lead_phone as string || "Número desconhecido";
  const leadName = payload.lead_name as string || null;
  const stageName = payload.stage_name as string || "Objetivo atingido";
  const reason = payload.reason as string || "O agente concluiu o objetivo da conversa com sucesso.";

  const leadLabel = leadName ? `<strong>${leadName}</strong> (${leadPhone})` : `<strong>${leadPhone}</strong>`;

  return {
    subject: `✅ Objetivo atingido — Lead qualificado pelo agente`,
    html: baseLayout(`Objetivo Atingido`, `
      <h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">Objetivo concluído com sucesso! 🎉</h1>
      <p style="margin:0 0 12px;color:#3f3f46;font-size:15px;">O agente <strong>"${agentName}"</strong> atingiu o objetivo da conversa com um lead.</p>
      
      <div style="margin:16px 0;padding:16px;background:#f0fdf4;border-radius:8px;border-left:4px solid #22c55e;">
        <p style="margin:0 0 8px;font-size:14px;color:#166534;font-weight:600;">📋 Detalhes</p>
        <table role="presentation" width="100%" style="font-size:14px;color:#3f3f46;">
          <tr><td style="padding:4px 0;font-weight:600;width:100px;">Lead:</td><td style="padding:4px 0;">${leadLabel}</td></tr>
          <tr><td style="padding:4px 0;font-weight:600;">Agente:</td><td style="padding:4px 0;">${agentName}</td></tr>
          <tr><td style="padding:4px 0;font-weight:600;">Coluna:</td><td style="padding:4px 0;">${stageName}</td></tr>
        </table>
      </div>

      <div style="margin:16px 0;padding:12px 16px;background:#f0fdf4;border-left:4px solid #22c55e;border-radius:4px;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#166534;">💡 Contexto:</p>
        <p style="margin:0;font-size:13px;color:#15803d;line-height:1.5;">${reason}</p>
      </div>

      <p style="margin:16px 0 0;font-size:14px;color:#71717a;">O agente não responderá mais a este lead. Acesse o CRM para acompanhar o próximo passo.</p>
      <a href="${BRAND.url}/crm" style="display:inline-block;margin-top:16px;padding:12px 24px;background:${BRAND.color};color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Abrir CRM</a>
    `, `Objetivo atingido pelo agente ${agentName}`),
  };
}

const TEMPLATES: Record<string, (payload: Record<string, unknown>) => TemplateResult> = {
  CAMPAIGN_SCHEDULED_STARTED: templateCampaignStarted,
  WEEKLY_SUMMARY: templateWeeklySummary,
  NUMBER_DISCONNECTED: templateNumberDisconnected,
  CAMPAIGN_FAILED_TO_START: templateCampaignFailed,
  ADMIN_BROADCAST: templateAdminBroadcast,
  CAMPAIGN_COMPLETED: templateCampaignCompleted,
  AGENT_HUMAN_HANDOFF: templateAgentHumanHandoff,
  AGENT_OBJECTIVE_COMPLETED: templateAgentObjectiveCompleted,
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
    let subject: string;
    let html: string;

    if (email_type === "SUBSCRIPTION_RENEWAL") {
      // Fetch template from DB based on stage + payment method
      const stage = payload.stage as string || "D-5";
      const paymentMethod = (payload.payment_method as string) || "pix";
      const { data: dbTemplate } = await supabase
        .from("renewal_email_templates")
        .select("subject, title, content, cta_text")
        .eq("stage", stage)
        .eq("payment_method", paymentMethod)
        .maybeSingle();

      if (!dbTemplate) {
        return new Response(
          JSON.stringify({ error: `No renewal template found for stage: ${stage} (${paymentMethod})` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userName = payload.user_name as string || "Cliente";
      const planName = payload.plan_name as string || "Seu plano";
      const planPrice = payload.plan_price as string || "";
      const expiryDate = payload.expiry_date as string || "";
      const checkoutUrl = payload.checkout_url as string || "";

      // Replace variables in template content
      let compiledContent = dbTemplate.content
        .replace(/\{\{user_name\}\}/g, userName)
        .replace(/\{\{plan_name\}\}/g, planName)
        .replace(/\{\{amount\}\}/g, planPrice)
        .replace(/\{\{due_date\}\}/g, expiryDate)
        .replace(/\{\{payment_link\}\}/g, checkoutUrl)
        .replace(/\{\{pix_copy_paste\}\}/g, "");

      subject = dbTemplate.subject
        .replace(/\{\{user_name\}\}/g, userName)
        .replace(/\{\{plan_name\}\}/g, planName);

      html = baseLayout(subject, `
        <h1 style="margin:0 0 20px;font-size:22px;color:#18181b;font-weight:700;">${dbTemplate.title}</h1>
        <div style="color:#3f3f46;font-size:15px;line-height:1.7;">
          ${compiledContent}
        </div>

        <div style="text-align:center;margin:24px 0;">
          <a href="${checkoutUrl}" style="display:inline-block;padding:14px 32px;background:${BRAND.color};color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">${dbTemplate.cta_text}</a>
        </div>
      `, subject);
    } else {
      const templateFn = TEMPLATES[email_type];
      if (!templateFn) {
        return new Response(
          JSON.stringify({ error: `Unknown email_type: ${email_type}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const result = templateFn(payload);
      subject = result.subject;
      html = result.html;
    }

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
    const fromName = (payload.from_name as string) || BRAND.name;
    const fromAddress = `${fromName} <no-reply@wiize.com.br>`;
    const replyTo = payload.reply_to as string || undefined;

    const resendPayload: any = {
      from: fromAddress,
      to: [toEmail],
      subject,
      html: trackedHtml,
    };
    if (replyTo) {
      resendPayload.reply_to = replyTo;
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendPayload),
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
