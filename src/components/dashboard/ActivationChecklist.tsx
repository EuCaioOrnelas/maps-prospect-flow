import { useState, useEffect } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  {
    key: "step_prospect_clients_completed",
    title: "Prospectar seus primeiros clientes",
    description: "Busque e adicione seus primeiros leads",
    icon: Search,
    action: "/oportunidades",
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
    title: "Explorar CRM e fluxos",
    description: "Descubra recursos avançados do produto",
    icon: Bot,
    action: "/crm",
    actionLabel: "Explorar",
  },
] as const;

const EXCLUDED_ROUTES = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/terms", "/privacy", "/refund-policy", "/seguranca-faq", "/contato", "/checkout-success", "/checkout-failed"];

// ─── Shared hook for checklist logic ───
function useChecklistState() {
  const { progress, loading, dismiss, updateStep } = useActivationProgress();
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);
  const [confettiTriggered, setConfettiTriggered] = useState(false);
  const [completionDismissed, setCompletionDismissed] = useState(false);
  const { fireConfetti, fireSides } = useConfetti();

  const userPlan = profile?.plan?.toLowerCase() || "free";
  const isFreePlan = userPlan === "free";

  const hasSeenChecklist = localStorage.getItem("checklist_seen") === "true";

  useEffect(() => {
    if (progress?.progress_percentage === 100 && !confettiTriggered) {
      setConfettiTriggered(true);
      fireConfetti();
      setTimeout(() => fireSides(), 400);
      setTimeout(() => {
        setCompletionDismissed(true);
        dismiss();
      }, 6000);
    }
  }, [progress?.progress_percentage, confettiTriggered, fireConfetti, fireSides, dismiss]);

  const handleExploreAICRM = async () => {
    await updateStep("step_explore_ai_crm_completed", true);
    if (isFreePlan) {
      setShowUpgradePopup(true);
    } else {
      navigate("/crm");
    }
  };

  const handleStepClick = (step: typeof STEPS[number]) => {
    if (step.key === "step_explore_ai_crm_completed") {
      handleExploreAICRM();
    } else {
      navigate(step.action);
    }
  };

  const completedCount = progress
    ? STEPS.filter((s) => progress[s.key as keyof typeof progress]).length
    : 0;

  const isComplete = progress?.progress_percentage === 100;

  const shouldShow = !!user && !loading && !!progress && !progress.dismissed && !completionDismissed;

  return {
    progress, loading, dismiss, user, navigate, completedCount, isComplete,
    showUpgradePopup, setShowUpgradePopup, handleStepClick, shouldShow,
    hasSeenChecklist, completionDismissed,
  };
}

// ─── Upgrade dialog (shared) ───
function UpgradeDialog({ open, onOpenChange, onNavigate }: { open: boolean; onOpenChange: (v: boolean) => void; onNavigate: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-[11px] bg-primary/20 flex items-center justify-center">
              <Crown className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="text-xl">Recurso Premium</DialogTitle>
          </div>
          <DialogDescription className="text-left space-y-3 pt-2">
            <p>Os <strong>Agentes de IA</strong> e o <strong>CRM</strong> são funcionalidades exclusivas para assinantes.</p>
            <p>Faça upgrade do seu plano para ter acesso a automações inteligentes, CRM integrado e muito mais!</p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Fechar</Button>
          <Button onClick={onNavigate} className="w-full sm:w-auto">
            <Crown className="w-4 h-4 mr-2" />
            Ver planos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Step list (shared) ───
function StepsList({ progress, onStepClick, compact = false }: {
  progress: any;
  onStepClick: (step: typeof STEPS[number]) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", compact && "max-h-[280px] overflow-y-auto")}>
      {STEPS.map((step) => {
        const isCompleted = progress[step.key as keyof typeof progress] === true;
        const Icon = step.icon;
        return (
          <div
            key={step.key}
            className={cn(
              "flex items-center gap-2.5 rounded-xl transition-colors",
              compact ? "p-2.5" : "p-2.5",
              isCompleted ? "bg-primary/5" : "bg-muted/30 hover:bg-muted/50"
            )}
          >
            {isCompleted ? (
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={cn(
                compact ? "text-[13px]" : "text-sm",
                "font-medium leading-tight",
                isCompleted && "line-through text-muted-foreground"
              )}>
                {step.title}
              </p>
              {!compact && (
                <p className="text-xs text-muted-foreground truncate">{step.description}</p>
              )}
            </div>
            {!isCompleted && (
              <Button
                variant="outline"
                size="sm"
                className={cn(compact ? "h-6 text-[11px] px-2" : "h-7 text-xs", "shrink-0")}
                onClick={() => onStepClick(step)}
              >
                <Icon className="h-3 w-3 mr-1" />
                {step.actionLabel}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// INLINE version — shown on first visit in the dashboard
// ═══════════════════════════════════════════════════
export function ActivationChecklistInline() {
  const state = useChecklistState();
  const { progress, dismiss, completedCount, isComplete, shouldShow, hasSeenChecklist, navigate } = state;
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Only show inline on first visit (hasn't seen yet)
  if (!shouldShow || hasSeenChecklist) return null;

  // Mark as seen when user interacts or after mount
  const markSeen = () => {
    localStorage.setItem("checklist_seen", "true");
  };

  if (isComplete) {
    return (
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PartyPopper className="h-6 w-6 text-primary" />
              <div>
                <p className="font-semibold text-sm">Parabéns! 🎉</p>
                <p className="text-xs text-muted-foreground">Você completou todos os passos iniciais!</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { dismiss(); markSeen(); }}>Fechar</Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/[0.03]">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold">Comece aqui</CardTitle>
              <span className="text-xs text-muted-foreground ml-1">{completedCount}/{STEPS.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost" size="sm"
                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                {isCollapsed ? <><ChevronDown className="h-3.5 w-3.5" />Ver passos</> : <><ChevronUp className="h-3.5 w-3.5" />Recolher</>}
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => { dismiss(); markSeen(); }} title="Não mostrar mais">
                Não mostrar mais
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={markSeen} title="Fechar">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex items-center gap-2">
              <Progress value={progress!.progress_percentage} className="h-2 flex-1" />
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{Math.round(progress!.progress_percentage)}%</span>
            </div>
            {!isCollapsed && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-2">
                <StepsList progress={progress} onStepClick={state.handleStepClick} />
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <UpgradeDialog
        open={state.showUpgradePopup}
        onOpenChange={state.setShowUpgradePopup}
        onNavigate={() => { state.setShowUpgradePopup(false); navigate("/upgrade"); }}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════
// FLOATING version — shown globally after first visit
// ═══════════════════════════════════════════════════
export function ActivationChecklist() {
  const state = useChecklistState();
  const { progress, dismiss, completedCount, isComplete, shouldShow, hasSeenChecklist, navigate } = state;
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);

  // Only show floating after user has seen inline version
  if (!shouldShow || !hasSeenChecklist) return null;

  // Don't show on excluded routes
  const isExcluded = EXCLUDED_ROUTES.some(
    (r) => location.pathname === r || location.pathname.startsWith("/lp/") || location.pathname.startsWith("/report/") || location.pathname.startsWith("/revenue")
  );
  if (isExcluded) return null;

  return (
    <>
      <div className="fixed bottom-5 right-5 z-50" style={{ maxWidth: 360 }}>
        <AnimatePresence mode="wait">
          {!isExpanded ? (
            <motion.button
              key="minimized"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              onClick={() => setIsExpanded(true)}
              className={cn(
                "flex items-center gap-2.5 px-4 py-3 rounded-2xl border cursor-pointer",
                "bg-card border-primary/20 hover:border-primary/40",
                "shadow-[0_8px_50px_-6px_rgba(0,0,0,0.7),0_4px_20px_-4px_rgba(0,0,0,0.5)]",
                "hover:shadow-[0_12px_60px_-4px_rgba(0,0,0,0.8),0_6px_24px_-2px_rgba(0,0,0,0.6)]",
                "transition-shadow duration-200"
              )}
            >
              <div className="relative">
                <Rocket className="h-5 w-5 text-primary" />
                {completedCount < STEPS.length && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary rounded-[2px] flex items-center justify-center">
                    <span className="text-[9px] font-bold text-primary-foreground">{STEPS.length - completedCount}</span>
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
              <ChevronUp className="h-4 w-4 text-muted-foreground ml-1" />
            </motion.button>
          ) : (
            <motion.div
              key="expanded"
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className={cn(
                "rounded-2xl overflow-hidden border",
                "bg-card border-border",
                "shadow-[0_8px_50px_-6px_rgba(0,0,0,0.7),0_4px_20px_-4px_rgba(0,0,0,0.5)]"
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
                  <span className="text-xs text-muted-foreground">{completedCount}/{STEPS.length}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setIsExpanded(false)} title="Minimizar">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={dismiss} title="Não mostrar mais">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="px-4 py-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Progress value={progress!.progress_percentage} className="h-1.5 flex-1" />
                  <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">{Math.round(progress!.progress_percentage)}%</span>
                </div>
                {isComplete ? (
                  <p className="text-xs text-muted-foreground text-center py-1">Você completou todos os passos iniciais!</p>
                ) : (
                  <StepsList progress={progress} onStepClick={state.handleStepClick} compact />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <UpgradeDialog
        open={state.showUpgradePopup}
        onOpenChange={state.setShowUpgradePopup}
        onNavigate={() => { state.setShowUpgradePopup(false); navigate("/upgrade"); }}
      />
    </>
  );
}
