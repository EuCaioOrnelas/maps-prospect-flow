import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  Briefcase,
  Headphones,
  Megaphone,
  Compass,
  HelpCircle,
  User as UserIcon,
  Users,
  Users2,
  Building2,
  Building,
  Target,
  ListChecks,
  TrendingUp,
  Bot,
  UserCog,
  LineChart,
  MessageCircle,
  Database,
  FileSpreadsheet,
  PhoneCall,
  Share2,
  Megaphone as Ads,
  Wallet,
  Coins,
  Banknote,
  Gem,
  EyeOff,
  Rocket,
  ClipboardList,
  Trophy,
  ScalingIcon as Scale,
  Workflow,
  Sparkles,
  ArrowRight,
  Check,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserScoreTracking } from "@/hooks/useUserScoreTracking";
import { Logo } from "@/components/Logo";

type OptionDef = { id: string; label: string; icon: React.ComponentType<any> };
type StepDef = {
  key: keyof Answers;
  title: string;
  subtitle: string;
  options: OptionDef[];
  optional?: boolean;
};

interface Answers {
  role: string;
  sales_team_size: string;
  biggest_challenge: string;
  sales_method: string;
  monthly_revenue: string;
  goal_90d: string;
}

const STEPS: StepDef[] = [
  {
    key: "role",
    title: "Qual opção melhor descreve você?",
    subtitle: "Vamos personalizar a Wiize para o seu papel no time.",
    options: [
      { id: "founder", label: "Founder / Dono", icon: Crown },
      { id: "gestor", label: "Gestor Comercial", icon: Briefcase },
      { id: "sdr", label: "SDR / Vendas", icon: Headphones },
      { id: "marketing", label: "Marketing", icon: Megaphone },
      { id: "consultor", label: "Consultor / Agência", icon: Compass },
      { id: "outro", label: "Outro", icon: HelpCircle },
    ],
  },
  {
    key: "sales_team_size",
    title: "Quantas pessoas vendem hoje?",
    subtitle: "Isso nos ajuda a calibrar o tamanho ideal da operação.",
    options: [
      { id: "1", label: "Só eu", icon: UserIcon },
      { id: "2-5", label: "2 a 5", icon: Users },
      { id: "6-20", label: "6 a 20", icon: Users2 },
      { id: "21-100", label: "21 a 100", icon: Building2 },
      { id: "100+", label: "100+", icon: Building },
    ],
  },
  {
    key: "biggest_challenge",
    title: "Qual seu maior desafio hoje?",
    subtitle: "Vamos priorizar o que mais impacta seus resultados.",
    options: [
      { id: "leads", label: "Gerar leads qualificados", icon: Target },
      { id: "operacao", label: "Organizar operação comercial", icon: ListChecks },
      { id: "conversao", label: "Aumentar conversão", icon: TrendingUp },
      { id: "ia", label: "Prospectar com IA", icon: Bot },
      { id: "equipe", label: "Gerir equipe comercial", icon: UserCog },
      { id: "previsao", label: "Prever receita", icon: LineChart },
    ],
  },
  {
    key: "sales_method",
    title: "Como vocês vendem hoje?",
    subtitle: "Conta a real, vamos te mostrar onde dá pra evoluir.",
    options: [
      { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
      { id: "crm", label: "CRM tradicional", icon: Database },
      { id: "planilha", label: "Planilha", icon: FileSpreadsheet },
      { id: "sdr", label: "SDR outbound", icon: PhoneCall },
      { id: "indicacao", label: "Indicação", icon: Share2 },
      { id: "trafego", label: "Tráfego pago", icon: Ads },
    ],
  },
  {
    key: "monthly_revenue",
    title: "Quanto faturam por mês?",
    subtitle: "Opcional, usado apenas para personalizar recomendações.",
    optional: true,
    options: [
      { id: "ate-20k", label: "Até R$ 20k", icon: Wallet },
      { id: "20k-100k", label: "R$ 20k a R$ 100k", icon: Coins },
      { id: "100k-500k", label: "R$ 100k a R$ 500k", icon: Banknote },
      { id: "500k+", label: "R$ 500k+", icon: Gem },
      { id: "nao-dizer", label: "Prefiro não dizer", icon: EyeOff },
    ],
  },
  {
    key: "goal_90d",
    title: "Qual resultado quer nos próximos 90 dias?",
    subtitle: "Isso vai definir seu plano inicial de ação na Wiize.",
    options: [
      { id: "dobrar-leads", label: "Dobrar leads", icon: Rocket },
      { id: "organizar", label: "Organizar vendas", icon: ClipboardList },
      { id: "fechar-mais", label: "Fechar mais negócios", icon: Trophy },
      { id: "escalar-time", label: "Escalar time", icon: Scale },
      { id: "automatizar", label: "Automatizar operação", icon: Workflow },
    ],
  },
];

const TOTAL_STEPS = STEPS.length;

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { trackScoreEvent } = useUserScoreTracking();

  const [stage, setStage] = useState<"welcome" | "questions" | "loading">("welcome");
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    role: "",
    sales_team_size: "",
    biggest_challenge: "",
    sales_method: "",
    monthly_revenue: "",
    goal_90d: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Auth guard + skip se já completou
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("user_onboarding")
        .select("id, role, completed_at, skipped")
        .eq("user_id", user.id)
        .maybeSingle();
      // Só pula se já tiver concluído de fato (com completed_at) OU pulado explicitamente
      // Registros legados sem 'role' nem 'completed_at' devem permitir refazer
      const alreadyDone =
        !!data && (!!data.completed_at || (data.skipped === true && !!data.role));
      if (alreadyDone) navigate("/dashboard", { replace: true });
    })();
  }, [user, authLoading, navigate]);

  const currentStep = STEPS[stepIndex];
  const progress = useMemo(
    () => Math.round(((stepIndex + 1) / TOTAL_STEPS) * 100),
    [stepIndex]
  );

  const selected = currentStep ? answers[currentStep.key] : "";
  const canContinue = currentStep?.optional || !!selected;

  const handleSelect = (id: string) => {
    if (!currentStep) return;
    setAnswers((prev) => ({ ...prev, [currentStep.key]: id }));
  };

  const handleNext = () => {
    if (stepIndex < TOTAL_STEPS - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      handleComplete(false);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  };

  const persist = async (skipped: boolean) => {
    if (!user) throw new Error("Sessão expirada. Faça login novamente.");

    // Garante que a sessão ainda está válida antes de gravar
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !sessionData.session) {
      throw new Error("Sessão expirada. Faça login novamente para salvar.");
    }

    const payload = {
      user_id: user.id,
      role: answers.role || null,
      sales_team_size: answers.sales_team_size || null,
      biggest_challenge: answers.biggest_challenge || null,
      sales_method: answers.sales_method || null,
      monthly_revenue: answers.monthly_revenue || null,
      goal_90d: answers.goal_90d || null,
      skipped,
      completed_at: new Date().toISOString(),
    };

    // Tenta upsert; em caso de falha, faz retry com fallback insert/update
    let lastErr: any = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const { error } = await supabase
        .from("user_onboarding")
        .upsert(payload, { onConflict: "user_id" });
      if (!error) return;
      lastErr = error;
      console.warn(`[Onboarding] upsert attempt ${attempt} failed:`, error);
      // backoff curto antes de tentar novamente
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }

    // Fallback final: tenta update (caso o upsert esteja falhando por algum motivo)
    const { error: updErr } = await supabase
      .from("user_onboarding")
      .update(payload)
      .eq("user_id", user.id);
    if (!updErr) return;

    throw lastErr || updErr;
  };

  const handleComplete = async (skipped: boolean) => {
    if (!user || submitting) return;
    setSubmitting(true);
    try {
      await persist(skipped);
      trackScoreEvent(skipped ? "onboarding_skipped" : "onboarding_completed", {
        ...answers,
      });
      setStage("loading");
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 2000);
    } catch (err: any) {
      console.error("[Onboarding] Error saving onboarding:", err);
      const msg =
        err?.message?.includes("Sessão")
          ? err.message
          : err?.code === "42501" || err?.message?.includes("row-level security")
          ? "Sem permissão para salvar. Faça login novamente."
          : err?.message || "Não conseguimos salvar agora. Verifique sua conexão e tente novamente.";
      toast.error(msg);
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(40,30%,97%)]">
        <Loader2 className="h-6 w-6 animate-spin text-[hsl(220,12%,46%)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(40,30%,97%)] text-[hsl(220,15%,15%)] flex flex-col">
      {/* Header */}
      <header className="px-6 sm:px-10 py-6 flex items-center justify-between">
        <Logo size="sm" asLink={false} />
        {stage === "questions" && (
          <div className="hidden sm:flex items-center gap-3 text-xs text-[hsl(220,12%,46%)]">
            <span>
              {stepIndex + 1} de {TOTAL_STEPS}
            </span>
            <div className="w-40 h-1 rounded-full bg-[hsl(220,15%,90%)] overflow-hidden">
              <motion.div
                className="h-full bg-[hsl(158,72%,38%)]"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-6 sm:px-10 pb-24">
        <AnimatePresence mode="wait">
          {stage === "welcome" && (
            <motion.section
              key="welcome"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4 }}
              className="max-w-2xl w-full text-center"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[hsl(158,72%,38%)]/10 text-[hsl(158,72%,30%)] text-xs font-medium mb-6">
                <Sparkles className="h-3.5 w-3.5" />
                Bem-vindo à Wiize
              </div>
              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4 text-[hsl(220,18%,12%)]">
                Vamos configurar a Wiize<br className="hidden sm:block" /> para o seu negócio em 1 minuto.
              </h1>
              <p className="text-base sm:text-lg text-[hsl(220,12%,46%)] mb-10 max-w-xl mx-auto">
                Algumas perguntas rápidas para personalizar sua operação comercial,
                a IA de prospecção e seus próximos passos.
              </p>
              <Button
                size="lg"
                onClick={() => setStage("questions")}
                className="bg-[hsl(158,72%,38%)] hover:bg-[hsl(158,72%,32%)] text-white px-8 h-12 rounded-lg shadow-[0_4px_16px_hsl(158,72%,38%,0.3)] hover:shadow-[0_6px_20px_hsl(158,72%,38%,0.4)] transition-all"
              >
                Começar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </motion.section>
          )}

          {stage === "questions" && currentStep && (
            <motion.section
              key={`step-${stepIndex}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="max-w-4xl w-full"
            >
              <div className="text-center mb-10">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[hsl(220,18%,12%)] mb-3">
                  {currentStep.title}
                </h2>
                <p className="text-sm sm:text-base text-[hsl(220,12%,46%)]">
                  {currentStep.subtitle}
                </p>
              </div>

              <div
                className={`grid gap-4 ${
                  currentStep.options.length <= 5
                    ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
                    : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
                }`}
              >
                {currentStep.options.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = selected === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelect(opt.id)}
                      className={`group relative flex flex-col items-center justify-center gap-4 p-6 rounded-xl border bg-white text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                        isSelected
                          ? "border-[hsl(158,72%,38%)] ring-2 ring-[hsl(158,72%,38%)]/20 shadow-md"
                          : "border-[hsl(220,15%,90%)] hover:border-[hsl(220,15%,75%)]"
                      }`}
                    >
                      <span
                        className={`absolute top-3 right-3 h-5 w-5 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-[hsl(158,72%,38%)] border-[hsl(158,72%,38%)]"
                            : "border-[hsl(220,15%,80%)] group-hover:border-[hsl(220,15%,60%)]"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                      </span>
                      <div
                        className={`h-12 w-12 rounded-lg flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-[hsl(158,72%,38%)]/10 text-[hsl(158,72%,30%)]"
                            : "bg-[hsl(220,15%,96%)] text-[hsl(220,15%,35%)]"
                        }`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-sm font-medium text-center text-[hsl(220,18%,15%)] leading-snug px-1 break-words">
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-12 flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={stepIndex === 0 || submitting}
                  className="text-[hsl(220,12%,46%)] hover:text-[hsl(220,18%,15%)]"
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!canContinue || submitting}
                  className="bg-[hsl(158,72%,38%)] hover:bg-[hsl(158,72%,32%)] disabled:bg-[hsl(220,15%,80%)] disabled:text-white text-white px-8 h-11 rounded-lg shadow-[0_4px_16px_hsl(158,72%,38%,0.3)] hover:shadow-[0_6px_20px_hsl(158,72%,38%,0.4)] transition-all"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : stepIndex === TOTAL_STEPS - 1 ? (
                    "Concluir"
                  ) : (
                    <>
                      Continuar
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </motion.section>
          )}

          {stage === "loading" && (
            <motion.section
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <div className="inline-flex h-14 w-14 rounded-full bg-[hsl(158,72%,38%)]/10 items-center justify-center mb-6">
                <Loader2 className="h-7 w-7 animate-spin text-[hsl(158,72%,38%)]" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[hsl(220,18%,12%)] mb-3">
                Estamos montando sua Wiize ideal...
              </h2>
              <p className="text-[hsl(220,12%,46%)]">
                Personalizando seu dashboard, IA de prospecção e próximos passos.
              </p>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Skip discreto - canto inferior direito */}
      {stage === "questions" && (
        <button
          type="button"
          onClick={() => handleComplete(true)}
          disabled={submitting}
          className="fixed bottom-6 right-6 text-xs text-[hsl(220,12%,55%)] hover:text-[hsl(220,18%,20%)] underline underline-offset-4 transition-colors disabled:opacity-50"
        >
          Pular por enquanto
        </button>
      )}
    </div>
  );
}
