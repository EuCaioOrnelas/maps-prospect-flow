import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { 
  Lock, 
  Loader2, 
  Search, 
  Users, 
  TrendingUp, 
  Target,
  Calendar,
  BarChart3,
  PieChart,
  MapPin,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
} from "recharts";

const CHART_COLORS = [
  "#22c55e", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#f97316",
  "#f59e0b", "#eab308", "#84cc16", "#10b981", "#2dd4bf", "#38bdf8",
];

interface ProspectionReportData {
  stats: {
    totalSearches: number;
    totalLeads: number;
    avgLeadsPerSearch: number;
    topNiches: { name: string; count: number }[];
    topRegions: { name: string; count: number }[];
    searchesByDay: { date: string; searches: number; leads: number }[];
    nichesByLeads: { name: string; leads: number }[];
    regionsByLeads: { name: string; leads: number }[];
  };
  dateFilter: string;
  generatedAt: string;
  type?: string;
}

interface WhatsAppReportData {
  stats: {
    totalCampaigns: number;
    totalSent: number;
    totalFailed: number;
    totalLeads: number;
    successRate: number;
    completedCampaigns: number;
    avgPerCampaign: number;
  };
  dateRange: string;
  type: 'whatsapp';
  generatedAt: string;
}

type ReportData = ProspectionReportData | WhatsAppReportData;

const SharedReport = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [createdAt, setCreatedAt] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      setError("Digite a senha");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await supabase.functions.invoke('verify-shared-report', {
        body: { reportId, password }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data.error) {
        setError(response.data.error);
        return;
      }

      setReportData(response.data.data);
      setCreatedAt(response.data.createdAt);
    } catch (err: any) {
      setError(err.message || "Erro ao acessar relatório");
    } finally {
      setIsLoading(false);
    }
  };

  const getFilterLabel = (filter: string, isWhatsApp: boolean = false) => {
    if (isWhatsApp) {
      switch (filter) {
        case "7": return "Últimos 7 dias";
        case "14": return "Últimos 14 dias";
        case "30": return "Últimos 30 dias";
        case "90": return "Últimos 90 dias";
        default: return "Todo período";
      }
    }
    switch (filter) {
      case "7days": return "Últimos 7 dias";
      case "30days": return "Últimos 30 dias";
      case "90days": return "Últimos 90 dias";
      default: return "Todo período";
    }
  };

  const isWhatsAppReport = reportData && 'type' in reportData && reportData.type === 'whatsapp';

  if (!reportData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Logo size="md" />
            </div>
            <CardTitle className="text-xl">Relatório Protegido</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Digite a senha para visualizar este relatório
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock size={14} />
                  Senha de acesso
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite a senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    Acessar Relatório
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render WhatsApp Report
  if (isWhatsAppReport) {
    const whatsappData = reportData as WhatsAppReportData;
    const { stats } = whatsappData;
    
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card/50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Logo size="md" />
              <div className="text-sm text-muted-foreground">
                <span className="hidden sm:inline">Relatório compartilhado • </span>
                {getFilterLabel(whatsappData.dateRange, true)}
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Notice banner */}
            <div className="mb-6 p-4 bg-primary/10 border border-primary/30 rounded-lg">
              <p className="text-sm text-center">
                Este é um relatório compartilhado (somente leitura). Gerado em {new Date(createdAt).toLocaleDateString('pt-BR')}.
              </p>
            </div>

            {/* Page Title */}
            <div className="mb-8 animate-fade-in">
              <h1 className="font-display text-3xl font-bold mb-2">Relatório de Campanhas WhatsApp</h1>
              <p className="text-muted-foreground">
                Período: {getFilterLabel(whatsappData.dateRange, true)}
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="glass animate-fade-in p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[11px] bg-primary/10 flex items-center justify-center">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalCampaigns}</p>
                    <p className="text-xs text-muted-foreground">Campanhas</p>
                  </div>
                </div>
              </Card>
              
              <Card className="glass animate-fade-in p-4" style={{ animationDelay: '100ms' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[11px] bg-green-500/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalSent.toLocaleString('pt-BR')}</p>
                    <p className="text-xs text-muted-foreground">Enviadas</p>
                  </div>
                </div>
              </Card>
              
              <Card className="glass animate-fade-in p-4" style={{ animationDelay: '200ms' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[11px] bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalFailed.toLocaleString('pt-BR')}</p>
                    <p className="text-xs text-muted-foreground">Falhas</p>
                  </div>
                </div>
              </Card>
              
              <Card className="glass animate-fade-in p-4" style={{ animationDelay: '300ms' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[11px] bg-blue-500/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.successRate}%</p>
                    <p className="text-xs text-muted-foreground">Taxa de sucesso</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card className="glass animate-fade-in p-4" style={{ animationDelay: '400ms' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[11px] bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{stats.totalLeads.toLocaleString('pt-BR')}</p>
                    <p className="text-xs text-muted-foreground">Leads alcançados</p>
                  </div>
                </div>
              </Card>

              <Card className="glass animate-fade-in p-4" style={{ animationDelay: '500ms' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[11px] bg-green-500/10 flex items-center justify-center">
                    <Target className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{stats.completedCampaigns}</p>
                    <p className="text-xs text-muted-foreground">Campanhas concluídas</p>
                  </div>
                </div>
              </Card>

              <Card className="glass animate-fade-in p-4" style={{ animationDelay: '600ms' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[11px] bg-blue-500/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{stats.avgPerCampaign}</p>
                    <p className="text-xs text-muted-foreground">Média por campanha</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-sm text-muted-foreground">
              Relatório gerado por Wiize
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Render Prospection Report (original)
  const prospectionData = reportData as ProspectionReportData;
  const { stats } = prospectionData;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo size="md" />
            <div className="text-sm text-muted-foreground">
              <span className="hidden sm:inline">Relatório compartilhado • </span>
              {getFilterLabel(prospectionData.dateFilter)}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Notice banner */}
          <div className="mb-6 p-4 bg-primary/10 border border-primary/30 rounded-lg">
            <p className="text-sm text-center">
              Este é um relatório compartilhado (somente leitura). Gerado em {new Date(createdAt).toLocaleDateString('pt-BR')}.
            </p>
          </div>

          {/* Page Title */}
          <div className="mb-8 animate-fade-in">
            <h1 className="font-display text-3xl font-bold mb-2">Relatório de Prospecção</h1>
            <p className="text-muted-foreground">
              Período: {getFilterLabel(prospectionData.dateFilter)}
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total de Buscas', value: stats.totalSearches, sub: 'prospecções realizadas', icon: Search },
              { label: 'Total de Leads', value: stats.totalLeads.toLocaleString('pt-BR'), sub: 'empresas encontradas', icon: Users },
              { label: 'Média por Busca', value: stats.avgLeadsPerSearch, sub: 'leads por prospecção', icon: TrendingUp },
              { label: 'Nichos Explorados', value: stats.topNiches.length, sub: 'segmentos diferentes', icon: Target },
            ].map((stat, index) => (
              <Card 
                key={stat.label} 
                className="glass animate-fade-in"
                style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <stat.icon className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Timeline Chart */}
            <Card className="glass animate-fade-in" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar size={18} className="text-primary" />
                  Prospecções ao Longo do Tempo
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.searchesByDay.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.searchesByDay} barGap={2} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Legend />
                      <Bar dataKey="searches" name="Buscas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="leads" name="Leads" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Sem dados
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Niches Pie Chart */}
            <Card className="glass animate-fade-in" style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <PieChart size={18} className="text-primary" />
                  Distribuição por Nicho
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.topNiches.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPie>
                      <Pie
                        data={stats.topNiches}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="name"
                        label={({ name, percent }) => `${name.slice(0, 12)}${name.length > 12 ? '..' : ''} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {stats.topNiches.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    </RechartsPie>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Sem dados
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Niches List */}
            <Card className="glass animate-fade-in" style={{ animationDelay: '600ms', animationFillMode: 'both' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target size={18} className="text-primary" />
                  Nichos Mais Prospectados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.topNiches.length > 0 ? (
                  <div className="space-y-3">
                    {stats.topNiches.map((niche, index) => (
                      <div key={niche.name} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/30">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                          style={{ backgroundColor: `${CHART_COLORS[index]}20`, color: CHART_COLORS[index] }}
                        >
                          {index + 1}º
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium capitalize truncate">{niche.name}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold" style={{ color: CHART_COLORS[index] }}>{niche.count}</span>
                          <span className="text-xs text-muted-foreground">buscas</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">Sem dados</div>
                )}
              </CardContent>
            </Card>

            {/* Top Regions List */}
            <Card className="glass animate-fade-in" style={{ animationDelay: '700ms', animationFillMode: 'both' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin size={18} className="text-primary" />
                  Regiões Mais Prospectadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.topRegions.length > 0 ? (
                  <div className="space-y-3">
                    {stats.topRegions.map((region, index) => (
                      <div key={region.name} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/30">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                          style={{ backgroundColor: `${CHART_COLORS[index + 8]}20`, color: CHART_COLORS[index + 8] }}
                        >
                          {index + 1}º
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium capitalize truncate">{region.name}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold" style={{ color: CHART_COLORS[index + 8] }}>{region.count}</span>
                          <span className="text-xs text-muted-foreground">buscas</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">Sem dados</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            Relatório gerado por Wiize
          </div>
        </div>
      </main>
    </div>
  );
};

export default SharedReport;
