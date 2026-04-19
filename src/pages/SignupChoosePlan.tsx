import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import {
  ArrowLeft,
  Check,
  ShieldCheck,
  Lock,
  Sparkles,
  Zap,
  TrendingUp,
  ChevronDown,
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
    desc: "Para times pequenos validando prospecção",
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
    desc: "O plano que 8 em cada 10 empresas escolhem",
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
        title="Comece grátis por 7 dias — Wiize"
        description="7 dias completos com acesso total. Sem cobrança hoje. Cancele em 1 clique. Mais de 2.000 empresas já prospectam com a Wiize."
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
              Acesso total à plataforma. Sem cobrança hoje. Cancele em 1 clique
              dentro do app — sem ligação, sem burocracia.
            </p>
          </div>

          {/* Trust strip */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-10 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Lock size={12} className="text-primary" /> Pagamento seguro Asaas & Stripe
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-primary" /> Cancele em 1 clique
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp size={12} className="text-primary" /> +2.000 empresas ativas
            </div>
          </div>

          {/* Como funciona */}
          <div className="rounded-2xl bg-card/50 backdrop-blur border border-border/60 p-6 mb-10">
            <div className="grid sm:grid-cols-3 gap-6 text-sm">
              <Step
                num="1"
                title="Cadastre seu cartão"
                desc="Hoje: R$ 0,00. Apenas validação — nada é debitado agora."
              />
              <Step
                num="2"
                title="Use 7 dias completos"
                desc="Plataforma inteira liberada: WhatsApp, IA, CRM, Meta Ads."
              />
              <Step
                num="3"
                title="Continue ou cancele"
                desc="No 8º dia ativamos o plano. Pra sair, 1 clique no Perfil."
              />
            </div>
          </div>

          {/* Plans */}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">
              Escolha o plano que ativa no 8º dia
            </h2>
            <span className="text-xs text-muted-foreground hidden sm:block">
              Você pode trocar depois
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Durante o trial, todos os recursos ficam liberados — independente do plano.
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {PLANS.map((plan) => {
              const isSelected = selected === plan.key;
              return (
                <button
                  key={plan.key}
                  onClick={() => setSelected(plan.key)}
                  className={cn(
                    "text-left rounded-2xl border p-6 transition-all relative group",
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.4)]"
                      : "border-border hover:border-primary/40 bg-card hover:-translate-y-0.5",
                  )}
                >
                  {plan.highlight && (
                    <span className="absolute -top-2.5 left-6 bg-primary text-primary-foreground text-[10px] font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                      <Zap size={10} /> RECOMENDADO
                    </span>
                  )}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">Wiize {plan.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{plan.desc}</p>
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
                  <div className="my-5 pb-5 border-b border-border/60">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-bold tracking-tight">
                        R$ {plan.monthly.toLocaleString("pt-BR")}
                      </span>
                      <span className="text-xs text-muted-foreground">/mês após o trial</span>
                    </div>
                    <p className="text-xs font-medium text-primary mt-1.5 inline-flex items-center gap-1">
                      <Check size={12} /> Hoje você paga R$ 0,00
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {plan.perks.map((p) => (
                      <li key={p} className="text-sm flex items-start gap-2">
                        <Check size={14} className="text-primary mt-0.5 shrink-0" /> {p}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          <p className="text-center text-xs text-muted-foreground mb-8">
            Precisa de mais volume?{" "}
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
              Começar meus 7 dias grátis →
            </Button>
            <p className="text-xs text-muted-foreground text-center max-w-md flex items-center gap-1.5 justify-center">
              <Lock size={11} /> Cobrança de R$ {selectedPlan.monthly.toLocaleString("pt-BR")} apenas
              no 8º dia, se você continuar. Cancele a qualquer momento.
            </p>
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
          <div className="text-center text-xs text-muted-foreground pb-8">
            <p>
              Ao continuar você concorda com os{" "}
              <Link to="/termos" className="underline hover:text-foreground">
                Termos
              </Link>{" "}
              e a{" "}
              <Link to="/privacidade" className="underline hover:text-foreground">
                Política de Privacidade
              </Link>
              .
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
