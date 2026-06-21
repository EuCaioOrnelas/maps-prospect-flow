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
import { PDFDocument, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import fontkit from "https://esm.sh/@pdf-lib/fontkit@1.1.1";

// ----------------------------------------------------------------
// Wiize Partners — inline certificate generator (PDF)
// Stamps personalized fields on top of the official template PDF.
// ----------------------------------------------------------------
interface CertificateData {
  full_name: string;
  tax_id?: string | null;
  partner_since: string;
  verification_code: string;
}

const CERT_TEMPLATE_URL =
  "https://wgokhkawjdxsmvfuhazb.supabase.co/storage/v1/object/public/partner-certificates/templates/certificate-template.pdf";
const CERT_FONT_BOLD_URL =
  "https://raw.githubusercontent.com/JulietaUla/Montserrat/master/fonts/ttf/Montserrat-Bold.ttf";
const CERT_FONT_SEMI_URL =
  "https://raw.githubusercontent.com/JulietaUla/Montserrat/master/fonts/ttf/Montserrat-SemiBold.ttf";

const CERT_TEXT_COLOR = rgb(0.08, 0.08, 0.08);
const CERT_FIELDS = {
  nome: { x: 248, y: 360 },
  cpf:  { x: 212, y: 313 },
  data: { x: 294, y: 266 },
  id:   { x: 252, y: 225 },
};
const CERT_FONT_SIZE = 14;

function maskTaxId(raw?: string | null): string {
  if (!raw) return "—";
  const d = raw.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
  if (d.length === 14) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
  return raw;
}

function fmtCertDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  } catch { return iso; }
}

async function generateCertificatePdf(data: CertificateData): Promise<Uint8Array> {
  const [tplResp, boldResp, semiResp] = await Promise.all([
    fetch(CERT_TEMPLATE_URL),
    fetch(CERT_FONT_BOLD_URL),
    fetch(CERT_FONT_SEMI_URL),
  ]);
  if (!tplResp.ok) throw new Error(`Failed to fetch certificate template: ${tplResp.status}`);
  if (!boldResp.ok || !semiResp.ok) throw new Error("Failed to fetch certificate fonts");
  const templateBytes = new Uint8Array(await tplResp.arrayBuffer());
  const boldBytes = new Uint8Array(await boldResp.arrayBuffer());
  const semiBytes = new Uint8Array(await semiResp.arrayBuffer());
  const pdf = await PDFDocument.load(templateBytes);
  pdf.registerFontkit(fontkit);
  const fontBold = await pdf.embedFont(boldBytes);
  const fontSemi = await pdf.embedFont(semiBytes);
  const page = pdf.getPages()[0];
  const draw = (t: string, x: number, y: number, font = fontSemi) =>
    page.drawText(t, { x, y, size: CERT_FONT_SIZE, font, color: CERT_TEXT_COLOR });
  draw((data.full_name || "—").toUpperCase().slice(0, 50), CERT_FIELDS.nome.x, CERT_FIELDS.nome.y, fontBold);
  draw(maskTaxId(data.tax_id), CERT_FIELDS.cpf.x, CERT_FIELDS.cpf.y);
  draw(fmtCertDate(data.partner_since), CERT_FIELDS.data.x, CERT_FIELDS.data.y);
  draw(data.verification_code || "—", CERT_FIELDS.id.x, CERT_FIELDS.id.y, fontBold);
  return await pdf.save();
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as unknown as number[]);
  }
  return btoa(binary);
}

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
      const refLink = data.referral_code ? `${BRAND.url}/?ref=${data.referral_code}` : null;
      const portalLogin = data.portal_url || `${BRAND.url}/partners/login`;
      const credentialsBlock = data.temp_password
        ? box(
            small("Suas credenciais de acesso (troque a senha após o primeiro login):") +
            `<p style="margin:8px 0 0;font-size:14px;color:#18181b;"><strong>E-mail:</strong> ${data.login_email || data.email || ""}</p>` +
            `<p style="margin:4px 0 0;font-size:14px;color:#18181b;"><strong>Senha temporária:</strong> <span style="font-family:monospace;background:#fff;padding:2px 6px;border-radius:4px;border:1px solid #e4e4e7;">${data.temp_password}</span></p>`
          )
        : box(
            small("Acesso ao portal:") +
            `<p style="margin:8px 0 0;font-size:14px;color:#18181b;"><strong>E-mail:</strong> ${data.login_email || data.email || ""}</p>` +
            `<p style="margin:4px 0 0;font-size:14px;color:#3f3f46;">Use a <strong>mesma senha</strong> que você cadastrou na candidatura. Esqueceu? Clique em <em>"Esqueci minha senha"</em> na tela de login.</p>`
          );
      const refBlock = refLink
        ? box(small("Seu link exclusivo de indicação:") + `<p style="margin:8px 0 0;font-family:monospace;font-size:14px;color:${BRAND.color};word-break:break-all;">${refLink}</p>`)
        : "";
      const html = layout("Bem-vindo ao Programa Wiize Parceiros",
        h(`Bem-vindo ao Programa Wiize Parceiros, ${data.first_name}! 🎉`) +
        p("A sua candidatura foi aprovada. A partir de agora você ganha comissão recorrente sobre cada cliente que indicar para a Wiize.") +
        credentialsBlock +
        refBlock +
        p("Compartilhe seu link em WhatsApp, redes sociais e e-mails. Toda venda gerada nos próximos <strong>2 anos</strong> é vinculada à sua conta.") +
        btn(portalLogin, "Acessar meu portal") +
        small("Comece pelo painel — você encontra materiais prontos, métricas de conversão e seu saldo em tempo real."),
        "Sua conta de parceiro foi aprovada"
      );
      return { subject: "🎉 Sua candidatura para Wiize Partners foi aprovada", html };
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
      const pixKey = data.pix_key ? `${data.pix_key}${data.pix_key_type ? ` (${data.pix_key_type})` : ""}` : null;
      const html = layout("Saque aprovado",
        h(`Saque aprovado, ${data.first_name}! ✅`) +
        p("Boas notícias: nosso time financeiro validou todas as comissões da sua solicitação e o seu saque foi <strong>aprovado</strong>. Agora ele entra na fila de pagamento via Pix.") +
        box(
          `<p style="margin:0;font-size:13px;color:#71717a;">Valor aprovado</p><p style="margin:4px 0 12px;font-size:24px;font-weight:700;color:${BRAND.color};">${fmtBRL(data.amount_cents)}</p>` +
          (pixKey ? `<p style="margin:0;font-size:13px;color:#71717a;">Pix de destino</p><p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#18181b;word-break:break-all;">${pixKey}</p>` : "")
        ) +
        `<div style="background:#ecfdf5;border-left:3px solid ${BRAND.color};border-radius:6px;padding:14px 18px;margin:20px 0;">
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#065f46;text-transform:uppercase;letter-spacing:0.4px;">Prazo de pagamento</p>
          <p style="margin:0;font-size:15px;color:#065f46;line-height:1.5;">O Pix é executado em até <strong>3 dias úteis</strong> a partir desta aprovação. Assim que a transferência for concluída, você recebe outro e-mail com o comprovante anexado.</p>
        </div>` +
        p("<strong>O que acontece agora:</strong>") +
        `<ul style="margin:0 0 16px;padding-left:20px;color:#3f3f46;font-size:14px;line-height:1.7;">
          <li>O valor já foi <strong>reservado</strong> e travado no seu saldo — não há risco de duplicidade.</li>
          <li>Nosso time aciona o pagamento na conta Pix cadastrada acima.</li>
          <li>Você recebe o comprovante por e-mail e pode baixá-lo dentro do portal.</li>
        </ul>` +
        small("Dica: confira se a chave Pix acima está correta. Se houver qualquer divergência, responda este e-mail nas próximas horas para que possamos atualizar antes do pagamento.") +
        btn(portal + "/saques", "Acompanhar saque"),
        "Seu saque foi aprovado — pagamento em até 3 dias úteis"
      );
      return { subject: "✅ Saque aprovado — pagamento em até 3 dias úteis", html };
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
    case "partner_withdrawal_requested": {
      const html = layout("Recebemos sua solicitação de saque",
        h(`Recebemos sua solicitação, ${data.first_name}! 📨`) +
        p("Sua solicitação de saque foi registrada e está aguardando aprovação do nosso time financeiro.") +
        box(
          `<p style="margin:0;font-size:13px;color:#71717a;">Valor solicitado</p><p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#18181b;">${fmtBRL(data.amount_cents)}</p>`
        ) +
        p("A análise costuma levar até <strong>2 dias úteis</strong>. Você receberá um novo e-mail assim que o status mudar.") +
        btn(portal + "/saques", "Acompanhar saque"),
        "Sua solicitação está em análise"
      );
      return { subject: "📨 Solicitação de saque recebida", html };
    }
    case "partner_withdrawal_rejected": {
      const html = layout("Saque não aprovado",
        h(`Olá, ${data.first_name}`) +
        p("Infelizmente sua última solicitação de saque não foi aprovada nesta análise.") +
        box(
          `<p style="margin:0;font-size:13px;color:#71717a;">Valor solicitado</p><p style="margin:4px 0 8px;font-size:18px;font-weight:600;color:#18181b;">${fmtBRL(data.amount_cents)}</p>` +
          (data.reason ? `<p style="margin:0;font-size:13px;color:#71717a;">Motivo</p><p style="margin:4px 0 0;font-size:14px;color:#dc2626;">${data.reason}</p>` : "")
        ) +
        p("Caso queira esclarecer, responda este e-mail ou fale com o nosso time. Você pode submeter uma nova solicitação a qualquer momento.") +
        btn(portal + "/saques", "Ver detalhes"),
        "Atualização sobre seu saque"
      );
      return { subject: "Atualização sobre seu saque", html };
    }
    case "partner_goal_completed": {
      const html = layout("Meta concluída — prêmio liberado!",
        h(`Você bateu a meta, ${data.first_name}! 🏆`) +
        p(`A meta <strong>${data.goal_title}</strong> foi concluída com sucesso. Seu prêmio já está liberado para resgate dentro do portal.`) +
        box(
          `<p style="margin:0;font-size:13px;color:#71717a;">Prêmio</p><p style="margin:4px 0 0;font-size:24px;font-weight:700;color:${BRAND.color};">${fmtBRL(data.prize_amount_cents)}</p>`
        ) +
        p("Para receber, abra a página de Metas e clique em <strong>Resgatar prêmio</strong>. O valor entra na fila de saques como qualquer comissão.") +
        btn(portal + "/metas", "Resgatar prêmio"),
        "Meta concluída"
      );
      return { subject: "🏆 Meta concluída — seu prêmio está liberado", html };
    }
    case "partner_goal_prize_claimed": {
      const html = layout("Resgate de prêmio confirmado",
        h(`Resgate registrado, ${data.first_name}! 🎁`) +
        p(`Recebemos seu pedido de resgate do prêmio da meta <strong>${data.goal_title}</strong>.`) +
        box(
          `<p style="margin:0;font-size:13px;color:#71717a;">Valor do prêmio</p><p style="margin:4px 0 0;font-size:22px;font-weight:700;color:${BRAND.color};">${fmtBRL(data.prize_amount_cents)}</p>`
        ) +
        p("O valor foi adicionado ao seu saldo disponível e segue o mesmo fluxo dos saques de comissão. Você receberá novos e-mails conforme o status mudar.") +
        btn(portal + "/saques", "Acompanhar pagamento"),
        "Prêmio em processamento"
      );
      return { subject: "🎁 Resgate de prêmio confirmado", html };
    }
    case "admin_partner_alert": {
      const html = layout(data.subject || "Notificação interna",
        h(data.title || "Atenção, time Wiize") +
        (data.lines || [])
          .map((l: string) => p(l))
          .join("") +
        (data.cta_url ? btn(data.cta_url, data.cta_label || "Abrir no admin") : ""),
        data.preheader || "Notificação interna do programa de parceiros"
      );
      return { subject: data.subject || "🔔 Notificação interna — Parceiros", html };
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

    case "partner_daily_summary": {
      const dateLabel: string = data.date_label || new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
      const leadsCount: number = data.leads_count || 0;
      const newClientsCount: number = data.new_clients_count || 0;
      const newClientsCents: number = data.new_clients_cents || 0;
      const renewalsCount: number = data.renewals_count || 0;
      const renewalsCents: number = data.renewals_cents || 0;
      const releasedCount: number = data.released_count || 0;
      const releasedCents: number = data.released_cents || 0;
      const availableCents: number = data.available_balance_cents || 0;
      const leadsList: Array<{ email?: string; name?: string }> = data.leads_list || [];

      const metric = (label: string, value: string, accent = false) =>
        `<td align="center" valign="top" style="padding:14px 8px;border:1px solid #e4e4e7;border-radius:8px;width:33%;">
          <p style="margin:0;font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.4px;">${label}</p>
          <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:${accent ? BRAND.color : "#18181b"};">${value}</p>
         </td>`;

      const grid = `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="6" style="margin:18px 0 8px;">
          <tr>
            ${metric("Novos leads", String(leadsCount), leadsCount > 0)}
            ${metric("Novos clientes", String(newClientsCount), newClientsCount > 0)}
            ${metric("Renovações", String(renewalsCount))}
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="6" style="margin:0 0 8px;">
          <tr>
            ${metric("Vendas novas", fmtBRL(newClientsCents))}
            ${metric("Renovações (R$)", fmtBRL(renewalsCents))}
            ${metric("Liberado hoje", fmtBRL(releasedCents), releasedCount > 0)}
          </tr>
        </table>`;

      const balanceBox = box(
        `<p style="margin:0;font-size:13px;color:#71717a;">Saldo disponível para saque</p>
         <p style="margin:6px 0 0;font-size:24px;font-weight:700;color:${BRAND.color};">${fmtBRL(availableCents)}</p>`
      );

      const leadsBlock = leadsList.length
        ? box(
            small(`Leads do dia (${leadsList.length})`) +
            `<ul style="margin:10px 0 0;padding:0 0 0 18px;color:#3f3f46;font-size:13px;line-height:1.7;">` +
            leadsList.slice(0, 15).map((l) => `<li>${l.email || l.name || "—"}</li>`).join("") +
            (leadsList.length > 15 ? `<li style="color:#71717a;">+ ${leadsList.length - 15} outros…</li>` : "") +
            `</ul>`
          )
        : "";

      const html = layout(`Resumo diário Wiize Parceiros — ${dateLabel}`,
        h(`Seu resumo de hoje, ${data.first_name} 📊`) +
        p(`Veja tudo que aconteceu na sua operação de parceiro em <strong>${dateLabel}</strong>.`) +
        grid +
        balanceBox +
        leadsBlock +
        btn(portal, "Abrir meu painel") +
        small("Você recebe este resumo todos os dias às 21h. Para desativar, fale com o suporte."),
        `Resumo do dia — ${leadsCount} leads · ${newClientsCount + renewalsCount} vendas`
      );
      return { subject: `📊 Wiize Parceiros — resumo de ${dateLabel}`, html };
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

    // Auto-generate Wiize Partners certificate for the welcome email.
    // Caller can disable with data.attach_certificate === false.
    const attachments: Array<{ filename: string; content: string }> = [];
    if (type === "partner_welcome" && data?.attach_certificate !== false) {
      const cert = data?.certificate;
      console.log("[send-partner-email] cert payload:", JSON.stringify({
        has_cert: !!cert,
        full_name: cert?.full_name,
        verification_code: cert?.verification_code,
      }));
      if (!cert?.full_name) {
        console.error("[send-partner-email] missing certificate.full_name — cannot attach");
      } else {
        try {
          const pdfBytes = await generateCertificatePdf({
            full_name: cert.full_name,
            tax_id: cert.tax_id ?? null,
            partner_since: cert.partner_since || new Date().toISOString(),
            verification_code: cert.verification_code || `WZ-${Date.now().toString(36).toUpperCase()}`,
          });
          const b64 = bytesToBase64(pdfBytes);
          console.log(`[send-partner-email] certificate generated: ${pdfBytes.length} bytes`);
          attachments.push({
            filename: `Certificado-Wiize-Partners.pdf`,
            content: b64,
          });
        } catch (err) {
          console.error("[send-partner-email] certificate generation FAILED:", err);
        }
      }
    }

    const payload: Record<string, unknown> = {
      from: BRAND.from,
      to: [to],
      subject: built.subject,
      html: built.html,
    };
    if (attachments.length) {
      payload.attachments = attachments;
      console.log(`[send-partner-email] sending with ${attachments.length} attachment(s) to ${to}`);
    } else if (type === "partner_welcome") {
      console.warn(`[send-partner-email] partner_welcome WITHOUT attachment to ${to}`);
    }

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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
