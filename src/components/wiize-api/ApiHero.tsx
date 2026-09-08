import { Link } from "react-router-dom";
import { ArrowRight, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShaderBackground } from "@/components/ui/warmth-ripple";
import { CodeBlock } from "@/pages/admin/integration/components/CodeBlock";

const sample = `# 1. exporte sua chave (ambiente de produção)
export WIIZE_API_KEY="wk_live_sua_chave"

# 2. analise uma empresa e receba diagnóstico + abordagem
curl -X POST https://api.wiize.com.br/v1/prospecting/analyze \\
  -H "Authorization: Bearer $WIIZE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "company": {
      "name": "Empresa Exemplo",
      "site": "empresaexemplo.com.br",
      "segmento": "logística"
    },
    "output": ["diagnostico", "abordagem"],
    "webhook_url": "https://seusistema.com/webhooks/wiize"
  }'

# 3. resposta imediata com o id do processamento
# { "id": "an_9fd2", "status": "processing", "credits": 3 }`;


/** Hero público do Wiize API — mesma linguagem visual do hero da LP principal. */
export const ApiHero = () => {
  return (
    <section className="relative -mt-[72px] w-full overflow-x-clip pb-36 pt-[112px] sm:-mt-[80px] sm:pb-44 sm:pt-[128px] lg:pb-56">
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background:
            "linear-gradient(180deg, hsl(158 35% 97.5%) 0%, hsl(210 30% 99%) 60%, hsl(var(--background)) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        aria-hidden
        style={{
          backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/4 h-[900px] w-[900px] -translate-x-1/2"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse at center, hsl(158 60% 55% / 0.07) 0%, hsl(158 60% 55% / 0.02) 45%, transparent 70%)",
        }}
      />

      {/* Faixa de plasma diagonal na divisória do hero — posição fixa em todas as telas */}
      <div
        className="pointer-events-none absolute bottom-[7.5rem] left-1/2 z-[5] h-32 w-[112vw] origin-center -translate-x-1/2 -rotate-[4deg] overflow-hidden"
        aria-hidden
      >
        <div className="wz-band absolute inset-0" />
        <div className="absolute inset-0 overflow-hidden opacity-60 mix-blend-screen">
          <ShaderBackground className="h-[300%] w-full -translate-y-[33.33%]" />
        </div>
      </div>

      <div className="container relative z-10 mx-auto w-full max-w-[90rem] px-4 sm:px-10 lg:px-16">
        <div className="grid grid-cols-1 items-center gap-10 xl:grid-cols-[1.15fr_1fr] xl:gap-12">
          <div className="text-center xl:text-left">
            <div className="mb-6 inline-flex animate-fade-in items-center gap-2 rounded-hover border border-primary/10 glass px-3 py-1.5 sm:mb-8 sm:px-3.5 sm:py-2">
              <Terminal size={14} className="text-primary" />
              <span className="text-[10px] font-medium tracking-tight text-foreground sm:text-xs">
                Infraestrutura de inteligência comercial
              </span>
            </div>

            <h1
              className="mb-4 animate-slide-up font-display font-bold leading-[1.08] tracking-tight text-foreground sm:mb-6"
              style={{ animationDelay: "0.1s" }}
            >
              <span className="block text-[1.75rem] sm:text-[2.3rem] md:text-[2.9rem] lg:text-[3.25rem] xl:text-[3.6rem]">
                A inteligência da Wiize
              </span>
              <span className="mt-1 block text-shimmer-highlight text-[2rem] font-extrabold leading-[1.05] drop-shadow-sm sm:mt-2 sm:whitespace-nowrap sm:text-[2.85rem] md:text-[3.5rem] lg:text-[3.95rem] xl:text-[4.3rem]">
                Dentro do seu sistema
              </span>

            </h1>

            <p
              className="mx-auto mb-6 max-w-xl animate-slide-up text-sm text-muted-foreground sm:mb-8 sm:text-lg md:text-xl xl:mx-0"
              style={{ animationDelay: "0.2s" }}
            >
              Encontre empresas, analise leads, gere diagnósticos e abordagens comerciais com IA
              através de uma API REST simples, documentada e pronta para produção.
            </p>

            <div
              className="mb-8 flex animate-slide-up flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4 xl:justify-start"
              style={{ animationDelay: "0.3s" }}
            >
              <Link to="/api/login?modo=cadastro" className="shrink-0">
                <Button size="lg" className="h-11 rounded-hover px-6 text-sm sm:h-12 sm:px-8 sm:text-base">
                  Criar conta grátis <ArrowRight size={17} />
                </Button>
              </Link>
              <a href="#como-funciona" className="shrink-0">
                <Button
                  variant="ghost"
                  size="lg"
                  className="h-11 rounded-hover border border-border/60 bg-transparent px-6 text-sm transition-all duration-300 hover:-translate-y-1 hover:border-foreground/20 hover:bg-muted/60 sm:h-12 sm:px-8 sm:text-base"
                >
                  Ver como funciona
                </Button>
              </a>
            </div>

            <div className="mx-auto max-w-xl text-left xl:hidden">
              <div className="rounded-xl border border-border/60 bg-card p-1 shadow-xl shadow-foreground/[0.04]">
                <CodeBlock
                  code={sample}
                  lang="bash"
                  filename="quickstart.sh"
                  theme="light"
                  className="min-h-[18rem] border-0 shadow-none"
                />
              </div>
            </div>
          </div>

          <div className="relative z-10 hidden w-full animate-slide-up xl:flex xl:justify-end" style={{ animationDelay: "0.5s" }}>
            <div className="w-full max-w-[38rem] rounded-xl border border-border/60 bg-card p-1 text-left shadow-xl shadow-foreground/[0.04]">
              <CodeBlock
                code={sample}
                lang="bash"
                filename="quickstart.sh"
                theme="light"
                showLineNumbers
                className="min-h-[24rem] border-0 shadow-none"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ApiHero;
