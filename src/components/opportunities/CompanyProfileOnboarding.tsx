import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Building2, User, Target, Sparkles, ShoppingBag, Users, Loader2, Rocket, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CompanyProfile {
  company_name: string;
  attendant_name: string;
  company_niche: string;
  company_differential: string;
  company_objective: string;
  company_products: string;
  company_target_audience: string;
}

interface Props {
  open: boolean;
  userId: string;
  onComplete: (profile: CompanyProfile) => void;
  onClose?: () => void;
  initialData?: CompanyProfile | null;
}

const STEPS = [
  { key: "company_name", label: "Nome da sua empresa", placeholder: "Ex: Agência Digital XYZ", icon: Building2, description: "Como sua empresa se chama?" },
  { key: "attendant_name", label: "Seu nome (atendente)", placeholder: "Ex: João Silva", icon: User, description: "Quem vai fazer o contato com as oportunidades?" },
  { key: "company_niche", label: "Nicho da empresa", placeholder: "Ex: Marketing Digital, Consultoria Financeira, Fotografia", icon: Target, description: "Em qual segmento sua empresa atua?" },
  { key: "company_differential", label: "Diferencial da empresa", placeholder: "Ex: Atendimento personalizado, 10 anos de experiência, preço justo...", icon: Sparkles, description: "O que torna sua empresa única no mercado?" },
  { key: "company_objective", label: "Objetivo da empresa", placeholder: "Ex: Aumentar carteira de clientes, expandir para novas cidades...", icon: Rocket, description: "Qual o principal objetivo ao prospectar?" },
  { key: "company_products", label: "O que sua empresa vende?", placeholder: "Ex: Sites, gestão de redes sociais, consultorias, produtos físicos...", icon: ShoppingBag, description: "Descreva seus produtos ou serviços principais" },
  { key: "company_target_audience", label: "Para quem você vende?", placeholder: "Ex: Pequenas empresas, restaurantes, clínicas de estética...", icon: Users, description: "Quem é seu público-alvo ideal?" },
] as const;

export function CompanyProfileOnboarding({ open, userId, onComplete, onClose, initialData }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const isEditing = !!initialData;

  const [form, setForm] = useState<CompanyProfile>(initialData || {
    company_name: "",
    attendant_name: "",
    company_niche: "",
    company_differential: "",
    company_objective: "",
    company_products: "",
    company_target_audience: "",
  });

  // Sync form when initialData changes (e.g. opening for edit)
  useEffect(() => {
    if (initialData && open) {
      setForm(initialData);
      setStep(0);
    }
  }, [initialData, open]);

  const currentStep = STEPS[step];
  const currentValue = form[currentStep.key as keyof CompanyProfile];
  const isLastStep = step === STEPS.length - 1;
  const canAdvance = currentValue.trim().length >= 2;

  const allFieldsFilled = Object.values(form).every(v => v.trim().length >= 2);

  const handleNext = async () => {
    if (!canAdvance) return;

    if (isLastStep) {
      if (!allFieldsFilled) {
        toast({ title: "Preencha todos os campos", description: "Todos os campos são obrigatórios para salvar.", variant: "destructive" });
        return;
      }
      setSaving(true);
      try {
        const { error } = await supabase
          .from("company_profiles" as any)
          .upsert({
            user_id: userId,
            ...form,
          } as any, { onConflict: "user_id" });

        if (error) throw error;
        toast({ title: "Perfil salvo com sucesso!", description: "Agora suas mensagens serão personalizadas com IA" });
        onComplete(form);
      } catch (err: any) {
        console.error("Error saving company profile:", err);
        toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
      } finally {
        setSaving(false);
      }
    } else {
      setStep(s => s + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canAdvance && !e.shiftKey) {
      e.preventDefault();
      handleNext();
    }
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  const Icon = currentStep.icon;
  const isLongField = ["company_differential", "company_objective", "company_products", "company_target_audience"].includes(currentStep.key);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && isEditing) handleClose(); }}>
      <DialogContent
        className="sm:max-w-lg"
        hideCloseButton={!isEditing}
        onPointerDownOutside={(e) => { if (!isEditing) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (!isEditing) e.preventDefault(); }}
        onInteractOutside={(e) => { if (!isEditing) e.preventDefault(); }}
      >
        {isEditing && (
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </button>
        )}

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-lg">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles size={18} className="text-primary" />
            </div>
            {isEditing ? "Editar Perfil de Prospecção" : "Configure seu Perfil de Prospecção"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações da sua empresa para manter as mensagens de IA sempre relevantes."
              : "Para gerar mensagens personalizadas com IA, precisamos entender melhor sua empresa. Essas informações serão usadas para criar abordagens únicas para cada oportunidade."}
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex gap-1.5 mt-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon size={20} className="text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">{currentStep.label}</p>
              <p className="text-xs text-muted-foreground">{currentStep.description}</p>
            </div>
          </div>

          {isLongField ? (
            <Textarea
              value={currentValue}
              onChange={(e) => setForm(f => ({ ...f, [currentStep.key]: e.target.value }))}
              placeholder={currentStep.placeholder}
              onKeyDown={handleKeyDown}
              rows={3}
              maxLength={500}
              autoFocus
              className="text-sm"
            />
          ) : (
            <Input
              value={currentValue}
              onChange={(e) => setForm(f => ({ ...f, [currentStep.key]: e.target.value }))}
              placeholder={currentStep.placeholder}
              onKeyDown={handleKeyDown}
              maxLength={200}
              autoFocus
              className="text-sm"
            />
          )}

          <p className="text-[10px] text-muted-foreground text-right">
            Passo {step + 1} de {STEPS.length}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-2">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1">
              Voltar
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!canAdvance || saving}
            className="flex-1 gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Salvando...
              </>
            ) : isLastStep ? (
              <>
                <Rocket size={16} />
                {isEditing ? "Salvar Alterações" : "Começar a Prospectar"}
              </>
            ) : (
              "Próximo"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
