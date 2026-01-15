import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Search,
  BarChart3,
  LogOut,
  ArrowLeft,
  Loader2,
  Crown,
  TrendingUp,
  Activity,
  RefreshCw,
  DollarSign,
  AlertTriangle,
  Server,
  Zap,
  Calendar,
  CheckCircle2,
  XCircle,
  Key,
  LayoutDashboard,
  Bug,
  Bell,
} from "lucide-react";
import { Link } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { SubscriptionEventsLog } from "@/components/admin/SubscriptionEventsLog";
import { PhoneCleanupTool } from "@/components/admin/PhoneCleanupTool";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";

// Função para verificar admin via banco de dados (seguro)
// Preços dos planos (fallback caso Stripe falhe)
const PLAN_PRICES: { [key: string]: number } = {
  free: 0,
  start: 197,
  growth: 497,
  scale: 897,
};

// Função para verificar admin via banco de dados (seguro)
const checkIsAdmin = async (): Promise<boolean> => {
  const { data, error } = await supabase.rpc('is_current_user_admin');
  if (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
  return data === true;
};

const PLAN_COLORS: { [key: string]: string } = {
  free: '#6b7280',
  start: '#3b82f6',
  growth: '#8b5cf6',
  scale: '#f59e0b',
};

const monthKeyToLocalDate = (monthKey: string) => {
  const [y, m] = monthKey.split('-');
  return new Date(Number(y), Number(m) - 1, 1);
};

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  searches_used: number;
  searches_limit: number;
  plan: string;
  created_at: string;
  updated_at: string;
}

interface StripeMRRData {
  totalMRR: number;
  activeSubscriptions: number;
  totalRefunded: number;
  refundCount: number;
  canceledSubscriptions: number;
  churnRate: number;
  monthlyMRR: Array<{ month: string; mrr: number }>;
}

interface SalesChartData {
  month: string;
  newSales: number;
  upgrades: number;
  cancellations: number;
  salesValue: number;
  refundValue: number;
}

type ChartPeriodFilter = '1m' | '3m' | '6m' | '12m' | 'year' | 'all';

interface Stats {
  totalUsers: number;
  totalSearches: number;
  activeUsers: number;
  activeUsers7Days: number;
  activeUsers30Days: number;
  planDistribution: { plan: string; count: number; revenue: number }[];
  mrr: number;
  activationRate: number;
  payingUsers: number;
}

interface ApiKeyStatus {
  name: string;
  status: 'ok' | 'warning' | 'error' | 'unknown' | 'exhausted' | 'not_configured';
  message: string;
}

interface ApiStatus {
  serpApi: {
    status: 'ok' | 'warning' | 'error';
    message: string;
    lastCheck: Date;
    errorCount: number;
    keys: ApiKeyStatus[];
  };
  evolutionApi: {
    status: 'ok' | 'warning' | 'error';
    message: string;
    lastCheck: Date;
    errorCount: number;
  };
}

const Admin = () => {
  const { user, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [stripeMRR, setStripeMRR] = useState<StripeMRRData | null>(null);
  const [loadingMRR, setLoadingMRR] = useState(false);
  const [stripeMRRError, setStripeMRRError] = useState<string | null>(null);
  const [salesChartData, setSalesChartData] = useState<SalesChartData[]>([]);
  const [allSalesEvents, setAllSalesEvents] = useState<any[]>([]);
  const [loadingSalesChart, setLoadingSalesChart] = useState(false);
  const [chartPeriodFilter, setChartPeriodFilter] = useState<ChartPeriodFilter>('6m');
  const [apiStatus, setApiStatus] = useState<ApiStatus>({
    serpApi: { 
      status: 'ok', 
      message: 'Funcionando normalmente', 
      lastCheck: new Date(), 
      errorCount: 0,
      keys: [
        { name: 'Chave 1 (Principal)', status: 'unknown', message: 'Não verificada' },
        { name: 'Chave 2 (Backup)', status: 'unknown', message: 'Não verificada' },
        { name: 'Chave 3 (Backup)', status: 'unknown', message: 'Não verificada' },
        { name: 'Chave 4 (Backup)', status: 'unknown', message: 'Não verificada' },
      ]
    },
    evolutionApi: { status: 'ok', message: 'Funcionando normalmente', lastCheck: new Date(), errorCount: 0 },
  });
  const [revenueHistory, setRevenueHistory] = useState<{ date: string; mrr: number; users: number }[]>([]);
  const [checkingApis, setCheckingApis] = useState(false);

  // Fetch real MRR from Stripe
  const loadStripeMRR = useCallback(async () => {
    setLoadingMRR(true);
    setStripeMRRError(null);
    try {
      const { data, error } = await supabase.functions.invoke('get-stripe-mrr');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setStripeMRR(data);
    } catch (error) {
      console.error('Error loading Stripe MRR:', error);
      setStripeMRRError(error instanceof Error ? error.message : 'Erro ao carregar MRR');
      // Set empty data when Stripe fails - don't use database fallback
      setStripeMRR({ totalMRR: 0, activeSubscriptions: 0, totalRefunded: 0, refundCount: 0, canceledSubscriptions: 0, churnRate: 0, monthlyMRR: [] });
    } finally {
      setLoadingMRR(false);
    }
  }, []);

  // Fetch sales chart data from subscription_events table
  const loadSalesChartData = useCallback(async () => {
    setLoadingSalesChart(true);
    try {
      // Get all subscription events (we'll filter by period in memory)
      const { data: events, error } = await supabase
        .from('subscription_events')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      setAllSalesEvents(events || []);
    } catch (error) {
      console.error('Error loading sales chart data:', error);
      setAllSalesEvents([]);
    } finally {
      setLoadingSalesChart(false);
    }
  }, []);

  // Process sales events based on period filter
  const processedSalesChartData = useMemo(() => {
    if (!allSalesEvents.length) return [];

    // Calculate date range based on filter
    const now = new Date();
    let startDate: Date;
    
    switch (chartPeriodFilter) {
      case '1m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      case '3m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case '6m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case '12m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 12, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1); // Jan 1 of current year
        break;
      case 'all':
      default:
        startDate = new Date(2024, 0, 1); // Start from 2024
        break;
    }

    // Filter events by date
    const filteredEvents = allSalesEvents.filter(event => 
      new Date(event.created_at) >= startDate
    );

    // Group events by month
    const monthlyData: { [month: string]: { newSales: number; upgrades: number; cancellations: number; salesValue: number; refundValue: number } } = {};
    
    for (const event of filteredEvents) {
      const eventDate = new Date(event.created_at);
      const monthKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { newSales: 0, upgrades: 0, cancellations: 0, salesValue: 0, refundValue: 0 };
      }
      
      // Categorize events based on actual event_type from webhook
      const eventType = event.event_type?.toLowerCase();
      const previousPlan = event.previous_plan?.toLowerCase();
      const newPlan = event.new_plan?.toLowerCase();
      
      // Get plan price for value calculation
      const planPrice = PLAN_PRICES[newPlan] || 0;
      
      if (eventType === 'checkout_completed') {
        // Check if it's a new sale or upgrade
        if (!previousPlan || previousPlan === 'free') {
          // New sale (from free or no previous plan)
          monthlyData[monthKey].newSales++;
          monthlyData[monthKey].salesValue += planPrice;
        } else if (previousPlan !== newPlan) {
          // Upgrade (from another paid plan to a different plan)
          monthlyData[monthKey].upgrades++;
          // Add the difference in plan prices for upgrades
          const previousPrice = PLAN_PRICES[previousPlan] || 0;
          monthlyData[monthKey].salesValue += Math.max(0, planPrice - previousPrice);
        }
      } else if (eventType === 'subscription_upgrade') {
        monthlyData[monthKey].upgrades++;
        const previousPrice = PLAN_PRICES[previousPlan] || 0;
        monthlyData[monthKey].salesValue += Math.max(0, planPrice - previousPrice);
      } else if (
        eventType === 'subscription_deleted' || 
        eventType === 'subscription_canceled' ||
        (eventType === 'subscription_updated' && newPlan === 'free')
      ) {
        // Cancellation
        monthlyData[monthKey].cancellations++;
      } else if (eventType === 'refund' || eventType === 'charge_refunded') {
        // Refund - get amount from metadata if available
        const refundAmount = event.metadata?.amount || PLAN_PRICES[previousPlan] || PLAN_PRICES[newPlan] || 0;
        monthlyData[monthKey].refundValue += refundAmount;
      }
    }
    
    // Convert to array and sort by month
    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        ...data
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [allSalesEvents, chartPeriodFilter]);

  // Process churn data by reason
  const churnByReasonData = useMemo(() => {
    if (!allSalesEvents.length) return [];

    // Calculate date range based on filter (same as sales)
    const now = new Date();
    let startDate: Date;
    
    switch (chartPeriodFilter) {
      case '1m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      case '3m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case '6m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case '12m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 12, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all':
      default:
        startDate = new Date(2024, 0, 1);
        break;
    }

    // Filter events by date
    const filteredEvents = allSalesEvents.filter(event => 
      new Date(event.created_at) >= startDate
    );

    // Churn reasons counters
    const churnReasons: { [key: string]: number } = {
      canceled: 0,
      deleted: 0,
      past_due: 0,
      unpaid: 0,
    };

    for (const event of filteredEvents) {
      const eventType = event.event_type?.toLowerCase() || '';
      
      if (eventType === 'subscription_canceled') {
        churnReasons.canceled++;
      } else if (eventType === 'subscription_deleted') {
        churnReasons.deleted++;
      } else if (eventType === 'subscription_past_due') {
        churnReasons.past_due++;
      } else if (eventType === 'subscription_unpaid') {
        churnReasons.unpaid++;
      }
    }

    // Map to readable labels and colors
    const churnData = [
      { name: 'Cancelado', value: churnReasons.canceled, color: '#ef4444' },
      { name: 'Deletado', value: churnReasons.deleted, color: '#f97316' },
      { name: 'Pagamento Atrasado', value: churnReasons.past_due, color: '#eab308' },
      { name: 'Não Pago', value: churnReasons.unpaid, color: '#6b7280' },
    ].filter(item => item.value > 0);

    return churnData;
  }, [allSalesEvents, chartPeriodFilter]);

  // Filter MRR data by period
  const filteredMRRData = useMemo(() => {
    if (!stripeMRR?.monthlyMRR?.length) return [];

    const now = new Date();
    let startDate: Date;
    
    switch (chartPeriodFilter) {
      case '1m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      case '3m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case '6m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case '12m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 12, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all':
      default:
        startDate = new Date(2024, 0, 1);
        break;
    }

    return stripeMRR.monthlyMRR.filter(item => {
      const itemDate = monthKeyToLocalDate(item.month);
      return itemDate >= startDate;
    });
  }, [stripeMRR?.monthlyMRR, chartPeriodFilter]);

  // Load API key status from database
  const loadApiKeyStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('api_key_status')
        .select('*')
        .order('key_index', { ascending: true });
      
      if (error) {
        console.error('Error loading API key status:', error);
        return;
      }
      
      if (data && data.length > 0) {
        const keys: ApiKeyStatus[] = data.map(item => ({
          name: `Chave ${item.key_index} ${item.key_index === 1 ? '(Principal)' : '(Backup)'}`,
          status: item.status as 'ok' | 'warning' | 'error' | 'unknown',
          message: item.message || 'Status desconhecido',
        }));
        
        // Calculate overall status
        const okCount = keys.filter(k => k.status === 'ok').length;
        const errorCount = keys.filter(k => k.status === 'error' || k.status === 'exhausted').length;
        
        let overallStatus: 'ok' | 'warning' | 'error' = 'ok';
        let overallMessage = 'Funcionando normalmente';
        
        if (okCount === 0) {
          overallStatus = 'error';
          overallMessage = 'Todas as chaves indisponíveis!';
        } else if (errorCount > 0) {
          overallStatus = 'warning';
          overallMessage = `${okCount} chave(s) funcionando`;
        }
        
        const lastCheck = data[0]?.last_checked_at ? new Date(data[0].last_checked_at) : new Date();
        
        setApiStatus(prev => ({
          ...prev,
          serpApi: {
            ...prev.serpApi,
            status: overallStatus,
            message: overallMessage,
            lastCheck,
            keys,
          }
        }));
      }
    } catch (error) {
      console.error('Error loading API key status:', error);
    }
  }, []);

  // Run the check-serp-keys edge function
  const runKeyCheck = useCallback(async () => {
    setCheckingApis(true);
    
    try {
      setApiStatus(prev => ({
        ...prev,
        serpApi: {
          ...prev.serpApi,
          message: 'Verificando chaves...',
        }
      }));
      
      const { data, error } = await supabase.functions.invoke('check-serp-keys');
      
      if (error) {
        throw error;
      }
      
      if (data?.success) {
        toast({
          title: "Verificação concluída",
          description: data.overallMessage,
        });
        
        // Reload status from database
        await loadApiKeyStatus();
      } else {
        throw new Error(data?.error || 'Erro na verificação');
      }
    } catch (error) {
      console.error('Error checking keys:', error);
      toast({
        title: "Erro na verificação",
        description: "Não foi possível verificar as chaves",
        variant: "destructive",
      });
    } finally {
      setCheckingApis(false);
    }
  }, [toast, loadApiKeyStatus]);

  // Monitoramento manual das APIs
  const checkApiStatus = useCallback(async () => {
    setCheckingApis(true);
    
    // Run the edge function to check SerpAPI keys
    await runKeyCheck();
    
    // Check Evolution API - verificar números conectados
    try {
      setApiStatus(prev => ({
        ...prev,
        evolutionApi: {
          ...prev.evolutionApi,
          message: 'Verificando...',
          lastCheck: new Date(),
        }
      }));
      
      // Verificar se há números WhatsApp conectados no banco
      const { data: connectedNumbers, error: numbersError } = await supabase
        .from('whatsapp_numbers')
        .select('id, is_connected')
        .eq('is_connected', true)
        .limit(10);
      
      if (!numbersError) {
        const connectedCount = connectedNumbers?.length || 0;
        setApiStatus(prev => ({
          ...prev,
          evolutionApi: {
            status: 'ok',
            message: connectedCount > 0 
              ? `${connectedCount} número(s) conectado(s)` 
              : 'Nenhum número conectado',
            lastCheck: new Date(),
            errorCount: 0,
          }
        }));
      } else {
        setApiStatus(prev => ({
          ...prev,
          evolutionApi: {
            status: 'warning',
            message: 'Erro ao verificar números',
            lastCheck: new Date(),
            errorCount: prev.evolutionApi.errorCount + 1,
          }
        }));
      }
    } catch (error) {
      console.log('Evolution API check error:', error);
      setApiStatus(prev => ({
        ...prev,
        evolutionApi: {
          status: 'warning',
          message: 'Não foi possível verificar',
          lastCheck: new Date(),
          errorCount: prev.evolutionApi.errorCount + 1,
        }
      }));
    }
    
    setCheckingApis(false);
  }, [runKeyCheck]);

  useEffect(() => {
    checkAdminAndLoad();
  }, [user, profile]);

  // Não fazer monitoramento automático para evitar falsos positivos
  // O admin pode verificar manualmente clicando no botão de refresh

  const checkAdminAndLoad = async () => {
    if (!user || !profile) {
      navigate("/login");
      return;
    }

    // Verificar admin status via banco de dados (seguro contra manipulação)
    const isAdminUser = await checkIsAdmin();
    
    if (!isAdminUser) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    setIsAdmin(true);
    await Promise.all([loadData(), loadApiKeyStatus(), loadStripeMRR(), loadSalesChartData()]);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData || []);

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Filtrar admins do cálculo de MRR (usuários com role admin)
      // Para simplificar, filtrar quem tem plano free como indicador
      const payingUsersData = usersData?.filter(u => u.plan !== 'free') || [];

      // Calculate stats
      const totalUsers = usersData?.length || 0;
      const totalSearches = usersData?.reduce((acc, u) => acc + u.searches_used, 0) || 0;
      const activeUsers = usersData?.filter(u => u.searches_used > 0).length || 0;
      
      // Usuários ativos nos últimos 7 dias
      const activeUsers7Days = usersData?.filter(u => 
        new Date(u.updated_at) >= sevenDaysAgo && u.searches_used > 0
      ).length || 0;
      
      // Usuários ativos nos últimos 30 dias
      const activeUsers30Days = usersData?.filter(u => 
        new Date(u.updated_at) >= thirtyDaysAgo && u.searches_used > 0
      ).length || 0;
      
      // Calcular MRR (excluindo admin)
      const mrr = payingUsersData.reduce((acc, u) => acc + (PLAN_PRICES[u.plan] || 0), 0);
      
      // Usuários pagantes (excluindo admin)
      const payingUsers = payingUsersData.filter(u => u.plan !== 'free').length;
      
      // Taxa de ativação
      const activationRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
      
      // Distribuição de planos (excluindo admin)
      const planCounts: { [key: string]: { count: number; revenue: number } } = {};
      payingUsersData.forEach(u => {
        if (!planCounts[u.plan]) {
          planCounts[u.plan] = { count: 0, revenue: 0 };
        }
        planCounts[u.plan].count += 1;
        planCounts[u.plan].revenue += PLAN_PRICES[u.plan] || 0;
      });
      const planDistribution = Object.entries(planCounts).map(([plan, data]) => ({ 
        plan, 
        count: data.count,
        revenue: data.revenue 
      }));

      // Simular histórico de MRR (últimos 7 dias)
      const revenueHistoryData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        
        // Calcular MRR baseado em usuários criados até aquela data
        const usersUntilDate = payingUsersData.filter(u => 
          new Date(u.created_at) <= date
        );
        const mrrAtDate = usersUntilDate.reduce((acc, u) => acc + (PLAN_PRICES[u.plan] || 0), 0);
        
        revenueHistoryData.push({
          date: dateStr,
          mrr: mrrAtDate,
          users: usersUntilDate.filter(u => u.plan !== 'free').length,
        });
      }
      setRevenueHistory(revenueHistoryData);

      setStats({
        totalUsers,
        totalSearches,
        activeUsers,
        activeUsers7Days,
        activeUsers30Days,
        planDistribution,
        mrr,
        activationRate,
        payingUsers,
      });
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do painel.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserPlan = async (userId: string, newPlan: string) => {
    setUpdating(userId);
    try {
      const limits: { [key: string]: number } = {
        free: 10,
        start: 200,
        growth: 600,
        scale: 1200,
      };

      const { error } = await supabase
        .from('profiles')
        .update({ 
          plan: newPlan,
          searches_limit: limits[newPlan] || 10,
          searches_used: 0,
        })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Plano atualizado",
        description: `Plano alterado para ${newPlan.toUpperCase()} e buscas resetadas`,
      });

      await loadData();
    } catch (error) {
      console.error('Error updating plan:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o plano.",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const resetUserSearches = async (userId: string) => {
    setUpdating(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ searches_used: 0 })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Buscas resetadas",
        description: "Contador de buscas zerado com sucesso.",
      });

      await loadData();
    } catch (error) {
      console.error('Error resetting searches:', error);
      toast({
        title: "Erro ao resetar",
        description: "Não foi possível resetar as buscas.",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'scale': return 'bg-purple-500/20 text-purple-400';
      case 'growth': return 'bg-primary/20 text-primary';
      case 'start': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: 'ok' | 'warning' | 'error') => {
    switch (status) {
      case 'ok': return 'bg-success/20 text-success border-success/30';
      case 'warning': return 'bg-warning/20 text-warning border-warning/30';
      case 'error': return 'bg-destructive/20 text-destructive border-destructive/30';
    }
  };

  const getStatusIcon = (status: 'ok' | 'warning' | 'error') => {
    switch (status) {
      case 'ok': return <CheckCircle2 size={16} />;
      case 'warning': return <AlertTriangle size={16} />;
      case 'error': return <XCircle size={16} />;
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={40} className="text-primary animate-spin" />
      </div>
    );
  }

  const pieData = stats?.planDistribution.map(item => ({
    name: item.plan.charAt(0).toUpperCase() + item.plan.slice(1),
    value: item.count,
    revenue: item.revenue,
  })) || [];

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background Glows */}
      <BackgroundGlow />
      
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo size="md" />
              <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Crown size={14} />
                Admin
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <Link to="/admin/announcements">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Bell size={16} />
                  <span className="hidden sm:inline">Avisos</span>
                </Button>
              </Link>
              <Link to="/admin/landing-pages">
                <Button variant="ghost" size="sm" className="gap-2">
                  <LayoutDashboard size={16} />
                  <span className="hidden sm:inline">Landing Pages</span>
                </Button>
              </Link>
              <Link to="/admin/insights">
                <Button variant="ghost" size="sm" className="gap-2">
                  <BarChart3 size={16} />
                  <span className="hidden sm:inline">Insights</span>
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft size={16} />
                  <span className="hidden sm:inline">Dashboard</span>
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut size={20} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-2">Painel Administrativo</h1>
          <p className="text-muted-foreground">Gerencie usuários, planos e acompanhe métricas</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={40} className="text-primary animate-spin" />
          </div>
        ) : (
          <>
            {/* API Status Cards */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold flex items-center gap-2">
                <Server size={20} className="text-primary" />
                Status das APIs
              </h2>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={checkApiStatus}
                disabled={checkingApis}
                className="gap-2"
              >
                {checkingApis ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                Verificar
              </Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
              {/* SerpAPI Status Card */}
              <div className={`rounded-xl p-4 border ${getStatusColor(apiStatus.serpApi.status)} animate-fade-in`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Search size={18} />
                    <span className="font-semibold">SerpAPI (Buscas)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(apiStatus.serpApi.status)}
                  </div>
                </div>
                <p className="text-sm opacity-80">{apiStatus.serpApi.message}</p>
                <p className="text-xs mt-2 opacity-50">
                  Última verificação: {apiStatus.serpApi.lastCheck.toLocaleTimeString('pt-BR')}
                </p>
              </div>

              {/* SerpAPI Keys Monitoring */}
              <div className="rounded-xl p-4 border border-border bg-card animate-fade-in" style={{ animationDelay: '0.05s' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Key size={18} className="text-primary" />
                  <span className="font-semibold">Chaves SerpAPI</span>
                  <span className="text-xs text-muted-foreground ml-auto">4 chaves configuradas</span>
                </div>
                <div className="space-y-2">
                  {apiStatus.serpApi.keys.map((key, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{key.name}</span>
                      <span className={`flex items-center gap-1 ${
                        key.status === 'ok' ? 'text-success' : 
                        key.status === 'error' || key.status === 'not_configured' ? 'text-destructive' : 
                        key.status === 'exhausted' ? 'text-warning' : 
                        key.status === 'warning' ? 'text-warning' : 
                        'text-muted-foreground'
                      }`}>
                        {key.status === 'ok' && <CheckCircle2 size={12} />}
                        {(key.status === 'error' || key.status === 'not_configured') && <XCircle size={12} />}
                        {(key.status === 'warning' || key.status === 'exhausted') && <AlertTriangle size={12} />}
                        {key.status === 'unknown' && <span className="w-2 h-2 rounded-full bg-muted-foreground" />}
                        <span className="text-xs">{key.message}</span>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Fallback automático ativado
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Verificado: {apiStatus.serpApi.lastCheck.toLocaleString('pt-BR', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>

              {/* Evolution API Status Card */}
              <div className={`rounded-xl p-4 border ${getStatusColor(apiStatus.evolutionApi.status)} animate-fade-in`} style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Server size={18} />
                    <span className="font-semibold">Evolution API (WhatsApp)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(apiStatus.evolutionApi.status)}
                  </div>
                </div>
                <p className="text-sm opacity-80">{apiStatus.evolutionApi.message}</p>
                <p className="text-xs mt-2 opacity-50">
                  Última verificação: {apiStatus.evolutionApi.lastCheck.toLocaleTimeString('pt-BR')}
                </p>
              </div>
            </div>

            {/* Financial Stats - Using Real Stripe MRR */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold flex items-center gap-2">
                <DollarSign size={20} className="text-success" />
                Métricas Financeiras (Stripe)
              </h2>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadStripeMRR}
                disabled={loadingMRR}
                className="gap-2"
              >
                {loadingMRR ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                Atualizar MRR
              </Button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <DollarSign size={20} className="text-success" />
                  </div>
                  {loadingMRR && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-success">
                  R$ {(stripeMRR?.totalMRR ?? 0).toLocaleString('pt-BR')}
                </p>
                <p className="text-sm text-muted-foreground">
                  MRR Líquido
                  {stripeMRR && !stripeMRRError && (
                    <span className="ml-1 text-xs text-success">✓</span>
                  )}
                </p>
              </div>

              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.15s' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Crown size={20} className="text-primary" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold">
                  {stripeMRR?.activeSubscriptions ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">
                  Assinantes Ativos
                </p>
              </div>

              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <XCircle size={20} className="text-destructive" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-destructive">
                  R$ {(stripeMRR?.totalRefunded ?? 0).toLocaleString('pt-BR')}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total Reembolsado ({stripeMRR?.refundCount ?? 0})
                </p>
              </div>

              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.25s' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <AlertTriangle size={20} className="text-warning" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-warning">
                  {stripeMRR?.churnRate ?? 0}%
                </p>
                <p className="text-sm text-muted-foreground">
                  Taxa de Cancelamento
                </p>
              </div>

              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                    <XCircle size={20} className="text-muted-foreground" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-muted-foreground">
                  {stripeMRR?.canceledSubscriptions ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">
                  Cancelamentos
                </p>
              </div>

            </div>

            {/* Period Filter */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold flex items-center gap-2">
                <Calendar size={20} className="text-primary" />
                Período de Análise
              </h2>
              <div className="flex gap-2">
                {[
                  { value: '1m', label: '1 Mês' },
                  { value: '3m', label: '3 Meses' },
                  { value: '6m', label: '6 Meses' },
                  { value: '12m', label: '12 Meses' },
                  { value: 'year', label: 'Este Ano' },
                  { value: 'all', label: 'Tudo' },
                ].map(option => (
                  <Button
                    key={option.value}
                    variant={chartPeriodFilter === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setChartPeriodFilter(option.value as ChartPeriodFilter)}
                    className="text-xs"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Sales/Upgrades/Cancellations Chart - Full Width */}
            <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in mb-8" style={{ animationDelay: '0.35s' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 size={20} className="text-primary" />
                  <h2 className="font-display font-semibold">Vendas, Upgrades e Cancelamentos por Mês</h2>
                  {loadingSalesChart && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadSalesChartData}
                  disabled={loadingSalesChart}
                  className="gap-2"
                >
                  {loadingSalesChart ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  Atualizar
                </Button>
              </div>
              
              {/* Summary Cards */}
              {processedSalesChartData.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  <div className="bg-success/10 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Total Vendas</p>
                    <p className="text-lg font-bold text-success">
                      R$ {processedSalesChartData.reduce((sum, item) => sum + item.salesValue, 0).toLocaleString('pt-BR')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {processedSalesChartData.reduce((sum, item) => sum + item.newSales + item.upgrades, 0)} transações
                    </p>
                  </div>
                  <div className="bg-destructive/10 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Total Reembolsos</p>
                    <p className="text-lg font-bold text-destructive">
                      R$ {processedSalesChartData.reduce((sum, item) => sum + item.refundValue, 0).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Novas Vendas</p>
                    <p className="text-lg font-bold">
                      {processedSalesChartData.reduce((sum, item) => sum + item.newSales, 0)}
                    </p>
                  </div>
                  <div className="bg-warning/10 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Cancelamentos</p>
                    <p className="text-lg font-bold text-warning">
                      {processedSalesChartData.reduce((sum, item) => sum + item.cancellations, 0)}
                    </p>
                  </div>
                </div>
              )}

              <div className="h-80">
                {processedSalesChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={processedSalesChartData.map(item => ({
                      ...item,
                      month: monthKeyToLocalDate(item.month).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                      <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `R$${value}`} />
                      <Tooltip 
                        cursor={{ fill: 'hsl(var(--background))', fillOpacity: 0 }}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number, name: string) => {
                          const labels: { [key: string]: string } = {
                            newSales: 'Novas Vendas',
                            upgrades: 'Upgrades',
                            cancellations: 'Cancelamentos',
                            salesValue: 'Valor em Vendas',
                            refundValue: 'Valor Reembolsado'
                          };
                          if (name === 'salesValue' || name === 'refundValue') {
                            return [`R$ ${value.toLocaleString('pt-BR')}`, labels[name] || name];
                          }
                          return [value, labels[name] || name];
                        }}
                      />
                      <Bar 
                        yAxisId="left"
                        dataKey="newSales" 
                        name="Novas Vendas"
                        fill="#22c55e" 
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        yAxisId="left"
                        dataKey="upgrades" 
                        name="Upgrades"
                        fill="#3b82f6" 
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        yAxisId="left"
                        dataKey="cancellations" 
                        name="Cancelamentos"
                        fill="#ef4444" 
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        yAxisId="right"
                        dataKey="salesValue" 
                        name="Valor em Vendas"
                        fill="#10b981" 
                        radius={[4, 4, 0, 0]}
                        opacity={0.6}
                      />
                      <Bar 
                        yAxisId="right"
                        dataKey="refundValue" 
                        name="Valor Reembolsado"
                        fill="#f43f5e" 
                        radius={[4, 4, 0, 0]}
                        opacity={0.6}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <p className="text-sm">Nenhum dado de vendas disponível</p>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-[#22c55e]" />
                  <span className="text-muted-foreground">Novas Vendas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-[#3b82f6]" />
                  <span className="text-muted-foreground">Upgrades</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-[#ef4444]" />
                  <span className="text-muted-foreground">Cancelamentos</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-[#10b981] opacity-60" />
                  <span className="text-muted-foreground">R$ Vendas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-[#f43f5e] opacity-60" />
                  <span className="text-muted-foreground">R$ Reembolsos</span>
                </div>
              </div>
            </div>

            {/* Activity Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 mb-8">
              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Zap size={20} className="text-primary" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold">{stats?.activeUsers7Days || 0}</p>
                <p className="text-sm text-muted-foreground">Ativos (7 dias)</p>
              </div>

              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.45s' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar size={20} className="text-primary" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold">{stats?.activeUsers30Days || 0}</p>
                <p className="text-sm text-muted-foreground">Ativos (30 dias)</p>
              </div>
            </div>

            {/* Revenue Chart - Using Stripe Monthly MRR */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.5s' }}>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={20} className="text-primary" />
                  <h2 className="font-display font-semibold">Evolução do MRR (Stripe)</h2>
                  {loadingMRR && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
                </div>
                <div className="h-64">
                  {filteredMRRData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={filteredMRRData.map(item => ({
                        date: monthKeyToLocalDate(item.month).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
                        mrr: item.mrr
                      }))}>
                        <defs>
                          <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `R$${value}`} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'MRR']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="mrr" 
                          stroke="hsl(var(--primary))" 
                          fillOpacity={1} 
                          fill="url(#colorMrr)" 
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      {stripeMRRError ? (
                        <p className="text-sm">Erro ao carregar dados do Stripe</p>
                      ) : (
                        <p className="text-sm">Nenhum dado de MRR disponível para o período</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.6s' }}>
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 size={20} className="text-primary" />
                  <h2 className="font-display font-semibold">Distribuição de Planos</h2>
                </div>
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PLAN_COLORS[entry.name.toLowerCase()] || '#8884d8'} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number, name: string, props: any) => [
                          `${value} usuários (R$ ${props.payload.revenue?.toLocaleString('pt-BR') || 0}/mês)`,
                          props.payload.name
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Churn by Reason Pie Chart */}
              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.65s' }}>
                <div className="flex items-center gap-2 mb-4">
                  <XCircle size={20} className="text-destructive" />
                  <h2 className="font-display font-semibold">Churn por Motivo</h2>
                </div>
                <div className="h-64 flex items-center justify-center">
                  {churnByReasonData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={churnByReasonData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {churnByReasonData.map((entry, index) => (
                            <Cell key={`churn-cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number, name: string, props: any) => [
                            `${value} cancelamento(s)`,
                            props.payload.name
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <p className="text-sm">Nenhum churn no período selecionado 🎉</p>
                    </div>
                  )}
                </div>
                {churnByReasonData.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-sm">
                    {churnByReasonData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground">{item.name} ({item.value})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* General Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.7s' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users size={20} className="text-primary" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold">{stats?.totalUsers || 0}</p>
                <p className="text-sm text-muted-foreground">Total de Usuários</p>
              </div>

              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.8s' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Search size={20} className="text-primary" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold">{stats?.totalSearches || 0}</p>
                <p className="text-sm text-muted-foreground">Buscas Realizadas</p>
              </div>

              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.9s' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Activity size={20} className="text-primary" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold">{stats?.activeUsers || 0}</p>
                <p className="text-sm text-muted-foreground">Usuários Ativos (total)</p>
              </div>

              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <TrendingUp size={20} className="text-primary" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold">
                  {stats?.totalUsers && (stripeMRR?.activeSubscriptions ?? 0) > 0 
                    ? (((stripeMRR?.activeSubscriptions ?? 0) / stats.totalUsers) * 100).toFixed(1)
                    : '0.0'}%
                </p>
                <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
              </div>
            </div>

            {/* Users Table */}
            <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '1.1s' }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Users size={20} className="text-primary" />
                  <h2 className="font-display font-semibold">Usuários</h2>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1 sm:w-64">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar usuário..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 bg-secondary"
                    />
                  </div>
                  <Button variant="outline" size="icon" onClick={loadData}>
                    <RefreshCw size={16} />
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="min-w-[800px] px-4 sm:px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Buscas</TableHead>
                        <TableHead>Cadastro</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div>
                                <p className="font-medium">{u.name || '-'}</p>
                                <p className="text-sm text-muted-foreground">{u.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={u.plan}
                              onValueChange={(value) => updateUserPlan(u.id, value)}
                              disabled={updating === u.id}
                            >
                              <SelectTrigger className={`w-28 ${getPlanBadgeColor(u.plan)}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free">Free</SelectItem>
                                <SelectItem value="start">Start</SelectItem>
                                <SelectItem value="growth">Growth</SelectItem>
                                <SelectItem value="scale">Scale</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{u.searches_used}</span>
                              <span className="text-muted-foreground">/ {u.searches_limit}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(u.created_at)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resetUserSearches(u.id)}
                              disabled={updating === u.id}
                            >
                              {updating === u.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                'Resetar'
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum usuário encontrado
                </div>
              )}
            </div>

            {/* Subscription Events Debug Log */}
            <div className="mt-8">
              <SubscriptionEventsLog />
            </div>

            {/* Phone Cleanup Tool */}
            <div className="mt-8">
              <PhoneCleanupTool />
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Admin;
