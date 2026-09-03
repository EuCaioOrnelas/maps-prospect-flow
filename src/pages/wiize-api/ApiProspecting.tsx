import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, KeyRound, Search, Gauge, Stethoscope, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/pages/admin/integration/components/CodeBlock";
import { PageHeader, SectionCard } from "@/components/wiize-api/WiizeApiUI";
import { useTheme } from "@/contexts/ThemeContext";

const endpoints = [
  { method: "POST", path: "/v1/prospecting/companies", icon: Search, title: "Find Companies", desc: "Encontre empresas por nicho, região e sinais comerciais.", tokens: "90 tokens" },
  { method: "POST", path: "/v1/prospecting/analyze", icon: Gauge, title: "Analyze Company", desc: "Analise uma empresa e receba um opportunity score.", tokens: "120 tokens" },
  { method: "POST", path: "/v1/prospecting/diagnose", icon: Stethoscope, title: "Diagnose Lead", desc: "Diagnóstico comercial com oportunidades priorizadas.", tokens: "250 tokens" },
  { method: "POST", path: "/v1/prospecting/approach", icon: MessageSquare, title: "Generate Approach", desc: "Abordagem personalizada pronta para envio.", tokens: "180 tokens" },
];

const requestSample = `{
  "company": {
    "name": "Empresa Exemplo",
    "website": "empresa.com.br"
  }
}`;

const responseSample = `{
  "opportunity_score": 87,
  "diagnosis": "Presença digital ativa, porém sem funil comercial estruturado.",
  "opportunities": [
    "Sem atendimento automatizado no WhatsApp",
    "Landing page sem captura de leads"
  ],
  "recommended_approach": "Abordagem consultiva focada em recuperação de leads."
}`;

export default function ApiProspecting() {
  const { resolvedTheme } = useTheme();
  const codeTheme = resolvedTheme === "dark" ? "dark" : "light";
  return (
    <>
      <Helmet>
        <title>Prospecting Intelligence API — Wiize API</title>
        <meta name="description" content="Encontre empresas, analise leads e gere diagnósticos comerciais com IA através da Prospecting Intelligence API." />
      </Helmet>

      <Link to="/api/apis" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Voltar para APIs
      </Link>

      <PageHeader
        title="Prospecting Intelligence API"
        description="Encontre empresas, analise leads e gere diagnósticos comerciais com IA."
        actions={
          <>
            <Badge className="bg-primary/10 text-[10px] text-primary hover:bg-primary/10">Disponível</Badge>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/api/docs"><BookOpen size={15} /> Documentação</Link>
            </Button>
            <Button asChild className="gap-2">
              <Link to="/api/keys"><KeyRound size={15} /> Criar API Key</Link>
            </Button>
          </>
        }
      />

      <SectionCard title="Endpoints" description="Consumo estimado por chamada">
        <ul className="space-y-3">
          {endpoints.map((e) => (
            <li key={e.path} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 p-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <e.icon size={16} className="text-muted-foreground" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{e.title}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    <span className="mr-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{e.method}</span>
                    {e.path}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{e.desc}</p>
                </div>
              </div>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{e.tokens}</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Request" description="POST /v1/prospecting/analyze">
          <CodeBlock code={requestSample} lang="json" theme={codeTheme} />
        </SectionCard>
        <SectionCard title="Response" description="200 OK">
          <CodeBlock code={responseSample} lang="json" theme={codeTheme} />
        </SectionCard>
      </div>
    </>
  );
}
