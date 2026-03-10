import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function ActivationChecklist() {
  const { progress, loading, dismiss, updateStep } = useActivationProgress();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);
  const [confettiTriggered, setConfettiTriggered] = useState(false);
  const { fireConfetti, fireSides } = useConfetti();

  const userPlan = profile?.plan?.toLowerCase() || 'free';
  const isFreePlan = userPlan === 'free';

  // Fire confetti when 100%
  useEffect(() => {
    if (progress?.progress_percentage === 100 && !confettiTriggered) {
      setConfettiTriggered(true);
      fireConfetti();
      setTimeout(() => fireSides(), 400);
    }
  }, [progress?.progress_percentage, confettiTriggered, fireConfetti, fireSides]);

  if (loading || !progress || progress.dismissed) return null;

  const handleExploreAICRM = async () => {
    // Always mark as completed
    await updateStep("step_explore_ai_crm_completed", true);

    if (isFreePlan) {
      setShowUpgradePopup(true);
    } else {
      navigate("/agents");
    }
  };

  // Show success message if all steps completed
  if (progress.progress_percentage === 100) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
      >
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PartyPopper className="h-6 w-6 text-primary" />
              <div>
                <p className="font-semibold text-sm">Parabéns! 🎉</p>
                <p className="text-xs text-muted-foreground">
                  Você completou todos os passos iniciais!
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={dismiss}>
              Fechar
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const completedCount = STEPS.filter(
    (s) => progress[s.key as keyof typeof progress]
  ).length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/[0.03]">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold">
                Comece aqui
              </CardTitle>
              <span className="text-xs text-muted-foreground ml-1">
                {completedCount}/{STEPS.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                {isCollapsed ? "Expandir" : "Minimizar"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={dismiss}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <Progress value={progress.progress_percentage} className="h-2" />

            {!isCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2"
              >
                {STEPS.map((step) => {
                  const isCompleted =
                    progress[step.key as keyof typeof progress] === true;
                  const Icon = step.icon;

                  return (
                    <div
                      key={step.key}
                      className={cn(
                        "flex items-center gap-3 rounded-lg p-2.5 transition-colors",
                        isCompleted
                          ? "bg-primary/5"
                          : "bg-muted/30 hover:bg-muted/50"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            isCompleted && "line-through text-muted-foreground"
                          )}
                        >
                          {step.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {step.description}
                        </p>
                      </div>
                      {!isCompleted && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs shrink-0"
                          onClick={() => navigate(step.action)}
                        >
                          <Icon className="h-3 w-3 mr-1" />
                          {step.actionLabel}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
