import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  MessageSquare,
  TrendingUp,
  Users,
  CheckCircle2,
  XCircle,
  Calendar,
  BarChart3,
  Target,
  Zap,
  Clock,
  Shield,
  Share2,
  Link as LinkIcon,
  FileText,
  Copy,
  Check,
  Loader2,
  Lock,
  Smartphone
} from "lucide-react";
import { hashReportPassword } from "@/lib/secureHash";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AreaChart,
  Area,
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
  Legend
} from "recharts";
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAutoScoreTracking } from "@/hooks/useAutoScoreTracking";
import { ReportEmptyState } from "@/components/dashboard/ReportEmptyState";

interface Campaign {
  id: string;
  name: string;
  status: string;
  total_leads: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  whatsapp_number_id: string | null;
}

interface WhatsAppNumber {
  id: string;
  name: string;
  phone_number: string | null;
}

interface DailyStats {
  date: string;
  enviadas: number;
  falhas: number;
  total: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--muted))'];

const WhatsAppReports = () => {
  useAutoScoreTracking("whatsapp_reports");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7' | '14' | '30' | '90'>('30');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareMode, setShareMode] = useState<'link' | null>(null);
  const [linkPassword, setLinkPassword] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [user, dateRange]);

  const fetchData = async () => {
    if (!user) return;
    
    const startDate = subDays(new Date(), parseInt(dateRange));
    
    try {
      // Fetch campaigns and numbers in parallel
      const [campaignsRes, numbersRes] = await Promise.all([
        supabase
          .from('whatsapp_campaigns')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false }),
        supabase
          .from('whatsapp_numbers')
          .select('id, name, phone_number')
          .eq('user_id', user.id)
      ]);

      if (campaignsRes.error) throw campaignsRes.error;
      if (numbersRes.error) throw numbersRes.error;
      
      setCampaigns(campaignsRes.data || []);
      setNumbers(numbersRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter campaigns by selected number
  const filteredCampaigns = useMemo(() => {
    if (selectedNumber === 'all') return campaigns;
    return campaigns.filter(c => c.whatsapp_number_id === selectedNumber);
  }, [campaigns, selectedNumber]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalCampaigns = filteredCampaigns.length;
    const totalSent = filteredCampaigns.reduce((acc, c) => acc + c.sent_count, 0);
    const totalFailed = filteredCampaigns.reduce((acc, c) => acc + c.failed_count, 0);
    const totalLeads = filteredCampaigns.reduce((acc, c) => acc + c.total_leads, 0);
    const successRate = totalSent + totalFailed > 0 
      ? Math.round((totalSent / (totalSent + totalFailed)) * 100) 
      : 0;
    const completedCampaigns = filteredCampaigns.filter(c => c.status === 'completed').length;
    const avgPerCampaign = totalCampaigns > 0 
      ? Math.round(totalSent / totalCampaigns) 
      : 0;

    return {
      totalCampaigns,
      totalSent,
      totalFailed,
      totalLeads,
      successRate,
      completedCampaigns,
      avgPerCampaign
    };
  }, [filteredCampaigns]);

  // Daily chart data
  const dailyData = useMemo((): DailyStats[] => {
    const days = parseInt(dateRange);
    const interval = eachDayOfInterval({
      start: subDays(new Date(), days - 1),
      end: new Date()
    });

    return interval.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      
      const dayCampaigns = filteredCampaigns.filter(c => {
        const createdAt = parseISO(c.created_at);
        return createdAt >= dayStart && createdAt <= dayEnd;
      });

      const enviadas = dayCampaigns.reduce((acc, c) => acc + c.sent_count, 0);
      const falhas = dayCampaigns.reduce((acc, c) => acc + c.failed_count, 0);

      return {
        date: format(day, 'dd/MM', { locale: ptBR }),
        enviadas,
        falhas,
        total: enviadas + falhas
      };
    });
  }, [filteredCampaigns, dateRange]);

  // Status pie chart data
  const statusData = useMemo(() => {
    const statusCounts = filteredCampaigns.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { name: 'Concluídas', value: statusCounts['completed'] || 0, color: 'hsl(var(--primary))' },
      { name: 'Em andamento', value: statusCounts['running'] || 0, color: 'hsl(142, 76%, 36%)' },
      { name: 'Pausadas', value: statusCounts['paused'] || 0, color: 'hsl(38, 92%, 50%)' },
      { name: 'Agendadas', value: statusCounts['scheduled'] || 0, color: 'hsl(217, 91%, 60%)' },
    ].filter(item => item.value > 0);
  }, [filteredCampaigns]);

  // Top campaigns
  const topCampaigns = useMemo(() => {
    return [...filteredCampaigns]
      .sort((a, b) => b.sent_count - a.sent_count)
      .slice(0, 5);
  }, [filteredCampaigns]);

  // Get number name by id
  const getNumberName = (numberId: string | null) => {
    if (!numberId) return 'Sem número';
    const number = numbers.find(n => n.id === numberId);
    return number?.name || 'Número removido';
  };

  const handleShareClick = () => {
    setShowShareDialog(true);
    setShareMode(null);
    setLinkPassword("");
    setGeneratedLink("");
  };

  const handleGenerateLink = async () => {
    if (!linkPassword || linkPassword.length < 4) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 4 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const reportData = {
        stats,
        dateRange,
        type: 'whatsapp',
        generatedAt: new Date().toISOString()
      };

      // Use secure password hashing instead of btoa
      const secureHash = await hashReportPassword(linkPassword);

      const { data, error } = await supabase
        .from('shared_reports')
        .insert([{
          user_id: user?.id as string,
          password_hash: secureHash,
          filter_type: dateRange,
          report_data: reportData as any
        }])
        .select()
        .single();

      if (error) throw error;

      const link = `${window.location.origin}/shared-report/${data.id}`;
      setGeneratedLink(link);
      
      toast({
        title: "Link gerado!",
        description: "O link foi criado e expira em 7 dias",
      });
    } catch (error) {
      console.error('Error generating link:', error);
      toast({
        title: "Erro ao gerar link",
        description: "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Link copiado!",
      description: "Compartilhe junto com a senha",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background relative overflow-hidden">
        <BackgroundGlow />
        <AppSidebar profile={profile} />
        <div className="flex-1 flex flex-col min-w-0 lg:pl-[72px]">
          <AppHeader profile={profile} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
            <div className="max-w-7xl mx-auto">
          {/* Header with filter */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="font-display text-2xl font-bold mb-1">
                Relatório de Campanhas
              </h1>
              <p className="text-muted-foreground text-sm">
                Acompanhe o desempenho dos seus disparos
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareClick}
                className="gap-2"
              >
                <Share2 size={16} />
                <span className="hidden sm:inline">Compartilhar</span>
              </Button>

              {/* Number Filter */}
              {numbers.length > 0 && (
                <Select value={selectedNumber} onValueChange={setSelectedNumber}>
                  <SelectTrigger className="w-[160px]">
                    <Smartphone size={16} className="mr-2" />
                    <SelectValue placeholder="Todos números" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos números</SelectItem>
                    {numbers.map(number => (
                      <SelectItem key={number.id} value={number.id}>
                        {number.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
                <SelectTrigger className="w-[160px]">
                  <Calendar size={16} className="mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="14">Últimos 14 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Number Filter Indicator */}
          {selectedNumber !== 'all' && (
            <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Smartphone size={16} className="text-primary" />
                <span>Filtrando por: <strong>{getNumberName(selectedNumber)}</strong></span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedNumber('all')}
                className="h-7 px-2 text-xs"
              >
                Limpar filtro
              </Button>
            </div>
          )}

          {campaigns.length === 0 ? (
            <ReportEmptyState
              title="Sem dados suficientes para análise"
              description="Crie e envie suas primeiras campanhas de WhatsApp para visualizar relatórios de performance, taxa de sucesso e evolução dos disparos."
              actionLabel="Criar campanha"
              actionLink="/whatsapp-campaign"
              icon={<MessageSquare size={28} className="text-muted-foreground/40" />}
            />
          ) : (
          <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4 glass">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalCampaigns}</p>
                  <p className="text-xs text-muted-foreground">Campanhas</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 glass">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 size={18} className="text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalSent.toLocaleString('pt-BR')}</p>
                  <p className="text-xs text-muted-foreground">Enviadas</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 glass">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle size={18} className="text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalFailed.toLocaleString('pt-BR')}</p>
                  <p className="text-xs text-muted-foreground">Falhas</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 glass">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp size={18} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.successRate}%</p>
                  <p className="text-xs text-muted-foreground">Taxa de sucesso</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Daily Sends Chart */}
            <Card className="p-6 glass lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold flex items-center gap-2">
                  <Zap size={18} className="text-primary" />
                  Disparos por Dia
                </h3>
              </div>
              
              {dailyData.some(d => d.total > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="colorEnviadas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorFalhas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="enviadas" 
                      name="Enviadas"
                      stroke="hsl(var(--primary))" 
                      fillOpacity={1} 
                      fill="url(#colorEnviadas)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="falhas" 
                      name="Falhas"
                      stroke="hsl(var(--destructive))" 
                      fillOpacity={1} 
                      fill="url(#colorFalhas)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 size={48} className="mx-auto mb-2 opacity-50" />
                    <p>Nenhum disparo no período</p>
                  </div>
                </div>
              )}
            </Card>

            {/* Status Pie Chart */}
            <Card className="p-6 glass">
              <h3 className="font-semibold flex items-center gap-2 mb-6">
                <Target size={18} className="text-primary" />
                Status das Campanhas
              </h3>
              
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
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
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  <p>Nenhuma campanha</p>
                </div>
              )}
            </Card>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="p-4 glass">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats.totalLeads.toLocaleString('pt-BR')}</p>
                  <p className="text-xs text-muted-foreground">Leads alcançados</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 glass">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 size={18} className="text-green-500" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats.completedCampaigns}</p>
                  <p className="text-xs text-muted-foreground">Campanhas concluídas</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 glass">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp size={18} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats.avgPerCampaign}</p>
                  <p className="text-xs text-muted-foreground">Média por campanha</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Top Campaigns */}
          {topCampaigns.length > 0 && (
            <Card className="p-6 glass">
              <h3 className="font-semibold flex items-center gap-2 mb-4">
                <TrendingUp size={18} className="text-primary" />
                Top 5 Campanhas
              </h3>
              
              <div className="space-y-3">
                {topCampaigns.map((campaign, index) => {
                  const successRate = campaign.sent_count + campaign.failed_count > 0
                    ? Math.round((campaign.sent_count / (campaign.sent_count + campaign.failed_count)) * 100)
                    : 0;
                    
                  return (
                    <div 
                      key={campaign.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/30"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{campaign.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(campaign.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{campaign.sent_count}</p>
                        <p className="text-xs text-muted-foreground">{successRate}% sucesso</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Anti-Ban Info */}
          <Card className="p-6 glass mt-8 bg-gradient-to-r from-amber-500/5 to-orange-500/5 border-amber-500/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Shield size={24} className="text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-600 dark:text-amber-400 mb-2">
                  Proteção Anti-Ban Ativa
                </h3>
                <p className="text-sm text-muted-foreground">
                  Suas campanhas respeitam o limite de <strong>200 disparos por número</strong> diários para garantir a segurança da sua conta. 
                  Campanhas são automaticamente pausadas ao atingir o limite e retomadas no dia seguinte às <strong>08:00h da manhã</strong> (horário de Brasília).
                </p>
              </div>
            </div>
          </Card>
          </>
          )}
          </div>
          </main>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 size={20} />
              Compartilhar Relatório
            </DialogTitle>
          </DialogHeader>
          
          {!shareMode ? (
            <div className="space-y-4 py-4">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-16"
                onClick={() => setShareMode('link')}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <LinkIcon size={20} className="text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Link Protegido</p>
                  <p className="text-xs text-muted-foreground">
                    Gere um link com senha que expira em 7 dias
                  </p>
                </div>
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {!generatedLink ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="flex items-center gap-2">
                      <Lock size={14} />
                      Senha de acesso
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Mínimo 4 caracteres"
                      value={linkPassword}
                      onChange={(e) => setLinkPassword(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Quem acessar o link precisará desta senha
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShareMode(null)}
                      className="flex-1"
                    >
                      Voltar
                    </Button>
                    <Button
                      onClick={handleGenerateLink}
                      disabled={isGenerating || linkPassword.length < 4}
                      className="flex-1 gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <LinkIcon size={16} />
                          Gerar Link
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Link gerado</Label>
                    <div className="flex gap-2">
                      <Input
                        value={generatedLink}
                        readOnly
                        className="text-xs"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={handleCopyLink}
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <strong>Senha:</strong> {linkPassword}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      ⚠️ Este link expira em 7 dias. Compartilhe a senha separadamente.
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setShareMode(null);
                      setGeneratedLink("");
                      setLinkPassword("");
                    }}
                    className="w-full"
                  >
                    Gerar novo link
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default WhatsAppReports;
