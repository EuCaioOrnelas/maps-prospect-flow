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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  Settings,
  MessageSquare,
  BarChart3,
  Clock,
  Target,
  Loader2,
  Copy,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle
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
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState(agent?.n8n_webhook_url || "");
  const [saving, setSaving] = useState(false);

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
      setN8nWebhookUrl(agent.n8n_webhook_url || "");
    }
  }, [agent, open]);

  const saveWebhookUrl = async () => {
    if (!agent?.id) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('ai_agents')
        .update({ n8n_webhook_url: n8nWebhookUrl })
        .eq('id', agent.id);

      if (error) throw error;

      toast({
        title: "Webhook salvo",
        description: "A URL do webhook foi atualizada com sucesso.",
      });
      
      onUpdate();
    } catch (error) {
      console.error('Error saving webhook:', error);
      toast({
        title: "Erro ao salvar",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const copyWebhookUrl = () => {
    const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-webhook?agent_id=${agent?.id}`;
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: "URL copiada",
      description: "Cole esta URL no seu workflow do n8n.",
    });
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
              <Settings className="h-4 w-4" />
              Configuração
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
                      <li>• Responde apenas 1 vez por lead</li>
                      <li>• Delay aleatório de 30s a 3min</li>
                      <li>• Nunca responde fora do horário</li>
                      <li>• Encerra conversa após responder</li>
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
            {/* n8n Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Integração n8n
                </CardTitle>
                <CardDescription>
                  Configure a comunicação com seu workflow do n8n
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Webhook URL to receive from n8n */}
                <div className="space-y-2">
                  <Label>URL de Entrada (para configurar no n8n)</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-webhook?agent_id=${agent.id}`}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use esta URL no nó HTTP Request do n8n para enviar mensagens ao agente
                  </p>
                </div>

                {/* Webhook URL to send to n8n */}
                <div className="space-y-2">
                  <Label>URL de Saída (Webhook do n8n)</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={n8nWebhookUrl}
                      onChange={(e) => setN8nWebhookUrl(e.target.value)}
                      placeholder="https://seu-n8n.com/webhook/xxx"
                      className="font-mono text-xs"
                    />
                    <Button onClick={saveWebhookUrl} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O agente enviará eventos para esta URL quando receber mensagens
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* n8n Setup Guide */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Configuração do Workflow n8n</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p className="text-muted-foreground">
                  Configure seu workflow n8n com os seguintes nós:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li><strong>Webhook Trigger</strong> - Recebe mensagens do agente</li>
                  <li><strong>IF</strong> - Verifica se está dentro do horário permitido</li>
                  <li><strong>IF</strong> - Verifica se já respondeu este lead</li>
                  <li><strong>Wait</strong> - Delay aleatório (30s a 3min)</li>
                  <li><strong>HTTP Request</strong> - Gera resposta com IA (max 40 chars)</li>
                  <li><strong>HTTP Request</strong> - Envia resposta via Evolution API</li>
                  <li><strong>HTTP Request</strong> - Marca lead como respondido</li>
                </ol>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
