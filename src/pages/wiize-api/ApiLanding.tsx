import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Boxes,
  Coins,
  Gauge,
  KeyRound,
  MessageSquare,
  Search,
  ShieldCheck,
  Stethoscope,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CodeBlock } from "@/pages/admin/integration/components/CodeBlock";
import wiizeLogo from "@/assets/logo-icon-new.png";

const sample = `curl -X POST https://api.wiize.com.br/v1/prospecting/analyze \\
  -H "Authorization: Bearer wk_live_sua_chave" \\
  -H "Content-Type: application/json" \\
  -d '{ "company": { "name": "Empresa Exemplo" } }'`;

const capabilities = [
  { icon: Search, title: "Find Companies", desc: "Encontre empresas por nicho, região e sinais comerciais." },
  { icon: Gauge, title: "Analyze Company", desc: "Score de oportunidade calculado com IA." },
  { icon: Stethoscope, title: "Diagnose Lead", desc: "Diagnóstico comercial com oportunidades priorizadas." },
  { icon: MessageSquare, title: "Generate Approach", desc: "Abordagem personalizada pronta para envio." },
];

const steps = [
  { icon: KeyRound, title: "Crie sua API Key", desc: "Gere uma chave de produção ou de teste em segundos." },
  { icon: Coins, title: "Adicione saldo", desc: "Sem mensalidade. Você paga apenas pelo que consumir." },
  { icon: Zap, title: "Faça sua primeira chamada", desc: "Uma requisição e a inteligência já está no seu produto." },
];

export default function ApiLanding() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Wiize API — Inteligência comercial para o seu sistema</title>
        <meta
          name="description"
          content="Integre prospecção, análise de leads e diagnóstico comercial com IA ao seu produto. Sem mensalidade: pague apenas pelo que consumir."
        />
        <link rel="canonical" href="https://wiize.com.br/api" />
        <meta property="og:title" content="Wiize API — Inteligência comercial para o seu sistema" />
        <meta property="og:description" content="Prospecção, análise e diagnóstico comercial com IA via API. Pague apenas pelo que consumir." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/api" className="flex items-center gap-2.5">
            <img src={wiizeLogo} alt="Wiize" className="h-8 w-8 object-contain" />
            <span className="text-base font-bold tracking-tight">
              Wiize <span className="font-semibold text-muted-foreground">API</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/api/docs">Documentação</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/api/login">Acessar painel</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="max-w-2xl">
            <Badge variant="outline" className="mb-5 gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Boxes size={12} /> Infraestrutura de inteligência comercial
            </Badge>
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
              A inteligência comercial da Wiize dentro do seu sistema
            </h1>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Encontre empresas, analise leads e gere diagnósticos comerciais com IA através de uma
              API simples. Sem mensalidade — você adiciona saldo e paga apenas pelo que consumir.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link to="/api/login">
                  Começar agora <ArrowRight size={16} />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/api/docs">Ver documentação</Link>
              </Button>
            </div>
          </div>

          <div className="mt-14 max-w-3xl">
            <CodeBlock code={sample} lang="bash" filename="quickstart.sh" />
          </div>
        </section>

        <section className="border-y border-border bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">O que você pode construir</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Quatro endpoints cobrem todo o ciclo de descoberta e qualificação comercial.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {capabilities.map((c) => (
                <Card key={c.title} className="border-border/70 shadow-none">
                  <CardContent className="p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <c.icon size={18} className="text-primary" strokeWidth={1.75} />
                    </div>
                    <h3 className="mt-4 text-sm font-semibold">{c.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Comece em três passos</h2>
              <ul className="mt-8 space-y-6">
                {steps.map((s, i) => (
                  <li key={s.title} className="flex gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-sm font-semibold tabular-nums">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{s.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{s.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <Card className="border-border/70 shadow-none">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold tracking-tight">Preço transparente</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sem plano, sem fidelidade. O consumo é medido em Wiize Tokens.
                </p>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-4xl font-semibold tracking-tight">R$ 0,15</span>
                  <span className="text-sm text-muted-foreground">por Wiize Token</span>
                </div>
                <ul className="mt-6 space-y-2.5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><Coins size={14} className="text-primary" /> Saldo mínimo de R$ 30,00</li>
                  <li className="flex items-center gap-2"><Zap size={14} className="text-primary" /> Recarga automática opcional</li>
                  <li className="flex items-center gap-2"><ShieldCheck size={14} className="text-primary" /> Chaves de teste sem custo de setup</li>
                </ul>
                <Button asChild className="mt-7 w-full gap-2">
                  <Link to="/api/login">
                    Criar minha API Key <ArrowRight size={15} />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Pronto para integrar a Wiize ao seu produto?
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              Crie sua conta, adicione saldo e faça a primeira chamada hoje mesmo.
            </p>
            <Button asChild size="lg" className="mt-7 gap-2">
              <Link to="/api/login">
                Acessar o painel <ArrowRight size={16} />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} Wiize. Todos os direitos reservados.</span>
          <div className="flex gap-5">
            <Link to="/api/docs" className="hover:text-foreground">Documentação</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacidade</Link>
            <Link to="/terms" className="hover:text-foreground">Termos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
