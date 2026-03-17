import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserEvents } from "@/hooks/useUserEvents";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Star, ChevronRight, ChevronLeft } from "lucide-react";
import { trackTrialNoUpgrade } from "@/hooks/useLandingPageTracking";

interface TrialFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EXPERIENCE_OPTIONS = [
  { value: "will_subscribe", label: "Gostei e pretendo assinar" },
  { value: "liked_not_now", label: "Gostei, mas não é o momento" },
  { value: "not_solved", label: "Não resolveu meu problema" },
  { value: "too_complex", label: "Achei complexa de usar" },
  { value: "technical_issues", label: "Tive problemas técnicos" },
  { value: "price_high", label: "Achei o preço alto" }
];

const NOT_CONTINUE_REASONS = [
  "Não gerei resultados suficientes",
  "Não consegui leads qualificados",
  "Ferramenta complexa",
  "Preço incompatível com meu momento",
  "Preciso de mais tempo para testar",
  "Outro"
];

export function TrialFeedbackModal({ isOpen, onClose }: TrialFeedbackModalProps) {
  const { user } = useAuth();
  const { trackEvent } = useUserEvents();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [experienceStatus, setExperienceStatus] = useState("");
  const [notContinueReason, setNotContinueReason] = useState("");
  const [missingFeatures, setMissingFeatures] = useState("");
  const [npsScore, setNpsScore] = useState<number | null>(null);

  const showReasonStep = experienceStatus && experienceStatus !== "will_subscribe";
  const totalSteps = showReasonStep ? 4 : 3;

  const getActualStep = () => {
    if (!showReasonStep && step > 1) return step + 1;
    return step;
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.from('trial_feedback').insert({
        user_id: user.id,
        experience_status: experienceStatus,
        not_continue_reason: notContinueReason || null,
        missing_features: missingFeatures || null,
        nps_score: npsScore
      });

      if (error) throw error;

      await trackEvent('trial_feedback_submitted', {
        experience_status: experienceStatus,
        nps_score: npsScore
      });

      if (experienceStatus === "will_subscribe") {
        await trackEvent('trial_converted');
        toast.success("Ótimo! Vamos te levar para os planos 🚀");
        onClose();
        navigate('/upgrade');
      } else {
        await trackEvent('trial_not_converted', {
          reason: notContinueReason
        });
        // Track for landing page analytics
        if (user) {
          await trackTrialNoUpgrade(user.id);
        }
        toast.success("Obrigado pelo feedback! Seu teste gratuito encerrou.");
        onClose();
        navigate('/upgrade?expired=true');
      }
    } catch (error) {
      console.error('Error saving feedback:', error);
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    const actualStep = getActualStep();
    
    if (step === 1 && experienceStatus === "will_subscribe") {
      // Skip reason step, go to missing features
      setStep(2);
    } else if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const canProceed = () => {
    const actualStep = getActualStep();
    switch (actualStep) {
      case 1: return experienceStatus !== "";
      case 2: return !showReasonStep || notContinueReason !== "";
      case 3: return true; // Optional
      case 4: return true; // Optional
      default: return false;
    }
  };

  const renderStep = () => {
    const actualStep = getActualStep();
    
    // Step 1 - Experience Status
    if (step === 1) {
      return (
        <div className="space-y-4">
          <Label className="text-base font-medium">
            Qual opção melhor descreve sua experiência com a ferramenta?
          </Label>
          <RadioGroup value={experienceStatus} onValueChange={setExperienceStatus}>
            {EXPERIENCE_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50">
                <RadioGroupItem value={option.value} id={option.value} />
                <Label htmlFor={option.value} className="cursor-pointer flex-1">{option.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      );
    }

    // Step 2 - Reason (conditional) or Missing Features
    if (step === 2) {
      if (showReasonStep) {
        return (
          <div className="space-y-4">
            <Label className="text-base font-medium">
              Qual foi o principal motivo para não continuar agora?
            </Label>
            <RadioGroup value={notContinueReason} onValueChange={setNotContinueReason}>
              {NOT_CONTINUE_REASONS.map((reason) => (
                <div key={reason} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value={reason} id={reason} />
                  <Label htmlFor={reason} className="cursor-pointer flex-1">{reason}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );
      } else {
        // Missing features for those who will subscribe
        return (
          <div className="space-y-4">
            <Label className="text-base font-medium">
              O que faltou para você continuar usando a ferramenta?
            </Label>
            <p className="text-sm text-muted-foreground">Opcional</p>
            <Textarea 
              value={missingFeatures}
              onChange={(e) => setMissingFeatures(e.target.value)}
              placeholder="Conte-nos o que podemos melhorar..."
              rows={4}
            />
          </div>
        );
      }
    }

    // Step 3 - Missing Features (for non-subscribers) or NPS
    if (step === 3) {
      if (showReasonStep) {
        return (
          <div className="space-y-4">
            <Label className="text-base font-medium">
              O que faltou para você continuar usando a ferramenta?
            </Label>
            <p className="text-sm text-muted-foreground">Opcional</p>
            <Textarea 
              value={missingFeatures}
              onChange={(e) => setMissingFeatures(e.target.value)}
              placeholder="Conte-nos o que podemos melhorar..."
              rows={4}
            />
          </div>
        );
      } else {
        // NPS for those who will subscribe
        return (
          <div className="space-y-4">
            <Label className="text-base font-medium">
              Em uma escala de 0 a 10, o quanto você indicaria a ferramenta para um amigo ou colega?
            </Label>
            <p className="text-sm text-muted-foreground">Opcional</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {Array.from({ length: 11 }).map((_, i) => (
                <Button
                  key={i}
                  variant={npsScore === i ? "default" : "outline"}
                  size="sm"
                  className="w-10 h-10"
                  onClick={() => setNpsScore(i)}
                >
                  {i}
                </Button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground px-1">
              <span>Não indicaria</span>
              <span>Indicaria muito</span>
            </div>
          </div>
        );
      }
    }

    // Step 4 - NPS (for non-subscribers only)
    if (step === 4) {
      return (
        <div className="space-y-4">
          <Label className="text-base font-medium">
            Em uma escala de 0 a 10, o quanto você indicaria a ferramenta para um amigo ou colega?
          </Label>
          <p className="text-sm text-muted-foreground">Opcional</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {Array.from({ length: 11 }).map((_, i) => (
              <Button
                key={i}
                variant={npsScore === i ? "default" : "outline"}
                size="sm"
                className="w-10 h-10"
                onClick={() => setNpsScore(i)}
              >
                {i}
              </Button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground px-1">
            <span>Não indicaria</span>
            <span>Indicaria muito</span>
          </div>
        </div>
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Seu período de teste terminou
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
              Fechar
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Nos ajude a melhorar respondendo algumas perguntas rápidas
          </p>
          <div className="flex gap-1 mt-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i < step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </DialogHeader>

        <div className="py-4 min-h-[280px]">
          {renderStep()}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={step === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <Button
            onClick={nextStep}
            disabled={!canProceed() || loading}
          >
            {step === totalSteps ? (
              experienceStatus === "will_subscribe" ? "Ver Planos" : "Enviar Feedback"
            ) : (
              <>Próximo<ChevronRight className="h-4 w-4 ml-1" /></>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
