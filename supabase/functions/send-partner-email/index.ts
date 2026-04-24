// Send transactional emails for the Partners Program.
// Uses Resend directly (RESEND_API_KEY) to keep parity with the existing
// `send-email` function used by the rest of the platform.
//
// Supported email types:
//   - partner_welcome                  → after admin approves a partner
//   - partner_new_lead                 → when a new lead is attributed
//   - partner_first_sale               → first paid sale of a referred customer
//   - partner_commission_ready         → commission moves from pending → available
//   - partner_withdrawal_requested     → confirmation that the request was received
//   - partner_withdrawal_approved
//   - partner_withdrawal_rejected
//   - partner_withdrawal_paid
//   - partner_goal_completed           → when a partner achieves a goal
//   - partner_goal_prize_claimed       → when partner requests prize redemption
//   - partner_application_received     → confirmation to landing page applicant
//   - admin_partner_alert              → internal alert to the partners team

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BRAND = {
  name: "Wiize",
  color: "#3daa57",
  url: "https://wiize.com.br",
  logo: "https://lqfqnqfeuneorxocybru.supabase.co/storage/v1/object/public/avatars/email/logo_wiize.png",
  from: "Wiize Parceiros <parceiros@wiize.com.br>",
};

function fmtBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100);
}

function layout(title: string, body: string, preheader?: string): string {
  const pre = preheader
    ? `<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>`
    : "";
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
${pre}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
<tr><td style="background:${BRAND.color};padding:24px 32px;text-align:center;">
  <img src="${BRAND.logo}" alt="${BRAND.name}" width="32" height="32" style="display:inline-block;vertical-align:middle;border-radius:8px;">
  <span style="color:#ffffff;font-size:20px;font-weight:700;margin-left:8px;vertical-align:middle;">${BRAND.name} Parceiros</span>
</td></tr>
<tr><td style="padding:32px;">${body}</td></tr>
<tr><td style="padding:16px 32px;background:#fafafa;text-align:center;border-top:1px solid #e4e4e7;">
  <p style="margin:0;font-size:12px;color:#a1a1aa;">Você recebeu este e-mail porque participa do Programa de Parceiros da ${BRAND.name}.</p>
  <p style="margin:4px 0 0;font-size:12px;color:#a1a1aa;"><a href="${BRAND.url}/partners" style="color:${BRAND.color};">Acessar portal do parceiro</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

const btn = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="border-radius:8px;background:${BRAND.color};"><a href="${href}" style="display:inline-block;padding:14px 28px;color:#fff;text-decoration:none;font-weight:600;font-size:14px;">${label}</a></td></tr></table>`;

const h = (t: string) => `<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#18181b;">${t}</h1>`;
const p = (t: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3f3f46;">${t}</p>`;
const small = (t: string) => `<p style="margin:0;font-size:13px;color:#71717a;">${t}</p>`;
const box = (inner: string) => `<div style="background:#f4f4f5;border-radius:8px;padding:16px 20px;margin:20px 0;">${inner}</div>`;

function buildEmail(type: string, data: any): { subject: string; html: string } | null {
  const portal = `${BRAND.url}/partners`;
  switch (type) {
    case "partner_welcome": {
      const refLink = `${BRAND.url}/?ref=${data.referral_code}`;
      const html = layout("Bem-vindo ao Programa Wiize Parceiros",
        h(`Bem-vindo ao Programa Wiize Parceiros, ${data.first_name}! 🎉`) +
        p("A sua conta foi aprovada. A partir de agora você ganha comissão recorrente sobre cada cliente que indicar para a Wiize.") +
        box(small("Seu link exclusivo de indicação:") + `<p style="margin:8px 0 0;font-family:monospace;font-size:14px;color:${BRAND.color};word-break:break-all;">${refLink}</p>`) +
        p("Compartilhe esse link em WhatsApp, redes sociais e e-mails. Toda venda gerada nos próximos <strong>2 anos</strong> é vinculada à sua conta.") +
        btn(portal, "Acessar meu portal") +
        small("Comece pelo painel — você encontra materiais prontos, métricas de conversão e seu saldo em tempo real."),
        "Sua conta de parceiro foi aprovada"
      );
      return { subject: "🎉 Bem-vindo ao Programa Wiize Parceiros", html };
    }
    case "partner_new_lead": {
      const html = layout("Você ganhou um novo lead",
        h(`Boa, ${data.first_name}! Você tem um novo lead 👀`) +
        p(`Alguém acabou de se cadastrar na Wiize usando o seu link de indicação.`) +
        box(small("Detalhes:") + `<p style="margin:8px 0 0;font-size:14px;color:#18181b;"><strong>${data.lead_email || "Cadastro recente"}</strong></p>`) +
        p("Quando esse lead converter para um plano pago, a comissão entra automaticamente na sua conta.") +
        btn(portal + "/leads", "Ver meus leads"),
        "Novo cadastro vinculado a você"
      );
      return { subject: "👀 Novo lead vinculado a você", html };
    }
    case "partner_first_sale": {
      const html = layout("Sua primeira venda foi registrada",
        h(`Parabéns, ${data.first_name}! 💰`) +
        p("Um lead que você indicou acabou de virar cliente pagante da Wiize. A comissão correspondente já entrou no seu painel.") +
        box(
          `<p style="margin:0;font-size:13px;color:#71717a;">Valor da venda</p><p style="margin:4px 0 12px;font-size:20px;font-weight:700;color:#18181b;">${fmtBRL(data.amount_cents)}</p>` +
          `<p style="margin:0;font-size:13px;color:#71717a;">Sua comissão (${data.commission_percent}%)</p><p style="margin:4px 0 0;font-size:20px;font-weight:700;color:${BRAND.color};">${fmtBRL(data.commission_cents)}</p>`
        ) +
        p(`A comissão estará <strong>disponível para saque</strong> em ${data.release_days || 30} dias (período de proteção contra estornos).`) +
        btn(portal + "/comissoes", "Ver minhas comissões"),
        "Primeira venda registrada — comissão a caminho"
      );
      return { subject: "💰 Sua primeira venda foi registrada", html };
    }
    case "partner_commission_ready": {
      const html = layout("Comissão liberada para saque",
        h(`${data.first_name}, sua comissão está disponível 🟢`) +
        p("Uma comissão acabou de sair do período de proteção e já pode ser sacada.") +
        box(
          `<p style="margin:0;font-size:13px;color:#71717a;">Valor liberado</p><p style="margin:4px 0 0;font-size:24px;font-weight:700;color:${BRAND.color};">${fmtBRL(data.commission_cents)}</p>`
        ) +
        p(`Saldo total disponível para saque: <strong>${fmtBRL(data.total_available_cents)}</strong>`) +
        btn(portal + "/saques", "Solicitar saque"),
        "Comissão liberada"
      );
      return { subject: "🟢 Comissão liberada para saque", html };
    }
    case "partner_withdrawal_approved": {
      const html = layout("Saque aprovado",
        h(`Saque aprovado, ${data.first_name}! ✅`) +
        p("O seu pedido de saque foi aprovado e entrou na fila de pagamento.") +
        box(
          `<p style="margin:0;font-size:13px;color:#71717a;">Valor aprovado</p><p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#18181b;">${fmtBRL(data.amount_cents)}</p>`
        ) +
        p("O pagamento será processado nos próximos dias úteis via Pix nos dados bancários cadastrados. Você receberá outro e-mail assim que o valor for transferido.") +
        btn(portal + "/saques", "Acompanhar saque"),
        "Seu saque foi aprovado"
      );
      return { subject: "✅ Saque aprovado", html };
    }
    case "partner_withdrawal_paid": {
      const html = layout("Saque pago",
        h(`O dinheiro está na sua conta, ${data.first_name}! 💸`) +
        p("Acabamos de transferir o valor do seu saque.") +
        box(
          `<p style="margin:0;font-size:13px;color:#71717a;">Valor pago</p><p style="margin:4px 0 0;font-size:22px;font-weight:700;color:${BRAND.color};">${fmtBRL(data.amount_cents)}</p>` +
          (data.receipt_url ? `<p style="margin:12px 0 0;font-size:13px;"><a href="${data.receipt_url}" style="color:${BRAND.color};">Ver comprovante</a></p>` : "")
        ) +
        p("Continue indicando! Cada novo cliente segue gerando comissão recorrente para você.") +
        btn(portal, "Ver meu painel"),
        "Pagamento concluído"
      );
      return { subject: "💸 Saque pago — confira sua conta", html };
    }
    case "partner_application_received": {
      const html = layout("Recebemos sua candidatura",
        h(`Obrigado, ${data.first_name}!`) +
        p("Recebemos a sua candidatura para o Programa Wiize Parceiros. Nosso time analisa novas inscrições em até 48 horas úteis.") +
        p("Se aprovado, você receberá um novo e-mail com as instruções de acesso ao portal e seu link exclusivo de indicação."),
        "Sua candidatura está em análise"
      );
      return { subject: "Recebemos sua candidatura — Programa Wiize Parceiros", html };
    }
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { type, to, data } = body;

    if (!type || !to) {
      return new Response(JSON.stringify({ error: "Missing required fields: type, to" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const built = buildEmail(type, data || {});
    if (!built) {
      return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: BRAND.from,
        to: [to],
        subject: built.subject,
        html: built.html,
      }),
    });

    const result = await resp.json();
    if (!resp.ok) {
      console.error("[send-partner-email] resend error:", result);
      return new Response(JSON.stringify({ error: result?.message || "Resend error", details: result }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Best-effort log (non-blocking)
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabase.from("email_logs").insert({
        user_id: data?.user_id || "00000000-0000-0000-0000-000000000000",
        to_email: to,
        email_type: "PARTNER_NOTIFICATION",
        subject: built.subject,
        status: "sent",
        sent_at: new Date().toISOString(),
        provider_message_id: result?.id || null,
        payload: { type, data },
      });
    } catch (_) { /* logging is best-effort */ }

    return new Response(JSON.stringify({ ok: true, id: result?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[send-partner-email] error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
