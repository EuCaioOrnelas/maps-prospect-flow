import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  MessageSquare,
  Workflow,
  Users,
  Zap,
  ShieldCheck,
  Clock,
  CalendarDays,
  ArrowRight,
  Sparkles,
  Bot,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { SEO } from "@/components/SEO";

const LAUNCH_DATE = new Date("2026-09-28T00:00:00-03:00");

function useCountdown(target: Date) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = Math.max(0, target.getTime() - now.getTime());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isLive: diff <= 0 };
}

const features = [
  {
    icon: Brain,
    title: "Agentes com cérebro próprio",
    desc: "Cada colaborador digital aprende seu negócio, tom de voz e processos. Nada de configurar prompt manualmente.",
  },
  {
    icon: MessageSquare,
    title: "Atendimento 24/7 no WhatsApp",
    desc: "Responde leads em segundos, qualifica, agenda reuniões e nutre enquanto seu time dorme.",
  },
  {
    icon: Workflow,
    title: "Conexão com CRM e Fluxos",
    desc: "Movimenta leads no Kanban, dispara campanhas e integra automaticamente com seus fluxos existentes.",
  },
  {
    icon: Users,
    title: "Equipe inteira em minutos",
    desc: "Monte SDRs, Closers, Suporte e Pós-venda em um único painel visual. Sem código, sem burocracia.",
  },
  {
    icon: Zap,
    title: "Ativação em menos de 2 minutos",
    desc: "Escolha um modelo pronto, ajuste detalhes e publique. Simples como deveria ser.",
  },
  {
    icon: ShieldCheck,
    title: "Controle total e versionamento",
    desc: "Teste antes de publicar, salve versões e restaure quando quiser. Segurança de produto enterprise.",
  },
];

const roadmap = [
  { phase: "Fase 1 — Fundação", status: "done", label: "Em desenvolvimento" },
  { phase: "Fase 2 — Agentes Autônomos", status: "doing", label: "Em desenvolvimento" },
  { phase: "Fase 3 — Integração CRM", status: "soon", label: "Previsto" },
  { phase: "Fase 4 — Lançamento Público", status: "locked", label: "28/09/2026" },
];

export default function EquipeEmBreve() {
  const { profile } = useAuth();
  const { days, hours, minutes, seconds, isLive } = useCountdown(LAUNCH_DATE);

  return (
    <>
      <SEO title="Equipe IA — Em breve na Wiize" />
      <div className="flex min-h-screen bg-background">
        <AppSidebar profile={profile} />
        <div className="flex-1 flex flex-col min-w-0 lg:pl-[72px]">
          <AppHeader profile={profile} />

          <main className="flex-1 overflow-y-auto">
            {/* Hero */}
            <section className="relative overflow-hidden border-b border-border">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
                <div className="absolute top-20 -left-20 w-72 h-72 rounded-full bg-primary/3 blur-3xl" />
              </div>

              <div className="relative max-w-5xl mx-auto px-6 py-16 md:py-24 text-center">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Badge
                    variant="outline"
                    className="mb-6 px-3 py-1 text-xs font-medium border-primary/20 text-primary bg-primary/5"
                  >
                    <Sparkles className="w-3 h-3 mr-1.5" />
                    Em breve na Wiize
                  </Badge>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/15 flex items-center justify-center mb-8">
                    <Bot className="w-10 h-10 text-primary" />
                  </div>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.15 }}
                  className="text-4xl md:text-5xl font-bold tracking-tight mb-5"
                >
                  Equipe IA
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
                >
                  Sua nova equipe de{" "}
                  <span className="text-foreground font-medium">
                    colaboradores digitais
                  </span>
                  . Atendem, qualificam, vendem e movimentam seu CRM 24/7 —
                  sem precisar contratar mais ninguém.
                </motion.p>

                {/* Countdown */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="inline-flex items-center gap-3 md:gap-5 mb-4"
                >
                  {[
                    { value: days, label: "dias" },
                    { value: hours, label: "horas" },
                    { value: minutes, label: "min" },
                    { value: seconds, label: "seg" },
                  ].map((unit, i) => (
                    <div key={unit.label} className="flex flex-col items-center">
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-card border border-border flex items-center justify-center">
                        <span className="text-2xl md:text-3xl font-bold tabular-nums">
                          {String(unit.value).padStart(2, "0")}
                        </span>
                      </div>
                      <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider mt-2">
                        {unit.label}
                      </span>
                    </div>
                  ))}
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="text-sm text-muted-foreground flex items-center justify-center gap-2"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  Lançamento em{" "}
                  <span className="font-medium text-foreground">
                    28 de setembro de 2026
                  </span>
                </motion.p>
              </div>
            </section>

            {/* Features grid */}
            <section className="max-w-6xl mx-auto px-6 py-16">
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
                  Uma equipe inteira trabalhando por você
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Imagine ter SDRs, closers e suporte operando o tempo todo,
                  sem folga, sem erro humano e sem headcount extra.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {features.map((f, i) => (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.4, delay: i * 0.06 }}
                  >
                    <Card className="p-6 h-full border border-border/60 hover:border-primary/20 transition-colors group">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                        <f.icon className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-2">{f.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {f.desc}
                      </p>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Roadmap teaser */}
            <section className="max-w-3xl mx-auto px-6 pb-16">
              <div className="rounded-2xl border border-border bg-card/50 p-8 md:p-10">
                <div className="flex items-center gap-3 mb-8">
                  <Clock className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">O que está por vir</h3>
                </div>

                <div className="relative">
                  {/* timeline line */}
                  <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

                  <div className="space-y-8">
                    {roadmap.map((item, i) => (
                      <div key={item.phase} className="relative pl-8">
                        <div
                          className={`absolute left-0 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            item.status === "done"
                              ? "bg-primary border-primary"
                              : item.status === "doing"
                                ? "bg-primary/10 border-primary animate-pulse"
                                : item.status === "soon"
                                  ? "bg-background border-border"
                                  : "bg-background border-dashed border-border"
                          }`}
                        >
                          {item.status === "done" && (
                            <svg
                              className="w-3 h-3 text-primary-foreground"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {item.phase}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] h-5 ${
                                item.status === "done"
                                  ? "border-primary/20 text-primary bg-primary/5"
                                  : item.status === "doing"
                                    ? "border-primary/20 text-primary bg-primary/5"
                                    : "border-border text-muted-foreground"
                              }`}
                            >
                              {item.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-10 pt-8 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-6">
                    Enquanto isso, aproveite os módulos já disponíveis:
                    Prospecção IA, Fluxos de WhatsApp, Aquecimento de Números e
                    Chat Multiatendimento.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { label: "Prospecção IA", path: "/oportunidades" },
                      { label: "Fluxos", path: "/fluxos" },
                      { label: "Aquecimento", path: "/warming" },
                      { label: "Chat", path: "/chat" },
                    ].map((link) => (
                      <a
                        key={link.path}
                        href={link.path}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                      >
                        {link.label}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </>
  );
}
