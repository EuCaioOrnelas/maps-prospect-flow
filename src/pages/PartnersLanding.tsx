import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  Award, TrendingUp, Users, Wallet, Sparkles, ArrowRight,
  Megaphone, Target, Rocket, Crown, ShieldCheck, Check,
} from "lucide-react";
import wiizeLogo from "@/assets/logo-icon-new.png";

const APPLY_PATH = "/partners/apply";

interface Settings {
  bronze: number;
  silver: number;
  gold: number;
  platinum: number;
  silverClients: number;
  goldClients: number;
  platinumClients: number;
}

const DEFAULTS: Settings = {
  bronze: 10, silver: 15, gold: 20, platinum: 25,
  silverClients: 100, goldClients: 250, platinumClients: 500,
};

const benefits = [
  { icon: Wallet, title: "Comissão recorrente por 24 meses", desc: "Você ganha sobre cada renovação do cliente indicado, mês após mês, durante 2 anos." },
  { icon: TrendingUp, title: "Níveis progressivos", desc: "Quanto mais clientes ativos, maior sua porcentagem sobre cada venda — automaticamente." },
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
  {
    q: "Como funciona a atribuição last-click?",
    a: "Quando alguém clica no seu link de indicação, gravamos um cookie por 2 anos. Toda venda dessa pessoa nesse período é creditada a você, mesmo que ela leve meses para concluir a contratação. Se outro parceiro for o último clique antes da compra, a comissão vai para ele — por isso vale acompanhar o lead até o fechamento.",
  },
  {
    q: "Quando recebo a comissão?",
    a: "Cada venda gera uma comissão pendente no seu painel. Após 30 dias (período de proteção contra estorno), ela vira disponível para saque. Você solicita o saque via Pix com saldo mínimo de R$ 100 e recebe em até 5 dias úteis.",
  },
  {
    q: "A comissão é realmente recorrente?",
    a: "Sim. Você recebe sobre cada renovação do cliente indicado durante 24 meses. Se o cliente assinar o plano mensal, você ganha todo mês. Se assinar o anual, ganha sobre cada renovação anual dentro da janela de 24 meses.",
  },
  {
    q: "Como subo de nível?",
    a: "A progressão é automática conforme seus clientes ativos crescem. Cada cliente pago e não cancelado conta como 1. O upgrade refletirá na próxima venda gerada após bater a meta.",
  },
  {
    q: "Preciso pagar para participar?",
    a: "Não. O programa Wiize Partners é 100% gratuito. Sem mensalidade, sem taxa de adesão, sem letra miúda.",
  },
  {
    q: "Quanto tempo leva a aprovação?",
    a: "Analisamos toda candidatura em até 48 horas úteis. Você recebe a resposta por e-mail com o status e, se aprovado, suas credenciais de acesso ao portal Wiize Partners.",
  },
  {
    q: "Posso indicar a mim mesmo ou empresas que já são minhas?",
    a: "Não. O sistema bloqueia auto-indicação automaticamente. Indicações fraudulentas resultam em suspensão da conta e perda das comissões pendentes.",
  },
  {
    q: "O que acontece se o cliente cancelar?",
    a: "Comissões já liberadas são suas. Comissões pendentes (dentro dos 30 dias) podem ser estornadas em caso de cancelamento ou chargeback. A partir do cancelamento, novas renovações daquele cliente deixam de gerar comissão.",
  },
];

export default function PartnersLanding() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("partner_settings")
        .select("bronze_commission_percent, silver_commission_percent, gold_commission_percent, platinum_commission_percent, silver_threshold_clients, gold_threshold_clients, platinum_threshold_clients")
        .eq("id", 1)
        .maybeSingle();
      if (!data) return;
      setSettings({
        bronze: Number(data.bronze_commission_percent),
        silver: Number(data.silver_commission_percent),
        gold: Number(data.gold_commission_percent),
        platinum: Number(data.platinum_commission_percent),
        silverClients: data.silver_threshold_clients,
        goldClients: data.gold_threshold_clients,
        platinumClients: data.platinum_threshold_clients,
      });
    })();
  }, []);

  const tiers = [
    {
      name: "Bronze", percent: settings.bronze,
      range: `0 – ${settings.silverClients - 1} clientes`,
      icon: ShieldCheck, iconColor: "text-amber-700",
      grad: "from-amber-700/15 via-amber-700/5 to-transparent",
    },
    {
      name: "Silver", percent: settings.silver,
      range: `${settings.silverClients} – ${settings.goldClients - 1} clientes`,
      icon: Award, iconColor: "text-slate-500",
      grad: "from-slate-400/20 via-slate-400/5 to-transparent",
    },
    {
      name: "Gold", percent: settings.gold,
      range: `${settings.goldClients} – ${settings.platinumClients - 1} clientes`,
      icon: Rocket, iconColor: "text-yellow-600",
      grad: "from-yellow-500/20 via-yellow-500/5 to-transparent",
      highlight: true,
    },
    {
      name: "Platinum", percent: settings.platinum,
      range: `${settings.platinumClients}+ clientes`,
      icon: Crown, iconColor: "text-purple-600",
      grad: "from-purple-500/20 via-purple-500/5 to-transparent",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <Helmet>
        <title>Wiize Partners — Comissão recorrente até {settings.platinum}% indicando a Wiize</title>
        <meta name="description" content={`Indique a Wiize, receba até ${settings.platinum}% de comissão recorrente por 24 meses. Atribuição last-click, materiais prontos e saque via Pix.`} />
        <link rel="canonical" href="https://wiize.com.br/parceiros" />
      </Helmet>

      {/* NAV */}
      <nav className="px-6 py-4 border-b border-border/40 backdrop-blur-md bg-background/80 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={wiizeLogo} alt="Wiize" className="h-7 w-auto" />
            <span className="text-muted-foreground/60 text-sm font-light">/</span>
            <span className="font-semibold text-sm tracking-tight">Partners</span>
          </Link>
          <div className="flex items-center gap-5">
            <a href="#tiers" className="text-sm text-muted-foreground hover:text-foreground transition hidden md:block">Comissões</a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition hidden md:block">FAQ</a>
            <Link to="/partners/login" className="text-sm text-muted-foreground hover:text-foreground transition">
              Já sou parceiro
            </Link>
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
              Receba até {settings.platinum}% por 24 meses.
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
              { v: `${settings.platinum}%`, l: "comissão máxima" },
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
      <section id="tiers" className="px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4 ring-1 ring-primary/20">
              <TrendingUp size={13} /> Plano de carreira
            </div>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4">
              Quanto mais você indica,<br /><span className="text-primary">mais você ganha</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Níveis progressivos baseados em <strong className="text-foreground">clientes ativos</strong> indicados por você.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {tiers.map((t) => {
              const Icon = t.icon;
              return (
                <Card
                  key={t.name}
                  className={`relative overflow-hidden border-border/50 bg-card transition-all hover:-translate-y-1 hover:shadow-xl ${
                    t.highlight ? "ring-2 ring-primary shadow-2xl shadow-primary/20 lg:-translate-y-2" : ""
                  }`}
                >
                  <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${t.grad} pointer-events-none`} />
                  {t.highlight && (
                    <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest text-center py-1.5">
                      ⭐ Mais popular
                    </div>
                  )}
                  <CardContent className={`relative p-7 text-center ${t.highlight ? "pt-12" : ""}`}>
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-background ring-1 ring-border/60 mb-4">
                      <Icon size={26} className={t.iconColor} strokeWidth={2.25} />
                    </div>
                    <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 font-semibold">{t.name}</div>
                    <div className="flex items-baseline justify-center gap-1 mb-1">
                      <span className="text-5xl font-bold tracking-tight">{t.percent}</span>
                      <span className="text-xl font-semibold text-muted-foreground">%</span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-5">de comissão recorrente</div>
                    <div className="pt-5 border-t border-border/50">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Clientes ativos</div>
                      <div className="text-sm font-semibold">{t.range}</div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-10">
            Todo parceiro começa em <strong className="text-foreground">Bronze ({settings.bronze}%)</strong>. A progressão é automática conforme seus clientes ativos crescem.
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
          <div className="grid md:grid-cols-3 gap-5">
            {benefits.map((b) => (
              <div key={b.title} className="flex gap-4 p-6 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm hover:border-primary/30 hover:bg-card transition-all">
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
      <section id="faq" className="px-6 py-24 border-t border-border/40">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4 ring-1 ring-primary/20">
              FAQ
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Perguntas frequentes</h2>
            <p className="text-muted-foreground mt-3">Tudo que você precisa saber antes de se candidatar.</p>
          </div>
          <div className="space-y-3">
            {faq.map((f, i) => (
              <details
                key={i}
                className="group border border-border/50 rounded-xl bg-card/40 hover:border-primary/30 transition-colors overflow-hidden"
              >
                <summary className="cursor-pointer font-medium flex items-center justify-between gap-4 list-none p-5">
                  <span className="text-base">{f.q}</span>
                  <span className="text-muted-foreground transition-transform group-open:rotate-45 text-2xl leading-none shrink-0">+</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
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
