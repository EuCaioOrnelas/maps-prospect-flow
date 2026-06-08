import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { 
  Bot, 
  MessageSquare, 
  Reply, 
  Clock, 
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AgentStats {
  totalConversations: number;
  totalResponses: number;
  responseRate: number;
  avgResponseTime: number;
  conversationsCompleted: number;
  conversionRate: number;
}

interface AgentMetricsDashboardProps {
  dateFilter?: string;
}

const CHART_COLORS = [
  "#22c55e", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
];

export function AgentMetricsDashboard({ dateFilter = "30days" }: AgentMetricsDashboardProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("all");
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [messageLogs, setMessageLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);

      try {
        // Fetch agents
        const { data: agentsData } = await supabase
          .from('ai_agents')
          .select('id, name')
          .eq('owner_user_id', accountOwnerId);

        setAgents(agentsData || []);

        // Calculate date filter
        let dateLimit = new Date();
        switch (dateFilter) {
          case "7days":
            dateLimit.setDate(dateLimit.getDate() - 7);
            break;
          case "30days":
            dateLimit.setDate(dateLimit.getDate() - 30);
            break;
          case "90days":
            dateLimit.setDate(dateLimit.getDate() - 90);
            break;
          default:
            dateLimit = new Date(0);
        }

        // Fetch conversations
        let conversationsQuery = supabase
          .from('agent_conversations')
          .select('*')
          .gte('created_at', dateLimit.toISOString());

        if (selectedAgentId !== "all") {
          conversationsQuery = conversationsQuery.eq('agent_id', selectedAgentId);
        } else {
          // Filter by user's agents
          const agentIds = agentsData?.map(a => a.id) || [];
          if (agentIds.length > 0) {
            conversationsQuery = conversationsQuery.in('agent_id', agentIds);
          }
        }

        const { data: conversationsData } = await conversationsQuery;
        setConversations(conversationsData || []);

        // Fetch message logs for response time calculation
        let logsQuery = supabase
          .from('agent_message_logs')
          .select('*')
          .gte('created_at', dateLimit.toISOString());

        if (selectedAgentId !== "all") {
          logsQuery = logsQuery.eq('agent_id', selectedAgentId);
        } else {
          const agentIds = agentsData?.map(a => a.id) || [];
          if (agentIds.length > 0) {
            logsQuery = logsQuery.in('agent_id', agentIds);
          }
        }

        const { data: logsData } = await logsQuery;
        setMessageLogs(logsData || []);

      } catch (error) {
        console.error('Error fetching agent metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, dateFilter, selectedAgentId]);

  const stats: AgentStats = useMemo(() => {
    const totalConversations = conversations.length;
    const totalResponses = conversations.filter(c => c.response_received).length;
    const responseRate = totalConversations > 0 
      ? Math.round((totalResponses / totalConversations) * 100) 
      : 0;
    
    const conversationsCompleted = conversations.filter(c => c.status === 'completed').length;
    const conversionRate = totalConversations > 0 
      ? Math.round((conversationsCompleted / totalConversations) * 100) 
      : 0;

    // Calculate average response time (in minutes)
    const responseTimes: number[] = [];
    conversations.forEach(conv => {
      if (conv.initial_message_sent_at && conv.response_received_at) {
        const sent = new Date(conv.initial_message_sent_at).getTime();
        const received = new Date(conv.response_received_at).getTime();
        const diffMinutes = (received - sent) / (1000 * 60);
        if (diffMinutes > 0 && diffMinutes < 1440) { // Max 24 hours
          responseTimes.push(diffMinutes);
        }
      }
    });

    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

    return {
      totalConversations,
      totalResponses,
      responseRate,
      avgResponseTime,
      conversationsCompleted,
      conversionRate,
    };
  }, [conversations]);

  // Chart data: Conversations by status
  const statusChartData = useMemo(() => {
    const statusCount: Record<string, number> = {};
    conversations.forEach(conv => {
      const status = conv.status || 'unknown';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });

    const statusLabels: Record<string, string> = {
      'awaiting_response': 'Aguardando Resposta',
      'responded': 'Respondido',
      'completed': 'Concluído',
      'unknown': 'Desconhecido',
    };

    return Object.entries(statusCount).map(([status, count]) => ({
      name: statusLabels[status] || status,
      value: count,
    }));
  }, [conversations]);

  // Chart data: Conversations by day
  const dailyChartData = useMemo(() => {
    const dailyStats: Record<string, { conversations: number; responses: number }> = {};

    conversations.forEach(conv => {
      const date = new Date(conv.created_at).toLocaleDateString('pt-BR');
      if (!dailyStats[date]) {
        dailyStats[date] = { conversations: 0, responses: 0 };
      }
      dailyStats[date].conversations += 1;
      if (conv.response_received) {
        dailyStats[date].responses += 1;
      }
    });

    return Object.entries(dailyStats)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => {
        const [dayA, monthA, yearA] = a.date.split('/').map(Number);
        const [dayB, monthB, yearB] = b.date.split('/').map(Number);
        return new Date(yearA, monthA - 1, dayA).getTime() - new Date(yearB, monthB - 1, dayB).getTime();
      })
      .slice(-14);
  }, [conversations]);

  // Chart data: Performance by agent
  const agentPerformanceData = useMemo(() => {
    if (selectedAgentId !== "all") return [];

    const agentStats: Record<string, { name: string; conversations: number; responses: number }> = {};

    conversations.forEach(conv => {
      const agent = agents.find(a => a.id === conv.agent_id);
      if (agent) {
        if (!agentStats[agent.id]) {
          agentStats[agent.id] = { name: agent.name, conversations: 0, responses: 0 };
        }
        agentStats[agent.id].conversations += 1;
        if (conv.response_received) {
          agentStats[agent.id].responses += 1;
        }
      }
    });

    return Object.values(agentStats).map(stat => ({
      ...stat,
      responseRate: stat.conversations > 0 
        ? Math.round((stat.responses / stat.conversations) * 100) 
        : 0,
    }));
  }, [conversations, agents, selectedAgentId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Agent Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold">Métricas de Agentes IA</h2>
        </div>
        
        <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Selecionar agente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Agentes</SelectItem>
            {agents.map(agent => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversas Iniciadas</p>
                <p className="text-3xl font-bold">{stats.totalConversations}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Resposta</p>
                <p className="text-3xl font-bold">{stats.responseRate}%</p>
              </div>
              <Reply className="h-8 w-8 text-green-500/60" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.totalResponses} respostas de {stats.totalConversations} conversas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tempo Médio de Resposta</p>
                <p className="text-3xl font-bold">
                  {stats.avgResponseTime > 60 
                    ? `${Math.floor(stats.avgResponseTime / 60)}h ${stats.avgResponseTime % 60}m`
                    : `${stats.avgResponseTime}m`}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-500/60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                <p className="text-3xl font-bold">{stats.conversionRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-500/60" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.conversationsCompleted} conversas concluídas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Conversations Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversas por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="conversations" fill="#22c55e" name="Conversas" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="responses" fill="#06b6d4" name="Respostas" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                <p>Sem dados para exibir</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                <p>Sem dados para exibir</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agent Performance Table (when viewing all) */}
      {selectedAgentId === "all" && agentPerformanceData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance por Agente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {agentPerformanceData.map((agent, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Bot className="h-5 w-5 text-primary" />
                    <span className="font-medium">{agent.name}</span>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-muted-foreground">
                      <span className="font-medium text-foreground">{agent.conversations}</span> conversas
                    </div>
                    <div className="text-muted-foreground">
                      <span className="font-medium text-foreground">{agent.responses}</span> respostas
                    </div>
                    <div className={`font-medium ${agent.responseRate >= 50 ? 'text-green-500' : 'text-yellow-500'}`}>
                      {agent.responseRate}% taxa
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
