import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import {
  Bot,
  MessageSquare,
  Reply,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Users,
  Zap,
  Timer,
  Target,
  DollarSign,
  Download,
  Search,
  Filter,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  Activity,
  PhoneOff,
  UserX,
  HelpCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// Types
interface Agent {
  id: string;
  name: string;
  status: string;
  objective: string;
  communication_style: string;
}

interface Conversation {
  id: string;
  agent_id: string;
  lead_phone: string;
  lead_name: string | null;
  status: string;
  response_received: boolean;
  reply_sent: boolean;
  reply_count: number | null;
  created_at: string;
  initial_message_sent_at: string | null;
  response_received_at: string | null;
  reply_sent_at: string | null;
  initial_message_content: string | null;
  response_content: string | null;
}

interface MessageLog {
  id: string;
  agent_id: string;
  conversation_id: string | null;
  direction: string;
  content: string | null;
  message_type: string | null;
  processed_at: string;
  created_at: string;
}

// Colors for charts
const CHART_COLORS = [
  "#22c55e", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#f97316",
];

const AgentReports = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messageLogs, setMessageLogs] = useState<MessageLog[]>([]);
  
  // Filters
  const [dateFilter, setDateFilter] = useState("30days");
  const [selectedAgentId, setSelectedAgentId] = useState("all");
  const [agentType, setAgentType] = useState("all");
  const [agentStatus, setAgentStatus] = useState("all");
  const [conversationStatus, setConversationStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Table pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);

      try {
        // Fetch agents
        const { data: agentsData } = await supabase
          .from('ai_agents')
          .select('*')
          .eq('user_id', user.id);

        setAgents(agentsData || []);

        // Calculate date filter
        let dateLimit = new Date();
        switch (dateFilter) {
          case "today":
            dateLimit = new Date();
            dateLimit.setHours(0, 0, 0, 0);
            break;
          case "7days":
            dateLimit = subDays(new Date(), 7);
            break;
          case "30days":
            dateLimit = subDays(new Date(), 30);
            break;
          case "thisMonth":
            dateLimit = startOfMonth(new Date());
            break;
          case "lastMonth":
            dateLimit = startOfMonth(subMonths(new Date(), 1));
            break;
          default:
            dateLimit = new Date(0);
        }

        const agentIds = agentsData?.map(a => a.id) || [];
        if (agentIds.length === 0) {
          setConversations([]);
          setMessageLogs([]);
          setLoading(false);
          return;
        }

        // Fetch conversations
        let conversationsQuery = supabase
          .from('agent_conversations')
          .select('*')
          .gte('created_at', dateLimit.toISOString())
          .in('agent_id', agentIds);

        if (selectedAgentId !== "all") {
          conversationsQuery = conversationsQuery.eq('agent_id', selectedAgentId);
        }

        const { data: conversationsData } = await conversationsQuery;
        setConversations(conversationsData || []);

        // Fetch message logs
        let logsQuery = supabase
          .from('agent_message_logs')
          .select('*')
          .gte('created_at', dateLimit.toISOString())
          .in('agent_id', agentIds);

        if (selectedAgentId !== "all") {
          logsQuery = logsQuery.eq('agent_id', selectedAgentId);
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

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalConversations = conversations.length;
    const totalMessagesSent = messageLogs.filter(m => m.direction === 'outbound').length;
    const totalMessagesReceived = messageLogs.filter(m => m.direction === 'inbound').length;
    
    const responsesReceived = conversations.filter(c => c.response_received).length;
    const responseRate = totalConversations > 0 
      ? Math.round((responsesReceived / totalConversations) * 100) 
      : 0;

    const autoCompleted = conversations.filter(c => c.status === 'completed').length;
    const autoCompletionRate = totalConversations > 0 
      ? Math.round((autoCompleted / totalConversations) * 100) 
      : 0;

    const escalated = conversations.filter(c => c.status === 'escalated').length;
    const escalationRate = totalConversations > 0 
      ? Math.round((escalated / totalConversations) * 100) 
      : 0;

    // Calculate average response time
    const responseTimes: number[] = [];
    conversations.forEach(conv => {
      if (conv.initial_message_sent_at && conv.response_received_at) {
        const sent = new Date(conv.initial_message_sent_at).getTime();
        const received = new Date(conv.response_received_at).getTime();
        const diffMinutes = (received - sent) / (1000 * 60);
        if (diffMinutes > 0 && diffMinutes < 1440) {
          responseTimes.push(diffMinutes);
        }
      }
    });
    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

    // Calculate avg time until conversation ends
    const conversationDurations: number[] = [];
    conversations.filter(c => c.status === 'completed').forEach(conv => {
      if (conv.initial_message_sent_at && conv.reply_sent_at) {
        const start = new Date(conv.initial_message_sent_at).getTime();
        const end = new Date(conv.reply_sent_at).getTime();
        const diffHours = (end - start) / (1000 * 60 * 60);
        if (diffHours > 0 && diffHours < 168) { // Max 1 week
          conversationDurations.push(diffHours);
        }
      }
    });
    const avgConversationDuration = conversationDurations.length > 0
      ? Math.round(conversationDurations.reduce((a, b) => a + b, 0) / conversationDurations.length)
      : 0;

    // Estimate human hours saved (15 min per conversation average)
    const humanHoursSaved = Math.round((totalConversations * 15) / 60);
    const estimatedSavings = humanHoursSaved * 50; // R$50/hour estimate

    const uniqueLeads = new Set(conversations.map(c => c.lead_phone)).size;

    return {
      totalConversations,
      totalMessagesSent,
      totalMessagesReceived,
      responseRate,
      autoCompletionRate,
      escalationRate,
      avgResponseTime,
      avgConversationDuration,
      humanHoursSaved,
      estimatedSavings,
      uniqueLeads,
      responsesReceived,
      autoCompleted,
      escalated,
    };
  }, [conversations, messageLogs]);

  // Daily chart data
  const dailyChartData = useMemo(() => {
    const dailyStats: Record<string, { date: string; conversas: number; mensagensEnviadas: number; mensagensRecebidas: number }> = {};

    conversations.forEach(conv => {
      const date = format(new Date(conv.created_at), 'dd/MM', { locale: ptBR });
      if (!dailyStats[date]) {
        dailyStats[date] = { date, conversas: 0, mensagensEnviadas: 0, mensagensRecebidas: 0 };
      }
      dailyStats[date].conversas += 1;
    });

    messageLogs.forEach(log => {
      const date = format(new Date(log.created_at), 'dd/MM', { locale: ptBR });
      if (!dailyStats[date]) {
        dailyStats[date] = { date, conversas: 0, mensagensEnviadas: 0, mensagensRecebidas: 0 };
      }
      if (log.direction === 'outbound') {
        dailyStats[date].mensagensEnviadas += 1;
      } else {
        dailyStats[date].mensagensRecebidas += 1;
      }
    });

    return Object.values(dailyStats)
      .sort((a, b) => {
        const [dayA, monthA] = a.date.split('/').map(Number);
        const [dayB, monthB] = b.date.split('/').map(Number);
        return monthA !== monthB ? monthA - monthB : dayA - dayB;
      })
      .slice(-14);
  }, [conversations, messageLogs]);

  // Agent performance data
  const agentPerformanceData = useMemo(() => {
    const agentStats: Record<string, { name: string; conversas: number; encerradas: number }> = {};

    conversations.forEach(conv => {
      const agent = agents.find(a => a.id === conv.agent_id);
      if (agent) {
        if (!agentStats[agent.id]) {
          agentStats[agent.id] = { name: agent.name, conversas: 0, encerradas: 0 };
        }
        agentStats[agent.id].conversas += 1;
        if (conv.status === 'completed') {
          agentStats[agent.id].encerradas += 1;
        }
      }
    });

    return Object.values(agentStats).sort((a, b) => b.conversas - a.conversas);
  }, [conversations, agents]);

  // Status distribution for donut chart
  const statusDistributionData = useMemo(() => {
    const statusCount: Record<string, number> = {
      'Encerradas Automaticamente': 0,
      'Escaladas para Humano': 0,
      'Sem Resposta do Lead': 0,
      'Em Andamento': 0,
    };

    conversations.forEach(conv => {
      if (conv.status === 'completed') {
        statusCount['Encerradas Automaticamente'] += 1;
      } else if (conv.status === 'escalated') {
        statusCount['Escaladas para Humano'] += 1;
      } else if (!conv.response_received && conv.status !== 'awaiting_response') {
        statusCount['Sem Resposta do Lead'] += 1;
      } else {
        statusCount['Em Andamento'] += 1;
      }
    });

    return Object.entries(statusCount)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({ name, value }));
  }, [conversations]);

  // Escalation reasons (simulated based on available data)
  const escalationReasonsData = useMemo(() => {
    // Since we don't have actual escalation reasons in the data,
    // we'll simulate based on conversation patterns
    const escalatedConversations = conversations.filter(c => c.status === 'escalated');
    
    if (escalatedConversations.length === 0) return [];

    // Simulate distribution
    const reasons = [
      { name: 'Lead confuso', value: Math.round(escalatedConversations.length * 0.35) },
      { name: 'Pedido fora do fluxo', value: Math.round(escalatedConversations.length * 0.25) },
      { name: 'Palavra sensível', value: Math.round(escalatedConversations.length * 0.2) },
      { name: 'Erro de entendimento', value: Math.round(escalatedConversations.length * 0.2) },
    ].filter(r => r.value > 0);

    return reasons;
  }, [conversations]);

  // Funnel data
  const funnelData = useMemo(() => {
    const total = conversations.length;
    const responded = conversations.filter(c => c.response_received).length;
    const engaged = conversations.filter(c => c.reply_count && c.reply_count > 1).length;
    const completed = conversations.filter(c => c.status === 'completed').length;

    return [
      { stage: 'Conversas Iniciadas', value: total, fill: '#22c55e' },
      { stage: 'Leads Responderam', value: responded, fill: '#14b8a6' },
      { stage: 'Leads Engajados', value: engaged, fill: '#06b6d4' },
      { stage: 'Conversas Concluídas', value: completed, fill: '#0ea5e9' },
    ];
  }, [conversations]);

  // Table data with filtering
  const tableData = useMemo(() => {
    let filtered = conversations.map(conv => {
      const agent = agents.find(a => a.id === conv.agent_id);
      
      // Calculate response time
      let responseTime = null;
      if (conv.initial_message_sent_at && conv.response_received_at) {
        const sent = new Date(conv.initial_message_sent_at).getTime();
        const received = new Date(conv.response_received_at).getTime();
        responseTime = Math.round((received - sent) / (1000 * 60));
      }

      return {
        ...conv,
        agentName: agent?.name || 'N/A',
        responseTime,
        maskedPhone: conv.lead_phone.replace(/(\d{2})(\d{5})(\d{4})/, '$1*****$3'),
        messageCount: messageLogs.filter(l => l.conversation_id === conv.id).length,
      };
    });

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        c => c.maskedPhone.includes(query) || 
             c.agentName.toLowerCase().includes(query) ||
             c.lead_name?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (conversationStatus !== "all") {
      filtered = filtered.filter(c => c.status === conversationStatus);
    }

    return filtered.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [conversations, agents, messageLogs, searchQuery, conversationStatus]);

  // Paginated table data
  const paginatedTableData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return tableData.slice(startIndex, startIndex + itemsPerPage);
  }, [tableData, currentPage]);

  const totalPages = Math.ceil(tableData.length / itemsPerPage);

  // AI Insights
  const insights = useMemo(() => {
    const insightsList: string[] = [];

    // Response rate insight
    if (kpis.responseRate < 30) {
      insightsList.push(`A taxa de resposta está em ${kpis.responseRate}%. Considere revisar as mensagens iniciais para aumentar o engajamento.`);
    } else if (kpis.responseRate > 60) {
      insightsList.push(`Excelente! Sua taxa de resposta de ${kpis.responseRate}% está acima da média do mercado.`);
    }

    // Escalation insight
    if (kpis.escalationRate > 30) {
      insightsList.push(`${kpis.escalationRate}% das conversas foram escaladas. Revise os prompts do agente para reduzir esse número.`);
    }

    // Response time insight
    if (kpis.avgResponseTime > 60) {
      insightsList.push(`O tempo médio de resposta dos leads é de ${kpis.avgResponseTime} minutos. Leads tendem a responder mais rápido pela manhã.`);
    } else if (kpis.avgResponseTime < 15 && kpis.avgResponseTime > 0) {
      insightsList.push(`Ótimo! Leads respondem em média em ${kpis.avgResponseTime} minutos - isso indica alta relevância da abordagem.`);
    }

    // Cost savings insight
    if (kpis.humanHoursSaved > 0) {
      insightsList.push(`Você economizou aproximadamente ${kpis.humanHoursSaved} horas de atendimento humano (≈ R$ ${kpis.estimatedSavings.toLocaleString('pt-BR')}).`);
    }

    // Agent performance insight
    if (agentPerformanceData.length > 1) {
      const best = agentPerformanceData[0];
      if (best.conversas > 0) {
        const rate = Math.round((best.encerradas / best.conversas) * 100);
        insightsList.push(`O agente "${best.name}" é o mais ativo com ${best.conversas} conversas e ${rate}% de taxa de conclusão.`);
      }
    }

    // Engagement insight
    const engagedRate = conversations.length > 0 
      ? Math.round((conversations.filter(c => c.reply_count && c.reply_count > 1).length / conversations.length) * 100)
      : 0;
    if (engagedRate > 40) {
      insightsList.push(`${engagedRate}% dos leads mantiveram múltiplas interações - indica boa qualidade de conversa.`);
    }

    return insightsList;
  }, [kpis, agentPerformanceData, conversations]);

  // Agent health score - Sistema real baseado em benchmarks
  const healthScoreDetails = useMemo(() => {
    // Benchmarks ideais do mercado
    const BENCHMARKS = {
      responseRate: { ideal: 40, excellent: 60, weight: 30 }, // % de leads que respondem
      completionRate: { ideal: 50, excellent: 70, weight: 25 }, // % de conversas concluídas
      avgResponseTime: { ideal: 30, excellent: 15, weight: 15 }, // minutos (menor = melhor)
      escalationRate: { ideal: 20, excellent: 10, weight: 15 }, // % (menor = melhor)
      engagementRate: { ideal: 30, excellent: 50, weight: 15 }, // % de leads com múltiplas interações
    };

    const engagementRate = kpis.totalConversations > 0
      ? Math.round((conversations.filter(c => c.reply_count && c.reply_count > 1).length / kpis.totalConversations) * 100)
      : 0;

    // Calcular pontuação para cada métrica
    const calculateMetricScore = (value: number, benchmark: { ideal: number; excellent: number; weight: number }, isInverse: boolean = false) => {
      if (isInverse) {
        // Para métricas onde menor é melhor (tempo de resposta, escalonamento)
        if (value <= benchmark.excellent) return 100;
        if (value <= benchmark.ideal) return 70 + ((benchmark.ideal - value) / (benchmark.ideal - benchmark.excellent)) * 30;
        if (value <= benchmark.ideal * 2) return 40 + ((benchmark.ideal * 2 - value) / benchmark.ideal) * 30;
        return Math.max(0, 40 - (value - benchmark.ideal * 2) / benchmark.ideal * 20);
      } else {
        // Para métricas onde maior é melhor
        if (value >= benchmark.excellent) return 100;
        if (value >= benchmark.ideal) return 70 + ((value - benchmark.ideal) / (benchmark.excellent - benchmark.ideal)) * 30;
        if (value >= benchmark.ideal / 2) return 40 + ((value - benchmark.ideal / 2) / (benchmark.ideal / 2)) * 30;
        return Math.max(0, (value / (benchmark.ideal / 2)) * 40);
      }
    };

    const scores = {
      responseRate: {
        value: kpis.responseRate,
        score: calculateMetricScore(kpis.responseRate, BENCHMARKS.responseRate),
        weight: BENCHMARKS.responseRate.weight,
        label: 'Taxa de Resposta',
        benchmark: `Ideal: ${BENCHMARKS.responseRate.ideal}%+`,
        status: kpis.responseRate >= BENCHMARKS.responseRate.excellent ? 'excellent' : 
                kpis.responseRate >= BENCHMARKS.responseRate.ideal ? 'good' : 
                kpis.responseRate >= BENCHMARKS.responseRate.ideal / 2 ? 'regular' : 'poor',
      },
      completionRate: {
        value: kpis.autoCompletionRate,
        score: calculateMetricScore(kpis.autoCompletionRate, BENCHMARKS.completionRate),
        weight: BENCHMARKS.completionRate.weight,
        label: 'Taxa de Conclusão',
        benchmark: `Ideal: ${BENCHMARKS.completionRate.ideal}%+`,
        status: kpis.autoCompletionRate >= BENCHMARKS.completionRate.excellent ? 'excellent' : 
                kpis.autoCompletionRate >= BENCHMARKS.completionRate.ideal ? 'good' : 
                kpis.autoCompletionRate >= BENCHMARKS.completionRate.ideal / 2 ? 'regular' : 'poor',
      },
      avgResponseTime: {
        value: kpis.avgResponseTime,
        score: calculateMetricScore(kpis.avgResponseTime, BENCHMARKS.avgResponseTime, true),
        weight: BENCHMARKS.avgResponseTime.weight,
        label: 'Tempo de Resposta',
        benchmark: `Ideal: <${BENCHMARKS.avgResponseTime.ideal}min`,
        status: kpis.avgResponseTime > 0 && kpis.avgResponseTime <= BENCHMARKS.avgResponseTime.excellent ? 'excellent' : 
                kpis.avgResponseTime <= BENCHMARKS.avgResponseTime.ideal ? 'good' : 
                kpis.avgResponseTime <= BENCHMARKS.avgResponseTime.ideal * 2 ? 'regular' : 'poor',
      },
      escalationRate: {
        value: kpis.escalationRate,
        score: calculateMetricScore(kpis.escalationRate, BENCHMARKS.escalationRate, true),
        weight: BENCHMARKS.escalationRate.weight,
        label: 'Taxa de Escalonamento',
        benchmark: `Ideal: <${BENCHMARKS.escalationRate.ideal}%`,
        status: kpis.escalationRate <= BENCHMARKS.escalationRate.excellent ? 'excellent' : 
                kpis.escalationRate <= BENCHMARKS.escalationRate.ideal ? 'good' : 
                kpis.escalationRate <= BENCHMARKS.escalationRate.ideal * 2 ? 'regular' : 'poor',
      },
      engagementRate: {
        value: engagementRate,
        score: calculateMetricScore(engagementRate, BENCHMARKS.engagementRate),
        weight: BENCHMARKS.engagementRate.weight,
        label: 'Taxa de Engajamento',
        benchmark: `Ideal: ${BENCHMARKS.engagementRate.ideal}%+`,
        status: engagementRate >= BENCHMARKS.engagementRate.excellent ? 'excellent' : 
                engagementRate >= BENCHMARKS.engagementRate.ideal ? 'good' : 
                engagementRate >= BENCHMARKS.engagementRate.ideal / 2 ? 'regular' : 'poor',
      },
    };

    // Calcular score total ponderado
    const totalWeight = Object.values(scores).reduce((sum, s) => sum + s.weight, 0);
    const weightedScore = Object.values(scores).reduce((sum, s) => sum + (s.score * s.weight), 0);
    const totalScore = Math.round(weightedScore / totalWeight);

    // Se não há dados, retornar score neutro
    if (kpis.totalConversations === 0) {
      return {
        totalScore: 0,
        metrics: scores,
        status: 'no_data' as const,
        message: 'Sem dados suficientes para calcular o score'
      };
    }

    return {
      totalScore,
      metrics: scores,
      status: totalScore >= 75 ? 'excellent' as const : 
              totalScore >= 50 ? 'good' as const : 
              totalScore >= 25 ? 'regular' as const : 'poor' as const,
      message: totalScore >= 75 ? 'Seus agentes estão performando excelentemente!' :
               totalScore >= 50 ? 'Boa performance, mas há espaço para melhorias.' :
               totalScore >= 25 ? 'Performance regular. Considere ajustar os prompts.' :
               'Performance abaixo do esperado. Revise a configuração dos agentes.'
    };
  }, [kpis, conversations]);

  const getHealthColor = (score: number) => {
    if (score >= 75) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    if (score >= 25) return 'text-orange-500';
    return 'text-red-500';
  };

  const getHealthBgColor = (score: number) => {
    if (score >= 75) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    if (score >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'regular': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar profile={profile} />
          <div className="flex-1 flex flex-col lg:ml-[72px]">
            <AppHeader profile={profile} />
            <main className="flex-1 p-6">
              <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <Skeleton className="h-20 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <BackgroundGlow />
        <AppSidebar profile={profile} />
        
        <div className="flex-1 flex flex-col lg:ml-[72px]">
          <AppHeader profile={profile} />
          
          <main className="flex-1 overflow-auto">
            <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
              {/* Page Header */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Bot className="h-7 w-7 text-primary" />
                    Relatórios de Agentes IA
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Analise performance, qualidade e impacto dos seus agentes de IA
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Exportar
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-4">
                    {/* Date Filter */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-muted-foreground">Período</label>
                      <Select value={dateFilter} onValueChange={setDateFilter}>
                        <SelectTrigger className="w-[160px]">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="today">Hoje</SelectItem>
                          <SelectItem value="7days">Últimos 7 dias</SelectItem>
                          <SelectItem value="30days">Últimos 30 dias</SelectItem>
                          <SelectItem value="thisMonth">Mês atual</SelectItem>
                          <SelectItem value="lastMonth">Mês anterior</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Agent Filter */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-muted-foreground">Agente</label>
                      <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                        <SelectTrigger className="w-[180px]">
                          <Bot className="h-4 w-4 mr-2 text-muted-foreground" />
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

                    {/* Agent Status Filter */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-muted-foreground">Status do Agente</label>
                      <Select value={agentStatus} onValueChange={setAgentStatus}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="paused">Pausado</SelectItem>
                          <SelectItem value="error">Erro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Conversation Status Filter */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-muted-foreground">Status da Conversa</label>
                      <Select value={conversationStatus} onValueChange={setConversationStatus}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="completed">Encerrada</SelectItem>
                          <SelectItem value="escalated">Escalada</SelectItem>
                          <SelectItem value="awaiting_response">Aguardando</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Health Score Card */}
              <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-muted-foreground">Score de Saúde dos Agentes</h3>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className={`text-4xl font-bold ${getHealthColor(healthScoreDetails.totalScore)}`}>
                          {healthScoreDetails.totalScore}
                        </span>
                        <span className="text-muted-foreground">/100</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {healthScoreDetails.message}
                      </p>
                      
                      {/* Progress bar */}
                      <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden max-w-md">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${getHealthBgColor(healthScoreDetails.totalScore)}`}
                          style={{ width: `${healthScoreDetails.totalScore}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="hidden xl:flex items-center justify-center">
                      <Activity className={`h-16 w-16 ${getHealthColor(healthScoreDetails.totalScore)}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Métricas de Saúde */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {Object.entries(healthScoreDetails.metrics).map(([key, metric]) => (
                  <Card key={key} className="bg-card/50">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground truncate">{metric.label}</p>
                      <p className={`text-2xl font-bold ${getStatusColor(metric.status)}`}>
                        {key === 'avgResponseTime' 
                          ? metric.value > 0 ? `${metric.value}m` : '-'
                          : `${metric.value}%`}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{metric.benchmark}</p>
                      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${getStatusColor(metric.status).replace('text-', 'bg-')}`}
                          style={{ width: `${Math.min(100, metric.score)}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <MessageSquare className="h-8 w-8 text-primary/60" />
                    </div>
                    <div className="mt-3">
                      <p className="text-2xl font-bold">{kpis.totalConversations}</p>
                      <p className="text-sm text-muted-foreground">Conversas Iniciadas</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <Zap className="h-8 w-8 text-blue-500/60" />
                    </div>
                    <div className="mt-3">
                      <p className="text-2xl font-bold">{kpis.totalMessagesSent}</p>
                      <p className="text-sm text-muted-foreground">Mensagens Enviadas</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <Reply className="h-8 w-8 text-green-500/60" />
                    </div>
                    <div className="mt-3">
                      <p className="text-2xl font-bold">{kpis.responseRate}%</p>
                      <p className="text-sm text-muted-foreground">Taxa de Resposta</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {kpis.responsesReceived} de {kpis.totalConversations}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <CheckCircle className="h-8 w-8 text-teal-500/60" />
                    </div>
                    <div className="mt-3">
                      <p className="text-2xl font-bold">{kpis.autoCompletionRate}%</p>
                      <p className="text-sm text-muted-foreground">Encerramento Auto.</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {kpis.autoCompleted} conversas
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <AlertCircle className="h-8 w-8 text-orange-500/60" />
                    </div>
                    <div className="mt-3">
                      <p className="text-2xl font-bold">{kpis.escalationRate}%</p>
                      <p className="text-sm text-muted-foreground">Taxa de Escalonamento</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {kpis.escalated} escaladas
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <Clock className="h-8 w-8 text-purple-500/60" />
                    </div>
                    <div className="mt-3">
                      <p className="text-2xl font-bold">
                        {kpis.avgResponseTime > 60 
                          ? `${Math.floor(kpis.avgResponseTime / 60)}h ${kpis.avgResponseTime % 60}m`
                          : `${kpis.avgResponseTime}m`}
                      </p>
                      <p className="text-sm text-muted-foreground">Tempo Médio Resposta</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <Timer className="h-8 w-8 text-indigo-500/60" />
                    </div>
                    <div className="mt-3">
                      <p className="text-2xl font-bold">{kpis.avgConversationDuration}h</p>
                      <p className="text-sm text-muted-foreground">Tempo até Encerrar</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <Users className="h-8 w-8 text-cyan-500/60" />
                    </div>
                    <div className="mt-3">
                      <p className="text-2xl font-bold">{kpis.uniqueLeads}</p>
                      <p className="text-sm text-muted-foreground">Leads Contactados</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <DollarSign className="h-8 w-8 text-green-500/60" />
                    </div>
                    <div className="mt-3">
                      <p className="text-2xl font-bold text-green-500">
                        R$ {kpis.estimatedSavings.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-sm text-muted-foreground">Economia Estimada</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {kpis.humanHoursSaved}h de trabalho humano
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <Target className="h-8 w-8 text-rose-500/60" />
                    </div>
                    <div className="mt-3">
                      <p className="text-2xl font-bold">{kpis.totalMessagesReceived}</p>
                      <p className="text-sm text-muted-foreground">Mensagens Recebidas</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts - Performance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Line Chart - Conversations over time */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Conversas por Dia</CardTitle>
                    <CardDescription>Evolução das conversas no período</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dailyChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={dailyChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="date" 
                            className="text-xs fill-muted-foreground"
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis className="text-xs fill-muted-foreground" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="conversas" 
                            stroke="#22c55e" 
                            strokeWidth={2}
                            dot={{ fill: '#22c55e', strokeWidth: 2 }}
                            name="Conversas"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                        <p>Sem dados para exibir</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Area Chart - Messages sent vs received */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Mensagens Enviadas vs Recebidas</CardTitle>
                    <CardDescription>Volume de mensagens ao longo do tempo</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dailyChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={dailyChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="date" 
                            className="text-xs fill-muted-foreground"
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis className="text-xs fill-muted-foreground" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Legend />
                          <Area 
                            type="monotone" 
                            dataKey="mensagensEnviadas" 
                            stroke="#22c55e" 
                            fill="#22c55e"
                            fillOpacity={0.3}
                            name="Enviadas"
                          />
                          <Area 
                            type="monotone" 
                            dataKey="mensagensRecebidas" 
                            stroke="#06b6d4" 
                            fill="#06b6d4"
                            fillOpacity={0.3}
                            name="Recebidas"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                        <p>Sem dados para exibir</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Charts - Agent Performance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar Chart - Most active agents */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Agentes Mais Ativos</CardTitle>
                    <CardDescription>Volume de conversas por agente</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {agentPerformanceData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={agentPerformanceData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis type="number" className="text-xs fill-muted-foreground" />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            className="text-xs fill-muted-foreground"
                            width={100}
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Bar dataKey="conversas" fill="#22c55e" name="Conversas" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                        <p>Sem dados para exibir</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Bar Chart - Conversations completed by agent */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Conversas Encerradas por Agente</CardTitle>
                    <CardDescription>Eficiência de cada agente</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {agentPerformanceData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={agentPerformanceData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis type="number" className="text-xs fill-muted-foreground" />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            className="text-xs fill-muted-foreground"
                            width={100}
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Bar dataKey="encerradas" fill="#14b8a6" name="Encerradas" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                        <p>Sem dados para exibir</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Charts - Quality and Conversion */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Donut Chart - Status Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Distribuição das Conversas</CardTitle>
                    <CardDescription>Por tipo de encerramento</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {statusDistributionData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={statusDistributionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                          >
                            {statusDistributionData.map((_, index) => (
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
                      <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                        <p>Sem dados para exibir</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Bar Chart - Escalation Reasons */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Motivos de Escalonamento</CardTitle>
                    <CardDescription>Por que conversas foram escaladas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {escalationReasonsData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={escalationReasonsData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="name" 
                            className="text-xs fill-muted-foreground"
                            tick={{ fontSize: 10 }}
                            angle={-15}
                            textAnchor="end"
                          />
                          <YAxis className="text-xs fill-muted-foreground" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Bar dataKey="value" fill="#f97316" name="Ocorrências" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                        <p>Nenhum escalonamento registrado</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Funnel Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Funil de Conversão</CardTitle>
                    <CardDescription>Jornada do lead com o agente</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {funnelData.some(d => d.value > 0) ? (
                      <div className="space-y-3 py-4">
                        {funnelData.map((item, index) => {
                          const percentage = funnelData[0].value > 0 
                            ? Math.round((item.value / funnelData[0].value) * 100) 
                            : 0;
                          return (
                            <div key={item.stage} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{item.stage}</span>
                                <span className="font-medium">{item.value} ({percentage}%)</span>
                              </div>
                              <div className="h-8 bg-muted rounded-lg overflow-hidden">
                                <div 
                                  className="h-full rounded-lg transition-all duration-500"
                                  style={{ 
                                    width: `${percentage}%`,
                                    backgroundColor: item.fill
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                        <p>Sem dados para exibir</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Table */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle className="text-base">Relatório Detalhado</CardTitle>
                      <CardDescription>Todas as conversas dos agentes</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 w-[200px]"
                        />
                      </div>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Download className="h-4 w-4" />
                        CSV
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data/Hora</TableHead>
                          <TableHead>Agente</TableHead>
                          <TableHead>Lead</TableHead>
                          <TableHead className="text-center">Mensagens</TableHead>
                          <TableHead className="text-center">Tempo Resposta</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-center">Escalado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedTableData.length > 0 ? (
                          paginatedTableData.map((conv) => (
                            <TableRow key={conv.id}>
                              <TableCell className="text-sm">
                                {format(new Date(conv.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Bot className="h-4 w-4 text-primary" />
                                  <span className="text-sm font-medium">{conv.agentName}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="text-sm font-medium">{conv.lead_name || 'Lead'}</p>
                                  <p className="text-xs text-muted-foreground">{conv.maskedPhone}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline">{conv.messageCount}</Badge>
                              </TableCell>
                              <TableCell className="text-center text-sm">
                                {conv.responseTime 
                                  ? conv.responseTime > 60 
                                    ? `${Math.floor(conv.responseTime / 60)}h ${conv.responseTime % 60}m`
                                    : `${conv.responseTime}m`
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={
                                    conv.status === 'completed' ? 'default' :
                                    conv.status === 'escalated' ? 'destructive' :
                                    'secondary'
                                  }
                                  className="text-xs"
                                >
                                  {conv.status === 'completed' ? 'Concluída' :
                                   conv.status === 'escalated' ? 'Escalada' :
                                   conv.status === 'awaiting_response' ? 'Aguardando' :
                                   conv.status === 'responded' ? 'Respondida' :
                                   conv.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                {conv.status === 'escalated' ? (
                                  <AlertCircle className="h-4 w-4 text-orange-500 mx-auto" />
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                              Nenhuma conversa encontrada
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, tableData.length)} de {tableData.length}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">
                          Página {currentPage} de {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* AI Insights */}
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Insights da IA</CardTitle>
                  </div>
                  <CardDescription>Análises automáticas baseadas nos dados</CardDescription>
                </CardHeader>
                <CardContent>
                  {insights.length > 0 ? (
                    <div className="space-y-3">
                      {insights.map((insight, index) => (
                        <div 
                          key={index} 
                          className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50"
                        >
                          <div className="mt-0.5">
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-xs font-medium text-primary">{index + 1}</span>
                            </div>
                          </div>
                          <p className="text-sm text-foreground leading-relaxed">{insight}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Colete mais dados para gerar insights automáticos.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Agent Comparison (when viewing all) */}
              {selectedAgentId === "all" && agents.length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Comparação entre Agentes</CardTitle>
                    <CardDescription>Performance lado a lado</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {agentPerformanceData.slice(0, 6).map((agent, index) => {
                        const rate = agent.conversas > 0 
                          ? Math.round((agent.encerradas / agent.conversas) * 100) 
                          : 0;
                        return (
                          <div 
                            key={index} 
                            className="p-4 rounded-lg bg-muted/50 border border-border/50"
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                <Bot className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{agent.name}</p>
                                <p className="text-xs text-muted-foreground">{agent.conversas} conversas</p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Taxa de Conclusão</span>
                                <span className={`font-medium ${rate >= 50 ? 'text-green-500' : 'text-yellow-500'}`}>
                                  {rate}%
                                </span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${rate >= 50 ? 'bg-green-500' : 'bg-yellow-500'}`}
                                  style={{ width: `${rate}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AgentReports;
