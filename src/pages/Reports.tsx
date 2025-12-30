import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  MapPin, 
  Target, 
  Users, 
  Search, 
  Calendar,
  ArrowLeft,
  Download,
  Filter
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from "recharts";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";

interface SearchHistoryItem {
  id: string;
  keyword: string;
  location: string;
  results_count: number;
  created_at: string;
  leads?: any[];
}

interface ReportStats {
  totalSearches: number;
  totalLeads: number;
  avgLeadsPerSearch: number;
  topNiches: { name: string; count: number }[];
  topRegions: { name: string; count: number }[];
  searchesByDay: { date: string; searches: number; leads: number }[];
  nichesByLeads: { name: string; leads: number }[];
  regionsByLeads: { name: string; leads: number }[];
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
];

const Reports = () => {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("all");
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('search_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching history:', error);
          return;
        }

        setHistory((data || []).map(item => ({
          ...item,
          leads: Array.isArray(item.leads) ? item.leads : []
        })));
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  // Filter data by date
  const filteredHistory = useMemo(() => {
    if (dateFilter === "all") return history;
    
    const now = new Date();
    const filterDate = new Date();
    
    switch (dateFilter) {
      case "7days":
        filterDate.setDate(now.getDate() - 7);
        break;
      case "30days":
        filterDate.setDate(now.getDate() - 30);
        break;
      case "90days":
        filterDate.setDate(now.getDate() - 90);
        break;
      default:
        return history;
    }
    
    return history.filter(item => new Date(item.created_at) >= filterDate);
  }, [history, dateFilter]);

  // Calculate stats from filtered history
  const stats: ReportStats = useMemo(() => {
    const nicheCount: Record<string, number> = {};
    const regionCount: Record<string, number> = {};
    const nicheLeads: Record<string, number> = {};
    const regionLeads: Record<string, number> = {};
    const dailyStats: Record<string, { searches: number; leads: number }> = {};
    
    let totalLeads = 0;

    filteredHistory.forEach(item => {
      // Count by niche (keyword)
      const niche = item.keyword.toLowerCase().trim();
      nicheCount[niche] = (nicheCount[niche] || 0) + 1;
      nicheLeads[niche] = (nicheLeads[niche] || 0) + item.results_count;
      
      // Count by region
      const region = item.location.toLowerCase().trim();
      regionCount[region] = (regionCount[region] || 0) + 1;
      regionLeads[region] = (regionLeads[region] || 0) + item.results_count;
      
      // Count total leads
      totalLeads += item.results_count;
      
      // Daily stats
      const date = new Date(item.created_at).toLocaleDateString('pt-BR');
      if (!dailyStats[date]) {
        dailyStats[date] = { searches: 0, leads: 0 };
      }
      dailyStats[date].searches += 1;
      dailyStats[date].leads += item.results_count;
    });

    const topNiches = Object.entries(nicheCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const topRegions = Object.entries(regionCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const nichesByLeads = Object.entries(nicheLeads)
      .map(([name, leads]) => ({ name, leads }))
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 8);

    const regionsByLeads = Object.entries(regionLeads)
      .map(([name, leads]) => ({ name, leads }))
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 8);

    const searchesByDay = Object.entries(dailyStats)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => {
        const [dayA, monthA, yearA] = a.date.split('/').map(Number);
        const [dayB, monthB, yearB] = b.date.split('/').map(Number);
        return new Date(yearA, monthA - 1, dayA).getTime() - new Date(yearB, monthB - 1, dayB).getTime();
      })
      .slice(-14); // Last 14 days

    return {
      totalSearches: filteredHistory.length,
      totalLeads,
      avgLeadsPerSearch: filteredHistory.length > 0 ? Math.round(totalLeads / filteredHistory.length) : 0,
      topNiches,
      topRegions,
      searchesByDay,
      nichesByLeads,
      regionsByLeads
    };
  }, [filteredHistory]);

  const handleExportReport = () => {
    const reportData = filteredHistory.map(item => ({
      'Data': new Date(item.created_at).toLocaleDateString('pt-BR'),
      'Nicho': item.keyword,
      'Região': item.location,
      'Leads Encontrados': item.results_count
    }));

    const summaryData = [
      { 'Métrica': 'Total de Buscas', 'Valor': stats.totalSearches },
      { 'Métrica': 'Total de Leads', 'Valor': stats.totalLeads },
      { 'Métrica': 'Média de Leads por Busca', 'Valor': stats.avgLeadsPerSearch },
    ];

    const workbook = XLSX.utils.book_new();
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');
    
    const historySheet = XLSX.utils.json_to_sheet(reportData);
    XLSX.utils.book_append_sheet(workbook, historySheet, 'Histórico Detalhado');

    const nichesSheet = XLSX.utils.json_to_sheet(
      stats.topNiches.map(n => ({ 'Nicho': n.name, 'Buscas': n.count }))
    );
    XLSX.utils.book_append_sheet(workbook, nichesSheet, 'Top Nichos');

    const regionsSheet = XLSX.utils.json_to_sheet(
      stats.topRegions.map(r => ({ 'Região': r.name, 'Buscas': r.count }))
    );
    XLSX.utils.book_append_sheet(workbook, regionsSheet, 'Top Regiões');

    XLSX.writeFile(workbook, `relatorio-prospeccao-${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({
      title: "Relatório exportado!",
      description: "Seu relatório foi baixado com sucesso.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <ArrowLeft size={18} />
                </Button>
              </Link>
              <Logo size="md" />
            </div>
            
            <div className="flex items-center gap-3">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-40 h-9">
                  <Filter size={14} className="mr-2" />
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo período</SelectItem>
                  <SelectItem value="7days">Últimos 7 dias</SelectItem>
                  <SelectItem value="30days">Últimos 30 dias</SelectItem>
                  <SelectItem value="90days">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm" onClick={handleExportReport} className="gap-2">
                <Download size={16} />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold mb-2">Relatórios de Prospecção</h1>
            <p className="text-muted-foreground">
              Acompanhe suas métricas e performance de prospecção
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="glass">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Buscas
                </CardTitle>
                <Search className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalSearches}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  prospecções realizadas
                </p>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Leads
                </CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalLeads.toLocaleString('pt-BR')}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  empresas encontradas
                </p>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Média por Busca
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.avgLeadsPerSearch}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  leads por prospecção
                </p>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Nichos Explorados
                </CardTitle>
                <Target className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.topNiches.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  segmentos diferentes
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Timeline Chart */}
            <Card className="glass">
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
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        tickLine={{ stroke: 'hsl(var(--border))' }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                      />
                      <YAxis 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        tickLine={{ stroke: 'hsl(var(--border))' }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))'
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                      />
                      <Legend 
                        wrapperStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Bar 
                        dataKey="searches" 
                        name="Buscas"
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        dataKey="leads" 
                        name="Leads"
                        fill="#22c55e"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Sem dados suficientes para exibir o gráfico
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Niches Pie Chart */}
            <Card className="glass">
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
                        label={({ name, percent }) => `${name.slice(0, 15)}${name.length > 15 ? '...' : ''} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {stats.topNiches.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => [`${value} buscas`, 'Quantidade']}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Sem dados suficientes para exibir o gráfico
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Top Niches Bar Chart */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 size={18} className="text-primary" />
                  Leads por Nicho
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.nichesByLeads.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.nichesByLeads} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        type="number"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        tickLine={{ stroke: 'hsl(var(--border))' }}
                      />
                      <YAxis 
                        dataKey="name" 
                        type="category"
                        width={120}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        tickLine={{ stroke: 'hsl(var(--border))' }}
                        tickFormatter={(value) => value.length > 18 ? `${value.slice(0, 18)}...` : value}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => [`${value} leads`, 'Quantidade']}
                      />
                      <Bar 
                        dataKey="leads" 
                        fill="hsl(var(--primary))" 
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Sem dados suficientes para exibir o gráfico
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Regions Bar Chart */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin size={18} className="text-primary" />
                  Leads por Região
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.regionsByLeads.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.regionsByLeads} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        type="number"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        tickLine={{ stroke: 'hsl(var(--border))' }}
                      />
                      <YAxis 
                        dataKey="name" 
                        type="category"
                        width={120}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        tickLine={{ stroke: 'hsl(var(--border))' }}
                        tickFormatter={(value) => value.length > 18 ? `${value.slice(0, 18)}...` : value}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => [`${value} leads`, 'Quantidade']}
                      />
                      <Bar 
                        dataKey="leads" 
                        fill="hsl(var(--chart-2))" 
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Sem dados suficientes para exibir o gráfico
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Niches List */}
            <Card className="glass">
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
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                          {index + 1}º
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium capitalize truncate text-foreground">{niche.name}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-primary">{niche.count}</span>
                          <span className="text-xs text-muted-foreground">buscas</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    Nenhuma busca realizada ainda
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Regions List */}
            <Card className="glass">
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
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-sm font-bold text-emerald-400">
                          {index + 1}º
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium capitalize truncate text-foreground">{region.name}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-emerald-400">{region.count}</span>
                          <span className="text-xs text-muted-foreground">buscas</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    Nenhuma busca realizada ainda
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Reports;
