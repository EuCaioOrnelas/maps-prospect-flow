// AI Integration Guide — documentação escrita PARA LLMs (Claude, GPT, Gemini, Meta Llama)
// consumirem a Wiize Integration API. Estilo direto, sem marketing, com contratos,
// exemplos executáveis e regras de segurança. Colar esta página como system prompt
// já é suficiente para uma IA integrar corretamente.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Bot, BookOpen, ShieldCheck, Zap, AlertTriangle } from "lucide-react";
import { CodeBlock } from "../components/CodeBlock";

const BASE_URL = "https://lqfqnqfeuneorxocybru.supabase.co/functions/v1";

export default function AiGuide() {
  const systemPrompt = `Você é um agente conectado à Wiize Integration API v1.
Nunca invente campos. Nunca acesse tabelas diretamente. Toda leitura de dados
do usuário passa pelos endpoints abaixo. Se um campo não existir na resposta,
diga "dado indisponível" — não estime.

BASE_URL = ${BASE_URL}
AUTENTICAÇÃO = Client Credentials (client_id + client_secret) + JWT do usuário
FORMATO = JSON, UTF-8
IDIOMA DAS RESPOSTAS = pt-BR
UNIDADE MONETÁRIA = BRL (real)`;

  const contextCurl = `curl -X POST "${BASE_URL}/integration-v1-context" \\
  -H "content-type: application/json" \\
  -H "x-client-id: $WIIZE_CLIENT_ID" \\
  -H "x-client-secret: $WIIZE_CLIENT_SECRET" \\
  -H "x-user-jwt: $USER_JWT" \\
  -H "x-correlation-id: $(uuidgen)" \\
  -d '{
    "modules": ["cockpit", "crm", "finance"],
    "period": "last_30_days"
  }'`;

  const providerCurl = `curl -X POST "${BASE_URL}/integration-v1-provider" \\
  -H "content-type: application/json" \\
  -H "x-client-id: $WIIZE_CLIENT_ID" \\
  -H "x-client-secret: $WIIZE_CLIENT_SECRET" \\
  -H "x-user-jwt: $USER_JWT" \\
  -H "x-provider-name: cockpit" \\
  -H "x-idempotency-key: $(uuidgen)" \\
  -d '{ "period": "last_30_days" }'`;

  const tsClient = `// Cliente TypeScript mínimo para uma IA orquestradora consumir a Wiize.
// Roda em Deno/Node 18+. Não faz cache — deixa a IA decidir quando revalidar.
const BASE_URL = "${BASE_URL}";

type WiizeAuth = {
  clientId: string;
  clientSecret: string;
  userJwt: string; // JWT do usuário final da Wiize (obrigatório em toda chamada)
};

export async function wiizeContext(
  auth: WiizeAuth,
  modules: string[],
  period: "today" | "last_7_days" | "last_30_days" | "last_90_days" = "last_30_days",
) {
  const res = await fetch(\`\${BASE_URL}/integration-v1-context\`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-client-id": auth.clientId,
      "x-client-secret": auth.clientSecret,
      "x-user-jwt": auth.userJwt,
      "x-correlation-id": crypto.randomUUID(),
    },
    body: JSON.stringify({ modules, period }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(\`Wiize \${res.status} \${err.code ?? ""}: \${err.message ?? res.statusText}\`);
  }
  return res.json();
}`;

  const responseShape = `{
  "success": true,
  "request_id": "req_9f2b...",
  "correlation_id": "3a1c...",
  "processing_time_ms": 142,
  "cache_hit": false,
  "data": {
    "cockpit": {
      "receita_gerada_em_oportunidades_brl": 2443.00,
      "tcv_assinado_no_periodo_brl": 61692.00,
      "leads_ativos": 128,
      "conversao_percent": 4.7
    },
    "crm": {
      "pipeline_total_brl": 189320.00,
      "por_estagio": [
        { "estagio": "prospectado", "quantidade": 42, "valor_brl": 21000 },
        { "estagio": "em_negociacao", "quantidade": 11, "valor_brl": 76500 }
      ]
    }
  }
}`;

  const toolSchema = `{
  "name": "wiize_context",
  "description": "Lê métricas reais do usuário na Wiize (cockpit comercial, CRM, financeiro). Use SEMPRE que a pergunta envolver números, leads, pipeline, receita, conversão ou atividades do usuário. Nunca invente valores.",
  "input_schema": {
    "type": "object",
    "properties": {
      "modules": {
        "type": "array",
        "items": { "enum": ["cockpit", "crm", "finance", "pipeline"] },
        "description": "Domínios a carregar. Peça só o que precisa."
      },
      "period": {
        "enum": ["today", "last_7_days", "last_30_days", "last_90_days"],
        "default": "last_30_days"
      }
    },
    "required": ["modules"]
  }
}`;

  const errorTable: Array<[string, string, string]> = [
    ["400", "VALIDATION_ERROR", "Body ou headers malformados. Não retente sem corrigir."],
    ["401", "AUTH_INVALID_CLIENT", "client_id/secret errados. Peça ao usuário para revalidar credenciais."],
    ["401", "AUTH_INVALID_JWT", "JWT do usuário expirado. Solicite novo login."],
    ["403", "SCOPE_DENIED", "Cliente não tem escopo para esse provider. Não retente."],
    ["409", "IDEMPOTENCY_CONFLICT", "Mesma idempotency-key com payload diferente. Gere nova key."],
    ["429", "RATE_LIMITED", "Respeite Retry-After. Faça backoff, não paralelize."],
    ["503", "CIRCUIT_OPEN", "Provider degradado. Aguarde e reduza frequência."],
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
            Documentação escrita para modelos (Claude, GPT, Gemini, Meta Llama) integrarem a Wiize API sem alucinar.
          </p>
        </div>
      </div>

      <Alert>
        <BookOpen className="h-4 w-4" />
        <AlertTitle>Como usar esta página</AlertTitle>
        <AlertDescription>
          Copie o bloco <strong>System Prompt</strong> abaixo direto para o system message do seu agente.
          Ele já contém as regras mínimas para o modelo consumir a Wiize corretamente. Depois, registre
          o <strong>tool schema</strong> como function/tool na sua orquestração.
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

      {/* 2. Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Badge variant="secondary">2</Badge> Endpoints disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="mb-1 font-medium text-foreground">POST /integration-v1-context</p>
            <p className="text-muted-foreground">
              Retorna múltiplos domínios em uma chamada. Use quando o modelo precisa de contexto amplo
              (ex: “resumo do meu comercial esta semana”). Aceita <code>modules</code> e <code>period</code>.
            </p>
          </div>
          <div>
            <p className="mb-1 font-medium text-foreground">POST /integration-v1-provider</p>
            <p className="text-muted-foreground">
              Executa apenas um provider (via header <code>x-provider-name</code> ou <code>body.provider</code>).
              Use para chamadas focadas — reduz latência e custo.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Providers atuais: <code>cockpit</code>, <code>crm</code>, <code>pipeline</code>, <code>finance</code>.
          </p>
        </CardContent>
      </Card>

      {/* 3. Curl */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Badge variant="secondary">3</Badge> Exemplo — context (curl)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock lang="bash" code={contextCurl} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Badge variant="secondary">4</Badge> Exemplo — provider único (curl)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock lang="bash" code={providerCurl} />
        </CardContent>
      </Card>

      {/* 5. TS client */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Badge variant="secondary">5</Badge> Cliente TypeScript mínimo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock lang="typescript" code={tsClient} />
        </CardContent>
      </Card>

      {/* 6. Response shape */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Badge variant="secondary">6</Badge> Formato de resposta (contrato)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Todas as respostas de sucesso seguem este envelope. <strong>Nunca</strong> derive campos
            que não estão presentes. Valores monetários são em BRL. Percentuais são 0–100.
          </p>
          <CodeBlock lang="json" code={responseShape} />
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Regra crítica para o modelo</AlertTitle>
            <AlertDescription>
              <code>receita_gerada_em_oportunidades_brl</code> é a receita real fechada.
              <code> tcv_assinado_no_periodo_brl</code> é valor de contrato total (não confundir com receita).
              Quando o usuário perguntar “quanto meu comercial gerou”, use o primeiro.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* 7. Tool schema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Badge variant="secondary">7</Badge> Tool / Function schema (Claude · GPT · Gemini)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Registre este schema como tool. Serve tal e qual para Anthropic (tools), OpenAI (function calling)
            e Google (function declarations). Meta Llama consome o mesmo shape via wrapper compatível com OpenAI.
          </p>
          <CodeBlock lang="json" code={toolSchema} />
        </CardContent>
      </Card>

      {/* 8. Segurança */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Segurança que a IA precisa respeitar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Nunca logue, imprima ou devolva <code>x-client-secret</code> nem <code>x-user-jwt</code>.</p>
          <p>• Sempre gere um <code>x-correlation-id</code> por request (UUID v4) para rastreio.</p>
          <p>• Use <code>x-idempotency-key</code> em qualquer chamada que possa ser retentada.</p>
          <p>• Se receber <code>429</code>, respeite o header <code>Retry-After</code> antes de tentar de novo.</p>
          <p>• Rotas HMAC opcionais estão descritas na página <strong>Assinatura HMAC</strong>.</p>
        </CardContent>
      </Card>

      {/* 9. Rate limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-amber-500" /> Rate limits que o agente deve conhecer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• 300 req/min por IP.</p>
          <p>• 60 req/min por usuário no endpoint <code>/context</code>.</p>
          <p>• 120 req/min por usuário/provider no endpoint <code>/provider</code>.</p>
          <p>• Circuit breaker abre em <code>503 CIRCUIT_OPEN</code> — não paralelize retries.</p>
        </CardContent>
      </Card>

      {/* 10. Erros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Catálogo de erros (para o modelo interpretar)</CardTitle>
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
