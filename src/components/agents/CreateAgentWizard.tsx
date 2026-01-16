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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  Loader2,
  AlertTriangle,
  Plus,
  Info
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

type WizardStep = 'basics' | 'behavior' | 'review';

const MESSAGE_TEMPLATES = {
  prospecting: [
    "Oi {nome}, tudo bem? Vi seu trabalho e achei interessante.",
    "Olá {nome}! Passando pra conhecer melhor seu negócio.",
    "{nome}, boa tarde! Vi que você trabalha com {categoria}, certo?",
  ],
};

export function CreateAgentWizard({ open, onOpenChange, onCreated }: CreateAgentWizardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState<WizardStep>('basics');
  const [loading, setLoading] = useState(false);
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [loadingNumbers, setLoadingNumbers] = useState(true);

  // Form state - Basics
  const [name, setName] = useState("");
  const [selectedNumberId, setSelectedNumberId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  
  // Form state - Behavior
  const [agentObjective, setAgentObjective] = useState("qualify");
  const [responseStyle, setResponseStyle] = useState("friendly");
  const [maxReplies, setMaxReplies] = useState<string>("1");
  const [maxChars, setMaxChars] = useState("300");
  const [operatingHoursStart, setOperatingHoursStart] = useState("08:00");
  const [operatingHoursEnd, setOperatingHoursEnd] = useState("18:00");
  const [isWarmed, setIsWarmed] = useState(false);

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

  useEffect(() => {
    const selectedNumber = numbers.find(n => n.id === selectedNumberId);
    if (selectedNumber) {
      const isWarm = selectedNumber.warming_status === 'hot' || (selectedNumber.warming_level && selectedNumber.warming_level >= 3);
      setIsWarmed(isWarm);
    }
  }, [selectedNumberId, numbers]);

  const resetForm = () => {
    setCurrentStep('basics');
    setName("");
    setSelectedNumberId("");
    setCompanyName("");
    setProductDescription("");
    setAgentObjective("qualify");
    setResponseStyle("friendly");
    setMaxReplies("1");
    setMaxChars("300");
    setOperatingHoursStart("08:00");
    setOperatingHoursEnd("18:00");
    setIsWarmed(false);
  };

  const generatePrompt = (): string => {
    const objectiveTexts: Record<string, string> = {
      qualify: "Você qualifica leads identificando interesse. Se houver interesse, encaminhe para atendimento humano.",
      educate: "Você educa leads sobre o produto/serviço, gerando interesse e preparando para a venda.",
      close: "Você conduz a conversa até o fechamento, respondendo dúvidas e finalizando vendas."
    };

    const styleTexts: Record<string, string> = {
      friendly: "Seja amigável e acolhedor, use linguagem informal e emojis moderadamente.",
      professional: "Mantenha tom profissional e objetivo, sem gírias ou emojis.",
      casual: "Seja descontraído como um amigo, use linguagem bem informal."
    };

    return `# IDENTIDADE
Você é um assistente virtual da empresa "${companyName}".
${productDescription ? `Produto/Serviço: ${productDescription}` : ''}

# OBJETIVO
${objectiveTexts[agentObjective]}

# ESTILO DE COMUNICAÇÃO
${styleTexts[responseStyle]}

# REGRAS IMPORTANTES
- Máximo de ${maxChars} caracteres por resposta
- Responda de forma concisa e direta
- NUNCA seja agressivo ou insistente
- Se o lead disser "não", respeite e encerre educadamente
- Evite parecer robótico, seja natural
- Faça no máximo 2 perguntas antes de oferecer algo`;
  };

  const handleCreate = async (activate: boolean) => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const systemPrompt = generatePrompt();
      
      const { error } = await supabase
        .from('ai_agents')
        .insert({
          user_id: user.id,
          name,
          whatsapp_number_id: selectedNumberId,
          objective: agentObjective,
          target_audience: '',
          system_prompt: systemPrompt,
          agent_objective: agentObjective,
          communication_style: responseStyle,
          operating_hours_start: operatingHoursStart,
          operating_hours_end: operatingHoursEnd,
          is_warmed: isWarmed,
          max_replies: maxReplies === "unlimited" ? null : parseInt(maxReplies),
          status: activate ? 'active' : 'draft',
          message_templates: MESSAGE_TEMPLATES.prospecting,
          max_response_chars: parseInt(maxChars),
        });

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

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'basics':
        return name.trim().length >= 3 && !!selectedNumberId && companyName.trim().length >= 2;
      case 'behavior':
        return !!agentObjective && !!responseStyle && !!maxReplies;
      case 'review':
        return true;
      default:
        return true;
    }
  };

  const availableNumbers = numbers.filter(n => !n.has_active_agent);

  const renderStep = () => {
    switch (currentStep) {
      case 'basics':
        return (
          <div className="space-y-4">
            {/* Nome do agente */}
            <div className="space-y-2">
              <Label htmlFor="agent-name" className="flex items-center gap-1">
                Nome do Agente
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="agent-name"
                placeholder="Ex: Assistente de Vendas"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Nome para identificar este agente internamente
              </p>
            </div>

            {/* Número WhatsApp */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Número WhatsApp
                <span className="text-destructive">*</span>
              </Label>
              {loadingNumbers ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : numbers.length === 0 ? (
                <div className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span>Nenhum número conectado.</span>
                  </div>
                  <Button 
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => {
                      onOpenChange(false);
                      navigate('/dashboard');
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Conectar Número
                  </Button>
                </div>
              ) : availableNumbers.length === 0 ? (
                <div className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span>Todos os números já têm agentes ativos.</span>
                  </div>
                </div>
              ) : (
                <Select value={selectedNumberId} onValueChange={setSelectedNumberId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um número" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableNumbers.map((num) => (
                      <SelectItem key={num.id} value={num.id}>
                        <div className="flex items-center gap-2">
                          <span>{num.name || num.phone_number}</span>
                          {num.warming_status === 'hot' && (
                            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/30">
                              Aquecido
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                O agente responderá mensagens deste número
              </p>
            </div>

            {/* Nome da empresa */}
            <div className="space-y-2">
              <Label htmlFor="company-name" className="flex items-center gap-1">
                Nome da Empresa
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="company-name"
                placeholder="Ex: Minha Empresa Ltda"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                O agente se apresentará como representante desta empresa
              </p>
            </div>

            {/* Descrição do produto */}
            <div className="space-y-2">
              <Label htmlFor="product-desc">
                Produto/Serviço (opcional)
              </Label>
              <Textarea
                id="product-desc"
                placeholder="Ex: Consultoria em marketing digital para pequenas empresas"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Breve descrição do que você vende ou oferece
              </p>
            </div>
          </div>
        );

      case 'behavior':
        return (
          <div className="space-y-4">
            {/* Objetivo do agente */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                O que o agente deve fazer?
                <span className="text-destructive">*</span>
              </Label>
              <RadioGroup value={agentObjective} onValueChange={setAgentObjective}>
                <div className="space-y-2">
                  <Label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    agentObjective === 'qualify' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}>
                    <RadioGroupItem value="qualify" className="mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Qualificar leads</p>
                      <p className="text-xs text-muted-foreground">Identifica interesse e encaminha para você</p>
                    </div>
                  </Label>
                  <Label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    agentObjective === 'educate' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}>
                    <RadioGroupItem value="educate" className="mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Educar e gerar interesse</p>
                      <p className="text-xs text-muted-foreground">Explica o produto e prepara para a venda</p>
                    </div>
                  </Label>
                  <Label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    agentObjective === 'close' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}>
                    <RadioGroupItem value="close" className="mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Conduzir até a venda</p>
                      <p className="text-xs text-muted-foreground">Responde dúvidas e fecha negócios</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Estilo de resposta */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Como o agente deve responder?
                <span className="text-destructive">*</span>
              </Label>
              <Select value={responseStyle} onValueChange={setResponseStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">😊 Amigável - Tom acolhedor e informal</SelectItem>
                  <SelectItem value="professional">💼 Profissional - Tom objetivo e formal</SelectItem>
                  <SelectItem value="casual">🤙 Casual - Tom descontraído</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Máximo de respostas */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Quantas respostas por lead?
                <span className="text-destructive">*</span>
              </Label>
              <Select value={maxReplies} onValueChange={setMaxReplies}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 resposta (recomendado para proteção)</SelectItem>
                  <SelectItem value="2">2 respostas</SelectItem>
                  <SelectItem value="3">3 respostas</SelectItem>
                  <SelectItem value="5">5 respostas</SelectItem>
                  <SelectItem value="unlimited">Ilimitado (conversa contínua)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                Menos respostas = mais segurança para o número
              </p>
            </div>

            {/* Tamanho da resposta */}
            <div className="space-y-2">
              <Label htmlFor="max-chars">
                Tamanho máximo da resposta
              </Label>
              <Select value={maxChars} onValueChange={setMaxChars}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="150">Curta (150 caracteres)</SelectItem>
                  <SelectItem value="300">Média (300 caracteres)</SelectItem>
                  <SelectItem value="500">Longa (500 caracteres)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Horário de operação */}
            <div className="space-y-2">
              <Label>Horário de operação</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    type="time"
                    value={operatingHoursStart}
                    onChange={(e) => setOperatingHoursStart(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Início</p>
                </div>
                <div>
                  <Input
                    type="time"
                    value={operatingHoursEnd}
                    onChange={(e) => setOperatingHoursEnd(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Fim</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'review':
        const selectedNumber = numbers.find(n => n.id === selectedNumberId);
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center mb-4">
              Confira os dados antes de criar
            </p>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2.5 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Nome</span>
                <span className="font-medium">{name}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Número</span>
                <span className="font-medium">{selectedNumber?.name || selectedNumber?.phone_number}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Empresa</span>
                <span className="font-medium">{companyName}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Objetivo</span>
                <span className="font-medium">
                  {agentObjective === 'qualify' && 'Qualificar leads'}
                  {agentObjective === 'educate' && 'Educar e gerar interesse'}
                  {agentObjective === 'close' && 'Conduzir até a venda'}
                </span>
              </div>
              <div className="flex justify-between p-2.5 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Respostas por lead</span>
                <span className="font-medium">
                  {maxReplies === "unlimited" ? "Ilimitado" : `${maxReplies} resposta${parseInt(maxReplies) > 1 ? 's' : ''}`}
                </span>
              </div>
              <div className="flex justify-between p-2.5 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Horário</span>
                <span className="font-medium">{operatingHoursStart} - {operatingHoursEnd}</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const handleNext = () => {
    if (currentStep === 'basics') setCurrentStep('behavior');
    else if (currentStep === 'behavior') setCurrentStep('review');
  };

  const handleBack = () => {
    if (currentStep === 'behavior') setCurrentStep('basics');
    else if (currentStep === 'review') setCurrentStep('behavior');
  };

  const getStepNumber = () => {
    if (currentStep === 'basics') return 1;
    if (currentStep === 'behavior') return 2;
    return 3;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Criar Agente
          </DialogTitle>
          <DialogDescription>
            Passo {getStepNumber()} de 3 — {currentStep === 'basics' && 'Informações básicas'}
            {currentStep === 'behavior' && 'Comportamento'}
            {currentStep === 'review' && 'Revisão'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="py-4 px-1 pr-4">
            {renderStep()}
          </div>
        </ScrollArea>

        <div className="flex justify-between gap-2 pt-2 border-t">
          <Button
            variant="ghost"
            onClick={() => currentStep === 'basics' ? onOpenChange(false) : handleBack()}
            disabled={loading}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {currentStep === 'basics' ? "Cancelar" : "Voltar"}
          </Button>

          {currentStep !== 'review' ? (
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
                size="sm"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Rascunho"}
              </Button>
              <Button
                onClick={() => handleCreate(true)}
                disabled={loading}
                size="sm"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ativar Agente"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
