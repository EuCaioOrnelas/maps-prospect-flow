import { useState, useEffect } from "react";
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
  ArrowLeft,
  Loader2,
  Crown,
  TrendingUp,
  BarChart3,
  Download,
  Calendar,
  Target,
  Briefcase,
  MessageCircle,
  Star,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const ADMIN_EMAIL = "caiowiize@gmail.com";

interface OnboardingData {
  id: string;
  user_id: string;
  user_profile: string;
  service_types: string[];
  main_objective: string;
  team_size: string;
  previous_experience: string | null;
  previous_tool: string | null;
  skipped: boolean;
  created_at: string;
}

interface FeedbackData {
  id: string;
  user_id: string;
  experience_status: string;
  not_continue_reason: string | null;
  missing_features: string | null;
  nps_score: number | null;
  created_at: string;
}

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  plan: string;
}

const COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

const EXPERIENCE_LABELS: Record<string, string> = {
  will_subscribe: "Pretende assinar",
  liked_not_now: "Gostou, não é o momento",
  not_solved: "Não resolveu problema",
  too_complex: "Achou complexa",
  technical_issues: "Problemas técnicos",
  price_high: "Preço alto"
};

const UserInsights = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData[]>([]);
  const [feedbackData, setFeedbackData] = useState<FeedbackData[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  
  // Filters
  const [dateFilter, setDateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Pagination for responses
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    checkAdminAndLoad();
  }, [user, profile]);

  const checkAdminAndLoad = async () => {
    if (!user || !profile) {
      navigate("/login");
      return;
    }

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
      // Load onboarding data
      const { data: onboarding } = await supabase
        .from('user_onboarding')
        .select('*')
        .order('created_at', { ascending: false });

      // Load feedback data
      const { data: feedback } = await supabase
        .from('trial_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      // Load user profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, name, plan');

      const profilesMap: Record<string, UserProfile> = {};
      profiles?.forEach(p => {
        profilesMap[p.id] = p;
      });

      setOnboardingData(onboarding || []);
      setFeedbackData(feedback || []);
      setUserProfiles(profilesMap);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Erro ao carregar dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const getFilteredData = () => {
    let filteredOnboarding = [...onboardingData];
    let filteredFeedback = [...feedbackData];

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const filterDate = new Date();
      if (dateFilter === "7days") filterDate.setDate(now.getDate() - 7);
      if (dateFilter === "30days") filterDate.setDate(now.getDate() - 30);
      if (dateFilter === "90days") filterDate.setDate(now.getDate() - 90);

      filteredOnboarding = filteredOnboarding.filter(d => new Date(d.created_at) >= filterDate);
      filteredFeedback = filteredFeedback.filter(d => new Date(d.created_at) >= filterDate);
    }

    // Status filter for feedback
    if (statusFilter !== "all") {
      const convertedUserIds = new Set(
        filteredFeedback
          .filter(f => f.experience_status === "will_subscribe")
          .map(f => f.user_id)
      );
      
      if (statusFilter === "converted") {
        filteredFeedback = filteredFeedback.filter(f => convertedUserIds.has(f.user_id));
      } else if (statusFilter === "not_converted") {
        filteredFeedback = filteredFeedback.filter(f => !convertedUserIds.has(f.user_id));
      }
    }

    return { filteredOnboarding, filteredFeedback };
  };

  const { filteredOnboarding, filteredFeedback } = getFilteredData();

  // Profile distribution
  const profileDistribution = filteredOnboarding
    .filter(d => !d.skipped)
    .reduce((acc: Record<string, number>, d) => {
      acc[d.user_profile] = (acc[d.user_profile] || 0) + 1;
      return acc;
    }, {});

  const profileChartData = Object.entries(profileDistribution).map(([name, value]) => ({
    name: name.length > 20 ? name.substring(0, 20) + '...' : name,
    fullName: name,
    value
  }));

  // Objectives distribution
  const objectivesDistribution = filteredOnboarding
    .filter(d => !d.skipped)
    .reduce((acc: Record<string, number>, d) => {
      acc[d.main_objective] = (acc[d.main_objective] || 0) + 1;
      return acc;
    }, {});

  const objectivesChartData = Object.entries(objectivesDistribution).map(([name, value]) => ({
    name: name.length > 25 ? name.substring(0, 25) + '...' : name,
    fullName: name,
    value
  }));

  // Team size distribution
  const teamSizeDistribution = filteredOnboarding
    .filter(d => !d.skipped)
    .reduce((acc: Record<string, number>, d) => {
      acc[d.team_size] = (acc[d.team_size] || 0) + 1;
      return acc;
    }, {});

  const teamSizeChartData = Object.entries(teamSizeDistribution).map(([name, value]) => ({
    name,
    value
  }));

  // Non-conversion reasons
  const nonConversionReasons = filteredFeedback
    .filter(f => f.not_continue_reason)
    .reduce((acc: Record<string, number>, f) => {
      acc[f.not_continue_reason!] = (acc[f.not_continue_reason!] || 0) + 1;
      return acc;
    }, {});

  const nonConversionChartData = Object.entries(nonConversionReasons).map(([name, value]) => ({
    name: name.length > 20 ? name.substring(0, 20) + '...' : name,
    fullName: name,
    value
  }));

  // Experience status distribution
  const experienceDistribution = filteredFeedback.reduce((acc: Record<string, number>, f) => {
    acc[f.experience_status] = (acc[f.experience_status] || 0) + 1;
    return acc;
  }, {});

  const experienceChartData = Object.entries(experienceDistribution).map(([key, value]) => ({
    name: EXPERIENCE_LABELS[key] || key,
    value
  }));

  // NPS calculation
  const npsScores = filteredFeedback.filter(f => f.nps_score !== null).map(f => f.nps_score!);
  const promoters = npsScores.filter(s => s >= 9).length;
  const detractors = npsScores.filter(s => s <= 6).length;
  const npsScore = npsScores.length > 0 
    ? Math.round(((promoters - detractors) / npsScores.length) * 100) 
    : 0;
  const avgNps = npsScores.length > 0 
    ? (npsScores.reduce((a, b) => a + b, 0) / npsScores.length).toFixed(1)
    : '-';

  // Conversion rate
  const convertedCount = filteredFeedback.filter(f => f.experience_status === "will_subscribe").length;
  const conversionRate = filteredFeedback.length > 0 
    ? ((convertedCount / filteredFeedback.length) * 100).toFixed(1)
    : 0;

  // Pagination for all responses
  const allResponses = [
    ...filteredOnboarding.map(d => ({ type: 'onboarding' as const, data: d, date: d.created_at })),
    ...filteredFeedback.map(d => ({ type: 'feedback' as const, data: d, date: d.created_at }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalPages = Math.ceil(allResponses.length / itemsPerPage);
  const paginatedResponses = allResponses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Tipo', 'Email', 'Data', 'Dados'];
    const rows = allResponses.map(r => {
      const userEmail = userProfiles[r.type === 'onboarding' ? (r.data as OnboardingData).user_id : (r.data as FeedbackData).user_id]?.email || 'N/A';
      const date = new Date(r.date).toLocaleDateString('pt-BR');
      const dataStr = JSON.stringify(r.data);
      return [r.type, userEmail, date, dataStr];
    });

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `user_insights_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={40} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo size="md" />
              <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Users size={14} />
                Insights
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <Link to="/admin">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft size={16} />
                  <span className="hidden sm:inline">Admin</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-2">Insights de Usuários</h1>
          <p className="text-muted-foreground">Análise de onboarding, feedback e comportamento</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={40} className="text-primary animate-spin" />
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-8">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-muted-foreground" />
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-40">
                    <Calendar size={14} className="mr-2" />
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo período</SelectItem>
                    <SelectItem value="7days">Últimos 7 dias</SelectItem>
                    <SelectItem value="30days">Últimos 30 dias</SelectItem>
                    <SelectItem value="90days">Últimos 90 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="converted">Convertidos</SelectItem>
                  <SelectItem value="not_converted">Não convertidos</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={exportToCSV} className="gap-2">
                <Download size={16} />
                Exportar CSV
              </Button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <div className="glass rounded-xl p-4 animate-fade-in">
                <div className="flex items-center gap-2 mb-2">
                  <Users size={18} className="text-primary" />
                  <span className="text-sm text-muted-foreground">Onboardings</span>
                </div>
                <p className="text-2xl font-bold">{filteredOnboarding.length}</p>
                <p className="text-xs text-muted-foreground">
                  {filteredOnboarding.filter(d => d.skipped).length} pulados
                </p>
              </div>

              <div className="glass rounded-xl p-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle size={18} className="text-primary" />
                  <span className="text-sm text-muted-foreground">Feedbacks</span>
                </div>
                <p className="text-2xl font-bold">{filteredFeedback.length}</p>
                <p className="text-xs text-muted-foreground">respostas coletadas</p>
              </div>

              <div className="glass rounded-xl p-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={18} className="text-success" />
                  <span className="text-sm text-muted-foreground">Conversão</span>
                </div>
                <p className="text-2xl font-bold text-success">{conversionRate}%</p>
                <p className="text-xs text-muted-foreground">{convertedCount} convertidos</p>
              </div>

              <div className="glass rounded-xl p-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Star size={18} className="text-warning" />
                  <span className="text-sm text-muted-foreground">NPS Score</span>
                </div>
                <p className="text-2xl font-bold">{npsScore}</p>
                <p className="text-xs text-muted-foreground">Média: {avgNps}</p>
              </div>

              <div className="glass rounded-xl p-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase size={18} className="text-primary" />
                  <span className="text-sm text-muted-foreground">Perfil Top</span>
                </div>
                <p className="text-sm font-bold truncate">
                  {profileChartData[0]?.fullName || '-'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {profileChartData[0]?.value || 0} usuários
                </p>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Profile Distribution */}
              <div className="glass rounded-xl p-6 animate-fade-in">
                <div className="flex items-center gap-2 mb-4">
                  <Users size={20} className="text-primary" />
                  <h3 className="font-semibold">Distribuição por Perfil</h3>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={profileChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${value}`}
                      >
                        {profileChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name, props) => [value, props.payload.fullName]}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px' 
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {profileChartData.slice(0, 4).map((item, i) => (
                    <div key={i} className="flex items-center gap-1 text-xs">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[i] }} />
                      <span className="truncate max-w-24">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Objectives Distribution */}
              <div className="glass rounded-xl p-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Target size={20} className="text-primary" />
                  <h3 className="font-semibold">Objetivos Mais Comuns</h3>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={objectivesChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} width={120} />
                      <Tooltip 
                        formatter={(value, name, props) => [value, props.payload.fullName]}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px' 
                        }}
                      />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Team Size Distribution */}
              <div className="glass rounded-xl p-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase size={20} className="text-primary" />
                  <h3 className="font-semibold">Tamanho de Equipe</h3>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamSizeChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px' 
                        }}
                      />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Non-conversion Reasons */}
              <div className="glass rounded-xl p-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 size={20} className="text-destructive" />
                  <h3 className="font-semibold">Motivos de Não Conversão</h3>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={nonConversionChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} width={120} />
                      <Tooltip 
                        formatter={(value, name, props) => [value, props.payload.fullName]}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px' 
                        }}
                      />
                      <Bar dataKey="value" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Experience Status */}
            <div className="glass rounded-xl p-6 mb-8 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center gap-2 mb-4">
                <MessageCircle size={20} className="text-primary" />
                <h3 className="font-semibold">Status de Experiência (Feedback Trial)</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {experienceChartData.map((item, i) => (
                  <div key={i} className="bg-secondary/50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold">{item.value}</p>
                    <p className="text-xs text-muted-foreground">{item.name}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* All Responses Table */}
            <div className="glass rounded-xl p-6 animate-fade-in" style={{ animationDelay: '0.5s' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 size={20} className="text-primary" />
                  <h3 className="font-semibold">Respostas dos Usuários</h3>
                </div>
                <span className="text-sm text-muted-foreground">
                  {allResponses.length} respostas
                </span>
              </div>

              <div className="overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Resumo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedResponses.map((response, i) => {
                      const userId = response.type === 'onboarding' 
                        ? (response.data as OnboardingData).user_id 
                        : (response.data as FeedbackData).user_id;
                      const userProfile = userProfiles[userId];
                      
                      return (
                        <TableRow key={i}>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              response.type === 'onboarding' 
                                ? 'bg-primary/20 text-primary' 
                                : 'bg-warning/20 text-warning'
                            }`}>
                              {response.type === 'onboarding' ? 'Onboarding' : 'Feedback'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{userProfile?.name || '-'}</p>
                              <p className="text-xs text-muted-foreground">{userProfile?.email || 'N/A'}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(response.date)}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            {response.type === 'onboarding' ? (
                              <div className="text-sm">
                                {(response.data as OnboardingData).skipped ? (
                                  <span className="text-muted-foreground italic">Pulou o onboarding</span>
                                ) : (
                                  <>
                                    <p className="truncate">
                                      <strong>Perfil:</strong> {(response.data as OnboardingData).user_profile}
                                    </p>
                                    <p className="truncate text-muted-foreground">
                                      <strong>Objetivo:</strong> {(response.data as OnboardingData).main_objective}
                                    </p>
                                  </>
                                )}
                              </div>
                            ) : (
                              <div className="text-sm">
                                <p className="truncate">
                                  <strong>Status:</strong> {EXPERIENCE_LABELS[(response.data as FeedbackData).experience_status] || (response.data as FeedbackData).experience_status}
                                </p>
                                {(response.data as FeedbackData).nps_score !== null && (
                                  <p className="text-muted-foreground">
                                    <strong>NPS:</strong> {(response.data as FeedbackData).nps_score}
                                  </p>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )}

              {allResponses.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma resposta encontrada
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default UserInsights;
