import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Bot, 
  ArrowRight, 
  ArrowLeft, 
  Check,
  MessageCircle,
  Clock,
  Flame,
  Loader2,
  AlertTriangle,
  Plus,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AgentPromptBuilder } from "./AgentPromptBuilder";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CreateAgentWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

interface WhatsAppNumber {
  id: string;
  name: string;
  phone_number: string | null;
  is_connected: boolean;
  warming_status?: string;
  warming_level?: number;
  has_active_agent?: boolean;
  active_agent_name?: string;
}

type WizardStep = 'name' | 'number' | 'prompt-builder' | 'settings' | 'confirmation';

const MESSAGE_TEMPLATES = {
  prospecting: [
    "Oi {nome}, tudo bem? Vi seu trabalho e achei interessante.",
    "Olá {nome}! Passando pra conhecer melhor seu negócio.",
    "{nome}, boa tarde! Vi que você trabalha com {categoria}, certo?",
  ],
  warming: [
    "Oi, tudo bem?",
    "Olá! Como você está?",
    "Boa tarde! Tudo certo por aí?",
  ],
  first_contact: [
    "Oi {nome}, prazer em conhecer você!",
    "Olá {nome}! Vim me apresentar.",
    "{nome}, boa tarde! Posso tirar uma dúvida rápida?",
  ],
};

export function CreateAgentWizard({ open, onOpenChange, onCreated }: CreateAgentWizardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState<WizardStep>('name');
  const [loading, setLoading] = useState(false);
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [loadingNumbers, setLoadingNumbers] = useState(true);

  // Form state
  const [name, setName] = useState("");
  const [selectedNumberId, setSelectedNumberId] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [promptConfig, setPromptConfig] = useState<any>(null);
  const [operatingHoursStart, setOperatingHoursStart] = useState("08:00");
  const [operatingHoursEnd, setOperatingHoursEnd] = useState("18:00");
  const [isWarmed, setIsWarmed] = useState(false);
  const [maxReplies, setMaxReplies] = useState<number | null>(null);
  const [maxChars, setMaxChars] = useState(300);

  // Fetch WhatsApp numbers
  useEffect(() => {
    const fetchNumbers = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('whatsapp_numbers')
          .select('id, name, phone_number, is_connected')
          .eq('user_id', user.id)
          .eq('is_connected', true);

        if (error) throw error;

        // Fetch warming status AND check for existing agents for each number
        const numbersWithData = await Promise.all(
          (data || []).map(async (num) => {
            const [warmingResult, agentResult] = await Promise.all([
              supabase
                .from('warming_sessions')
                .select('warming_status, warming_level')
                .eq('whatsapp_number_id', num.id)
                .single(),
              supabase
                .from('ai_agents')
                .select('id, name, status')
                .eq('whatsapp_number_id', num.id)
                .in('status', ['active', 'paused', 'warming'])
                .limit(1)
            ]);

            const activeAgent = agentResult.data?.[0];

            return {
              ...num,
              warming_status: warmingResult.data?.warming_status,
              warming_level: warmingResult.data?.warming_level,
              has_active_agent: !!activeAgent,
              active_agent_name: activeAgent?.name,
            };
          })
        );

        setNumbers(numbersWithData);
        
        // Auto-select if only one number is connected AND it doesn't have an agent
        const availableNumbers = numbersWithData.filter(n => !n.has_active_agent);
        if (availableNumbers.length === 1) {
          setSelectedNumberId(availableNumbers[0].id);
          const isWarm = availableNumbers[0].warming_status === 'hot' || 
            (availableNumbers[0].warming_level && availableNumbers[0].warming_level >= 3);
          setIsWarmed(isWarm);
        }
      } catch (error) {
        console.error('Error fetching numbers:', error);
      } finally {
        setLoadingNumbers(false);
      }
    };

    if (open) {
      fetchNumbers();
    }
  }, [user, open]);

  // Update warming status based on selected number
  useEffect(() => {
    const selectedNumber = numbers.find(n => n.id === selectedNumberId);
    if (selectedNumber) {
      const isWarm = selectedNumber.warming_status === 'hot' || (selectedNumber.warming_level && selectedNumber.warming_level >= 3);
      setIsWarmed(isWarm);
    }
  }, [selectedNumberId, numbers]);

  const resetForm = () => {
    setCurrentStep('name');
    setName("");
    setSelectedNumberId("");
    setGeneratedPrompt("");
    setPromptConfig(null);
    setOperatingHoursStart("08:00");
    setOperatingHoursEnd("18:00");
    setIsWarmed(false);
    setMaxReplies(null);
    setMaxChars(300);
  };

  const handleCreate = async (activate: boolean) => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Extract some info from promptConfig if available
      const objective = promptConfig?.identity?.salesApproach === 'close' ? 'prospecting' : 
                       promptConfig?.identity?.salesApproach === 'educate' ? 'first_contact' : 'prospecting';
      
      const { data, error } = await supabase
        .from('ai_agents')
        .insert({
          user_id: user.id,
          name,
          whatsapp_number_id: selectedNumberId,
          objective,
          target_audience: promptConfig?.leadContext?.leadAwareness || '',
          system_prompt: generatedPrompt,
          agent_objective: promptConfig?.cta?.conversationGoal || '',
          end_conversation_criteria: promptConfig?.cta?.endConditions?.join(', ') || '',
          post_response_behavior: promptConfig?.opening?.openingStyle || '',
          communication_style: 'neutral',
          operating_hours_start: operatingHoursStart,
          operating_hours_end: operatingHoursEnd,
          is_warmed: isWarmed,
          max_replies: maxReplies,
          status: activate ? 'active' : 'draft',
          message_templates: MESSAGE_TEMPLATES[objective as keyof typeof MESSAGE_TEMPLATES] || MESSAGE_TEMPLATES.prospecting,
          max_response_chars: maxChars,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: activate ? "Agente ativado!" : "Agente salvo como rascunho",
        description: `${name} foi criado com sucesso.`,
      });

      resetForm();
      onOpenChange(false);
      onCreated();
    } catch (error) {
      console.error('Error creating agent:', error);
      toast({
        title: "Erro ao criar agente",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStepProgress = (): number => {
    const steps: WizardStep[] = ['name', 'number', 'prompt-builder', 'settings', 'confirmation'];
    const currentIndex = steps.indexOf(currentStep);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  const getStepTitle = (): string => {
    switch (currentStep) {
      case 'name': return 'Nome do Agente';
      case 'number': return 'Número WhatsApp';
      case 'prompt-builder': return 'Construtor de Prompt';
      case 'settings': return 'Configurações';
      case 'confirmation': return 'Confirmação';
      default: return '';
    }
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'name': return name.trim().length >= 3;
      case 'number': return !!selectedNumberId;
      case 'prompt-builder': return !!generatedPrompt;
      case 'settings': return true;
      case 'confirmation': return true;
      default: return true;
    }
  };

  const handlePromptComplete = (prompt: string, config: any) => {
    setGeneratedPrompt(prompt);
    setPromptConfig(config);
    
    // Extract maxChars from config if available
    if (config?.rules?.maxChars) {
      setMaxChars(parseInt(config.rules.maxChars));
    }
    
    setCurrentStep('settings');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'name':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Bot className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-xl font-semibold">Qual o nome do seu agente?</h3>
              <p className="text-muted-foreground text-sm">
                Escolha um nome que ajude você a identificar este agente
              </p>
            </div>
            <Input
              placeholder="Ex: Prospector Imobiliário"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-center text-lg"
              autoFocus
            />
          </div>
        );

      case 'number':
        if (numbers.length === 1 && !numbers[0].has_active_agent) {
          const singleNumber = numbers[0];
          return (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <MessageCircle className="h-12 w-12 mx-auto text-primary" />
                <h3 className="text-xl font-semibold">Número selecionado automaticamente</h3>
                <p className="text-muted-foreground text-sm">
                  Você tem apenas um número conectado
                </p>
              </div>
              
              <div className="p-4 rounded-lg border border-primary bg-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{singleNumber.name || singleNumber.phone_number}</p>
                    {singleNumber.phone_number && singleNumber.name && (
                      <p className="text-sm text-muted-foreground">{singleNumber.phone_number}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {singleNumber.warming_status === 'hot' ? (
                      <Badge className="bg-green-500/20 text-green-400">Aquecido</Badge>
                    ) : singleNumber.warming_status === 'warm' ? (
                      <Badge className="bg-yellow-500/20 text-yellow-400">Morno</Badge>
                    ) : (
                      <Badge className="bg-blue-500/20 text-blue-400">Frio</Badge>
                    )}
                    <Check className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <MessageCircle className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-xl font-semibold">Qual número este agente vai usar?</h3>
              <p className="text-muted-foreground text-sm">
                Selecione um número de WhatsApp conectado
              </p>
            </div>
            
            {loadingNumbers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : numbers.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <AlertTriangle className="h-8 w-8 mx-auto text-yellow-500" />
                <p className="text-muted-foreground">
                  Nenhum número conectado encontrado.
                </p>
                <Button 
                  onClick={() => {
                    onOpenChange(false);
                    navigate('/dashboard');
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Conectar Número
                </Button>
              </div>
            ) : numbers.filter(n => !n.has_active_agent).length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <AlertTriangle className="h-8 w-8 mx-auto text-yellow-500" />
                <p className="text-muted-foreground">
                  Todos os seus números já têm agentes ativos.
                </p>
                <p className="text-sm text-muted-foreground">
                  Limite de 1 agente por número para proteção.
                </p>
              </div>
            ) : (
              <RadioGroup value={selectedNumberId} onValueChange={setSelectedNumberId}>
                <div className="space-y-2">
                  {numbers.map((num) => (
                    <Label
                      key={num.id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                        num.has_active_agent 
                          ? 'cursor-not-allowed opacity-50 border-border' 
                          : selectedNumberId === num.id 
                            ? 'border-primary bg-primary/5 cursor-pointer' 
                            : 'border-border hover:border-primary/50 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem 
                          value={num.id} 
                          disabled={num.has_active_agent}
                        />
                        <div>
                          <p className="font-medium">{num.name || num.phone_number}</p>
                          {num.phone_number && num.name && (
                            <p className="text-sm text-muted-foreground">{num.phone_number}</p>
                          )}
                          {num.has_active_agent && (
                            <p className="text-xs text-yellow-500 mt-1">
                              Já tem agente: {num.active_agent_name}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {num.has_active_agent ? (
                          <Badge className="bg-yellow-500/20 text-yellow-400">Ocupado</Badge>
                        ) : num.warming_status === 'hot' ? (
                          <Badge className="bg-green-500/20 text-green-400">Aquecido</Badge>
                        ) : num.warming_status === 'warm' ? (
                          <Badge className="bg-yellow-500/20 text-yellow-400">Morno</Badge>
                        ) : (
                          <Badge className="bg-blue-500/20 text-blue-400">Frio</Badge>
                        )}
                      </div>
                    </Label>
                  ))}
                </div>
              </RadioGroup>
            )}
          </div>
        );

      case 'prompt-builder':
        return (
          <AgentPromptBuilder
            onComplete={handlePromptComplete}
            onBack={() => setCurrentStep('number')}
          />
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Clock className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-xl font-semibold">Configurações de Operação</h3>
              <p className="text-muted-foreground text-sm">
                Defina horários e limites do agente
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hora inicial</Label>
                <Input
                  type="time"
                  value={operatingHoursStart}
                  onChange={(e) => setOperatingHoursStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Hora final</Label>
                <Input
                  type="time"
                  value={operatingHoursEnd}
                  onChange={(e) => setOperatingHoursEnd(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Máximo de respostas por lead</Label>
              <Select
                value={maxReplies === null ? "unlimited" : String(maxReplies)}
                onValueChange={(v) => setMaxReplies(v === "unlimited" ? null : parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o limite" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unlimited">♾️ Ilimitado (conversa contínua)</SelectItem>
                  <SelectItem value="1">1 resposta</SelectItem>
                  <SelectItem value="2">2 respostas</SelectItem>
                  <SelectItem value="3">3 respostas</SelectItem>
                  <SelectItem value="5">5 respostas</SelectItem>
                  <SelectItem value="10">10 respostas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Máximo de caracteres por resposta</Label>
              <Input
                type="number"
                value={maxChars}
                onChange={(e) => setMaxChars(parseInt(e.target.value) || 300)}
                min={100}
                max={1000}
              />
            </div>

            <div className="space-y-2">
              <Label>Status do número</Label>
              <RadioGroup value={isWarmed ? "yes" : "no"} onValueChange={(v) => setIsWarmed(v === "yes")}>
                <div className="grid grid-cols-2 gap-2">
                  <Label
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isWarmed ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value="yes" />
                    <div>
                      <p className="font-medium text-sm">Aquecido</p>
                      <p className="text-xs text-muted-foreground">Delays normais</p>
                    </div>
                  </Label>
                  <Label
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      !isWarmed ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value="no" />
                    <div>
                      <p className="font-medium text-sm">Frio</p>
                      <p className="text-xs text-muted-foreground">Modo seguro</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      case 'confirmation':
        const selectedNumber = numbers.find(n => n.id === selectedNumberId);
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <Sparkles className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-xl font-semibold">Tudo pronto!</h3>
              <p className="text-muted-foreground text-sm">
                Revise as configurações antes de criar
              </p>
            </div>
            
            <ScrollArea className="h-[300px]">
              <div className="space-y-2 text-sm pr-4">
                <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-muted-foreground">Nome</span>
                  <span className="font-medium">{name}</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-muted-foreground">Número</span>
                  <span className="font-medium">{selectedNumber?.name || selectedNumber?.phone_number}</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-muted-foreground">Horário</span>
                  <span className="font-medium">{operatingHoursStart} - {operatingHoursEnd}</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-muted-foreground">Max caracteres</span>
                  <span className="font-medium">{maxChars} caracteres</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-muted-foreground">Respostas por lead</span>
                  <span className="font-medium">
                    {maxReplies === null ? "♾️ Ilimitado" : `${maxReplies} resposta${maxReplies > 1 ? 's' : ''}`}
                  </span>
                </div>
                <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-muted-foreground">Status do número</span>
                  <Badge className={isWarmed ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}>
                    {isWarmed ? "Aquecido" : "Frio (modo seguro)"}
                  </Badge>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <span className="text-muted-foreground block mb-2">Prompt gerado</span>
                  <p className="text-xs font-mono bg-background p-2 rounded max-h-24 overflow-y-auto">
                    {generatedPrompt.substring(0, 300)}...
                  </p>
                </div>
              </div>
            </ScrollArea>
          </div>
        );

      default:
        return null;
    }
  };

  const handleNext = () => {
    switch (currentStep) {
      case 'name':
        setCurrentStep('number');
        break;
      case 'number':
        setCurrentStep('prompt-builder');
        break;
      case 'settings':
        setCurrentStep('confirmation');
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'number':
        setCurrentStep('name');
        break;
      case 'prompt-builder':
        setCurrentStep('number');
        break;
      case 'settings':
        setCurrentStep('prompt-builder');
        break;
      case 'confirmation':
        setCurrentStep('settings');
        break;
    }
  };

  // Don't show standard navigation for prompt-builder step (it has its own)
  const showStandardNavigation = currentStep !== 'prompt-builder';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className={`${currentStep === 'prompt-builder' ? 'sm:max-w-2xl max-h-[90vh]' : 'sm:max-w-lg'}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Criar Agente de IA
          </DialogTitle>
          <DialogDescription>
            {getStepTitle()}
          </DialogDescription>
        </DialogHeader>

        {/* Progress - hide for prompt-builder as it has its own */}
        {currentStep !== 'prompt-builder' && (
          <Progress value={getStepProgress()} className="h-1" />
        )}

        {/* Content */}
        <div className={`py-4 ${currentStep === 'prompt-builder' ? '' : 'min-h-[280px]'}`}>
          {renderStep()}
        </div>

        {/* Actions - hide for prompt-builder as it has its own */}
        {showStandardNavigation && (
          <div className="flex justify-between gap-2">
            <Button
              variant="ghost"
              onClick={() => currentStep === 'name' ? onOpenChange(false) : handleBack()}
              disabled={loading}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {currentStep === 'name' ? "Cancelar" : "Voltar"}
            </Button>

            {currentStep !== 'confirmation' ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
              >
                Próximo
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleCreate(false)}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Rascunho"}
                </Button>
                <Button
                  onClick={() => handleCreate(true)}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ativar Agente"}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
