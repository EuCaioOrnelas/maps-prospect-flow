import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Award, TrendingUp, Users, Wallet, Sparkles, ArrowRight,
  Megaphone, Target, Rocket, Crown, ShieldCheck, Check,
} from "lucide-react";
import wiizeLogo from "@/assets/wiize-logo.png";

const APPLY_PATH = "/partners/apply";

const tiers = [
  {
    name: "Bronze",
    percent: "10%",
    range: "0 – 99 clientes",
    color: "from-amber-700/15 to-amber-700/0",
    iconColor: "text-amber-700",
    icon: ShieldCheck,
  },
  {
    name: "Silver",
    percent: "15%",
    range: "100 – 249 clientes",
    color: "from-slate-400/15 to-slate-400/0",
    iconColor: "text-slate-500",
    icon: Award,
  },
  {
    name: "Gold",
    percent: "20%",
    range: "250 – 499 clientes",
    color: "from-yellow-500/15 to-yellow-500/0",
    iconColor: "text-yellow-600",
    icon: Rocket,
    highlight: true,
  },
  {
    name: "Platinum",
    percent: "25%",
    range: "500+ clientes",
    color: "from-purple-500/15 to-purple-500/0",
    iconColor: "text-purple-600",
    icon: Crown,
  },
];

const benefits = [
  { icon: Wallet, title: "Comissão recorrente por 24 meses", desc: "Você ganha sobre cada renovação do cliente indicado, mês após mês, durante 2 anos." },
  { icon: TrendingUp, title: "Níveis progressivos até 25%", desc: "Quanto mais clientes ativos, maior sua porcentagem de comissão sobre cada venda." },
  { icon: Megaphone, title: "Materiais prontos", desc: "Banners, copies, posts e roteiros validados — você só compartilha o seu link exclusivo." },
  { icon: Target, title: "Atribuição last-click 2 anos", desc: "Mesmo que o lead leve meses para fechar, a venda continua vinculada a você." },
  { icon: Users, title: "Painel completo em tempo real", desc: "Cliques, leads, conversões, comissões pendentes e disponíveis para saque, num só lugar." },
  { icon: Sparkles, title: "Saque a partir de R$ 100", desc: "Pix em até 5 dias úteis após aprovação. Sem burocracia, sem letra miúda." },
];

const steps = [
  { n: "01", t: "Candidate-se", d: "Preencha o formulário oficial. Análise em até 48h úteis." },
  { n: "02", t: "Receba seu link", d: "Acesso ao portal Wiize Partners e link único de indicação." },
  { n: "03", t: "Indique e ganhe", d: "Cada venda gerada vira comissão recorrente no seu painel." },
];

const faq = [
  { q: "Como funciona a atribuição last-click?", a: "Quando alguém clica no seu link, gravamos um cookie por 2 anos. Toda venda dessa pessoa nesse período é sua, mesmo que ela leve meses para fechar." },
  { q: "Quando recebo a comissão?", a: "Cada venda gera uma comissão pendente, liberada após 30 dias (período de proteção contra estorno). Após liberada, você solicita saque via Pix com saldo mínimo de R$ 100." },
  { q: "A comissão é recorrente?", a: "Sim. Você recebe sobre cada renovação do cliente indicado durante 24 meses." },
  { q: "Preciso pagar para participar?", a: "Não. O programa Wiize Partners é 100% gratuito." },
  { q: "Como subo de nível?", a: "A progressão é automática conforme o número de clientes ativos indicados por você cresce. Bronze (0+), Silver (100+), Gold (250+) e Platinum (500+)." },
  { q: "Posso indicar a mim mesmo?", a: "Não. O sistema bloqueia auto-indicação automaticamente." },
];

export default function PartnersLanding() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <Helmet>
        <title>Wiize Partners — Comissão recorrente até 25% indicando a Wiize</title>
        <meta name="description" content="Indique a Wiize, receba até 25% de comissão recorrente por 24 meses. Atribuição last-click, materiais prontos e saque via Pix. Candidate-se ao Wiize Partners." />
        <link rel="canonical" href="https://wiize.com.br/parceiros" />
      </Helmet>

      {/* NAV */}
      <nav className="px-6 py-4 border-b border-border/40 backdrop-blur-md bg-background/80 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={wiizeLogo} alt="Wiize" className="h-7 w-7" />
            <span className="font-semibold text-lg tracking-tight">Wiize Partners</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/partners/login" className="text-sm text-muted-foreground hover:text-foreground transition">
              Já sou parceiro
            </Link>
            <Button size="sm" asChild>
              <Link to={APPLY_PATH}>Candidatar-se</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative px-6 pt-24 pb-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[520px] w-[820px] rounded-full bg-primary/15 blur-[120px]" />
          <div className="absolute top-40 right-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6 ring-1 ring-primary/20">
            <Sparkles size={14} /> Programa oficial Wiize Partners
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05] mb-6">
            Indique a Wiize.<br />
            <span className="bg-gradient-to-r from-primary via-primary/70 to-primary bg-clip-text text-transparent">
              Receba até 25% por 24 meses.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Comissão recorrente sobre toda venda gerada pelo seu link.
            Atribuição last-click. Materiais prontos. Saque via Pix.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" className="gap-2 px-8 shadow-lg shadow-primary/20" asChild>
              <Link to={APPLY_PATH}>
                Quero ser parceiro <ArrowRight size={18} />
              </Link>
            </Button>
            <a href="#como-funciona">
              <Button size="lg" variant="outline">Como funciona</Button>
            </a>
          </div>
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {[
              { v: "25%", l: "comissão máxima" },
              { v: "24 meses", l: "recorrência" },
              { v: "R$ 100", l: "saque mínimo" },
              { v: "5 dias", l: "para receber" },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm py-4">
                <div className="text-2xl md:text-3xl font-bold tracking-tight">{s.v}</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="px-6 py-24 bg-card/30 border-y border-border/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">Como funciona</h2>
            <p className="text-muted-foreground">Três passos. Sem burocracia. Comissão automática.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {steps.map((s) => (
              <Card key={s.n} className="border-border/50 bg-card/60 backdrop-blur-sm hover:border-primary/30 transition-colors">
                <CardContent className="p-7">
                  <div className="text-5xl font-semibold text-primary/25 mb-3">{s.n}</div>
                  <h3 className="font-semibold text-lg mb-2">{s.t}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.d}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* TIERS */}
      <section className="px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">
              Quanto mais você indica, mais você ganha
            </h2>
            <p className="text-muted-foreground">
              Níveis progressivos baseados em clientes ativos gerados.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {tiers.map((t) => (
              <Card
                key={t.name}
                className={`relative overflow-hidden border-border/50 bg-gradient-to-br ${t.color} ${
                  t.highlight ? "ring-2 ring-primary/40 shadow-lg shadow-primary/10" : ""
                }`}
              >
                {t.highlight && (
                  <div className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                    Popular
                  </div>
                )}
                <CardContent className="p-6 text-center">
                  <t.icon size={30} className={`${t.iconColor} mx-auto mb-3`} />
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t.name}</div>
                  <div className="text-4xl font-semibold tracking-tight mb-1">{t.percent}</div>
                  <div className="text-xs text-muted-foreground">de comissão</div>
                  <div className="mt-5 pt-4 border-t border-border/50 text-xs text-muted-foreground">
                    Clientes ativos<br />
                    <strong className="text-foreground font-semibold">{t.range}</strong>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-8">
            Todo parceiro começa em <strong className="text-foreground">Bronze (10%)</strong>. A progressão é automática conforme seus clientes ativos crescem.
          </p>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="px-6 py-24 bg-card/30 border-y border-border/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Por que ser parceiro Wiize Partners
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {benefits.map((b) => (
              <div key={b.title} className="flex gap-4 p-5 rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm hover:border-primary/30 transition-colors">
                <div className="shrink-0 h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                  <b.icon size={18} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{b.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF / GUARANTEE STRIP */}
      <section className="px-6 py-12">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-4 text-sm">
          {[
            "Pagamentos via Pix em até 5 dias",
            "Suporte dedicado a parceiros",
            "Programa 100% gratuito, sem taxa",
          ].map((t) => (
            <div key={t} className="flex items-center gap-2 justify-center md:justify-start text-muted-foreground">
              <Check size={16} className="text-primary" /> {t}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-24 border-t border-border/40">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Perguntas frequentes</h2>
          </div>
          <div className="space-y-3">
            {faq.map((f, i) => (
              <details
                key={i}
                className="group border border-border/50 rounded-xl p-5 bg-card/40 hover:border-primary/30 transition-colors"
              >
                <summary className="cursor-pointer font-medium flex items-center justify-between gap-4 list-none">
                  <span>{f.q}</span>
                  <span className="text-muted-foreground transition-transform group-open:rotate-45 text-xl leading-none">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-6 py-24">
        <div className="max-w-4xl mx-auto relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-primary/5 p-10 md:p-14 text-center">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-5 ring-1 ring-primary/20">
              <Sparkles size={13} /> Vagas abertas
            </div>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-5">
              Pronto para começar a ganhar com a Wiize?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
              Candidate-se ao Wiize Partners e tenha acesso ao portal exclusivo,
              link de indicação, materiais prontos e comissão recorrente por 24 meses.
            </p>
            <Button size="lg" className="gap-2 px-8 shadow-lg shadow-primary/25" asChild>
              <Link to={APPLY_PATH}>
                Candidatar-se agora <ArrowRight size={18} />
              </Link>
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">
              Análise em até 48 horas úteis. Sem custo, sem compromisso.
            </p>
          </div>
        </div>
      </section>

      <footer className="px-6 py-8 border-t border-border/40 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Wiize Partners — Programa oficial de parceiros da Wiize.
      </footer>
    </div>
  );
}
