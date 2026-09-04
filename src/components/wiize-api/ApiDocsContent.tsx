import { useState } from "react";
import { Bot, FileDown, FileJson, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { CodeBlock } from "@/pages/admin/integration/components/CodeBlock";
import { useTheme } from "@/contexts/ThemeContext";

const sections = [
  { id: "intro", label: "Introdução" },
  { id: "ai", label: "Para IAs / LLMs" },
  { id: "auth", label: "Autenticação" },
  { id: "quickstart", label: "Primeira requisição" },
  { id: "tokens", label: "Wiize Tokens" },
  { id: "endpoints", label: "Endpoints" },
  { id: "idempotency", label: "Idempotência" },
  { id: "errors", label: "Erros" },
  { id: "limits", label: "Limites de uso" },
  { id: "fair-use", label: "Uso justo e bloqueios" },
];

const authSample = `curl -X POST https://api.wiize.com.br/v1/prospecting/analyze \\
  -H "Authorization: Bearer wk_live_sua_chave" \\
  -H "Content-Type: application/json" \\
  -d '{ "company": { "name": "Empresa Exemplo" } }'`;

const quickSample = `curl -X POST https://api.wiize.com.br/v1/prospecting/analyze \\
  -H "Authorization: Bearer wk_live_sua_chave" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: 8f2a1c34" \\
  -d '{
    "company": {
      "name": "Padaria Bella Paulista",
      "city": "São Paulo",
      "category": "Padaria",
      "website": "https://padariabellapaulista.com.br",
      "rating": 4.5,
      "review_count": 56846
    }
  }'`;

const quickResponse = `{
  "data": {
    "company_name": "Padaria Bella Paulista",
    "opportunity_score": 72,
    "opportunity_level": "Alta",
    "close_probability": "Moderada",
    "diagnosis": "...",
    "recommended_action": "...",
    "score_breakdown": { "estrutura_digital": 12, "reputacao": 18 },
    "strengths": ["..."],
    "weaknesses": ["..."]
  },
  "usage": {
    "operation": "prospecting.analyze",
    "tokens_charged": 5,
    "cost_brl": 0.05,
    "balance_tokens": 4995
  },
  "request_id": "95fd8879-873d-4044-86c7-bef6a37751ff"
}`;

const searchSample = `POST /v1/prospecting/search
{
  "query": "padaria",
  "location": "São Paulo, SP",
  "limit": 20
}`;

const approachSample = `POST /v1/prospecting/approach
{
  "company": {
    "name": "Padaria Bella Paulista",
    "city": "São Paulo",
    "website": "https://padariabellapaulista.com.br",
    "score": 72,
    "diagnosis": "Sem cardápio digital próprio."
  }
}`;

const errorSample = `{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Saldo insuficiente. Adicione créditos para continuar usando a API.",
    "request_id": "3341f379-1c62-45dd-af79-7baf3f6446d3",
    "details": { "required_tokens": 5, "available_tokens": 2 }
  }
}`;

const headersSample = `X-RateLimit-Limit: 60
X-RateLimit-Remaining: 57
X-RateLimit-Reset: 1788478920
X-RateLimit-Burst-Limit: 20
X-RateLimit-Daily-Limit: 10000
X-RateLimit-Daily-Remaining: 9992
Retry-After: 27          # apenas em respostas 429/403`;

const aiPromptSample = `Leia https://wiize.com.br/wiize-api-llms-full.txt e implemente
um cliente da Wiize API em Node.js que:
1. busque empresas com /v1/prospecting/search
2. analise cada uma com /v1/prospecting/analyze
3. gere a abordagem com /v1/prospecting/approach
Respeite rate limit, Idempotency-Key e trate os códigos de erro.`;

const AI_FILES = [
  {
    href: "/llms.txt",
    icon: Bot,
    title: "llms.txt",
    desc: "Índice curto no padrão llms.txt, para o agente descobrir os recursos.",
  },
  {
    href: "/wiize-api-llms-full.txt",
    icon: FileText,
    title: "wiize-api-llms-full.txt",
    desc: "Documentação completa em Markdown puro — cole inteira no contexto da IA.",
  },
  {
    href: "/wiize-api-openapi.json",
    icon: FileJson,
    title: "wiize-api-openapi.json",
    desc: "Especificação OpenAPI 3.1 para gerar SDKs, tools e clientes automaticamente.",
  },
  {
    href: "/wiize-api-documentacao.pdf",
    icon: FileDown,
    title: "documentacao.pdf",
    desc: "Mesma referência em PDF, para anexar em times, propostas ou no seu assistente.",
  },
];

function Doc({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-border/70 pb-10 last:border-0">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-4 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function Row({ cells, head = false }: { cells: string[]; head?: boolean }) {
  return (
    <tr className="border-b border-border/60 last:border-0">
      {cells.map((c, i) => (
        <td
          key={i}
          className={cn(
            "px-3 py-2 align-top",
            head ? "text-xs font-semibold uppercase tracking-wide text-foreground" : "text-sm",
            i === 0 && !head && "font-mono text-xs text-foreground",
          )}
        >
          {c}
        </td>
      ))}
    </tr>
  );
}

/** Conteúdo da documentação da Wiize API — usado na área logada e na página pública. */
export function ApiDocsContent() {
  const [active, setActive] = useState("intro");
  const { resolvedTheme } = useTheme();
  const codeTheme = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <div className="flex gap-8">
      <nav className="sticky top-24 hidden h-fit w-52 shrink-0 space-y-0.5 xl:block">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={() => setActive(s.id)}
            className={cn(
              "block rounded-md px-3 py-1.5 text-sm transition-colors",
              active === s.id
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {s.label}
          </a>
        ))}
      </nav>

      <div className="min-w-0 flex-1 space-y-10">
        <Doc id="intro" title="Introdução">
          <p>
            A Wiize API entrega inteligência comercial pronta para uso: encontrar empresas, analisar
            oportunidades e gerar abordagens. Não existe mensalidade — você adiciona saldo e consome
            conforme a necessidade, em Wiize Tokens.
          </p>
          <p className="font-mono text-xs text-foreground">Base URL: https://api.wiize.com.br/v1</p>
          <p>
            Todas as requisições usam <code>POST</code> com corpo JSON (máximo de 32 KB) e devolvem um
            envelope com <code>data</code>, <code>usage</code> e <code>request_id</code>. Informe o{" "}
            <code>request_id</code> ao acionar o suporte.
          </p>
        </Doc>

        <Doc id="ai" title="Para IAs / LLMs">
          <p>
            Quer que o ChatGPT, Claude, Cursor ou qualquer agente escreva a integração por você? Toda a
            documentação está disponível em formatos legíveis por máquina, sem login:
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {AI_FILES.map((f) => (
              <a
                key={f.href}
                href={f.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <f.icon className="h-4 w-4 text-primary" />
                <p className="mt-2 font-mono text-xs font-medium text-foreground">{f.title}</p>
                <p className="mt-1 text-xs leading-relaxed">{f.desc}</p>
              </a>
            ))}
          </div>
          <p>Exemplo de prompt para colar no seu assistente:</p>
          <CodeBlock code={aiPromptSample} lang="bash" filename="prompt.txt" theme={codeTheme} />
        </Doc>

        <Doc id="auth" title="Autenticação">
          <p>
            Toda requisição exige uma API Key no cabeçalho <code>Authorization: Bearer</code> (ou{" "}
            <code>x-wiize-api-key</code>). Chaves de produção começam com <code>wk_live_</code> e as de
            teste com <code>wk_test_</code>. O segredo é exibido uma única vez na criação — guarde-o em
            local seguro.
          </p>
          <p>
            Por segurança, chaves enviadas por query string são rejeitadas com <code>400</code>. Nunca
            exponha a chave no frontend: chame a Wiize API a partir do seu servidor.
          </p>
          <CodeBlock code={authSample} lang="bash" theme={codeTheme} />
        </Doc>

        <Doc id="quickstart" title="Primeira requisição">
          <p>Analise uma empresa e receba score, diagnóstico e recomendação em uma única chamada.</p>
          <div className="grid gap-4 lg:grid-cols-2">
            <CodeBlock code={quickSample} lang="bash" filename="request.sh" theme={codeTheme} />
            <CodeBlock code={quickResponse} lang="json" filename="response.json" theme={codeTheme} />
          </div>
        </Doc>

        <Doc id="tokens" title="Wiize Tokens">
          <p>
            O consumo é medido em Wiize Tokens. <strong className="text-foreground">1 token = R$ 0,01</strong>, debitado
            do saldo somente quando a operação é concluída com sucesso. Erros de autenticação, validação,
            limite de uso, saldo insuficiente ou falha do nosso lado não consomem tokens.
          </p>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full">
              <tbody>
                <Row head cells={["Operação", "Endpoint", "Custo"]} />
                <Row cells={["Buscar empresas", "/v1/prospecting/search", "9 tokens (R$ 0,09)"]} />
                <Row cells={["Analisar + diagnosticar", "/v1/prospecting/analyze", "5 tokens (R$ 0,05)"]} />
                <Row cells={["Gerar abordagem", "/v1/prospecting/approach", "4 tokens (R$ 0,04)"]} />
              </tbody>
            </table>
          </div>
          <p>
            Os tokens são reservados antes da execução e efetivados no fim. Se a operação falhar, a reserva
            é devolvida automaticamente ao seu saldo.
          </p>
        </Doc>

        <Doc id="endpoints" title="Endpoints">
          <div className="space-y-4">
            <div>
              <p className="font-medium text-foreground">POST /v1/prospecting/search</p>
              <p>
                Encontra empresas reais por termo e localização. Campos: <code>query</code> (2–120
                caracteres), <code>location</code> (2–120) e <code>limit</code> (1–60, padrão 20).
              </p>
              <CodeBlock code={searchSample} lang="json" theme={codeTheme} />
            </div>
            <div>
              <p className="font-medium text-foreground">POST /v1/prospecting/analyze</p>
              <p>
                Gera score de oportunidade, diagnóstico, pontos fortes/fracos e ação recomendada a partir
                dos dados da empresa. Obrigatório: <code>company.name</code>.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground">POST /v1/prospecting/approach</p>
              <p>
                Cria uma mensagem de abordagem personalizada. Envie o diagnóstico e o score obtidos na
                análise para um resultado mais preciso.
              </p>
              <CodeBlock code={approachSample} lang="json" theme={codeTheme} />
            </div>
          </div>
        </Doc>

        <Doc id="idempotency" title="Idempotência">
          <p>
            Envie o cabeçalho <code>Idempotency-Key</code> com um identificador único por operação. Se a
            mesma chave for reenviada em até 24 horas, devolvemos a resposta original sem cobrar tokens
            novamente — ideal para retentativas seguras após timeout de rede.
          </p>
        </Doc>

        <Doc id="errors" title="Erros">
          <p>
            Erros seguem o padrão HTTP e trazem <code>code</code>, <code>message</code> e{" "}
            <code>request_id</code>.
          </p>
          <CodeBlock code={errorSample} lang="json" theme={codeTheme} />
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full">
              <tbody>
                <Row head cells={["Código", "HTTP", "O que fazer"]} />
                <Row cells={["INVALID_REQUEST", "400", "Corrija o formato da requisição (JSON ou chave em query string)."]} />
                <Row cells={["UNAUTHORIZED", "401", "Chave ausente, inválida ou revogada."]} />
                <Row cells={["FORBIDDEN", "403", "A chave não tem permissão para este endpoint."]} />
                <Row cells={["ACCOUNT_BANNED", "403", "Conta ou IP bloqueado por uso abusivo. Aguarde o prazo ou fale com o suporte."]} />
                <Row cells={["ACCOUNT_SUSPENDED", "403", "Conta suspensa. Fale com o suporte."]} />
                <Row cells={["NOT_FOUND", "404", "Endpoint inexistente nesta versão."]} />
                <Row cells={["METHOD_NOT_ALLOWED", "405", "Utilize POST."]} />
                <Row cells={["INSUFFICIENT_BALANCE", "402", "Adicione créditos na área de Pagamentos."]} />
                <Row cells={["PAYLOAD_TOO_LARGE", "413", "Reduza o corpo da requisição (limite de 32 KB)."]} />
                <Row cells={["VALIDATION_ERROR", "422", "Parâmetros inválidos — veja a mensagem."]} />
                <Row cells={["RATE_LIMIT_EXCEEDED", "429", "Aguarde o tempo indicado em Retry-After."]} />
                <Row cells={["INTERNAL_ERROR", "500", "Falha nossa. Nenhum token é cobrado; tente novamente."]} />
                <Row cells={["UPSTREAM_ERROR / TIMEOUT", "502 / 504", "Operação não concluída e não cobrada. Repita com a mesma Idempotency-Key."]} />
              </tbody>
            </table>
          </div>
        </Doc>

        <Doc id="limits" title="Limites de uso">
          <p>
            Os limites são aplicados em camadas, por chave e por conta. Toda resposta traz cabeçalhos com o
            estado atual do seu consumo.
          </p>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full">
              <tbody>
                <Row head cells={["Camada", "Limite padrão", "Escopo"]} />
                <Row cells={["Rajada", "20 requisições / 10 s", "por chave"]} />
                <Row cells={["Por minuto", "60 requisições / min", "por chave"]} />
                <Row cells={["Por hora", "3.000 requisições / h", "por chave"]} />
                <Row cells={["Conta por minuto", "300 requisições / min", "por conta"]} />
                <Row cells={["Conta por 10 min", "600 requisições / 10 min", "por conta"]} />
                <Row cells={["Conta por dia", "10.000 requisições / dia", "por conta"]} />
              </tbody>
            </table>
          </div>
          <CodeBlock code={headersSample} lang="bash" theme={codeTheme} />
          <p>
            Ao exceder qualquer camada a API responde <code>429</code> com <code>Retry-After</code> e o
            cabeçalho <code>X-RateLimit-Scope</code> indicando a camada atingida. Precisa de limites
            maiores? Fale com o suporte.
          </p>
        </Doc>

        <Doc id="fair-use" title="Uso justo e bloqueios automáticos">
          <p>
            Monitoramos padrões de abuso em tempo real. Excessos repetidos geram bloqueio automático e
            progressivo por chave, conta ou IP — <strong className="text-foreground">15 min, 1 h, 6 h, 24 h e 7 dias</strong>{" "}
            a cada nova reincidência. Durante o bloqueio a API responde <code>403 ACCOUNT_BANNED</code>.
          </p>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full">
              <tbody>
                <Row head cells={["Comportamento", "Gatilho", "Como evitar"]} />
                <Row cells={["Falhas de autenticação", "25 em 10 min", "Não faça brute force de chaves; verifique o segredo salvo."]} />
                <Row cells={["Chave inválida ou revogada", "15 em 10 min", "Remova chaves antigas das suas integrações."]} />
                <Row cells={["Estouro de rate limit", "40 em 15 min", "Respeite Retry-After e aplique backoff exponencial."]} />
                <Row cells={["Saldo insuficiente", "60 em 15 min", "Pause a fila e recarregue antes de continuar."]} />
                <Row cells={["Erros de validação", "150 em 10 min", "Valide o payload antes de enviar."]} />
              </tbody>
            </table>
          </div>
          <p>
            Também é proibido compartilhar chaves entre empresas, revender o acesso bruto sem
            transformação e usar a API para prospecção de pessoas físicas — a Wiize é uma plataforma
            estritamente B2B, em conformidade com a LGPD. Violações podem resultar em bloqueio permanente
            da conta, sem estorno de saldo consumido.
          </p>
        </Doc>
      </div>
    </div>
  );
}

export default ApiDocsContent;
