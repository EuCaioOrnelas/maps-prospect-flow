import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  KeyRound,
  ShieldCheck,
  Gauge,
  Webhook,
  Boxes,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiPublicNavbar } from "@/components/wiize-api/ApiPublicNavbar";
import { ApiHero } from "@/components/wiize-api/ApiHero";
import { ApiFeatureBlock, type ApiFeature } from "@/components/wiize-api/ApiFeatureBlock";
import { ApiCTASection } from "@/components/wiize-api/ApiCTASection";
import { TrustedBySection } from "@/components/landing/TrustedBySection";
import { CodeBlock } from "@/pages/admin/integration/components/CodeBlock";
import wiizeLogo from "@/assets/logo-icon-new.png";

const FEATURES: ApiFeature[] = [
  {
    eyebrow: "Descoberta",
    title: "Encontre empresas reais",
    titleHighlight: "com filtros de mercado",
    description:
      "Consulte empresas por nicho, região e presença digital e receba dados estruturados prontos para entrar no seu funil, sem raspagem manual e sem planilha.",
    bullets: [
      "Busca por segmento, cidade e estado",
      "Dados normalizados de contato e presença digital",
      "Resposta em JSON pronta para persistir",
    ],
    visual: "prospeccao",
  },
  {
    eyebrow: "Diagnóstico",
    title: "Analise cada empresa",
    titleHighlight: "com inteligência aplicada",
    description:
      "Cada empresa retorna com leitura de maturidade digital, sinais comerciais e pontos de atenção, o mesmo motor de análise que roda dentro da plataforma Wiize.",
    bullets: [
      "Sinais de site, redes e reputação",
      "Score de oportunidade explicável",
      "Pontos fortes e gargalos identificados",
    ],
    visual: "sdr",
  },
  {
    eyebrow: "Abordagem",
    title: "Gere mensagens comerciais",
    titleHighlight: "personalizadas por contexto",
    description:
      "Transforme o diagnóstico em uma abordagem pronta para envio, escrita no tom do seu negócio e ancorada em evidências concretas da empresa analisada.",
    bullets: [
      "Mensagem estruturada e contextual",
      "Tom de voz configurável por requisição",
      "Pronta para WhatsApp, e-mail ou CRM",
    ],
    visual: "engajamento",
  },
];

const CAPABILITIES = [
  {
    icon: KeyRound,
    title: "API Keys por ambiente",
    text: "Chaves separadas por ambiente, revogáveis a qualquer momento e com rastreio de uso individual.",
  },
  {
    icon: Gauge,
    title: "Rate limit previsível",
    text: "Limites claros por chave, com headers de controle em toda resposta para você se planejar.",
  },
  {
    icon: Webhook,
    title: "Webhooks assinados",
    text: "Receba eventos de processamento com assinatura HMAC e reentrega automática em falhas.",
  },
  {
    icon: Boxes,
    title: "Respostas estruturadas",
    text: "Contratos estáveis em JSON, versionados, com erros padronizados e mensagens objetivas.",
  },
  {
    icon: ShieldCheck,
    title: "Segurança por padrão",
    text: "TLS obrigatório, isolamento por workspace e histórico de auditoria das chamadas.",
  },
  {
    icon: BookOpen,
    title: "Documentação viva",
    text: "Referência completa de endpoints, exemplos por linguagem e playground autenticado.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Crie sua conta grátis",
    text: "Cadastro em segundos, sem cartão de crédito e sem compromisso.",
  },
  {
    n: "02",
    title: "Gere sua API Key",
    text: "Uma chave por API e por ambiente, com controle total de revogação.",
  },
  {
    n: "03",
    title: "Faça sua primeira chamada",
    text: "Copie um exemplo da documentação e receba dados estruturados na hora.",
  },
];

const responseSample = `{
  "id": "opp_8f21c0",
  "company": { "name": "Empresa Exemplo", "city": "Curitiba", "uf": "PR" },
  "diagnosis": {
    "score": 82,
    "signals": ["site sem captura", "anúncios ativos", "resposta lenta"]
  },
  "approach": {
    "channel": "whatsapp",
    "message": "Olá! Vi que a operação de vocês..."
  }
}`;

export default function ApiLanding() {
  return (
    <div className="min-h-screen w-full overflow-x-clip bg-background">
      <Helmet>
        <title>Wiize API — Inteligência de prospecção via API REST</title>
        <meta
          name="description"
          content="Integre descoberta de empresas, diagnóstico com IA e geração de abordagem comercial ao seu sistema com a Wiize API. Conta gratuita e documentação completa."
        />
        <link rel="canonical" href="https://wiize.com.br/api" />
        <meta property="og:title" content="Wiize API — Inteligência de prospecção via API REST" />
        <meta
          property="og:description"
          content="Descoberta de empresas, diagnóstico com IA e abordagem comercial em uma API REST simples e documentada."
        />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <ApiPublicNavbar />
      <ApiHero />

      <TrustedBySection />

      {/* Recursos em blocos alternados com mockups animados */}
      <div id="recursos" className="scroll-mt-24">
        {FEATURES.map((f, i) => (
          <ApiFeatureBlock key={f.title} feature={f} index={i} />
        ))}
      </div>

      {/* Capacidades da plataforma */}
      <section className="w-full py-16 sm:py-20">
        <div className="container mx-auto w-full max-w-[90rem] px-6 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Plataforma
            </span>
            <h2 className="mt-3 font-display text-[clamp(1.6rem,3vw,2.5rem)] font-extrabold leading-tight tracking-tight text-foreground">
              Construída para times que <span className="text-shimmer-highlight">colocam em produção</span>
            </h2>
            <p className="mt-4 text-sm text-muted-foreground sm:text-base">
              Tudo o que uma integração séria exige, disponível desde a primeira chamada.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((c) => (
              <div
                key={c.title}
                className="rounded-panel border border-border/60 bg-card/60 p-6 transition-colors hover:border-primary/30"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                  <c.icon size={18} strokeWidth={1.75} />
                </span>
                <h3 className="mt-4 text-base font-semibold tracking-tight text-foreground">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="w-full scroll-mt-24 py-16 sm:py-20">
        <div className="container mx-auto w-full max-w-[90rem] px-6 sm:px-10 lg:px-16">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Como funciona
              </span>
              <h2 className="mt-3 font-display text-[clamp(1.6rem,3vw,2.5rem)] font-extrabold leading-tight tracking-tight text-foreground">
                Três passos até a <span className="text-shimmer-highlight">primeira integração</span>
              </h2>
              <div className="mt-8 space-y-6">
                {STEPS.map((s) => (
                  <div key={s.n} className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary font-display text-sm font-bold text-primary-foreground">
                      {s.n}
                    </span>
                    <div>
                      <h3 className="text-base font-semibold tracking-tight text-foreground">{s.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/api/login?modo=cadastro" className="mt-8 inline-block">
                <Button variant="hero" className="group rounded-full">
                  Criar conta grátis
                  <ArrowRight size={16} className="ml-1.5 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Exemplo de resposta
              </p>
              <CodeBlock code={responseSample} lang="json" filename="response.json" showLineNumbers />
            </div>
          </div>
        </div>
      </section>

      {/* Segurança */}
      <section id="seguranca" className="w-full scroll-mt-24 py-16 sm:py-20">
        <div className="container mx-auto w-full max-w-[90rem] px-6 sm:px-10 lg:px-16">
          <div className="rounded-panel border border-border/60 bg-card/60 p-8 sm:p-12">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-14">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  Segurança
                </span>
                <h2 className="mt-3 font-display text-[clamp(1.5rem,2.6vw,2.2rem)] font-extrabold leading-tight tracking-tight text-foreground">
                  Seus dados isolados,
                  <br />
                  <span className="text-shimmer-highlight">suas chaves sob controle</span>
                </h2>
              </div>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  "Isolamento total por workspace",
                  "Chaves com escopo e revogação imediata",
                  "TLS obrigatório em todas as chamadas",
                  "Registro de auditoria por requisição",
                  "Webhooks assinados com HMAC",
                  "Conformidade com a LGPD",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-foreground/85">
                    <ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary" strokeWidth={1.75} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <ApiCTASection />

      <footer className="border-t border-border py-10">
        <div className="container mx-auto flex w-full max-w-[90rem] flex-col items-center justify-between gap-4 px-6 sm:flex-row sm:px-10 lg:px-16">
          <div className="flex items-center gap-2.5">
            <img src={wiizeLogo} alt="Wiize" className="h-7 w-7 object-contain" />
            <span className="text-sm font-semibold text-foreground">
              Wiize <span className="text-muted-foreground">API</span>
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-muted-foreground">
            <Link to="/api/login" className="hover:text-foreground">
              Entrar
            </Link>
            <Link to="/api/login?modo=cadastro" className="hover:text-foreground">
              Criar conta
            </Link>
            <Link to="/privacidade" className="hover:text-foreground">
              Política de Privacidade
            </Link>
            <Link to="/termos" className="hover:text-foreground">
              Termos
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Wiize
          </p>
        </div>
      </footer>
    </div>
  );
}
