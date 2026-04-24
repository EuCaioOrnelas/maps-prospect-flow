import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { templateId, recipientEmail } = await req.json();

    if (!templateId || !recipientEmail) {
      return new Response(
        JSON.stringify({ error: "templateId and recipientEmail are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get template
    const { data: template, error: tErr } = await supabase
      .from("trial_message_templates")
      .select("*")
      .eq("id", templateId)
      .maybeSingle();

    if (tErr || !template) {
      return new Response(
        JSON.stringify({ error: "Template not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Compile template with sample data
    const trackerBase = `${supabaseUrl}/functions/v1/trial-email-tracker`;
    const sampleVars: Record<string, string> = {
      user_name: "Usuário Teste",
      product_name: "Wiize",
      cta_link: "https://wiize.com.br/dashboard",
      trial_days_left: "7",
      projects_created: "12",
      feature_usage: "5",
    };

    let compiledBody = template.body;
    for (const [key, value] of Object.entries(sampleVars)) {
      compiledBody = compiledBody.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    }

    // Rewrite CTA links with tracking (using test user id)
    const testUserId = "00000000-0000-0000-0000-000000000000";
    compiledBody = compiledBody.replace(
      /href="(https?:\/\/[^"]+)"/g,
      (match: string, url: string) => {
        if (url.includes("trial-email-tracker")) return match;
        const trackUrl = `${trackerBase}?action=click&uid=${testUserId}&tid=${template.id}&aid=test&url=${encodeURIComponent(url)}`;
        return `href="${trackUrl}"`;
      }
    );

    const trackPixel = `<img src="${trackerBase}?action=open&uid=${testUserId}&tid=${template.id}&aid=test" width="1" height="1" alt="" style="display:none;" />`;

    const compiledSubject = template.subject.replace(
      /\{\{user_name\}\}/g, "Usuário Teste"
    ).replace(/\{\{product_name\}\}/g, "Wiize");

    const html = wrapInEmailLayout(`[TESTE] ${compiledSubject}`, compiledBody, trackPixel);

    // Send via Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Wiize <no-reply@wiize.com.br>",
        to: [recipientEmail],
        subject: `[TESTE] ${compiledSubject}`,
        html,
      }),
    });

    const text = await response.text();
    if (!response.ok) {
      console.error("Resend error:", text);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: text }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: `Email de teste enviado para ${recipientEmail}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send test email error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function wrapInEmailLayout(title: string, body: string, trackPixel: string = ""): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
<tr><td style="background:#3daa57;padding:24px 32px;text-align:center;">
  <span style="color:#ffffff;font-size:20px;font-weight:700;">Wiize</span>
</td></tr>
<tr><td style="padding:32px;">
${body}
</td></tr>
<tr><td style="padding:16px 32px;background:#fafafa;text-align:center;border-top:1px solid #e4e4e7;">
  <p style="margin:0;font-size:12px;color:#a1a1aa;">Você recebeu este e-mail porque tem uma conta na Wiize.</p>
</td></tr>
</table>
</td></tr>
</table>
${trackPixel}
</body>
</html>`;
}
