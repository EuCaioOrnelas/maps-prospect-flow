import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { Link } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

// Email autorizado para acessar o admin (não conta no MRR)
const ADMIN_EMAIL = "caiowiize@gmail.com";

// Preços dos planos para cálculo de MRR
const PLAN_PRICES: { [key: string]: number } = {
  free: 0,
  start: 97,
  growth: 247,
  scale: 497,
};

const PLAN_COLORS: { [key: string]: string } = {
  free: '#6b7280',
  start: '#3b82f6',
  growth: '#8b5cf6',
  scale: '#f59e0b',
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

interface ApiStatus {
  serpApi: {
    status: 'ok' | 'warning' | 'error';
    message: string;
    lastCheck: Date;
    errorCount: number;
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
  const [apiStatus, setApiStatus] = useState<ApiStatus>({
    serpApi: { status: 'ok', message: 'Verificando...', lastCheck: new Date(), errorCount: 0 },
    evolutionApi: { status: 'ok', message: 'Verificando...', lastCheck: new Date(), errorCount: 0 },
  });
  const [revenueHistory, setRevenueHistory] = useState<{ date: string; mrr: number; users: number }[]>([]);

  // Monitoramento automático das APIs
  const checkApiStatus = useCallback(async () => {
    // Check SerpAPI by making a test call
    try {
      const serpResponse = await supabase.functions.invoke('search-leads', {
        body: { keyword: 'test', location: 'test', dryRun: true },
      });
      
      if (serpResponse.error) {
        setApiStatus(prev => ({
          ...prev,
          serpApi: {
            status: prev.serpApi.errorCount >= 2 ? 'error' : 'warning',
            message: serpResponse.error.message || 'Erro na API',
            lastCheck: new Date(),
            errorCount: prev.serpApi.errorCount + 1,
          }
        }));
        
        if (apiStatus.serpApi.errorCount >= 2) {
          toast({
            title: "⚠️ Alerta SerpAPI",
            description: "A API de buscas está com problemas. Considere verificar o saldo ou fazer upgrade.",
            variant: "destructive",
          });
        }
      } else {
        setApiStatus(prev => ({
          ...prev,
          serpApi: {
            status: 'ok',
            message: 'Funcionando normalmente',
            lastCheck: new Date(),
            errorCount: 0,
          }
        }));
      }
    } catch (error) {
      console.log('SerpAPI check skipped');
    }

    // Check Evolution API
    try {
      const evolutionResponse = await supabase.functions.invoke('evolution-check-status', {
        body: { instanceId: 'health-check' },
      });
      
      if (evolutionResponse.error && !evolutionResponse.error.message?.includes('not found')) {
        setApiStatus(prev => ({
          ...prev,
          evolutionApi: {
            status: prev.evolutionApi.errorCount >= 2 ? 'error' : 'warning',
            message: evolutionResponse.error.message || 'Erro na API',
            lastCheck: new Date(),
            errorCount: prev.evolutionApi.errorCount + 1,
          }
        }));
        
        if (apiStatus.evolutionApi.errorCount >= 2) {
          toast({
            title: "⚠️ Alerta Evolution API",
            description: "A API de WhatsApp está com problemas. A VPS pode estar sobrecarregada.",
            variant: "destructive",
          });
        }
      } else {
        setApiStatus(prev => ({
          ...prev,
          evolutionApi: {
            status: 'ok',
            message: 'Funcionando normalmente',
            lastCheck: new Date(),
            errorCount: 0,
          }
        }));
      }
    } catch (error) {
      console.log('Evolution API check skipped');
    }
  }, [toast, apiStatus.serpApi.errorCount, apiStatus.evolutionApi.errorCount]);

  useEffect(() => {
    checkAdminAndLoad();
  }, [user, profile]);

  // Monitoramento automático a cada 5 minutos
  useEffect(() => {
    if (isAdmin) {
      checkApiStatus();
      const interval = setInterval(checkApiStatus, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, checkApiStatus]);

  const checkAdminAndLoad = async () => {
    if (!user || !profile) {
      navigate("/login");
      return;
    }

    // Verificar se é o email autorizado
    if (profile.email !== ADMIN_EMAIL) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    setIsAdmin(true);
    await loadData();
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

      // Filtrar admin do cálculo de MRR
      const payingUsersData = usersData?.filter(u => u.email !== ADMIN_EMAIL) || [];

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
    <div className="min-h-screen bg-background">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className={`rounded-xl p-4 border ${getStatusColor(apiStatus.serpApi.status)} animate-fade-in`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Search size={18} />
                    <span className="font-semibold">SerpAPI (Buscas)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(apiStatus.serpApi.status)}
                    <span className="text-xs opacity-60">
                      {apiStatus.serpApi.lastCheck.toLocaleTimeString('pt-BR')}
                    </span>
                  </div>
                </div>
                <p className="text-sm opacity-80">{apiStatus.serpApi.message}</p>
                {apiStatus.serpApi.status !== 'ok' && (
                  <p className="text-xs mt-2 opacity-60">
                    ⚠️ Considere fazer upgrade do plano da API - {apiStatus.serpApi.errorCount} erros detectados
                  </p>
                )}
              </div>

              <div className={`rounded-xl p-4 border ${getStatusColor(apiStatus.evolutionApi.status)} animate-fade-in`} style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Server size={18} />
                    <span className="font-semibold">Evolution API (WhatsApp)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(apiStatus.evolutionApi.status)}
                    <span className="text-xs opacity-60">
                      {apiStatus.evolutionApi.lastCheck.toLocaleTimeString('pt-BR')}
                    </span>
                  </div>
                </div>
                <p className="text-sm opacity-80">{apiStatus.evolutionApi.message}</p>
                {apiStatus.evolutionApi.status !== 'ok' && (
                  <p className="text-xs mt-2 opacity-60">
                    ⚠️ VPS pode estar sobrecarregada - {apiStatus.evolutionApi.errorCount} erros detectados
                  </p>
                )}
              </div>
            </div>

            {/* Financial Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <DollarSign size={20} className="text-success" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-success">
                  R$ {stats?.mrr.toLocaleString('pt-BR') || 0}
                </p>
                <p className="text-sm text-muted-foreground">MRR (Receita Mensal)</p>
              </div>

              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Crown size={20} className="text-primary" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold">{stats?.payingUsers || 0}</p>
                <p className="text-sm text-muted-foreground">Usuários Pagantes</p>
              </div>

              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Zap size={20} className="text-primary" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold">{stats?.activeUsers7Days || 0}</p>
                <p className="text-sm text-muted-foreground">Ativos (7 dias)</p>
              </div>

              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar size={20} className="text-primary" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold">{stats?.activeUsers30Days || 0}</p>
                <p className="text-sm text-muted-foreground">Ativos (30 dias)</p>
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.5s' }}>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={20} className="text-primary" />
                  <h2 className="font-display font-semibold">Evolução do MRR (7 dias)</h2>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueHistory}>
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
                  {stats?.activationRate.toFixed(1) || 0}%
                </p>
                <p className="text-sm text-muted-foreground">Taxa de Ativação</p>
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
                        <TableRow key={u.id} className={u.email === ADMIN_EMAIL ? 'bg-primary/5' : ''}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div>
                                <p className="font-medium">{u.name || '-'}</p>
                                <p className="text-sm text-muted-foreground">{u.email}</p>
                              </div>
                              {u.email === ADMIN_EMAIL && (
                                <Crown size={14} className="text-primary" />
                              )}
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
          </>
        )}
      </main>
    </div>
  );
};

export default Admin;
