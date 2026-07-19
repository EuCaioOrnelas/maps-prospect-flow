// Developer Center — documentação única e completa da Integration Layer Wiize.
// Página pública (sem autenticação) para ser compartilhada com consumidores externos
// (ex.: Wian AI). Cobre autenticação, endpoints, filtros, providers, DTOs, erros,
// exemplos e recomendações. Toda a documentação em um único fluxo — sem tabs.

import { PROVIDER_DOCS } from "../registry/providers";
import { ERROR_DOCS } from "../registry/errors";
import { FILTER_DOCS } from "../registry/filters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Copy, ShieldCheck, Zap, BookOpen, Filter, Code2, Package, AlertTriangle, Timer, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = "https://wgokhkawjdxsmvfuhazb.supabase.co/functions/v1";
const CONTEXT_URL = `${BASE_URL}/integration-v1-context`;
const PROVIDER_URL = `${BASE_URL}/integration-v1-provider`;

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const { toast } = useToast();
  return (
    <div className="relative group">
      <pre className="bg-muted/50 border border-border/60 rounded-lg p-4 text-xs overflow-x-auto font-mono leading-relaxed">
        {lang && <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{lang}</div>}
        <code className="text-foreground/90">{code}</code>
      </pre>
      <button
        onClick={() => { navigator.clipboard.writeText(code); toast({ title: "Copiado" }); }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition p-1.5 bg-background/80 hover:bg-background rounded border border-border/60"
        aria-label="Copiar"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function Section({ id, icon: Icon, title, children }: { id: string; icon: any; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <h2 className="text-2xl font-bold flex items-center gap-3">
        <span className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </span>
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

const PROVIDER_METRICS: Record<string, { title: string; description: string; sampleFields: string[] }> = {
  cockpit: {
    title: "Snapshot Executivo (Growth Cockpit)",
    description: "Consolida TODOS os cards do dashboard principal em um único payload.",
    sampleFields: [
      "receita_potencial.total  — Receita potencial acumulada (BRL)",
      "receita_potencial.no_periodo  — Receita potencial no período filtrado (BRL)",
      "leads_quentes_hoje  — Nº de leads com +150 pts nas últimas 24h",
      "gargalo.status  — 'Excelente' | 'Operação Saudável' | 'Atenção Necessária' | 'Crítico'",
      "gargalo.health_score  — 0..100",
      "gargalo.avg_score / hot_leads / cold_leads / ready_for_sale",
      "ia_economizou_min  — Minutos poupados pela IA no período",
      "forecast.conservador / realista / agressivo  — Projeção BRL/próx. 30 dias",
      "forecast.buckets[]  — { label, count, sales_low/mid/high, revenue_low/mid/high }",
      "funil_operacional[]  — { stage, value, pct } (Captados → Oportunidades)",
      "radar[]  — Top-10 leads por crescimento de score em 7d",
      "alertas[]  — { type, text, route? } insights automáticos",
      "comercial  — { receita_total_acumulada, mrr_ativo, vendas_ativas, projecao_12_meses }",
      "campanhas  — { total, recipients, sent, failed, delivery_rate }",
    ],
  },
  crm: {
    title: "Leads do CRM (paginado)",
    description: "Lista paginada de leads + sumário agregado com valor total em negociação.",
    sampleFields: [
      "items[].id / contact_name / company_name / phone / email",
      "items[].category / city / region / rating / review_count",
      "items[].opportunity_level / closing_probability / ai_score",
      "items[].estimated_value  — Valor em negociação (BRL) por lead",
      "items[].stage_id / responded / first_message_sent / created_at",
      "summary.total_contacts / responded / taxa_conversao (0..1)",
      "summary.valor_total_negociacao  — BRL agregado",
      "summary.avg_ai_score / by_stage{ stage_id: { count, value } }",
    ],
  },
  pipeline: {
    title: "Kanban do Pipeline",
    description: "Estágios com contagem, valor e taxa de conversão por coluna.",
    sampleFields: [
      "items[].id / name / sort_order / color / is_default",
      "items[].leads_count / responded_count / total_value / conversion_rate",
      "summary.total_contacts / taxa_conversao / valor_total_negociacao",
    ],
  },
  opportunities: {
    title: "Oportunidades (com breakdowns)",
    description: "Panorama completo — qualificados, alta oportunidade, score médio + breakdowns por categoria, cidade, rating, probabilidade, score.",
    sampleFields: [
      "summary.total / qualified / high_opportunity",
      "summary.avg_score / response_rate / qualification_rate",
      "summary.total_estimated_value  — BRL",
      "summary.avg_rating / avg_closing_probability",
      "breakdowns.by_category  — { [categoria]: count }",
      "breakdowns.by_city  — { [cidade]: count }",
      "breakdowns.by_rating  — { '4.5+' | '4.0-4.4' | ... : count }",
      "breakdowns.by_closing_probability  — { '80-100' | '60-79' | ... : count }",
      "breakdowns.by_score_bucket  — { pronto_venda | alto_valor | ... : count }",
      "items[]  — top oportunidades por score+valor",
    ],
  },
  finance: {
    title: "Vendas & Financeiro",
    description: "Vendas fechadas, MRR ativo e projeção 12 meses. Fonte: lead_deals.",
    sampleFields: [
      "summary.receita_total  — BRL acumulado (one_time + recurring × meses)",
      "summary.mrr_ativo  — BRL/mês recorrente ativo",
      "summary.vendas_ativas / vendas_expirando_30d",
      "summary.projecao_12_meses  — BRL previsto próx. 12 meses",
      "breakdowns.by_payment_method / by_type",
      "items[]  — { id, lead_id, title, value, sale_type, contract_months, status, ... }",
    ],
  },
  campaigns: {
    title: "Campanhas Meta WhatsApp",
    description: "Campanhas com métricas de envio (sent, delivered, failed, reply_rate).",
    sampleFields: [
      "items[].id / name / status / total_recipients",
      "items[].sent / delivered / read / replied / failed / reply_rate",
      "items[].started_at / completed_at / scheduled_at",
      "meta.total / page / size",
    ],
  },
  meta: {
    title: "Métricas Agregadas Meta",
    description: "Depende de campaigns. Totais agregados no período.",
    sampleFields: [
      "campaigns_total / sent / delivered / read / replied / failed / reply_rate",
    ],
  },
};

export default function DeveloperCenter() {
  const stableProviders = PROVIDER_DOCS.filter(p => p.status === "stable");

  const curlContext = `curl -X POST '${CONTEXT_URL}' \\
  -H 'apikey: <WIIZE_INTEGRATION_ANON_KEY>' \\
  -H 'Authorization: Bearer <USER_JWT>' \\
  -H 'x-integration-client-id: <WIIZE_INTEGRATION_CLIENT_ID>' \\
  -H 'x-integration-client-secret: <WIIZE_INTEGRATION_CLIENT_SECRET>' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "version": "v1",
    "modules": ["cockpit", "crm", "opportunities", "finance"],
    "filters": {
      "period": { "from": "2026-06-01T00:00:00Z", "to": "2026-06-30T23:59:59Z" },
      "pagination": { "page": 1, "size": 50 }
    }
  }'`;

  const curlProvider = `curl -X POST '${PROVIDER_URL}' \\
  -H 'apikey: <WIIZE_INTEGRATION_ANON_KEY>' \\
  -H 'Authorization: Bearer <USER_JWT>' \\
  -H 'x-integration-client-id: <WIIZE_INTEGRATION_CLIENT_ID>' \\
  -H 'x-integration-client-secret: <WIIZE_INTEGRATION_CLIENT_SECRET>' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "provider": "cockpit",
    "filters": { "period": { "from": "2026-06-01", "to": "2026-06-30" } }
  }'`;

  const tsClient = `// TypeScript / Node
type Env = {
  WIIZE_INTEGRATION_ANON_KEY: string;
  WIIZE_INTEGRATION_CLIENT_ID: string;
  WIIZE_INTEGRATION_CLIENT_SECRET: string;
};

export async function wiizeContext(env: Env, userJwt: string, body: {
  modules: string[];
  filters?: {
    period?: { from: string; to: string };
    pagination?: { page: number; size: number };
    stage_id?: string;
    campaign_id?: string;
    sort?: string;
  };
}) {
  const res = await fetch("${CONTEXT_URL}", {
    method: "POST",
    headers: {
      "apikey": env.WIIZE_INTEGRATION_ANON_KEY,
      "Authorization": \`Bearer \${userJwt}\`,
      "x-integration-client-id": env.WIIZE_INTEGRATION_CLIENT_ID,
      "x-integration-client-secret": env.WIIZE_INTEGRATION_CLIENT_SECRET,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ version: "v1", ...body }),
  });
  if (!res.ok) throw new Error(\`Wiize \${res.status}: \${await res.text()}\`);
  return res.json();
}

// Uso
const ctx = await wiizeContext(env, jwt, {
  modules: ["cockpit", "opportunities", "finance"],
  filters: { period: { from: "2026-06-01", to: "2026-06-30" } },
});
console.log(ctx.context.cockpit.data.receita_potencial.total);   // BRL
console.log(ctx.context.finance.data.summary.mrr_ativo);         // BRL/mês
console.log(ctx.context.opportunities.data.breakdowns.by_city);`;

  const pyClient = `# Python
import os, requests

BASE = "${BASE_URL}"

def wiize_context(user_jwt: str, modules: list[str], period: tuple[str, str] | None = None, **filters):
    headers = {
        "apikey": os.environ["WIIZE_INTEGRATION_ANON_KEY"],
        "Authorization": f"Bearer {user_jwt}",
        "x-integration-client-id": os.environ["WIIZE_INTEGRATION_CLIENT_ID"],
        "x-integration-client-secret": os.environ["WIIZE_INTEGRATION_CLIENT_SECRET"],
        "Content-Type": "application/json",
    }
    f = dict(filters)
    if period:
        f["period"] = {"from": period[0], "to": period[1]}
    r = requests.post(f"{BASE}/integration-v1-context", headers=headers, json={
        "version": "v1", "modules": modules, "filters": f,
    })
    r.raise_for_status()
    return r.json()

ctx = wiize_context(jwt, ["cockpit", "opportunities", "finance"],
                    period=("2026-06-01", "2026-06-30"))
print(ctx["context"]["cockpit"]["data"]["receita_potencial"]["total"])`;

  const jwtLogin = `// Obtenção do USER_JWT via Supabase Auth (uma vez, cacheado até expirar)
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "${BASE_URL.replace("/functions/v1", "")}",
  process.env.WIIZE_INTEGRATION_ANON_KEY!,
);

const { data, error } = await supabase.auth.signInWithPassword({
  email: "user@empresa.com.br",
  password: "***",
});
if (error) throw error;

const userJwt = data.session!.access_token;      // usar no header Authorization
const refresh = data.session!.refresh_token;     // usar para refresh antes de expirar
const expiresAt = data.session!.expires_at;      // timestamp UNIX

// Refresh quando faltarem <60s para expirar:
const { data: r } = await supabase.auth.refreshSession({ refresh_token: refresh });
const newJwt = r.session!.access_token;`;

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-24">
      {/* HERO */}
      <div className="space-y-4 border-b border-border/60 pb-8">
        <Badge variant="outline" className="text-xs">Integration Layer v1 • Documentação Oficial</Badge>
        <h1 className="text-4xl font-bold tracking-tight">Wiize Developer Center</h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Guia único e completo para conectar qualquer aplicação (ex.: Wian AI) à Wiize.
          A Wiize é a fonte oficial de verdade — nunca acesse o banco diretamente.
        </p>
        <Alert>
          <ShieldCheck className="w-4 h-4" />
          <AlertTitle>Página pública</AlertTitle>
          <AlertDescription>
            Este guia não requer login e pode ser compartilhado com desenvolvedores externos.
            As requisições reais exigem 4 credenciais (client id/secret + anon key + JWT de usuário).
          </AlertDescription>
        </Alert>
      </div>

      {/* SUMÁRIO */}
      <nav className="rounded-xl border border-border/60 bg-muted/30 p-6">
        <div className="text-xs uppercase text-muted-foreground mb-3">Sumário</div>
        <ol className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {[
            ["quickstart", "1. Quickstart"],
            ["auth", "2. Autenticação (2 camadas)"],
            ["endpoints", "3. Endpoints"],
            ["filters", "4. Filtros (período, paginação, sort)"],
            ["response", "5. Envelope de resposta"],
            ["providers", "6. Providers & DTOs"],
            ["examples", "7. Exemplos por card do dashboard"],
            ["errors", "8. Erros"],
            ["rate-limits", "9. Rate limits & Cache"],
            ["best-practices", "10. Boas práticas"],
          ].map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="text-primary hover:underline">{label}</a>
            </li>
          ))}
        </ol>
      </nav>

      {/* 1. QUICKSTART */}
      <Section id="quickstart" icon={Zap} title="1. Quickstart">
        <Card><CardContent className="pt-6 space-y-3">
          <p className="text-sm">Você precisa de <strong>4 credenciais</strong>:</p>
          <ul className="text-sm space-y-1 pl-5 list-disc text-muted-foreground">
            <li><code className="text-foreground">WIIZE_INTEGRATION_ANON_KEY</code> — chave pública do projeto Wiize (header <code>apikey</code>)</li>
            <li><code className="text-foreground">WIIZE_INTEGRATION_CLIENT_ID</code> — identificador do app consumidor</li>
            <li><code className="text-foreground">WIIZE_INTEGRATION_CLIENT_SECRET</code> — secret do app consumidor</li>
            <li><code className="text-foreground">USER_JWT</code> — access_token do usuário Wiize logado (via Supabase Auth)</li>
          </ul>
          <p className="text-sm">Chamada mínima para o endpoint orquestrador:</p>
          <CodeBlock lang="bash" code={curlContext} />
        </CardContent></Card>
      </Section>

      {/* 2. AUTH */}
      <Section id="auth" icon={ShieldCheck} title="2. Autenticação">
        <Card><CardContent className="pt-6 space-y-4 text-sm">
          <p>A Integration Layer usa <strong>2 camadas obrigatórias</strong> em toda chamada:</p>
          <div className="rounded-lg border border-border/60 p-4 space-y-2">
            <div className="font-semibold">Camada 1 — App Consumidor (Client Credentials)</div>
            <p className="text-muted-foreground">Identifica QUAL aplicação está chamando.</p>
            <ul className="pl-5 list-disc text-muted-foreground">
              <li><code>x-integration-client-id</code></li>
              <li><code>x-integration-client-secret</code></li>
            </ul>
          </div>
          <div className="rounded-lg border border-border/60 p-4 space-y-2">
            <div className="font-semibold">Camada 2 — Usuário Wiize (Supabase JWT)</div>
            <p className="text-muted-foreground">Identifica QUAL empresa/conta está sendo consultada. O <code>company_id</code> é derivado do JWT (nunca aceito no body).</p>
            <ul className="pl-5 list-disc text-muted-foreground">
              <li><code>apikey</code>: WIIZE_INTEGRATION_ANON_KEY</li>
              <li><code>Authorization: Bearer USER_JWT</code></li>
            </ul>
          </div>
          <p className="font-semibold pt-2">Como obter o USER_JWT:</p>
          <CodeBlock lang="typescript" code={jwtLogin} />
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              Faça <strong>refresh</strong> do JWT ~60s antes do <code>expires_at</code>.
              Nunca envie o CLIENT_SECRET a partir do browser — mantenha-o em backend/edge.
            </AlertDescription>
          </Alert>
        </CardContent></Card>
      </Section>

      {/* 3. ENDPOINTS */}
      <Section id="endpoints" icon={Layers} title="3. Endpoints">
        <Card><CardContent className="pt-6 space-y-4 text-sm">
          <div className="space-y-2">
            <Badge>POST</Badge>
            <div className="font-mono text-xs break-all">{CONTEXT_URL}</div>
            <p className="text-muted-foreground">
              <strong>Orquestrador.</strong> Recebe uma lista de <code>modules</code> e executa todos os providers em paralelo,
              retornando um único payload consolidado. Ideal para "carregar tudo de uma vez".
            </p>
          </div>
          <hr className="border-border/60" />
          <div className="space-y-2">
            <Badge>POST</Badge>
            <div className="font-mono text-xs break-all">{PROVIDER_URL}</div>
            <p className="text-muted-foreground">
              <strong>Provider único.</strong> Executa apenas um provider por chamada — indicado no body como <code>{"{ \"provider\": \"cockpit\" }"}</code>.
              Rate-limit mais generoso (120/min vs 60/min do orquestrador).
            </p>
          </div>
        </CardContent></Card>
        <CodeBlock lang="bash" code={curlProvider} />
      </Section>

      {/* 4. FILTROS */}
      <Section id="filters" icon={Filter} title="4. Filtros">
        <Card><CardContent className="pt-6 space-y-4 text-sm">
          <p>Todos os filtros vão em <code>body.filters</code>. Regras:</p>
          <div className="space-y-3">
            {FILTER_DOCS.map(f => (
              <div key={f.name} className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-sm font-semibold">{f.name}</code>
                  <Badge variant="outline" className="text-[10px]">{f.type}</Badge>
                  <span className="text-[10px] text-muted-foreground">{f.format}</span>
                </div>
                <p className="text-muted-foreground text-xs">Aplica-se a: {f.applies_to.join(", ")}</p>
                {f.example && <div className="mt-2"><CodeBlock code={f.example} /></div>}
              </div>
            ))}
          </div>
          <Alert>
            <AlertDescription>
              <strong>Período:</strong> use ISO 8601 (<code>2026-06-01T00:00:00Z</code>). Ausente ⇒ <em>histórico total</em> da conta.<br />
              <strong>Paginação:</strong> <code>page</code> começa em 1, <code>size</code> máx 200.<br />
              <strong>Sort:</strong> string <code>campo:asc|desc</code>. Ex.: <code>ai_score:desc</code>.
            </AlertDescription>
          </Alert>
        </CardContent></Card>
      </Section>

      {/* 5. RESPONSE */}
      <Section id="response" icon={Code2} title="5. Envelope de resposta">
        <CodeBlock lang="json" code={`{
  "success": true,
  "request_id": "uuid",
  "company_id": "uuid",
  "version": "v1",
  "processing_time_ms": 187,
  "cache": { "hit": false, "ttl_s": 60 },
  "filters_applied": { "period": {...}, "pagination": {...} },
  "context": {
    "cockpit":       { "data": { ... }, "metadata": { ... } },
    "opportunities": { "data": { ... }, "metadata": { ... } }
  },
  "errors": []
}`} />
        <p className="text-sm text-muted-foreground">
          Cada provider vive dentro de <code>context.&lt;name&gt;.data</code>. Erros de providers individuais
          aparecem em <code>errors[]</code> sem quebrar a resposta global.
        </p>
      </Section>

      {/* 6. PROVIDERS */}
      <Section id="providers" icon={Package} title="6. Providers & DTOs">
        <p className="text-sm text-muted-foreground">
          {stableProviders.length} providers estáveis disponíveis. Cada um retorna dados dentro de <code>context.&lt;name&gt;.data</code>.
        </p>
        <div className="space-y-4">
          {stableProviders.map(p => {
            const m = PROVIDER_METRICS[p.key];
            return (
              <Card key={p.key}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <code className="text-primary">{p.key}</code>
                      {m && <span className="text-sm text-muted-foreground font-normal">— {m.title}</span>}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">v{p.version}</Badge>
                      <Badge variant="outline" className="text-[10px]">plano: {p.minimum_plan}</Badge>
                      <Badge variant="outline" className="text-[10px]">cache {p.default_cache_ttl}s</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">{m?.description ?? p.description}</p>
                  <div>
                    <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Filtros suportados</div>
                    <div className="flex flex-wrap gap-1">
                      {p.filters.length ? p.filters.map(f => <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>) : <span className="text-xs text-muted-foreground">nenhum</span>}
                    </div>
                  </div>
                  {p.dependencies.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Dependências</div>
                      <div className="flex flex-wrap gap-1">
                        {p.dependencies.map(d => <Badge key={d} variant="outline" className="text-[10px]">{d}</Badge>)}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Campos principais</div>
                    <ul className="text-xs font-mono space-y-1 bg-muted/40 rounded p-3 border border-border/40">
                      {(m?.sampleFields ?? p.dto_fields.map(f => `${f.field}: ${f.type}${f.note ? "  — " + f.note : ""}`)).map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </Section>

      {/* 7. EXAMPLES */}
      <Section id="examples" icon={BookOpen} title="7. Exemplos por card do dashboard">
        <Card><CardContent className="pt-6 space-y-3 text-sm">
          <p>Cada card do dashboard Wiize é servido por um caminho específico do payload. Use a coluna direita como referência de acesso:</p>
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2">Card</th>
                  <th className="text-left p-2">Provider</th>
                  <th className="text-left p-2">Caminho no payload</th>
                </tr>
              </thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-border/40">
                {[
                  ["Receita Potencial Atual", "cockpit", "context.cockpit.data.receita_potencial.total"],
                  ["Leads Quentes Hoje", "cockpit", "context.cockpit.data.leads_quentes_hoje"],
                  ["Gargalo Atual / Health", "cockpit", "context.cockpit.data.gargalo"],
                  ["IA Economizou (min)", "cockpit", "context.cockpit.data.ia_economizou_min"],
                  ["Forecast 30 dias", "cockpit", "context.cockpit.data.forecast"],
                  ["Funil Operacional", "cockpit", "context.cockpit.data.funil_operacional[]"],
                  ["Radar de Oportunidades", "cockpit", "context.cockpit.data.radar[]"],
                  ["Alertas Executivos", "cockpit", "context.cockpit.data.alertas[]"],
                  ["MRR / Receita Total", "finance", "context.finance.data.summary.mrr_ativo / receita_total"],
                  ["Projeção 12 meses", "finance", "context.finance.data.summary.projecao_12_meses"],
                  ["Vendas ativas", "finance", "context.finance.data.summary.vendas_ativas"],
                  ["Oportunidades por Categoria", "opportunities", "context.opportunities.data.breakdowns.by_category"],
                  ["Oportunidades por Cidade", "opportunities", "context.opportunities.data.breakdowns.by_city"],
                  ["Oportunidades por Rating", "opportunities", "context.opportunities.data.breakdowns.by_rating"],
                  ["Índice de Fechamento", "opportunities", "context.opportunities.data.breakdowns.by_closing_probability"],
                  ["Score por Bucket", "opportunities", "context.opportunities.data.breakdowns.by_score_bucket"],
                  ["Kanban do Pipeline", "pipeline", "context.pipeline.data.items[]"],
                  ["Valor Total em Negociação", "crm", "context.crm.data.summary.valor_total_negociacao"],
                  ["Taxa de Conversão", "crm", "context.crm.data.summary.taxa_conversao"],
                  ["Lista de Leads (paginada)", "crm", "context.crm.data.items[]"],
                  ["Campanhas WhatsApp", "campaigns", "context.campaigns.data.items[]"],
                  ["Meta agregada", "meta", "context.meta.data (sent/delivered/replied/reply_rate)"],
                ].map(([card, prov, path], i) => (
                  <tr key={i} className="hover:bg-muted/30">
                    <td className="p-2">{card}</td>
                    <td className="p-2"><Badge variant="outline" className="text-[10px]">{prov}</Badge></td>
                    <td className="p-2 font-mono text-[11px]">{path}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-base">Cliente TypeScript reutilizável</CardTitle></CardHeader>
          <CardContent><CodeBlock lang="typescript" code={tsClient} /></CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="text-base">Cliente Python</CardTitle></CardHeader>
          <CardContent><CodeBlock lang="python" code={pyClient} /></CardContent>
        </Card>
      </Section>

      {/* 8. ERRORS */}
      <Section id="errors" icon={AlertTriangle} title="8. Erros">
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr><th className="text-left p-2">Código</th><th className="text-left p-2">HTTP</th><th className="text-left p-2">Descrição</th></tr>
            </thead>
            <tbody className="[&>tr]:border-t [&>tr]:border-border/40">
              {ERROR_DOCS.map(e => (
                <tr key={e.code}>
                  <td className="p-2 font-mono">{e.code}</td>
                  <td className="p-2"><Badge variant="outline" className="text-[10px]">{e.status}</Badge></td>
                  <td className="p-2 text-muted-foreground">{e.meaning} <span className="text-foreground/80">— {e.action}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* 9. RATE / CACHE */}
      <Section id="rate-limits" icon={Timer} title="9. Rate limits & Cache">
        <Card><CardContent className="pt-6 space-y-3 text-sm">
          <ul className="pl-5 list-disc space-y-1">
            <li><strong>/integration-v1-context</strong>: 60 requisições / minuto por (client_id, user_id).</li>
            <li><strong>/integration-v1-provider</strong>: 120 requisições / minuto por (client_id, user_id, provider).</li>
            <li>Ao estourar → HTTP 429 com <code>retry_after_s</code> no body.</li>
          </ul>
          <p className="pt-2"><strong>Cache:</strong> cada provider define seu TTL (30-300s). Para forçar bypass:</p>
          <CodeBlock code={`-H 'x-integration-cache-bypass: true'`} />
        </CardContent></Card>
      </Section>

      {/* 10. BEST PRACTICES */}
      <Section id="best-practices" icon={ShieldCheck} title="10. Boas práticas">
        <Card><CardContent className="pt-6 text-sm space-y-3">
          <ul className="pl-5 list-disc space-y-2">
            <li>Prefira o <strong>endpoint orquestrador</strong> quando precisar de múltiplos providers na mesma tela — evita rate-limit em cascata.</li>
            <li>Sempre envie <code>period</code> quando estiver mostrando métricas "do mês" — sem período retorna histórico total.</li>
            <li>Use <code>x-request-id</code> próprio (UUID) para correlacionar logs em auditoria.</li>
            <li>Cacheie <code>USER_JWT</code> localmente e faça refresh antes de <code>expires_at</code>.</li>
            <li>Nunca invente valores monetários — se o campo vier ausente/zero, reporte "sem dados" ao usuário final.</li>
            <li>Todos os valores em BRL. Volumes de leads/mensagens em inteiros.</li>
          </ul>
        </CardContent></Card>
      </Section>

      <div className="pt-8 border-t border-border/60 text-xs text-muted-foreground text-center">
        Wiize Integration Layer v1 • Última atualização: {new Date().toISOString().slice(0, 10)}
      </div>
    </div>
  );
}
