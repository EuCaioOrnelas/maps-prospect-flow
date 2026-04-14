import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { 
  Bot, MessageSquare, Zap, Clock, AlertTriangle, Shield, 
  TrendingUp, Users, CheckCircle, XCircle,
  Download, FileSpreadsheet, Lightbulb, Activity, Target,
  AlertCircle, RefreshCw, Calendar, Bell, BellRing, BarChart3
} from "lucide-react";
import { format, subDays, parseISO, differenceInSeconds, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from 'xlsx';
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAutoScoreTracking } from "@/hooks/useAutoScoreTracking";

// Types
interface Agent {
  id: string;
  name: string;
  status: string;
  daily_limit: number;
  messages_sent_today: number;
  max_replies: number | null;
}

interface Conversation {
  id: string;
  agent_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  response_received: boolean;
  response_received_at: string | null;
  reply_sent: boolean;
  reply_sent_at: string | null;
  reply_count: number | null;
  initial_message_sent_at: string | null;
  response_content: string | null;
  reply_content: string | null;
  lead_phone: string;
  lead_name: string | null;
}

interface MessageLog {
  id: string;
  agent_id: string;
  conversation_id: string | null;
  direction: string;
  content: string | null;
  created_at: string;
  message_type: string | null;
}

interface AgentMetrics {
  agentId: string;
  agentName: string;
  agentStatus: string;
  conversationsStarted: number;
  messagesSent: number;
  messagesReceived: number;
  avgResponseTime: number;
  avgTimeToClose: number;
  responseRate: number;
  autoClosureRate: number;
  escalationRate: number;
  noLeadResponseRate: number;
  errorRate: number;
  sensitiveWordsCount: number;
  repeatedMessagesRate: number;
  healthScore: number;
  performanceScore: number;
  qualityScore: number;
  securityScore: number;
  stabilityScore: number;
  engagementScore: number;
  avgMessagesPerConversation: number;
  multiTurnConversations: number;
}

interface DailyMetrics {
  date: string;
  healthScore: number;
  conversationsStarted: number;
  messagesSent: number;
  messagesReceived: number;
  errorRate: number;
  escalationRate: number;
}

interface Insight {
  type: 'success' | 'warning' | 'danger' | 'info';
  message: string;
  icon: typeof TrendingUp;
}

interface HealthAlert {
  agentId: string;
  agentName: string;
  score: number;
  previousScore: number;
  timestamp: Date;
}

// Sensitive words for detection
const SENSITIVE_WORDS = [
  'spam', 'bloqueio', 'denúncia', 'denunciar', 'não me chame', 
  'pare de me mandar', 'bloquear', 'reportar', 'incomodando',
  'chato', 'irritante', 'processando', 'advogado', 'procon',
  'golpe', 'fraude', 'cancelar'
];

// Health Score Classification
const getHealthClassification = (score: number) => {
  if (score >= 90) return { label: 'Excelente', color: 'text-green-500', bgColor: 'bg-green-500', description: 'Agente altamente saudável' };
  if (score >= 70) return { label: 'Bom', color: 'text-blue-500', bgColor: 'bg-blue-500', description: 'Pequenos ajustes recomendados' };
  if (score >= 50) return { label: 'Atenção', color: 'text-yellow-500', bgColor: 'bg-yellow-500', description: 'Risco moderado' };
  return { label: 'Crítico', color: 'text-red-500', bgColor: 'bg-red-500', description: 'Alto risco de bloqueio ou baixa performance' };
};

// Calculate health score for an agent
const calculateHealthScore = (
  autoClosureRate: number,
  avgResponseTime: number,
  escalationRate: number,
  noLeadResponseRate: number,
  repeatedMessagesRate: number,
  sensitiveWordsCount: number,
  errorRate: number,
  avgMessagesPerConversation: number
): { 
  healthScore: number; 
  performanceScore: number; 
  qualityScore: number; 
  securityScore: number; 
  stabilityScore: number; 
  engagementScore: number; 
} => {
  // 1. Performance (25%)
  let performanceScore = 0;
  if (autoClosureRate >= 70) performanceScore += 50;
  else if (autoClosureRate >= 50) performanceScore += 35;
  else if (autoClosureRate >= 30) performanceScore += 20;
  else performanceScore += 10;
  
  if (avgResponseTime <= 5) performanceScore += 50;
  else if (avgResponseTime <= 15) performanceScore += 40;
  else if (avgResponseTime <= 30) performanceScore += 25;
  else if (avgResponseTime <= 60) performanceScore += 15;
  else performanceScore += 5;
  
  // 2. Quality (25%)
  let qualityScore = 0;
  if (escalationRate <= 10) qualityScore += 50;
  else if (escalationRate <= 20) qualityScore += 40;
  else if (escalationRate <= 30) qualityScore += 25;
  else qualityScore += 10;
  
  if (noLeadResponseRate <= 20) qualityScore += 50;
  else if (noLeadResponseRate <= 30) qualityScore += 40;
  else if (noLeadResponseRate <= 50) qualityScore += 25;
  else qualityScore += 10;
  
  // 3. Security (20%)
  let securityScore = 100;
  if (repeatedMessagesRate > 15) securityScore -= 40;
  else if (repeatedMessagesRate > 10) securityScore -= 25;
  else if (repeatedMessagesRate > 5) securityScore -= 10;
  
  if (sensitiveWordsCount > 10) securityScore -= 40;
  else if (sensitiveWordsCount > 5) securityScore -= 25;
  else if (sensitiveWordsCount > 2) securityScore -= 10;
  
  securityScore = Math.max(0, securityScore);
  
  // 4. Stability (15%)
  let stabilityScore = 100;
  if (errorRate > 5) stabilityScore = 20;
  else if (errorRate > 2) stabilityScore = 60;
  else if (errorRate > 1) stabilityScore = 80;
  
  // 5. Engagement (15%)
  let engagementScore = 0;
  if (avgMessagesPerConversation >= 5) engagementScore = 100;
  else if (avgMessagesPerConversation >= 3) engagementScore = 80;
  else if (avgMessagesPerConversation >= 2) engagementScore = 60;
  else if (avgMessagesPerConversation >= 1) engagementScore = 40;
  else engagementScore = 20;
  
  // Final Health Score
  const healthScore = Math.round(
    (performanceScore * 0.25) +
    (qualityScore * 0.25) +
    (securityScore * 0.20) +
    (stabilityScore * 0.15) +
    (engagementScore * 0.15)
  );

  return {
    healthScore,
    performanceScore,
    qualityScore,
    securityScore,
    stabilityScore,
    engagementScore
  };
};

export default function AgentReports() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  useAutoScoreTracking("agent_reports");
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messageLogs, setMessageLogs] = useState<MessageLog[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30");
  const [activeTab, setActiveTab] = useState("overview");
  const [healthAlerts, setHealthAlerts] = useState<HealthAlert[]>([]);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const previousScoresRef = useRef<Map<string, number>>(new Map());

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const useAllTime = dateRange === "all";
    const startDate = useAllTime ? undefined : subDays(new Date(), parseInt(dateRange)).toISOString();

    try {
      // First fetch agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('ai_agents')
        .select('id, name, status, daily_limit, messages_sent_today, max_replies')
        .eq('user_id', user.id);

      if (agentsError) {
        console.error('[AgentReports] Error fetching agents:', agentsError);
        toast.error('Erro ao carregar agentes');
        setLoading(false);
        return;
      }

      setAgents(agentsData || []);
      const agentIds = (agentsData || []).map(a => a.id);
      console.log('[AgentReports] Found agents:', agentIds.length, agentIds);

      if (agentIds.length === 0) {
        setConversations([]);
        setMessageLogs([]);
        console.log('[AgentReports] No agents found for user');
        setLoading(false);
        return;
      }

      // Fetch ALL conversations with pagination (avoid 1000 row limit)
      let allConversations: Conversation[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('agent_conversations')
          .select('*')
          .in('agent_id', agentIds)
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (startDate) query = query.gte('created_at', startDate);

        const { data, error } = await query;
        if (error) {
          console.error('[AgentReports] Error fetching conversations page', page, ':', error);
          break;
        }
        if (data && data.length > 0) {
          allConversations = [...allConversations, ...data];
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      // Fetch ALL message logs with pagination
      let allMessageLogs: MessageLog[] = [];
      page = 0;
      hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('agent_message_logs')
          .select('*')
          .in('agent_id', agentIds)
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (startDate) query = query.gte('created_at', startDate);

        const { data, error } = await query;
        if (error) {
          console.error('[AgentReports] Error fetching message logs page', page, ':', error);
          break;
        }
        if (data && data.length > 0) {
          allMessageLogs = [...allMessageLogs, ...data];
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      setConversations(allConversations);
      setMessageLogs(allMessageLogs);

      console.log('[AgentReports] Loaded data:', {
        agents: agentsData?.length || 0,
        conversations: allConversations.length,
        messageLogs: allMessageLogs.length,
        dateRange,
        startDate: startDate || 'all time',
      });
    } catch (error) {
      console.error('[AgentReports] Error fetching data:', error);
      toast.error('Erro ao carregar dados dos agentes');
    } finally {
      setLoading(false);
    }
  }, [user, dateRange]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, dateRange, fetchData]);

  // Reset selected agent when agents change
  useEffect(() => {
    if (selectedAgent !== "all" && !agents.find(a => a.id === selectedAgent)) {
      setSelectedAgent("all");
    }
  }, [agents, selectedAgent]);

  // Realtime subscriptions for live alerts
  useEffect(() => {
    if (!user || !realtimeEnabled || agents.length === 0) return;

    const agentIds = agents.map(a => a.id);
    console.log('[AgentReports] Setting up realtime subscriptions for agents:', agentIds);

    const channel = supabase
      .channel('agent-reports-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_conversations'
        },
        (payload) => {
          // Only refresh if the conversation belongs to one of user's agents
          const record = payload.new as { agent_id?: string } | undefined;
          if (record?.agent_id && agentIds.includes(record.agent_id)) {
            console.log('[AgentReports] Realtime conversation update:', payload);
            fetchData();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_message_logs'
        },
        (payload) => {
          // Only refresh if the message belongs to one of user's agents
          const record = payload.new as { agent_id?: string } | undefined;
          if (record?.agent_id && agentIds.includes(record.agent_id)) {
            console.log('[AgentReports] Realtime message log update:', payload);
            fetchData();
          }
        }
      )
      .subscribe((status) => {
        console.log('[AgentReports] Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, realtimeEnabled, agents, fetchData]);

  // Calculate metrics for each agent
  const agentMetrics = useMemo((): AgentMetrics[] => {
    if (agents.length === 0) return [];

    return agents.map(agent => {
      const agentConversations = conversations.filter(c => c.agent_id === agent.id);
      const agentMessages = messageLogs.filter(m => m.agent_id === agent.id);
      
      const messagesSent = agentMessages.filter(m => m.direction === 'outgoing' || m.direction === 'sent').length;
      const messagesReceived = agentMessages.filter(m => m.direction === 'incoming' || m.direction === 'received').length;
      const conversationsStarted = agentConversations.length;
      
      // Response times calculation
      const responseTimes: number[] = [];
      agentConversations.forEach(conv => {
        if (conv.response_received_at && conv.reply_sent_at) {
          const responseTime = differenceInSeconds(
            parseISO(conv.reply_sent_at),
            parseISO(conv.response_received_at)
          );
          if (responseTime > 0 && responseTime < 3600) {
            responseTimes.push(responseTime);
          }
        }
      });
      const avgResponseTime = responseTimes.length > 0 
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0;

      // Time to close calculation
      const closeTimes: number[] = [];
      agentConversations.filter(c => c.status === 'completed').forEach(conv => {
        if (conv.created_at && conv.updated_at) {
          const closeTime = differenceInMinutes(
            parseISO(conv.updated_at),
            parseISO(conv.created_at)
          );
          if (closeTime > 0) closeTimes.push(closeTime);
        }
      });
      const avgTimeToClose = closeTimes.length > 0 
        ? Math.round(closeTimes.reduce((a, b) => a + b, 0) / closeTimes.length)
        : 0;

      // Quality metrics
      const responseRate = messagesReceived > 0 
        ? Math.round((messagesSent / messagesReceived) * 100)
        : conversationsStarted > 0 ? 100 : 0;
      
      const completedConversations = agentConversations.filter(c => c.status === 'completed').length;
      const autoClosureRate = conversationsStarted > 0 
        ? Math.round((completedConversations / conversationsStarted) * 100)
        : 0;
      
      const escalatedConversations = agentConversations.filter(c => c.status === 'escalated').length;
      const escalationRate = conversationsStarted > 0 
        ? Math.round((escalatedConversations / conversationsStarted) * 100)
        : 0;
      
      const noResponseConversations = agentConversations.filter(c => !c.response_received).length;
      const noLeadResponseRate = conversationsStarted > 0 
        ? Math.round((noResponseConversations / conversationsStarted) * 100)
        : 0;

      // Error and risk metrics
      const errorMessages = agentMessages.filter(m => 
        m.message_type === 'error' || 
        m.content?.toLowerCase().includes('erro') ||
        m.content?.toLowerCase().includes('fallback') ||
        m.content?.toLowerCase().includes('não entendi')
      ).length;
      const totalOutgoing = agentMessages.filter(m => m.direction === 'outgoing' || m.direction === 'sent').length;
      const errorRate = totalOutgoing > 0 
        ? Math.round((errorMessages / totalOutgoing) * 100)
        : 0;

      // Sensitive words detection
      let sensitiveWordsCount = 0;
      agentMessages.forEach(m => {
        if (m.content) {
          const contentLower = m.content.toLowerCase();
          SENSITIVE_WORDS.forEach(word => {
            if (contentLower.includes(word)) {
              sensitiveWordsCount++;
            }
          });
        }
      });

      // Repeated messages detection
      const outgoingContents = agentMessages
        .filter(m => (m.direction === 'outgoing' || m.direction === 'sent') && m.content && m.content.length > 20)
        .map(m => m.content?.toLowerCase().trim() || '');
      const uniqueMessages = new Set(outgoingContents);
      const repeatedMessagesRate = outgoingContents.length > 0 
        ? Math.round(((outgoingContents.length - uniqueMessages.size) / outgoingContents.length) * 100)
        : 0;

      // Engagement metrics
      const avgMessagesPerConversation = conversationsStarted > 0 
        ? Math.round((messagesSent + messagesReceived) / conversationsStarted * 10) / 10
        : 0;
      
      const multiTurnConversations = agentConversations.filter(c => 
        (c.reply_count || 0) >= 3
      ).length;

      // Calculate Health Score
      const scores = calculateHealthScore(
        autoClosureRate,
        avgResponseTime,
        escalationRate,
        noLeadResponseRate,
        repeatedMessagesRate,
        sensitiveWordsCount,
        errorRate,
        avgMessagesPerConversation
      );

      return {
        agentId: agent.id,
        agentName: agent.name,
        agentStatus: agent.status,
        conversationsStarted,
        messagesSent,
        messagesReceived,
        avgResponseTime,
        avgTimeToClose,
        responseRate: Math.min(100, responseRate),
        autoClosureRate,
        escalationRate,
        noLeadResponseRate,
        errorRate,
        sensitiveWordsCount,
        repeatedMessagesRate,
        ...scores,
        avgMessagesPerConversation,
        multiTurnConversations
      };
    });
  }, [agents, conversations, messageLogs]);

  // Check for health score alerts
  useEffect(() => {
    if (agentMetrics.length === 0) return;

    const newAlerts: HealthAlert[] = [];

    agentMetrics.forEach(metric => {
      const previousScore = previousScoresRef.current.get(metric.agentId);
      
      // Alert if score dropped below 50 or if it dropped significantly
      if (metric.healthScore < 50) {
        if (previousScore === undefined || previousScore >= 50) {
          // Score just dropped below 50
          newAlerts.push({
            agentId: metric.agentId,
            agentName: metric.agentName,
            score: metric.healthScore,
            previousScore: previousScore || 0,
            timestamp: new Date()
          });

          toast.error(
            `⚠️ ALERTA CRÍTICO: ${metric.agentName}`,
            {
              description: `Score de Saúde caiu para ${metric.healthScore} pontos. Ação imediata necessária!`,
              duration: 10000,
              action: {
                label: 'Ver Detalhes',
                onClick: () => setSelectedAgent(metric.agentId)
              }
            }
          );
        }
      } else if (previousScore !== undefined && metric.healthScore < previousScore - 15) {
        // Score dropped more than 15 points
        toast.warning(
          `📉 ${metric.agentName}: Score em queda`,
          {
            description: `Score caiu de ${previousScore} para ${metric.healthScore} pontos.`,
            duration: 7000
          }
        );
      }

      // Update previous scores
      previousScoresRef.current.set(metric.agentId, metric.healthScore);
    });

    if (newAlerts.length > 0) {
      setHealthAlerts(prev => [...newAlerts, ...prev].slice(0, 10)); // Keep last 10 alerts
    }
  }, [agentMetrics]);

  // Filtered metrics based on selected agent
  const filteredMetrics = useMemo(() => {
    if (selectedAgent === "all") return agentMetrics;
    return agentMetrics.filter(m => m.agentId === selectedAgent);
  }, [agentMetrics, selectedAgent]);

  // Aggregated metrics
  const aggregatedMetrics = useMemo(() => {
    if (filteredMetrics.length === 0) {
      return {
        conversationsStarted: 0,
        messagesSent: 0,
        messagesReceived: 0,
        avgResponseTime: 0,
        avgTimeToClose: 0,
        autoClosureRate: 0,
        escalationRate: 0,
        errorRate: 0,
        sensitiveWordsCount: 0,
        repeatedMessagesRate: 0,
        healthScore: 0,
        performanceScore: 0,
        qualityScore: 0,
        securityScore: 0,
        stabilityScore: 0,
        engagementScore: 0
      };
    }
    
    const totals = filteredMetrics.reduce((acc, m) => ({
      conversationsStarted: acc.conversationsStarted + m.conversationsStarted,
      messagesSent: acc.messagesSent + m.messagesSent,
      messagesReceived: acc.messagesReceived + m.messagesReceived,
      avgResponseTime: acc.avgResponseTime + m.avgResponseTime,
      avgTimeToClose: acc.avgTimeToClose + m.avgTimeToClose,
      autoClosureRate: acc.autoClosureRate + m.autoClosureRate,
      escalationRate: acc.escalationRate + m.escalationRate,
      errorRate: acc.errorRate + m.errorRate,
      sensitiveWordsCount: acc.sensitiveWordsCount + m.sensitiveWordsCount,
      repeatedMessagesRate: acc.repeatedMessagesRate + m.repeatedMessagesRate,
      healthScore: acc.healthScore + m.healthScore,
      performanceScore: acc.performanceScore + m.performanceScore,
      qualityScore: acc.qualityScore + m.qualityScore,
      securityScore: acc.securityScore + m.securityScore,
      stabilityScore: acc.stabilityScore + m.stabilityScore,
      engagementScore: acc.engagementScore + m.engagementScore,
    }), {
      conversationsStarted: 0, messagesSent: 0, messagesReceived: 0,
      avgResponseTime: 0, avgTimeToClose: 0, autoClosureRate: 0,
      escalationRate: 0, errorRate: 0, sensitiveWordsCount: 0,
      repeatedMessagesRate: 0, healthScore: 0, performanceScore: 0,
      qualityScore: 0, securityScore: 0, stabilityScore: 0, engagementScore: 0
    });

    const count = filteredMetrics.length;
    return {
      ...totals,
      avgResponseTime: Math.round(totals.avgResponseTime / count),
      avgTimeToClose: Math.round(totals.avgTimeToClose / count),
      autoClosureRate: Math.round(totals.autoClosureRate / count),
      escalationRate: Math.round(totals.escalationRate / count),
      errorRate: Math.round(totals.errorRate / count),
      repeatedMessagesRate: Math.round(totals.repeatedMessagesRate / count),
      healthScore: Math.round(totals.healthScore / count),
      performanceScore: Math.round(totals.performanceScore / count),
      qualityScore: Math.round(totals.qualityScore / count),
      securityScore: Math.round(totals.securityScore / count),
      stabilityScore: Math.round(totals.stabilityScore / count),
      engagementScore: Math.round(totals.engagementScore / count),
    };
  }, [filteredMetrics]);

  // Daily metrics for charts
  const dailyMetrics = useMemo((): DailyMetrics[] => {
    const days = dateRange === "all" ? 90 : parseInt(dateRange);
    const dailyData: DailyMetrics[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const displayDate = format(date, 'dd/MM', { locale: ptBR });
      
      const dayConversations = conversations.filter(c => 
        format(parseISO(c.created_at), 'yyyy-MM-dd') === dateStr &&
        (selectedAgent === "all" || c.agent_id === selectedAgent)
      );
      
      const dayMessages = messageLogs.filter(m => 
        format(parseISO(m.created_at), 'yyyy-MM-dd') === dateStr &&
        (selectedAgent === "all" || m.agent_id === selectedAgent)
      );
      
      const messagesSent = dayMessages.filter(m => m.direction === 'outgoing' || m.direction === 'sent').length;
      const messagesReceived = dayMessages.filter(m => m.direction === 'incoming' || m.direction === 'received').length;
      const conversationsStarted = dayConversations.length;
      
      const escalated = dayConversations.filter(c => c.status === 'escalated').length;
      const escalationRate = conversationsStarted > 0 ? Math.round((escalated / conversationsStarted) * 100) : 0;
      
      const errors = dayMessages.filter(m => m.message_type === 'error').length;
      const errorRate = messagesSent > 0 ? Math.round((errors / (messagesSent || 1)) * 100) : 0;
      
      // Calculate daily health score
      const completed = dayConversations.filter(c => c.status === 'completed').length;
      const autoClosureRate = conversationsStarted > 0 ? Math.round((completed / conversationsStarted) * 100) : 75;
      
      const { healthScore } = calculateHealthScore(
        autoClosureRate, 5, escalationRate, 20, 0, 0, errorRate, 2
      );
      
      dailyData.push({
        date: displayDate,
        healthScore,
        conversationsStarted,
        messagesSent,
        messagesReceived,
        errorRate,
        escalationRate
      });
    }
    
    return dailyData;
  }, [conversations, messageLogs, dateRange, selectedAgent]);

  // Status distribution for donut chart
  const statusDistribution = useMemo(() => {
    const filteredConversations = selectedAgent === "all" 
      ? conversations 
      : conversations.filter(c => c.agent_id === selectedAgent);
    
    const completed = filteredConversations.filter(c => c.status === 'completed').length;
    const escalated = filteredConversations.filter(c => c.status === 'escalated').length;
    const awaiting = filteredConversations.filter(c => c.status === 'awaiting_response').length;
    const active = filteredConversations.filter(c => c.status === 'active').length;
    const other = filteredConversations.length - completed - escalated - awaiting - active;
    
    return [
      { name: 'Concluídas', value: completed, color: '#22c55e' },
      { name: 'Escaladas', value: escalated, color: '#f59e0b' },
      { name: 'Aguardando', value: awaiting, color: '#3b82f6' },
      { name: 'Ativas', value: active, color: '#8b5cf6' },
      { name: 'Outras', value: other, color: '#6b7280' }
    ].filter(d => d.value > 0);
  }, [conversations, selectedAgent]);

  // Funnel data
  const funnelData = useMemo(() => {
    const filteredConvs = selectedAgent === "all" 
      ? conversations 
      : conversations.filter(c => c.agent_id === selectedAgent);
    
    const total = filteredConvs.length;
    const responded = filteredConvs.filter(c => c.response_received).length;
    const replied = filteredConvs.filter(c => c.reply_sent).length;
    const completed = filteredConvs.filter(c => c.status === 'completed').length;
    
    return [
      { name: 'Iniciadas', value: total, fill: '#22c55e' },
      { name: 'Respondidas', value: responded, fill: '#3b82f6' },
      { name: 'Com Reply', value: replied, fill: '#8b5cf6' },
      { name: 'Concluídas', value: completed, fill: '#06b6d4' }
    ];
  }, [conversations, selectedAgent]);

  // Heatmap data (hourly error/escalation rates)
  const heatmapData = useMemo(() => {
    const hourlyData: { hour: string; escalations: number; errors: number }[] = [];
    
    for (let h = 0; h < 24; h++) {
      const hourConversations = conversations.filter(c => {
        const hour = parseISO(c.created_at).getHours();
        return hour === h && (selectedAgent === "all" || c.agent_id === selectedAgent);
      });
      
      const hourMessages = messageLogs.filter(m => {
        const hour = parseISO(m.created_at).getHours();
        return hour === h && (selectedAgent === "all" || m.agent_id === selectedAgent);
      });
      
      const escalations = hourConversations.filter(c => c.status === 'escalated').length;
      const errors = hourMessages.filter(m => m.message_type === 'error').length;
      
      hourlyData.push({
        hour: `${h.toString().padStart(2, '0')}h`,
        escalations,
        errors
      });
    }
    
    return hourlyData;
  }, [conversations, messageLogs, selectedAgent]);

  // Generate insights
  const insights = useMemo((): Insight[] => {
    const insightsList: Insight[] = [];
    
    if (agentMetrics.length === 0) {
      insightsList.push({
        type: 'info',
        message: 'Nenhum agente de IA configurado. Crie um agente para começar a ver métricas.',
        icon: Bot
      });
      return insightsList;
    }

    if (aggregatedMetrics.conversationsStarted === 0) {
      insightsList.push({
        type: 'info',
        message: 'Nenhuma conversa registrada no período selecionado. Aguarde interações com os agentes.',
        icon: MessageSquare
      });
      return insightsList;
    }
    
    // Health score insights
    if (aggregatedMetrics.healthScore >= 90) {
      insightsList.push({
        type: 'success',
        message: 'Agentes com score excelente! Prontos para escalar.',
        icon: TrendingUp
      });
    } else if (aggregatedMetrics.healthScore < 50) {
      insightsList.push({
        type: 'danger',
        message: 'Score crítico detectado. Revise os prompts e comportamentos.',
        icon: AlertTriangle
      });
    }
    
    // Response time insights
    if (aggregatedMetrics.avgResponseTime > 0 && aggregatedMetrics.avgResponseTime <= 5) {
      insightsList.push({
        type: 'success',
        message: `TMR de ${aggregatedMetrics.avgResponseTime}s está excelente! Agentes com resposta rápida têm 28% menos escalonamento.`,
        icon: Clock
      });
    } else if (aggregatedMetrics.avgResponseTime > 30) {
      insightsList.push({
        type: 'warning',
        message: `TMR de ${aggregatedMetrics.avgResponseTime}s está alto. Considere otimizar o processamento.`,
        icon: Clock
      });
    }
    
    // Escalation insights
    if (aggregatedMetrics.escalationRate > 25) {
      insightsList.push({
        type: 'danger',
        message: `Taxa de escalonamento de ${aggregatedMetrics.escalationRate}% está alta. Revise as condições de escalação.`,
        icon: AlertCircle
      });
    }
    
    // Repeated messages warning
    if (aggregatedMetrics.repeatedMessagesRate > 15) {
      insightsList.push({
        type: 'danger',
        message: `Risco elevado de bloqueio: ${aggregatedMetrics.repeatedMessagesRate}% de mensagens repetidas detectadas.`,
        icon: Shield
      });
    }
    
    // Sensitive words warning
    if (aggregatedMetrics.sensitiveWordsCount > 5) {
      insightsList.push({
        type: 'warning',
        message: `${aggregatedMetrics.sensitiveWordsCount} palavras sensíveis detectadas. Monitore possíveis reclamações.`,
        icon: AlertTriangle
      });
    }
    
    // Error rate insights
    if (aggregatedMetrics.errorRate > 5) {
      insightsList.push({
        type: 'danger',
        message: `Taxa de erro de ${aggregatedMetrics.errorRate}% está crítica. Verifique a estabilidade técnica.`,
        icon: XCircle
      });
    }
    
    // Auto closure insights
    if (aggregatedMetrics.autoClosureRate >= 70) {
      insightsList.push({
        type: 'success',
        message: `Taxa de encerramento automático de ${aggregatedMetrics.autoClosureRate}% indica boa autonomia.`,
        icon: CheckCircle
      });
    }
    
    return insightsList.slice(0, 5);
  }, [agentMetrics, aggregatedMetrics]);

  // Export to Excel
  const exportToExcel = () => {
    const exportData = agentMetrics.map(m => ({
      'Data': format(new Date(), 'yyyy-MM-dd'),
      'Agente': m.agentName,
      'Status': m.agentStatus,
      'Conversas Iniciadas': m.conversationsStarted,
      'Score de Saúde': m.healthScore,
      'Taxa de Encerramento (%)': m.autoClosureRate,
      'Escalonamento (%)': m.escalationRate,
      'Erros (%)': m.errorRate,
      'Mensagens Repetidas (%)': m.repeatedMessagesRate,
      'TMR (segundos)': m.avgResponseTime,
      'Palavras Sensíveis': m.sensitiveWordsCount,
      'Status Final': getHealthClassification(m.healthScore).label
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório de Agentes');
    XLSX.writeFile(wb, `relatorio-agentes-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Relatório exportado com sucesso!');
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Data', 'Agente', 'Conversas', 'Score', 'Encerramento %', 'Escalonamento %', 'Erros %', 'Repetidas %', 'Status'];
    const rows = agentMetrics.map(m => [
      format(new Date(), 'yyyy-MM-dd'),
      m.agentName,
      m.conversationsStarted,
      m.healthScore,
      m.autoClosureRate,
      m.escalationRate,
      m.errorRate,
      m.repeatedMessagesRate,
      getHealthClassification(m.healthScore).label
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-agentes-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('CSV exportado com sucesso!');
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background relative overflow-hidden">
          <BackgroundGlow />
          <AppSidebar profile={profile} />
          <MobileNav profile={profile} />
          <div className="flex-1 flex flex-col min-w-0 lg:pl-[72px]">
            <AppHeader profile={profile} />
            <main className="flex-1 p-6">
              <div className="max-w-7xl mx-auto space-y-6">
                <Skeleton className="h-12 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-32" />
                  ))}
                </div>
                <Skeleton className="h-96" />
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  const healthClass = getHealthClassification(aggregatedMetrics.healthScore);
  const hasData = agents.length > 0;
  const hasConversations = conversations.length > 0;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background relative overflow-hidden">
        <BackgroundGlow />
        <AppSidebar profile={profile} />
        <MobileNav profile={profile} />
        <div className="flex-1 flex flex-col min-w-0 lg:pl-[72px]">
          <AppHeader profile={profile} />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-7 w-7 text-primary" />
              Relatórios de Agentes IA
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitoramento operacional, qualidade e risco de bloqueio
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Realtime Toggle */}
            <Button 
              variant={realtimeEnabled ? "default" : "outline"} 
              size="sm"
              onClick={() => setRealtimeEnabled(!realtimeEnabled)}
              className="gap-2"
            >
              {realtimeEnabled ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              {realtimeEnabled ? 'Alertas Ativos' : 'Alertas Inativos'}
            </Button>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="14">Últimos 14 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="60">Últimos 60 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="all">Todo período</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-[180px]">
                <Bot className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Todos os agentes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os agentes</SelectItem>
                {agents.map(agent => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="icon" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV} disabled={!hasData}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportToExcel} disabled={!hasData}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </div>

        {/* Health Alerts */}
        {healthAlerts.length > 0 && (
          <Card className="border-red-500/50 bg-red-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-red-500">
                <AlertTriangle className="h-5 w-5" />
                Alertas Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {healthAlerts.slice(0, 3).map((alert, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-red-500/10 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Bot className="h-4 w-4 text-red-500" />
                      <span className="font-medium">{alert.agentName}</span>
                      <Badge variant="destructive">Score: {alert.score}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(alert.timestamp, 'HH:mm', { locale: ptBR })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Data State */}
        {!hasData && (
          <Card className="bg-muted/50">
            <CardContent className="p-12 text-center">
              <Bot className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum Agente de IA Configurado</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Crie seus agentes de IA para começar a ver métricas e relatórios de desempenho. 
                Os dados serão atualizados em tempo real conforme os agentes interagirem com leads.
              </p>
              <Button onClick={() => navigate('/agents')}>
                Criar Agente de IA
              </Button>
            </CardContent>
          </Card>
        )}

        {hasData && (
          <>
            {/* Main Health Score Card */}
            <Card className="bg-gradient-to-r from-card to-card/80 border-2 border-primary/20">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Score Principal */}
                  <div className="flex items-center gap-6">
                    <div className={`relative w-32 h-32 rounded-full flex items-center justify-center border-8 ${healthClass.color.replace('text-', 'border-')}`}>
                      <div className="text-center">
                        <span className={`text-4xl font-bold ${healthClass.color}`}>
                          {aggregatedMetrics.healthScore || '--'}
                        </span>
                        <span className="text-muted-foreground text-sm block">/100</span>
                      </div>
                    </div>
                    <div>
                      <Badge className={`${healthClass.bgColor} text-white mb-2`}>
                        {healthClass.label}
                      </Badge>
                      <h3 className="text-lg font-semibold">Score de Saúde</h3>
                      <p className="text-sm text-muted-foreground">{healthClass.description}</p>
                      {!hasConversations && (
                        <p className="text-xs text-yellow-500 mt-2">
                          ⚠️ Sem dados de conversas no período
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* 5 Pillars */}
                  <div className="lg:col-span-2 grid grid-cols-5 gap-4">
                    {[
                      { label: 'Performance', score: aggregatedMetrics.performanceScore, weight: '25%', icon: Zap },
                      { label: 'Qualidade', score: aggregatedMetrics.qualityScore, weight: '25%', icon: Target },
                      { label: 'Segurança', score: aggregatedMetrics.securityScore, weight: '20%', icon: Shield },
                      { label: 'Estabilidade', score: aggregatedMetrics.stabilityScore, weight: '15%', icon: Activity },
                      { label: 'Engajamento', score: aggregatedMetrics.engagementScore, weight: '15%', icon: Users }
                    ].map((pillar, i) => (
                      <div key={i} className="text-center">
                        <pillar.icon className={`h-6 w-6 mx-auto mb-2 ${getHealthClassification(pillar.score).color}`} />
                        <p className={`text-2xl font-bold ${getHealthClassification(pillar.score).color}`}>
                          {pillar.score || '--'}
                        </p>
                        <p className="text-xs text-muted-foreground">{pillar.label}</p>
                        <p className="text-[10px] text-muted-foreground/60">Peso: {pillar.weight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Insights */}
            {insights.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                    Insights Automáticos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {insights.map((insight, i) => (
                      <div 
                        key={i} 
                        className={`p-3 rounded-lg border flex items-start gap-3 ${
                          insight.type === 'success' ? 'bg-green-500/10 border-green-500/20' :
                          insight.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20' :
                          insight.type === 'danger' ? 'bg-red-500/10 border-red-500/20' :
                          'bg-blue-500/10 border-blue-500/20'
                        }`}
                      >
                        <insight.icon className={`h-5 w-5 shrink-0 mt-0.5 ${
                          insight.type === 'success' ? 'text-green-500' :
                          insight.type === 'warning' ? 'text-yellow-500' :
                          insight.type === 'danger' ? 'text-red-500' :
                          'text-blue-500'
                        }`} />
                        <p className="text-sm">{insight.message}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="metrics">Métricas</TabsTrigger>
                <TabsTrigger value="charts">Gráficos</TabsTrigger>
                <TabsTrigger value="table">Tabela</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Volume Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <MessageSquare className="h-8 w-8 text-primary/60" />
                      </div>
                      <div className="mt-3">
                        <p className="text-2xl font-bold">{aggregatedMetrics.conversationsStarted}</p>
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
                        <p className="text-2xl font-bold">{aggregatedMetrics.messagesSent}</p>
                        <p className="text-sm text-muted-foreground">Mensagens Enviadas</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <Target className="h-8 w-8 text-green-500/60" />
                      </div>
                      <div className="mt-3">
                        <p className="text-2xl font-bold">{aggregatedMetrics.messagesReceived}</p>
                        <p className="text-sm text-muted-foreground">Mensagens Recebidas</p>
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
                          {aggregatedMetrics.avgResponseTime > 0 ? `${aggregatedMetrics.avgResponseTime}s` : '--'}
                        </p>
                        <p className="text-sm text-muted-foreground">Tempo Médio Resposta</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Quality Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-sm text-muted-foreground mb-2">Taxa de Encerramento Auto.</p>
                      <p className={`text-3xl font-bold ${aggregatedMetrics.autoClosureRate >= 70 ? 'text-green-500' : aggregatedMetrics.autoClosureRate >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {aggregatedMetrics.autoClosureRate}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">Ideal: ≥70%</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-sm text-muted-foreground mb-2">Taxa de Escalonamento</p>
                      <p className={`text-3xl font-bold ${aggregatedMetrics.escalationRate <= 20 ? 'text-green-500' : aggregatedMetrics.escalationRate <= 30 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {aggregatedMetrics.escalationRate}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">Ideal: ≤20%</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-sm text-muted-foreground mb-2">Taxa de Erro da IA</p>
                      <p className={`text-3xl font-bold ${aggregatedMetrics.errorRate <= 2 ? 'text-green-500' : aggregatedMetrics.errorRate <= 5 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {aggregatedMetrics.errorRate}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">Ideal: ≤2%</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-sm text-muted-foreground mb-2">Mensagens Repetidas</p>
                      <p className={`text-3xl font-bold ${aggregatedMetrics.repeatedMessagesRate <= 10 ? 'text-green-500' : aggregatedMetrics.repeatedMessagesRate <= 15 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {aggregatedMetrics.repeatedMessagesRate}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">Ideal: ≤10%</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Health Score Timeline */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Score de Saúde ao Longo do Tempo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {hasConversations ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <LineChart data={dailyMetrics}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 100]} className="text-xs" />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                            <Line 
                              type="monotone" 
                              dataKey="healthScore" 
                              stroke="#22c55e" 
                              strokeWidth={2}
                              dot={{ fill: '#22c55e' }}
                              name="Score"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                          <p>Sem dados de conversas no período</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Status Distribution */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Distribuição de Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {statusDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={statusDistribution}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={2}
                            >
                              {statusDistribution.map((entry, index) => (
                                <Cell key={index} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                          <p>Sem dados de status</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Metrics Tab */}
              <TabsContent value="metrics" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Time Metrics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Métricas de Tempo</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">Tempo Médio de Resposta (TMR)</p>
                          <p className="text-xs text-muted-foreground">Entre mensagem do lead e resposta do agente</p>
                        </div>
                        <p className="text-2xl font-bold">
                          {aggregatedMetrics.avgResponseTime > 0 ? `${aggregatedMetrics.avgResponseTime}s` : '--'}
                        </p>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">Tempo Médio até Encerramento</p>
                          <p className="text-xs text-muted-foreground">Entre primeira e última mensagem</p>
                        </div>
                        <p className="text-2xl font-bold">
                          {aggregatedMetrics.avgTimeToClose > 0 ? `${aggregatedMetrics.avgTimeToClose}min` : '--'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quality Metrics Detail */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Métricas de Qualidade</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">Taxa de Resposta do Agente</p>
                          <p className="text-xs text-muted-foreground">(Respondidas ÷ Recebidas) × 100</p>
                        </div>
                        <p className="text-2xl font-bold">
                          {filteredMetrics.length > 0 
                            ? Math.round(filteredMetrics.reduce((s, m) => s + m.responseRate, 0) / filteredMetrics.length) 
                            : 0}%
                        </p>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">Taxa de Encerramento Automático</p>
                          <p className="text-xs text-muted-foreground">(Sem humano ÷ Iniciadas) × 100</p>
                        </div>
                        <p className="text-2xl font-bold">{aggregatedMetrics.autoClosureRate}%</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Risk Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-5 w-5 text-orange-500" />
                      Métricas de Erro e Risco
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Taxa de Erro da IA</p>
                        <p className={`text-3xl font-bold mt-1 ${aggregatedMetrics.errorRate <= 2 ? 'text-green-500' : 'text-red-500'}`}>
                          {aggregatedMetrics.errorRate}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">Fallbacks e respostas inválidas</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Palavras Sensíveis</p>
                        <p className={`text-3xl font-bold mt-1 ${aggregatedMetrics.sensitiveWordsCount === 0 ? 'text-green-500' : 'text-orange-500'}`}>
                          {aggregatedMetrics.sensitiveWordsCount}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">Spam, bloqueio, denúncia...</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Mensagens Repetidas</p>
                        <p className={`text-3xl font-bold mt-1 ${aggregatedMetrics.repeatedMessagesRate <= 10 ? 'text-green-500' : 'text-red-500'}`}>
                          {aggregatedMetrics.repeatedMessagesRate}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">Similaridade &gt;85%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Charts Tab */}
              <TabsContent value="charts" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Agent Comparison */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Comparação de Score entre Agentes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {agentMetrics.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={agentMetrics} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis type="number" domain={[0, 100]} />
                            <YAxis dataKey="agentName" type="category" width={100} tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                            <Bar dataKey="healthScore" name="Score" radius={[0, 4, 4, 0]}>
                              {agentMetrics.map((entry, index) => (
                                <Cell 
                                  key={index} 
                                  fill={
                                    entry.healthScore >= 90 ? '#22c55e' :
                                    entry.healthScore >= 70 ? '#3b82f6' :
                                    entry.healthScore >= 50 ? '#eab308' : '#ef4444'
                                  } 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                          <p>Nenhum agente configurado</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Funnel */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Funil de Conversas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {hasConversations ? (
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={funnelData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                            <Bar dataKey="value" name="Quantidade">
                              {funnelData.map((entry, index) => (
                                <Cell key={index} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                          <p>Sem dados de conversas</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Heatmap */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Horários com Maior Taxa de Erro/Escalonamento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={heatmapData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                        <YAxis />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                        <Legend />
                        <Bar dataKey="escalations" name="Escalonamentos" fill="#f59e0b" />
                        <Bar dataKey="errors" name="Erros" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Daily Trends */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Conversas por Dia</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={dailyMetrics}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                        <Legend />
                        <Area type="monotone" dataKey="conversationsStarted" name="Conversas" fill="#22c55e" fillOpacity={0.3} stroke="#22c55e" />
                        <Area type="monotone" dataKey="messagesSent" name="Enviadas" fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Table Tab */}
              <TabsContent value="table">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Relatório Tabular</CardTitle>
                    <CardDescription>Dados detalhados por agente - Exportável em CSV e Excel</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Agente</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Conversas</TableHead>
                            <TableHead className="text-right">Score</TableHead>
                            <TableHead className="text-right">Encerramento</TableHead>
                            <TableHead className="text-right">Escalonamento</TableHead>
                            <TableHead className="text-right">Erros</TableHead>
                            <TableHead className="text-right">Repetidas</TableHead>
                            <TableHead>Classificação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {agentMetrics.length > 0 ? (
                            agentMetrics.map(metric => {
                              const status = getHealthClassification(metric.healthScore);
                              return (
                                <TableRow key={metric.agentId}>
                                  <TableCell className="font-medium">{metric.agentName}</TableCell>
                                  <TableCell>
                                    <Badge variant={metric.agentStatus === 'active' ? 'default' : 'secondary'}>
                                      {metric.agentStatus === 'active' ? 'Ativo' : 'Pausado'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">{metric.conversationsStarted}</TableCell>
                                  <TableCell className="text-right">
                                    <span className={`font-bold ${status.color}`}>{metric.healthScore}</span>
                                  </TableCell>
                                  <TableCell className="text-right">{metric.autoClosureRate}%</TableCell>
                                  <TableCell className="text-right">{metric.escalationRate}%</TableCell>
                                  <TableCell className="text-right">{metric.errorRate}%</TableCell>
                                  <TableCell className="text-right">{metric.repeatedMessagesRate}%</TableCell>
                                  <TableCell>
                                    <Badge className={`${status.bgColor} text-white`}>
                                      {status.label}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                                Nenhum agente configurado
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
