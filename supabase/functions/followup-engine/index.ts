// Wiize · Follow-up Intelligence Engine
//
// Motor de follow-up comercial por e-mail, invisível para o operador: cada
// abordagem enviada cria uma "matrícula" (enrollment) e o cron avalia, a cada
// execução, se o próximo passo deve mesmo ser enviado.
//
// Ações:
//   process        (cron/service) → processa o lote de follow-ups vencidos
//   enroll         (interno/admin) → matricula um contato após o 1º e-mail
//   status         (admin)        → estado da sequência de um prospect
//   start          (admin)        → inicia/retoma manualmente
//   stop           (admin)        → interrompe manualmente
//   cancel_by_email(interno)      → mata a sequência (resposta, opt-out, conversão)
//
// Toda decisão fica registrada em followup_events (observabilidade).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const REPLY_LOCAL = "parcerias";
const REPLY_DOMAIN = "wiize.com.br";
const FROM = `Parcerias Wiize <${REPLY_LOCAL}@${REPLY_DOMAIN}>`;
const APP_URL = "https://wiize.com.br";
const BRAND = "#0E7C3A";
const LOGO_URL =
  "https://wgokhkawjdxsmvfuhazb.supabase.co/storage/v1/object/public/agent-media/email%2Fwiize-logo-v2.png";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BATCH = 8;
const SEND_INTERVAL_MS = 3000;
const STEP_INTERVAL_DAYS = 5;
const TZ_OFFSET_HOURS = -3; // America/Sao_Paulo (padrão da conta)
const WINDOW_START = 8;
const WINDOW_END = 18;

const esc = (s: string) =>
  (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

type Strategy = { key: string; goal: string; guide: string };

/** Cada etapa tem uma função comercial distinta — nunca é "só lembrando". */
const STRATEGIES: Strategy[] = [
  {
    key: "relembrete",
    goal: "Reabrir a conversa sem parecer insistente",
    guide:
      "Retome o contexto exato da primeira abordagem em uma frase, traga o benefício principal e feche com UMA pergunta simples de baixíssimo atrito. Nunca repita o primeiro e-mail.",
  },
  {
    key: "dor",
    goal: "Falar da dor real de quem vive de conteúdo: muito trabalho, retorno financeiro pequeno",
    guide:
      "Fale da rotina do criador: horas roteirizando, gravando, editando, postando e respondendo comentários — e um retorno financeiro que raramente acompanha esse esforço (AdSense baixo, publi pontual, receita instável que zera todo mês). Trate como hipótese, nunca como fato sobre o canal dele. Feche mostrando que a parceria com a Wiize cresce junto com o canal: novos temas de conteúdo para a audiência e uma nova renda recorrente pelo Wiize Partners, sem precisar produzir mais vídeos por mês. NUNCA fale em prospecção manual, dependência de indicação ou time comercial — ele é criador de conteúdo, não vendedor.",
  },

  {
    key: "oportunidade_financeira",
    goal: "Mostrar o potencial econômico da parceria",
    guide:
      "Apresente o programa de parceiros: 50% de comissão na primeira mensalidade, 10% recorrente nas seguintes e evolução da comissão conforme desempenho. Pode citar que existem contratos que chegam a cerca de R$ 5.000/mês, sempre como POTENCIAL comercial dependente de cliente, plano e negociação — nunca como garantia. Só faça contas se os valores estiverem no contexto.",
  },
  {
    key: "prova",
    goal: "Reduzir o risco percebido com credibilidade real",
    guide:
      "Use apenas fatos verificáveis do contexto e o posicionamento da Wiize (plataforma de crescimento comercial: prospecção com IA, CRM, WhatsApp, SDR inteligente). É PROIBIDO inventar clientes, números, cases, faturamento ou depoimentos. Sem prova disponível, fale de funcionalidades e diferenciais.",
  },
  {
    key: "custo_inacao",
    goal: "Mostrar o custo de não decidir",
    guide:
      "Mostre que cada mês sem a parceria é mais um mês de conteúdo produzido sem construir renda recorrente — a audiência já existe, só não está sendo monetizada por esse caminho. Profissional e respeitoso; proibido medo artificial, ameaça ou falsa urgência.",
  },

  {
    key: "ultima_tentativa",
    goal: "Encerrar preservando a relação",
    guide:
      "Mensagem curta (máx. 5 linhas), elegante, com pergunta binária do tipo 'faz sentido conversarmos ou não é prioridade agora?'. Proibido dizer 'último follow-up', 'estou encerrando o contato' ou 'você viu minha mensagem?'.",
  },
];

const FORBIDDEN = /(garantimos|resultado garantido|100% de retorno|lucro garantido|ganho garantido)/i;

function htmlToText(html: string) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function layout(bodyHtml: string, unsubscribeUrl: string) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#eef1ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2328;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#eef1ef;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e3e7e4;border-radius:18px;overflow:hidden;">
<tr><td style="height:5px;background:${BRAND};font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:26px 32px 18px;border-bottom:1px solid #f0f2f1;">
<img src="${LOGO_URL}" width="131" height="40" alt="Wiize" style="display:block;width:131px;max-width:131px;height:40px;border:0;outline:none;text-decoration:none;">
<div style="margin-top:8px;font-size:11px;color:#7a8580;letter-spacing:1.2px;text-transform:uppercase;font-weight:600;">Parcerias &amp; Criadores</div>
</td></tr>
<tr><td style="padding:26px 32px 8px;font-size:15.5px;line-height:1.7;color:#1f2328;">${bodyHtml}</td></tr>
<tr><td style="padding:18px 32px 8px;font-size:14px;line-height:1.6;color:#4b5563;border-top:1px solid #eceeed;">
Atenciosamente,<br><strong style="color:#0f172a;">Equipe de Parcerias Wiize</strong><br>
<a href="${APP_URL}" style="color:${BRAND};text-decoration:none;font-weight:600;">wiize.com.br</a>
</td></tr>
<tr><td style="padding:12px 32px 26px;">
<div style="background:#f7f9f8;border-radius:12px;padding:14px 16px;font-size:12px;line-height:1.6;color:#8b9490;">
Você recebeu este e-mail porque identificamos seu canal como potencial parceiro da Wiize.
Se preferir não receber novos contatos, <a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">clique aqui para se descadastrar</a>.
</div></td></tr>
</table>
<div style="max-width:600px;margin:14px auto 0;font-size:11px;color:#9aa2a8;text-align:center;">Wiize · Plataforma de crescimento comercial · Brasil</div>
</td></tr></table></body></html>`;
}

/** Token de descadastro permanente por e-mail (não morre com a campanha). */
async function optoutToken(admin: any, email: string, prospectId: string | null) {
  const lower = email.toLowerCase().trim();
  const { data: existing } = await admin
    .from("email_optout_tokens").select("token").eq("email", lower).maybeSingle();
  if (existing?.token) return existing.token as string;
  const token = crypto.randomUUID().replace(/-/g, "");
  const { data } = await admin
    .from("email_optout_tokens")
    .upsert({ token, email: lower, prospect_id: prospectId }, { onConflict: "email" })
    .select("token").maybeSingle();
  return (data?.token as string) || token;
}

async function logEvent(admin: any, row: Record<string, unknown>) {
  try { await admin.from("followup_events").insert(row); } catch (_) { /* best-effort */ }
}

/** Próximo horário comercial (seg–sex, 08h–18h, timezone da conta). */
function nextBusinessSlot(from: Date): Date {
  const d = new Date(from.getTime());
  for (let i = 0; i < 24 * 14; i += 1) {
    const local = new Date(d.getTime() + TZ_OFFSET_HOURS * 3600_000);
    const day = local.getUTCDay();
    const hour = local.getUTCHours();
    if (day >= 1 && day <= 5 && hour >= WINDOW_START && hour < WINDOW_END) return d;
    d.setTime(d.getTime() + 3600_000);
  }
  return d;
}

const isBusinessTime = (date: Date) => nextBusinessSlot(date).getTime() === date.getTime();

function scheduleStep(startedAt: string, step: number) {
  const base = new Date(new Date(startedAt).getTime() + step * STEP_INTERVAL_DAYS * 86_400_000);
  // 09:00 local como âncora do dia
  const local = new Date(base.getTime() + TZ_OFFSET_HOURS * 3600_000);
  local.setUTCHours(9, 0, 0, 0);
  return nextBusinessSlot(new Date(local.getTime() - TZ_OFFSET_HOURS * 3600_000));
}

/** Aderência: define agressividade e tamanho da sequência. */
function computeFit(prospect: any): { level: string; maxSteps: number } {
  const score = Number(prospect?.fit_score ?? prospect?.commercial_score ?? 0);
  if (score >= 75) return { level: "alto", maxSteps: 6 };
  if (score >= 45) return { level: "medio", maxSteps: 6 };
  if (score > 0) return { level: "baixo", maxSteps: 3 };
  return { level: "medio", maxSteps: 6 };
}

async function sendResend(payload: Record<string, unknown>, idempotencyKey: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey.slice(0, 256),
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

/** Gera o follow-up com IA, usando o contexto e a memória da sequência. */
async function generateMessage(enrollment: any, prospect: any, strategy: Strategy, history: any[]) {
  const usedArguments = Array.isArray(enrollment.memory) ? enrollment.memory : [];
  const ctx = enrollment.context ?? {};
  const conversation = history.slice(-6).map((m: any) =>
    `${m.direction === "recebida" ? "CONTATO" : "WIIZE"} (${String(m.created_at).slice(0, 10)}): ${String(m.body_text || "").slice(0, 700)}`,
  ).join("\n---\n");

  const system = `Você é um SDR sênior da Wiize (plataforma brasileira de crescimento comercial: prospecção com IA, CRM, WhatsApp e SDR inteligente).
Escreve follow-ups em português do Brasil, tom consultivo, direto e humano.
REGRAS DURAS:
- Nunca invente clientes, números, cases, faturamento ou depoimentos.
- Nunca prometa resultado garantido, escassez falsa ou urgência inventada.
- Nunca repita argumentos já usados nesta sequência.
- Máximo 140 palavras. Sem emojis. Sem assinatura (o sistema adiciona).
- Um único CTA, de baixo atrito.
Responda SOMENTE JSON: {"subject":"...","body":"...","cta":"...","arguments":["..."]}`;

  const user = `ETAPA ${enrollment.current_step + 1} de ${enrollment.max_steps} — estratégia "${strategy.key}".
OBJETIVO: ${strategy.goal}
COMO ESCREVER: ${strategy.guide}
ADERÊNCIA DO LEAD: ${enrollment.fit_level}

CONTATO / EMPRESA:
${JSON.stringify({
    canal: prospect?.channel_name ?? null,
    site: prospect?.website_url ?? null,
    instagram: prospect?.instagram_url ?? null,
    pais: prospect?.country ?? null,
    inscritos: prospect?.subscriber_count ?? null,
    resumo_ia: prospect?.ai_summary ?? null,
    recomendacao_ia: prospect?.ai_recommendation ?? null,
    motivo_relevancia: prospect?.relevance_reason ?? null,
    email: enrollment.email,
    contexto_extra: ctx,
  })}

PRIMEIRA ABORDAGEM ENVIADA (assunto: ${enrollment.first_subject ?? "-"}):
${String(enrollment.first_body || "").slice(0, 1500)}

ARGUMENTOS JÁ UTILIZADOS: ${usedArguments.length ? JSON.stringify(usedArguments) : "nenhum"}

HISTÓRICO RECENTE:
${conversation || "(sem respostas)"}

Escreva o próximo e-mail avançando a conversa.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
  const subject = String(parsed.subject || "").trim();
  const bodyText = String(parsed.body || "").trim();

  // Validação automática antes do envio.
  if (subject.length < 4 || bodyText.length < 40) throw new Error("Mensagem gerada inválida (curta demais).");
  if (bodyText.length > 2200) throw new Error("Mensagem gerada longa demais.");
  if (FORBIDDEN.test(bodyText)) throw new Error("Mensagem gerada com promessa proibida.");
  if (enrollment.first_subject && subject.toLowerCase() === String(enrollment.first_subject).toLowerCase()) {
    throw new Error("Assunto idêntico ao da primeira abordagem.");
  }
  return {
    subject: subject.slice(0, 180),
    bodyText,
    cta: String(parsed.cta || "").slice(0, 240),
    args: Array.isArray(parsed.arguments) ? parsed.arguments.slice(0, 6).map((a: any) => String(a).slice(0, 160)) : [],
  };
}

async function finish(admin: any, enrollment: any, status: string, reason: string, step?: number) {
  await admin.from("followup_enrollments").update({
    status, end_reason: reason, ended_at: new Date().toISOString(), next_run_at: null,
  }).eq("id", enrollment.id);
  await logEvent(admin, {
    enrollment_id: enrollment.id, prospect_id: enrollment.prospect_id,
    step: step ?? enrollment.current_step, action: status === "completed" ? "completed" : "cancelled", reason,
  });
}

/** Guard-rails: retorna motivo de bloqueio ou null quando o envio é permitido. */
async function evaluateGuards(admin: any, e: any) {
  const email = String(e.email).toLowerCase();

  const [{ data: sup }, { data: legacySup }] = await Promise.all([
    admin.from("email_suppressions").select("email").eq("email", email).maybeSingle(),
    admin.from("influencer_email_suppressions").select("email").eq("email", email).maybeSingle(),
  ]);
  if (sup || legacySup) return { kill: "unsubscribed" };

  if (e.prospect_id) {
    const { data: replies } = await admin.from("influencer_messages")
      .select("id").eq("prospect_id", e.prospect_id).eq("direction", "recebida")
      .gte("created_at", e.started_at).limit(1);
    if (replies?.length) return { kill: "replied" };

    const { data: prospect } = await admin.from("influencer_prospects")
      .select("status").eq("id", e.prospect_id).maybeSingle();
    if (["respondeu", "convertido", "parceiro", "descartado", "nao_contatar"].includes(String(prospect?.status))) {
      return { kill: prospect?.status === "respondeu" ? "replied" : "converted_or_dropped" };
    }

    const { data: contact } = await admin.from("influencer_contacts")
      .select("status").eq("prospect_id", e.prospect_id).eq("normalized_value", email).maybeSingle();
    if (contact?.status === "nao_contatar") return { kill: "do_not_contact" };
  }

  const { data: rec } = await admin.from("influencer_campaign_recipients")
    .select("status").ilike("email", email).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (rec && ["respondido", "denunciado"].includes(String(rec.status))) return { kill: "replied" };

  // Campanha concorrente ativa para o mesmo contato → adia 1 dia.
  const { data: competing } = await admin.from("influencer_campaign_recipients")
    .select("id").ilike("email", email).in("status", ["pendente", "enviando"]).limit(1);
  if (competing?.length) return { defer: "campanha_concorrente_ativa" };

  // Nunca dois envios no mesmo dia.
  if (e.last_sent_at && Date.now() - new Date(e.last_sent_at).getTime() < 20 * 3600_000) {
    return { defer: "envio_recente" };
  }
  return {};
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const url = new URL(req.url);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = String(body.action || url.searchParams.get("action") || "process");

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const cronHeader = req.headers.get("x-cron-secret") || "";
    const cronSecrets = [Deno.env.get("FOLLOWUP_CRON_SECRET"), Deno.env.get("SDR_CRON_SECRET")].filter(Boolean) as string[];
    const isService = token === serviceKey || (!!cronHeader && cronSecrets.includes(cronHeader));

    let adminUserId: string | null = null;
    if (!isService) {
      if (!token) return json({ error: "Não autenticado." }, 401);
      const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
      const { data: u } = await caller.auth.getUser(token);
      if (!u?.user) return json({ error: "Não autenticado." }, 401);
      const { data: role } = await admin.from("user_roles")
        .select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
      if (!role) return json({ error: "Acesso restrito a administradores." }, 403);
      adminUserId = u.user.id;
    }

    // ---------- CANCELAR POR E-MAIL (respostas, opt-out, conversão) ----------
    if (action === "cancel_by_email") {
      const email = String(body.email || "").toLowerCase().trim();
      const reason = String(body.reason || "manual_stop");
      if (!email) return json({ error: "email obrigatório." }, 400);
      const { data: rows } = await admin.from("followup_enrollments")
        .select("id, prospect_id, current_step").eq("status", "active").ilike("email", email);
      for (const e of rows ?? []) await finish(admin, e, "cancelled", reason);
      return json({ ok: true, cancelled: rows?.length ?? 0 });
    }

    // ---------- MATRICULAR ----------
    if (action === "enroll") {
      const email = String(body.email || "").toLowerCase().trim();
      const prospectId = UUID_RE.test(String(body.prospect_id)) ? String(body.prospect_id) : null;
      if (!email) return json({ error: "email obrigatório." }, 400);

      const { data: sup } = await admin.from("email_suppressions").select("email").eq("email", email).maybeSingle();
      if (sup) return json({ ok: true, skipped: "unsubscribed" });

      const { data: active } = await admin.from("followup_enrollments")
        .select("id").eq("status", "active").ilike("email", email).maybeSingle();
      if (active) return json({ ok: true, enrollment_id: active.id, existing: true });

      const { data: prospect } = prospectId
        ? await admin.from("influencer_prospects").select("*").eq("id", prospectId).maybeSingle()
        : { data: null };
      const fit = computeFit(prospect);
      const startedAt = body.started_at ? new Date(body.started_at).toISOString() : new Date().toISOString();

      const { data: created, error } = await admin.from("followup_enrollments").insert({
        email,
        prospect_id: prospectId,
        campaign_id: UUID_RE.test(String(body.campaign_id)) ? body.campaign_id : null,
        recipient_id: UUID_RE.test(String(body.recipient_id)) ? body.recipient_id : null,
        status: "active",
        current_step: 0,
        max_steps: fit.maxSteps,
        fit_level: fit.level,
        started_at: startedAt,
        next_run_at: scheduleStep(startedAt, 1).toISOString(),
        first_subject: String(body.subject || "").slice(0, 300),
        first_body: String(body.body_text || "").slice(0, 8000),
        context: body.context ?? {},
        created_by: adminUserId,
      }).select("id, next_run_at").single();
      if (error) return json({ error: error.message }, 400);

      await logEvent(admin, {
        enrollment_id: created.id, prospect_id: prospectId, step: 0, action: "enrolled",
        reason: "primeira abordagem enviada", payload: { fit: fit.level, next_run_at: created.next_run_at },
      });
      return json({ ok: true, enrollment_id: created.id, next_run_at: created.next_run_at });
    }

    // ---------- STATUS / START / STOP (admin) ----------
    if (action === "status") {
      const prospectId = String(body.prospect_id || "");
      if (!UUID_RE.test(prospectId)) return json({ error: "prospect_id inválido." }, 400);
      const { data: enrollment } = await admin.from("followup_enrollments")
        .select("*").eq("prospect_id", prospectId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      const { data: events } = enrollment
        ? await admin.from("followup_events").select("*").eq("enrollment_id", enrollment.id)
            .order("created_at", { ascending: false }).limit(20)
        : { data: [] };
      return json({ ok: true, enrollment, events: events ?? [] });
    }

    if (action === "stop") {
      const id = String(body.enrollment_id || "");
      if (!UUID_RE.test(id)) return json({ error: "enrollment_id inválido." }, 400);
      const { data: e } = await admin.from("followup_enrollments").select("*").eq("id", id).maybeSingle();
      if (!e) return json({ error: "Sequência não encontrada." }, 404);
      await finish(admin, e, "stopped", "manual_stop");
      return json({ ok: true });
    }

    if (action === "start") {
      const id = String(body.enrollment_id || "");
      if (!UUID_RE.test(id)) return json({ error: "enrollment_id inválido." }, 400);
      const { data: e } = await admin.from("followup_enrollments").select("*").eq("id", id).maybeSingle();
      if (!e) return json({ error: "Sequência não encontrada." }, 404);
      if (e.current_step >= e.max_steps) return json({ error: "Sequência já concluída." }, 400);
      const next = nextBusinessSlot(new Date());
      await admin.from("followup_enrollments").update({
        status: "active", end_reason: null, ended_at: null, next_run_at: next.toISOString(),
      }).eq("id", id);
      await logEvent(admin, {
        enrollment_id: id, prospect_id: e.prospect_id, step: e.current_step,
        action: "resumed", reason: "retomada manual", payload: { next_run_at: next.toISOString() },
      });
      return json({ ok: true, next_run_at: next.toISOString() });
    }

    // ---------- PROCESS (cron) ----------
    if (action !== "process") return json({ error: "Ação desconhecida." }, 400);
    if (!RESEND_API_KEY) return json({ error: "Serviço de e-mail não configurado." }, 500);
    if (!OPENAI_API_KEY) return json({ error: "IA não configurada." }, 500);

    const { data: leased } = await admin.rpc("acquire_job_lease", { _name: "followup-engine", _seconds: 300 });
    if (leased !== true) return json({ ok: true, skipped: "already_running" });

    const summary = { processed: 0, sent: 0, deferred: 0, cancelled: 0, completed: 0, errors: 0 };
    try {
      const { data: due } = await admin.from("followup_enrollments")
        .select("*").eq("status", "active")
        .not("next_run_at", "is", null)
        .lte("next_run_at", new Date().toISOString())
        .order("next_run_at", { ascending: true }).limit(BATCH);

      for (const e of due ?? []) {
        summary.processed += 1;
        const step = e.current_step + 1;

        if (step > e.max_steps) {
          await finish(admin, e, "completed", "sequence_completed", e.current_step);
          summary.completed += 1;
          continue;
        }

        // idempotência forte: etapa já enviada
        const { data: already } = await admin.from("followup_sends")
          .select("step").eq("enrollment_id", e.id).eq("step", step).maybeSingle();
        if (already) {
          await admin.from("followup_enrollments").update({
            current_step: step,
            next_run_at: step + 1 > e.max_steps ? null : scheduleStep(e.started_at, step + 1).toISOString(),
            status: step + 1 > e.max_steps ? "completed" : "active",
          }).eq("id", e.id);
          await logEvent(admin, { enrollment_id: e.id, prospect_id: e.prospect_id, step, action: "skipped", reason: "duplicate_step" });
          continue;
        }

        const guard = await evaluateGuards(admin, e);
        if (guard.kill) {
          await finish(admin, e, "cancelled", guard.kill, step);
          summary.cancelled += 1;
          continue;
        }
        if (guard.defer) {
          const next = nextBusinessSlot(new Date(Date.now() + 24 * 3600_000));
          await admin.from("followup_enrollments").update({ next_run_at: next.toISOString() }).eq("id", e.id);
          await logEvent(admin, {
            enrollment_id: e.id, prospect_id: e.prospect_id, step, action: "deferred",
            reason: guard.defer, payload: { next_run_at: next.toISOString() },
          });
          summary.deferred += 1;
          continue;
        }
        if (!isBusinessTime(new Date())) {
          const next = nextBusinessSlot(new Date());
          await admin.from("followup_enrollments").update({ next_run_at: next.toISOString() }).eq("id", e.id);
          await logEvent(admin, {
            enrollment_id: e.id, prospect_id: e.prospect_id, step, action: "deferred",
            reason: "fora_do_horario_comercial", payload: { next_run_at: next.toISOString() },
          });
          summary.deferred += 1;
          continue;
        }

        const strategy = STRATEGIES[Math.min(step - 1, STRATEGIES.length - 1)];
        const { data: prospect } = e.prospect_id
          ? await admin.from("influencer_prospects").select("*").eq("id", e.prospect_id).maybeSingle()
          : { data: null };
        const { data: history } = e.prospect_id
          ? await admin.from("influencer_messages").select("direction, body_text, created_at")
              .eq("prospect_id", e.prospect_id).order("created_at", { ascending: true }).limit(20)
          : { data: [] };

        let generated;
        try {
          generated = await generateMessage(e, prospect, strategy, history ?? []);
        } catch (err) {
          await logEvent(admin, {
            enrollment_id: e.id, prospect_id: e.prospect_id, step, action: "error",
            reason: "ai_generation_failed", payload: { detail: String((err as Error).message).slice(0, 400) },
          });
          const retry = nextBusinessSlot(new Date(Date.now() + 4 * 3600_000));
          await admin.from("followup_enrollments").update({ next_run_at: retry.toISOString() }).eq("id", e.id);
          summary.errors += 1;
          continue;
        }

        const tok = await optoutToken(admin, e.email, e.prospect_id);
        const unsubscribeUrl = `${APP_URL}/descadastro?token=${tok}`;
        const oneClick = `${supabaseUrl}/functions/v1/influencer-outreach?action=unsubscribe&confirm=1&token=${encodeURIComponent(tok)}`;
        const html = layout(
          generated.bodyText.split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;">${esc(p).replace(/\n/g, "<br>")}</p>`).join(""),
          unsubscribeUrl,
        );

        const { ok, status, body: payload } = await sendResend({
          from: FROM,
          to: [e.email],
          reply_to: `${REPLY_LOCAL}@${REPLY_DOMAIN}`,
          subject: generated.subject,
          html,
          text: `${generated.bodyText}\n\nAtenciosamente,\nEquipe de Parcerias Wiize\n${APP_URL}\n\nPara não receber novos contatos: ${unsubscribeUrl}`,
          headers: {
            "List-Unsubscribe": `<${oneClick}>, <mailto:${REPLY_LOCAL}@${REPLY_DOMAIN}?subject=unsubscribe>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }, `followup/${e.id}/${step}`);

        if (!ok) {
          const message = payload?.message || payload?.error?.message || `Resend ${status}`;
          await logEvent(admin, {
            enrollment_id: e.id, prospect_id: e.prospect_id, step, action: "error",
            reason: "resend_failed", payload: { status, detail: String(message).slice(0, 400) },
          });
          const retry = nextBusinessSlot(new Date(Date.now() + 6 * 3600_000));
          await admin.from("followup_enrollments").update({ next_run_at: retry.toISOString() }).eq("id", e.id);
          summary.errors += 1;
          continue;
        }

        await admin.from("followup_sends").insert({
          enrollment_id: e.id, step, provider_message_id: payload?.id ?? null,
        });
        if (e.prospect_id) {
          await admin.from("influencer_messages").insert({
            prospect_id: e.prospect_id, campaign_id: e.campaign_id, recipient_id: e.recipient_id,
            direction: "enviada", subject: generated.subject, body_text: generated.bodyText, body_html: html,
            from_email: `${REPLY_LOCAL}@${REPLY_DOMAIN}`, to_email: e.email,
            provider_message_id: payload?.id ?? null,
          });
        }

        const memory = [
          ...(Array.isArray(e.memory) ? e.memory : []),
          { step, strategy: strategy.key, subject: generated.subject, cta: generated.cta, arguments: generated.args },
        ];
        const done = step >= e.max_steps;
        await admin.from("followup_enrollments").update({
          current_step: step,
          messages_sent: (e.messages_sent ?? 0) + 1,
          last_sent_at: new Date().toISOString(),
          memory,
          status: done ? "completed" : "active",
          end_reason: done ? "sequence_completed" : null,
          ended_at: done ? new Date().toISOString() : null,
          next_run_at: done ? null : scheduleStep(e.started_at, step + 1).toISOString(),
        }).eq("id", e.id);

        await logEvent(admin, {
          enrollment_id: e.id, prospect_id: e.prospect_id, step, action: "sent",
          reason: strategy.key,
          payload: {
            subject: generated.subject, cta: generated.cta, arguments: generated.args,
            provider_message_id: payload?.id ?? null, model: "gpt-4o-mini",
          },
        });
        summary.sent += 1;
        if (done) summary.completed += 1;

        await new Promise((r) => setTimeout(r, SEND_INTERVAL_MS));
      }
    } finally {
      await admin.rpc("release_job_lease", { _name: "followup-engine" });
    }

    return json({ ok: true, ...summary });
  } catch (err) {
    console.error("[followup-engine]", err);
    return json({ error: (err as Error).message }, 500);
  }
});
