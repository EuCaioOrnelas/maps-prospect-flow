import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useActivationProgress } from "@/hooks/useTrialAutomation";
import { useAuth } from "@/contexts/AuthContext";
import { useConfetti } from "@/components/ui/confetti";
import {
  Rocket,
  CheckCircle2,
  Circle,
  Search,
  Megaphone,
  Calendar,
  Bot,
  X,
  PartyPopper,
  Crown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  {
    key: "step_prospect_clients_completed",
    title: "Prospectar seus primeiros clientes",
    description: "Busque e adicione seus primeiros leads",
    icon: Search,
    action: "/prospeccao",
    actionLabel: "Prospectar",
  },
  {
    key: "step_first_campaign_completed",
    title: "Fazer primeira campanha de mensagens",
    description: "Crie e envie uma campanha manual",
    icon: Megaphone,
    action: "/whatsapp",
    actionLabel: "Criar campanha",
  },
  {
    key: "step_scheduled_campaign_completed",
    title: "Fazer primeira campanha agendada",
    description: "Agende uma campanha automática",
    icon: Calendar,
    action: "/whatsapp",
    actionLabel: "Agendar",
  },
  {
    key: "step_explore_ai_crm_completed",
    title: "Explorar agentes de IA e CRM",
    description: "Descubra recursos avançados do produto",
    icon: Bot,
    action: "/agents",
    actionLabel: "Explorar",
  },
] as const;

// Pages where the checklist should NOT appear
const EXCLUDED_ROUTES = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/terms", "/privacy", "/refund-policy", "/seguranca-faq", "/contato", "/checkout-success", "/checkout-failed"];

export function ActivationChecklist() {
  const { progress, loading, dismiss, updateStep } = useActivationProgress();
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);
  const [confettiTriggered, setConfettiTriggered] = useState(false);
  const [completionDismissed, setCompletionDismissed] = useState(false);
  const { fireConfetti, fireSides } = useConfetti();

  const userPlan = profile?.plan?.toLowerCase() || "free";
  const isFreePlan = userPlan === "free";

  // Expand on first ever visit, then stay collapsed
  const [hasSeenChecklist, setHasSeenChecklist] = useState(() => {
    return localStorage.getItem("checklist_seen") === "true";
  });

  useEffect(() => {
    if (!loading && progress && !progress.dismissed && !hasSeenChecklist) {
      setIsExpanded(true);
      localStorage.setItem("checklist_seen", "true");
      setHasSeenChecklist(true);
    }
  }, [loading, progress, hasSeenChecklist]);

  // Fire confetti + auto-dismiss when 100%
  useEffect(() => {
    if (progress?.progress_percentage === 100 && !confettiTriggered) {
      setConfettiTriggered(true);
      setIsExpanded(true);
      fireConfetti();
      setTimeout(() => fireSides(), 400);
      // Auto-dismiss after 6 seconds
      setTimeout(() => {
        setCompletionDismissed(true);
        dismiss();
      }, 6000);
    }
  }, [progress?.progress_percentage, confettiTriggered, fireConfetti, fireSides, dismiss]);

  // Don't show on excluded routes
  const isExcluded = EXCLUDED_ROUTES.some(
    (r) => location.pathname === r || location.pathname.startsWith("/lp/") || location.pathname.startsWith("/report/") || location.pathname.startsWith("/revenue")
  );

  if (!user || isExcluded) return null;
  if (loading || !progress || progress.dismissed || completionDismissed) return null;

  const handleExploreAICRM = async () => {
    await updateStep("step_explore_ai_crm_completed", true);
    if (isFreePlan) {
      setShowUpgradePopup(true);
    } else {
      navigate("/agents");
    }
  };

  const completedCount = STEPS.filter(
    (s) => progress[s.key as keyof typeof progress]
  ).length;

  const isComplete = progress.progress_percentage === 100;

  return (
    <>
      {/* Backdrop when expanded */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[49] bg-black/40 backdrop-blur-[2px]"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      {/* Floating popup - fixed bottom-right */}
      <div className="fixed bottom-5 right-5 z-50" style={{ maxWidth: 360 }}>
        <AnimatePresence mode="wait">
          {!isExpanded ? (
            /* Minimized: floating badge/button */
            <motion.button
              key="minimized"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              onClick={() => setIsExpanded(true)}
              className={cn(
                "flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg border cursor-pointer",
                "bg-card border-primary/20 hover:border-primary/40 hover:shadow-xl",
                "transition-shadow duration-200"
              )}
            >
              <div className="relative">
                <Rocket className="h-5 w-5 text-primary" />
                {completedCount < STEPS.length && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-[9px] font-bold text-primary-foreground">
                      {STEPS.length - completedCount}
                    </span>
                  </span>
                )}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground leading-none">
                  {isComplete ? "Tudo pronto! 🎉" : "Comece aqui"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {completedCount}/{STEPS.length} concluído{completedCount !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="ml-1">
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </motion.button>
          ) : (
            /* Expanded: full checklist card */
            <motion.div
              key="expanded"
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className={cn(
                "rounded-2xl shadow-2xl border overflow-hidden",
                "bg-card border-border"
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  {isComplete ? (
                    <PartyPopper className="h-5 w-5 text-primary" />
                  ) : (
                    <Rocket className="h-5 w-5 text-primary" />
                  )}
                  <span className="text-sm font-semibold text-foreground">
                    {isComplete ? "Parabéns! 🎉" : "Comece aqui"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {completedCount}/{STEPS.length}
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => setIsExpanded(false)}
                    title="Minimizar"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={dismiss}
                    title="Não mostrar mais"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="px-4 py-3 space-y-3">
                <Progress value={progress.progress_percentage} className="h-1.5" />

                {isComplete ? (
                  <p className="text-xs text-muted-foreground text-center py-1">
                    Você completou todos os passos iniciais!
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
                    {STEPS.map((step) => {
                      const isCompleted =
                        progress[step.key as keyof typeof progress] === true;
                      const Icon = step.icon;

                      return (
                        <div
                          key={step.key}
                          className={cn(
                            "flex items-center gap-2.5 rounded-xl p-2.5 transition-colors",
                            isCompleted
                              ? "bg-primary/5"
                              : "bg-muted/30 hover:bg-muted/50"
                          )}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0" />
                          ) : (
                            <Circle className="h-4.5 w-4.5 text-muted-foreground/40 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                "text-[13px] font-medium leading-tight",
                                isCompleted &&
                                  "line-through text-muted-foreground"
                              )}
                            >
                              {step.title}
                            </p>
                          </div>
                          {!isCompleted && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[11px] px-2 shrink-0"
                              onClick={() => {
                                if (
                                  step.key ===
                                  "step_explore_ai_crm_completed"
                                ) {
                                  handleExploreAICRM();
                                } else {
                                  navigate(step.action);
                                }
                              }}
                            >
                              <Icon className="h-3 w-3 mr-1" />
                              {step.actionLabel}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Upgrade Popup for Free Users */}
      <Dialog open={showUpgradePopup} onOpenChange={setShowUpgradePopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <DialogTitle className="text-xl">Recurso Premium</DialogTitle>
            </div>
            <DialogDescription className="text-left space-y-3 pt-2">
              <p>
                Os <strong>Agentes de IA</strong> e o{" "}
                <strong>CRM</strong> são funcionalidades exclusivas para
                assinantes.
              </p>
              <p>
                Faça upgrade do seu plano para ter acesso a automações
                inteligentes, CRM integrado e muito mais!
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowUpgradePopup(false)}
              className="w-full sm:w-auto"
            >
              Fechar
            </Button>
            <Button
              onClick={() => {
                setShowUpgradePopup(false);
                navigate("/upgrade");
              }}
              className="w-full sm:w-auto"
            >
              <Crown className="w-4 h-4 mr-2" />
              Ver planos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
