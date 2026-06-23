import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserEvents } from "@/hooks/useUserEvents";
import { useUserScoreTracking } from "@/hooks/useUserScoreTracking";
import { toast } from "sonner";
import { ChevronRight, ChevronLeft, Sparkles, PartyPopper } from "lucide-react";
import { useConfetti } from "@/components/ui/confetti";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const USER_PROFILES = [
  "Dono de negócio / Prestador de serviços",
  "Freelancer",
  "Agência de marketing",
  "Vendedor / SDR / Closer",
  "Afiliado",
  "Autônomo",
  "Outro"
];

const SERVICE_TYPES = [
  "Tráfego pago (Google / Meta Ads)",
  "Marketing digital / Social media",
  "Criação de sites / landing pages",
  "Sistemas / SaaS / Automação",
  "Consultoria / Serviços B2B em geral",
  "Outro"
];

const OBJECTIVES = [
  "Encontrar empresas com alto potencial de compra",
  "Escalar prospecção sem aumentar equipe",
  "Automatizar a curadoria de leads",
  "Fazer contatos em volume (disparos)",
  "Validar um novo serviço ou oferta"
];

const TEAM_SIZES = [
  "Apenas eu",
  "até 5",
  "até 10",
  "até 50",
  "+100"
];

const EXPERIENCE_OPTIONS = [
  "Sim, uso atualmente",
  "Já usei, mas parei",
  "Não, essa é minha primeira vez"
];

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const { user } = useAuth();
  const { trackEvent } = useUserEvents();
  const { trackScoreEvent } = useUserScoreTracking();
  const { fireConfetti, fireSides } = useConfetti();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [userProfile, setUserProfile] = useState("");
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [mainObjective, setMainObjective] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [previousExperience, setPreviousExperience] = useState("");
  const [previousTool, setPreviousTool] = useState("");

  // Fire confetti when reaching congratulations step
  useEffect(() => {
    if (step === 6) {
      fireConfetti();
      setTimeout(() => {
        fireSides();
      }, 300);
    }
  }, [step, fireConfetti, fireSides]);

  const totalSteps = 6;

  const handleServiceTypeToggle = (service: string) => {
    setServiceTypes(prev => 
      prev.includes(service) 
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  };

  const canProceed = () => {
    switch (step) {
      case 1: return userProfile !== "";
      case 2: return serviceTypes.length > 0;
      case 3: return mainObjective !== "";
      case 4: return teamSize !== "";
      case 5: return true; // Optional step
      case 6: return true; // Congratulations step
      default: return false;
    }
  };

  const handleSkip = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await supabase.from('user_onboarding').insert({
        user_id: user.id,
        user_profile: "skipped",
        service_types: [],
        main_objective: "skipped",
        team_size: "skipped",
        skipped: true
      });
      
      await trackEvent('onboarding_skipped');
      onClose();
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.from('user_onboarding').insert({
        user_id: user.id,
        user_profile: userProfile,
        service_types: serviceTypes,
        main_objective: mainObjective,
        team_size: teamSize,
        previous_experience: previousExperience || null,
        previous_tool: previousTool || null,
        skipped: false,
        completed_at: new Date().toISOString(),
      });


      if (error) throw error;

      await trackEvent('onboarding_completed', {
        user_profile: userProfile,
        service_types: serviceTypes,
        main_objective: mainObjective,
        team_size: teamSize
      });

      // Track score event
      trackScoreEvent("onboarding_completed");

      // Go to congratulations step instead of closing
      setStep(6);
    } catch (error) {
      console.error('Error saving onboarding:', error);
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 5) {
      // Save data before showing congratulations
      handleSubmit();
    } else if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Close on congratulations step
      onClose();
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Conte-nos sobre você
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleSkip} disabled={loading}>
              Pular
            </Button>
          </div>
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

        <div className="py-4 min-h-[300px]">
          {/* Step 1 - User Profile */}
          {step === 1 && (
            <div className="space-y-4">
              <Label className="text-base font-medium">
                Qual opção melhor descreve você?
              </Label>
              <RadioGroup value={userProfile} onValueChange={setUserProfile}>
                {USER_PROFILES.map((profile) => (
                  <div key={profile} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value={profile} id={profile} />
                    <Label htmlFor={profile} className="cursor-pointer flex-1">{profile}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Step 2 - Service Types */}
          {step === 2 && (
            <div className="space-y-4">
              <Label className="text-base font-medium">
                Qual tipo de serviço você pretende vender?
              </Label>
              <p className="text-sm text-muted-foreground">Selecione uma ou mais opções</p>
              <div className="space-y-2">
                {SERVICE_TYPES.map((service) => {
                  const checkboxId = `service-${service.replace(/\s+/g, '-').toLowerCase()}`;
                  return (
                    <div 
                      key={service} 
                      className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleServiceTypeToggle(service)}
                    >
                      <Checkbox 
                        id={checkboxId}
                        checked={serviceTypes.includes(service)} 
                        className="pointer-events-none"
                      />
                      <Label htmlFor={checkboxId} className="cursor-pointer flex-1 pointer-events-none">{service}</Label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3 - Main Objective */}
          {step === 3 && (
            <div className="space-y-4">
              <Label className="text-base font-medium">
                Qual é seu principal objetivo usando a ferramenta?
              </Label>
              <RadioGroup value={mainObjective} onValueChange={setMainObjective}>
                {OBJECTIVES.map((objective) => (
                  <div key={objective} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value={objective} id={objective} />
                    <Label htmlFor={objective} className="cursor-pointer flex-1">{objective}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Step 4 - Team Size */}
          {step === 4 && (
            <div className="space-y-4">
              <Label className="text-base font-medium">
                Qual tamanho da sua equipe?
              </Label>
              <RadioGroup value={teamSize} onValueChange={setTeamSize}>
                {TEAM_SIZES.map((size) => (
                  <div key={size} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value={size} id={size} />
                    <Label htmlFor={size} className="cursor-pointer flex-1">{size}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Step 5 - Previous Experience (Optional) */}
          {step === 5 && (
            <div className="space-y-4">
              <Label className="text-base font-medium">
                Você já usou alguma ferramenta de prospecção ou disparos?
              </Label>
              <p className="text-sm text-muted-foreground">Opcional</p>
              <RadioGroup value={previousExperience} onValueChange={setPreviousExperience}>
                {EXPERIENCE_OPTIONS.map((option) => (
                  <div key={option} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value={option} id={option} />
                    <Label htmlFor={option} className="cursor-pointer flex-1">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
              
              {(previousExperience === "Sim, uso atualmente" || previousExperience === "Já usei, mas parei") && (
                <div className="mt-4">
                  <Label className="text-sm">Se quiser, diga qual ferramenta usou</Label>
                  <Input 
                    value={previousTool}
                    onChange={(e) => setPreviousTool(e.target.value)}
                    placeholder="Nome da ferramenta"
                    className="mt-2"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 6 - Congratulations */}
          {step === 6 && (
            <div className="flex flex-col items-center justify-center text-center space-y-6 py-8">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <PartyPopper className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Parabéns! 🎉</h3>
                <p className="text-muted-foreground max-w-sm">
                  Obrigado por compartilhar suas informações. Agora podemos personalizar sua experiência e ajudá-lo a alcançar seus objetivos!
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-primary">
                <Sparkles className="h-4 w-4" />
                <span>Vamos começar sua jornada!</span>
              </div>
            </div>
          )}
        </div>

        {step !== 6 ? (
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
              {step === 5 ? "Concluir" : "Próximo"}
              {step !== 5 && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        ) : (
          <div className="flex justify-center pt-4 border-t">
            <Button
              onClick={() => {
                onClose();
                try {
                  window.dispatchEvent(new Event("wiize:onboarding-done"));
                } catch {}
              }}
              className="px-8"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Começar
            </Button>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
