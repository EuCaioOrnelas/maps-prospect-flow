// Envio de avisos por e-mail do Wiize API (saldo baixo, erros de requisição e
// relatório mensal). Respeita as preferências salvas pelo usuário.
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BRAND = {
  name: "Wiize API",
  color: "#3daa57",
  url: "https://wiize.com.br/api",
  from: "Wiize API <no-reply@wiize.com.br>",
};

type NotificationType = "low_balance" | "request_errors" | "monthly_report";

const PREF_COLUMN: Record<NotificationType, string> = {
  low_balance: "low_balance",
  request_errors: "request_errors",
  monthly_report: "monthly_report",
};

function layout(title: string, body: string) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:${BRAND.color};padding:20px 32px;color:#fff;font-size:18px;font-weight:700;">${BRAND.name}</td></tr>
<tr><td style="padding:32px;">${body}</td></tr>
<tr><td style="padding:16px 32px;background:#fafafa;border-top:1px solid #e4e4e7;text-align:center;">
<p style="margin:0;font-size:12px;color:#a1a1aa;">Você recebe este aviso porque ativou as notificações no painel Wiize API.</p>
<p style="margin:4px 0 0;font-size:12px;color:#a1a1aa;"><a href="${BRAND.url}/settings" style="color:${BRAND.color};">Gerenciar notificações</a></p>
</td></tr></table></td></tr></table></body></html>`;
}

function template(type: NotificationType, payload: Record<string, unknown>) {
  const money = (v: unknown) =>
    typeof v === "number" ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : String(v ?? "-");

  switch (type) {
    case "low_balance":
      return {
        subject: "Saldo baixo na sua conta Wiize API",
        html: layout(
          "Saldo baixo",
          `<h1 style="margin:0 0 12px;font-size:20px;color:#18181b;">Seu saldo está acabando</h1>
           <p style="margin:0 0 16px;color:#3f3f46;font-size:15px;">O saldo atual é de <strong>${money(payload.balance)}</strong>, abaixo do limite configurado de <strong>${money(payload.threshold)}</strong>.</p>
           <a href="${BRAND.url}/credits" style="display:inline-block;padding:12px 24px;background:${BRAND.color};color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Adicionar saldo</a>`,
        ),
      };
    case "request_errors":
      return {
        subject: "Falhas recorrentes nas suas chamadas Wiize API",
        html: layout(
          "Erros de requisição",
          `<h1 style="margin:0 0 12px;font-size:20px;color:#18181b;">Detectamos falhas nas suas chamadas</h1>
           <p style="margin:0 0 16px;color:#3f3f46;font-size:15px;">Registramos <strong>${payload.errors ?? 0}</strong> requisições com erro nas últimas 24 horas.</p>
           <a href="${BRAND.url}/usage" style="display:inline-block;padding:12px 24px;background:${BRAND.color};color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Ver detalhes de uso</a>`,
        ),
      };
    case "monthly_report":
      return {
        subject: "Seu relatório mensal Wiize API",
        html: layout(
          "Relatório mensal",
          `<h1 style="margin:0 0 12px;font-size:20px;color:#18181b;">Resumo do mês</h1>
           <p style="margin:0 0 8px;color:#3f3f46;font-size:15px;">Requisições: <strong>${payload.requests ?? 0}</strong></p>
           <p style="margin:0 0 16px;color:#3f3f46;font-size:15px;">Custo total: <strong>${money(payload.cost)}</strong></p>
           <a href="${BRAND.url}/billing" style="display:inline-block;padding:12px 24px;background:${BRAND.color};color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Ver faturamento</a>`,
        ),
      };
  }
  throw new Error("Tipo de notificação inválido");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY não configurada" }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json({ error: "Sessão inválida" }, 401);

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (userError || !user?.email) return json({ error: "Sessão inválida ou expirada" }, 401);

    const body = await req.json().catch(() => ({}));
    const type = body.type as NotificationType;
    if (!type || !(type in PREF_COLUMN)) return json({ error: "Tipo de notificação inválido" }, 400);
    const payload = (body.payload ?? {}) as Record<string, unknown>;

    // Acesso restrito a contas Wiize API.
    const { data: apiProfile } = await supabase
      .from("wiize_api_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!apiProfile) return json({ error: "Conta sem acesso ao Wiize API" }, 403);

    {
      const column = PREF_COLUMN[type];
      const { data: prefs } = await supabase
        .from("wiize_api_notification_prefs")
        .select(column)
        .eq("user_id", user.id)
        .maybeSingle();
      const enabled = (prefs as Record<string, boolean> | null)?.[column];
      if (enabled === false) return json({ success: true, skipped: true, reason: "pref_off" });
    }

    const { subject, html } = template(type, payload);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: BRAND.from, to: [user.email], subject, html }),
    });

    const result = await res.json();
    if (!res.ok) return json({ error: result?.message || "Falha ao enviar e-mail" }, 502);

    return json({ success: true, id: result?.id ?? null });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Erro inesperado" }, 500);
  }
});
