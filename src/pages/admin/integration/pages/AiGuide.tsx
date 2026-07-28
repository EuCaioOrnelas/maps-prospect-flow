// AI Integration Guide — documentação escrita PARA LLMs (Claude, GPT, Gemini,
// Meta Llama) consumirem a Wiize Integration API. Sem marketing. Passo a passo
// executável, catálogo completo dos providers, mapa "pergunta → provider →
// campo", mapa "página da Wiize → provider", receitas multi-provider e
// tool schemas prontos para colar em qualquer orquestrador.
//
// Regra: se um dev humano OU uma IA leu SÓ esta página, precisa conseguir:
//   1. Autenticar
//   2. Descobrir qual provider chamar
//   3. Ler o campo certo da resposta
//   4. Não alucinar

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Bot, BookOpen, ShieldCheck, Zap, AlertTriangle, ListChecks,
  Route, Boxes, PlugZap, FileJson, Workflow, Hash,
} from "lucide-react";
import { CodeBlock } from "../components/CodeBlock";

const BASE_URL = "https://lqfqnqfeuneorxocybru.supabase.co/functions/v1";

// ---------------------------------------------------------------------------
// Catálogo dos 20 providers (fonte da verdade: supabase/functions/
// integration-v1-provider/index.ts — mantenha sincronizado).
// ---------------------------------------------------------------------------
type Provider = {
  name: string;
  scope: string;
  purpose: string;
  keyFields: string[];
  askWhen: string;
  wiizePages: string[];
};

const PROVIDERS: Provider[] = [
  {
    name: "cockpit",
    scope: "cockpit.read",
    purpose:
      "Snapshot completo do Growth Cockpit (dashboard executivo). Fonte oficial para 'quanto meu comercial gerou'.",
    keyFields: [
      "comercial.gerado_em_oportunidades  ← CAMPO CANÔNICO para receita gerada",
      "comercial.tcv_assinado_no_periodo   ← contrato total, NÃO é receita",
      "comercial.leads_ativos",
      "comercial.conversao_percent",
      "comercial.ticket_medio",
    ],
    askWhen:
      "Qualquer pergunta sobre 'como está meu comercial', 'quanto gerei', 'meu dashboard', 'resumo executivo'.",
    wiizePages: ["/dashboard", "/growth-cockpit"],
  },
  {
    name: "crm",
    scope: "crm.read",
    purpose: "Leads do CRM com paginação, filtros e sumário agregado.",
    keyFields: [
      "items[].id, nome, telefone, empresa, estagio, valor_brl, score",
      "summary.total, summary.conversao_percent, summary.valor_em_negociacao_brl",
      "pagination.page, page_size, has_more",
    ],
    askWhen: "'meus leads', 'quantos leads em negociação', 'lista o pipeline'.",
    wiizePages: ["/crm", "/crm/kanban"],
  },
  {
    name: "pipeline",
    scope: "pipeline.read",
    purpose: "Estágios do pipeline com contagem, valor e taxa de conversão por coluna.",
    keyFields: [
      "stages[].estagio, quantidade, valor_brl, conversao_percent",
      "summary.total_valor_brl, summary.total_leads",
    ],
    askWhen: "'como está meu funil', 'quantos leads por estágio', 'onde estou perdendo'.",
    wiizePages: ["/crm/kanban"],
  },
  {
    name: "campaigns",
    scope: "campaigns.read",
    purpose: "Campanhas WhatsApp Meta com métricas agregadas por campanha.",
    keyFields: [
      "items[].campaign_id, name, status, enviados, entregues, respondidos, custo_brl",
      "summary.total_enviados, taxa_resposta_percent",
    ],
    askWhen: "'como estão minhas campanhas', 'qual campanha performou melhor'.",
    wiizePages: ["/campanhas", "/campaigns"],
  },
  {
    name: "meta",
    scope: "meta.read",
    purpose: "Métricas agregadas de TODAS as campanhas Meta no período.",
    keyFields: [
      "totals.enviados, entregues, lidos, respondidos",
      "totals.custo_brl (já convertido de USD/EUR via meta_fx_to_brl)",
      "totals.cpm_brl, cpr_brl",
    ],
    askWhen: "'quanto gastei em Meta', 'CPM da minha conta', 'ROI das campanhas'.",
    wiizePages: ["/campanhas/dashboard"],
  },
  {
    name: "opportunities",
    scope: "opportunities.read",
    purpose:
      "Panorama de oportunidades prospectadas: totais, qualificados, alta oportunidade, score médio e breakdowns.",
    keyFields: [
      "totals.total, qualificados, alta_oportunidade, score_medio",
      "por_categoria[], por_cidade[], por_rating[], por_probabilidade[], por_score[], por_status[]",
    ],
    askWhen: "'minhas oportunidades', 'quantos leads qualificados', 'quais cidades converto mais'.",
    wiizePages: ["/oportunidades", "/opportunities-management"],
  },
  {
    name: "finance",
    scope: "finance.read",
    purpose:
      "Vendas fechadas (lead_deals) e métricas financeiras REAIS. Use para MRR, contratos assinados, vendas fechadas.",
    keyFields: [
      "totais.receita_realizada_brl, mrr_brl, contratos_assinados",
      "deals[].id, valor_brl, cliente, fechado_em, status",
    ],
    askWhen: "'meu MRR', 'quanto vendi mês passado', 'contratos fechados'. NÃO use para 'quanto gerei' (use cockpit).",
    wiizePages: ["/vendas", "/financeiro"],
  },
  {
    name: "forecast",
    scope: "forecast.read",
    purpose: "Previsão de receita e conversões futuras a partir do pipeline atual.",
    keyFields: [
      "previsao_30d_brl, previsao_60d_brl, previsao_90d_brl",
      "confianca_percent, metodologia",
    ],
    askWhen: "'quanto devo faturar', 'projeção', 'forecast do mês'.",
    wiizePages: ["/dashboard", "/vendas"],
  },
  {
    name: "contacts",
    scope: "contacts.read",
    purpose: "Contatos únicos da empresa (deduplicação por telefone/e-mail).",
    keyFields: ["items[].contact_id, nome, telefone, email, primeira_interacao", "summary.total_unicos"],
    askWhen: "'quantos contatos únicos tenho', 'quem falou comigo'.",
    wiizePages: ["/chat", "/crm"],
  },
  {
    name: "analytics",
    scope: "analytics.read",
    purpose: "Eventos analíticos agregados (tracking, funis, cohorts).",
    keyFields: ["events[].name, count, unique_users", "funnels[].step, drop_off_percent"],
    askWhen: "'onde os leads travam', 'analytics de comportamento'.",
    wiizePages: ["/dashboard/analytics"],
  },
  {
    name: "dashboard",
    scope: "dashboard.read",
    purpose: "Snapshot consolidado dos widgets do dashboard principal.",
    keyFields: ["widgets[].id, title, value, delta_percent, sparkline[]"],
    askWhen: "'resumo do dia', 'meus principais indicadores'.",
    wiizePages: ["/dashboard"],
  },
  {
    name: "automation",
    scope: "automation.read",
    purpose: "Fluxos de automação WhatsApp, gatilhos e execução.",
    keyFields: [
      "flows[].id, name, ativo, execucoes_periodo, taxa_conclusao_percent",
      "triggers[].type, count",
    ],
    askWhen: "'meus fluxos', 'quantos disparos', 'automação que mais converte'.",
    wiizePages: ["/fluxos", "/whatsapp/flows"],
  },
  {
    name: "conversations",
    scope: "conversations.read",
    purpose: "Conversas ativas do Chat com atendente humano ou agente.",
    keyFields: [
      "items[].conversation_id, contact_name, ultimo_evento_at, agente_ativo",
      "summary.abertas, aguardando_humano",
    ],
    askWhen: "'quantas conversas abertas', 'onde o humano precisa entrar'.",
    wiizePages: ["/chat", "/inbox"],
  },
  {
    name: "leads",
    scope: "leads.read",
    purpose: "Alias público de CRM com foco em detalhamento de lead único.",
    keyFields: ["lead.id, nome, telefone, historico[], score, estagio_atual"],
    askWhen: "'me fala tudo sobre esse lead', 'histórico do lead X'.",
    wiizePages: ["/crm/lead/:id"],
  },
  {
    name: "scores",
    scope: "scores.read",
    purpose: "Score de leads e evolução histórica.",
    keyFields: ["items[].lead_id, score, delta_7d", "distribuicao[]"],
    askWhen: "'top leads por score', 'quem subiu de score'.",
    wiizePages: ["/crm", "/oportunidades"],
  },
  {
    name: "users",
    scope: "users.read",
    purpose: "Membros da conta e status de acesso.",
    keyFields: ["users[].user_id, email, role, ultimo_acesso_at, ativo"],
    askWhen: "'quem tem acesso', 'quantos usuários ativos'.",
    wiizePages: ["/configuracoes/usuarios"],
  },
  {
    name: "company",
    scope: "company.read",
    purpose: "Perfil da empresa, serviços cadastrados e configurações comerciais.",
    keyFields: ["company.nome, nicho, ticket_medio_brl, servicos[]"],
    askWhen: "'qual meu perfil', 'meus serviços cadastrados'.",
    wiizePages: ["/configuracoes/empresa", "/onboarding"],
  },
  {
    name: "settings",
    scope: "settings.read",
    purpose: "Configurações da conta que impactam automações e chat.",
    keyFields: ["horario_atendimento, timezone, agente_padrao_id, notificacoes"],
    askWhen: "'quais minhas configurações', 'qual meu horário de atendimento'.",
    wiizePages: ["/configuracoes"],
  },
  {
    name: "permissions",
    scope: "permissions.read",
    purpose: "Permissões efetivas do usuário autenticado (feature flags + role).",
    keyFields: ["role, modules[].name, allowed, subscription_tier"],
    askWhen: "'posso usar X', 'meu plano libera Y'.",
    wiizePages: ["/*"],
  },
  {
    name: "insights",
    scope: "insights.read",
    purpose: "Insights de IA sobre oportunidades e performance de campanhas.",
    keyFields: ["insights[].title, category, severity, recommendation"],
    askWhen: "'o que você recomenda', 'onde tem oportunidade escondida'.",
    wiizePages: ["/dashboard", "/oportunidades"],
  },
];

// ---------------------------------------------------------------------------

export default function AiGuide() {
  const systemPrompt = `Você é um agente conectado à Wiize Integration API v1.

CONTRATO INEGOCIÁVEL:
1. Nunca invente campos, valores ou métricas. Se um campo não existir na
   resposta, responda "dado indisponível" e explique qual provider foi consultado.
2. Nunca acesse tabelas, colunas ou banco diretamente. Toda leitura passa
   pelos endpoints /integration-v1-context e /integration-v1-provider.
3. Nunca exponha, logue ou repita x-client-secret, x-user-jwt, HMAC ou
   qualquer credencial recebida via header/env.
4. Antes de responder qualquer pergunta quantitativa (receita, leads, pipeline,
   conversão, campanhas, MRR), CHAME o provider correto — nunca responda de memória.
5. Para "quanto meu comercial gerou" use cockpit.comercial.gerado_em_oportunidades.
   NUNCA use finance.receita_total nem tcv_assinado_no_periodo para essa pergunta
   (TCV é valor de contrato total, não é receita gerada).
6. Sempre inclua x-correlation-id (UUID v4) por request.
7. Se receber 429, respeite Retry-After. Se receber 503 CIRCUIT_OPEN, aguarde
   30s antes de tentar de novo. Nunca paralelize retries.
8. Valores monetários vêm em BRL (real). Percentuais vêm em 0–100 (não 0–1).
9. Sempre prefira /integration-v1-provider (chamada focada, mais barata) a
   /integration-v1-context (multi-módulo, mais caro em latência).

BASE_URL = ${BASE_URL}
AUTENTICAÇÃO = x-client-id + x-client-secret + x-user-jwt (todos obrigatórios)
FORMATO = JSON, UTF-8
IDIOMA DAS RESPOSTAS AO USUÁRIO = pt-BR`;

  // Passo a passo executável (o que a IA/dev faz na PRIMEIRA integração)
  const step1 = `# 1. Obter credenciais (uma vez, feito pelo humano)
# O admin da Wiize gera:
#   - WIIZE_CLIENT_ID
#   - WIIZE_CLIENT_SECRET
# Guarde em secrets do seu ambiente. Nunca commit.

export WIIZE_CLIENT_ID="wian_prod_xxxxxxxxxxxxxxxx"
export WIIZE_CLIENT_SECRET="whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"`;

  const step2 = `// 2. Obter o JWT do usuário final da Wiize
// O JWT vem do login do usuário na sua aplicação (Wian) via Supabase Auth.
// Ele é o que autoriza a Wiize a devolver dados DAQUELE usuário.
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const { data: { session } } = await supabase.auth.getSession();
const userJwt = session?.access_token; // <- este é o x-user-jwt`;

  const step3 = `# 3. Primeira chamada — snapshot do cockpit em uma linha
curl -X POST "${BASE_URL}/integration-v1-provider" \\
  -H "content-type: application/json" \\
  -H "x-client-id: $WIIZE_CLIENT_ID" \\
  -H "x-client-secret: $WIIZE_CLIENT_SECRET" \\
  -H "x-user-jwt: $USER_JWT" \\
  -H "x-provider-name: cockpit" \\
  -H "x-correlation-id: $(uuidgen)" \\
  -d '{ "period": "last_30_days" }'`;

  const step4 = `// 4. Ler o campo canônico e responder ao usuário
// Resposta chega em data.<provider>.<campo>. Ex: quanto meu comercial gerou:
const res = await wiizeProvider("cockpit", { period: "last_30_days" });
const gerado = res.data.cockpit.comercial.gerado_em_oportunidades;
console.log(\`Você gerou R$ \${gerado.toLocaleString("pt-BR")} nos últimos 30 dias.\`);`;

  // Mapa "pergunta → provider → campo"
  const routingTable: Array<[string, string, string]> = [
    ["Quanto meu comercial gerou?", "cockpit", "comercial.gerado_em_oportunidades"],
    ["Qual meu TCV / valor de contratos?", "cockpit", "comercial.tcv_assinado_no_periodo"],
    ["Quantos leads ativos?", "cockpit", "comercial.leads_ativos"],
    ["Minha taxa de conversão?", "cockpit", "comercial.conversao_percent"],
    ["Meu MRR?", "finance", "totais.mrr_brl"],
    ["Quanto vendi mês passado?", "finance", "totais.receita_realizada_brl (period=last_30_days)"],
    ["Quais leads em negociação?", "crm", "items[] filtrado por estagio=em_negociacao"],
    ["Quanto tem no pipeline?", "crm", "summary.valor_em_negociacao_brl"],
    ["Como está meu funil?", "pipeline", "stages[]"],
    ["Onde perco mais leads?", "pipeline", "stages[].conversao_percent"],
    ["Como estão as campanhas Meta?", "campaigns", "items[] + summary.taxa_resposta_percent"],
    ["Quanto gastei em Meta?", "meta", "totals.custo_brl"],
    ["Minhas oportunidades qualificadas?", "opportunities", "totals.qualificados"],
    ["Cidades que mais convertem?", "opportunities", "por_cidade[]"],
    ["Previsão de faturamento?", "forecast", "previsao_30d_brl / 60d / 90d"],
    ["Quantos contatos únicos?", "contacts", "summary.total_unicos"],
    ["Quantas conversas abertas?", "conversations", "summary.abertas"],
    ["Fluxos de automação ativos?", "automation", "flows[] filtrado por ativo=true"],
    ["Top leads por score?", "scores", "items[] ordenado desc por score"],
    ["Detalhes do lead X?", "leads", "lead (com filtro lead_id)"],
    ["Quem tem acesso à conta?", "users", "users[]"],
    ["Meus serviços cadastrados?", "company", "company.servicos[]"],
    ["Meu horário de atendimento?", "settings", "horario_atendimento"],
    ["Posso usar o módulo X?", "permissions", "modules[] find(name=X).allowed"],
    ["Recomendações de IA?", "insights", "insights[]"],
  ];

  // Curl reutilizável para /provider
  const providerCurl = `curl -X POST "${BASE_URL}/integration-v1-provider" \\
  -H "content-type: application/json" \\
  -H "x-client-id: $WIIZE_CLIENT_ID" \\
  -H "x-client-secret: $WIIZE_CLIENT_SECRET" \\
  -H "x-user-jwt: $USER_JWT" \\
  -H "x-provider-name: crm" \\
  -H "x-idempotency-key: $(uuidgen)" \\
  -H "x-correlation-id: $(uuidgen)" \\
  -d '{
    "period": "last_30_days",
    "filters": { "estagio": "em_negociacao" },
    "pagination": { "page": 1, "page_size": 50 }
  }'`;

  // /context multi-módulo
  const contextCurl = `curl -X POST "${BASE_URL}/integration-v1-context" \\
  -H "content-type: application/json" \\
  -H "x-client-id: $WIIZE_CLIENT_ID" \\
  -H "x-client-secret: $WIIZE_CLIENT_SECRET" \\
  -H "x-user-jwt: $USER_JWT" \\
  -H "x-correlation-id: $(uuidgen)" \\
  -d '{
    "modules": ["cockpit", "pipeline", "insights"],
    "period": "last_30_days"
  }'`;

  // Cliente TS reutilizável (baseline oficial)
  const tsClient = `// wiize-client.ts — cliente oficial para IA orquestradora consumir a Wiize.
// Roda em Deno / Node 18+. Sem cache — deixe o modelo decidir revalidação.
const BASE_URL = "${BASE_URL}";

export type WiizeAuth = {
  clientId: string;
  clientSecret: string;
  userJwt: string; // JWT do usuário final (Supabase Auth session.access_token)
};

export type Period = "today" | "last_7_days" | "last_30_days" | "last_90_days";

async function call(path: string, headers: Record<string, string>, body: unknown) {
  const res = await fetch(\`\${BASE_URL}\${path}\`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": crypto.randomUUID(),
      ...headers,
    },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const retryAfter = res.headers.get("retry-after");
    throw Object.assign(
      new Error(\`Wiize \${res.status} \${json.code ?? ""}: \${json.message ?? res.statusText}\`),
      { status: res.status, code: json.code, retryAfter, requestId: json.request_id },
    );
  }
  return json;
}

// Chamada focada em UM provider (mais barata e rápida).
export function wiizeProvider(
  auth: WiizeAuth,
  provider: string,
  input: { period?: Period; filters?: Record<string, unknown>; pagination?: { page?: number; page_size?: number } } = {},
  opts: { idempotencyKey?: string } = {},
) {
  return call("/integration-v1-provider", {
    "x-client-id": auth.clientId,
    "x-client-secret": auth.clientSecret,
    "x-user-jwt": auth.userJwt,
    "x-provider-name": provider,
    ...(opts.idempotencyKey ? { "x-idempotency-key": opts.idempotencyKey } : {}),
  }, input);
}

// Chamada multi-módulo (uma request, várias áreas). Use quando o modelo
// realmente precisa de contexto amplo (ex: relatório executivo).
export function wiizeContext(
  auth: WiizeAuth,
  modules: string[],
  period: Period = "last_30_days",
) {
  return call("/integration-v1-context", {
    "x-client-id": auth.clientId,
    "x-client-secret": auth.clientSecret,
    "x-user-jwt": auth.userJwt,
  }, { modules, period });
}`;

  // Cliente Python (paridade)
  const pyClient = `# wiize_client.py — paridade com wiize-client.ts
import os, uuid, requests

BASE_URL = "${BASE_URL}"

def _call(path: str, headers: dict, body: dict) -> dict:
    r = requests.post(
        f"{BASE_URL}{path}",
        headers={
            "content-type": "application/json",
            "x-correlation-id": str(uuid.uuid4()),
            **headers,
        },
        json=body or {},
        timeout=30,
    )
    data = r.json() if r.content else {}
    if not r.ok:
        raise Exception(f"Wiize {r.status_code} {data.get('code','')}: {data.get('message', r.reason)}")
    return data

def wiize_provider(auth, provider, period="last_30_days", filters=None, pagination=None, idem_key=None):
    headers = {
        "x-client-id": auth["client_id"],
        "x-client-secret": auth["client_secret"],
        "x-user-jwt": auth["user_jwt"],
        "x-provider-name": provider,
    }
    if idem_key: headers["x-idempotency-key"] = idem_key
    body = {"period": period}
    if filters: body["filters"] = filters
    if pagination: body["pagination"] = pagination
    return _call("/integration-v1-provider", headers, body)`;

  // Envelope de resposta
  const responseShape = `{
  "success": true,
  "request_id": "req_9f2b8a1c-...",
  "correlation_id": "3a1c...",           // ecoa o que você mandou
  "processing_time_ms": 142,
  "cache_hit": false,
  "version": "v1",
  "data": {
    "cockpit": {
      "comercial": {
        "gerado_em_oportunidades": 2443.00,        // ← receita real
        "tcv_assinado_no_periodo": 61692.00,        // ← TCV (não é receita)
        "leads_ativos": 128,
        "conversao_percent": 4.7,
        "ticket_medio": 1980.00
      }
    }
  },
  "meta": {
    "period": "last_30_days",
    "generated_at": "2026-07-28T20:00:00Z",
    "provider": "cockpit"
  }
}`;

  // Envelope de erro
  const errorShape = `{
  "success": false,
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Muitas requisições. Aguarde 12s.",
  "request_id": "req_9f2b8a1c-...",
  "http_status": 429,
  "retry_after_seconds": 12
}`;

  // Tool schemas: um por provider mais usado + genérico
  const toolSchemaGeneric = `{
  "name": "wiize_provider",
  "description": "Chama um único provider da Wiize e retorna dados reais do usuário. Use SEMPRE que a pergunta envolver números, leads, pipeline, receita, conversão, campanhas ou métricas da conta. Nunca invente valores — se o campo não existir na resposta, diga 'dado indisponível'.",
  "input_schema": {
    "type": "object",
    "properties": {
      "provider": {
        "type": "string",
        "enum": ["cockpit","crm","pipeline","campaigns","meta","opportunities","finance","forecast","contacts","analytics","dashboard","automation","conversations","leads","scores","users","company","settings","permissions","insights"],
        "description": "Nome do provider. Escolha com base no mapa 'pergunta → provider' da documentação."
      },
      "period": {
        "type": "string",
        "enum": ["today","last_7_days","last_30_days","last_90_days"],
        "default": "last_30_days"
      },
      "filters": {
        "type": "object",
        "description": "Filtros específicos do provider. Ex: { \\"estagio\\": \\"em_negociacao\\" } no CRM."
      },
      "pagination": {
        "type": "object",
        "properties": {
          "page": { "type": "integer", "minimum": 1 },
          "page_size": { "type": "integer", "minimum": 1, "maximum": 200 }
        }
      }
    },
    "required": ["provider"]
  }
}`;

  const toolSchemaContext = `{
  "name": "wiize_context",
  "description": "Chama VÁRIOS providers em uma única requisição. Use APENAS quando o usuário pediu um relatório amplo/executivo que envolve 3+ domínios. Para perguntas focadas, prefira wiize_provider.",
  "input_schema": {
    "type": "object",
    "properties": {
      "modules": {
        "type": "array",
        "items": { "type": "string", "enum": ["cockpit","crm","pipeline","campaigns","meta","opportunities","finance","forecast","contacts","analytics","dashboard","automation","conversations","leads","scores","users","company","settings","permissions","insights"] },
        "minItems": 1
      },
      "period": {
        "type": "string",
        "enum": ["today","last_7_days","last_30_days","last_90_days"],
        "default": "last_30_days"
      }
    },
    "required": ["modules"]
  }
}`;

  // Receitas prontas (multi-provider)
  const recipeExec = `// RECEITA 1 — "Me dá um resumo executivo desta semana"
// 3 providers em paralelo, cliente reconcilia.
const [cockpit, pipeline, insights] = await Promise.all([
  wiizeProvider(auth, "cockpit", { period: "last_7_days" }),
  wiizeProvider(auth, "pipeline", { period: "last_7_days" }),
  wiizeProvider(auth, "insights", { period: "last_7_days" }),
]);

const resumo = {
  receita: cockpit.data.cockpit.comercial.gerado_em_oportunidades,
  leads_ativos: cockpit.data.cockpit.comercial.leads_ativos,
  gargalo: pipeline.data.pipeline.stages
    .sort((a, b) => a.conversao_percent - b.conversao_percent)[0],
  top_insight: insights.data.insights.insights[0],
};`;

  const recipeCrmPage = `// RECEITA 2 — "Leads em negociação acima de R$ 5k" (paginado)
async function* iterCrm(auth: WiizeAuth) {
  let page = 1;
  while (true) {
    const r = await wiizeProvider(auth, "crm", {
      period: "last_90_days",
      filters: { estagio: "em_negociacao", valor_min_brl: 5000 },
      pagination: { page, page_size: 100 },
    });
    for (const lead of r.data.crm.items) yield lead;
    if (!r.data.crm.pagination.has_more) break;
    page += 1;
  }
}`;

  const recipeRetry = `// RECEITA 3 — Retry com respeito a Retry-After / CIRCUIT_OPEN
async function safeCall<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e: any) {
      if (e.status === 429 && e.retryAfter) {
        await new Promise(r => setTimeout(r, Number(e.retryAfter) * 1000));
        continue;
      }
      if (e.status === 503 && e.code === "CIRCUIT_OPEN") {
        await new Promise(r => setTimeout(r, 30_000));
        continue;
      }
      throw e; // 4xx não-429 = terminal, não retenta
    }
  }
  throw new Error("Wiize retry exhausted");
}`;

  const errorTable: Array<[string, string, string]> = [
    ["400", "VALIDATION_ERROR",       "Body ou headers malformados. NÃO retente sem corrigir o payload."],
    ["400", "VALIDATION_MODULES",     "Array 'modules' vazio ou inválido em /context."],
    ["401", "AUTH_MISSING_CLIENT",    "Faltou x-client-id ou x-client-secret. Verifique secrets."],
    ["401", "AUTH_INVALID_CLIENT",    "client_id/secret errados. Peça ao humano para revalidar credenciais."],
    ["401", "AUTH_INVALID_JWT",       "JWT do usuário expirado/ inválido. Solicite novo login."],
    ["403", "PERM_SCOPE_MISSING",     "Cliente não tem escopo (ex: crm.read) para esse provider. NÃO retente."],
    ["403", "IP_BANNED",              "IP banido por abuso. Contate o admin."],
    ["409", "IDEMPOTENCY_CONFLICT",   "Mesma idempotency-key com payload diferente. Gere nova UUID."],
    ["422", "PROVIDER_NOT_FOUND",     "x-provider-name desconhecido. Confira o catálogo."],
    ["429", "RATE_LIMIT_EXCEEDED",    "Respeite Retry-After. Faça backoff. NÃO paralelize retries."],
    ["503", "CIRCUIT_OPEN",           "Provider degradado. Aguarde 30s. Reduza frequência."],
    ["504", "PROVIDER_TIMEOUT",       "Provider demorou > timeout. Tente reduzir escopo/período."],
    ["500", "PROVIDER_ERROR",         "Erro interno. Reporte o request_id ao admin."],
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-violet-500/10 p-2 text-violet-500">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Guia para IAs</h1>
          <p className="text-sm text-muted-foreground">
            Documentação completa para modelos (Claude, GPT, Gemini, Meta Llama) integrarem a Wiize sem alucinar —
            passo a passo, catálogo dos 20 providers, mapa "pergunta → provider → campo", receitas multi-provider e tool schemas.
          </p>
        </div>
      </div>

      <Alert>
        <BookOpen className="h-4 w-4" />
        <AlertTitle>Como usar esta página</AlertTitle>
        <AlertDescription>
          <strong>1)</strong> Cole o <em>System Prompt</em> (Seção 1) no system message do agente. <strong>2)</strong> Registre
          os <em>tool schemas</em> (Seção 9). <strong>3)</strong> Use o <em>mapa de roteamento</em> (Seção 4) para escolher
          o provider certo. <strong>4)</strong> Consulte o <em>catálogo</em> (Seção 5) para ver campos disponíveis.
        </AlertDescription>
      </Alert>

      {/* 1. System prompt */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Badge variant="secondary">1</Badge> System Prompt (colar no agente)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock lang="text" code={systemPrompt} />
        </CardContent>
      </Card>

      {/* 2. Passo a passo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4 text-emerald-500" />
            <Badge variant="secondary">2</Badge> Passo a passo — da credencial à primeira resposta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Passo 1 · Guardar credenciais do cliente</p>
            <CodeBlock lang="bash" code={step1} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Passo 2 · Obter o JWT do usuário final</p>
            <CodeBlock lang="typescript" code={step2} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Passo 3 · Primeira chamada (cockpit)</p>
            <CodeBlock lang="bash" code={step3} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Passo 4 · Ler o campo canônico e responder</p>
            <CodeBlock lang="typescript" code={step4} />
          </div>
        </CardContent>
      </Card>

      {/* 3. Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PlugZap className="h-4 w-4 text-sky-500" />
            <Badge variant="secondary">3</Badge> Endpoints disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="rounded-md border border-border p-3">
            <p className="font-medium text-foreground">POST /integration-v1-provider <Badge variant="outline" className="ml-2">preferido</Badge></p>
            <p className="text-muted-foreground mt-1">
              Executa APENAS um provider (via header <code>x-provider-name</code>). Menor latência, menor custo, mais fácil de auditar. Use por padrão.
            </p>
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="font-medium text-foreground">POST /integration-v1-context</p>
            <p className="text-muted-foreground mt-1">
              Multi-módulo em uma request. Use SÓ para relatórios executivos amplos (3+ domínios). Aceita <code>modules[]</code> e <code>period</code>.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Providers atuais (20): <code>cockpit, crm, pipeline, campaigns, meta, opportunities, finance, forecast, contacts, analytics, dashboard, automation, conversations, leads, scores, users, company, settings, permissions, insights</code>.
          </p>
        </CardContent>
      </Card>

      {/* 4. Mapa pergunta → provider → campo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Route className="h-4 w-4 text-fuchsia-500" />
            <Badge variant="secondary">4</Badge> Roteamento — pergunta do usuário → provider → campo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="pb-2 pr-4">Pergunta</th>
                  <th className="pb-2 pr-4">Provider</th>
                  <th className="pb-2">Campo a ler</th>
                </tr>
              </thead>
              <tbody>
                {routingTable.map(([q, p, f]) => (
                  <tr key={q} className="border-b border-border/40">
                    <td className="py-2 pr-4 text-muted-foreground">{q}</td>
                    <td className="py-2 pr-4"><code className="text-xs">{p}</code></td>
                    <td className="py-2"><code className="text-xs text-foreground">{f}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 5. Catálogo completo dos providers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Boxes className="h-4 w-4 text-amber-500" />
            <Badge variant="secondary">5</Badge> Catálogo dos 20 providers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {PROVIDERS.map((p) => (
            <div key={p.name} className="rounded-md border border-border p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <code className="font-mono text-sm font-semibold text-foreground">{p.name}</code>
                <Badge variant="outline" className="text-[10px]">{p.scope}</Badge>
                {p.wiizePages.map((pg) => (
                  <Badge key={pg} variant="secondary" className="text-[10px] font-mono">{pg}</Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mb-2">{p.purpose}</p>
              <p className="text-xs text-foreground/80 mb-1"><strong>Quando chamar:</strong> {p.askWhen}</p>
              <p className="text-xs text-foreground/80 mb-1"><strong>Campos-chave:</strong></p>
              <ul className="ml-4 list-disc text-xs text-muted-foreground space-y-0.5">
                {p.keyFields.map((f) => (<li key={f}><code>{f}</code></li>))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 6. Exemplos curl */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Badge variant="secondary">6</Badge> Exemplos completos — cURL
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">/integration-v1-provider (leads em negociação, paginado)</p>
            <CodeBlock lang="bash" code={providerCurl} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">/integration-v1-context (cockpit + pipeline + insights)</p>
            <CodeBlock lang="bash" code={contextCurl} />
          </div>
        </CardContent>
      </Card>

      {/* 7. Clientes oficiais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Badge variant="secondary">7</Badge> Clientes de referência (TS e Python)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">TypeScript (Deno / Node 18+)</p>
            <CodeBlock lang="typescript" code={tsClient} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Python 3.10+</p>
            <CodeBlock lang="python" code={pyClient} />
          </div>
        </CardContent>
      </Card>

      {/* 8. Envelopes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileJson className="h-4 w-4 text-cyan-500" />
            <Badge variant="secondary">8</Badge> Contrato de resposta (sucesso e erro)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Sucesso — envelope padrão</p>
            <CodeBlock lang="json" code={responseShape} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Erro — envelope padrão</p>
            <CodeBlock lang="json" code={errorShape} />
          </div>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Regra crítica anti-alucinação</AlertTitle>
            <AlertDescription>
              <code>gerado_em_oportunidades</code> é a receita real gerada pelo comercial.{" "}
              <code>tcv_assinado_no_periodo</code> é valor de contrato total (TCV) — <strong>NÃO</strong> é receita.
              Nunca troque um pelo outro.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* 9. Tool schemas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Badge variant="secondary">9</Badge> Tool / Function schemas (Claude · GPT · Gemini · Llama)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Registre AMBOS os tools abaixo. O modelo escolhe entre <code>wiize_provider</code> (padrão, focado)
            e <code>wiize_context</code> (relatórios amplos). Mesmo shape funciona em Anthropic Tools,
            OpenAI Function Calling, Google Function Declarations e wrappers Llama compatíveis com OpenAI.
          </p>
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Tool 1 · wiize_provider (default)</p>
            <CodeBlock lang="json" code={toolSchemaGeneric} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Tool 2 · wiize_context (multi-módulo)</p>
            <CodeBlock lang="json" code={toolSchemaContext} />
          </div>
        </CardContent>
      </Card>

      {/* 10. Receitas multi-provider */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Workflow className="h-4 w-4 text-violet-500" />
            <Badge variant="secondary">10</Badge> Receitas prontas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CodeBlock lang="typescript" code={recipeExec} filename="receita-1-resumo-executivo.ts" />
          <CodeBlock lang="typescript" code={recipeCrmPage} filename="receita-2-crm-paginado.ts" />
          <CodeBlock lang="typescript" code={recipeRetry} filename="receita-3-retry-seguro.ts" />
        </CardContent>
      </Card>

      {/* 11. Segurança */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <Badge variant="secondary">11</Badge> Segurança que a IA precisa respeitar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Nunca logue, imprima ou devolva <code>x-client-secret</code> nem <code>x-user-jwt</code>.</p>
          <p>• Sempre gere <code>x-correlation-id</code> (UUID v4) por request — usado para tracing e auditoria.</p>
          <p>• Use <code>x-idempotency-key</code> em qualquer chamada que possa ser retentada (TTL 60s no servidor).</p>
          <p>• Se receber <code>429</code>, respeite <code>Retry-After</code>. Se receber <code>503 CIRCUIT_OPEN</code>, aguarde 30s.</p>
          <p>• HMAC-SHA256 é opcional por padrão mas obrigatório se <code>INTEGRATION_REQUIRE_HMAC=true</code>. Ver página <strong>Assinatura HMAC</strong>.</p>
          <p>• Nonce anti-replay: cada assinatura HMAC vale uma única vez em janela de 5 min.</p>
        </CardContent>
      </Card>

      {/* 12. Rate limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-amber-500" />
            <Badge variant="secondary">12</Badge> Rate limits (o que o agente precisa saber)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong>IP:</strong> 300 req/min. Excedeu → 429 + ban temporário se persistir.</p>
          <p>• <strong>Usuário em /context:</strong> 60 req/min.</p>
          <p>• <strong>Usuário/provider em /provider:</strong> 120 req/min.</p>
          <p>• <strong>Circuit breaker:</strong> 5 falhas consecutivas em 30s abre por 30s (503 CIRCUIT_OPEN).</p>
          <p>• <strong>Abuse events:</strong> escopos negados / secrets inválidos são registrados; abuso acumulado gera ban de IP/cliente.</p>
        </CardContent>
      </Card>

      {/* 13. Catálogo de erros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Hash className="h-4 w-4 text-rose-500" />
            <Badge variant="secondary">13</Badge> Catálogo de erros (para o modelo interpretar)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="pb-2 pr-4">HTTP</th>
                  <th className="pb-2 pr-4">code</th>
                  <th className="pb-2">O que a IA deve fazer</th>
                </tr>
              </thead>
              <tbody>
                {errorTable.map(([http, code, action]) => (
                  <tr key={code} className="border-b border-border/40">
                    <td className="py-2 pr-4 font-mono text-xs">{http}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-foreground">{code}</td>
                    <td className="py-2 text-muted-foreground">{action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
