import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  Award, TrendingUp, Users, Wallet, Sparkles, ArrowRight,
  Megaphone, Target, Rocket, ShieldCheck, Check,
  ScrollText, UserPlus, Link2, Share2, BarChart3, Banknote,
} from "lucide-react";
import wiizeLogo from "@/assets/logos/wiize-logo.png";

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

const MAX_COMMISSION = 20;
const AVG_TICKET = 798;
const MAX_PER_REFERRAL = Math.round(AVG_TICKET * (MAX_COMMISSION / 100) * 24); // R$ 3.830

const benefits = [
  { icon: Wallet, title: "Comissão recorrente por 24 meses", desc: "Você ganha sobre cada renovação do cliente indicado, mês após mês, durante 2 anos." },
  { icon: TrendingUp, title: "Níveis progressivos", desc: "Quanto mais clientes ativos, maior sua porcentagem sobre cada venda — automaticamente." },
  { icon: Megaphone, title: "Materiais prontos", desc: "Banners, copies, posts e roteiros validados — você só compartilha o seu link exclusivo." },
  { icon: Target, title: "Atribuição last-click 2 anos", desc: "Mesmo que o lead leve meses para fechar, a venda continua vinculada a você." },
  { icon: Users, title: "Painel completo em tempo real", desc: "Cliques, leads, conversões, comissões pendentes e disponíveis para saque, num só lugar." },
  { icon: Sparkles, title: "Saque a partir de R$ 100", desc: "Pix em até 5 dias úteis após aprovação. Sem burocracia, sem letra miúda." },
];

const steps = [
  {
    n: "01",
    icon: UserPlus,
    t: "Candidate-se em 2 minutos",
    d: "Preencha o formulário oficial com seus dados e canais de divulgação. Análise da equipe Wiize em até 48h úteis, sem custo nem mensalidade.",
  },
  {
    n: "02",
    icon: Link2,
    t: "Receba seu link exclusivo",
    d: "Aprovado, você ganha acesso ao portal Wiize Partners com um link único de indicação (ex.: wiize.com.br/?ref=seu-codigo). Toda venda que vier por ele fica vinculada a você por 2 anos via cookie last-click.",
  },
  {
    n: "03",
    icon: Share2,
    t: "Divulgue onde quiser",
    d: "Compartilhe o link em redes sociais, WhatsApp, e-mail, YouTube, blog ou comunidades. Use os materiais prontos do portal — banners, copies, posts e roteiros validados pelo time Wiize.",
  },
  {
    n: "04",
    icon: BarChart3,
    t: "Acompanhe em tempo real",
    d: "No painel você vê cliques, leads, conversões, comissões pendentes e disponíveis. Tudo transparente, atualizado direto do nosso sistema de pagamentos.",
  },
  {
    n: "05",
    icon: Banknote,
    t: "Receba via Pix",
    d: "A cada renovação do cliente, sua comissão entra automática. Solicitou o saque com saldo mínimo de R$ 100? Cai no seu Pix em até 5 dias úteis.",
  },
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
      name: "Select", percent: settings.bronze,
      range: `0 – ${settings.silverClients - 1} clientes`,
      icon: ShieldCheck,
    },
    {
      name: "Signature", percent: settings.silver,
      range: `${settings.silverClients} – ${settings.goldClients - 1} clientes`,
      icon: Award,
    },
    {
      name: "Prime", percent: Math.min(settings.gold, MAX_COMMISSION),
      range: `${settings.goldClients}+ clientes`,
      icon: Rocket,
    },
  ];

  const displayMax = MAX_COMMISSION;
  const formattedMaxPerReferral = MAX_PER_REFERRAL.toLocaleString("pt-BR");
  const pageTitle = `Wiize Partners — Comissão recorrente até ${displayMax}% indicando a Wiize`;
  const pageDescription = `Indique a Wiize, receba até ${displayMax}% de comissão recorrente por 24 meses. Atribuição last-click, materiais prontos e saque via Pix.`;

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
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
            <a href="#regras" className="text-sm text-muted-foreground hover:text-foreground transition hidden md:block">Regras</a>
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
          <h1 className="font-display font-bold tracking-tight leading-[1.05] mb-6 text-foreground">
            <span className="block text-2xl sm:text-4xl md:text-5xl mb-2">Indique a Wiize.</span>
            <span className="block text-shimmer-highlight font-extrabold text-[clamp(1.05rem,5.4vw,3.25rem)] whitespace-nowrap">
              Receba até {displayMax}% por 24 meses.
            </span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
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
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 max-w-3xl mx-auto">
            {[
              { v: `${displayMax}%`, l: "comissão máxima" },
              { v: "24 meses", l: "recorrência" },
              { v: "R$ 100", l: "saque mínimo" },
              { v: `Até R$ ${formattedMaxPerReferral}`, l: "por indicação¹" },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm py-4 px-2">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{s.v}</div>
                <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground mt-1">{s.l}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground/80 max-w-2xl mx-auto px-2">
            ¹ Estimativa baseada no ticket médio de R$ {AVG_TICKET.toLocaleString("pt-BR")}/mês × {displayMax}% × 24 meses. Como temos planos que chegam a R$ 10 mil/mês, o ganho real por indicação pode ser significativamente maior.
          </p>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="relative px-6 py-24 bg-card/30 border-y border-border/40 overflow-hidden">
        {/* Soft glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-primary/10 blur-[110px]" />
          <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-primary/10 blur-[120px]" />
        </div>
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4 ring-1 ring-primary/20">
              <Megaphone size={13} /> Passo a passo
            </div>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-3 leading-[1.1]">
              <span className="block">Como funciona,</span>
              <span className="block text-shimmer-highlight font-extrabold whitespace-nowrap text-[clamp(1.4rem,5vw,3rem)]">
                do cadastro ao Pix
              </span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mt-4">
              Cinco passos simples. Você cadastra, recebe um link de divulgação exclusivo, compartilha onde quiser e acompanha tudo em tempo real no portal.
            </p>
          </div>

          {/* Primeiros 3 passos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
            {steps.slice(0, 3).map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.n} className="group relative overflow-hidden border-border/50 bg-card/70 backdrop-blur-sm hover:border-primary/40 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/5">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardContent className="relative p-7">
                    <div className="flex items-center justify-between mb-5">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 text-primary">
                        <Icon size={22} strokeWidth={2} />
                      </div>
                      <span className="text-[11px] font-bold tracking-[0.18em] text-muted-foreground/70 uppercase">Passo {s.n}</span>
                    </div>
                    <h3 className="font-semibold text-lg mb-2 text-foreground">{s.t}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{s.d}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Passos 4 e 5 — ocupam metade cada, largura total */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {steps.slice(3).map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.n} className="group relative overflow-hidden border-border/50 bg-card/70 backdrop-blur-sm hover:border-primary/40 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/5">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardContent className="relative p-7">
                    <div className="flex items-center justify-between mb-5">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 text-primary">
                        <Icon size={22} strokeWidth={2} />
                      </div>
                      <span className="text-[11px] font-bold tracking-[0.18em] text-muted-foreground/70 uppercase">Passo {s.n}</span>
                    </div>
                    <h3 className="font-semibold text-lg mb-2 text-foreground">{s.t}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{s.d}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-10 rounded-2xl border border-primary/20 bg-primary/5 p-6 md:p-7 text-sm text-muted-foreground leading-relaxed">
            <p className="text-foreground font-semibold mb-2 flex items-center gap-2">
              <Target size={16} className="text-primary" /> Sobre o link de divulgação
            </p>
            <p>
              Cada parceiro recebe <strong className="text-foreground">um único link rastreável</strong> (ex.: <code className="px-1.5 py-0.5 rounded bg-card border border-border/60 text-foreground text-xs break-all">wiize.com.br/?ref=seu-codigo</code>). Quando alguém clica, gravamos um cookie de <strong className="text-foreground">2 anos</strong> no navegador. Toda venda feita por esse usuário dentro desse período é creditada automaticamente a você — mesmo que ele cadastre por outro caminho depois. Sem código pra colar, sem integração, sem complicação.
            </p>
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
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4 leading-[1.1]">
              <span className="block">Quanto mais você indica,</span>
              <span className="block text-shimmer-highlight font-extrabold whitespace-nowrap text-[clamp(1.4rem,5vw,3rem)]">
                mais você ganha
              </span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Níveis progressivos baseados em <strong className="text-foreground">clientes ativos</strong> indicados por você.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {tiers.map((t) => {
              const Icon = t.icon;
              const isSignature = t.name === "Signature";
              const isPrime = t.name === "Prime";
              const cardClasses = isPrime
                ? "relative overflow-hidden border-foreground/80 bg-foreground text-background transition-all hover:-translate-y-1 hover:shadow-xl"
                : isSignature
                ? "relative overflow-hidden border-primary/40 bg-primary/5 ring-1 ring-primary/20 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10"
                : "relative overflow-hidden border-border/60 bg-card transition-all hover:-translate-y-1 hover:shadow-lg";
              const iconWrapClasses = isPrime
                ? "inline-flex h-12 w-12 items-center justify-center rounded-xl bg-background/10 ring-1 ring-background/20 mb-4"
                : isSignature
                ? "inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30 mb-4"
                : "inline-flex h-12 w-12 items-center justify-center rounded-xl bg-muted/60 ring-1 ring-border/60 mb-4";
              const iconClasses = isPrime ? "text-background" : isSignature ? "text-primary" : "text-foreground/70";
              const nameClasses = isPrime
                ? "text-xs uppercase tracking-[0.2em] text-background/70 mb-2 font-semibold"
                : isSignature
                ? "text-xs uppercase tracking-[0.2em] text-primary mb-2 font-semibold"
                : "text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 font-semibold";
              const subTextClasses = isPrime ? "text-xs text-background/70 mb-5" : "text-xs text-muted-foreground mb-5";
              const dividerClasses = isPrime ? "pt-5 border-t border-background/20" : "pt-5 border-t border-border/50";
              const rangeLabelClasses = isPrime
                ? "text-[10px] uppercase tracking-wider text-background/60 mb-1"
                : "text-[10px] uppercase tracking-wider text-muted-foreground mb-1";
              return (
                <Card key={t.name} className={cardClasses}>
                  <CardContent className="relative p-7 text-center">
                    <div className={iconWrapClasses}>
                      <Icon size={22} className={iconClasses} strokeWidth={2} />
                    </div>
                    <div className={nameClasses}>{t.name}</div>
                    <div className="flex items-baseline justify-center gap-1 mb-1">
                      <span className="text-5xl font-bold tracking-tight">{t.percent}</span>
                      <span className={isPrime ? "text-xl font-semibold text-background/70" : "text-xl font-semibold text-muted-foreground"}>%</span>
                    </div>
                    <div className={subTextClasses}>de comissão recorrente</div>
                    <div className={dividerClasses}>
                      <div className={rangeLabelClasses}>Clientes ativos</div>
                      <div className="text-sm font-semibold">{t.range}</div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-10">
            Todo parceiro começa em <strong className="text-foreground">Select ({settings.bronze}%)</strong>. A progressão é automática conforme seus clientes ativos crescem — comissão máxima do programa: <strong className="text-foreground">{displayMax}%</strong>.
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

      {/* REGRAS / CONTRATO */}
      <section id="regras" className="px-6 py-24 bg-card/30 border-y border-border/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4 ring-1 ring-primary/20">
              <ShieldCheck size={13} /> Regras do programa
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">Regras claras. Sem vínculo trabalhista.</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Wiize Partners é um programa de indicação <strong className="text-foreground">por performance</strong>. Você atua como colaborador parceiro independente — sem contrato CLT, sem metas obrigatórias, sem custo. Indicou e a venda caiu no sistema, você recebe. Não caiu, não recebe. Simples e transparente.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {[
              {
                icon: ShieldCheck,
                title: "Relação jurídica",
                desc: "Você é parceiro autônomo, não funcionário. Não há vínculo empregatício, CLT, férias, 13º, FGTS ou jornada fixa. Cada parceiro é responsável pela própria tributação (PF ou PJ) sobre as comissões recebidas.",
              },
              {
                icon: Wallet,
                title: "Pagamento por performance",
                desc: "Comissão só é gerada quando a venda é confirmada e paga no nosso sistema. Sem venda confirmada, sem comissão — sem exceção. Estornos, chargebacks ou cancelamentos no prazo de proteção (30 dias) revertem a comissão.",
              },
              {
                icon: Megaphone,
                title: "Conduta de divulgação",
                desc: "Proibido spam, compra de tráfego em palavras-chave da marca Wiize, falsas promessas, prints adulterados, fake news ou qualquer prática que prejudique a reputação da Wiize. Materiais oficiais do portal são a base recomendada.",
              },
              {
                icon: Ban,
                title: "Práticas proibidas",
                desc: "Auto-indicação, indicar empresas que já são suas, criar múltiplas contas para burlar o sistema, ou fraudar conversões resulta em suspensão imediata e perda de todas as comissões pendentes.",
              },
              {
                icon: ScrollText,
                title: "Privacidade e LGPD",
                desc: "Você não tem acesso a dados pessoais dos leads — apenas métricas agregadas no painel (cliques, conversões, comissões). A Wiize é controladora dos dados conforme LGPD. Confidencialidade total sobre informações comerciais que receber.",
              },
              {
                icon: Scale,
                title: "Encerramento do programa",
                desc: "Qualquer das partes pode encerrar a relação a qualquer momento, sem multa. Comissões já creditadas e disponíveis para saque seguem sendo pagas. Novas indicações deixam de ser remuneradas a partir do encerramento.",
              },
            ].map((r) => (
              <div key={r.title} className="flex gap-4 p-6 rounded-2xl border border-border/40 bg-card hover:border-primary/30 transition-all">
                <div className="shrink-0 h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                  <r.icon size={18} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{r.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
            <Link
              to="/partners/terms"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-primary/30 bg-primary/5 text-primary font-medium hover:bg-primary/10 transition"
            >
              <ScrollText size={16} /> Ler termos e contrato completo
            </Link>
            <span className="text-muted-foreground">Ao se candidatar, você concorda integralmente com os termos.</span>
          </div>
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
