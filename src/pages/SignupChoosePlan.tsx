import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ShieldCheck,
  Lock,
  Sparkles,
  Zap,
  TrendingUp,
  ChevronDown,
  X,
  Star,
  CalendarClock,
  Flame,
  Rocket,
} from "lucide-react";
import { SEO } from "@/components/SEO";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Trial libera TODOS os recursos. O plano escolhido define apenas o valor cobrado a partir do 8º dia.
const PLANS = [
  {
    key: "start",
    name: "Start",
    monthly: 296,
    opportunities: "1.000",
    desc: "Para gerar e validar oportunidades todos os dias",
    highlight: false,
    perks: [
      "Oportunidades com alto potencial de fechamento",
      "Mensagens geradas por IA para iniciar conversas",
      "Gestão de contatos em um só lugar (CRM)",
      "Priorize oportunidades com maior chance de fechamento (Score)",
      "Disparos via WhatsApp e Meta",
      "Até 2 números conectados",
      "Suporte por email",
      "Operação semi-automática",
    ],
    limitations: [
      "Sem automação",
      "Sem follow-up",
      "Sem agente de IA",
    ],
  },
  {
    key: "growth",
    name: "Growth",
    monthly: 696,
    opportunities: "3.000",
    desc: "Para automatizar, escalar e converter leads no piloto automático",
    highlight: true,
    perks: [
      "Tudo do Start (leads, CRM e disparos)",
      "Priorize oportunidades com maior chance de fechamento (Score)",
      "Automação de atendimento",
      "Follow-up automático inteligente",
      "Agente de IA em conversas",
      "Fluxos de vendas automatizados",
      "Até 5 números conectados",
      "Suporte prioritário",
      "Operação totalmente automatizada",
    ],
    limitations: [],
  },
];

const FAQ = [
  {
    q: "Vou ser cobrado agora?",
    a: "Não. Hoje você paga R$ 0,00. O cartão é registrado apenas para validar que você é uma empresa real. A primeira cobrança só acontece no 8º dia, e somente se você decidir continuar.",
  },
  {
    q: "Como cancelo se não gostar?",
    a: "Em 1 clique, dentro do seu Perfil. Sem ligação, sem formulário longo, sem reter. Se cancelar antes do 7º dia, nada é cobrado.",
  },
  {
    q: "Por que pedem cartão se o trial é grátis?",
    a: "Para garantir que você tenha acesso imediato e contínuo se decidir continuar, sem precisar reconfigurar nada. E para manter a plataforma livre de bots e curiosos, focando o suporte em quem realmente quer crescer.",
  },
  {
    q: "Vou ter acesso a todos os recursos no trial?",
    a: "Sim. Durante os 7 dias você usa a plataforma completa: WhatsApp, Meta Ads, CRM, Score IA, Agentes e Aquecimento. O plano escolhido define apenas o valor mensal a partir do 8º dia.",
  },
  {
    q: "Meus dados de pagamento estão seguros?",
    a: "Totalmente. Processamos via Asaas, com os mesmos padrões de segurança usados por bancos digitais. Nunca armazenamos dados completos do cartão em nossos servidores.",
  },
];

export default function SignupChoosePlan() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string>("growth");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const continueToSignup = () => {
    sessionStorage.setItem("trial_plan_chosen", selected);
    navigate("/signup");
  };

  const selectedPlan = PLANS.find((p) => p.key === selected)!;

  return (
    <>
      <SEO
        title="Comece grátis por 7 dias | Wiize"
        description="7 dias completos com acesso total. Sem cobrança hoje. Cancele em 1 clique. Mais de 500 empresas já prospectam com a Wiize."
        url="https://wiize.com.br/signup/escolher-plano"
      />
      <div className="min-h-screen bg-background overflow-x-hidden">
        <div className="absolute inset-0 bg-gradient-glow opacity-20 pointer-events-none" />

        <div className="container mx-auto max-w-5xl px-4 py-8 relative z-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors text-sm"
          >
            <ArrowLeft size={16} /> Voltar
          </Link>

          <div className="flex justify-center mb-8">
            <Logo size="lg" />
          </div>

          {/* Hero */}
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-5">
              <Sparkles size={12} /> 7 dias grátis · Acesso completo
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
              Teste a Wiize por 7 dias.
              <br />
              <span className="text-primary">Pague só se valer a pena.</span>
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Plataforma completa liberada. Sem cobrança hoje. Cancele em 1 clique a qualquer momento.
            </p>

            <div className="mt-5 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-0.5 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={12} fill="currentColor" strokeWidth={0} />
                ))}
              </div>
              <span className="font-medium text-foreground">4,9/5</span>
              <span>·</span>
              <span>Avaliação média de empresas B2B no Brasil</span>
            </div>
          </div>

          {/* Trust strip */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-10 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Lock size={12} className="text-primary" /> Pagamento seguro via Asaas
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-primary" /> Cancele em 1 clique
            </div>
            <div className="flex items-center gap-1.5">
              <CalendarClock size={12} className="text-primary" /> Lembrete 2 dias antes da cobrança
            </div>
          </div>

          {/* Como funciona */}
          <div className="rounded-2xl bg-card/50 backdrop-blur border border-border/60 p-6 mb-10">
            <div className="grid sm:grid-cols-3 gap-6 text-sm">
              <Step
                num="1"
                title="Hoje · Cadastre seu cartão"
                desc="R$ 0,00 agora. Apenas validação para liberar acesso imediato."
              />
              <Step
                num="2"
                title="Dias 1 a 7 · Use tudo liberado"
                desc="WhatsApp, IA, CRM, Meta Ads, Score e Agentes, sem limite."
              />
              <Step
                num="3"
                title="Dia 8 · Você decide"
                desc="Continue automaticamente ou cancele em 1 clique antes, sem cobrança."
              />
            </div>
          </div>

          {/* Plans */}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">
              Escolha como quer crescer nos próximos 7 dias
            </h2>
            <span className="text-xs text-muted-foreground hidden sm:block">
              Troque de plano quando quiser
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Você usa a Wiize completa por 7 dias, sem pagar nada agora. O plano escolhido só passa a valer no 8º dia, se você decidir continuar.
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {PLANS.map((plan) => {
              const isSelected = selected === plan.key;
              return (
                <button
                  key={plan.key}
                  onClick={() => setSelected(plan.key)}
                  className={cn(
                    "text-left rounded-2xl border p-6 pt-7 transition-colors duration-200 relative flex flex-col",
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.4)]"
                      : "border-border bg-card hover:border-primary/40 hover:bg-primary/[0.02]",
                  )}
                >
                  {plan.highlight && (
                    <span className="absolute -top-2.5 left-6 bg-primary text-primary-foreground text-[10px] font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1 whitespace-nowrap">
                      ⚡ Escolha de 8 em cada 10 empresas que crescem com a Wiize
                    </span>
                  )}
                  <div className="flex items-start justify-between gap-3 h-[60px]">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg leading-tight">Wiize {plan.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{plan.desc}</p>
                    </div>
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1",
                        isSelected ? "border-primary bg-primary" : "border-border",
                      )}
                    >
                      {isSelected && <Check size={12} className="text-primary-foreground" strokeWidth={3} />}
                    </div>
                  </div>
                  {/* Pricing block - foco em gratuidade */}
                  <div className="mt-6 pb-5 border-b border-border/60">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-bold tracking-tight text-primary">
                        R$ 0,00
                      </span>
                      <span className="text-sm font-medium text-foreground">hoje</span>
                    </div>
                    <p className="text-sm font-medium text-primary mt-1.5">
                      Até {plan.opportunities} oportunidades/mês
                    </p>
                    <div className="mt-3 rounded-lg bg-muted/40 border border-border/60 px-3 py-2">
                      <p className="text-xs text-foreground">
                        Depois do trial: <span className="font-semibold">R$ {plan.monthly.toLocaleString("pt-BR")}/mês</span>. Você só é cobrado se decidir continuar.
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1">
                        <ShieldCheck size={11} /> Cancele em 1 clique pelo Perfil, sem custo e sem ligação.
                      </p>
                    </div>
                  </div>

                  <ul className="space-y-3 mt-5 text-sm">
                    {plan.perks.map((p) => (
                      <li key={p} className="flex items-start gap-3">
                        <Check size={16} className="text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{p}</span>
                      </li>
                    ))}
                    {plan.limitations.map((l) => (
                      <li key={l} className="flex items-start gap-3 opacity-50">
                        <X size={16} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{l}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          <p className="text-center text-xs text-muted-foreground mb-8">
            Mais de 5.000 oportunidades por mês?{" "}
            <Link to="/contato" className="text-primary hover:underline">
              Fale com nosso time sobre o plano Scale
            </Link>
          </p>

          {/* CTA */}
          <div className="flex flex-col items-center gap-3 mb-12">
            <Button
              size="lg"
              variant="hero"
              onClick={continueToSignup}
              className="w-full max-w-md h-14 text-base"
            >
              Começar meu teste grátis agora →
            </Button>
            <p className="text-xs text-muted-foreground text-center max-w-md flex items-center gap-1.5 justify-center">
              <Lock size={11} /> R$ 0,00 hoje • Cancele quando quiser, em 1 clique
            </p>

            {/* Reassurance card */}
            <div className="mt-3 w-full max-w-md rounded-xl border border-border/60 bg-card/40 px-4 py-3">
              <div className="flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-primary mt-0.5 shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-medium text-foreground">
                    Sem surpresas. Avisamos antes de qualquer cobrança.
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Você recebe um e-mail 2 dias antes do fim do trial. Se cancelar antes, nada é debitado e o acesso segue até o 7º dia. Após o trial: <span className="font-medium text-foreground">R$ {selectedPlan.monthly.toLocaleString("pt-BR")}/mês</span>, apenas se continuar.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Já tem conta?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Fazer login
              </Link>
            </p>
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto mb-12">
            <h2 className="font-display text-2xl font-bold text-center mb-2">
              Perguntas frequentes
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Tudo que você precisa saber antes de começar
            </p>
            <div className="space-y-2">
              {FAQ.map((item, i) => (
                <Collapsible
                  key={i}
                  open={openFaq === i}
                  onOpenChange={(o) => setOpenFaq(o ? i : null)}
                >
                  <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
                    <CollapsibleTrigger className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors">
                      <span className="font-medium text-sm">{item.q}</span>
                      <ChevronDown
                        size={16}
                        className={cn(
                          "text-muted-foreground transition-transform shrink-0 ml-3",
                          openFaq === i && "rotate-180",
                        )}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
                      {item.a}
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          </div>

          {/* Footer trust */}
          <div className="text-center text-xs text-muted-foreground pb-8 space-y-2">
            <p>
              Ao continuar você concorda com os{" "}
              <Link to="/termos" className="underline hover:text-foreground">
                Termos
              </Link>
              , a{" "}
              <Link to="/privacidade" className="underline hover:text-foreground">
                Política de Privacidade
              </Link>{" "}
              e a{" "}
              <Link to="/reembolso" className="underline hover:text-foreground">
                Política de Reembolso
              </Link>
              .
            </p>
            <p className="text-[11px] text-muted-foreground/80 max-w-xl mx-auto leading-relaxed">
              Garantia de 7 dias: cancele a qualquer momento durante o trial e nada será cobrado. Após a primeira cobrança, você tem até 7 dias corridos para solicitar reembolso integral, conforme o Código de Defesa do Consumidor (Art. 49).
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function Step({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary font-semibold text-sm">
        {num}
      </div>
      <div>
        <p className="font-medium text-foreground mb-0.5">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
