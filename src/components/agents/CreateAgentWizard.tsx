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
  Target,
  Users,
  MessageCircle,
  Clock,
  Flame,
  Loader2,
  AlertTriangle,
  Plus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

import { Reply } from "lucide-react";

const STEPS = [
  { id: 1, title: "Nome", icon: Bot },
  { id: 2, title: "Número", icon: MessageCircle },
  { id: 3, title: "Objetivo", icon: Target },
  { id: 4, title: "Público", icon: Users },
  { id: 5, title: "Prompt", icon: Bot },
  { id: 6, title: "Objetivo IA", icon: Target },
  { id: 7, title: "Pós-Resposta", icon: Reply },
  { id: 8, title: "Encerramento", icon: Check },
  { id: 9, title: "Estilo", icon: MessageCircle },
  { id: 10, title: "Horário", icon: Clock },
  { id: 11, title: "Aquecimento", icon: Flame },
  { id: 12, title: "Confirmação", icon: Check },
];

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
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [loadingNumbers, setLoadingNumbers] = useState(true);

  // Form state
  const [name, setName] = useState("");
  const [selectedNumberId, setSelectedNumberId] = useState("");
  const [objective, setObjective] = useState<"prospecting" | "warming" | "first_contact">("prospecting");
  const [targetAudience, setTargetAudience] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [agentObjective, setAgentObjective] = useState("");
  const [endConversationCriteria, setEndConversationCriteria] = useState("");
  const [postResponseBehavior, setPostResponseBehavior] = useState("");
  const [communicationStyle, setCommunicationStyle] = useState<"formal" | "neutral" | "informal">("neutral");
  const [operatingHoursStart, setOperatingHoursStart] = useState("08:00");
  const [operatingHoursEnd, setOperatingHoursEnd] = useState("18:00");
  const [isWarmed, setIsWarmed] = useState(false);
  const [maxReplies, setMaxReplies] = useState<number | null>(null); // null = unlimited

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
    setStep(1);
    setName("");
    setSelectedNumberId("");
    setObjective("prospecting");
    setTargetAudience("");
    setSystemPrompt("");
    setAgentObjective("");
    setEndConversationCriteria("");
    setPostResponseBehavior("");
    setCommunicationStyle("neutral");
    setOperatingHoursStart("08:00");
    setOperatingHoursEnd("18:00");
    setIsWarmed(false);
    setMaxReplies(null);
  };

  const handleCreate = async (activate: boolean) => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('ai_agents')
        .insert({
          user_id: user.id,
          name,
          whatsapp_number_id: selectedNumberId,
          objective,
          target_audience: targetAudience,
          system_prompt: systemPrompt,
          agent_objective: agentObjective,
          end_conversation_criteria: endConversationCriteria,
          post_response_behavior: postResponseBehavior,
          communication_style: communicationStyle,
          operating_hours_start: operatingHoursStart,
          operating_hours_end: operatingHoursEnd,
          is_warmed: isWarmed,
          max_replies: maxReplies,
          status: activate ? 'active' : 'draft',
          message_templates: MESSAGE_TEMPLATES[objective],
          max_response_chars: 300,
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

  const canProceed = () => {
    switch (step) {
      case 1: return name.trim().length >= 3;
      case 2: return !!selectedNumberId;
      case 3: return !!objective;
      case 4: return targetAudience.trim().length >= 3;
      case 5: return systemPrompt.trim().length >= 10;
      case 6: return agentObjective.trim().length >= 5;
      case 7: return postResponseBehavior.trim().length >= 10;
      case 8: return endConversationCriteria.trim().length >= 5;
      case 9: return !!communicationStyle;
      case 10: return !!operatingHoursStart && !!operatingHoursEnd;
      case 11: return true;
      default: return true;
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
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

      case 2:
        // If only one number, show confirmation instead of selection
        if (numbers.length === 1) {
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
                  Desative um agente existente para criar um novo.
                </p>
              </div>
            ) : (
              <RadioGroup value={selectedNumberId} onValueChange={setSelectedNumberId}>
                <div className="space-y-2">
                  {numbers.map((num) => (
                    <Label
                      key={num.id}
                      htmlFor={num.id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                        num.has_active_agent 
                          ? 'cursor-not-allowed opacity-50 border-border' 
                          : selectedNumberId === num.id 
                            ? 'border-primary bg-primary/5 cursor-pointer' 
                            : 'border-border hover:border-primary/50 cursor-pointer'
                      }`}
                      onClick={(e) => {
                        if (num.has_active_agent) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem 
                          value={num.id} 
                          id={num.id} 
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

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <Target className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-xl font-semibold">Qual o objetivo deste agente?</h3>
            </div>
            
            <RadioGroup value={objective} onValueChange={(v) => setObjective(v as any)}>
              <div className="space-y-2">
                <Label
                  htmlFor="prospecting"
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    objective === 'prospecting' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="prospecting" id="prospecting" className="mt-1" />
                  <div>
                    <p className="font-medium">Prospecção</p>
                    <p className="text-sm text-muted-foreground">
                      Enviar mensagens iniciais para novos leads e responder uma vez
                    </p>
                  </div>
                </Label>

                <Label
                  htmlFor="warming"
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    objective === 'warming' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="warming" id="warming" className="mt-1" />
                  <div>
                    <p className="font-medium">Aquecimento de Número</p>
                    <p className="text-sm text-muted-foreground">
                      Enviar mensagens neutras para aquecer o chip gradualmente
                    </p>
                  </div>
                </Label>

                <Label
                  htmlFor="first_contact"
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    objective === 'first_contact' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="first_contact" id="first_contact" className="mt-1" />
                  <div>
                    <p className="font-medium">Primeiro Contato</p>
                    <p className="text-sm text-muted-foreground">
                      Iniciar conversa com leads já qualificados
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <Users className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-xl font-semibold">Com quem esse agente vai falar?</h3>
              <p className="text-muted-foreground text-sm">
                Descreva brevemente seu público-alvo
              </p>
            </div>
            <Textarea
              placeholder="Ex: Donos de imobiliárias na região Sul, interessados em marketing digital"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              rows={3}
            />
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <Bot className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-xl font-semibold">Qual o prompt do agente?</h3>
              <p className="text-muted-foreground text-sm">
                Descreva como o agente deve se comportar e responder
              </p>
            </div>
            <Textarea
              placeholder="Ex: Você é um assistente de vendas amigável. Responda de forma breve e objetiva, sem fazer perguntas desnecessárias. Foque em entender se o lead tem interesse no produto."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Este prompt será usado pela IA para gerar respostas. Seja específico sobre o tom e comportamento desejado.
            </p>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <Target className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-xl font-semibold">Qual o objetivo da IA?</h3>
              <p className="text-muted-foreground text-sm">
                O que a IA deve tentar alcançar em cada conversa?
              </p>
            </div>
            <Textarea
              placeholder="Ex: Identificar se o lead tem interesse em nossos serviços e agendar uma demonstração"
              value={agentObjective}
              onChange={(e) => setAgentObjective(e.target.value)}
              rows={3}
            />
          </div>
        );

      case 7:
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <Reply className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-xl font-semibold">O que fazer quando o lead responder?</h3>
              <p className="text-muted-foreground text-sm">
                Defina como o agente deve agir após receber uma resposta de campanha
              </p>
            </div>
            <Textarea
              placeholder={`Ex: Quando o lead responder com "oi", "bom dia" ou qualquer saudação, NÃO cumprimente de volta. Vá direto ao ponto apresentando nosso serviço:

"Que bom que respondeu! Aqui é da [empresa], temos uma solução que pode ajudar seu negócio a [benefício]. Posso te mostrar como funciona?"

Se o lead perguntar preço, apresente as opções e tente agendar uma demonstração.`}
              value={postResponseBehavior}
              onChange={(e) => setPostResponseBehavior(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Importante: Leads de campanha geralmente respondem com saudações simples. Configure aqui para o agente já entrar vendendo!
            </p>
          </div>
        );

      case 8:
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <Check className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-xl font-semibold">Quando encerrar a conversa?</h3>
              <p className="text-muted-foreground text-sm">
                Defina os critérios para o agente encerrar a conversa
              </p>
            </div>
            <Textarea
              placeholder="Ex: Após conseguir o contato do decisor, ou quando o lead demonstrar desinteresse, ou após responder a dúvida principal"
              value={endConversationCriteria}
              onChange={(e) => setEndConversationCriteria(e.target.value)}
              rows={3}
            />
          </div>
        );

      case 9:
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <MessageCircle className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-xl font-semibold">Como esse agente deve falar?</h3>
            </div>
            
            <RadioGroup value={communicationStyle} onValueChange={(v) => setCommunicationStyle(v as any)}>
              <div className="space-y-2">
                <Label
                  htmlFor="formal"
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    communicationStyle === 'formal' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="formal" id="formal" className="mt-1" />
                  <div>
                    <p className="font-medium">Formal</p>
                    <p className="text-sm text-muted-foreground">
                      "Prezado Sr. João, espero que esteja bem..."
                    </p>
                  </div>
                </Label>

                <Label
                  htmlFor="neutral"
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    communicationStyle === 'neutral' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="neutral" id="neutral" className="mt-1" />
                  <div>
                    <p className="font-medium">Neutro</p>
                    <p className="text-sm text-muted-foreground">
                      "Olá João, tudo bem? Vi seu trabalho e achei interessante."
                    </p>
                  </div>
                </Label>

                <Label
                  htmlFor="informal"
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    communicationStyle === 'informal' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="informal" id="informal" className="mt-1" />
                  <div>
                    <p className="font-medium">Informal</p>
                    <p className="text-sm text-muted-foreground">
                      "E aí João! Beleza? Vi que você manja de..."
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 10:
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <Clock className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-xl font-semibold">Em quais horários o agente pode operar?</h3>
              <p className="text-muted-foreground text-sm">
                Defina a janela de operação (recomendado: horário comercial)
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
            
            <div className="space-y-2 pt-4 border-t">
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
                  <SelectItem value="1">1 resposta (padrão)</SelectItem>
                  <SelectItem value="2">2 respostas</SelectItem>
                  <SelectItem value="3">3 respostas</SelectItem>
                  <SelectItem value="5">5 respostas</SelectItem>
                  <SelectItem value="10">10 respostas</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Define quantas vezes o agente responde a cada lead antes de encerrar
              </p>
            </div>
          </div>
        );

      case 11:
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <Flame className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-xl font-semibold">Este número já está aquecido?</h3>
            </div>
            
            <RadioGroup value={isWarmed ? "yes" : "no"} onValueChange={(v) => setIsWarmed(v === "yes")}>
              <div className="space-y-2">
                <Label
                  htmlFor="warmed-yes"
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    isWarmed ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="yes" id="warmed-yes" className="mt-1" />
                  <div>
                    <p className="font-medium">Sim, está aquecido</p>
                    <p className="text-sm text-muted-foreground">
                      O número já tem histórico de uso e conversas naturais
                    </p>
                  </div>
                </Label>

                <Label
                  htmlFor="warmed-no"
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    !isWarmed ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="no" id="warmed-no" className="mt-1" />
                  <div>
                    <p className="font-medium">Não (ativar modo seguro)</p>
                    <p className="text-sm text-muted-foreground">
                      Delays maiores serão aplicados automaticamente
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 12:
        const selectedNumber = numbers.find(n => n.id === selectedNumberId);
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <Check className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-xl font-semibold">Confirme as configurações</h3>
            </div>
            
            <div className="space-y-2 text-sm max-h-[300px] overflow-y-auto">
              <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Nome</span>
                <span className="font-medium">{name}</span>
              </div>
              <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Número</span>
                <span className="font-medium">{selectedNumber?.name || selectedNumber?.phone_number}</span>
              </div>
              <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Objetivo</span>
                <span className="font-medium">
                  {objective === 'prospecting' ? 'Prospecção' : objective === 'warming' ? 'Aquecimento' : 'Primeiro Contato'}
                </span>
              </div>
              <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Estilo</span>
                <span className="font-medium capitalize">{communicationStyle}</span>
              </div>
              <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Horário</span>
                <span className="font-medium">{operatingHoursStart} - {operatingHoursEnd}</span>
              </div>
              <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Max caracteres</span>
                <span className="font-medium">300 caracteres</span>
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
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Criar Agente de IA
          </DialogTitle>
          <DialogDescription>
            Etapa {step} de {STEPS.length}: {STEPS[step - 1]?.title}
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <Progress value={(step / STEPS.length) * 100} className="h-1" />

        {/* Content */}
        <div className="py-4 min-h-[280px]">
          {renderStepContent()}
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-2">
          <Button
            variant="ghost"
            onClick={() => step > 1 ? setStep(step - 1) : onOpenChange(false)}
            disabled={loading}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {step === 1 ? "Cancelar" : "Voltar"}
          </Button>

          {step < STEPS.length ? (
            <Button
              onClick={() => setStep(step + 1)}
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
      </DialogContent>
    </Dialog>
  );
}
