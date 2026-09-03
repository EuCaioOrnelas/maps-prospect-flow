import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { cn } from "@/lib/utils";
import { CodeBlock } from "@/pages/admin/integration/components/CodeBlock";
import { PageHeader } from "@/components/wiize-api/WiizeApiUI";

const sections = [
  { id: "intro", label: "Introdução" },
  { id: "auth", label: "Autenticação" },
  { id: "quickstart", label: "Primeira requisição" },
  { id: "tokens", label: "Wiize Tokens" },
  { id: "endpoints", label: "Endpoints" },
  { id: "errors", label: "Erros" },
  { id: "limits", label: "Rate limits" },
  { id: "webhooks", label: "Webhooks" },
];

const authSample = `curl https://api.wiize.com.br/v1/prospecting/analyze \\
  -H "Authorization: Bearer wk_live_sua_chave" \\
  -H "Content-Type: application/json"`;

const quickSample = `curl -X POST https://api.wiize.com.br/v1/prospecting/analyze \\
  -H "Authorization: Bearer wk_live_sua_chave" \\
  -H "Content-Type: application/json" \\
  -d '{ "company": { "name": "Empresa Exemplo", "website": "empresa.com.br" } }'`;

const quickResponse = `{
  "opportunity_score": 87,
  "diagnosis": "Presença digital ativa, sem funil comercial estruturado.",
  "tokens_used": 120
}`;

const errorSample = `{
  "error": {
    "code": "insufficient_balance",
    "message": "Saldo insuficiente para completar a requisição.",
    "status": 402
  }
}`;

const webhookSample = `{
  "event": "balance.low",
  "data": { "balance": 24.5, "threshold": 30 },
  "created_at": "2026-09-03T12:00:00Z"
}`;

function Doc({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-b border-border/70 pb-10 last:border-0">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-4 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function ApiDocs() {
  const [active, setActive] = useState("intro");

  return (
    <>
      <Helmet>
        <title>Documentação — Wiize API</title>
        <meta name="description" content="Guia de integração da Wiize API: autenticação, primeira requisição, tokens, erros e webhooks." />
      </Helmet>

      <PageHeader title="Documentação" description="Tudo o que você precisa para integrar a Wiize ao seu sistema." />

      <div className="flex gap-8">
        <nav className="sticky top-20 hidden h-fit w-52 shrink-0 space-y-0.5 xl:block">
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
              A Wiize API entrega inteligência comercial pronta para uso: encontrar empresas,
              analisar leads, gerar diagnósticos e abordagens. Não existe mensalidade — você adiciona
              saldo e consome conforme a necessidade, em Wiize Tokens.
            </p>
            <p className="font-mono text-xs text-foreground">Base URL: https://api.wiize.com.br/v1</p>
          </Doc>

          <Doc id="auth" title="Autenticação">
            <p>
              Todas as requisições exigem uma API Key enviada no cabeçalho <code>Authorization</code>.
              Chaves de produção começam com <code>wk_live_</code> e chaves de teste com <code>wk_test_</code>.
              Nunca exponha sua chave no frontend.
            </p>
            <CodeBlock code={authSample} lang="bash" />
          </Doc>

          <Doc id="quickstart" title="Primeira requisição">
            <p>Analise uma empresa e receba um opportunity score em uma única chamada.</p>
            <div className="grid gap-4 lg:grid-cols-2">
              <CodeBlock code={quickSample} lang="bash" filename="request.sh" />
              <CodeBlock code={quickResponse} lang="json" filename="response.json" />
            </div>
          </Doc>

          <Doc id="tokens" title="Wiize Tokens">
            <p>
              O consumo é medido em Wiize Tokens. Cada token custa R$ 0,15 e é debitado do seu saldo
              a cada requisição bem-sucedida. Requisições com erro de autenticação ou rate limit não
              consomem tokens.
            </p>
            <ul className="list-inside list-disc space-y-1">
              <li>Find Companies — 90 tokens</li>
              <li>Analyze Company — 120 tokens</li>
              <li>Diagnose Lead — 250 tokens</li>
              <li>Generate Approach — 180 tokens</li>
            </ul>
          </Doc>

          <Doc id="endpoints" title="Endpoints">
            <ul className="space-y-2 font-mono text-xs text-foreground">
              <li>POST /v1/prospecting/companies</li>
              <li>POST /v1/prospecting/analyze</li>
              <li>POST /v1/prospecting/diagnose</li>
              <li>POST /v1/prospecting/approach</li>
            </ul>
          </Doc>

          <Doc id="errors" title="Erros">
            <p>Erros seguem o padrão HTTP com um corpo descritivo.</p>
            <CodeBlock code={errorSample} lang="json" />
            <ul className="list-inside list-disc space-y-1">
              <li><strong className="text-foreground">401</strong> — chave inválida ou ausente</li>
              <li><strong className="text-foreground">402</strong> — saldo insuficiente</li>
              <li><strong className="text-foreground">422</strong> — parâmetros inválidos</li>
              <li><strong className="text-foreground">429</strong> — limite de requisições excedido</li>
            </ul>
          </Doc>

          <Doc id="limits" title="Rate limits">
            <p>
              O limite padrão é de 60 requisições por minuto por API Key. Ao exceder, a API responde
              com <code>429</code> e o cabeçalho <code>Retry-After</code>.
            </p>
          </Doc>

          <Doc id="webhooks" title="Webhooks">
            <p>
              Configure uma URL para receber eventos de saldo baixo, recarga concluída e falhas de
              cobrança. Cada envio inclui assinatura HMAC no cabeçalho <code>X-Wiize-Signature</code>.
            </p>
            <CodeBlock code={webhookSample} lang="json" />
          </Doc>
        </div>
      </div>
    </>
  );
}
