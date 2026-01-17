import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Bot,
  Settings,
  MessageSquare,
  BarChart3,
  Clock,
  Target,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Save,
  Pencil
} from "lucide-react";

interface AgentDetailsDialogProps {
  agent: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

interface Conversation {
  id: string;
  lead_phone: string;
  lead_name: string | null;
  status: string;
  initial_message_sent_at: string | null;
  response_received: boolean;
  reply_sent: boolean;
  created_at: string;
}

export function AgentDetailsDialog({ agent, open, onOpenChange, onUpdate }: AgentDetailsDialogProps) {
  const { toast } = useToast();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Editable fields
  const [systemPrompt, setSystemPrompt] = useState(agent?.system_prompt || "");
  const [maxReplies, setMaxReplies] = useState(agent?.max_replies || 1);
  const [maxResponseChars, setMaxResponseChars] = useState(agent?.max_response_chars || 300);
  const [dailyLimit, setDailyLimit] = useState(agent?.daily_limit || 50);
  const [operatingHoursStart, setOperatingHoursStart] = useState(agent?.operating_hours_start?.slice(0, 5) || "08:00");
  const [operatingHoursEnd, setOperatingHoursEnd] = useState(agent?.operating_hours_end?.slice(0, 5) || "18:00");

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

    if (open && agent) {
      fetchConversations();
      // Reset form values when agent changes
      setSystemPrompt(agent.system_prompt || "");
      setMaxReplies(agent.max_replies || 1);
      setMaxResponseChars(agent.max_response_chars || 300);
      setDailyLimit(agent.daily_limit || 50);
      setOperatingHoursStart(agent.operating_hours_start?.slice(0, 5) || "08:00");
      setOperatingHoursEnd(agent.operating_hours_end?.slice(0, 5) || "18:00");
    }
  }, [agent, open]);

  const saveSettings = async () => {
    if (!agent?.id) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('ai_agents')
        .update({
          system_prompt: systemPrompt,
          max_replies: maxReplies,
          max_response_chars: maxResponseChars,
          daily_limit: dailyLimit,
          operating_hours_start: operatingHoursStart,
          operating_hours_end: operatingHoursEnd,
        })
        .eq('id', agent.id);

      if (error) throw error;

      toast({
        title: "Configurações salvas",
        description: "As configurações do agente foram atualizadas com sucesso.",
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'responded':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'awaiting_response':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'ignored':
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'responded': return 'Respondido';
      case 'awaiting_response': return 'Aguardando';
      case 'ignored': return 'Ignorado';
      default: return 'Pendente';
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            {agent.name}
          </DialogTitle>
          <DialogDescription>
            Gerencie configurações, visualize conversas e métricas do agente
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="conversations" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Conversas
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Pencil className="h-4 w-4" />
              Editar Bot
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{agent.messages_sent_today}</p>
                  <p className="text-xs text-muted-foreground">Enviadas hoje</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{agent.daily_limit}</p>
                  <p className="text-xs text-muted-foreground">Limite diário</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{responsesReceived}</p>
                  <p className="text-xs text-muted-foreground">Respostas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{responseRate}%</p>
                  <p className="text-xs text-muted-foreground">Taxa resposta</p>
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
                  <span>{agent.objective === 'prospecting' ? 'Prospecção' : agent.objective === 'warming' ? 'Aquecimento' : 'Primeiro Contato'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estilo</span>
                  <span className="capitalize">{agent.communication_style}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Horário</span>
                  <span>{agent.operating_hours_start?.slice(0, 5)} - {agent.operating_hours_end?.slice(0, 5)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Limite de respostas</span>
                  <span>{agent.max_replies || 1} por lead</span>
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
                      <li>• Responde até {agent.max_replies || 1} vez(es) por lead</li>
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
              {loadingConversations ? (
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
                    <Card key={conv.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(conv.status)}
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
                        <Badge variant="outline" className="text-xs">
                          {getStatusLabel(conv.status)}
                        </Badge>
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
                {/* System Prompt */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      Prompt do Sistema (Personalidade do Bot)
                    </CardTitle>
                    <CardDescription>
                      Defina como o bot deve se comportar e responder
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
                        <Label>Limite de respostas por lead</Label>
                        <span className="text-sm text-muted-foreground">{maxReplies} resposta(s)</span>
                      </div>
                      <Slider
                        value={[maxReplies]}
                        onValueChange={(v) => setMaxReplies(v[0])}
                        min={1}
                        max={10}
                        step={1}
                      />
                      <p className="text-xs text-muted-foreground">
                        Quantas vezes o bot pode responder ao mesmo lead antes de parar
                      </p>
                    </div>

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

                {/* Operating Hours */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Horário de Funcionamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                    <p className="text-xs text-muted-foreground">
                      O bot só responde dentro deste horário (horário de Brasília)
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
