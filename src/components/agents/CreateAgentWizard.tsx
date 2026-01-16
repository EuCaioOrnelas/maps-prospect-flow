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
import { Checkbox } from "@/components/ui/checkbox";
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
  User,
  Target,
  MessageCircle,
  Search,
  Zap,
  ShieldAlert,
  CheckCircle,
  Settings
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

const MESSAGE_TEMPLATES = {
  prospecting: [
    "Oi {nome}, tudo bem? Vi seu trabalho e achei interessante.",
    "Olá {nome}! Passando pra conhecer melhor seu negócio.",
    "{nome}, boa tarde! Vi que você trabalha com {categoria}, certo?",
  ],
};

// Step definitions
const STEPS = [
  { id: 'basics', title: 'Básico', icon: Bot },
  { id: 'identity', title: 'Identidade', icon: User },
  { id: 'lead-context', title: 'Contexto do Lead', icon: Target },
  { id: 'opening', title: 'Abertura', icon: MessageCircle },
  { id: 'diagnosis', title: 'Diagnóstico', icon: Search },
  { id: 'conduct', title: 'Condução', icon: Zap },
  { id: 'objections', title: 'Objeções', icon: ShieldAlert },
  { id: 'cta', title: 'CTA', icon: CheckCircle },
  { id: 'rules', title: 'Regras', icon: Settings },
  { id: 'review', title: 'Revisão', icon: CheckCircle },
];

export function CreateAgentWizard({ open, onOpenChange, onCreated }: CreateAgentWizardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [loadingNumbers, setLoadingNumbers] = useState(true);

  // Basics
  const [name, setName] = useState("");
  const [selectedNumberId, setSelectedNumberId] = useState("");
  
  // Identity
  const [agentRole, setAgentRole] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [productName, setProductName] = useState("");
  const [salesApproach, setSalesApproach] = useState("");
  
  // Lead Context
  const [leadAwareness, setLeadAwareness] = useState("");
  const [messageReason, setMessageReason] = useState("");
  const [consciousnessLevel, setConsciousnessLevel] = useState("");
  
  // Opening
  const [openingStyle, setOpeningStyle] = useState("");
  const [firstMission, setFirstMission] = useState("");
  
  // Diagnosis
  const [infoToDiscover, setInfoToDiscover] = useState<string[]>([]);
  const [maxQuestions, setMaxQuestions] = useState("2");
  
  // Conduct
  const [presentationStyle, setPresentationStyle] = useState("");
  const [differentials, setDifferentials] = useState<string[]>([]);
  const [pricePolicy, setPricePolicy] = useState("");
  
  // Objections
  const [commonObjections, setCommonObjections] = useState<string[]>([]);
  const [customObjections, setCustomObjections] = useState("");
  const [objectionPosture, setObjectionPosture] = useState("");
  
  // CTA
  const [conversationGoal, setConversationGoal] = useState("");
  const [endConditions, setEndConditions] = useState<string[]>([]);
  const [closingStyle, setClosingStyle] = useState("");
  
  // Rules
  const [canSendAudio, setCanSendAudio] = useState(false);
  const [canSendLinks, setCanSendLinks] = useState(true);
  const [canSendLongMessages, setCanSendLongMessages] = useState(false);
  const [maxChars, setMaxChars] = useState("300");
  const [maxConsecutiveMessages, setMaxConsecutiveMessages] = useState("2");
  const [alwaysWaitResponse, setAlwaysWaitResponse] = useState(true);
  
  // Operating hours
  const [operatingHoursStart, setOperatingHoursStart] = useState("08:00");
  const [operatingHoursEnd, setOperatingHoursEnd] = useState("18:00");
  const [isWarmed, setIsWarmed] = useState(false);
  const [maxReplies, setMaxReplies] = useState<number | null>(1);

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
    setCurrentStep(0);
    setName("");
    setSelectedNumberId("");
    setAgentRole("");
    setCompanyName("");
    setProductName("");
    setSalesApproach("");
    setLeadAwareness("");
    setMessageReason("");
    setConsciousnessLevel("");
    setOpeningStyle("");
    setFirstMission("");
    setInfoToDiscover([]);
    setMaxQuestions("2");
    setPresentationStyle("");
    setDifferentials([]);
    setPricePolicy("");
    setCommonObjections([]);
    setCustomObjections("");
    setObjectionPosture("");
    setConversationGoal("");
    setEndConditions([]);
    setClosingStyle("");
    setCanSendAudio(false);
    setCanSendLinks(true);
    setCanSendLongMessages(false);
    setMaxChars("300");
    setMaxConsecutiveMessages("2");
    setAlwaysWaitResponse(true);
    setOperatingHoursStart("08:00");
    setOperatingHoursEnd("18:00");
    setIsWarmed(false);
    setMaxReplies(1);
  };

  const toggleArrayItem = (arr: string[], item: string, setter: (arr: string[]) => void) => {
    if (arr.includes(item)) {
      setter(arr.filter(i => i !== item));
    } else {
      setter([...arr, item]);
    }
  };

  const generatePrompt = (): string => {
    const roleLabels: Record<string, string> = {
      sdr: "SDR (Sales Development Representative)",
      consultant: "Consultor especializado",
      specialist: "Especialista no produto/serviço",
      sales: "Atendente comercial",
    };

    const approachLabels: Record<string, string> = {
      qualify: "Apenas qualificar leads e encaminhar para humanos",
      educate: "Educar, gerar interesse e preparar para venda",
      close: "Conduzir toda a conversa até o fechamento",
    };

    const awarenessLabels: Record<string, string> = {
      cold: "Lead frio - não conhece a empresa ou produto",
      heard: "Já ouviu falar da empresa ou produto",
      contacted: "Já teve contato anterior",
    };

    const reasonLabels: Record<string, string> = {
      active_search: "Busca ativa (lead veio até nós)",
      segmented_list: "Lista segmentada de prospecção",
      partnership: "Indicação ou parceria",
      event: "Evento ou webinar",
      direct: "Prospecção direta",
    };

    const consciousnessLabels: Record<string, string> = {
      unaware: "Inconsciente do problema",
      aware_problem: "Sente o problema mas não conhece a solução",
      aware_solution: "Conhece a solução mas ainda não confia",
    };

    const openingLabels: Record<string, string> = {
      thank: "Agradecer a resposta e criar conexão",
      confirm: "Confirmar se pode explicar melhor",
      question: "Fazer pergunta aberta para entender contexto",
      contextualize: "Contextualizar rapidamente o motivo do contato",
    };

    const missionLabels: Record<string, string> = {
      connection: "Criar conexão e rapport",
      understand: "Entender o cenário e dores do lead",
      value: "Mostrar valor antes de qualquer venda",
    };

    const presentationLabels: Record<string, string> = {
      educating: "Educando sobre o problema e solução",
      comparing: "Comparando com o cenário atual do lead",
      risk: "Mostrando risco de continuar como está",
    };

    const priceLabels: Record<string, string> = {
      never: "NUNCA mencionar preço",
      if_asked: "Apenas se o lead perguntar diretamente",
      with_context: "Sempre contextualizar o valor antes do preço",
    };

    const postureLabels: Record<string, string> = {
      validate: "Validar a preocupação do lead",
      explain: "Explicar com empatia e dados",
      example: "Dar exemplo real de caso similar",
      invite: "Convidar para próximo passo sem pressão",
    };

    const goalLabels: Record<string, string> = {
      schedule_call: "Agendar uma ligação ou reunião",
      send_demo: "Enviar demonstração ou material",
      forward_human: "Encaminhar para atendente humano",
      close_deal: "Fechar venda diretamente",
    };

    const closingLabels: Record<string, string> = {
      thank_open: "Agradecer e deixar porta aberta",
      not_insist: "Não insistir, encerrar educadamente",
      offer_later: "Oferecer contato futuro",
    };

    return `# IDENTIDADE DO AGENTE

Você é um ${roleLabels[agentRole] || agentRole} da empresa "${companyName || '[Nome da Empresa]'}".
${productName ? `Você representa o produto/serviço: "${productName}".` : ''}

**Sua função:** ${approachLabels[salesApproach] || salesApproach}

---

# CONTEXTO DO LEAD

**Nível de conhecimento:** ${awarenessLabels[leadAwareness] || leadAwareness}
**Origem do contato:** ${reasonLabels[messageReason] || messageReason}
**Nível de consciência:** ${consciousnessLabels[consciousnessLevel] || consciousnessLevel}

---

# COMO INICIAR A CONVERSA

Quando o lead responder, você deve: ${openingLabels[openingStyle] || openingStyle}

**Sua primeira missão:** ${missionLabels[firstMission] || firstMission}

⚠️ NUNCA comece já vendendo. Primeiro crie conexão e entenda o lead.

---

# DIAGNÓSTICO - INFORMAÇÕES A DESCOBRIR

Antes de apresentar qualquer solução, você DEVE descobrir:
${infoToDiscover.map(info => `- ${info}`).join('\n') || '- Informações básicas do lead'}

**Limite:** Faça no MÁXIMO ${maxQuestions} perguntas antes de oferecer algo. Evite parecer um interrogatório.

---

# CONDUÇÃO DA CONVERSA

**Estilo de apresentação:** ${presentationLabels[presentationStyle] || presentationStyle}

**Diferenciais que DEVEM aparecer naturalmente na conversa:**
${differentials.map(diff => `✓ ${diff}`).join('\n') || '- Benefícios do produto/serviço'}

**Política de preço:** ${priceLabels[pricePolicy] || pricePolicy}

---

# OBJEÇÕES COMUNS E COMO RESPONDER

Esteja preparado para estas objeções:
${commonObjections.map(obj => `- "${obj}"`).join('\n') || '- Objeções gerais'}
${customObjections ? `\n**Objeções específicas do negócio:**\n${customObjections.split('\n').filter(o => o.trim()).map(o => `- "${o.trim()}"`).join('\n')}` : ''}

**Postura diante de objeções:** ${postureLabels[objectionPosture] || objectionPosture}

---

# CTA - OBJETIVO E ENCERRAMENTO

**Objetivo final da conversa:** ${goalLabels[conversationGoal] || conversationGoal}

**Encerrar a conversa quando:**
${endConditions.map(cond => `- ${cond}`).join('\n') || '- Lead não demonstrar interesse'}

**Como encerrar:** ${closingLabels[closingStyle] || closingStyle}

---

# REGRAS E LIMITES

${canSendAudio ? '✓ PODE enviar áudios' : '✗ NÃO enviar áudios'}
${canSendLinks ? '✓ PODE enviar links' : '✗ NÃO enviar links'}
${canSendLongMessages ? '✓ PODE enviar mensagens longas' : '✗ NÃO enviar mensagens longas'}

**Limites:**
- Máximo de ${maxChars} caracteres por mensagem
- Máximo de ${maxConsecutiveMessages} mensagens seguidas
${alwaysWaitResponse ? '- SEMPRE esperar resposta do lead antes de continuar' : ''}

---

# REGRAS GERAIS

1. Seja natural e humano, evite parecer robô
2. Use emojis com moderação (máximo 1-2 por mensagem)
3. Responda de forma concisa e objetiva
4. Adapte o tom à resposta do lead
5. Nunca seja agressivo ou insistente
6. Se o lead disser "não", respeite e encerre educadamente`;
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
          objective: salesApproach || 'prospecting',
          target_audience: leadAwareness || '',
          system_prompt: systemPrompt,
          agent_objective: conversationGoal || '',
          end_conversation_criteria: endConditions.join(', ') || '',
          post_response_behavior: openingStyle || '',
          communication_style: 'neutral',
          operating_hours_start: operatingHoursStart,
          operating_hours_end: operatingHoursEnd,
          is_warmed: isWarmed,
          max_replies: maxReplies,
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
    switch (STEPS[currentStep].id) {
      case 'basics':
        return name.trim().length >= 3 && !!selectedNumberId;
      case 'identity':
        return !!agentRole && !!companyName && !!salesApproach;
      case 'lead-context':
        return !!leadAwareness && !!messageReason && !!consciousnessLevel;
      case 'opening':
        return !!openingStyle && !!firstMission;
      case 'diagnosis':
        return infoToDiscover.length > 0;
      case 'conduct':
        return !!presentationStyle && differentials.length > 0 && !!pricePolicy;
      case 'objections':
        return commonObjections.length > 0 && !!objectionPosture;
      case 'cta':
        return !!conversationGoal && endConditions.length > 0 && !!closingStyle;
      case 'rules':
        return true;
      case 'review':
        return true;
      default:
        return true;
    }
  };

  const availableNumbers = numbers.filter(n => !n.has_active_agent);

  const RadioOption = ({ value, label, description, selected, onSelect }: { value: string; label: string; description?: string; selected: boolean; onSelect: () => void }) => (
    <Label 
      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
        selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
      }`}
      onClick={onSelect}
    >
      <RadioGroupItem value={value} className="mt-0.5" />
      <div>
        <p className="font-medium text-sm">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </Label>
  );

  const CheckboxOption = ({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) => (
    <Label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
      checked ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
    }`}>
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      <span className="text-sm">{label}</span>
    </Label>
  );

  const renderStep = () => {
    const stepId = STEPS[currentStep].id;

    switch (stepId) {
      case 'basics':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Nome do Agente <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="Ex: Assistente de Vendas"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Nome para identificar o agente</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Número WhatsApp <span className="text-destructive">*</span>
              </Label>
              {loadingNumbers ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : availableNumbers.length === 0 ? (
                <div className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span>{numbers.length === 0 ? "Nenhum número conectado." : "Todos os números já têm agentes."}</span>
                  </div>
                  {numbers.length === 0 && (
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => { onOpenChange(false); navigate('/dashboard'); }}>
                      <Plus className="h-3 w-3 mr-1" /> Conectar Número
                    </Button>
                  )}
                </div>
              ) : (
                <Select value={selectedNumberId} onValueChange={setSelectedNumberId}>
                  <SelectTrigger><SelectValue placeholder="Selecione um número" /></SelectTrigger>
                  <SelectContent>
                    {availableNumbers.map((num) => (
                      <SelectItem key={num.id} value={num.id}>
                        {num.name || num.phone_number}
                        {num.warming_status === 'hot' && " (Aquecido)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        );

      case 'identity':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">Quem é o agente? <span className="text-destructive">*</span></Label>
              <RadioGroup value={agentRole} onValueChange={setAgentRole} className="space-y-2">
                <RadioOption value="sdr" label="SDR" description="Qualifica e agenda reuniões" selected={agentRole === 'sdr'} onSelect={() => setAgentRole('sdr')} />
                <RadioOption value="consultant" label="Consultor" description="Orienta e educa o lead" selected={agentRole === 'consultant'} onSelect={() => setAgentRole('consultant')} />
                <RadioOption value="specialist" label="Especialista" description="Expert no produto/serviço" selected={agentRole === 'specialist'} onSelect={() => setAgentRole('specialist')} />
                <RadioOption value="sales" label="Atendente Comercial" description="Vende diretamente" selected={agentRole === 'sales'} onSelect={() => setAgentRole('sales')} />
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">Nome da empresa <span className="text-destructive">*</span></Label>
              <Input placeholder="Ex: Minha Empresa" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Nome do produto/serviço (opcional)</Label>
              <Input placeholder="Ex: Plataforma de automação" value={productName} onChange={(e) => setProductName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">Ele vende ou prepara a venda? <span className="text-destructive">*</span></Label>
              <RadioGroup value={salesApproach} onValueChange={setSalesApproach} className="space-y-2">
                <RadioOption value="qualify" label="Apenas qualifica" description="Identifica interesse e encaminha" selected={salesApproach === 'qualify'} onSelect={() => setSalesApproach('qualify')} />
                <RadioOption value="educate" label="Educa e gera interesse" description="Prepara o lead para a venda" selected={salesApproach === 'educate'} onSelect={() => setSalesApproach('educate')} />
                <RadioOption value="close" label="Conduz até o fechamento" description="Faz toda a venda" selected={salesApproach === 'close'} onSelect={() => setSalesApproach('close')} />
              </RadioGroup>
            </div>
          </div>
        );

      case 'lead-context':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">Esse lead conhece sua empresa? <span className="text-destructive">*</span></Label>
              <RadioGroup value={leadAwareness} onValueChange={setLeadAwareness} className="space-y-2">
                <RadioOption value="cold" label="Não conhece nada" description="Lead frio" selected={leadAwareness === 'cold'} onSelect={() => setLeadAwareness('cold')} />
                <RadioOption value="heard" label="Já ouviu falar" description="Conhece de nome" selected={leadAwareness === 'heard'} onSelect={() => setLeadAwareness('heard')} />
                <RadioOption value="contacted" label="Já teve contato" description="Já conversou antes" selected={leadAwareness === 'contacted'} onSelect={() => setLeadAwareness('contacted')} />
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">Por que ele recebeu a mensagem? <span className="text-destructive">*</span></Label>
              <RadioGroup value={messageReason} onValueChange={setMessageReason} className="space-y-2">
                <RadioOption value="active_search" label="Busca ativa" description="Lead veio até nós" selected={messageReason === 'active_search'} onSelect={() => setMessageReason('active_search')} />
                <RadioOption value="segmented_list" label="Lista segmentada" description="Prospecção organizada" selected={messageReason === 'segmented_list'} onSelect={() => setMessageReason('segmented_list')} />
                <RadioOption value="partnership" label="Indicação/Parceria" description="Veio por referência" selected={messageReason === 'partnership'} onSelect={() => setMessageReason('partnership')} />
                <RadioOption value="event" label="Evento/Webinar" description="Participou de evento" selected={messageReason === 'event'} onSelect={() => setMessageReason('event')} />
                <RadioOption value="direct" label="Prospecção direta" description="Contato frio" selected={messageReason === 'direct'} onSelect={() => setMessageReason('direct')} />
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">Nível de consciência do lead <span className="text-destructive">*</span></Label>
              <RadioGroup value={consciousnessLevel} onValueChange={setConsciousnessLevel} className="space-y-2">
                <RadioOption value="unaware" label="Inconsciente do problema" description="Não sabe que precisa" selected={consciousnessLevel === 'unaware'} onSelect={() => setConsciousnessLevel('unaware')} />
                <RadioOption value="aware_problem" label="Sente o problema" description="Mas não conhece a solução" selected={consciousnessLevel === 'aware_problem'} onSelect={() => setConsciousnessLevel('aware_problem')} />
                <RadioOption value="aware_solution" label="Conhece a solução" description="Mas ainda não confia" selected={consciousnessLevel === 'aware_solution'} onSelect={() => setConsciousnessLevel('aware_solution')} />
              </RadioGroup>
            </div>
          </div>
        );

      case 'opening':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">Como iniciar quando o lead responde? <span className="text-destructive">*</span></Label>
              <RadioGroup value={openingStyle} onValueChange={setOpeningStyle} className="space-y-2">
                <RadioOption value="thank" label="Agradecer a resposta" description="Cria conexão inicial" selected={openingStyle === 'thank'} onSelect={() => setOpeningStyle('thank')} />
                <RadioOption value="confirm" label="Confirmar se pode explicar" description="Pede permissão" selected={openingStyle === 'confirm'} onSelect={() => setOpeningStyle('confirm')} />
                <RadioOption value="question" label="Fazer pergunta aberta" description="Entende o contexto" selected={openingStyle === 'question'} onSelect={() => setOpeningStyle('question')} />
                <RadioOption value="contextualize" label="Contextualizar o contato" description="Explica o motivo" selected={openingStyle === 'contextualize'} onSelect={() => setOpeningStyle('contextualize')} />
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">Qual a primeira missão? <span className="text-destructive">*</span></Label>
              <RadioGroup value={firstMission} onValueChange={setFirstMission} className="space-y-2">
                <RadioOption value="connection" label="Criar conexão" description="Estabelecer rapport" selected={firstMission === 'connection'} onSelect={() => setFirstMission('connection')} />
                <RadioOption value="understand" label="Entender o cenário" description="Descobrir dores" selected={firstMission === 'understand'} onSelect={() => setFirstMission('understand')} />
                <RadioOption value="value" label="Mostrar valor" description="Antes de vender" selected={firstMission === 'value'} onSelect={() => setFirstMission('value')} />
              </RadioGroup>
            </div>
          </div>
        );

      case 'diagnosis':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">O que o agente precisa descobrir? <span className="text-destructive">*</span></Label>
              <p className="text-xs text-muted-foreground">Selecione as informações importantes</p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  "Tipo de negócio",
                  "Se usa WhatsApp para vendas",
                  "Se já teve bloqueio",
                  "Volume de contatos por dia",
                  "Dor principal (tempo, bloqueio, conversão)",
                  "Orçamento disponível",
                  "Prazo para decisão",
                ].map((item) => (
                  <CheckboxOption
                    key={item}
                    label={item}
                    checked={infoToDiscover.includes(item)}
                    onCheckedChange={() => toggleArrayItem(infoToDiscover, item, setInfoToDiscover)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Máximo de perguntas antes de oferecer algo</Label>
              <Select value={maxQuestions} onValueChange={setMaxQuestions}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 pergunta</SelectItem>
                  <SelectItem value="2">2 perguntas (recomendado)</SelectItem>
                  <SelectItem value="3">3 perguntas</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Evita parecer um interrogatório</p>
            </div>
          </div>
        );

      case 'conduct':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">Como apresentar a solução? <span className="text-destructive">*</span></Label>
              <RadioGroup value={presentationStyle} onValueChange={setPresentationStyle} className="space-y-2">
                <RadioOption value="educating" label="Educando" description="Sobre o problema e solução" selected={presentationStyle === 'educating'} onSelect={() => setPresentationStyle('educating')} />
                <RadioOption value="comparing" label="Comparando" description="Com o cenário atual do lead" selected={presentationStyle === 'comparing'} onSelect={() => setPresentationStyle('comparing')} />
                <RadioOption value="risk" label="Mostrando risco" description="De continuar como está" selected={presentationStyle === 'risk'} onSelect={() => setPresentationStyle('risk')} />
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">Quais diferenciais devem aparecer? <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  "API oficial",
                  "Aquecimento de número",
                  "Controle de disparos",
                  "Segurança contra bloqueios",
                  "IA que responde automaticamente",
                  "Suporte dedicado",
                ].map((item) => (
                  <CheckboxOption
                    key={item}
                    label={item}
                    checked={differentials.includes(item)}
                    onCheckedChange={() => toggleArrayItem(differentials, item, setDifferentials)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">Pode citar preço? <span className="text-destructive">*</span></Label>
              <RadioGroup value={pricePolicy} onValueChange={setPricePolicy} className="space-y-2">
                <RadioOption value="never" label="Nunca" description="Não menciona preço" selected={pricePolicy === 'never'} onSelect={() => setPricePolicy('never')} />
                <RadioOption value="if_asked" label="Se perguntarem" description="Apenas se o lead pedir" selected={pricePolicy === 'if_asked'} onSelect={() => setPricePolicy('if_asked')} />
                <RadioOption value="with_context" label="Com contexto" description="Sempre contextualiza o valor" selected={pricePolicy === 'with_context'} onSelect={() => setPricePolicy('with_context')} />
              </RadioGroup>
            </div>
          </div>
        );

      case 'objections':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">Objeções comuns <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  "Isso dá bloqueio?",
                  "Já tentei e não funcionou",
                  "Não gosto de robô",
                  "É caro",
                  "Não tenho tempo",
                  "Preciso pensar",
                ].map((item) => (
                  <CheckboxOption
                    key={item}
                    label={item}
                    checked={commonObjections.includes(item)}
                    onCheckedChange={() => toggleArrayItem(commonObjections, item, setCommonObjections)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Outras objeções específicas (opcional)</Label>
              <Textarea
                placeholder="Uma por linha..."
                value={customObjections}
                onChange={(e) => setCustomObjections(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">Postura diante de objeções <span className="text-destructive">*</span></Label>
              <RadioGroup value={objectionPosture} onValueChange={setObjectionPosture} className="space-y-2">
                <RadioOption value="validate" label="Validar" description="A preocupação do lead" selected={objectionPosture === 'validate'} onSelect={() => setObjectionPosture('validate')} />
                <RadioOption value="explain" label="Explicar" description="Com empatia e dados" selected={objectionPosture === 'explain'} onSelect={() => setObjectionPosture('explain')} />
                <RadioOption value="example" label="Dar exemplo" description="Caso real similar" selected={objectionPosture === 'example'} onSelect={() => setObjectionPosture('example')} />
                <RadioOption value="invite" label="Convidar" description="Próximo passo sem pressão" selected={objectionPosture === 'invite'} onSelect={() => setObjectionPosture('invite')} />
              </RadioGroup>
            </div>
          </div>
        );

      case 'cta':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">Objetivo final da conversa <span className="text-destructive">*</span></Label>
              <RadioGroup value={conversationGoal} onValueChange={setConversationGoal} className="space-y-2">
                <RadioOption value="schedule_call" label="Agendar call" description="Ligação ou reunião" selected={conversationGoal === 'schedule_call'} onSelect={() => setConversationGoal('schedule_call')} />
                <RadioOption value="send_demo" label="Enviar demo" description="Demonstração ou material" selected={conversationGoal === 'send_demo'} onSelect={() => setConversationGoal('send_demo')} />
                <RadioOption value="forward_human" label="Encaminhar para humano" description="Passa para atendente" selected={conversationGoal === 'forward_human'} onSelect={() => setConversationGoal('forward_human')} />
                <RadioOption value="close_deal" label="Fechar venda" description="Finaliza o negócio" selected={conversationGoal === 'close_deal'} onSelect={() => setConversationGoal('close_deal')} />
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">Quando encerrar a conversa? <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  "CTA ignorado 2 vezes",
                  "Lead disse que não tem interesse",
                  "Conversa esfriou",
                  "Objetivo atingido",
                ].map((item) => (
                  <CheckboxOption
                    key={item}
                    label={item}
                    checked={endConditions.includes(item)}
                    onCheckedChange={() => toggleArrayItem(endConditions, item, setEndConditions)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">Como encerrar? <span className="text-destructive">*</span></Label>
              <RadioGroup value={closingStyle} onValueChange={setClosingStyle} className="space-y-2">
                <RadioOption value="thank_open" label="Agradecer" description="E deixar porta aberta" selected={closingStyle === 'thank_open'} onSelect={() => setClosingStyle('thank_open')} />
                <RadioOption value="not_insist" label="Não insistir" description="Encerrar educadamente" selected={closingStyle === 'not_insist'} onSelect={() => setClosingStyle('not_insist')} />
                <RadioOption value="offer_later" label="Oferecer contato futuro" description="Deixa opção de retorno" selected={closingStyle === 'offer_later'} onSelect={() => setClosingStyle('offer_later')} />
              </RadioGroup>
            </div>
          </div>
        );

      case 'rules':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>O que o agente pode fazer?</Label>
              <div className="space-y-2">
                <CheckboxOption label="Enviar áudios" checked={canSendAudio} onCheckedChange={(c) => setCanSendAudio(!!c)} />
                <CheckboxOption label="Enviar links" checked={canSendLinks} onCheckedChange={(c) => setCanSendLinks(!!c)} />
                <CheckboxOption label="Enviar mensagens longas" checked={canSendLongMessages} onCheckedChange={(c) => setCanSendLongMessages(!!c)} />
                <CheckboxOption label="Sempre esperar resposta" checked={alwaysWaitResponse} onCheckedChange={(c) => setAlwaysWaitResponse(!!c)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Máx. caracteres</Label>
                <Select value={maxChars} onValueChange={setMaxChars}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="150">150</SelectItem>
                    <SelectItem value="300">300</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Máx. msgs seguidas</Label>
                <Select value={maxConsecutiveMessages} onValueChange={setMaxConsecutiveMessages}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Respostas por lead</Label>
              <Select value={maxReplies === null ? "unlimited" : String(maxReplies)} onValueChange={(v) => setMaxReplies(v === "unlimited" ? null : parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 resposta (mais seguro)</SelectItem>
                  <SelectItem value="2">2 respostas</SelectItem>
                  <SelectItem value="3">3 respostas</SelectItem>
                  <SelectItem value="5">5 respostas</SelectItem>
                  <SelectItem value="unlimited">Ilimitado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Horário de operação</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input type="time" value={operatingHoursStart} onChange={(e) => setOperatingHoursStart(e.target.value)} />
                <Input type="time" value={operatingHoursEnd} onChange={(e) => setOperatingHoursEnd(e.target.value)} />
              </div>
            </div>
          </div>
        );

      case 'review':
        const selectedNumber = numbers.find(n => n.id === selectedNumberId);
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">Confira antes de criar</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Nome</span>
                <span className="font-medium">{name}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Número</span>
                <span className="font-medium">{selectedNumber?.name || selectedNumber?.phone_number}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Empresa</span>
                <span className="font-medium">{companyName}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Função</span>
                <span className="font-medium">
                  {salesApproach === 'qualify' && 'Qualificar'}
                  {salesApproach === 'educate' && 'Educar'}
                  {salesApproach === 'close' && 'Fechar'}
                </span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Objetivo</span>
                <span className="font-medium">
                  {conversationGoal === 'schedule_call' && 'Agendar call'}
                  {conversationGoal === 'send_demo' && 'Enviar demo'}
                  {conversationGoal === 'forward_human' && 'Encaminhar'}
                  {conversationGoal === 'close_deal' && 'Fechar venda'}
                </span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Respostas</span>
                <span className="font-medium">{maxReplies === null ? "Ilimitado" : maxReplies}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded-lg">
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

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Criar Agente
          </DialogTitle>
          <DialogDescription>
            Passo {currentStep + 1} de {STEPS.length} — {STEPS[currentStep].title}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh]">
          <div className="py-4 px-1 pr-4">
            {renderStep()}
          </div>
        </ScrollArea>

        <div className="flex justify-between gap-2 pt-2 border-t">
          <Button
            variant="ghost"
            onClick={() => currentStep === 0 ? onOpenChange(false) : setCurrentStep(currentStep - 1)}
            disabled={loading}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {currentStep === 0 ? "Cancelar" : "Voltar"}
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button onClick={() => setCurrentStep(currentStep + 1)} disabled={!canProceed()}>
              Próximo
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleCreate(false)} disabled={loading} size="sm">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rascunho"}
              </Button>
              <Button onClick={() => handleCreate(true)} disabled={loading} size="sm">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ativar"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
