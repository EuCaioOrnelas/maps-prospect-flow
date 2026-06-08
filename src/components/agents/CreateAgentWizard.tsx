import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useUserScoreTracking } from "@/hooks/useUserScoreTracking";
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
  Save,
  ShieldAlert,
  CheckCircle,
  Settings,
  Link,
  DollarSign,
  X,
  Sparkles,
  Headphones,
  TrendingUp,
  FileText,
  Info
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CreateAgentWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  editingAgent?: {
    id: string;
    name: string;
    whatsapp_number_id: string | null;
    wizard_data?: Record<string, any> | null;
    system_prompt?: string | null;
    operating_hours_start: string;
    operating_hours_end: string;
    is_warmed: boolean;
    max_replies: number | null;
    max_response_chars: number | null;
    communication_style: string;
    crm_stage_on_new_lead: string | null;
    crm_stage_on_reply: string | null;
    crm_stage_on_end: string | null;
    crm_stage_on_lost: string | null;
    crm_stage_on_unknown: string | null;
    respond_to_groups?: boolean;
  } | null;
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

// Template definitions
interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  data: Partial<{
    suggestedName: string;
    agentRole: string;
    companyName: string;
    productName: string;
    productDescription: string;
    salesApproach: string;
    leadAwareness: string;
    messageReason: string;
    consciousnessLevel: string;
    openingStyle: string;
    firstMission: string;
    infoToDiscover: string;
    maxQuestions: string;
    presentationStyle: string;
    differentials: string;
    pricePolicy: string;
    commonObjections: string;
    objectionPosture: string;
    conversationGoal: string;
    endConditions: string[];
    closingStyle: string;
    canSendAudio: boolean;
    canSendLinks: boolean;
    canSendLongMessages: boolean;
    alwaysWaitResponse: boolean;
    maxChars: string;
    maxConsecutiveMessages: string;
    maxReplies: number | null;
  }>;
}

const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'sdr',
    name: 'SDR',
    description: 'Qualifica leads e agenda reuniões com decisores',
    icon: <TrendingUp className="h-6 w-6" />,
    data: {
      suggestedName: 'Agente SDR',
      agentRole: 'sdr',
      companyName: 'Minha Empresa',
      productName: 'Meu Produto/Serviço',
      productDescription: 'Descreva aqui o que você vende e como ajuda seus clientes.',
      salesApproach: 'qualify',
      leadAwareness: 'cold',
      messageReason: 'segmented_list',
      consciousnessLevel: 'aware_problem',
      openingStyle: 'question',
      firstMission: 'understand',
      infoToDiscover: `Qual é o cargo ou função da pessoa
Qual o tamanho da empresa ou equipe
Quais ferramentas ou soluções usam hoje
Qual o principal desafio ou problema
Tem interesse em conhecer uma solução`,
      maxQuestions: '2',
      presentationStyle: 'comparing',
      differentials: `Atendimento personalizado
Garantia de satisfação
Suporte rápido e humanizado
Condições especiais para novos clientes`,
      pricePolicy: 'never',
      commonObjections: `Não tenho tempo agora
Já tenho fornecedor
Preciso falar com meu sócio
Manda mais informações por email
Não é prioridade no momento`,
      objectionPosture: 'validate',
      conversationGoal: 'schedule_call',
      endConditions: ['CTA ignorado 2 vezes', 'Lead disse que não tem interesse'],
      closingStyle: 'offer_later',
      canSendAudio: false,
      canSendLinks: true,
      canSendLongMessages: false,
      alwaysWaitResponse: true,
      maxChars: '300',
      maxConsecutiveMessages: '2',
      maxReplies: 2
    }
  },
  {
    id: 'support',
    name: 'Suporte',
    description: 'Atende dúvidas e resolve problemas de clientes',
    icon: <Headphones className="h-6 w-6" />,
    data: {
      suggestedName: 'Agente Suporte',
      agentRole: 'specialist',
      companyName: 'Minha Empresa',
      productName: 'Meu Produto/Serviço',
      productDescription: 'Descreva aqui o que você vende e como ajuda seus clientes.',
      salesApproach: 'educate',
      leadAwareness: 'contacted',
      messageReason: 'active_search',
      consciousnessLevel: 'aware_solution',
      openingStyle: 'thank',
      firstMission: 'understand',
      infoToDiscover: `Qual é o problema ou dúvida exata
Quando começou esse problema
Já tentou alguma solução
Qual a urgência de resolver`,
      maxQuestions: '2',
      presentationStyle: 'educating',
      differentials: `Atendimento rápido e humanizado
Resolução sem burocracia
Acompanhamento até a solução
Satisfação garantida`,
      pricePolicy: 'never',
      commonObjections: `Isso já aconteceu antes
Demora muito para resolver
Prefiro falar com um humano
Não estou conseguindo usar direito`,
      objectionPosture: 'explain',
      conversationGoal: 'forward_human',
      endConditions: ['Objetivo atingido', 'Conversa esfriou', 'Lead disse que não tem interesse'],
      closingStyle: 'thank_open',
      canSendAudio: false,
      canSendLinks: true,
      canSendLongMessages: true,
      alwaysWaitResponse: true,
      maxChars: '500',
      maxConsecutiveMessages: '2',
      maxReplies: 3
    }
  },
  {
    id: 'sales',
    name: 'Vendas',
    description: 'Conduz todo o processo de venda até o fechamento',
    icon: <Sparkles className="h-6 w-6" />,
    data: {
      suggestedName: 'Agente Vendas',
      agentRole: 'sales',
      companyName: 'Minha Empresa',
      productName: 'Meu Produto/Serviço',
      productDescription: 'Descreva aqui o que você vende e como ajuda seus clientes.',
      salesApproach: 'close',
      leadAwareness: 'heard',
      messageReason: 'active_search',
      consciousnessLevel: 'aware_solution',
      openingStyle: 'thank',
      firstMission: 'value',
      infoToDiscover: `Qual problema quer resolver
Já conhece nossa solução
O que é mais importante: preço ou qualidade
Quando pretende decidir
Tem orçamento disponível`,
      maxQuestions: '2',
      presentationStyle: 'risk',
      differentials: `Garantia de satisfação ou dinheiro de volta
Suporte dedicado e rápido
Entrega ou implementação rápida
Clientes satisfeitos e casos de sucesso`,
      pricePolicy: 'with_context',
      commonObjections: `É muito caro pra mim
Preciso pensar mais
Vou comparar com outras opções
Não é o momento certo
Já comprei algo parecido antes`,
      objectionPosture: 'example',
      conversationGoal: 'close_deal',
      endConditions: ['CTA ignorado 2 vezes', 'Lead disse que não tem interesse', 'Objetivo atingido'],
      closingStyle: 'offer_later',
      canSendAudio: false,
      canSendLinks: true,
      canSendLongMessages: false,
      alwaysWaitResponse: true,
      maxChars: '300',
      maxConsecutiveMessages: '2',
      maxReplies: 3
    }
  }
];

// Step definitions
const STEPS = [
  { id: 'start-choice', title: 'Início', icon: Sparkles },
  { id: 'template', title: 'Template', icon: FileText },
  { id: 'basics', title: 'Básico', icon: Bot },
  { id: 'identity', title: 'Identidade', icon: User },
  { id: 'product', title: 'Produto', icon: DollarSign },
  { id: 'lead-context', title: 'Contexto do Lead', icon: Target },
  { id: 'opening', title: 'Abertura', icon: MessageCircle },
  { id: 'diagnosis', title: 'Diagnóstico', icon: Search },
  { id: 'conduct', title: 'Condução', icon: Zap },
  { id: 'objections', title: 'Objeções', icon: ShieldAlert },
  { id: 'cta', title: 'CTA', icon: CheckCircle },
  { id: 'links', title: 'Links e Mídias', icon: Link },
  { id: 'rules', title: 'Regras', icon: Settings },
  { id: 'review', title: 'Revisão', icon: CheckCircle },
];

export function CreateAgentWizard({ open, onOpenChange, onCreated, editingAgent }: CreateAgentWizardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { trackScoreEvent } = useUserScoreTracking();
  const navigate = useNavigate();
  const isEditing = !!editingAgent;
  
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [loadingNumbers, setLoadingNumbers] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [creationMode, setCreationMode] = useState<"template" | "scratch" | null>(null);
  const [userTemplates, setUserTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Basics
  const [name, setName] = useState("");
  const [selectedNumberId, setSelectedNumberId] = useState("");
  
  // Identity
  const [agentRole, setAgentRole] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [productName, setProductName] = useState("");
  const [salesApproach, setSalesApproach] = useState("");
  
  // Product Info
  const [productDescription, setProductDescription] = useState("");
  const [wantToTalkPrice, setWantToTalkPrice] = useState(false);
  const [productPrice, setProductPrice] = useState("");
  const [priceType, setPriceType] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [customDifferentials, setCustomDifferentials] = useState("");
  const [hasFreeTrial, setHasFreeTrial] = useState(false);
  const [trialDetails, setTrialDetails] = useState("");
  
  // Lead Context
  const [leadAwareness, setLeadAwareness] = useState("");
  const [messageReason, setMessageReason] = useState("");
  const [consciousnessLevel, setConsciousnessLevel] = useState("");
  
  // Opening
  const [openingStyle, setOpeningStyle] = useState("");
  const [firstMission, setFirstMission] = useState("");
  
  // Diagnosis - campos abertos
  const [infoToDiscover, setInfoToDiscover] = useState("");
  const [maxQuestions, setMaxQuestions] = useState("2");
  
  // Conduct - campos abertos
  const [presentationStyle, setPresentationStyle] = useState("");
  const [differentials, setDifferentials] = useState("");
  const [pricePolicy, setPricePolicy] = useState("");
  const [howToTalkPrice, setHowToTalkPrice] = useState("");
  
  // Objections - campos abertos
  const [commonObjections, setCommonObjections] = useState("");
  const [objectionPosture, setObjectionPosture] = useState("");
  
  // CTA
  const [conversationGoal, setConversationGoal] = useState("");
  const [endConditions, setEndConditions] = useState<string[]>([]);
  const [closingStyle, setClosingStyle] = useState("");
  
  // Links (opcional)
  const [schedulingLink, setSchedulingLink] = useState("");
  const [demoLink, setDemoLink] = useState("");
  const [websiteLink, setWebsiteLink] = useState("");
  const [checkoutLink, setCheckoutLink] = useState("");
  const [whatsappGroupLink, setWhatsappGroupLink] = useState("");
  const [customLinks, setCustomLinks] = useState<{ name: string; url: string; when: string }[]>([]);
  
  // Media (imagens e PDFs)
  const [mediaFiles, setMediaFiles] = useState<{ name: string; url: string; type: 'image' | 'pdf'; when: string; uploading?: boolean; fileName?: string }[]>([]);
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  
  // Rules
  const [canSendAudio, setCanSendAudio] = useState(false);
  const [canSendLinks, setCanSendLinks] = useState(true);
  const [canSendMedia, setCanSendMedia] = useState(false);
  const [canSendLongMessages, setCanSendLongMessages] = useState(false);
  const [respondToGroups, setRespondToGroups] = useState(false);
  const [maxChars, setMaxChars] = useState("300");
  const [maxConsecutiveMessages, setMaxConsecutiveMessages] = useState("2");
  const [alwaysWaitResponse, setAlwaysWaitResponse] = useState(true);
  
  // Operating hours
  const [operatingHoursStart, setOperatingHoursStart] = useState("08:00");
  const [operatingHoursEnd, setOperatingHoursEnd] = useState("18:00");
  const [isWarmed, setIsWarmed] = useState(false);
  const [maxReplies, setMaxReplies] = useState<number | null>(1);
  const [showLeadsLimitInfo, setShowLeadsLimitInfo] = useState(false);
  
  // CRM stage config
  const [crmStageOnNewLead, setCrmStageOnNewLead] = useState("Respondeu Mensagem");
  const [crmStageOnReply, setCrmStageOnReply] = useState("Mensagem Enviada");
  const [crmStageOnEnd, setCrmStageOnEnd] = useState("");
  const [crmStageOnLost, setCrmStageOnLost] = useState("");
  const [crmStageOnUnknown, setCrmStageOnUnknown] = useState("");
  const [pipelineStages, setPipelineStages] = useState<{id: string; name: string}[]>([]);

  // Apply template data to form fields (works for both default and user templates)
  const applyTemplate = (templateId: string, isUserTemplate: boolean = false) => {
    let data: any;
    
    if (isUserTemplate) {
      const userTemplate = userTemplates.find(t => t.id === templateId);
      if (!userTemplate) return;
      data = userTemplate.template_data;
      setSelectedTemplate(`user_${templateId}`);
    } else {
      const template = AGENT_TEMPLATES.find(t => t.id === templateId);
      if (!template) return;
      data = template.data;
      setSelectedTemplate(templateId);
    }
    
    // Apply all template values - only set if value exists and is not empty
    if (data.suggestedName) setName(data.suggestedName);
    if (data.agentRole) setAgentRole(data.agentRole);
    if (data.companyName) setCompanyName(data.companyName);
    if (data.productName) setProductName(data.productName);
    if (data.productDescription) setProductDescription(data.productDescription);
    if (data.salesApproach) setSalesApproach(data.salesApproach);
    if (data.leadAwareness) setLeadAwareness(data.leadAwareness);
    if (data.messageReason) setMessageReason(data.messageReason);
    if (data.consciousnessLevel) setConsciousnessLevel(data.consciousnessLevel);
    if (data.openingStyle) setOpeningStyle(data.openingStyle);
    if (data.firstMission) setFirstMission(data.firstMission);
    if (data.infoToDiscover) setInfoToDiscover(data.infoToDiscover);
    if (data.maxQuestions) setMaxQuestions(data.maxQuestions);
    if (data.presentationStyle) setPresentationStyle(data.presentationStyle);
    if (data.differentials) setDifferentials(data.differentials);
    if (data.pricePolicy) setPricePolicy(data.pricePolicy);
    if (data.commonObjections) setCommonObjections(data.commonObjections);
    if (data.objectionPosture) setObjectionPosture(data.objectionPosture);
    if (data.conversationGoal) setConversationGoal(data.conversationGoal);
    if (data.endConditions && data.endConditions.length > 0) setEndConditions(data.endConditions);
    if (data.closingStyle) setClosingStyle(data.closingStyle);
    if (data.canSendAudio !== undefined) setCanSendAudio(data.canSendAudio);
    if (data.canSendLinks !== undefined) setCanSendLinks(data.canSendLinks);
    if (data.canSendLongMessages !== undefined) setCanSendLongMessages(data.canSendLongMessages);
    if (data.alwaysWaitResponse !== undefined) setAlwaysWaitResponse(data.alwaysWaitResponse);
    if (data.maxChars) setMaxChars(data.maxChars);
    if (data.maxConsecutiveMessages) setMaxConsecutiveMessages(data.maxConsecutiveMessages);
    if (data.maxReplies !== undefined) setMaxReplies(data.maxReplies);
    if (data.customDifferentials) setCustomDifferentials(data.customDifferentials);
    
    // Handle operating hours if saved in template
    if (data.operatingHoursStart) setOperatingHoursStart(data.operatingHoursStart);
    if (data.operatingHoursEnd) setOperatingHoursEnd(data.operatingHoursEnd);

    // Templates only pre-fill wizard form fields — the system prompt is always
    // generated fresh from generatePrompt() using the user's actual inputs.
    // No need to cache template system prompts anymore.
  };

  const deleteUserTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('agent_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      setUserTemplates(prev => prev.filter(t => t.id !== templateId));
      toast({
        title: "Template excluído",
        description: "O template foi removido com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Erro ao excluir",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const fetchNumbers = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('whatsapp_numbers')
          .select('id, name, phone_number, is_connected')
          .eq('owner_user_id', accountOwnerId)
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

    const fetchUserTemplates = async () => {
      if (!user) return;
      setLoadingTemplates(true);
      try {
        const { data, error } = await supabase
          .from('agent_templates')
          .select('*')
          .eq('owner_user_id', accountOwnerId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setUserTemplates(data || []);
      } catch (error) {
        console.error('Error fetching user templates:', error);
      } finally {
        setLoadingTemplates(false);
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

    if (open) {
      fetchNumbers();
      fetchUserTemplates();
      fetchPipelineStages();
    }
  }, [user, open]);

  // Load editing agent data when opening in edit mode
  useEffect(() => {
    if (open && editingAgent) {
      const wd = editingAgent.wizard_data;
      if (wd) {
        // Restore all wizard form fields from saved wizard_data
        if (wd.name) setName(wd.name);
        if (wd.selectedNumberId) setSelectedNumberId(wd.selectedNumberId);
        if (wd.agentRole) setAgentRole(wd.agentRole);
        if (wd.companyName) setCompanyName(wd.companyName);
        if (wd.productName) setProductName(wd.productName);
        if (wd.productDescription) setProductDescription(wd.productDescription);
        if (wd.salesApproach) setSalesApproach(wd.salesApproach);
        if (wd.leadAwareness) setLeadAwareness(wd.leadAwareness);
        if (wd.messageReason) setMessageReason(wd.messageReason);
        if (wd.consciousnessLevel) setConsciousnessLevel(wd.consciousnessLevel);
        if (wd.openingStyle) setOpeningStyle(wd.openingStyle);
        if (wd.firstMission) setFirstMission(wd.firstMission);
        if (wd.infoToDiscover) setInfoToDiscover(wd.infoToDiscover);
        if (wd.maxQuestions) setMaxQuestions(wd.maxQuestions);
        if (wd.presentationStyle) setPresentationStyle(wd.presentationStyle);
        if (wd.differentials) setDifferentials(wd.differentials);
        if (wd.pricePolicy) setPricePolicy(wd.pricePolicy);
        if (wd.howToTalkPrice) setHowToTalkPrice(wd.howToTalkPrice);
        if (wd.commonObjections) setCommonObjections(wd.commonObjections);
        if (wd.objectionPosture) setObjectionPosture(wd.objectionPosture);
        if (wd.conversationGoal) setConversationGoal(wd.conversationGoal);
        if (wd.endConditions?.length > 0) setEndConditions(wd.endConditions);
        if (wd.closingStyle) setClosingStyle(wd.closingStyle);
        if (wd.schedulingLink) setSchedulingLink(wd.schedulingLink);
        if (wd.demoLink) setDemoLink(wd.demoLink);
        if (wd.websiteLink) setWebsiteLink(wd.websiteLink);
        if (wd.checkoutLink) setCheckoutLink(wd.checkoutLink);
        if (wd.whatsappGroupLink) setWhatsappGroupLink(wd.whatsappGroupLink);
        if (wd.customLinks) setCustomLinks(wd.customLinks);
        if (wd.mediaFiles) {
          setMediaFiles(wd.mediaFiles);
          // Auto-enable canSendMedia if there are configured media files
          const hasConfiguredMedia = wd.mediaFiles.some((m: any) => m.url && m.name);
          if (hasConfiguredMedia) setCanSendMedia(true);
          else if (wd.canSendMedia !== undefined) setCanSendMedia(wd.canSendMedia);
        } else if (wd.canSendMedia !== undefined) {
          setCanSendMedia(wd.canSendMedia);
        }
        if (wd.canSendAudio !== undefined) setCanSendAudio(wd.canSendAudio);
        if (wd.canSendLinks !== undefined) setCanSendLinks(wd.canSendLinks);
        if (wd.canSendLongMessages !== undefined) setCanSendLongMessages(wd.canSendLongMessages);
        if (wd.maxChars) setMaxChars(wd.maxChars);
        if (wd.maxConsecutiveMessages) setMaxConsecutiveMessages(wd.maxConsecutiveMessages);
        if (wd.alwaysWaitResponse !== undefined) setAlwaysWaitResponse(wd.alwaysWaitResponse);
        if (wd.respondToGroups !== undefined) setRespondToGroups(wd.respondToGroups);
        if (wd.wantToTalkPrice !== undefined) setWantToTalkPrice(wd.wantToTalkPrice);
        if (wd.productPrice) setProductPrice(wd.productPrice);
        if (wd.priceType) setPriceType(wd.priceType);
        if (wd.paymentMethods) setPaymentMethods(wd.paymentMethods);
        if (wd.customDifferentials) setCustomDifferentials(wd.customDifferentials);
        if (wd.hasFreeTrial !== undefined) setHasFreeTrial(wd.hasFreeTrial);
        if (wd.trialDetails) setTrialDetails(wd.trialDetails);
        if (wd.crmStageOnNewLead) setCrmStageOnNewLead(wd.crmStageOnNewLead);
        if (wd.crmStageOnReply) setCrmStageOnReply(wd.crmStageOnReply);
        if (wd.crmStageOnEnd) setCrmStageOnEnd(wd.crmStageOnEnd);
        if (wd.crmStageOnLost) setCrmStageOnLost(wd.crmStageOnLost);
        if (wd.crmStageOnUnknown) setCrmStageOnUnknown(wd.crmStageOnUnknown);
      } else {
        // Fallback: load basic fields from agent record
        setName(editingAgent.name || '');
        if (editingAgent.whatsapp_number_id) setSelectedNumberId(editingAgent.whatsapp_number_id);
        if (editingAgent.crm_stage_on_new_lead) setCrmStageOnNewLead(editingAgent.crm_stage_on_new_lead);
        if (editingAgent.crm_stage_on_reply) setCrmStageOnReply(editingAgent.crm_stage_on_reply);
        if (editingAgent.crm_stage_on_end) setCrmStageOnEnd(editingAgent.crm_stage_on_end);
        if (editingAgent.crm_stage_on_unknown) setCrmStageOnUnknown(editingAgent.crm_stage_on_unknown);
      }
      
      // Always load these from agent record
      setOperatingHoursStart(editingAgent.operating_hours_start?.slice(0, 5) || '08:00');
      setOperatingHoursEnd(editingAgent.operating_hours_end?.slice(0, 5) || '18:00');
      setIsWarmed(editingAgent.is_warmed);
      setMaxReplies(editingAgent.max_replies);
      if (editingAgent.max_response_chars) setMaxChars(String(editingAgent.max_response_chars));
      if (editingAgent.respond_to_groups !== undefined) setRespondToGroups(editingAgent.respond_to_groups ?? false);
      
      // Skip to basics step when editing (skip start-choice and template)
      setCreationMode('scratch');
      setCurrentStep(2); // basics step
    }
  }, [open, editingAgent]);

  useEffect(() => {
    const selectedNumber = numbers.find(n => n.id === selectedNumberId);
    if (selectedNumber) {
      const isWarm = selectedNumber.warming_status === 'hot' || (selectedNumber.warming_level && selectedNumber.warming_level >= 3);
      setIsWarmed(isWarm);
    }
  }, [selectedNumberId, numbers]);

  const resetForm = () => {
    setCurrentStep(0);
    setSelectedTemplate("");
    setCreationMode(null);
    setName("");
    setSelectedNumberId("");
    setAgentRole("");
    setCompanyName("");
    setProductName("");
    setSalesApproach("");
    setProductDescription("");
    setWantToTalkPrice(false);
    setProductPrice("");
    setPriceType("");
    setPaymentMethods([]);
    setCustomDifferentials("");
    setHasFreeTrial(false);
    setTrialDetails("");
    setLeadAwareness("");
    setMessageReason("");
    setConsciousnessLevel("");
    setOpeningStyle("");
    setFirstMission("");
    setInfoToDiscover("");
    setMaxQuestions("2");
    setPresentationStyle("");
    setDifferentials("");
    setPricePolicy("");
    setHowToTalkPrice("");
    setCommonObjections("");
    setObjectionPosture("");
    setConversationGoal("");
    setEndConditions([]);
    setClosingStyle("");
    setSchedulingLink("");
    setDemoLink("");
    setWebsiteLink("");
    setCheckoutLink("");
    setWhatsappGroupLink("");
    setCustomLinks([]);
    setMediaFiles([]);
    setCanSendAudio(false);
    setCanSendLinks(true);
    setCanSendMedia(false);
    setCanSendLongMessages(false);
    setMaxChars("300");
    setMaxConsecutiveMessages("2");
    setAlwaysWaitResponse(true);
    setRespondToGroups(false);
    setOperatingHoursStart("08:00");
    setOperatingHoursEnd("18:00");
    setIsWarmed(false);
    setMaxReplies(1);
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

    const priceTypeLabels: Record<string, string> = {
      monthly: "mensal",
      one_time: "pagamento único",
      custom: "personalizado conforme necessidade",
    };

    // Build links section
    let linksSection = "";
    const availableLinks: string[] = [];
    
    if (schedulingLink) availableLinks.push(`- Link de agendamento: ${schedulingLink}`);
    if (demoLink) availableLinks.push(`- Link de demonstração: ${demoLink}`);
    if (websiteLink) availableLinks.push(`- Site: ${websiteLink}`);
    if (checkoutLink) availableLinks.push(`- Link de pagamento/checkout: ${checkoutLink}`);
    if (whatsappGroupLink) availableLinks.push(`- Grupo WhatsApp: ${whatsappGroupLink}`);
    customLinks.forEach(link => {
      if (link.url) availableLinks.push(`- ${link.name}: ${link.url} (usar quando: ${link.when})`);
    });

    if (availableLinks.length > 0) {
      linksSection = `
---

# LINKS DISPONÍVEIS

Você pode enviar estes links quando apropriado:
${availableLinks.join('\n')}

**Quando usar cada link:**
${schedulingLink ? `- Envie o link de agendamento quando o objetivo for agendar uma call` : ''}
${demoLink ? `- Envie o link de demonstração quando o lead quiser ver o produto funcionando` : ''}
${checkoutLink ? `- Envie o link de checkout apenas quando o lead confirmar que quer comprar` : ''}
${websiteLink ? `- Envie o site quando o lead pedir mais informações gerais` : ''}
`;
    }

    // Build media section
    let mediaSection = "";
    const configuredMedia = mediaFiles.filter(m => m.url && m.name);
    if (configuredMedia.length > 0 && canSendMedia) {
      const mediaItems = configuredMedia.map(m => {
        const typeLabel = m.type === 'image' ? '🖼️ Imagem' : '📄 PDF';
        return `- ${typeLabel} "${m.name}": ${m.url} → Enviar quando: ${m.when || 'quando relevante na conversa'}`;
      });
      
      mediaSection = `
---

# ARQUIVOS DISPONÍVEIS (IMAGENS E PDFs)

Você tem os seguintes arquivos que pode enviar via WhatsApp:
${mediaItems.join('\n')}

**COMO ENVIAR ARQUIVOS:**
- Quando identificar que é o momento certo de enviar um arquivo, use o marcador especial na sua resposta:
  - Para imagens: [ENVIAR_IMAGEM:URL_DA_IMAGEM|LEGENDA_OPCIONAL]
  - Para PDFs: [ENVIAR_PDF:URL_DO_PDF|NOME_DO_ARQUIVO.pdf]
- Exemplo: "Segue nosso catálogo completo! [ENVIAR_PDF:https://exemplo.com/catalogo.pdf|Catálogo 2025.pdf]"
- Exemplo: "Veja como fica o resultado! [ENVIAR_IMAGEM:https://exemplo.com/resultado.jpg|Exemplo de resultado]"
- O marcador NÃO será exibido ao lead, apenas o arquivo será enviado junto com o texto.
- Envie o texto da mensagem normalmente e adicione o marcador no ponto apropriado.
- A IA deve decidir INTELIGENTEMENTE quando enviar: NÃO envie todos de uma vez, envie conforme o contexto da conversa.
- Priorize enviar o arquivo mais relevante para o momento da conversa.

⚠️ **REGRA CRÍTICA SOBRE ARQUIVOS vs POLÍTICA DE PREÇO:**
- O envio de arquivos configurados é INDEPENDENTE da política de preço.
- Se um arquivo foi configurado para ser enviado "quando o lead pedir orçamento/preço", você DEVE enviá-lo mesmo que a política de preço diga "NUNCA mencionar preço".
- A política de preço se aplica a TEXTO escrito por você. Arquivos pré-configurados pelo usuário são materiais aprovados e devem ser enviados conforme a condição definida.
- Exemplo: Se a política diz "nunca falar preço" mas há um PDF de orçamento configurado para "quando pedir preço", envie o PDF com uma mensagem como "Segue nosso material com mais detalhes!" sem mencionar valores no texto.
`;
    }

    // Build product section
    let productSection = "";
    if (productDescription || (wantToTalkPrice && productPrice)) {
      productSection = `
---

# INFORMAÇÕES DO PRODUTO/SERVIÇO

**Descrição:** ${productDescription || 'Não informado'}
${wantToTalkPrice && productPrice ? `
**Preço:** R$ ${productPrice} ${priceTypeLabels[priceType] || ''}
${paymentMethods.length > 0 ? `**Formas de pagamento:** ${paymentMethods.join(', ')}` : ''}
` : ''}
${hasFreeTrial ? `**Período de teste:** ${trialDetails || 'Disponível'}` : ''}

${customDifferentials ? `**Diferenciais específicos:**
${customDifferentials.split('\n').filter(d => d.trim()).map(d => `- ${d.trim()}`).join('\n')}` : ''}
`;
    }

    // Build info to discover section
    const infoToDiscoverList = infoToDiscover.split('\n').filter(i => i.trim());

    // Build differentials section
    const differentialsList = differentials.split('\n').filter(d => d.trim());

    // Build objections section
    const objectionsList = commonObjections.split('\n').filter(o => o.trim());

    return `# IDENTIDADE DO AGENTE

Você é um ${roleLabels[agentRole] || agentRole} da empresa "${companyName || '[Nome da Empresa]'}".
${productName ? `Você representa o produto/serviço: "${productName}".` : ''}

**Sua função:** ${approachLabels[salesApproach] || salesApproach}
${productSection}
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
${infoToDiscoverList.length > 0 ? infoToDiscoverList.map(info => `- ${info}`).join('\n') : '- Informações básicas do lead'}

**Limite:** Faça no MÁXIMO ${maxQuestions} perguntas antes de oferecer algo. Evite parecer um interrogatório.

---

# CONDUÇÃO DA CONVERSA

**Estilo de apresentação:** ${presentationLabels[presentationStyle] || presentationStyle}

**Diferenciais que DEVEM aparecer naturalmente na conversa:**
${differentialsList.length > 0 ? differentialsList.map(diff => `✓ ${diff}`).join('\n') : '- Benefícios do produto/serviço'}

**Política de preço:** ${priceLabels[pricePolicy] || pricePolicy}
${(pricePolicy === 'if_asked' || pricePolicy === 'with_context') && wantToTalkPrice && productPrice ? `
**Como falar do preço:**
- O preço é R$ ${productPrice} (${priceTypeLabels[priceType] || ''})
${howToTalkPrice ? `- Abordagem: ${howToTalkPrice}` : '- Sempre contextualize o valor entregue antes de falar o preço'}
` : ''}
${linksSection}
${mediaSection}
---

# OBJEÇÕES COMUNS E COMO RESPONDER

Esteja preparado para estas objeções:
${objectionsList.length > 0 ? objectionsList.map(obj => `- "${obj}"`).join('\n') : '- Objeções gerais'}

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
${canSendMedia ? '✓ PODE enviar imagens e PDFs (use os marcadores [ENVIAR_IMAGEM:...] e [ENVIAR_PDF:...])' : '✗ NÃO enviar imagens ou PDFs'}
${canSendLongMessages ? '✓ PODE enviar mensagens longas' : '✗ NÃO enviar mensagens longas'}

**Limites:**
- Cada bloco/parágrafo será enviado como mensagem separada no WhatsApp (máximo ${maxChars} caracteres por mensagem)
- Máximo de ${maxConsecutiveMessages} mensagens seguidas por resposta
- Separe saudação, resposta e pergunta em parágrafos distintos
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
    if (!user || loading) return;
    
    // Validate CRM stages still exist
    const stageNames = pipelineStages.map(s => s.name);
    const invalidStages: string[] = [];
    if (crmStageOnNewLead && !stageNames.includes(crmStageOnNewLead)) invalidStages.push(`"${crmStageOnNewLead}" (quando lead responde)`);
    if (crmStageOnReply && !stageNames.includes(crmStageOnReply)) invalidStages.push(`"${crmStageOnReply}" (quando agente responde)`);
    if (crmStageOnEnd && !stageNames.includes(crmStageOnEnd)) invalidStages.push(`"${crmStageOnEnd}" (quando objetivo é atingido)`);
    if (crmStageOnLost && !stageNames.includes(crmStageOnLost)) invalidStages.push(`"${crmStageOnLost}" (quando lead é perdido)`);
    if (crmStageOnUnknown && !stageNames.includes(crmStageOnUnknown)) invalidStages.push(`"${crmStageOnUnknown}" (quando agente não sabe)`);
    
    if (invalidStages.length > 0) {
      if (crmStageOnNewLead && !stageNames.includes(crmStageOnNewLead)) setCrmStageOnNewLead("");
      if (crmStageOnReply && !stageNames.includes(crmStageOnReply)) setCrmStageOnReply("");
      if (crmStageOnEnd && !stageNames.includes(crmStageOnEnd)) setCrmStageOnEnd("");
      if (crmStageOnLost && !stageNames.includes(crmStageOnLost)) setCrmStageOnLost("");
      if (crmStageOnUnknown && !stageNames.includes(crmStageOnUnknown)) setCrmStageOnUnknown("");
      
      toast({
        title: "⚠️ Colunas CRM inválidas",
        description: `As seguintes colunas não existem mais: ${invalidStages.join(", ")}. Selecione novas colunas na etapa de Regras.`,
        variant: "destructive",
      });
      // Go back to rules step
      setCurrentStep(STEPS.findIndex(s => s.id === 'rules'));
      return;
    }
    
    setLoading(true);
    
    try {
      // Always generate prompt from the user's wizard inputs — never use a cached template prompt
      // Templates only pre-fill the form fields; the final prompt must reflect the user's actual edits
      const systemPrompt = generatePrompt();
      
      // Map salesApproach to valid objective values (constraint: prospecting, warming, first_contact)
      const objectiveMap: Record<string, string> = {
        'qualify': 'prospecting',
        'educate': 'warming',
        'close': 'first_contact',
      };
      const mappedObjective = objectiveMap[salesApproach] || 'prospecting';
      
      // Build wizard_data to save all form fields for future editing
      const wizardData = {
        name, selectedNumberId, agentRole, companyName, productName, productDescription,
        salesApproach, leadAwareness, messageReason, consciousnessLevel,
        openingStyle, firstMission, infoToDiscover, maxQuestions,
        presentationStyle, differentials, pricePolicy, howToTalkPrice,
        commonObjections, objectionPosture, conversationGoal, endConditions, closingStyle,
        schedulingLink, demoLink, websiteLink, checkoutLink, whatsappGroupLink,
        customLinks, mediaFiles: mediaFiles.map(m => ({ name: m.name, url: m.url, type: m.type, when: m.when, fileName: m.fileName })),
        canSendAudio, canSendLinks, canSendMedia, canSendLongMessages,
        maxChars, maxConsecutiveMessages, alwaysWaitResponse, respondToGroups,
        wantToTalkPrice, productPrice, priceType, paymentMethods,
        customDifferentials, hasFreeTrial, trialDetails,
        operatingHoursStart, operatingHoursEnd,
        crmStageOnNewLead, crmStageOnReply, crmStageOnEnd, crmStageOnLost, crmStageOnUnknown,
      };

      const agentPayload = {
        name,
        whatsapp_number_id: selectedNumberId,
        objective: mappedObjective,
        target_audience: leadAwareness || '',
        system_prompt: systemPrompt,
        agent_objective: conversationGoal || '',
        end_conversation_criteria: endConditions.join(', ') || '',
        post_response_behavior: openingStyle || '',
        communication_style: 'neutral' as const,
        operating_hours_start: operatingHoursStart,
        operating_hours_end: operatingHoursEnd,
        is_warmed: isWarmed,
        max_replies: maxReplies,
        max_response_chars: parseInt(maxChars),
        crm_stage_on_new_lead: crmStageOnNewLead || null,
        crm_stage_on_reply: crmStageOnReply || null,
        crm_stage_on_end: crmStageOnEnd || null,
        crm_stage_on_lost: crmStageOnLost || null,
        crm_stage_on_unknown: crmStageOnUnknown || null,
        respond_to_groups: respondToGroups,
        wizard_data: wizardData,
        updated_at: new Date().toISOString(),
      };

      if (isEditing && editingAgent) {
        // UPDATE existing agent
        const { error } = await supabase
          .from('ai_agents')
          .update(agentPayload)
          .eq('id', editingAgent.id);

        if (error) throw error;

        toast({
          title: "Agente atualizado!",
          description: `${name} foi atualizado com sucesso.`,
        });
      } else {
        // CREATE new agent
        const { error } = await supabase
          .from('ai_agents')
          .insert({
            user_id: user.id,
            ...agentPayload,
            status: activate ? 'active' : 'draft',
            message_templates: MESSAGE_TEMPLATES.prospecting,
          });

        if (error) throw error;

        // Track score event
        trackScoreEvent("first_ai_agent_created", { agent_name: name });
        trackScoreEvent("ai_agent_feature_used");
      }

      // Reconfigure webhook for the selected number to ensure agent receives messages
      try {
        const { data: numberData } = await supabase
          .from('whatsapp_numbers')
          .select('instance_name')
          .eq('id', selectedNumberId)
          .single();
        
        if (numberData?.instance_name) {
          console.log('Reconfiguring webhook for instance:', numberData.instance_name);
          
          const { data: result, error: webhookError } = await supabase.functions.invoke('evolution-reconfigure-webhook', {
            body: { instanceName: numberData.instance_name },
          });
          
          if (webhookError || !result?.success) {
            console.warn('First webhook config attempt failed, retrying in 3s...', webhookError || result);
            await new Promise(resolve => setTimeout(resolve, 3000));
            const { data: retryResult } = await supabase.functions.invoke('evolution-reconfigure-webhook', {
              body: { instanceName: numberData.instance_name },
            });
            console.log('Webhook retry result:', retryResult);
          } else {
            console.log('Webhook configured successfully:', result);
          }
        }
      } catch (webhookErr) {
        console.error('Failed to reconfigure webhook (non-blocking):', webhookErr);
      }


      if (!isEditing) {
        toast({
          title: activate ? "Agente ativado!" : "Agente salvo como rascunho",
          description: `${name} foi criado com sucesso.`,
        });
      }

      resetForm();
      onOpenChange(false);
      onCreated();
    } catch (error) {
      console.error('Error saving agent:', error);
      toast({
        title: isEditing ? "Erro ao atualizar agente" : "Erro ao criar agente",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const canProceed = (): boolean => {
    switch (STEPS[currentStep].id) {
      case 'start-choice':
        return !!creationMode;
      case 'template':
        return !!selectedTemplate;
      case 'basics':
        return name.trim().length >= 3 && !!selectedNumberId;
      case 'identity':
        return !!agentRole && !!companyName && !!salesApproach;
      case 'product':
        return true; // Optional step
      case 'lead-context':
        return !!leadAwareness && !!messageReason && !!consciousnessLevel;
      case 'opening':
        return !!openingStyle && !!firstMission;
      case 'diagnosis':
        return infoToDiscover.trim().length > 0;
      case 'conduct':
        return !!presentationStyle && differentials.trim().length > 0 && !!pricePolicy;
      case 'objections':
        return commonObjections.trim().length > 0 && !!objectionPosture;
      case 'cta':
        return !!conversationGoal && endConditions.length > 0 && !!closingStyle;
      case 'links':
        return true; // Optional step
      case 'rules':
        return !!crmStageOnUnknown || pipelineStages.length === 0;
      case 'review':
        return true;
      default:
        return true;
    }
  };

  // Handle next step logic (skip template step if creating from scratch)
  const handleNextStep = () => {
    const currentStepId = STEPS[currentStep].id;
    
    // If user chose "criar do zero", skip the template step
    if (currentStepId === 'start-choice' && creationMode === 'scratch') {
      setCurrentStep(currentStep + 2); // Skip to 'basics' step
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  // Handle previous step logic
  const handlePrevStep = () => {
    const currentStepId = STEPS[currentStep].id;
    
    // If on basics step and user chose "criar do zero", go back to start-choice
    if (currentStepId === 'basics' && creationMode === 'scratch') {
      setCurrentStep(0); // Go back to start-choice
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  const availableNumbers = numbers.filter(n => !n.has_active_agent || (isEditing && n.id === editingAgent?.whatsapp_number_id));

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

  const addCustomLink = () => {
    setCustomLinks([...customLinks, { name: '', url: '', when: '' }]);
  };

  const updateCustomLink = (index: number, field: 'name' | 'url' | 'when', value: string) => {
    const updated = [...customLinks];
    updated[index][field] = value;
    setCustomLinks(updated);
  };

  const removeCustomLink = (index: number) => {
    setCustomLinks(customLinks.filter((_, i) => i !== index));
  };

  const uploadMediaFile = async (file: File) => {
    if (!user) return;
    
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    
    if (!isImage && !isPdf) {
      toast({ title: "Formato inválido", description: "Envie apenas imagens (JPG, PNG, WebP) ou PDFs.", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "O tamanho máximo é 10MB.", variant: "destructive" });
      return;
    }

    const index = mediaFiles.length;
    const newMedia = { 
      name: file.name.replace(/\.[^/.]+$/, ''), 
      url: '', 
      type: (isImage ? 'image' : 'pdf') as 'image' | 'pdf', 
      when: '', 
      uploading: true, 
      fileName: file.name 
    };
    setMediaFiles(prev => [...prev, newMedia]);
    // Auto-enable media sending when files are added
    setCanSendMedia(true);

    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('agent-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('agent-media')
        .getPublicUrl(filePath);

      setMediaFiles(prev => prev.map((m, i) => 
        i === index ? { ...m, url: urlData.publicUrl, uploading: false } : m
      ));
      
      toast({ title: "Arquivo enviado!", description: file.name });
    } catch (err: any) {
      console.error('Upload error:', err);
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
      setMediaFiles(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleMediaDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingMedia(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => uploadMediaFile(file));
  };

  const handleMediaFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => uploadMediaFile(file));
    e.target.value = '';
  };

  const updateMediaFile = (index: number, field: 'name' | 'url' | 'type' | 'when', value: string) => {
    const updated = [...mediaFiles];
    (updated[index] as any)[field] = value;
    setMediaFiles(updated);
  };

  const removeMediaFile = (index: number) => {
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
  };

  const renderStep = () => {
    const stepId = STEPS[currentStep].id;

    switch (stepId) {
      case 'start-choice':
        return (
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                💡 Como você quer começar a criar seu agente?
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div
                onClick={() => setCreationMode('template')}
                className={`p-5 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                  creationMode === 'template'
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    creationMode === 'template' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Usar um modelo pronto</h4>
                    <p className="text-sm text-muted-foreground">
                      Escolha entre SDR, Suporte ou Vendas. Todos os campos serão preenchidos automaticamente e você pode personalizar.
                    </p>
                  </div>
                  {creationMode === 'template' && (
                    <Badge variant="default" className="text-xs">
                      Selecionado
                    </Badge>
                  )}
                </div>
              </div>

              <div
                onClick={() => setCreationMode('scratch')}
                className={`p-5 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                  creationMode === 'scratch'
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    creationMode === 'scratch' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Criar do zero</h4>
                    <p className="text-sm text-muted-foreground">
                      Configure cada detalhe do agente manualmente, sem modelo base.
                    </p>
                  </div>
                  {creationMode === 'scratch' && (
                    <Badge variant="default" className="text-xs">
                      Selecionado
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'template':
        return (
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                💡 Escolha um modelo. Todos os campos serão preenchidos, mas você pode editá-los nas próximas etapas.
              </p>
            </div>

            {/* User saved templates */}
            {userTemplates.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Seus Templates Salvos</Label>
                <div className="grid grid-cols-1 gap-2">
                  {userTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                        selectedTemplate === `user_${template.id}`
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            selectedTemplate === `user_${template.id}` ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          }`}
                          onClick={() => applyTemplate(template.id, true)}
                        >
                          <Bot className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0" onClick={() => applyTemplate(template.id, true)}>
                          <h4 className="font-semibold text-sm truncate">{template.name}</h4>
                          {template.description && (
                            <p className="text-xs text-muted-foreground truncate">{template.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {selectedTemplate === `user_${template.id}` && (
                            <Badge variant="outline" className="text-xs">Selecionado</Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteUserTemplate(template.id);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Default templates */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Templates Padrão</Label>
              <div className="grid grid-cols-1 gap-2">
                {AGENT_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => applyTemplate(template.id, false)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                      selectedTemplate === template.id
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        selectedTemplate === template.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        {template.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{template.name}</h4>
                        <p className="text-xs text-muted-foreground">{template.description}</p>
                      </div>
                      {selectedTemplate === template.id && (
                        <Badge variant="outline" className="text-xs">Selecionado</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedTemplate && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-xs text-green-600 dark:text-green-400">
                  ✓ Template aplicado! Você ainda pode editar todos os campos nas próximas etapas.
                </p>
              </div>
            )}
          </div>
        );

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
              <Input placeholder="Ex: Minha Empresa Ltda" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Nome do produto/serviço</Label>
              <Input placeholder="Ex: Plataforma de automação de vendas" value={productName} onChange={(e) => setProductName(e.target.value)} />
              <p className="text-xs text-muted-foreground">O nome que o agente usará para se referir ao produto</p>
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

      case 'product':
        return (
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                💡 Essas informações ajudam o agente a falar com propriedade sobre seu produto/serviço
              </p>
            </div>

            <div className="space-y-2">
              <Label>Descrição do produto/serviço</Label>
              <Textarea
                placeholder="Ex: Uma plataforma que automatiza o disparo de mensagens via WhatsApp, com aquecimento de número e IA para responder leads automaticamente..."
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">O agente usará isso para explicar o produto</p>
            </div>

            {/* Pergunta sobre preço */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox checked={wantToTalkPrice} onCheckedChange={(c) => setWantToTalkPrice(!!c)} id="want-price" />
                <Label htmlFor="want-price" className="cursor-pointer font-medium">O agente deve falar sobre preço?</Label>
              </div>
            </div>

            {/* Campos condicionais de preço */}
            {wantToTalkPrice && (
              <div className="space-y-4 p-3 border border-primary/20 rounded-lg bg-primary/5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Preço (R$) <span className="text-destructive">*</span></Label>
                    <Input
                      type="text"
                      placeholder="Ex: 197,00"
                      value={productPrice}
                      onChange={(e) => setProductPrice(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de cobrança</Label>
                    <Select value={priceType} onValueChange={setPriceType}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="one_time">Pagamento único</SelectItem>
                        <SelectItem value="custom">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Formas de pagamento aceitas</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Pix", "Cartão de crédito", "Boleto", "Parcelamento"].map((item) => (
                      <CheckboxOption
                        key={item}
                        label={item}
                        checked={paymentMethods.includes(item)}
                        onCheckedChange={() => toggleArrayItem(paymentMethods, item, setPaymentMethods)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox checked={hasFreeTrial} onCheckedChange={(c) => setHasFreeTrial(!!c)} id="trial" />
                <Label htmlFor="trial" className="cursor-pointer">Oferece período de teste grátis?</Label>
              </div>
              {hasFreeTrial && (
                <Input
                  placeholder="Ex: 7 dias grátis para testar todas as funcionalidades"
                  value={trialDetails}
                  onChange={(e) => setTrialDetails(e.target.value)}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Diferenciais do seu produto/serviço</Label>
              <Textarea
                placeholder="Ex:
Entrega grátis para toda a cidade
Garantia de 1 ano
Atendimento 24 horas
Parcelamento em até 12x sem juros"
                value={customDifferentials}
                onChange={(e) => setCustomDifferentials(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">Um diferencial por linha. O agente mencionará esses pontos naturalmente</p>
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
              <Label className="flex items-center gap-1">Como iniciar após o lead responder? <span className="text-destructive">*</span></Label>
              <RadioGroup value={openingStyle} onValueChange={setOpeningStyle} className="space-y-2">
                <RadioOption value="thank" label="Agradecer a resposta" description="Cria conexão positiva" selected={openingStyle === 'thank'} onSelect={() => setOpeningStyle('thank')} />
                <RadioOption value="confirm" label="Confirmar interesse" description="Pergunta se pode explicar" selected={openingStyle === 'confirm'} onSelect={() => setOpeningStyle('confirm')} />
                <RadioOption value="question" label="Pergunta aberta" description="Entender o contexto" selected={openingStyle === 'question'} onSelect={() => setOpeningStyle('question')} />
                <RadioOption value="contextualize" label="Contextualizar" description="Explicar o motivo do contato" selected={openingStyle === 'contextualize'} onSelect={() => setOpeningStyle('contextualize')} />
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">Primeira missão do agente <span className="text-destructive">*</span></Label>
              <RadioGroup value={firstMission} onValueChange={setFirstMission} className="space-y-2">
                <RadioOption value="connection" label="Criar conexão" description="Rapport e confiança" selected={firstMission === 'connection'} onSelect={() => setFirstMission('connection')} />
                <RadioOption value="understand" label="Entender cenário" description="Descobrir dores e necessidades" selected={firstMission === 'understand'} onSelect={() => setFirstMission('understand')} />
                <RadioOption value="value" label="Mostrar valor" description="Antes de qualquer venda" selected={firstMission === 'value'} onSelect={() => setFirstMission('value')} />
              </RadioGroup>
            </div>
          </div>
        );

      case 'diagnosis':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">O que o agente precisa descobrir? <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="Ex:
Qual o problema que o cliente quer resolver
Se já comprou algo parecido antes
Qual o orçamento disponível
Quando pretende tomar a decisão
Se é ele quem decide a compra"
                value={infoToDiscover}
                onChange={(e) => setInfoToDiscover(e.target.value)}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">Uma informação por linha. O agente fará perguntas para descobrir esses pontos</p>
            </div>

            <div className="space-y-2">
              <Label>Quantas perguntas no máximo?</Label>
              <Select value={maxQuestions} onValueChange={setMaxQuestions}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 pergunta</SelectItem>
                  <SelectItem value="2">2 perguntas</SelectItem>
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
                <RadioOption value="educating" label="Educando" description="Explica problema e solução" selected={presentationStyle === 'educating'} onSelect={() => setPresentationStyle('educating')} />
                <RadioOption value="comparing" label="Comparando" description="Cenário atual vs. com solução" selected={presentationStyle === 'comparing'} onSelect={() => setPresentationStyle('comparing')} />
                <RadioOption value="risk" label="Mostrando risco" description="Consequências de não agir" selected={presentationStyle === 'risk'} onSelect={() => setPresentationStyle('risk')} />
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">Quais diferenciais devem aparecer? <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="Ex:
Frete grátis acima de R$ 100
Troca sem burocracia em até 30 dias
Atendimento humanizado e rápido
Produtos originais com nota fiscal
Desconto especial para primeira compra"
                value={differentials}
                onChange={(e) => setDifferentials(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">Um diferencial por linha. O agente mencionará naturalmente na conversa</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">Política de preço <span className="text-destructive">*</span></Label>
              <RadioGroup value={pricePolicy} onValueChange={setPricePolicy} className="space-y-2">
                <RadioOption value="never" label="Nunca falar preço" description="Sempre direciona para call" selected={pricePolicy === 'never'} onSelect={() => setPricePolicy('never')} />
                <RadioOption value="if_asked" label="Só se perguntarem" description="Responde quando questionado" selected={pricePolicy === 'if_asked'} onSelect={() => setPricePolicy('if_asked')} />
                <RadioOption value="with_context" label="Com contexto" description="Mostra valor antes do preço" selected={pricePolicy === 'with_context'} onSelect={() => setPricePolicy('with_context')} />
              </RadioGroup>
            </div>

            {(pricePolicy === 'if_asked' || pricePolicy === 'with_context') && wantToTalkPrice && (
              <div className="space-y-2">
                <Label>Como falar do preço?</Label>
                <Textarea
                  placeholder="Ex: Primeiro destaco os benefícios principais, depois menciono que o investimento é de R$ X por mês, com garantia de 30 dias"
                  value={howToTalkPrice}
                  onChange={(e) => setHowToTalkPrice(e.target.value)}
                  rows={2}
                />
                {!productPrice && (
                  <p className="text-xs text-yellow-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Você não informou o preço na etapa "Produto"
                  </p>
                )}
              </div>
            )}
          </div>
        );

      case 'objections':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">Objeções comuns <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="Ex:
É muito caro pra mim
Preciso pensar antes de decidir
Vou ver em outras lojas primeiro
Não sei se vai funcionar pra mim
Não é o momento agora
Preciso falar com meu marido/esposa"
                value={commonObjections}
                onChange={(e) => setCommonObjections(e.target.value)}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">Uma objeção por linha. O agente saberá como responder cada uma</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">Postura diante de objeções <span className="text-destructive">*</span></Label>
              <RadioGroup value={objectionPosture} onValueChange={setObjectionPosture} className="space-y-2">
                <RadioOption value="validate" label="Validar" description="Reconhece a preocupação" selected={objectionPosture === 'validate'} onSelect={() => setObjectionPosture('validate')} />
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

      case 'links':
        return (
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                💡 Opcional: Configure links, imagens e PDFs que o agente pode enviar. A IA decide automaticamente o momento certo de enviar cada um com base no contexto da conversa.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Link de agendamento</Label>
              <Input
                placeholder="Ex: https://calendly.com/sua-empresa/30min"
                value={schedulingLink}
                onChange={(e) => setSchedulingLink(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Link de demonstração/material</Label>
              <Input
                placeholder="Ex: https://seusite.com/demo"
                value={demoLink}
                onChange={(e) => setDemoLink(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Link do site</Label>
              <Input
                placeholder="Ex: https://seusite.com"
                value={websiteLink}
                onChange={(e) => setWebsiteLink(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Link de checkout/pagamento</Label>
              <Input
                placeholder="Ex: https://checkout.seusite.com/produto"
                value={checkoutLink}
                onChange={(e) => setCheckoutLink(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Link de grupo WhatsApp</Label>
              <Input
                placeholder="Ex: https://chat.whatsapp.com/abc123"
                value={whatsappGroupLink}
                onChange={(e) => setWhatsappGroupLink(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Links personalizados (opcional)</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addCustomLink}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                </Button>
              </div>
              {customLinks.map((link, index) => (
                <div key={index} className="space-y-2 p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Link {index + 1}</span>
                    <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeCustomLink(index)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Nome (ex: Proposta)"
                      value={link.name}
                      onChange={(e) => updateCustomLink(index, 'name', e.target.value)}
                    />
                    <Input
                      placeholder="URL"
                      value={link.url}
                      onChange={(e) => updateCustomLink(index, 'url', e.target.value)}
                    />
                  </div>
                  <Input
                    placeholder="Quando usar? (ex: Quando o lead pedir proposta formal)"
                    value={link.when}
                    onChange={(e) => updateCustomLink(index, 'when', e.target.value)}
                  />
                </div>
              ))}
            </div>

            {/* Media Files Section */}
            <div className="border-t pt-4 space-y-3">
              <div>
                <Label className="flex items-center gap-1.5">
                  📎 Imagens e PDFs
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Arraste e solte ou clique para enviar arquivos que o agente pode enviar. A IA decide quando enviar com base no treinamento.
                </p>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDraggingMedia(true); }}
                onDragLeave={() => setIsDraggingMedia(false)}
                onDrop={handleMediaDrop}
                onClick={() => document.getElementById('media-file-input')?.click()}
                className={`p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
                  isDraggingMedia 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                }`}
              >
                <input
                  id="media-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                  multiple
                  onChange={handleMediaFileInput}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-1.5">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {isDraggingMedia ? 'Solte os arquivos aqui' : 'Arraste arquivos ou clique para selecionar'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, WebP, GIF ou PDF • Máx. 10MB por arquivo
                  </p>
                </div>
              </div>

              {/* Uploaded files list */}
              {mediaFiles.map((media, index) => (
                <div key={index} className="space-y-2 p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      {media.uploading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : media.type === 'image' ? '🖼️' : '📄'}
                      {media.fileName || `Arquivo ${index + 1}`}
                    </span>
                    <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeMediaFile(index)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {media.uploading ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Enviando...
                    </div>
                  ) : (
                    <>
                      {media.type === 'image' && media.url && (
                        <img src={media.url} alt={media.name} className="h-16 w-auto rounded-md object-cover" />
                      )}
                      <Input
                        placeholder="Nome descritivo (ex: Catálogo de Produtos)"
                        value={media.name}
                        onChange={(e) => updateMediaFile(index, 'name', e.target.value)}
                      />
                      <Input
                        placeholder="Quando enviar? (ex: Quando o lead pedir catálogo ou tabela de preços)"
                        value={media.when}
                        onChange={(e) => updateMediaFile(index, 'when', e.target.value)}
                      />
                    </>
                  )}
                </div>
              ))}

              {mediaFiles.length > 0 && (
                <div className="p-2.5 bg-primary/5 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    💡 <strong>Como funciona:</strong> A IA analisa a conversa e decide automaticamente quando é o melhor momento para enviar cada arquivo. 
                    Por exemplo: se o lead pedir um catálogo, a IA envia a imagem/PDF configurado. Se o lead perguntar preço, a IA pode enviar a tabela de preços em PDF.
                  </p>
                </div>
              )}
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
                <CheckboxOption label="Enviar imagens e PDFs" checked={canSendMedia} onCheckedChange={(c) => setCanSendMedia(!!c)} />
                <CheckboxOption label="Enviar mensagens longas" checked={canSendLongMessages} onCheckedChange={(c) => setCanSendLongMessages(!!c)} />
                <CheckboxOption label="Sempre esperar resposta" checked={alwaysWaitResponse} onCheckedChange={(c) => setAlwaysWaitResponse(!!c)} />
                <CheckboxOption label="Responder em grupos" checked={respondToGroups} onCheckedChange={(c) => setRespondToGroups(!!c)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Tamanho por mensagem
                  <span className="relative group inline-block">
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-popover border rounded-lg shadow-lg text-xs text-muted-foreground opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                      <span className="font-medium text-foreground block mb-1">Quebra inteligente</span>
                      <span className="block">O agente gera a resposta completa e o sistema quebra automaticamente em mensagens separadas no WhatsApp.</span>
                      <span className="block mt-1">Ex: "Bom dia!" em uma mensagem, a resposta em outra e a pergunta em outra.</span>
                      <span className="block mt-1 text-primary">💡 Simula digitação humana com pausas entre as mensagens.</span>
                    </span>
                  </span>
                </Label>
                <Select value={maxChars} onValueChange={setMaxChars}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="150">Curta (150 chars)</SelectItem>
                    <SelectItem value="300">Média (300 chars)</SelectItem>
                    <SelectItem value="500">Longa (500 chars)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Limite por mensagem individual. Respostas longas são divididas automaticamente.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Máx. msgs seguidas</Label>
                <Select value={maxConsecutiveMessages} onValueChange={setMaxConsecutiveMessages}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 mensagens</SelectItem>
                    <SelectItem value="3">3 mensagens</SelectItem>
                    <SelectItem value="4">4 mensagens</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Rodadas de conversa por lead
                <span className="relative group inline-block">
                  <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-popover border rounded-lg shadow-lg text-xs text-muted-foreground opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    <span className="font-medium text-foreground block mb-1">O que são "rodadas"?</span>
                    <span className="block">Cada vez que o agente responde a uma mensagem do lead, conta como 1 rodada.</span>
                    <span className="block mt-1">Ao atingir o limite, o agente pausa. <strong>Se o lead enviar nova mensagem depois, a conversa reabre automaticamente</strong> com mais rodadas.</span>
                    <span className="block mt-1 text-primary">💡 Evita loops infinitos sem bloquear leads interessados.</span>
                  </span>
                </span>
              </Label>
              <Select 
                value={maxReplies === null ? 'unlimited' : String(maxReplies)} 
                onValueChange={(v) => setMaxReplies(v === 'unlimited' ? null : parseInt(v))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 rodada</SelectItem>
                  <SelectItem value="2">2 rodadas</SelectItem>
                  <SelectItem value="3">3 rodadas</SelectItem>
                  <SelectItem value="5">5 rodadas</SelectItem>
                  <SelectItem value="10">10 rodadas</SelectItem>
                  <SelectItem value="unlimited">Ilimitado</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Após atingir o limite, a conversa pausa. Se o lead enviar nova mensagem, a conversa reabre automaticamente.
              </p>
            </div>


            <div className="space-y-2">
              <Label>Horário de operação</Label>
              <div className="flex items-center gap-2 mb-2">
                <Checkbox 
                  id="is24h" 
                  checked={operatingHoursStart === "00:00" && operatingHoursEnd === "23:59"} 
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setOperatingHoursStart("00:00");
                      setOperatingHoursEnd("23:59");
                    } else {
                      setOperatingHoursStart("08:00");
                      setOperatingHoursEnd("18:00");
                    }
                  }}
                />
                <Label htmlFor="is24h" className="text-sm font-normal cursor-pointer">Funcionar 24 horas</Label>
              </div>
              {!(operatingHoursStart === "00:00" && operatingHoursEnd === "23:59") && (
                <div className="grid grid-cols-2 gap-2">
                  <Input type="time" value={operatingHoursStart} onChange={(e) => setOperatingHoursStart(e.target.value)} />
                  <Input type="time" value={operatingHoursEnd} onChange={(e) => setOperatingHoursEnd(e.target.value)} />
                </div>
              )}
            </div>

            {/* CRM Stage Configuration */}
            <div className="space-y-4 border-t pt-5">
              <div className="space-y-1">
                <Label className="flex items-center gap-1.5 text-sm font-semibold">
                  <Target className="w-4 h-4" />
                  Integração com CRM
                </Label>
                <p className="text-xs text-muted-foreground">Escolha para quais colunas do funil o lead será movido automaticamente</p>
              </div>
              {pipelineStages.length === 0 ? (
                <p className="text-xs text-yellow-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Nenhuma coluna no CRM. Crie colunas no CRM para configurar a integração.
                </p>
              ) : (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Quando lead responde</Label>
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

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Quando agente responde</Label>
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

                  <div className="space-y-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      Quando objetivo é atingido <span className="text-emerald-400">✅</span>
                    </Label>
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
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                      Quando o agente atingir o objetivo da conversa, o lead será movido para esta coluna e <span className="text-emerald-400 font-medium">o agente não responderá mais</span>.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      Quando lead é perdido <span className="text-red-400">✕</span>
                    </Label>
                    <select
                      value={crmStageOnLost}
                      onChange={(e) => setCrmStageOnLost(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      <option value="">Nenhuma (manter na coluna atual)</option>
                      {pipelineStages.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                      Quando o lead disser que não tem interesse, o agente moverá para esta coluna automaticamente.
                    </p>
                  </div>

                  <div className="space-y-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      Coluna de atendimento humano <span className="text-destructive">*</span>
                    </Label>
                    <select
                      value={crmStageOnUnknown}
                      onChange={(e) => setCrmStageOnUnknown(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      <option value="">Selecione uma coluna</option>
                      {pipelineStages.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                      O agente moverá leads para esta coluna quando não souber responder, e <span className="text-amber-400 font-medium">não responderá leads que já estão nela</span>. Você também pode mover leads manualmente para cá para pausar o agente.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'review':
        const selectedNumber = numbers.find(n => n.id === selectedNumberId);
        const warmingStatus = selectedNumber?.warming_status || 'cold';
        const warmingLabel = warmingStatus === 'hot' ? 'Aquecido 🟢' : warmingStatus === 'warm' ? 'Morno 🟡' : 'Frio 🔴';
        const leadsLimit = warmingStatus === 'hot' ? 'Ilimitado' : warmingStatus === 'warm' ? '100 leads' : '20 leads';
        const showWarmingAlert = warmingStatus !== 'hot';
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">Confira antes de criar</p>

            {/* Warming Alert */}
            {showWarmingAlert && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <p className="font-medium text-amber-500 mb-1">
                      Seu chip está {warmingStatus === 'warm' ? 'morno' : 'frio'} — limite de {leadsLimit}
                    </p>
                    <p className="text-muted-foreground">
                      Continue o aquecimento para desbloquear leads ilimitados. Quando seu número estiver aquecido (🟢), o agente poderá responder sem limite de leads.
                    </p>
                  </div>
                </div>
              </div>
            )}

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
              {wantToTalkPrice && productPrice && (
                <div className="flex justify-between p-2 bg-muted/50 rounded-lg">
                  <span className="text-muted-foreground">Preço</span>
                  <span className="font-medium">R$ {productPrice}</span>
                </div>
              )}
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
                <span className="text-muted-foreground">Preço visível</span>
                <span className="font-medium">
                  {pricePolicy === 'never' && 'Nunca'}
                  {pricePolicy === 'if_asked' && 'Se perguntarem'}
                  {pricePolicy === 'with_context' && 'Com contexto'}
                </span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Links configurados</span>
                <span className="font-medium">
                  {[schedulingLink, demoLink, websiteLink, checkoutLink, whatsappGroupLink].filter(Boolean).length + customLinks.filter(l => l.url).length}
                </span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Imagens/PDFs configurados</span>
                <span className="font-medium">
                  {mediaFiles.filter(m => m.url).length}
                </span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground flex items-center gap-1">
                  Limite de leads
                  <button
                    type="button"
                    onClick={() => setShowLeadsLimitInfo(true)}
                    className="text-primary hover:text-primary/80 transition-colors"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </span>
                <span className="font-medium flex items-center gap-1.5">
                  <span className={warmingStatus === 'hot' ? 'text-green-500' : warmingStatus === 'warm' ? 'text-yellow-500' : 'text-red-500'}>
                    {warmingLabel}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  {leadsLimit}
                </span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Rodadas por lead</span>
                <span className="font-medium">{maxReplies === null ? "Ilimitado" : `${maxReplies} (reabre se lead mandar msg)`}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Horário</span>
                <span className="font-medium">
                  {operatingHoursStart === "00:00" && operatingHoursEnd === "23:59" 
                    ? "24 horas" 
                    : `${operatingHoursStart} - ${operatingHoursEnd}`}
                </span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(value) => { if (!loading) { onOpenChange(value); if (!value) resetForm(); } }}>
      <DialogContent className="max-w-lg h-[90vh] h-[90dvh] max-h-[90vh] max-h-[90dvh] overflow-hidden flex flex-col min-h-0 p-0 gap-0 w-[95vw] sm:w-full">
        <DialogHeader className="p-3 sm:p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            {isEditing ? 'Editar Agente de IA' : 'Criar Agente de IA'}
          </DialogTitle>
          <DialogDescription className="text-[10px] sm:text-xs">
            Etapa {currentStep + 1} de {STEPS.length}: {STEPS[currentStep].title}
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="px-3 sm:px-4 pt-2">
          <div className="flex gap-0.5 sm:gap-1">
            {STEPS.map((_, index) => (
              <div
                key={index}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  index <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4 sm:px-5 py-4 sm:py-5">
            {renderStep()}
          </div>
        </ScrollArea>

        <div className="p-3 sm:p-4 pt-2 border-t flex justify-between gap-2">
          {currentStep > 0 ? (
            <Button variant="ghost" onClick={handlePrevStep} disabled={loading} size="sm" className="h-8 sm:h-9">
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> 
              <span className="hidden xs:inline">Voltar</span>
            </Button>
          ) : (
            <div />
          )}

          {currentStep < STEPS.length - 1 ? (
            <Button onClick={handleNextStep} disabled={!canProceed()} size="sm" className="h-8 sm:h-9">
              <span className="hidden xs:inline">Próximo</span>
              <span className="xs:hidden">Avançar</span>
              <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
            </Button>
          ) : isEditing ? (
            <Button onClick={() => handleCreate(false)} disabled={loading} size="sm" className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3">
              {loading ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : (
                <>
                  <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </Button>
          ) : (
            <div className="flex gap-1.5 sm:gap-2">
              <Button variant="outline" onClick={() => handleCreate(false)} disabled={loading} size="sm" className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3">
                {loading ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : (
                  <>
                    <span className="hidden sm:inline">Salvar Rascunho</span>
                    <span className="sm:hidden">Rascunho</span>
                  </>
                )}
              </Button>
              <Button onClick={() => handleCreate(true)} disabled={loading} size="sm" className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3">
                {loading ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : (
                  <>
                    <span className="hidden sm:inline">Criar e Ativar</span>
                    <span className="sm:hidden">Ativar</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

      {/* Leads Limit Info Dialog */}
      <Dialog open={showLeadsLimitInfo} onOpenChange={setShowLeadsLimitInfo}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4 text-primary" />
              Limite progressivo de leads
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Para proteger a saúde do seu número, o sistema limita a quantidade de leads que o agente pode responder de acordo com o nível de aquecimento:
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-red-500/10">
                <span className="flex items-center gap-2">🔴 Frio</span>
                <span className="font-medium">20 leads</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-yellow-500/10">
                <span className="flex items-center gap-2">🟡 Morno</span>
                <span className="font-medium">100 leads</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10">
                <span className="flex items-center gap-2">🟢 Aquecido</span>
                <span className="font-medium">Ilimitado ∞</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Esse sistema existe como uma ferramenta de proteção para ajudar a evitar bloqueios e preservar a reputação do seu número. Quanto mais aquecido o chip, mais seguro é enviar mensagens em maior volume.
            </p>
            <Button variant="outline" className="w-full" size="sm" onClick={() => setShowLeadsLimitInfo(false)}>
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
