import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  PlayCircle,
  Clock,
  CheckCircle2,
  Sparkles,
  Search,
  Send,
  Bot,
  Users,
  Flame,
  BarChart3,
  Workflow,
  MessageSquare,
  Rocket,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/landing/Footer";
import { SEO } from "@/components/SEO";

interface Chapter {
  index: number;
  timestamp: string;
  title: string;
  description: string;
  icon: typeof Search;
}

const chapters: Chapter[] = [
  {
    index: 1,
    timestamp: "00:00",
    title: "Visão geral da plataforma",
    description: "Apresentação completa do Wiize, módulos principais e como tudo se conecta.",
    icon: Sparkles,
  },
  {
    index: 2,
    timestamp: "02:30",
    title: "Prospecção Inteligente",
    description: "Como gerar oportunidades qualificadas em segundos com a busca por nicho e localização.",
    icon: Search,
  },
  {
    index: 3,
    timestamp: "05:00",
    title: "Campanhas de WhatsApp",
    description: "Disparos personalizados, agendamentos, modo IA e limites de segurança contra bloqueios.",
    icon: Send,
  },
  {
    index: 4,
    timestamp: "08:00",
    title: "Agentes de IA 24/7",
    description: "Configure agentes que respondem inbound, qualificam leads e movem o CRM automaticamente.",
    icon: Bot,
  },
  {
    index: 5,
    timestamp: "11:00",
    title: "CRM e Score de Leads",
    description: "Pipeline visual em Kanban, score de 0 a 1.000 pontos e gestão multi-usuário.",
    icon: Users,
  },
  {
    index: 6,
    timestamp: "13:30",
    title: "Aquecimento de Números",
    description: "Mantenha seus números saudáveis com aquecimento contextual automatizado por IA.",
    icon: Flame,
  },
  {
    index: 7,
    timestamp: "16:00",
    title: "Fluxos de Automação",
    description: "Construa jornadas completas com nós de mensagem, espera, IA, A/B e integrações Google.",
    icon: Workflow,
  },
  {
    index: 8,
    timestamp: "18:30",
    title: "Chat Multiatendimento",
    description: "Centralize todas as conversas em uma caixa única com sua equipe operando em conjunto.",
    icon: MessageSquare,
  },
  {
    index: 9,
    timestamp: "20:30",
    title: "Cockpit e Relatórios",
    description: "Visualize receita projetada, funil operacional e KPIs em tempo real.",
    icon: BarChart3,
  },
];

const highlights = [
  { icon: Clock, label: "~22 minutos", description: "Vídeo completo dividido em capítulos navegáveis" },
  { icon: ShieldCheck, label: "Sem compromisso", description: "Assista no seu ritmo, com seu time" },
  { icon: Rocket, label: "Pronto para operar", description: "Saia do tour já entendendo o dia 1" },
];

const TourCompleto = () => {
  const navigate = useNavigate();
  const [activeChapter, setActiveChapter] = useState<number | null>(null);

  return (
    <>
      <SEO
        title="Tour Completo da Plataforma — Wiize"
        description="Conheça em detalhes cada funcionalidade do Wiize: prospecção, agentes de IA, CRM, campanhas, aquecimento e muito mais."
        keywords="tour wiize, demonstração, plataforma, prospecção, whatsapp, crm"
      />

      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {/* Header */}
        <header className="border-b border-border/50 bg-background/85 backdrop-blur-md sticky top-0 z-40">
          <div className="container mx-auto px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="gap-2 text-sm px-3"
              >
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
              <Logo size="md" />
              <Button
                variant="hero"
                size="sm"
                onClick={() => navigate("/signup")}
                className="gap-2"
              >
                <span className="hidden sm:inline">Começar trial grátis</span>
                <span className="sm:hidden">Trial grátis</span>
                <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1">
          {/* Hero */}
          <section className="relative overflow-hidden">
            {/* Glow background */}
            <div
              aria-hidden
              className="absolute inset-0 -z-10 opacity-60"
              style={{
                background:
                  "radial-gradient(ellipse 80% 50% at 50% 0%, hsl(var(--primary) / 0.18), transparent 60%)",
              }}
            />
            <div
              aria-hidden
              className="absolute inset-0 -z-10 opacity-[0.04]"
              style={{
                backgroundImage:
                  "radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />

            <div className="container mx-auto px-4 pt-14 sm:pt-20 pb-10 sm:pb-14">
              <div className="max-w-3xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6">
                  <Sparkles size={14} />
                  TOUR COMPLETO DA PLATAFORMA
                </div>

                <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] mb-5">
                  Conheça o Wiize <span className="text-primary">por dentro</span>,
                  <br className="hidden sm:block" />
                  no seu próprio ritmo.
                </h1>

                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-8">
                  Um tour gravado mostrando cada funcionalidade da plataforma — da prospecção
                  ao fechamento. Assista, compartilhe com seu time e chegue no dia 1 já operando.
                </p>

                {/* Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
                  {highlights.map(({ icon: Icon, label, description }) => (
                    <div
                      key={label}
                      className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2 p-4 rounded-2xl border border-border bg-card/60 backdrop-blur-sm text-left"
                    >
                      <div className="h-10 w-10 rounded-xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center text-primary shrink-0">
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold leading-tight">{label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Video player */}
          <section className="container mx-auto px-4 pb-12 sm:pb-16">
            <div className="max-w-5xl mx-auto">
              <div className="relative rounded-[var(--radius-card)] border border-border bg-card shadow-card overflow-hidden">
                {/* Soft glow */}
                <div
                  aria-hidden
                  className="absolute -inset-px rounded-[var(--radius-card)] pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(135deg, hsl(var(--primary) / 0.25), transparent 40%, hsl(var(--primary) / 0.15))",
                    maskImage:
                      "linear-gradient(#000, transparent 30%, transparent 70%, #000)",
                    WebkitMaskImage:
                      "linear-gradient(#000, transparent 30%, transparent 70%, #000)",
                  }}
                />

                {/* Video aspect ratio container */}
                <div className="relative aspect-video bg-secondary/40 flex items-center justify-center">
                  {/* PLACEHOLDER — substituir pelo embed do vídeo (YouTube/Loom/Vimeo) */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                    <div className="h-20 w-20 rounded-full bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center mb-5 backdrop-blur-sm">
                      <PlayCircle size={42} className="text-primary" strokeWidth={1.5} />
                    </div>
                    <div className="text-lg sm:text-xl font-semibold mb-1.5">
                      Vídeo do tour completo
                    </div>
                    <div className="text-sm text-muted-foreground max-w-md">
                      Em breve: o tour gravado será inserido aqui. Substitua este placeholder
                      pelo embed do YouTube, Loom ou Vimeo.
                    </div>
                  </div>

                  {/*
                    Quando tiver o vídeo, troque o bloco acima por:

                    <iframe
                      src="https://www.youtube.com/embed/SEU_ID?rel=0&modestbranding=1"
                      title="Tour completo Wiize"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    />
                  */}
                </div>
              </div>

              {/* Video meta */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={14} className="text-primary" />
                    9 capítulos
                  </span>
                  <span className="text-border">•</span>
                  <span>~22 minutos</span>
                  <span className="text-border hidden sm:inline">•</span>
                  <span className="hidden sm:inline">Atualizado mensalmente</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/ajuda")}>
                  Central de ajuda
                </Button>
              </div>
            </div>
          </section>

          {/* Chapters */}
          <section className="container mx-auto px-4 pb-16 sm:pb-24">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-3">
                  Navegue pelos capítulos
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Cada bloco do tour mostra uma área da plataforma em profundidade. Pule
                  diretamente para o que mais te interessa.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {chapters.map((chapter) => {
                  const Icon = chapter.icon;
                  const isActive = activeChapter === chapter.index;
                  return (
                    <button
                      key={chapter.index}
                      onClick={() => setActiveChapter(chapter.index)}
                      className={`group relative text-left rounded-2xl border bg-card p-5 transition-all duration-200 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-card ${
                        isActive ? "border-primary/50 ring-2 ring-primary/20" : "border-border"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="relative shrink-0">
                          <div className="h-11 w-11 rounded-xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center text-primary group-hover:bg-primary/15 transition-colors">
                            <Icon size={18} />
                          </div>
                          <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-background border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                            {chapter.index}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-primary font-semibold tabular-nums">
                              {chapter.timestamp}
                            </span>
                            <span className="text-border">•</span>
                            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                              Capítulo {chapter.index}
                            </span>
                          </div>
                          <h3 className="font-display text-base sm:text-lg font-semibold leading-tight mb-1">
                            {chapter.title}
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {chapter.description}
                          </p>
                        </div>

                        <PlayCircle
                          size={20}
                          className="text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0 mt-1"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* What you'll learn */}
          <section className="container mx-auto px-4 pb-16 sm:pb-24">
            <div className="max-w-5xl mx-auto rounded-[var(--radius-card)] border border-border bg-card overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="p-8 sm:p-10 lg:p-12 border-b lg:border-b-0 lg:border-r border-border">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
                    <CheckCircle2 size={12} />
                    O QUE VOCÊ VAI DOMINAR
                  </div>
                  <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-4">
                    Saia do tour pronto pra operar no dia 1.
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    O tour foi pensado pra que você e seu time entendam não só onde clicar,
                    mas <strong className="text-foreground">como cada módulo gera resultado real</strong> dentro da sua operação comercial.
                  </p>
                  <Button
                    variant="hero"
                    size="lg"
                    onClick={() => navigate("/signup")}
                    className="gap-2"
                  >
                    Começar trial gratuito de 7 dias
                    <ArrowRight size={16} />
                  </Button>
                </div>

                <div className="p-8 sm:p-10 lg:p-12 bg-secondary/30">
                  <ul className="space-y-4">
                    {[
                      "Configurar seu primeiro nicho de prospecção em menos de 2 minutos",
                      "Disparar campanhas seguras sem risco de bloqueio",
                      "Criar agentes de IA que conversam, qualificam e fecham",
                      "Operar o CRM em equipe com pipeline e score automático",
                      "Manter seus números aquecidos e saudáveis 24/7",
                      "Acompanhar receita projetada e KPIs em tempo real",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <div className="h-5 w-5 rounded-full bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center text-primary shrink-0 mt-0.5">
                          <CheckCircle2 size={12} strokeWidth={2.5} />
                        </div>
                        <span className="text-sm text-foreground/90 leading-relaxed">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="container mx-auto px-4 pb-20 sm:pb-28">
            <div className="max-w-3xl mx-auto text-center">
              <h3 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                Pronto pra colocar em prática?
              </h3>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                7 dias de trial gratuito. Sem cobrança no primeiro dia. Cancele direto na
                plataforma a qualquer momento, sem burocracia e sem contrato.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="hero"
                  size="lg"
                  onClick={() => navigate("/signup")}
                  className="gap-2"
                >
                  Começar agora
                  <ArrowRight size={16} />
                </Button>
                <Button
                  variant="hero-outline"
                  size="lg"
                  onClick={() => navigate("/contato")}
                >
                  Falar com o time
                </Button>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default TourCompleto;
