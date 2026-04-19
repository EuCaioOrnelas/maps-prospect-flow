import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ArrowLeft, Check, ShieldCheck, Calendar, CreditCard, X } from "lucide-react";
import { SEO } from "@/components/SEO";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    key: "start",
    name: "Wiize Start",
    monthly: 296,
    desc: "Para quem está começando",
    highlight: false,
    perks: ["1.000 oportunidades/mês", "WhatsApp + Meta", "CRM + Score IA"],
  },
  {
    key: "growth",
    name: "Wiize Growth",
    monthly: 696,
    desc: "O mais escolhido",
    highlight: true,
    perks: ["3.000 oportunidades/mês", "Tudo do Start", "Agentes IA ilimitados", "Aquecimento avançado"],
  },
  {
    key: "scale",
    name: "Wiize Scale",
    monthly: 1496,
    desc: "Para times maiores",
    highlight: false,
    perks: ["10.000 oportunidades/mês", "Tudo do Growth", "Suporte prioritário", "Múltiplos números"],
  },
];

export default function SignupChoosePlan() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string>("growth");

  const continueToSignup = () => {
    sessionStorage.setItem("trial_plan_chosen", selected);
    navigate("/signup");
  };

  return (
    <>
      <SEO
        title="7 dias grátis com compromisso real — Wiize"
        description="Teste o Wiize por 7 dias com cartão como garantia de compromisso. Não cobramos nada agora. Cancele em 1 clique antes do 7º dia."
        url="https://wiize.com.br/signup/escolher-plano"
      />
      <div className="min-h-screen bg-background overflow-x-hidden">
        <div className="absolute inset-0 bg-gradient-glow opacity-30 pointer-events-none" />

        <div className="container mx-auto max-w-5xl px-4 py-8 relative z-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors text-sm"
          >
            <ArrowLeft size={16} /> Voltar
          </Link>

          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>

          <div className="text-center max-w-2xl mx-auto mb-10">
            <h1 className="font-display text-3xl sm:text-4xl font-bold mb-3">
              7 dias grátis para empresas com compromisso
            </h1>
            <p className="text-muted-foreground">
              O Wiize não é um parquinho de testes. Pedimos seu cartão como{" "}
              <strong className="text-foreground">garantia de seriedade</strong> — não como cobrança.
              Assim atendemos quem realmente quer transformar a prospecção, e não curiosos em massa.
            </p>
          </div>

          {/* Como funciona */}
          <div className="glass rounded-2xl p-5 mb-8 border border-primary/10">
            <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <ShieldCheck size={16} className="text-primary" /> Como funciona
            </h2>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <CreditCard size={14} className="text-primary" />
                </div>
                <div>
                  <p className="font-medium">1. Cartão como compromisso</p>
                  <p className="text-xs text-muted-foreground">Hoje: R$ 0,00. O cartão é uma garantia, não uma cobrança.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar size={14} className="text-primary" />
                </div>
                <div>
                  <p className="font-medium">2. Use 7 dias completos</p>
                  <p className="text-xs text-muted-foreground">Acesso total ao plano escolhido para validar o impacto real.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <X size={14} className="text-primary" />
                </div>
                <div>
                  <p className="font-medium">3. Continue ou saia em 1 clique</p>
                  <p className="text-xs text-muted-foreground">Se não for pra você, cancele no Perfil. Sem cobrança, sem ligação.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Plans */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {PLANS.map((plan) => (
              <button
                key={plan.key}
                onClick={() => setSelected(plan.key)}
                className={cn(
                  "text-left rounded-2xl border p-5 transition-all relative",
                  selected === plan.key
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                    : "border-border hover:border-primary/40 bg-card",
                )}
              >
                {plan.highlight && (
                  <span className="absolute -top-2.5 right-4 bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-1 rounded-full">
                    MAIS ESCOLHIDO
                  </span>
                )}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground">{plan.desc}</p>
                  </div>
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                      selected === plan.key ? "border-primary bg-primary" : "border-border",
                    )}
                  >
                    {selected === plan.key && <Check size={12} className="text-primary-foreground" />}
                  </div>
                </div>
                <div className="my-4">
                  <p className="text-2xl font-bold">
                    R$ {plan.monthly}
                    <span className="text-xs text-muted-foreground font-normal">/mês após o trial</span>
                  </p>
                  <p className="text-xs text-primary font-medium mt-1">Hoje: R$ 0,00</p>
                </div>
                <ul className="space-y-1.5">
                  {plan.perks.map((p) => (
                    <li key={p} className="text-xs flex items-start gap-1.5">
                      <Check size={12} className="text-primary mt-0.5 shrink-0" /> {p}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>

          <div className="flex flex-col items-center gap-3">
            <Button size="lg" variant="hero" onClick={continueToSignup} className="w-full max-w-sm">
              Quero testar com compromisso — 7 dias grátis
            </Button>
            <p className="text-xs text-muted-foreground text-center max-w-md">
              Hoje você não paga nada. Caso decida continuar, ativamos o plano de R${" "}
              {PLANS.find((p) => p.key === selected)?.monthly} no 8º dia. Pra sair antes, é 1
              clique no Perfil — sem cobrança, sem cancelamento por telefone.
            </p>
            <p className="text-xs text-muted-foreground">
              Já tem conta?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
