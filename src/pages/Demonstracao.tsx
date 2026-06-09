import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, PlayCircle, CheckCircle2, Target, Bot, Kanban, MessageCircle,
  Workflow, BarChart3, Sparkles, X, Building2, Briefcase, Users, Megaphone,
  Handshake, TrendingUp, Clock, ShieldCheck, Zap, LineChart, Layers, Eye,
  AlertTriangle, ArrowDown,
} from "lucide-react";
import { SEO } from "@/components/SEO";
import LightThemeWrapper from "@/components/LightThemeWrapper";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

/* ---------------- helpers ---------------- */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const Section = ({
  children, id, className = "",
}: { children: React.ReactNode; id?: string; className?: string }) => (
  <section id={id} className={`relative w-full py-20 sm:py-28 ${className}`}>
    <div className="container mx-auto px-4 max-w-7xl">{children}</div>
  </section>
);

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs sm:text-sm text-primary font-semibold uppercase tracking-[0.18em] mb-4">
    {children}
  </p>
);

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-[1.1] tracking-tight">
    {children}
  </h2>
);

/* ---------------- Video Modal (local, lightweight) ---------------- */
const DemoVideo = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      className="w-[96vw] max-w-none max-h-[94vh] p-0 gap-0 border-0 bg-background shadow-2xl rounded-2xl overflow-hidden [&>button]:hidden"
      style={{ width: "min(96vw, calc((100vh - 6rem) * 16 / 9), 1480px)" }}
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <PlayCircle size={16} className="text-primary" />
          <span className="text-sm font-semibold">Demonstração — Wiize</span>
        </div>
        <button onClick={() => onOpenChange(false)} className="p-2 rounded-lg hover:bg-secondary">
          <X size={16} />
        </button>
      </div>
      <div className="relative w-full bg-card" style={{ aspectRatio: "16 / 9" }}>
        <iframe
          className="absolute inset-0 h-full w-full"
          src="https://www.youtube.com/embed/ZRzK42SYNFc?rel=0&modestbranding=1&autoplay=1&playsinline=1"
          title="Wiize — Demonstração"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    </DialogContent>
  </Dialog>
);

/* ---------------- HERO ---------------- */
const Hero = ({ onWatch }: { onWatch: () => void }) => (
  <Section className="pt-28 sm:pt-32 pb-12 sm:pb-16">
    <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
      <motion.div initial="hidden" animate="show" variants={fadeUp}>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
          <Sparkles size={13} className="text-primary" />
          <span className="text-xs font-semibold text-primary tracking-wide">Demonstração da Plataforma</span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight text-foreground">
          Transforme seu processo comercial em uma operação{" "}
          <span className="text-shimmer-highlight">inteligente, escalável e previsível.</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-xl">
          A Wiize combina Inteligência Artificial, prospecção inteligente, automações, WhatsApp e CRM
          em uma única plataforma para sua empresa gerar mais oportunidades e vender mais com menos
          esforço operacional.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Button variant="hero" size="xl" className="rounded-full group" onClick={onWatch}>
            <PlayCircle size={18} className="mr-1" />
            Assistir Demonstração
          </Button>
          <Link to="/signup">
            <Button variant="outline" size="xl" className="rounded-full group w-full sm:w-auto">
              Solicitar Acesso
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        <ul className="mt-8 grid grid-cols-2 gap-3 max-w-lg">
          {[
            "Mais produtividade",
            "Mais oportunidades",
            "Menos trabalho manual",
            "Mais previsibilidade",
          ].map((t) => (
            <li key={t} className="flex items-center gap-2 text-sm text-foreground/80">
              <CheckCircle2 size={16} className="text-primary shrink-0" />
              {t}
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Video panel */}
      <motion.button
        type="button"
        onClick={onWatch}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="group relative w-full aspect-video rounded-2xl overflow-hidden border border-border bg-card shadow-2xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-primary/5" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/30 blur-2xl group-hover:bg-primary/50 transition" />
            <div className="relative w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl group-hover:scale-110 transition">
              <PlayCircle size={42} strokeWidth={1.5} />
            </div>
          </div>
        </div>
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur border border-border">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-semibold">Tour da plataforma · 4 min</span>
        </div>
        <div className="absolute bottom-4 right-4 text-xs text-muted-foreground bg-background/80 backdrop-blur border border-border rounded-full px-3 py-1.5">
          HD 1080p
        </div>
      </motion.button>
    </div>
  </Section>
);

/* ---------------- PROBLEM ---------------- */
const Problem = () => {
  const pains = [
    { icon: Clock, title: "Leads esquecidos", desc: "Oportunidades morrem na caixa de entrada." },
    { icon: AlertTriangle, title: "Falta de acompanhamento", desc: "Negociações sem follow-up consistente." },
    { icon: Layers, title: "Muito trabalho manual", desc: "Equipe gasta horas em tarefas operacionais." },
    { icon: Briefcase, title: "Dependência do dono", desc: "Tudo trava sem o fundador no operacional." },
    { icon: TrendingUp, title: "Baixa produtividade", desc: "Resultados estagnados mesmo crescendo time." },
    { icon: BarChart3, title: "Dificuldade para escalar", desc: "Crescer significa contratar mais e mais gente." },
    { icon: Eye, title: "Falta de previsibilidade", desc: "Mês começa sem saber quanto vai entrar." },
    { icon: Workflow, title: "Informações espalhadas", desc: "Planilhas, WhatsApp, e-mail, papel..." },
  ];

  return (
    <Section className="bg-secondary/30 border-y border-border">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-3xl mx-auto">
        <Eyebrow>O problema real</Eyebrow>
        <H2>Sua equipe está crescendo ou apenas trabalhando mais?</H2>
        <p className="mt-5 text-lg text-muted-foreground">
          A maioria das operações comerciais não tem um problema de esforço. Tem um problema de inteligência operacional.
        </p>
      </motion.div>

      <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {pains.map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04 }}
            className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-lg transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <p.icon size={20} />
            </div>
            <h3 className="font-semibold text-foreground mb-1.5">{p.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-14 text-center max-w-3xl mx-auto p-8 rounded-2xl bg-card border border-border">
        <p className="text-lg sm:text-xl text-foreground font-medium leading-relaxed">
          Contratar mais pessoas <span className="text-muted-foreground">nem sempre resolve.</span><br />
          Em muitos casos o que falta é <span className="text-primary font-semibold">inteligência operacional</span>.
        </p>
      </div>
    </Section>
  );
};

/* ---------------- NEW WAY (comparison) ---------------- */
const NewWay = () => {
  const old = ["Trabalho manual", "Sem automação", "Pouca visibilidade", "Processos dispersos", "Dependência de pessoas"];
  const wnew = ["Inteligência Artificial", "Fluxos automatizados", "Centralização total", "Produtividade ampliada", "Escalabilidade real"];

  return (
    <Section>
      <div className="text-center max-w-3xl mx-auto">
        <Eyebrow>A nova forma de vender</Eyebrow>
        <H2>A evolução do comercial tradicional.</H2>
        <p className="mt-5 text-lg text-muted-foreground">
          De operações que dependem de pessoas para operações que escalam com inteligência.
        </p>
      </div>

      <div className="mt-14 grid md:grid-cols-2 gap-6 relative">
        <motion.div
          initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
          className="p-8 rounded-2xl bg-card border border-border"
        >
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold px-2.5 py-1 rounded-full bg-muted">
              Modelo tradicional
            </span>
          </div>
          <ul className="space-y-3">
            {old.map((t) => (
              <li key={t} className="flex items-center gap-3 text-foreground/70">
                <X size={18} className="text-destructive shrink-0" />
                <span className="line-through decoration-destructive/40">{t}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
          className="relative p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-card to-card border border-primary/30 shadow-xl"
        >
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs uppercase tracking-wider text-primary font-bold px-2.5 py-1 rounded-full bg-primary/15">
              Modelo Wiize
            </span>
          </div>
          <ul className="space-y-3">
            {wnew.map((t) => (
              <li key={t} className="flex items-center gap-3 text-foreground font-medium">
                <CheckCircle2 size={18} className="text-primary shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        </motion.div>

        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-background border-2 border-primary items-center justify-center font-bold text-primary text-xs shadow-lg">
          VS
        </div>
      </div>
    </Section>
  );
};

/* ---------------- MODULES ---------------- */
const Modules = () => {
  const mods = [
    { icon: Target, title: "Prospecção Inteligente", desc: "Encontre empresas com real potencial de compra usando inteligência comercial." },
    { icon: Bot, title: "Agente de IA Comercial", desc: "Automatize tarefas repetitivas e amplie a produtividade da operação." },
    { icon: Kanban, title: "CRM Comercial", desc: "Gerencie oportunidades e acompanhe negociações em tempo real." },
    { icon: MessageCircle, title: "WhatsApp Integrado", desc: "Centralize comunicação e relacionamento em um único lugar." },
    { icon: Workflow, title: "Automações Comerciais", desc: "Crie fluxos que trabalham continuamente para sua equipe." },
    { icon: BarChart3, title: "Métricas e Performance", desc: "Transforme dados em decisões com painéis em tempo real." },
  ];

  return (
    <Section id="modulos" className="bg-secondary/30 border-y border-border">
      <div className="text-center max-w-3xl mx-auto">
        <Eyebrow>A plataforma</Eyebrow>
        <H2>Tudo o que sua operação precisa em um só lugar.</H2>
        <p className="mt-5 text-lg text-muted-foreground">
          Seis módulos integrados que substituem dezenas de ferramentas e processos manuais.
        </p>
      </div>

      <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {mods.map((m, i) => (
          <motion.div
            key={m.title}
            initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="group relative p-7 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-xl transition-all overflow-hidden"
          >
            <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-primary/5 group-hover:bg-primary/10 blur-2xl transition" />
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                <m.icon size={22} />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mb-2">{m.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>

              {/* Mockup placeholder */}
              <div className="mt-6 aspect-[16/9] rounded-xl border border-border bg-gradient-to-br from-secondary/60 to-background flex items-center justify-center">
                <m.icon size={28} className="text-muted-foreground/40" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
};

/* ---------------- INTERACTIVE DEMO ---------------- */
const InteractiveDemo = () => {
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3, desc: "Visão executiva em tempo real: pipeline, conversão, receita projetada e alertas." },
    { id: "crm", label: "CRM", icon: Kanban, desc: "Kanban inteligente, scoring automático, histórico completo e ações em um clique." },
    { id: "ia", label: "IA", icon: Bot, desc: "Agentes de IA que qualificam leads, respondem no WhatsApp e movem oportunidades sozinhos." },
    { id: "fluxos", label: "Fluxos", icon: Workflow, desc: "Construa automações com mensagens, esperas, condições e integrações." },
    { id: "prosp", label: "Prospecção", icon: Target, desc: "Encontre empresas pelo ICP, enriqueça dados e exporte para o CRM." },
    { id: "wpp", label: "WhatsApp", icon: MessageCircle, desc: "Conversas centralizadas, modelos, campanhas e atendimento humano + IA." },
  ];
  const [active, setActive] = useState(tabs[0].id);
  const cur = tabs.find((t) => t.id === active)!;

  return (
    <Section id="demo">
      <div className="text-center max-w-3xl mx-auto">
        <Eyebrow>Demonstração interativa</Eyebrow>
        <H2>Explore a plataforma por dentro.</H2>
        <p className="mt-5 text-lg text-muted-foreground">
          Navegue pelos módulos e veja como cada parte se conecta na prática.
        </p>
      </div>

      <div className="mt-12 rounded-3xl border border-border bg-card overflow-hidden shadow-2xl">
        <div className="flex flex-wrap gap-1 p-2 border-b border-border bg-secondary/40">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active === t.id
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/60"
              }`}
            >
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_1.4fr]">
          <div className="p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-border">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
              <cur.icon size={22} />
            </div>
            <h3 className="font-display text-2xl font-bold mb-3">{cur.label}</h3>
            <p className="text-muted-foreground leading-relaxed">{cur.desc}</p>
            <ul className="mt-6 space-y-2.5">
              {["Configuração em minutos", "Dados em tempo real", "Integração nativa com os demais módulos"].map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm text-foreground/80">
                  <CheckCircle2 size={15} className="text-primary" /> {b}
                </li>
              ))}
            </ul>
          </div>

          <motion.div
            key={cur.id}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
            className="relative bg-gradient-to-br from-secondary/60 to-background min-h-[360px] flex items-center justify-center p-8"
          >
            <div className="w-full max-w-xl aspect-[16/10] rounded-2xl border border-border bg-card shadow-xl flex flex-col">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border">
                <span className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-primary/70" />
                <span className="ml-3 text-xs text-muted-foreground">wiize.app / {cur.id}</span>
              </div>
              <div className="flex-1 grid grid-cols-3 gap-3 p-5">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="rounded-lg bg-secondary/70 border border-border p-3 flex flex-col gap-2">
                    <div className="w-7 h-7 rounded-md bg-primary/15" />
                    <div className="h-1.5 w-3/4 rounded bg-muted-foreground/20" />
                    <div className="h-1.5 w-1/2 rounded bg-muted-foreground/15" />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </Section>
  );
};

/* ---------------- RESULTS ---------------- */
const Results = () => {
  const before = ["Mais trabalho", "Menos controle", "Menos oportunidades"];
  const after = ["Mais produtividade", "Mais organização", "Mais oportunidades", "Mais previsibilidade", "Mais eficiência"];
  return (
    <Section className="bg-secondary/30 border-y border-border">
      <div className="text-center max-w-3xl mx-auto">
        <Eyebrow>O que muda</Eyebrow>
        <H2>O que muda quando a Wiize entra na operação.</H2>
      </div>

      <div className="mt-14 grid md:grid-cols-2 gap-6 items-stretch">
        <div className="p-8 rounded-2xl border border-border bg-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-5">Antes</p>
          <ul className="space-y-3">
            {before.map((b) => (
              <li key={b} className="flex items-center gap-3 text-foreground/70">
                <X size={16} className="text-destructive" /> {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="p-8 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-card shadow-xl">
          <p className="text-xs uppercase tracking-wider text-primary font-bold mb-5">Depois</p>
          <ul className="space-y-3">
            {after.map((b) => (
              <li key={b} className="flex items-center gap-3 text-foreground font-medium">
                <CheckCircle2 size={16} className="text-primary" /> {b}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
};

/* ---------------- FOR WHOM ---------------- */
const ForWhom = () => {
  const items = [
    { icon: Megaphone, title: "Agências de Marketing", desc: "Captam leads B2B qualificados para clientes e escalam a operação comercial." },
    { icon: Building2, title: "Empresas B2B", desc: "Estruturam funil completo: do lead frio ao fechamento, com IA e CRM unificados." },
    { icon: Briefcase, title: "Representantes Comerciais", desc: "Aumentam a carteira ativa com prospecção automatizada e follow-up por IA." },
    { icon: Users, title: "Consultorias", desc: "Padronizam aquisição, qualificam reuniões e mostram resultado em dashboards." },
    { icon: ShieldCheck, title: "Prestadores de Serviço", desc: "Geram oportunidades constantes sem depender de indicação ou mídia paga." },
  ];
  return (
    <Section>
      <div className="text-center max-w-3xl mx-auto">
        <Eyebrow>Para quem é</Eyebrow>
        <H2>Operações que crescem com Wiize.</H2>
      </div>
      <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((it, i) => (
          <motion.div
            key={it.title}
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="p-7 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <it.icon size={20} />
            </div>
            <h3 className="font-semibold text-lg mb-1.5">{it.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{it.desc}</p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
};

/* ---------------- DIFFERENTIAL ---------------- */
const Differential = () => (
  <Section className="bg-secondary/30 border-y border-border">
    <div className="max-w-4xl mx-auto text-center">
      <Eyebrow>Diferencial estratégico</Eyebrow>
      <H2>Não somos apenas mais um CRM.</H2>
      <div className="mt-8 space-y-5 text-lg text-muted-foreground leading-relaxed">
        <p>
          A maioria das ferramentas ajuda empresas a <span className="text-foreground">organizar informações</span>.
        </p>
        <p>
          A Wiize ajuda empresas a <span className="text-foreground font-semibold">ampliar sua capacidade comercial</span>.
        </p>
        <p>
          Combinamos Inteligência Artificial, automações, prospecção inteligente e gestão comercial
          para transformar produtividade em crescimento.
        </p>
      </div>
      <div className="mt-12 grid sm:grid-cols-3 gap-4">
        {[
          { icon: Zap, label: "Velocidade operacional" },
          { icon: LineChart, label: "Crescimento previsível" },
          { icon: ShieldCheck, label: "Autoridade tecnológica" },
        ].map((i) => (
          <div key={i.label} className="p-5 rounded-2xl border border-border bg-card flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <i.icon size={18} />
            </div>
            <span className="text-sm font-semibold">{i.label}</span>
          </div>
        ))}
      </div>
    </div>
  </Section>
);

/* ---------------- PARTNERS ---------------- */
const Partners = () => (
  <Section>
    <div className="rounded-3xl overflow-hidden border border-border bg-gradient-to-br from-card via-card to-primary/5">
      <div className="grid lg:grid-cols-2 gap-10 p-10 sm:p-14 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-5">
            <Handshake size={13} className="text-primary" />
            <span className="text-xs font-semibold text-primary">Wiize Partners</span>
          </div>
          <H2>Ganhe dinheiro indicando a Wiize.</H2>
          <p className="mt-5 text-muted-foreground leading-relaxed">
            Programa de parceria com comissão recorrente, materiais prontos, treinamentos e dashboard
            de acompanhamento em tempo real.
          </p>
          <Link to="/parceiros" className="inline-block mt-7">
            <Button variant="hero" size="lg" className="rounded-full group">
              Quero ser parceiro
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: TrendingUp, t: "Comissão recorrente", d: "Receba todo mês enquanto o cliente assinar." },
            { icon: Layers, t: "Materiais prontos", d: "Apresentações, vídeos e copies prontos para vender." },
            { icon: Sparkles, t: "Treinamentos", d: "Aprenda a vender Wiize com a metodologia oficial." },
            { icon: BarChart3, t: "Dashboard próprio", d: "Acompanhe leads, vendas e comissões em tempo real." },
          ].map((b) => (
            <div key={b.t} className="p-5 rounded-2xl bg-background border border-border">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                <b.icon size={18} />
              </div>
              <h4 className="font-semibold text-sm mb-1">{b.t}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{b.d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </Section>
);

/* ---------------- FINAL CTA ---------------- */
const FinalCTA = ({ onWatch }: { onWatch: () => void }) => (
  <Section className="bg-secondary/30 border-t border-border">
    <div className="text-center max-w-3xl mx-auto">
      <Eyebrow>Próximo passo</Eyebrow>
      <H2>Sua equipe está pronta para vender mais?</H2>
      <p className="mt-5 text-lg text-muted-foreground">
        Conheça a plataforma que está ajudando empresas a transformar processos comerciais em
        operações inteligentes.
      </p>
      <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
        <Link to="/signup">
          <Button variant="hero" size="xl" className="rounded-full group w-full sm:w-auto">
            Solicitar Acesso
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
        <Link to="/contato">
          <Button variant="outline" size="xl" className="rounded-full w-full sm:w-auto">
            Falar com Especialista
          </Button>
        </Link>
        <Link to="/parceiros">
          <Button variant="ghost" size="xl" className="rounded-full w-full sm:w-auto">
            Quero ser Parceiro
          </Button>
        </Link>
      </div>
      <button onClick={onWatch} className="mt-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition">
        <PlayCircle size={16} /> Ou assista a demonstração novamente
      </button>
    </div>
  </Section>
);

/* ---------------- PAGE ---------------- */
const Demonstracao = () => {
  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <LightThemeWrapper>
      <SEO
        title="Demonstração da plataforma Wiize — Inteligência comercial B2B"
        description="Conheça por dentro a plataforma Wiize: IA, prospecção, CRM, WhatsApp e automações para transformar seu processo comercial em uma operação inteligente, escalável e previsível."
        url="https://wiize.com.br/demonstracao"
      />
      <main className="min-h-screen bg-background overflow-x-hidden relative">
        <div
          className="hidden sm:block fixed inset-0 pointer-events-none overflow-hidden z-0"
          style={{ contain: "strict" }}
          aria-hidden="true"
        >
          <div
            className="absolute -top-[20%] -right-[10%] w-[60%] h-[50%] rounded-full opacity-[0.07]"
            style={{ background: "radial-gradient(ellipse, hsl(158 72% 45%), transparent 70%)" }}
          />
          <div
            className="absolute top-[50%] -left-[15%] w-[50%] h-[50%] rounded-full opacity-[0.05]"
            style={{ background: "radial-gradient(ellipse, hsl(200 80% 55%), transparent 70%)" }}
          />
        </div>

        <div className="relative z-10">
          <Navbar />
          <Hero onWatch={() => setVideoOpen(true)} />
          <Problem />
          <NewWay />
          <Modules />
          <InteractiveDemo />
          <Results />
          <ForWhom />
          <Differential />
          <Partners />
          <FinalCTA onWatch={() => setVideoOpen(true)} />
          <Footer />
        </div>

        <DemoVideo open={videoOpen} onOpenChange={setVideoOpen} />
      </main>
    </LightThemeWrapper>
  );
};

export default Demonstracao;
