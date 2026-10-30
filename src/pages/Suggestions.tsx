import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Sparkles, Lightbulb, Users, BrainCircuit, Rocket, Send, Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import SuggestionForm from "@/components/suggestions/SuggestionForm";
import SuggestionExplorer from "@/components/suggestions/SuggestionExplorer";
import SuggestionReleases from "@/components/suggestions/SuggestionReleases";

const HOW_IT_WORKS = [
  {
    step: "Etapa 1",
    icon: Lightbulb,
    title: "Compartilhe sua ideia",
    text: "Envie uma sugestão de funcionalidade, melhoria ou recurso que gostaria de encontrar na Wiize.",
  },
  {
    step: "Etapa 2",
    icon: Users,
    title: "A comunidade participa",
    text: "Outros usuários podem visualizar e votar nas sugestões que também consideram importantes.",
  },
  {
    step: "Etapa 3",
    icon: BrainCircuit,
    title: "A Wiize avalia",
    text: "Nossa equipe utiliza análise de dados e inteligência artificial para identificar demandas recorrentes, relevância e potencial de cada sugestão.",
  },
  {
    step: "Etapa 4",
    icon: Rocket,
    title: "A evolução acontece",
    text: "As melhorias prioritárias são selecionadas, planejadas e desenvolvidas pela equipe Wiize.",
  },
];

export default function Suggestions() {
  const [tab, setTab] = useState("enviar");

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
        {/* Glow de fundo */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 h-[520px] opacity-70"
          style={{ background: "var(--gradient-glow)" }}
        />

        {/* Topbar */}
        <header className="relative z-10 border-b border-border/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
            <Logo />
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground shrink-0">
              <Link to="/dashboard">
                <ArrowLeft size={16} className="sm:mr-2" />
                <span className="hidden sm:inline">Voltar ao painel</span>
              </Link>
            </Button>
          </div>
        </header>

        <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-14 space-y-10 sm:space-y-14">
          {/* Hero */}
          <section className="text-center max-w-2xl mx-auto space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles size={13} />
              Wiize Evolui
            </span>
            <h1 className="font-bold tracking-tight text-foreground leading-[1.15]">
              <span className="block text-2xl sm:text-3xl md:text-4xl">
                A próxima evolução da Wiize
              </span>
              <span className="block text-3xl sm:text-4xl md:text-5xl text-shimmer-highlight mt-1">
                começa com você.
              </span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Acreditamos que os melhores recursos surgem de quem utiliza a plataforma
              todos os dias. Compartilhe suas ideias, vote nas sugestões da comunidade
              e ajude a construir o futuro da Wiize.
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground/80 leading-relaxed">
              Todos os meses, nossa equipe analisa as sugestões recebidas, identifica as
              melhorias com maior potencial e trabalha para transformar as melhores ideias
              em funcionalidades reais.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
              <Button onClick={() => setTab("enviar")} className="w-full sm:w-auto">
                <Send size={15} className="mr-2" />
                Enviar uma sugestão
              </Button>
              <Button variant="outline" onClick={() => setTab("explorar")} className="w-full sm:w-auto">
                <Compass size={15} className="mr-2" />
                Explorar sugestões
              </Button>
            </div>
          </section>

          {/* Como funciona */}
          <section className="space-y-4">
            <h2 className="text-center text-lg sm:text-xl font-semibold text-foreground">
              Como funciona
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {HOW_IT_WORKS.map((s) => (
                <div
                  key={s.step}
                  className="rounded-xl border border-border/60 bg-card/60 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <s.icon size={17} className="text-primary" />
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      {s.step}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Conteúdo principal */}
          <Tabs value={tab} onValueChange={setTab} className="space-y-6">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
              <TabsTrigger value="enviar">
                <Send size={14} className="mr-1.5" />
                Enviar sugestão
              </TabsTrigger>
              <TabsTrigger value="explorar">
                <Compass size={14} className="mr-1.5" />
                Explorar sugestões
              </TabsTrigger>
            </TabsList>

            <TabsContent value="enviar" className="space-y-6">
              <SuggestionForm onSubmitted={() => setTab("explorar")} />
              <p className="text-center text-xs text-muted-foreground">
                Suas sugestões são usadas apenas para evolução do produto.
              </p>
            </TabsContent>

            <TabsContent value="explorar" className="space-y-8">
              <SuggestionExplorer />
              <SuggestionReleases />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
}
