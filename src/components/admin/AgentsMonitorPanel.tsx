import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bot,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  MessageSquare,
  Clock,
  TrendingUp,
  DollarSign,
  Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AgentStats {
  id: string;
  name: string;
  status: string;
  user_email: string;
  messages_sent_today: number;
  daily_limit: number;
  total_conversations: number;
  total_responses: number;
  response_rate: number;
  last_activity: string | null;
  created_at: string;
}

type OpenAIStatusType = 'ok' | 'warning' | 'error' | 'unknown';

interface OpenAIStatus {
  status: OpenAIStatusType;
  message: string;
  lastCheck: Date | null;
  recentErrors: number;
  recentCalls: number;
  estimatedCost: number;
}

export function AgentsMonitorPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [agents, setAgents] = useState<AgentStats[]>([]);
  const [openAIStatus, setOpenAIStatus] = useState<OpenAIStatus>({
    status: 'unknown',
    message: 'Não verificado',
    lastCheck: null,
    recentErrors: 0,
    recentCalls: 0,
    estimatedCost: 0
  });

  const fetchAgentStats = useCallback(async () => {
    try {
      // Fetch all agents with their user info
      const { data: agentsData, error: agentsError } = await supabase
        .from('ai_agents')
        .select(`
          id,
          name,
          status,
          messages_sent_today,
          daily_limit,
          created_at,
          user_id
        `)
        .order('created_at', { ascending: false });

      if (agentsError) throw agentsError;

      // Fetch user emails
      const userIds = [...new Set(agentsData?.map(a => a.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

      // Fetch conversation stats for each agent
      const agentStats: AgentStats[] = await Promise.all(
        (agentsData || []).map(async (agent) => {
          const { data: conversations } = await supabase
            .from('agent_conversations')
            .select('id, response_received, created_at')
            .eq('agent_id', agent.id);

          const totalConversations = conversations?.length || 0;
          const totalResponses = conversations?.filter(c => c.response_received).length || 0;
          const responseRate = totalConversations > 0 
            ? Math.round((totalResponses / totalConversations) * 100) 
            : 0;

          // Get last activity
          const { data: lastMessage } = await supabase
            .from('agent_message_logs')
            .select('created_at')
            .eq('agent_id', agent.id)
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            id: agent.id,
            name: agent.name,
            status: agent.status,
            user_email: profileMap.get(agent.user_id) || 'Desconhecido',
            messages_sent_today: agent.messages_sent_today,
            daily_limit: agent.daily_limit,
            total_conversations: totalConversations,
            total_responses: totalResponses,
            response_rate: responseRate,
            last_activity: lastMessage?.[0]?.created_at || null,
            created_at: agent.created_at
          };
        })
      );

      setAgents(agentStats);
    } catch (error) {
      console.error('Error fetching agent stats:', error);
      toast({
        title: "Erro ao carregar agentes",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchOpenAIStatus = useCallback(async () => {
    try {
      // ============================================================
      // CUSTO REAL ESTIMADO POR CARACTERES (gpt-4o-mini)
      // ------------------------------------------------------------
      // Preços OpenAI gpt-4o-mini (referência abr/2025):
      //   - Input:  $0.150 / 1M tokens
      //   - Output: $0.600 / 1M tokens
      // Heurística texto português: 1 token ≈ 4 caracteres.
      //
      // direction = 'received'  → input do modelo (mensagem do lead)
      // direction = 'sent'      → output do modelo (resposta do agente)
      // ============================================================
      const PRICE_INPUT_PER_TOKEN  = 0.150 / 1_000_000; // USD
      const PRICE_OUTPUT_PER_TOKEN = 0.600 / 1_000_000; // USD
      const CHARS_PER_TOKEN = 4;

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: recentLogs, error } = await supabase
        .from('agent_message_logs')
        .select('id, direction, created_at, content')
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const sentLogs     = recentLogs?.filter(l => l.direction === 'sent')     || [];
      const receivedLogs = recentLogs?.filter(l => l.direction === 'received') || [];
      const totalCalls   = sentLogs.length;

      // Custo real: soma caracteres de entrada × preço input + saída × preço output.
      const inputChars  = receivedLogs.reduce((acc, l) => acc + (l.content?.length || 0), 0);
      const outputChars = sentLogs.reduce((acc, l) => acc + (l.content?.length || 0), 0);
      const inputTokens  = inputChars  / CHARS_PER_TOKEN;
      const outputTokens = outputChars / CHARS_PER_TOKEN;
      const estimatedCost = inputTokens * PRICE_INPUT_PER_TOKEN + outputTokens * PRICE_OUTPUT_PER_TOKEN;

      // Padrões de erro detectáveis no conteúdo das mensagens enviadas pelo agente.
      const errorPatterns = ['error', 'failed', 'timeout', 'rate limit', 'erro ao'];
      const errorLogs = sentLogs.filter(log =>
        log.content && errorPatterns.some(p => log.content.toLowerCase().includes(p))
      ).length;

      let status: OpenAIStatusType = 'ok';
      let message = 'Funcionando normalmente';

      if (errorLogs > 10) {
        status = 'error';
        message = `${errorLogs} erros nas últimas 24h`;
      } else if (errorLogs > 3) {
        status = 'warning';
        message = `${errorLogs} erros nas últimas 24h`;
      } else if (totalCalls === 0) {
        status = 'unknown';
        message = 'Nenhuma chamada nas últimas 24h';
      }

      setOpenAIStatus({
        status,
        message,
        lastCheck: new Date(),
        recentErrors: errorLogs,
        recentCalls: totalCalls,
        estimatedCost,
      });
    } catch (error) {
      console.error('Error checking OpenAI status:', error);
      setOpenAIStatus(prev => ({
        ...prev,
        status: 'error',
        message: 'Erro ao verificar status'
      }));
    }
  }, []);

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchAgentStats(), fetchOpenAIStatus()]);
    setRefreshing(false);
    toast({
      title: "Dados atualizados",
      description: "Informações dos agentes foram atualizadas.",
    });
  }, [fetchAgentStats, fetchOpenAIStatus, toast]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchAgentStats(), fetchOpenAIStatus()]);
      setLoading(false);
    };
    loadData();
  }, [fetchAgentStats, fetchOpenAIStatus]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getAgentStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400">Ativo</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-500/20 text-yellow-400">Pausado</Badge>;
      case 'error':
        return <Badge className="bg-red-500/20 text-red-400">Erro</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground">{status}</Badge>;
    }
  };

  // Calculate totals
  const totalAgents = agents.length;
  const activeAgents = agents.filter(a => a.status === 'active').length;
  const totalMessagesSent = agents.reduce((sum, a) => sum + a.messages_sent_today, 0);
  const avgResponseRate = agents.length > 0 
    ? Math.round(agents.reduce((sum, a) => sum + a.response_rate, 0) / agents.length) 
    : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Monitoramento de Agentes IA
          </h2>
          <p className="text-sm text-muted-foreground">
            Status da API GPT e controle de funcionamento dos agentes
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refreshData}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">Atualizar</span>
        </Button>
      </div>

      {/* OpenAI/GPT Status Card */}
      <Card className={`border-2 ${
        openAIStatus.status === 'ok' ? 'border-green-500/30 bg-green-500/5' :
        openAIStatus.status === 'warning' ? 'border-yellow-500/30 bg-yellow-500/5' :
        openAIStatus.status === 'error' ? 'border-red-500/30 bg-red-500/5' :
        'border-border'
      }`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Status da API OpenAI (GPT)
          </CardTitle>
          <CardDescription>
            Monitoramento de chamadas e custos estimados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              {getStatusIcon(openAIStatus.status)}
              <div>
                <p className="text-sm font-medium">Status</p>
                <p className="text-xs text-muted-foreground">{openAIStatus.message}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">{openAIStatus.recentCalls}</p>
                <p className="text-xs text-muted-foreground">Chamadas (24h)</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">{openAIStatus.recentErrors}</p>
                <p className="text-xs text-muted-foreground">Erros (24h)</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">~${openAIStatus.estimatedCost.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Custo estimado (24h)</p>
              </div>
            </div>
          </div>
          
          {openAIStatus.lastCheck && (
            <p className="text-xs text-muted-foreground mt-4">
              Última verificação: {openAIStatus.lastCheck.toLocaleString('pt-BR')}
            </p>
          )}
          
          {openAIStatus.status === 'warning' || openAIStatus.status === 'error' ? (
            <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                ⚠️ Atenção: Verifique o saldo da sua conta OpenAI e os logs de erro.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Bot className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{totalAgents}</p>
            <p className="text-xs text-muted-foreground">Total de Agentes</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{activeAgents}</p>
            <p className="text-xs text-muted-foreground">Agentes Ativos</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <MessageSquare className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{totalMessagesSent}</p>
            <p className="text-xs text-muted-foreground">Mensagens Hoje</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{avgResponseRate}%</p>
            <p className="text-xs text-muted-foreground">Taxa de Resposta Média</p>
          </CardContent>
        </Card>
      </div>

      {/* Agents List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Todos os Agentes</CardTitle>
          <CardDescription>Lista completa de agentes de todos os usuários</CardDescription>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Nenhum agente criado ainda</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {agents.map((agent) => (
                  <Card key={agent.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{agent.name}</p>
                          <p className="text-xs text-muted-foreground">{agent.user_email}</p>
                        </div>
                      </div>
                      {getAgentStatusBadge(agent.status)}
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 mt-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Mensagens hoje</p>
                        <p className="font-medium">{agent.messages_sent_today}/{agent.daily_limit >= 9999 ? '∞' : agent.daily_limit}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Conversas</p>
                        <p className="font-medium">{agent.total_conversations}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Taxa resposta</p>
                        <p className="font-medium">{agent.response_rate}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Última atividade</p>
                        <p className="font-medium text-xs">
                          {agent.last_activity 
                            ? new Date(agent.last_activity).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'Sem atividade'
                          }
                        </p>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 rounded-full ${
                            agent.messages_sent_today >= agent.daily_limit 
                              ? 'bg-red-500' 
                              : agent.messages_sent_today >= agent.daily_limit * 0.9 
                                ? 'bg-yellow-500' 
                                : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min((agent.messages_sent_today / agent.daily_limit) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
