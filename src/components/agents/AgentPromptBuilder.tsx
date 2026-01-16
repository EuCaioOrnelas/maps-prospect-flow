import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowRight,
  ArrowLeft,
  User,
  Building,
  Target,
  MessageCircle,
  Search,
  Zap,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  Copy,
  Sparkles,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Types for the prompt builder
interface IdentityBlock {
  agentRole: string;
  companyName: string;
  productName: string;
  salesApproach: string;
}

interface LeadContextBlock {
  leadAwareness: string;
  messageReason: string;
  consciousnessLevel: string;
}

interface OpeningBlock {
  openingStyle: string;
  firstMission: string;
}

interface DiagnosisBlock {
  infoToDiscover: string[];
  maxQuestions: string;
}

interface ConductBlock {
  presentationStyle: string;
  differentials: string[];
  pricePolicy: string;
}

interface ObjectionsBlock {
  commonObjections: string[];
  objectionPosture: string;
}

interface CTABlock {
  conversationGoal: string;
  endConditions: string[];
  closingStyle: string;
}

interface RulesBlock {
  canSendAudio: boolean;
  canSendLinks: boolean;
  canSendLongMessages: boolean;
  maxChars: string;
  maxConsecutiveMessages: string;
  alwaysWaitResponse: boolean;
}

interface PromptBuilderState {
  identity: IdentityBlock;
  leadContext: LeadContextBlock;
  opening: OpeningBlock;
  diagnosis: DiagnosisBlock;
  conduct: ConductBlock;
  objections: ObjectionsBlock;
  cta: CTABlock;
  rules: RulesBlock;
}

interface AgentPromptBuilderProps {
  onComplete: (prompt: string, config: PromptBuilderState) => void;
  onBack: () => void;
}

const BLOCKS = [
  { id: 1, title: "Identidade", icon: User, description: "Quem é o agente" },
  { id: 2, title: "Contexto do Lead", icon: Target, description: "Quem é o lead" },
  { id: 3, title: "Abertura", icon: MessageCircle, description: "Como iniciar" },
  { id: 4, title: "Diagnóstico", icon: Search, description: "O que descobrir" },
  { id: 5, title: "Condução", icon: Zap, description: "Como vender" },
  { id: 6, title: "Objeções", icon: ShieldAlert, description: "Como responder" },
  { id: 7, title: "CTA", icon: CheckCircle, description: "Como encerrar" },
  { id: 8, title: "Regras", icon: AlertTriangle, description: "Limites" },
];

const initialState: PromptBuilderState = {
  identity: {
    agentRole: "",
    companyName: "",
    productName: "",
    salesApproach: "",
  },
  leadContext: {
    leadAwareness: "",
    messageReason: "",
    consciousnessLevel: "",
  },
  opening: {
    openingStyle: "",
    firstMission: "",
  },
  diagnosis: {
    infoToDiscover: [],
    maxQuestions: "2",
  },
  conduct: {
    presentationStyle: "",
    differentials: [],
    pricePolicy: "",
  },
  objections: {
    commonObjections: [],
    objectionPosture: "",
  },
  cta: {
    conversationGoal: "",
    endConditions: [],
    closingStyle: "",
  },
  rules: {
    canSendAudio: false,
    canSendLinks: true,
    canSendLongMessages: false,
    maxChars: "300",
    maxConsecutiveMessages: "2",
    alwaysWaitResponse: true,
  },
};

export function AgentPromptBuilder({ onComplete, onBack }: AgentPromptBuilderProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [state, setState] = useState<PromptBuilderState>(initialState);

  const updateIdentity = (field: keyof IdentityBlock, value: string) => {
    setState(prev => ({ ...prev, identity: { ...prev.identity, [field]: value } }));
  };

  const updateLeadContext = (field: keyof LeadContextBlock, value: string) => {
    setState(prev => ({ ...prev, leadContext: { ...prev.leadContext, [field]: value } }));
  };

  const updateOpening = (field: keyof OpeningBlock, value: string) => {
    setState(prev => ({ ...prev, opening: { ...prev.opening, [field]: value } }));
  };

  const updateDiagnosis = (field: keyof DiagnosisBlock, value: any) => {
    setState(prev => ({ ...prev, diagnosis: { ...prev.diagnosis, [field]: value } }));
  };

  const updateConduct = (field: keyof ConductBlock, value: any) => {
    setState(prev => ({ ...prev, conduct: { ...prev.conduct, [field]: value } }));
  };

  const updateObjections = (field: keyof ObjectionsBlock, value: any) => {
    setState(prev => ({ ...prev, objections: { ...prev.objections, [field]: value } }));
  };

  const updateCTA = (field: keyof CTABlock, value: any) => {
    setState(prev => ({ ...prev, cta: { ...prev.cta, [field]: value } }));
  };

  const updateRules = (field: keyof RulesBlock, value: any) => {
    setState(prev => ({ ...prev, rules: { ...prev.rules, [field]: value } }));
  };

  const toggleArrayItem = (
    updateFn: (field: string, value: any) => void,
    field: string,
    currentArray: string[],
    item: string
  ) => {
    if (currentArray.includes(item)) {
      updateFn(field, currentArray.filter(i => i !== item));
    } else {
      updateFn(field, [...currentArray, item]);
    }
  };

  const generatePrompt = (): string => {
    const { identity, leadContext, opening, diagnosis, conduct, objections, cta, rules } = state;

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

    // Build the comprehensive prompt
    let prompt = `# IDENTIDADE DO AGENTE

Você é um ${roleLabels[identity.agentRole] || identity.agentRole} da empresa "${identity.companyName || '[Nome da Empresa]'}".
${identity.productName ? `Você representa o produto/serviço: "${identity.productName}".` : ''}

**Sua função:** ${approachLabels[identity.salesApproach] || identity.salesApproach}

---

# CONTEXTO DO LEAD

**Nível de conhecimento:** ${awarenessLabels[leadContext.leadAwareness] || leadContext.leadAwareness}
**Origem do contato:** ${reasonLabels[leadContext.messageReason] || leadContext.messageReason}
**Nível de consciência:** ${consciousnessLabels[leadContext.consciousnessLevel] || leadContext.consciousnessLevel}

---

# COMO INICIAR A CONVERSA

Quando o lead responder, você deve: ${openingLabels[opening.openingStyle] || opening.openingStyle}

**Sua primeira missão:** ${missionLabels[opening.firstMission] || opening.firstMission}

⚠️ NUNCA comece já vendendo. Primeiro crie conexão e entenda o lead.

---

# DIAGNÓSTICO - INFORMAÇÕES A DESCOBRIR

Antes de apresentar qualquer solução, você DEVE descobrir:
${diagnosis.infoToDiscover.map(info => `- ${info}`).join('\n') || '- Informações básicas do lead'}

**Limite:** Faça no MÁXIMO ${diagnosis.maxQuestions} perguntas antes de oferecer algo. Evite parecer um interrogatório.

---

# CONDUÇÃO DA CONVERSA

**Estilo de apresentação:** ${presentationLabels[conduct.presentationStyle] || conduct.presentationStyle}

**Diferenciais que DEVEM aparecer naturalmente na conversa:**
${conduct.differentials.map(diff => `✓ ${diff}`).join('\n') || '- Benefícios do produto/serviço'}

**Política de preço:** ${priceLabels[conduct.pricePolicy] || conduct.pricePolicy}

---

# OBJEÇÕES COMUNS E COMO RESPONDER

Esteja preparado para estas objeções:
${objections.commonObjections.map(obj => `- "${obj}"`).join('\n') || '- Objeções gerais'}

**Postura diante de objeções:** ${postureLabels[objections.objectionPosture] || objections.objectionPosture}

---

# CTA - OBJETIVO E ENCERRAMENTO

**Objetivo final da conversa:** ${goalLabels[cta.conversationGoal] || cta.conversationGoal}

**Encerrar a conversa quando:**
${cta.endConditions.map(cond => `- ${cond}`).join('\n') || '- Lead não demonstrar interesse'}

**Como encerrar:** ${closingLabels[cta.closingStyle] || cta.closingStyle}

---

# REGRAS E LIMITES

${rules.canSendAudio ? '✓ PODE enviar áudios' : '✗ NÃO enviar áudios'}
${rules.canSendLinks ? '✓ PODE enviar links' : '✗ NÃO enviar links'}
${rules.canSendLongMessages ? '✓ PODE enviar mensagens longas' : '✗ NÃO enviar mensagens longas'}

**Limites:**
- Máximo de ${rules.maxChars} caracteres por mensagem
- Máximo de ${rules.maxConsecutiveMessages} mensagens seguidas
${rules.alwaysWaitResponse ? '- SEMPRE esperar resposta do lead antes de continuar' : ''}

---

# REGRAS GERAIS

1. Seja natural e humano, evite parecer robô
2. Use emojis com moderação (máximo 1-2 por mensagem)
3. Responda de forma concisa e objetiva
4. Adapte o tom à resposta do lead
5. Nunca seja agressivo ou insistente
6. Se o lead disser "não", respeite e encerre educadamente`;

    return prompt;
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return !!state.identity.agentRole && !!state.identity.companyName && !!state.identity.salesApproach;
      case 2:
        return !!state.leadContext.leadAwareness && !!state.leadContext.messageReason && !!state.leadContext.consciousnessLevel;
      case 3:
        return !!state.opening.openingStyle && !!state.opening.firstMission;
      case 4:
        return state.diagnosis.infoToDiscover.length > 0 && !!state.diagnosis.maxQuestions;
      case 5:
        return !!state.conduct.presentationStyle && state.conduct.differentials.length > 0 && !!state.conduct.pricePolicy;
      case 6:
        return state.objections.commonObjections.length > 0 && !!state.objections.objectionPosture;
      case 7:
        return !!state.cta.conversationGoal && state.cta.endConditions.length > 0 && !!state.cta.closingStyle;
      case 8:
        return !!state.rules.maxChars && !!state.rules.maxConsecutiveMessages;
      default:
        return true;
    }
  };

  const handleComplete = () => {
    const prompt = generatePrompt();
    onComplete(prompt, state);
  };

  const copyPrompt = () => {
    const prompt = generatePrompt();
    navigator.clipboard.writeText(prompt);
    toast({
      title: "Prompt copiado!",
      description: "O prompt foi copiado para a área de transferência.",
    });
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <User className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-xl font-semibold">Identidade do Agente</h3>
              <p className="text-muted-foreground text-sm">
                Defina quem é o agente e como ele se posiciona
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Qual é o papel do agente?</Label>
                <RadioGroup value={state.identity.agentRole} onValueChange={(v) => updateIdentity('agentRole', v)}>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'sdr', label: 'SDR', desc: 'Qualifica e agenda' },
                      { value: 'consultant', label: 'Consultor', desc: 'Orienta e educa' },
                      { value: 'specialist', label: 'Especialista', desc: 'Expert no assunto' },
                      { value: 'sales', label: 'Comercial', desc: 'Vende diretamente' },
                    ].map(opt => (
                      <Label
                        key={opt.value}
                        className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-colors ${
                          state.identity.agentRole === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value={opt.value} />
                          <span className="font-medium">{opt.label}</span>
                        </div>
                        <span className="text-xs text-muted-foreground ml-6">{opt.desc}</span>
                      </Label>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Nome da empresa</Label>
                <Input
                  placeholder="Ex: MapSparkLeads"
                  value={state.identity.companyName}
                  onChange={(e) => updateIdentity('companyName', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Nome do produto/serviço (opcional)</Label>
                <Input
                  placeholder="Ex: Plataforma de prospecção via WhatsApp"
                  value={state.identity.productName}
                  onChange={(e) => updateIdentity('productName', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Qual a função principal?</Label>
                <RadioGroup value={state.identity.salesApproach} onValueChange={(v) => updateIdentity('salesApproach', v)}>
                  <div className="space-y-2">
                    {[
                      { value: 'qualify', label: 'Apenas qualificar', desc: 'Identifica interesse e encaminha para humano' },
                      { value: 'educate', label: 'Educar e gerar interesse', desc: 'Prepara o lead para a venda' },
                      { value: 'close', label: 'Conduzir até o fechamento', desc: 'Faz toda a venda sozinho' },
                    ].map(opt => (
                      <Label
                        key={opt.value}
                        className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-colors ${
                          state.identity.salesApproach === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value={opt.value} />
                          <span className="font-medium">{opt.label}</span>
                        </div>
                        <span className="text-xs text-muted-foreground ml-6">{opt.desc}</span>
                      </Label>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Target className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-xl font-semibold">Contexto do Lead</h3>
              <p className="text-muted-foreground text-sm">
                Isso define como o agente inicia a conversa
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">O lead conhece sua empresa?</Label>
                <RadioGroup value={state.leadContext.leadAwareness} onValueChange={(v) => updateLeadContext('leadAwareness', v)}>
                  <div className="space-y-2">
                    {[
                      { value: 'cold', label: 'Lead frio', desc: 'Não conhece nada sobre nós' },
                      { value: 'heard', label: 'Já ouviu falar', desc: 'Conhece de nome ou indicação' },
                      { value: 'contacted', label: 'Já teve contato', desc: 'Já conversou ou interagiu antes' },
                    ].map(opt => (
                      <Label
                        key={opt.value}
                        className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-colors ${
                          state.leadContext.leadAwareness === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value={opt.value} />
                          <span className="font-medium">{opt.label}</span>
                        </div>
                        <span className="text-xs text-muted-foreground ml-6">{opt.desc}</span>
                      </Label>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Por que o lead recebeu a mensagem?</Label>
                <RadioGroup value={state.leadContext.messageReason} onValueChange={(v) => updateLeadContext('messageReason', v)}>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'active_search', label: 'Busca ativa' },
                      { value: 'segmented_list', label: 'Lista segmentada' },
                      { value: 'partnership', label: 'Parceria/Indicação' },
                      { value: 'event', label: 'Evento' },
                      { value: 'direct', label: 'Prospecção direta' },
                    ].map(opt => (
                      <Label
                        key={opt.value}
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                          state.leadContext.messageReason === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <RadioGroupItem value={opt.value} />
                        <span className="text-sm">{opt.label}</span>
                      </Label>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Nível de consciência do lead</Label>
                <RadioGroup value={state.leadContext.consciousnessLevel} onValueChange={(v) => updateLeadContext('consciousnessLevel', v)}>
                  <div className="space-y-2">
                    {[
                      { value: 'unaware', label: 'Inconsciente', desc: 'Não sabe que tem um problema' },
                      { value: 'aware_problem', label: 'Ciente do problema', desc: 'Sente o problema mas não conhece a solução' },
                      { value: 'aware_solution', label: 'Ciente da solução', desc: 'Conhece soluções mas ainda não confia' },
                    ].map(opt => (
                      <Label
                        key={opt.value}
                        className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-colors ${
                          state.leadContext.consciousnessLevel === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value={opt.value} />
                          <span className="font-medium">{opt.label}</span>
                        </div>
                        <span className="text-xs text-muted-foreground ml-6">{opt.desc}</span>
                      </Label>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <MessageCircle className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-xl font-semibold">Como Iniciar a Conversa</h3>
              <p className="text-muted-foreground text-sm">
                Evita respostas robóticas ou agressivas
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Como o agente deve iniciar quando o lead responder?</Label>
                <RadioGroup value={state.opening.openingStyle} onValueChange={(v) => updateOpening('openingStyle', v)}>
                  <div className="space-y-2">
                    {[
                      { value: 'thank', label: 'Agradecer a resposta', desc: 'Cria conexão e mostra gratidão' },
                      { value: 'confirm', label: 'Confirmar interesse', desc: 'Pergunta se pode explicar melhor' },
                      { value: 'question', label: 'Pergunta aberta', desc: 'Entende contexto antes de falar' },
                      { value: 'contextualize', label: 'Contextualizar', desc: 'Explica rapidamente o motivo do contato' },
                    ].map(opt => (
                      <Label
                        key={opt.value}
                        className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-colors ${
                          state.opening.openingStyle === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value={opt.value} />
                          <span className="font-medium">{opt.label}</span>
                        </div>
                        <span className="text-xs text-muted-foreground ml-6">{opt.desc}</span>
                      </Label>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Qual a primeira missão do agente?</Label>
                <RadioGroup value={state.opening.firstMission} onValueChange={(v) => updateOpening('firstMission', v)}>
                  <div className="space-y-2">
                    {[
                      { value: 'connection', label: 'Criar conexão', desc: 'Estabelecer rapport e confiança' },
                      { value: 'understand', label: 'Entender o cenário', desc: 'Descobrir dores e necessidades' },
                      { value: 'value', label: 'Mostrar valor', desc: 'Apresentar benefícios antes de vender' },
                    ].map(opt => (
                      <Label
                        key={opt.value}
                        className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-colors ${
                          state.opening.firstMission === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value={opt.value} />
                          <span className="font-medium">{opt.label}</span>
                        </div>
                        <span className="text-xs text-muted-foreground ml-6">{opt.desc}</span>
                      </Label>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Search className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-xl font-semibold">Diagnóstico</h3>
              <p className="text-muted-foreground text-sm">
                Quais informações o agente PRECISA descobrir
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Selecione as informações que devem ser descobertas:</Label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    'Tipo de negócio do lead',
                    'Se já usa WhatsApp para vendas',
                    'Se já teve bloqueio de número',
                    'Volume de contatos/leads por mês',
                    'Principal dor (tempo, bloqueio, conversão)',
                    'Tamanho da equipe',
                    'Se tem decisor ou precisa consultar',
                    'Orçamento disponível',
                    'Urgência da solução',
                  ].map(info => (
                    <Label
                      key={info}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        state.diagnosis.infoToDiscover.includes(info) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Checkbox
                        checked={state.diagnosis.infoToDiscover.includes(info)}
                        onCheckedChange={() => toggleArrayItem(updateDiagnosis, 'infoToDiscover', state.diagnosis.infoToDiscover, info)}
                      />
                      <span className="text-sm">{info}</span>
                    </Label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Máximo de perguntas antes de oferecer algo:</Label>
                <RadioGroup value={state.diagnosis.maxQuestions} onValueChange={(v) => updateDiagnosis('maxQuestions', v)}>
                  <div className="flex gap-2">
                    {['1', '2', '3'].map(num => (
                      <Label
                        key={num}
                        className={`flex items-center justify-center w-16 h-12 rounded-lg border cursor-pointer transition-colors ${
                          state.diagnosis.maxQuestions === num ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <RadioGroupItem value={num} className="sr-only" />
                        <span className="font-bold text-lg">{num}</span>
                      </Label>
                    ))}
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  ⚠️ Evite interrogatórios. No WhatsApp, menos perguntas = mais respostas.
                </p>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Zap className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-xl font-semibold">Condução da Venda</h3>
              <p className="text-muted-foreground text-sm">
                Como apresentar a solução sem "vender"
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Como apresentar a solução?</Label>
                <RadioGroup value={state.conduct.presentationStyle} onValueChange={(v) => updateConduct('presentationStyle', v)}>
                  <div className="space-y-2">
                    {[
                      { value: 'educating', label: 'Educando', desc: 'Explica o problema e como resolvemos' },
                      { value: 'comparing', label: 'Comparando', desc: 'Mostra diferença entre antes/depois' },
                      { value: 'risk', label: 'Mostrando risco', desc: 'Destaca o custo de não agir' },
                    ].map(opt => (
                      <Label
                        key={opt.value}
                        className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-colors ${
                          state.conduct.presentationStyle === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value={opt.value} />
                          <span className="font-medium">{opt.label}</span>
                        </div>
                        <span className="text-xs text-muted-foreground ml-6">{opt.desc}</span>
                      </Label>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Diferenciais que DEVEM aparecer:</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'API oficial do WhatsApp',
                    'Sistema de aquecimento',
                    'Controle de disparos',
                    'Segurança contra bloqueios',
                    'IA que responde automaticamente',
                    'Suporte humanizado',
                    'Integração com CRM',
                    'Relatórios detalhados',
                  ].map(diff => (
                    <Label
                      key={diff}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                        state.conduct.differentials.includes(diff) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Checkbox
                        checked={state.conduct.differentials.includes(diff)}
                        onCheckedChange={() => toggleArrayItem(updateConduct, 'differentials', state.conduct.differentials, diff)}
                      />
                      <span>{diff}</span>
                    </Label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Política de preço:</Label>
                <RadioGroup value={state.conduct.pricePolicy} onValueChange={(v) => updateConduct('pricePolicy', v)}>
                  <div className="space-y-2">
                    {[
                      { value: 'never', label: 'Nunca mencionar preço', desc: 'Sempre encaminhar para humano' },
                      { value: 'if_asked', label: 'Apenas se perguntarem', desc: 'Responde mas não oferece' },
                      { value: 'with_context', label: 'Com contexto', desc: 'Mostra valor antes do preço' },
                    ].map(opt => (
                      <Label
                        key={opt.value}
                        className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-colors ${
                          state.conduct.pricePolicy === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value={opt.value} />
                          <span className="font-medium">{opt.label}</span>
                        </div>
                        <span className="text-xs text-muted-foreground ml-6">{opt.desc}</span>
                      </Label>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <ShieldAlert className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-xl font-semibold">Objeções Comuns</h3>
              <p className="text-muted-foreground text-sm">
                Prepare o agente para as resistências mais comuns
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Objeções que o agente deve esperar:</Label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    'Isso dá bloqueio?',
                    'Já tentei e não funcionou',
                    'Não gosto de robô/automação',
                    'É muito caro',
                    'Não tenho tempo para isso',
                    'Preciso consultar meu sócio/chefe',
                    'Vou pensar e te retorno',
                    'Já tenho uma solução',
                  ].map(obj => (
                    <Label
                      key={obj}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        state.objections.commonObjections.includes(obj) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Checkbox
                        checked={state.objections.commonObjections.includes(obj)}
                        onCheckedChange={() => toggleArrayItem(updateObjections, 'commonObjections', state.objections.commonObjections, obj)}
                      />
                      <span className="text-sm">"{obj}"</span>
                    </Label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Postura diante de objeções:</Label>
                <RadioGroup value={state.objections.objectionPosture} onValueChange={(v) => updateObjections('objectionPosture', v)}>
                  <div className="space-y-2">
                    {[
                      { value: 'validate', label: 'Validar', desc: 'Reconhecer a preocupação do lead' },
                      { value: 'explain', label: 'Explicar', desc: 'Dar contexto e dados' },
                      { value: 'example', label: 'Exemplificar', desc: 'Citar caso real similar' },
                      { value: 'invite', label: 'Convidar', desc: 'Sugerir próximo passo sem pressão' },
                    ].map(opt => (
                      <Label
                        key={opt.value}
                        className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-colors ${
                          state.objections.objectionPosture === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value={opt.value} />
                          <span className="font-medium">{opt.label}</span>
                        </div>
                        <span className="text-xs text-muted-foreground ml-6">{opt.desc}</span>
                      </Label>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <CheckCircle className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-xl font-semibold">CTA e Encerramento</h3>
              <p className="text-muted-foreground text-sm">
                Defina o objetivo final e quando encerrar
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Objetivo final da conversa:</Label>
                <RadioGroup value={state.cta.conversationGoal} onValueChange={(v) => updateCTA('conversationGoal', v)}>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'schedule_call', label: 'Agendar call' },
                      { value: 'send_demo', label: 'Enviar demo' },
                      { value: 'forward_human', label: 'Passar para humano' },
                      { value: 'close_deal', label: 'Fechar venda' },
                    ].map(opt => (
                      <Label
                        key={opt.value}
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                          state.cta.conversationGoal === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <RadioGroupItem value={opt.value} />
                        <span className="text-sm">{opt.label}</span>
                      </Label>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Encerrar a conversa quando:</Label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    'CTA ignorado 2 vezes',
                    'Lead disser que não tem interesse',
                    'Conversa esfriar (sem resposta)',
                    'Lead pedir para não ser mais contactado',
                    'Objetivo da conversa for atingido',
                  ].map(cond => (
                    <Label
                      key={cond}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        state.cta.endConditions.includes(cond) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Checkbox
                        checked={state.cta.endConditions.includes(cond)}
                        onCheckedChange={() => toggleArrayItem(updateCTA, 'endConditions', state.cta.endConditions, cond)}
                      />
                      <span className="text-sm">{cond}</span>
                    </Label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Como encerrar a conversa:</Label>
                <RadioGroup value={state.cta.closingStyle} onValueChange={(v) => updateCTA('closingStyle', v)}>
                  <div className="space-y-2">
                    {[
                      { value: 'thank_open', label: 'Agradecer e deixar porta aberta' },
                      { value: 'not_insist', label: 'Não insistir, encerrar educadamente' },
                      { value: 'offer_later', label: 'Oferecer contato futuro' },
                    ].map(opt => (
                      <Label
                        key={opt.value}
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                          state.cta.closingStyle === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <RadioGroupItem value={opt.value} />
                        <span className="text-sm">{opt.label}</span>
                      </Label>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <AlertTriangle className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-xl font-semibold">Regras e Limites</h3>
              <p className="text-muted-foreground text-sm">
                Evite bloqueios e experiências ruins
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">O agente pode:</Label>
                <div className="space-y-2">
                  <Label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer">
                    <Checkbox
                      checked={state.rules.canSendAudio}
                      onCheckedChange={(c) => updateRules('canSendAudio', c)}
                    />
                    <span className="text-sm">Enviar áudios</span>
                  </Label>
                  <Label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer">
                    <Checkbox
                      checked={state.rules.canSendLinks}
                      onCheckedChange={(c) => updateRules('canSendLinks', c)}
                    />
                    <span className="text-sm">Enviar links</span>
                  </Label>
                  <Label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer">
                    <Checkbox
                      checked={state.rules.canSendLongMessages}
                      onCheckedChange={(c) => updateRules('canSendLongMessages', c)}
                    />
                    <span className="text-sm">Enviar mensagens longas (+500 chars)</span>
                  </Label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Máximo de caracteres por mensagem</Label>
                  <Input
                    type="number"
                    value={state.rules.maxChars}
                    onChange={(e) => updateRules('maxChars', e.target.value)}
                    min="100"
                    max="1000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Máximo de mensagens seguidas</Label>
                  <Input
                    type="number"
                    value={state.rules.maxConsecutiveMessages}
                    onChange={(e) => updateRules('maxConsecutiveMessages', e.target.value)}
                    min="1"
                    max="5"
                  />
                </div>
              </div>

              <Label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer">
                <Checkbox
                  checked={state.rules.alwaysWaitResponse}
                  onCheckedChange={(c) => updateRules('alwaysWaitResponse', c)}
                />
                <div>
                  <span className="text-sm font-medium">Sempre esperar resposta do lead</span>
                  <p className="text-xs text-muted-foreground">Evita flood e bloqueios</p>
                </div>
              </Label>
            </div>
          </div>
        );

      case 9:
        // Preview step
        const prompt = generatePrompt();
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <Sparkles className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-xl font-semibold">Prompt Gerado</h3>
              <p className="text-muted-foreground text-sm">
                Revise o prompt antes de continuar
              </p>
            </div>

            <div className="relative">
              <ScrollArea className="h-[300px] rounded-lg border bg-muted/30 p-4">
                <pre className="text-xs whitespace-pre-wrap font-mono">{prompt}</pre>
              </ScrollArea>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={copyPrompt}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copiar
              </Button>
            </div>

            <div className="flex gap-2">
              <Badge variant="secondary">
                ~{prompt.length} caracteres
              </Badge>
              <Badge variant="secondary">
                {BLOCKS.length} blocos configurados
              </Badge>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const totalSteps = BLOCKS.length + 1; // +1 for preview step

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Bloco {Math.min(step, BLOCKS.length)} de {BLOCKS.length}</span>
          <span>{Math.round((step / totalSteps) * 100)}%</span>
        </div>
        <Progress value={(step / totalSteps) * 100} className="h-2" />
        
        {/* Block indicators */}
        <div className="flex justify-between gap-1 pt-2">
          {BLOCKS.map((block, idx) => {
            const Icon = block.icon;
            const isActive = step === idx + 1;
            const isCompleted = step > idx + 1;
            return (
              <div
                key={block.id}
                className={`flex flex-col items-center gap-1 flex-1 ${
                  isActive ? 'text-primary' : isCompleted ? 'text-primary/60' : 'text-muted-foreground'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  isActive ? 'bg-primary text-primary-foreground' : isCompleted ? 'bg-primary/20' : 'bg-muted'
                }`}>
                  {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className="text-[10px] text-center hidden sm:block">{block.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="min-h-[400px]">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between gap-2 pt-4 border-t">
        <Button
          variant="ghost"
          onClick={() => step > 1 ? setStep(step - 1) : onBack()}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {step === 1 ? "Voltar" : "Anterior"}
        </Button>

        {step < totalSteps ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
          >
            Próximo
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleComplete}>
            <Check className="h-4 w-4 mr-1" />
            Usar este Prompt
          </Button>
        )}
      </div>
    </div>
  );
}
