import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Sparkles, Lightbulb, Users, BrainCircuit, Rocket, Send, ArrowRight, ArrowDown, ShieldCheck, Vote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import SuggestionForm from "@/components/suggestions/SuggestionForm";
import { GlobePulse } from "@/components/suggestions/GlobePulse";
import SuggestionReleases from "@/components/suggestions/SuggestionReleases";

const HOW_IT_WORKS = [
  {
    step: "Etapa 1",
    icon: Lightbulb,
    title: "Compartilhe sua ideia",
    text: "Envie a funcionalidade ou melhoria que faria diferença no seu dia.",
  },
  {
    step: "Etapa 2",
    icon: Users,
    title: "A comunidade participa",
    text: "Outros usuários votam nas ideias que também consideram importantes.",
  },
  {
    step: "Etapa 3",
    icon: BrainCircuit,
    title: "A Wiize avalia",
    text: "Dados e IA ajudam a identificar relevância e demandas recorrentes.",
  },
  {
    step: "Etapa 4",
    icon: Rocket,
    title: "A evolução acontece",
    text: "As prioridades são planejadas e entregues pela equipe Wiize.",
  },
];

export default function Suggestions() {
  const scrollToForm = () =>
    document.getElementById("enviar-sugestao")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <Helmet>
        <title>Wiize Evolui · Central de Sugestões</title>
        <meta
          name="description"
          content="Compartilhe ideias, vote nas sugestões da comunidade e ajude a construir o futuro da Wiize."
        />
      </Helmet>

      <div className="min-h-screen bg-background relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 h-[620px] opacity-70"
          style={{ background: "var(--gradient-glow)" }}
        />

        <header className="relative z-10 border-b border-border/50 bg-background/70">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
            <Logo />
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground shrink-0">
              <Link to="/dashboard">
                <ArrowLeft size={16} className="sm:mr-2" />
                <span className="hidden sm:inline">Voltar ao painel</span>
              </Link>
            </Button>
          </div>
        </header>

        <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
          {/* Hero: texto à esquerda, globo à direita */}
          <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] pt-10 sm:pt-16 pb-12 sm:pb-20">
            <div className="space-y-7 text-center lg:text-left">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles size={13} />
                Wiize Evolui
              </span>
              <h1 className="font-bold tracking-tight text-foreground leading-[1.05]">
                <span className="block text-3xl sm:text-4xl lg:text-5xl">A próxima evolução</span>
                <span className="block text-3xl sm:text-4xl lg:text-5xl">da Wiize</span>
                <span className="block text-4xl sm:text-5xl lg:text-6xl text-shimmer-highlight mt-2 pb-1">
                  começa com você.
                </span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto lg:mx-0">
                Os melhores recursos nascem de quem usa a plataforma todos os dias.
                Compartilhe ideias e ajude a construir o futuro da Wiize.
              </p>

              <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto lg:mx-0">
                {[
                  { icon: Vote, label: "Votação da comunidade" },
                  { icon: BrainCircuit, label: "Análise mensal com IA" },
                  { icon: ShieldCheck, label: "Uso só para o produto" },
                ].map((f) => (
                  <div key={f.label} className="rounded-xl border border-border/60 bg-card/70 p-3 text-left">
                    <f.icon size={16} className="text-primary mb-2" />
                    <p className="text-[11px] sm:text-xs font-medium text-foreground leading-snug">{f.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-center lg:justify-start">
                <Button size="lg" onClick={scrollToForm} className="w-full sm:w-auto h-12 px-7">
                  <Send size={16} className="mr-2" />
                  Enviar uma sugestão
                </Button>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[300px] sm:max-w-[420px] lg:max-w-[500px]">
              <GlobePulse />
            </div>
          </section>

          {/* Como funciona */}
          <section className="space-y-8 py-10 sm:py-14 border-t border-border/50">
            <div className="text-center space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Processo</p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Como funciona</h2>
            </div>
            <div className="flex flex-col lg:flex-row items-stretch gap-2 lg:gap-0">
              {HOW_IT_WORKS.map((s, i) => (
                <div key={s.step} className="contents">
                  <div className="flex-1 rounded-2xl border border-border/60 bg-card p-5 space-y-3 transition-colors hover:border-primary/40">
                    <div className="flex items-center justify-between">
                      <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <s.icon size={19} className="text-primary" />
                      </div>
                      <span className="text-2xl font-bold text-muted-foreground/25 tabular-nums">0{i + 1}</span>
                    </div>
                    <p className="text-sm sm:text-base font-semibold text-foreground">{s.title}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{s.text}</p>
                  </div>
                  {i < HOW_IT_WORKS.length - 1 && (
                    <div className="flex items-center justify-center shrink-0 lg:w-10 py-1 lg:py-0">
                      <div className="h-8 w-8 rounded-full border border-primary/25 bg-primary/10 flex items-center justify-center">
                        <ArrowRight size={15} className="text-primary hidden lg:block" />
                        <ArrowDown size={15} className="text-primary lg:hidden" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Formulário */}
          <section id="enviar-sugestao" className="scroll-mt-6 py-10 sm:py-14 border-t border-border/50">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="text-center space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Sua ideia</p>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Envie sua sugestão</h2>
                <p className="text-sm text-muted-foreground">Todos os meses analisamos as ideias com maior potencial.</p>
              </div>
              <SuggestionForm />
            </div>
          </section>

          <section className="pt-4">
            <SuggestionReleases />
          </section>
        </main>
      </div>
    </>
  );
}
