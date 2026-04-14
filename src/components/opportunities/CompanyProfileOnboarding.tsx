import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Building2, User, Target, Sparkles, ShoppingBag, Users, Loader2, Rocket, X, Plus, Trash2, DollarSign } from "lucide-react";
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

interface ServiceItem {
  name: string;
  average_ticket: number;
  description: string;
}

interface Props {
  open: boolean;
  userId: string;
  onComplete: (profile: CompanyProfile) => void;
  onClose?: () => void;
  initialData?: CompanyProfile | null;
}

const createEmptyCompanyProfile = (): CompanyProfile => ({
  company_name: "",
  attendant_name: "",
  company_niche: "",
  company_differential: "",
  company_objective: "",
  company_products: "",
  company_target_audience: "",
});

const normalizeCompanyProfile = (data?: Partial<Record<keyof CompanyProfile, unknown>> | null): CompanyProfile => ({
  company_name: typeof data?.company_name === "string" ? data.company_name : "",
  attendant_name: typeof data?.attendant_name === "string" ? data.attendant_name : "",
  company_niche: typeof data?.company_niche === "string" ? data.company_niche : "",
  company_differential: typeof data?.company_differential === "string" ? data.company_differential : "",
  company_objective: typeof data?.company_objective === "string" ? data.company_objective : "",
  company_products: typeof data?.company_products === "string" ? data.company_products : "",
  company_target_audience: typeof data?.company_target_audience === "string" ? data.company_target_audience : "",
});

const PROFILE_STEPS = [
  { key: "company_name", label: "Nome da sua empresa", placeholder: "Ex: Agência Digital XYZ", icon: Building2, description: "Como sua empresa se chama?" },
  { key: "attendant_name", label: "Seu nome (atendente)", placeholder: "Ex: João Silva", icon: User, description: "Quem vai fazer o contato com as oportunidades?" },
  { key: "company_niche", label: "Nicho da empresa", placeholder: "Ex: Marketing Digital, Consultoria Financeira, Fotografia", icon: Target, description: "Em qual segmento sua empresa atua?" },
  { key: "company_differential", label: "Diferencial da empresa", placeholder: "Ex: Atendimento personalizado, 10 anos de experiência, preço justo...", icon: Sparkles, description: "O que torna sua empresa única no mercado?" },
  { key: "company_objective", label: "Objetivo da empresa", placeholder: "Ex: Aumentar carteira de clientes, expandir para novas cidades...", icon: Rocket, description: "Qual o principal objetivo ao prospectar?" },
  { key: "company_products", label: "O que sua empresa vende?", placeholder: "Ex: Sites, gestão de redes sociais, consultorias, produtos físicos...", icon: ShoppingBag, description: "Descreva seus produtos ou serviços principais" },
  { key: "company_target_audience", label: "Para quem você vende?", placeholder: "Ex: Pequenas empresas, restaurantes, clínicas de estética...", icon: Users, description: "Quem é seu público-alvo ideal?" },
] as const;

// Total steps = profile steps + 1 services step
const TOTAL_STEPS = PROFILE_STEPS.length + 1;
const SERVICES_STEP_INDEX = PROFILE_STEPS.length;

export function CompanyProfileOnboarding({ open, userId, onComplete, onClose, initialData }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const isEditing = !!initialData;

  const [form, setForm] = useState<CompanyProfile>(() => normalizeCompanyProfile(initialData));
  const [services, setServices] = useState<ServiceItem[]>([{ name: "", average_ticket: 0, description: "" }]);

  // Load existing services when opening
  useEffect(() => {
    if (!open) return;
    setForm(initialData ? normalizeCompanyProfile(initialData) : createEmptyCompanyProfile());
    setStep(0);

    // Load existing services
    const loadServices = async () => {
      const { data } = await supabase
        .from("company_services")
        .select("name, average_ticket, description")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (data && data.length > 0) {
        setServices(data.map(s => ({
          name: s.name || "",
          average_ticket: Number(s.average_ticket) || 0,
          description: s.description || "",
        })));
      } else {
        setServices([{ name: "", average_ticket: 0, description: "" }]);
      }
    };
    loadServices();
  }, [initialData, open, userId]);

  const isServiceStep = step === SERVICES_STEP_INDEX;
  const isProfileStep = step < PROFILE_STEPS.length;

  const currentProfileStep = isProfileStep ? PROFILE_STEPS[step] : null;
  const currentValue = currentProfileStep ? (form[currentProfileStep.key as keyof CompanyProfile] ?? "") : "";
  const isLastStep = step === TOTAL_STEPS - 1;

  const canAdvanceProfile = isProfileStep ? currentValue.trim().length >= 2 : true;
  const canAdvanceServices = services.length > 0 && services.every(s => s.name.trim().length >= 2 && s.average_ticket > 0);

  const canAdvance = isProfileStep ? canAdvanceProfile : canAdvanceServices;

  const allProfileFieldsFilled = PROFILE_STEPS.every(({ key }) => (form[key as keyof CompanyProfile] ?? "").trim().length >= 2);

  const addService = () => {
    if (services.length >= 10) return;
    setServices(prev => [...prev, { name: "", average_ticket: 0, description: "" }]);
  };

  const removeService = (index: number) => {
    if (services.length <= 1) return;
    setServices(prev => prev.filter((_, i) => i !== index));
  };

  const updateService = (index: number, field: keyof ServiceItem, value: string | number) => {
    setServices(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const handleNext = async () => {
    if (!canAdvance) return;

    if (isLastStep) {
      if (!allProfileFieldsFilled || !canAdvanceServices) {
        toast({ title: "Preencha todos os campos", description: "Todos os campos são obrigatórios.", variant: "destructive" });
        return;
      }
      setSaving(true);
      try {
        // Save company profile
        const { error } = await supabase
          .from("company_profiles" as any)
          .upsert({
            user_id: userId,
            ...form,
          } as any, { onConflict: "user_id" });
        if (error) throw error;

        // Save services
        await supabase.from("company_services").delete().eq("user_id", userId);
        const validServices = services.filter(s => s.name.trim().length >= 2 && s.average_ticket > 0);
        if (validServices.length > 0) {
          const { error: svcError } = await supabase.from("company_services").insert(
            validServices.map(s => ({
              user_id: userId,
              name: s.name.trim(),
              average_ticket: s.average_ticket,
              description: s.description.trim() || null,
            }))
          );
          if (svcError) throw svcError;
        }

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
    if (e.key === "Enter" && canAdvance && !e.shiftKey && !isServiceStep) {
      e.preventDefault();
      handleNext();
    }
  };

  const handleClose = () => {
    if (saving) return;
    if (onClose) onClose();
  };

  const isLongField = currentProfileStep
    ? ["company_differential", "company_objective", "company_products", "company_target_audience"].includes(currentProfileStep.key)
    : false;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        hideCloseButton={!isEditing}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
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
              : "Para gerar mensagens personalizadas com IA, precisamos entender melhor sua empresa."}
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex gap-1.5 mt-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
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
          {isProfileStep && currentProfileStep && (
            <>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  {(() => { const Icon = currentProfileStep.icon; return <Icon size={20} className="text-primary" />; })()}
                </div>
                <div>
                  <p className="font-medium text-sm">{currentProfileStep.label}</p>
                  <p className="text-xs text-muted-foreground">{currentProfileStep.description}</p>
                </div>
              </div>

              {isLongField ? (
                <Textarea
                  value={currentValue}
                  onChange={(e) => setForm(f => ({ ...f, [currentProfileStep.key]: e.target.value }))}
                  placeholder={currentProfileStep.placeholder}
                  onKeyDown={handleKeyDown}
                  rows={3}
                  maxLength={500}
                  autoFocus
                  className="text-sm"
                />
              ) : (
                <Input
                  value={currentValue}
                  onChange={(e) => setForm(f => ({ ...f, [currentProfileStep.key]: e.target.value }))}
                  placeholder={currentProfileStep.placeholder}
                  onKeyDown={handleKeyDown}
                  maxLength={200}
                  autoFocus
                  className="text-sm"
                />
              )}
            </>
          )}

          {isServiceStep && (
            <>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <DollarSign size={20} className="text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Serviços vendidos</p>
                  <p className="text-xs text-muted-foreground">
                    Cadastre seus serviços e o ticket médio de cada um. O ticket médio é a média entre o valor mínimo e máximo cobrado.
                  </p>
                </div>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {services.map((service, index) => (
                  <div key={index} className="p-3 rounded-xl border border-border/50 bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Serviço {index + 1}</span>
                      {services.length > 1 && (
                        <button
                          onClick={() => removeService(index)}
                          className="text-destructive/60 hover:text-destructive transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <Input
                      value={service.name}
                      onChange={(e) => updateService(index, "name", e.target.value)}
                      placeholder="Nome do serviço (ex: Gestão de Redes Sociais)"
                      className="text-sm"
                      maxLength={100}
                    />
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                      <Input
                        type="number"
                        value={service.average_ticket || ""}
                        onChange={(e) => updateService(index, "average_ticket", parseFloat(e.target.value) || 0)}
                        placeholder="Ticket médio (ex: 2500)"
                        className="text-sm pl-9"
                        min={0}
                      />
                    </div>
                    <Input
                      value={service.description}
                      onChange={(e) => updateService(index, "description", e.target.value)}
                      placeholder="Descrição breve (opcional)"
                      className="text-sm"
                      maxLength={200}
                    />
                  </div>
                ))}
              </div>

              {services.length < 10 && (
                <Button variant="outline" size="sm" onClick={addService} className="gap-1.5 text-xs w-full">
                  <Plus size={14} />
                  Adicionar outro serviço
                </Button>
              )}

              {services.length > 0 && services.some(s => s.average_ticket > 0) && (
                <div className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg">
                  <span className="font-medium text-foreground">Ticket médio geral: </span>
                  R$ {(services.filter(s => s.average_ticket > 0).reduce((a, b) => a + b.average_ticket, 0) / services.filter(s => s.average_ticket > 0).length).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                </div>
              )}
            </>
          )}

          <p className="text-[10px] text-muted-foreground text-right">
            Passo {step + 1} de {TOTAL_STEPS}
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
