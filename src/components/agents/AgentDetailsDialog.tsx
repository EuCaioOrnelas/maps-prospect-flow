import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Bot,
  MessageSquare,
  BarChart3,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Save,
  Pencil,
  Sparkles,
  TrendingUp,
  Headphones,
  FileText,
  Copy,
  ArrowLeft,
  User,
  Smartphone,
  PauseCircle,
  PlayCircle
} from "lucide-react";

// Templates de prompts prontos
const PROMPT_TEMPLATES = [
  {
    id: 'sdr',
    name: 'SDR',
    icon: TrendingUp,
    description: 'Qualifica leads e agenda reuniões',
    prompt: `# IDENTIDADE DO AGENTE

Você é um SDR (Sales Development Representative) especializado em qualificação de leads.

## SUA MISSÃO
- Qualificar leads de forma rápida e objetiva
- Identificar se o lead tem interesse e perfil
- Agendar reunião/ligação com o time de vendas

## COMO CONVERSAR
- Seja cordial mas objetivo
- Faça no máximo 2-3 perguntas de qualificação
- Identifique: cargo, empresa, necessidade principal
- Não tente vender - apenas qualifique

## PERGUNTAS DE QUALIFICAÇÃO
1. "Qual é sua função/cargo?"
2. "Quantas pessoas tem sua equipe?"
3. "Qual o principal desafio que vocês enfrentam hoje?"

## QUANDO AGENDAR
- Lead tem perfil adequado
- Demonstrou interesse genuíno
- Tem poder de decisão ou influência

## ENCERRAMENTO
- Se não qualificado: agradeça e encerre educadamente
- Se qualificado: sugira horários para reunião
- Máximo 1 follow-up se não responder

## REGRAS
- Nunca seja agressivo ou insistente
- Respostas curtas (máximo 2-3 linhas)
- Use emojis com moderação (máximo 1 por mensagem)
- Sempre mantenha tom profissional`
  },
  {
    id: 'support',
    name: 'Suporte',
    icon: Headphones,
    description: 'Atende dúvidas e resolve problemas',
    prompt: `# IDENTIDADE DO AGENTE

Você é um atendente de suporte técnico amigável e eficiente.

## SUA MISSÃO
- Entender o problema do cliente rapidamente
- Oferecer soluções claras e práticas
- Escalar para humano quando necessário

## COMO CONVERSAR
- Seja empático e acolhedor
- Primeiro entenda, depois resolva
- Use linguagem simples e direta
- Confirme se o problema foi resolvido

## FLUXO DE ATENDIMENTO
1. Cumprimente e agradeça o contato
2. Pergunte qual é o problema/dúvida
3. Ofereça a solução ou orientação
4. Confirme se resolveu
5. Ofereça ajuda adicional

## QUANDO ESCALAR
- Problema técnico complexo
- Cliente muito irritado
- Solicitação que requer acesso especial
- Reclamação formal

## ENCERRAMENTO
- Sempre confirme se o cliente ficou satisfeito
- Agradeça pelo contato
- Informe que estamos à disposição

## REGRAS
- Nunca deixe o cliente sem resposta
- Não prometa o que não pode cumprir
- Respostas claras e objetivas
- Tom sempre positivo e prestativo`
  },
  {
    id: 'sales',
    name: 'Vendas',
    icon: Sparkles,
    description: 'Conduz todo o processo de venda',
    prompt: `# IDENTIDADE DO AGENTE

Você é um consultor comercial experiente e persuasivo.

## SUA MISSÃO
- Entender a necessidade do cliente
- Apresentar a solução de forma consultiva
- Conduzir até o fechamento da venda

## COMO CONVERSAR
- Seja consultivo, não empurre produtos
- Foque nos benefícios, não nas features
- Crie senso de urgência sem pressionar
- Use provas sociais (casos de sucesso)

## ETAPAS DA VENDA
1. CONEXÃO: Crie rapport e entenda o contexto
2. DIAGNÓSTICO: Descubra dores e necessidades
3. APRESENTAÇÃO: Mostre como a solução resolve
4. OBJEÇÕES: Trate com empatia e exemplos
5. FECHAMENTO: Faça o convite para comprar

## TRATAMENTO DE OBJEÇÕES
- "É caro" → Foque no retorno/economia
- "Preciso pensar" → Identifique a dúvida real
- "Já tenho algo" → Compare benefícios
- "Não é o momento" → Crie urgência sutil

## FECHAMENTO
- Sempre ofereça próximo passo claro
- Use alternativas: "Prefere começar agora ou agendar para amanhã?"
- Facilite a decisão, não complique

## REGRAS
- Nunca seja agressivo ou desesperado
- Respeite "não" definitivos
- Foque em valor, não em preço
- Mantenha follow-up estratégico`
  },
  {
    id: 'blank',
    name: 'Em Branco',
    icon: FileText,
    description: 'Comece do zero',
    prompt: ``
  }
];

interface WhatsAppNumberOption {
  id: string;
  name: string;
  phone_number: string | null;
  is_connected: boolean;
  instance_name: string | null;
}

interface AgentDetailsDialogProps {
  agent: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  whatsappNumbers?: WhatsAppNumberOption[];
}

interface Conversation {
  id: string;
  lead_phone: string;
  lead_name: string | null;
  status: string;
  initial_message_sent_at: string | null;
  response_received: boolean;
  reply_sent: boolean;
  reply_count: number | null;
  created_at: string;
  agent_manually_paused: boolean | null;
  agent_paused_until: string | null;
}

interface MessageLog {
  id: string;
  direction: string;
  content: string | null;
  message_type: string | null;
  created_at: string;
}

export function AgentDetailsDialog({ agent, open, onOpenChange, onUpdate, whatsappNumbers = [] }: AgentDetailsDialogProps) {
  const { user, accountOwnerId } = useAuth();
  const { toast } = useToast();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAsTemplate, setSavingAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [showSaveTemplateForm, setShowSaveTemplateForm] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageLogs, setMessageLogs] = useState<MessageLog[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  // Editable fields
  const [systemPrompt, setSystemPrompt] = useState(agent?.system_prompt || "");
  const [maxReplies, setMaxReplies] = useState(agent?.max_replies || 1);
  const [maxResponseChars, setMaxResponseChars] = useState(agent?.max_response_chars || 300);
  const [dailyLimit, setDailyLimit] = useState(agent?.daily_limit || 50);
  const [operatingHoursStart, setOperatingHoursStart] = useState(agent?.operating_hours_start?.slice(0, 5) || "08:00");
  const [operatingHoursEnd, setOperatingHoursEnd] = useState(agent?.operating_hours_end?.slice(0, 5) || "18:00");
  const [is24Hours, setIs24Hours] = useState(
    agent?.operating_hours_start === "00:00" && agent?.operating_hours_end === "23:59"
  );
  
  // CRM stage config
  const [crmStageOnNewLead, setCrmStageOnNewLead] = useState(agent?.crm_stage_on_new_lead || "Respondeu Mensagem");
  const [crmStageOnReply, setCrmStageOnReply] = useState(agent?.crm_stage_on_reply || "Mensagem Enviada");
  const [crmStageOnEnd, setCrmStageOnEnd] = useState(agent?.crm_stage_on_end || "");
  const [crmStageOnLost, setCrmStageOnLost] = useState((agent as any)?.crm_stage_on_lost || "");
  const [crmStageOnUnknown, setCrmStageOnUnknown] = useState((agent as any)?.crm_stage_on_unknown || "");
  const [selectedWhatsAppNumberId, setSelectedWhatsAppNumberId] = useState(agent?.whatsapp_number_id || "");
  const [pipelineStages, setPipelineStages] = useState<{id: string; name: string}[]>([]);

  useEffect(() => {
    const fetchConversations = async () => {
      if (!agent?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('agent_conversations')
          .select('*')
          .eq('agent_id', agent.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setConversations(data || []);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoadingConversations(false);
      }
    };

    const fetchPipelineStages = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('pipeline_stages')
        .select('id, name')
        .eq('owner_user_id', accountOwnerId)
        .order('position');
      setPipelineStages(data || []);
    };

    if (open && agent) {
      fetchConversations();
      fetchPipelineStages();
      setSelectedConversation(null);
      setMessageLogs([]);
      // Reset form values when agent changes
      setSystemPrompt(agent.system_prompt || "");
      setMaxReplies(agent.max_replies || 1);
      setMaxResponseChars(agent.max_response_chars || 300);
      setDailyLimit(agent.daily_limit || 50);
      setOperatingHoursStart(agent.operating_hours_start?.slice(0, 5) || "08:00");
      setOperatingHoursEnd(agent.operating_hours_end?.slice(0, 5) || "18:00");
      setIs24Hours(agent.operating_hours_start === "00:00" && agent.operating_hours_end === "23:59");
      setCrmStageOnNewLead(agent.crm_stage_on_new_lead || "Respondeu Mensagem");
      setCrmStageOnReply(agent.crm_stage_on_reply || "Mensagem Enviada");
      setCrmStageOnEnd(agent.crm_stage_on_end || "");
      setCrmStageOnLost((agent as any).crm_stage_on_lost || "");
      setCrmStageOnUnknown((agent as any).crm_stage_on_unknown || "");
      setSelectedWhatsAppNumberId(agent.whatsapp_number_id || "");
    }
  }, [agent, open, user]);

  const fetchMessageLogs = async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('agent_message_logs')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessageLogs(data || []);
    } catch (error) {
      console.error('Error fetching message logs:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    fetchMessageLogs(conv.id);
  };

  const saveSettings = async () => {
    if (!agent?.id) return;
    
    // Validate CRM stages still exist
    const stageNames = pipelineStages.map(s => s.name);
    const invalidStages: string[] = [];
    if (crmStageOnNewLead && !stageNames.includes(crmStageOnNewLead)) invalidStages.push(`"${crmStageOnNewLead}" (quando lead responde)`);
    if (crmStageOnReply && !stageNames.includes(crmStageOnReply)) invalidStages.push(`"${crmStageOnReply}" (quando agente responde)`);
    if (crmStageOnEnd && !stageNames.includes(crmStageOnEnd)) invalidStages.push(`"${crmStageOnEnd}" (quando objetivo é atingido)`);
    
    if (invalidStages.length > 0) {
      // Clear invalid values
      if (crmStageOnNewLead && !stageNames.includes(crmStageOnNewLead)) setCrmStageOnNewLead("");
      if (crmStageOnReply && !stageNames.includes(crmStageOnReply)) setCrmStageOnReply("");
      if (crmStageOnEnd && !stageNames.includes(crmStageOnEnd)) setCrmStageOnEnd("");
      
      toast({
        title: "⚠️ Colunas CRM inválidas",
        description: `As seguintes colunas não existem mais no CRM: ${invalidStages.join(", ")}. Selecione novas colunas e salve novamente.`,
        variant: "destructive",
      });
      return;
    }
    
    setSaving(true);
    try {
      const numberChanged = selectedWhatsAppNumberId && selectedWhatsAppNumberId !== agent.whatsapp_number_id;
      
      const { error } = await supabase
        .from('ai_agents')
        .update({
          system_prompt: systemPrompt,
          max_replies: maxReplies,
          max_response_chars: maxResponseChars,
          daily_limit: dailyLimit,
          operating_hours_start: is24Hours ? "00:00" : operatingHoursStart,
          operating_hours_end: is24Hours ? "23:59" : operatingHoursEnd,
          crm_stage_on_new_lead: crmStageOnNewLead || null,
          crm_stage_on_reply: crmStageOnReply || null,
          crm_stage_on_end: crmStageOnEnd || null,
          crm_stage_on_lost: crmStageOnLost || null,
          crm_stage_on_unknown: crmStageOnUnknown || null,
          whatsapp_number_id: selectedWhatsAppNumberId || null,
        })
        .eq('id', agent.id);

      if (error) throw error;

      // If the WhatsApp number changed, reconfigure webhook on the new number
      if (numberChanged) {
        const newNumber = whatsappNumbers.find(n => n.id === selectedWhatsAppNumberId);
        if (newNumber?.instance_name) {
          console.log(`Agent number changed, reconfiguring webhook for instance: ${newNumber.instance_name}`);
          try {
            const { data: session } = await supabase.auth.getSession();
            const token = session?.session?.access_token;
            if (token) {
              const response = await supabase.functions.invoke('evolution-reconfigure-webhook', {
                body: { instanceName: newNumber.instance_name },
              });
              if (response.error) {
                console.error('Webhook reconfiguration error:', response.error);
              } else {
                console.log('Webhook reconfigured successfully:', response.data);
              }
            }
          } catch (webhookError) {
            console.error('Error reconfiguring webhook:', webhookError);
          }
        }
      }

      toast({
        title: "Configurações salvas",
        description: numberChanged 
          ? "Configurações atualizadas e webhook reconfigurado no novo número."
          : "As configurações do agente foram atualizadas com sucesso.",
      });
      
      onUpdate();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Erro ao salvar",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveAsTemplate = async () => {
    if (!agent || !user || !templateName.trim()) return;
    
    setSavingAsTemplate(true);
    try {
      // Determine role based on objective
      let agentRole = 'specialist';
      if (agent.objective === 'prospecting') agentRole = 'sdr';
      else if (agent.objective === 'closing') agentRole = 'sales';
      
      // Determine sales approach
      let salesApproach = 'educate';
      if (agent.objective === 'prospecting') salesApproach = 'qualify';
      else if (agent.objective === 'closing') salesApproach = 'close';
      
      // Extract fields from system prompt to populate wizard fields when template is loaded
      const extractFromPrompt = (prompt: string, pattern: RegExp, fallback: string = ''): string => {
        const match = prompt.match(pattern);
        return match?.[1]?.trim() || fallback;
      };

      const extractListFromPrompt = (prompt: string, sectionStart: string, sectionEnd: string): string => {
        const startIdx = prompt.indexOf(sectionStart);
        const endIdx = prompt.indexOf(sectionEnd, startIdx + sectionStart.length);
        if (startIdx === -1) return '';
        const section = prompt.substring(startIdx + sectionStart.length, endIdx === -1 ? undefined : endIdx);
        // Extract list items (lines starting with - or ✓ or ")
        const items = section.split('\n')
          .map(line => line.replace(/^[\s]*[-✓✗"•]\s*/, '').replace(/"$/, '').trim())
          .filter(line => line.length > 0 && !line.startsWith('**') && !line.startsWith('#'));
        return items.join('\n');
      };

      // Extract company name from prompt
      const companyNameMatch = systemPrompt.match(/da empresa "([^"]+)"/);
      const extractedCompanyName = companyNameMatch?.[1] || '';

      // Extract product name from prompt
      const productNameMatch = systemPrompt.match(/produto\/serviço: "([^"]+)"/);
      const extractedProductName = productNameMatch?.[1] || '';

      // Extract product description
      const productDescMatch = systemPrompt.match(/\*\*Descrição:\*\*\s*(.+)/);
      const extractedProductDesc = productDescMatch?.[1]?.trim() || '';

      // Extract info to discover
      const extractedInfoToDiscover = extractListFromPrompt(
        systemPrompt, 
        '# DIAGNÓSTICO - INFORMAÇÕES A DESCOBRIR', 
        '**Limite:**'
      );

      // Extract differentials
      const extractedDifferentials = extractListFromPrompt(
        systemPrompt,
        '**Diferenciais que DEVEM aparecer naturalmente na conversa:**',
        '**Política de preço:**'
      );

      // Extract common objections
      const extractedObjections = extractListFromPrompt(
        systemPrompt,
        'Esteja preparado para estas objeções:',
        '**Postura diante de objeções:**'
      );

      // Extract presentation style from prompt
      const presentationStyleMatch = systemPrompt.match(/\*\*Estilo de apresentação:\*\*\s*(.+)/);
      const extractedPresentationStyle = presentationStyleMatch?.[1]?.trim() || '';
      // Reverse-map presentation labels to keys
      const presentationKeyMap: Record<string, string> = {
        'Educando sobre o problema e solução': 'educating',
        'Comparando com o cenário atual do lead': 'comparing',
        'Mostrando risco de continuar como está': 'risk',
      };
      const mappedPresentationStyle = presentationKeyMap[extractedPresentationStyle] || 'educating';

      // Extract price policy
      const pricePolicyMatch = systemPrompt.match(/\*\*Política de preço:\*\*\s*(.+)/);
      const extractedPricePolicy = pricePolicyMatch?.[1]?.trim() || '';
      const pricePolicyKeyMap: Record<string, string> = {
        'NUNCA mencionar preço': 'never',
        'Apenas se o lead perguntar diretamente': 'if_asked',
        'Sempre contextualizar o valor antes do preço': 'with_context',
      };
      const mappedPricePolicy = pricePolicyKeyMap[extractedPricePolicy] || 'never';

      // Extract objection posture
      const postureMatch = systemPrompt.match(/\*\*Postura diante de objeções:\*\*\s*(.+)/);
      const extractedPosture = postureMatch?.[1]?.trim() || '';
      const postureKeyMap: Record<string, string> = {
        'Validar a preocupação do lead': 'validate',
        'Explicar com empatia e dados': 'explain',
        'Dar exemplo real de caso similar': 'example',
        'Convidar para próximo passo sem pressão': 'invite',
      };
      const mappedPosture = postureKeyMap[extractedPosture] || 'validate';

      // Extract max questions
      const maxQuestionsMatch = systemPrompt.match(/MÁXIMO (\d+) perguntas/);
      const extractedMaxQuestions = maxQuestionsMatch?.[1] || '2';

      // Build comprehensive template data with all wizard fields
      const templateData = {
        // Basic info
        suggestedName: agent.name,
        agentRole: agentRole,
        companyName: extractedCompanyName,
        productName: extractedProductName,
        productDescription: extractedProductDesc !== 'Não informado' ? extractedProductDesc : '',
        salesApproach: salesApproach,
        
        // System prompt (most important - contains all agent behavior)
        systemPrompt: systemPrompt,
        
        // Operating hours
        operatingHoursStart: operatingHoursStart,
        operatingHoursEnd: operatingHoursEnd,
        
        // Message limits
        maxReplies: maxReplies,
        maxChars: String(maxResponseChars),
        maxConsecutiveMessages: '2',
        
        // Rules - defaults based on communication style
        canSendAudio: false,
        canSendLinks: true,
        canSendLongMessages: agent.communication_style === 'formal',
        alwaysWaitResponse: true,
        
        // Communication style mapping
        communicationStyle: agent.communication_style,
        
        // Lead context - extracted or defaults
        leadAwareness: 'heard',
        messageReason: 'active_search',
        consciousnessLevel: 'aware_solution',
        
        // Opening defaults
        openingStyle: 'thank',
        firstMission: 'understand',
        
        // Diagnosis fields (previously missing!)
        infoToDiscover: extractedInfoToDiscover,
        maxQuestions: extractedMaxQuestions,

        // Conduct fields (previously missing!)
        presentationStyle: mappedPresentationStyle,
        differentials: extractedDifferentials,
        pricePolicy: mappedPricePolicy,

        // Objections fields (previously missing!)
        commonObjections: extractedObjections,
        objectionPosture: mappedPosture,
        
        // CTA defaults based on objective
        conversationGoal: agent.objective === 'prospecting' ? 'schedule_call' : 
                          agent.objective === 'closing' ? 'close_deal' : 'forward_human',
        closingStyle: 'offer_later',
        endConditions: agent.end_conversation_criteria 
          ? agent.end_conversation_criteria.split('\n').filter((c: string) => c.trim())
          : ['Objetivo atingido', 'Lead disse que não tem interesse'],
        
        // Store the original objective and target audience
        objective: agent.objective,
        targetAudience: agent.target_audience,
        agentObjective: agent.agent_objective,
        postResponseBehavior: agent.post_response_behavior,
      };

      const { error } = await supabase
        .from('agent_templates')
        .insert({
          user_id: user.id,
          name: templateName.trim(),
          description: templateDescription.trim() || null,
          template_data: templateData,
        });

      if (error) throw error;

      toast({
        title: "Template salvo!",
        description: "Você pode reutilizar este template ao criar novos agentes.",
      });
      
      setShowSaveTemplateForm(false);
      setTemplateName("");
      setTemplateDescription("");
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Erro ao salvar template",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setSavingAsTemplate(false);
    }
  };

  const getStatusIcon = (status: string, conv?: Conversation) => {
    if (conv?.agent_manually_paused) return <PauseCircle className="h-4 w-4 text-orange-500" />;
    if (conv?.agent_paused_until && new Date(conv.agent_paused_until) > new Date()) {
      return <PauseCircle className="h-4 w-4 text-yellow-500" />;
    }
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'responded':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'awaiting_response':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'ignored':
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
      case 'user_responded':
        return <PauseCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string, conv?: Conversation) => {
    if (conv?.agent_manually_paused) return 'Pausado (manual)';
    if (conv?.agent_paused_until && new Date(conv.agent_paused_until) > new Date()) {
      const hours = Math.ceil((new Date(conv.agent_paused_until).getTime() - Date.now()) / (1000 * 60 * 60));
      return `Pausado (${hours}h)`;
    }
    switch (status) {
      case 'completed': return 'Concluído';
      case 'responded': return 'Respondido';
      case 'awaiting_response': return 'Aguardando';
      case 'ignored': return 'Ignorado';
      case 'user_responded': return 'Você respondeu';
      default: return 'Pendente';
    }
  };

  const toggleManualPause = async (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    const newPaused = !conv.agent_manually_paused;
    
    try {
      const { error } = await supabase
        .from('agent_conversations')
        .update({ 
          agent_manually_paused: newPaused,
          // If unpausing, also clear auto-pause
          ...(newPaused ? {} : { agent_paused_until: null, user_responded_date: null, user_responded_at: null }),
          updated_at: new Date().toISOString()
        })
        .eq('id', conv.id);
      
      if (error) throw error;
      
      // Update local state
      setConversations(prev => prev.map(c => 
        c.id === conv.id ? { ...c, agent_manually_paused: newPaused, ...(newPaused ? {} : { agent_paused_until: null }) } : c
      ));
      
      toast({
        title: newPaused ? "Agente pausado neste lead" : "Agente retomado neste lead",
        description: newPaused 
          ? "O agente não responderá mais este lead até você despausar."
          : "O agente voltará a responder este lead normalmente.",
      });
    } catch (error) {
      console.error('Error toggling pause:', error);
      toast({ title: "Erro ao alterar pausa", variant: "destructive" });
    }
  };

  if (!agent) return null;

  // Calculate stats
  const totalConversations = conversations.length;
  const responsesReceived = conversations.filter(c => c.response_received).length;
  const repliesSent = conversations.filter(c => c.reply_sent).length;
  const responseRate = totalConversations > 0 ? Math.round((responsesReceived / totalConversations) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] w-[95vw] p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <span className="truncate">{agent.name}</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Gerencie configurações, visualize conversas e métricas do agente
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full pt-2">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="overview" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Visão Geral</span>
              <span className="xs:hidden">Geral</span>
            </TabsTrigger>
            <TabsTrigger value="conversations" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Conversas</span>
              <span className="xs:hidden">Msgs</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Editar Bot</span>
              <span className="xs:hidden">Editar</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-lg sm:text-2xl font-bold">{agent.messages_sent_today}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Enviadas hoje</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-lg sm:text-2xl font-bold">{agent.daily_limit >= 9999 || agent.is_warmed ? '∞' : agent.daily_limit}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Limite diário</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-lg sm:text-2xl font-bold">{responsesReceived}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Respostas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-lg sm:text-2xl font-bold">{responseRate}%</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Taxa resposta</p>
                </CardContent>
              </Card>
            </div>

            {/* Agent Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Configuração Atual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Objetivo</span>
                  <span>
                    {agent.agent_objective === 'schedule_call' ? 'Agendar call' :
                     agent.agent_objective === 'send_demo' ? 'Enviar demo' :
                     agent.agent_objective === 'forward_human' ? 'Encaminhar p/ humano' :
                     agent.agent_objective === 'close_deal' ? 'Fechar venda' :
                     agent.agent_objective || agent.objective || 'Não definido'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estilo</span>
                  <span>
                    {agent.communication_style === 'formal' ? 'Formal' :
                     agent.communication_style === 'informal' ? 'Informal' :
                     agent.communication_style === 'neutral' ? 'Neutro' :
                     agent.communication_style || 'Não definido'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Horário</span>
                  <span>
                    {agent.operating_hours_start?.slice(0, 5) === '00:00' && agent.operating_hours_end?.slice(0, 5) === '23:59'
                      ? '24 horas'
                      : `${agent.operating_hours_start?.slice(0, 5)} - ${agent.operating_hours_end?.slice(0, 5)}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Máx. respostas</span>
                  <span>{agent.max_replies === null ? 'Ilimitado' : agent.max_replies}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status do número</span>
                  <Badge className={agent.is_warmed ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}>
                    {agent.is_warmed ? "Aquecido" : "Frio"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Rules Reminder */}
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-500">Regras do Agente</p>
                    <ul className="text-muted-foreground mt-1 space-y-1">
                      <li>• Responde enquanto lead interagir</li>
                      <li>• Delay aleatório de 30s a 3min</li>
                      <li>• Nunca responde fora do horário</li>
                      <li>• Usa GPT para gerar respostas</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conversations" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {selectedConversation ? (
                // Message log view
                <div className="space-y-3">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setSelectedConversation(null); setMessageLogs([]); }}
                    className="gap-1 mb-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </Button>
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">
                      {selectedConversation.lead_name || selectedConversation.lead_phone}
                    </span>
                    <Badge variant="outline" className="text-xs ml-auto">
                      {selectedConversation.reply_count || 0} respostas
                    </Badge>
                  </div>
                  {loadingMessages ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : messageLogs.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground text-sm">Nenhuma mensagem registrada</p>
                    </div>
                  ) : (
                    <div className="space-y-3 py-2">
                      {messageLogs.map((msg) => {
                        const isAgent = msg.direction === 'sent';
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`flex items-end gap-1.5 max-w-[80%] ${isAgent ? 'flex-row-reverse' : 'flex-row'}`}>
                              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                                isAgent ? 'bg-primary/20' : 'bg-muted-foreground/20'
                              }`}>
                                {isAgent ? (
                                  <Bot className="h-3.5 w-3.5 text-primary" />
                                ) : (
                                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </div>
                              <div className={`rounded-2xl px-3 py-2 text-sm ${
                                isAgent
                                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                                  : 'bg-muted border border-border rounded-bl-sm'
                              }`}>
                                <p className="whitespace-pre-wrap break-words">{msg.content || '(sem conteúdo)'}</p>
                                <p className={`text-[10px] mt-1 text-right ${
                                  isAgent ? 'text-primary-foreground/60' : 'text-muted-foreground'
                                }`}>
                                  {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : loadingConversations ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Nenhuma conversa ainda</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conv) => (
                    <Card 
                      key={conv.id} 
                      className="p-3 cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => handleSelectConversation(conv)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(conv.status, conv)}
                          <div>
                            <p className="font-medium text-sm">
                              {conv.lead_name || conv.lead_phone}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(conv.created_at).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title={conv.agent_manually_paused ? "Retomar agente neste lead" : "Pausar agente neste lead"}
                            onClick={(e) => toggleManualPause(conv, e)}
                          >
                            {conv.agent_manually_paused ? (
                              <PlayCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <PauseCircle className="h-4 w-4 text-muted-foreground hover:text-orange-500" />
                            )}
                          </Button>
                          {(conv.reply_count || 0) > 0 && (
                            <span className="text-xs text-muted-foreground">{conv.reply_count} msgs</span>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {getStatusLabel(conv.status, conv)}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {/* Prompt Templates */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Templates de Prompt
                    </CardTitle>
                    <CardDescription>
                      Escolha um template pronto ou comece do zero
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {PROMPT_TEMPLATES.map((template) => {
                        const IconComponent = template.icon;
                        return (
                          <button
                            key={template.id}
                            onClick={() => setSystemPrompt(template.prompt)}
                            className={`p-3 rounded-lg border text-left transition-all hover:border-primary hover:bg-primary/5 ${
                              systemPrompt === template.prompt && template.prompt 
                                ? 'border-primary bg-primary/10' 
                                : 'border-border'
                            }`}
                          >
                            <IconComponent className="h-5 w-5 text-primary mb-2" />
                            <p className="font-medium text-sm">{template.name}</p>
                            <p className="text-xs text-muted-foreground">{template.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* System Prompt */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      Prompt do Sistema (Personalidade do Bot)
                    </CardTitle>
                    <CardDescription>
                      Edite ou personalize o prompt selecionado
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      placeholder="Ex: Você é um assistente comercial da empresa XYZ. Seu objetivo é qualificar leads e agendar reuniões. Seja cordial e objetivo..."
                      className="min-h-[200px] font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Este é o prompt que define a personalidade e comportamento do bot nas conversas.
                    </p>
                  </CardContent>
                </Card>

                {/* Response Settings */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Configurações de Resposta
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Tamanho máximo da resposta</Label>
                        <span className="text-sm text-muted-foreground">{maxResponseChars} caracteres</span>
                      </div>
                      <Slider
                        value={[maxResponseChars]}
                        onValueChange={(v) => setMaxResponseChars(v[0])}
                        min={100}
                        max={1000}
                        step={50}
                      />
                      <p className="text-xs text-muted-foreground">
                        Tamanho máximo das mensagens geradas pelo bot
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Limite diário de mensagens</Label>
                        <span className="text-sm text-muted-foreground">{dailyLimit} mensagens</span>
                      </div>
                      <Slider
                        value={[dailyLimit]}
                        onValueChange={(v) => setDailyLimit(v[0])}
                        min={10}
                        max={200}
                        step={10}
                      />
                      <p className="text-xs text-muted-foreground">
                        Quantas mensagens o bot pode enviar por dia
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* WhatsApp Number */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Número do WhatsApp
                    </CardTitle>
                    <CardDescription>
                      Escolha qual número este agente vai usar para responder
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <select
                      value={selectedWhatsAppNumberId}
                      onChange={(e) => setSelectedWhatsAppNumberId(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      <option value="">Nenhum número selecionado</option>
                      {whatsappNumbers.map(n => (
                        <option key={n.id} value={n.id}>
                          {n.name}{n.phone_number ? ` (${n.phone_number})` : ''}{n.is_connected ? ' ✅' : ' ⚠️ Desconectado'}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-2">
                      Ao trocar o número, o agente passa a funcionar no novo número imediatamente.
                    </p>
                  </CardContent>
                </Card>

                {/* Operating Hours */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Horário de Funcionamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Funcionar 24 horas</Label>
                        <p className="text-xs text-muted-foreground">
                          O bot responde a qualquer momento
                        </p>
                      </div>
                      <Switch
                        checked={is24Hours}
                        onCheckedChange={setIs24Hours}
                      />
                    </div>
                    
                    {!is24Hours && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Início</Label>
                          <Input
                            type="time"
                            value={operatingHoursStart}
                            onChange={(e) => setOperatingHoursStart(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Fim</Label>
                          <Input
                            type="time"
                            value={operatingHoursEnd}
                            onChange={(e) => setOperatingHoursEnd(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      {is24Hours 
                        ? "O bot responderá a qualquer hora do dia" 
                        : "O bot só responde dentro deste horário (horário de Brasília)"}
                    </p>
                  </CardContent>
                </Card>

                {/* CRM Stage Configuration */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Integração com CRM
                    </CardTitle>
                    <CardDescription>
                      Escolha para quais colunas do funil o lead será movido automaticamente
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Quando lead responde (nova conversa)</Label>
                      <select
                        value={crmStageOnNewLead}
                        onChange={(e) => setCrmStageOnNewLead(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      >
                        <option value="">Nenhuma</option>
                        {pipelineStages.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Quando agente responde</Label>
                      <select
                        value={crmStageOnReply}
                        onChange={(e) => setCrmStageOnReply(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      >
                        <option value="">Nenhuma</option>
                        {pipelineStages.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1">Quando objetivo é atingido <span className="text-emerald-400">✅</span></Label>
                      <select
                        value={crmStageOnEnd}
                        onChange={(e) => setCrmStageOnEnd(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      >
                        <option value="">Nenhuma (manter na coluna atual)</option>
                        {pipelineStages.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground">
                        Quando o agente atingir o objetivo, o lead será movido para esta coluna e <span className="text-emerald-400 font-medium">o agente não responderá mais</span>.
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      O agente move automaticamente os leads entre as colunas do seu funil conforme a conversa avança.
                    </p>
                  </CardContent>
                </Card>

                {/* Save as Template Section */}
                <Card className="border-dashed">
                  <CardContent className="p-4 space-y-3">
                    {!showSaveTemplateForm ? (
                      <Button 
                        variant="outline" 
                        className="w-full gap-2"
                        onClick={() => setShowSaveTemplateForm(true)}
                      >
                        <Copy className="h-4 w-4" />
                        Salvar como Template
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Nome do Template *</Label>
                          <Input
                            placeholder="Ex: Meu agente de vendas"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Descrição (opcional)</Label>
                          <Input
                            placeholder="Ex: Para leads de e-commerce"
                            value={templateDescription}
                            onChange={(e) => setTemplateDescription(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setShowSaveTemplateForm(false);
                              setTemplateName("");
                              setTemplateDescription("");
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 gap-1"
                            disabled={!templateName.trim() || savingAsTemplate}
                            onClick={saveAsTemplate}
                          >
                            {savingAsTemplate ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Save className="h-3 w-3" />
                            )}
                            Salvar
                          </Button>
                        </div>
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground text-center">
                      Templates salvos aparecem ao criar novos agentes
                    </p>
                  </CardContent>
                </Card>

                {/* Save Button */}
                <Button onClick={saveSettings} disabled={saving} className="w-full gap-2">
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Salvar Configurações
                </Button>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
