import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Get client IP for rate limiting
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // Rate limit: 3 submissions per IP per day (86400 seconds)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: rateLimitResult } = await supabase.rpc("check_rate_limit", {
      p_identifier: clientIP,
      p_endpoint: "enterprise-contact",
      p_max_requests: 3,
      p_window_seconds: 86400,
    });

    if (rateLimitResult && !rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: "Limite de envios atingido. Tente novamente em 24 horas.",
          retry_after: rateLimitResult.retry_after,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const {
      partnerName,
      companyName,
      cnpj,
      niche,
      email,
      phone,
      teamSize,
      objective,
      currentTools,
      monthlyRevenue,
    } = body;

    if (!partnerName || !companyName || !cnpj || !niche || !email || !phone || !teamSize || !objective) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios não preenchidos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0d9668,#0a7a54);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">🏢 Nova Solicitação Enterprise</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Recebida em ${now}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <!-- Dados do responsável -->
              <h2 style="margin:0 0 16px;font-size:16px;color:#0d9668;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #e5e7eb;padding-bottom:8px;">
                👤 Dados do Responsável
              </h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:13px;width:180px;vertical-align:top;">Nome do Sócio</td>
                  <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${partnerName}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:13px;vertical-align:top;">Email</td>
                  <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">
                    <a href="mailto:${email}" style="color:#0d9668;text-decoration:none;">${email}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:13px;vertical-align:top;">Telefone / WhatsApp</td>
                  <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">
                    <a href="https://wa.me/55${phone.replace(/\D/g, "")}" style="color:#0d9668;text-decoration:none;">${phone}</a>
                  </td>
                </tr>
              </table>

              <!-- Dados da empresa -->
              <h2 style="margin:0 0 16px;font-size:16px;color:#0d9668;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #e5e7eb;padding-bottom:8px;">
                🏛️ Dados da Empresa
              </h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:13px;width:180px;vertical-align:top;">Empresa</td>
                  <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${companyName}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:13px;vertical-align:top;">CNPJ</td>
                  <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${cnpj}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:13px;vertical-align:top;">Nicho de Atuação</td>
                  <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${niche}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:13px;vertical-align:top;">Equipe Comercial</td>
                  <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${teamSize} pessoas</td>
                </tr>
                ${monthlyRevenue ? `<tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:13px;vertical-align:top;">Faturamento Mensal Médio</td>
                  <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${monthlyRevenue}</td>
                </tr>` : ""}
                ${currentTools ? `<tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:13px;vertical-align:top;">Ferramentas Utilizadas</td>
                  <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${currentTools}</td>
                </tr>` : ""}
              </table>

              <!-- Objetivo -->
              <h2 style="margin:0 0 16px;font-size:16px;color:#0d9668;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #e5e7eb;padding-bottom:8px;">
                🎯 Objetivo com a Wiize
              </h2>
              <div style="background-color:#f9fafb;border-radius:8px;padding:16px 20px;margin-bottom:24px;border-left:4px solid #0d9668;">
                <p style="margin:0;color:#374151;font-size:14px;line-height:1.7;">${objective}</p>
              </div>

              <!-- CTA -->
              <div style="text-align:center;margin-top:32px;">
                <a href="mailto:${email}" style="display:inline-block;background-color:#0d9668;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">
                  Responder ao Lead
                </a>
                <a href="https://wa.me/55${phone.replace(/\D/g, "")}" style="display:inline-block;background-color:#25D366;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;margin-left:12px;">
                  WhatsApp
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                Wiize Enterprise — Notificação automática do formulário de contato
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Wiize Enterprise <onboarding@resend.dev>",
        to: ["wiize.app@gmail.com"],
        subject: `🏢 Nova Solicitação Enterprise — ${companyName} (${niche})`,
        html: htmlContent,
        reply_to: email,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend error:", resendData);
      throw new Error(resendData?.message || "Failed to send email");
    }

    return new Response(
      JSON.stringify({ success: true, id: resendData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error in send-enterprise-contact:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
