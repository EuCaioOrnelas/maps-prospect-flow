import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  MapPin, 
  Target, 
  Users, 
  Search, 
  Calendar,
  Download,
  Filter,
  Link as LinkIcon,
  FileText,
  Copy,
  Check,
  Loader2,
  Lock
} from "lucide-react";
import { hashReportPassword } from "@/lib/secureHash";
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
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAutoScoreTracking } from "@/hooks/useAutoScoreTracking";
import { ReportEmptyState } from "@/components/dashboard/ReportEmptyState";

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

// 18 vibrant colors that work on dark backgrounds
const CHART_COLORS = [
  "#22c55e", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#f97316",
  "#f59e0b", "#eab308", "#84cc16", "#10b981", "#2dd4bf", "#38bdf8",
];

const Reports = () => {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("all");
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportMode, setExportMode] = useState<'link' | 'pdf' | null>(null);
  const [linkPassword, setLinkPassword] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { trackScoreEvent } = useAutoScoreTracking("reports");
  const reportRef = useRef<HTMLDivElement>(null);

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
      const niche = item.keyword.toLowerCase().trim();
      nicheCount[niche] = (nicheCount[niche] || 0) + 1;
      nicheLeads[niche] = (nicheLeads[niche] || 0) + item.results_count;
      
      const region = item.location.toLowerCase().trim();
      regionCount[region] = (regionCount[region] || 0) + 1;
      regionLeads[region] = (regionLeads[region] || 0) + item.results_count;
      
      totalLeads += item.results_count;
      
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
      .slice(-14);

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

  const handleExportClick = () => {
    setShowExportDialog(true);
    setExportMode(null);
    setLinkPassword("");
    setGeneratedLink("");
    trackScoreEvent("export_report", { type: "report" });
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
        dateFilter,
        generatedAt: new Date().toISOString()
      };

      // Use secure password hashing instead of btoa
      const secureHash = await hashReportPassword(linkPassword);

      const { data, error } = await supabase
        .from('shared_reports')
        .insert([{
          user_id: user?.id as string,
          password_hash: secureHash,
          filter_type: dateFilter,
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

  const handleExportPDF = () => {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // Colors
    const primary = { r: 34, g: 197, b: 94 };
    const dark = { r: 31, g: 41, b: 55 };
    const gray = { r: 107, g: 114, b: 128 };
    const cyan = { r: 6, g: 182, b: 212 };

    // Background
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // Title and date on same line
    pdf.setTextColor(dark.r, dark.g, dark.b);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Relatorio de Prospeccao', margin, yPos + 5);
    
    pdf.setTextColor(gray.r, gray.g, gray.b);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const filterText = dateFilter === 'all' ? 'Todo periodo' : 
                       dateFilter === '7days' ? 'Ultimos 7 dias' :
                       dateFilter === '30days' ? 'Ultimos 30 dias' : 'Ultimos 90 dias';
    pdf.text(`${new Date().toLocaleDateString('pt-BR')} | ${filterText}`, pageWidth - margin - 45, yPos + 5);
    
    // Green rounded line under title
    pdf.setFillColor(primary.r, primary.g, primary.b);
    pdf.roundedRect(margin, yPos + 9, pageWidth - margin * 2, 2, 1, 1, 'F');

    yPos += 18;

    // Stats cards - 4 in a row
    const cardWidth = (pageWidth - margin * 2 - 9) / 4;
    const cardHeight = 22;
    
    const statsData = [
      { label: 'Total de Buscas', value: stats.totalSearches.toString() },
      { label: 'Total de Leads', value: stats.totalLeads.toLocaleString('pt-BR') },
      { label: 'Media por Busca', value: stats.avgLeadsPerSearch.toString() },
      { label: 'Nichos Explorados', value: stats.topNiches.length.toString() },
    ];

    statsData.forEach((stat, i) => {
      const xPos = margin + (cardWidth + 3) * i;
      
      // Card background
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(xPos, yPos, cardWidth, cardHeight, 3, 3, 'F');
      
      // Left green bar rounded
      pdf.setFillColor(primary.r, primary.g, primary.b);
      pdf.roundedRect(xPos, yPos, 3, cardHeight, 1.5, 1.5, 'F');
      
      // Label
      pdf.setTextColor(gray.r, gray.g, gray.b);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.text(stat.label, xPos + 8, yPos + 7);
      
      // Value
      pdf.setTextColor(dark.r, dark.g, dark.b);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(stat.value, xPos + 8, yPos + 17);
    });

    yPos += cardHeight + 10;

    // Two column layout
    const colWidth = (pageWidth - margin * 2 - 8) / 2;
    const leftCol = margin;
    const rightCol = margin + colWidth + 8;
    const sectionHeight = 52;
    const barStartX = 50;
    const barMaxWidth = colWidth - barStartX - 25;

    // Section 1: Nichos Mais Prospectados
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(leftCol, yPos, colWidth, sectionHeight, 3, 3, 'F');
    
    pdf.setTextColor(dark.r, dark.g, dark.b);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Nichos Mais Prospectados', leftCol + 6, yPos + 8);
    
    let itemY = yPos + 16;
    stats.topNiches.slice(0, 4).forEach((niche, i) => {
      const bar = Math.max(8, (niche.count / (stats.topNiches[0]?.count || 1)) * barMaxWidth);
      
      pdf.setTextColor(gray.r, gray.g, gray.b);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${i + 1}.`, leftCol + 6, itemY);
      
      pdf.setTextColor(dark.r, dark.g, dark.b);
      const nicheName1 = niche.name.charAt(0).toUpperCase() + niche.name.slice(1);
      pdf.text(nicheName1.slice(0, 12), leftCol + 12, itemY);
      
      // Bar background
      pdf.setFillColor(229, 231, 235);
      pdf.roundedRect(leftCol + barStartX, itemY - 2.5, barMaxWidth, 3.5, 1.5, 1.5, 'F');
      
      // Bar fill
      pdf.setFillColor(primary.r, primary.g, primary.b);
      pdf.roundedRect(leftCol + barStartX, itemY - 2.5, bar, 3.5, 1.5, 1.5, 'F');
      
      // Count AFTER bar
      pdf.setTextColor(primary.r, primary.g, primary.b);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text(`${niche.count}`, leftCol + barStartX + barMaxWidth + 4, itemY);
      
      itemY += 8;
    });

    // Section 2: Regioes Mais Prospectadas
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(rightCol, yPos, colWidth, sectionHeight, 3, 3, 'F');
    
    pdf.setTextColor(dark.r, dark.g, dark.b);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Regioes Mais Prospectadas', rightCol + 6, yPos + 8);
    
    itemY = yPos + 16;
    stats.topRegions.slice(0, 4).forEach((region, i) => {
      const bar = Math.max(8, (region.count / (stats.topRegions[0]?.count || 1)) * barMaxWidth);
      
      pdf.setTextColor(gray.r, gray.g, gray.b);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${i + 1}.`, rightCol + 6, itemY);
      
      pdf.setTextColor(dark.r, dark.g, dark.b);
      const regionName1 = region.name.charAt(0).toUpperCase() + region.name.slice(1);
      pdf.text(regionName1.slice(0, 12), rightCol + 12, itemY);
      
      pdf.setFillColor(229, 231, 235);
      pdf.roundedRect(rightCol + barStartX, itemY - 2.5, barMaxWidth, 3.5, 1.5, 1.5, 'F');
      
      pdf.setFillColor(cyan.r, cyan.g, cyan.b);
      pdf.roundedRect(rightCol + barStartX, itemY - 2.5, bar, 3.5, 1.5, 1.5, 'F');
      
      pdf.setTextColor(cyan.r, cyan.g, cyan.b);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text(`${region.count}`, rightCol + barStartX + barMaxWidth + 4, itemY);
      
      itemY += 8;
    });

    yPos += sectionHeight + 8;

    // Section 3: Leads por Nicho
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(leftCol, yPos, colWidth, sectionHeight, 3, 3, 'F');
    
    pdf.setTextColor(dark.r, dark.g, dark.b);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Leads por Nicho', leftCol + 6, yPos + 8);
    
    itemY = yPos + 16;
    stats.nichesByLeads.slice(0, 4).forEach((niche, i) => {
      const bar = Math.max(8, (niche.leads / (stats.nichesByLeads[0]?.leads || 1)) * barMaxWidth);
      
      pdf.setTextColor(dark.r, dark.g, dark.b);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      const nicheName2 = niche.name.charAt(0).toUpperCase() + niche.name.slice(1);
      pdf.text(nicheName2.slice(0, 12), leftCol + 6, itemY);
      
      pdf.setFillColor(229, 231, 235);
      pdf.roundedRect(leftCol + barStartX, itemY - 2.5, barMaxWidth, 3.5, 1.5, 1.5, 'F');
      
      pdf.setFillColor(primary.r, primary.g, primary.b);
      pdf.roundedRect(leftCol + barStartX, itemY - 2.5, bar, 3.5, 1.5, 1.5, 'F');
      
      pdf.setTextColor(primary.r, primary.g, primary.b);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${niche.leads}`, leftCol + barStartX + barMaxWidth + 4, itemY);
      
      itemY += 8;
    });

    // Section 4: Leads por Regiao
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(rightCol, yPos, colWidth, sectionHeight, 3, 3, 'F');
    
    pdf.setTextColor(dark.r, dark.g, dark.b);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Leads por Regiao', rightCol + 6, yPos + 8);
    
    itemY = yPos + 16;
    stats.regionsByLeads.slice(0, 4).forEach((region, i) => {
      const bar = Math.max(8, (region.leads / (stats.regionsByLeads[0]?.leads || 1)) * barMaxWidth);
      
      pdf.setTextColor(dark.r, dark.g, dark.b);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      const regionName2 = region.name.charAt(0).toUpperCase() + region.name.slice(1);
      pdf.text(regionName2.slice(0, 12), rightCol + 6, itemY);
      
      pdf.setFillColor(229, 231, 235);
      pdf.roundedRect(rightCol + barStartX, itemY - 2.5, barMaxWidth, 3.5, 1.5, 1.5, 'F');
      
      pdf.setFillColor(cyan.r, cyan.g, cyan.b);
      pdf.roundedRect(rightCol + barStartX, itemY - 2.5, bar, 3.5, 1.5, 1.5, 'F');
      
      pdf.setTextColor(cyan.r, cyan.g, cyan.b);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${region.leads}`, rightCol + barStartX + barMaxWidth + 4, itemY);
      
      itemY += 8;
    });

    // Footer
    const footerY = pageHeight - 12;
    pdf.setDrawColor(229, 231, 235);
    pdf.setLineWidth(0.3);
    pdf.line(margin, footerY, pageWidth - margin, footerY);
    
    pdf.setTextColor(primary.r, primary.g, primary.b);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Wiize', margin, footerY + 6);
    
    pdf.setTextColor(gray.r, gray.g, gray.b);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${new Date().getFullYear()} - Todos os direitos reservados`, pageWidth - margin - 42, footerY + 6);

    pdf.save(`relatorio-wiize-${new Date().toISOString().split('T')[0]}.pdf`);
    
    setShowExportDialog(false);
    toast({
      title: "PDF exportado!",
      description: "Seu relatorio foi baixado com sucesso.",
    });
  };

  const getFilterLabel = () => {
    switch (dateFilter) {
      case "7days": return "Últimos 7 dias";
      case "30days": return "Últimos 30 dias";
      case "90days": return "Últimos 90 dias";
      default: return "Todo período";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background relative overflow-hidden">
        <BackgroundGlow />
        {/* Sidebar - Desktop only */}
        <AppSidebar profile={profile} />

        <div className="flex-1 flex flex-col min-w-0 lg:pl-[72px]">
          {/* Header */}
          <AppHeader profile={profile} />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto" ref={reportRef}>
            {/* Page Header with filters */}
            <div className="max-w-7xl mx-auto mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1">Relatórios</h1>
                <p className="text-muted-foreground text-sm">
                  Acompanhe suas métricas e performance
                </p>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3">
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-28 sm:w-40 h-8 sm:h-9 text-xs sm:text-sm">
                    <Filter size={14} className="mr-1 sm:mr-2 flex-shrink-0" />
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo período</SelectItem>
                    <SelectItem value="7days">Últimos 7 dias</SelectItem>
                    <SelectItem value="30days">Últimos 30 dias</SelectItem>
                    <SelectItem value="90days">Últimos 90 dias</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button variant="outline" size="sm" onClick={handleExportClick} className="gap-2 h-8 sm:h-9 px-2 sm:px-3">
                  <Download size={16} />
                  <span className="hidden sm:inline">Exportar</span>
                </Button>
              </div>
            </div>

            {/* Tabs for different report sections */}
            <div className="max-w-7xl mx-auto">
              <Tabs defaultValue="prospecting" className="space-y-6">
                <TabsList className="grid w-full max-w-md grid-cols-1">
                  <TabsTrigger value="prospecting">Prospecção</TabsTrigger>
                </TabsList>

                <TabsContent value="prospecting" className="space-y-6">
                  {stats.totalSearches === 0 ? (
                    <ReportEmptyState
                      title="Sem dados suficientes para análise"
                      description="Comece a prospectar leads para visualizar seus relatórios de performance, nichos explorados e evolução ao longo do tempo."
                      actionLabel="Prospectar leads"
                      actionLink="/dashboard"
                      icon={<Search size={28} className="text-muted-foreground/40" />}
                    />
                  ) : (
                  <>
                  {/* Stats Cards with staggered animation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

          {/* Charts Row 1 with animation */}
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
                          backgroundColor: '#1f2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#f9fafb'
                        }}
                        labelStyle={{ color: '#f9fafb' }}
                        cursor={{ fill: 'rgba(55, 65, 81, 0.5)' }}
                      />
                      <Legend />
                      <Bar dataKey="searches" name="Buscas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="leads" name="Leads" fill="#06b6d4" radius={[4, 4, 0, 0]} />
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
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1f2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#f9fafb'
                        }}
                        itemStyle={{ color: '#f9fafb' }}
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
            <Card className="glass animate-fade-in" style={{ animationDelay: '600ms', animationFillMode: 'both' }}>
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
                          backgroundColor: '#1f2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#f9fafb'
                        }}
                        labelStyle={{ color: '#f9fafb' }}
                        itemStyle={{ color: '#f9fafb' }}
                        formatter={(value: number) => [`${value} leads`, 'Quantidade']}
                        cursor={{ fill: 'rgba(55, 65, 81, 0.5)' }}
                      />
                      <Bar dataKey="leads" fill="#22c55e" radius={[0, 4, 4, 0]} />
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
            <Card className="glass animate-fade-in" style={{ animationDelay: '700ms', animationFillMode: 'both' }}>
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
                          backgroundColor: '#1f2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#f9fafb'
                        }}
                        labelStyle={{ color: '#f9fafb' }}
                        itemStyle={{ color: '#f9fafb' }}
                        formatter={(value: number) => [`${value} leads`, 'Quantidade']}
                        cursor={{ fill: 'rgba(55, 65, 81, 0.5)' }}
                      />
                      <Bar dataKey="leads" fill="#14b8a6" radius={[0, 4, 4, 0]} />
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
            <Card className="glass animate-fade-in" style={{ animationDelay: '800ms', animationFillMode: 'both' }}>
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
                      <div 
                        key={niche.name} 
                        className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/30 animate-fade-in"
                        style={{ animationDelay: `${850 + index * 50}ms`, animationFillMode: 'both' }}
                      >
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                          style={{ backgroundColor: `${CHART_COLORS[index]}20`, color: CHART_COLORS[index] }}
                        >
                          {index + 1}º
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium capitalize truncate text-foreground">{niche.name}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold" style={{ color: CHART_COLORS[index] }}>{niche.count}</span>
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
            <Card className="glass animate-fade-in" style={{ animationDelay: '900ms', animationFillMode: 'both' }}>
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
                      <div 
                        key={region.name} 
                        className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/30 animate-fade-in"
                        style={{ animationDelay: `${950 + index * 50}ms`, animationFillMode: 'both' }}
                      >
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                          style={{ backgroundColor: `${CHART_COLORS[index + 8]}20`, color: CHART_COLORS[index + 8] }}
                        >
                          {index + 1}º
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium capitalize truncate text-foreground">{region.name}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold" style={{ color: CHART_COLORS[index + 8] }}>{region.count}</span>
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
                  </>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Exportar Relatório</DialogTitle>
            <DialogDescription>
              Escolha como deseja exportar seu relatório de prospecção
            </DialogDescription>
          </DialogHeader>

          {!exportMode && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <button
                onClick={() => setExportMode('link')}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-secondary/50 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <LinkIcon size={24} className="text-primary" />
                </div>
                <div className="text-center">
                  <div className="font-medium">Compartilhar Link</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Protegido por senha
                  </div>
                </div>
              </button>

              <button
                onClick={() => setExportMode('pdf')}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-secondary/50 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText size={24} className="text-primary" />
                </div>
                <div className="text-center">
                  <div className="font-medium">Baixar PDF</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Formato paisagem
                  </div>
                </div>
              </button>
            </div>
          )}

          {exportMode === 'link' && !generatedLink && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock size={14} />
                  Crie uma senha de acesso
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 4 caracteres"
                  value={linkPassword}
                  onChange={(e) => setLinkPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Quem receber o link precisará desta senha para visualizar o relatório
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setExportMode(null)} className="flex-1">
                  Voltar
                </Button>
                <Button onClick={handleGenerateLink} className="flex-1 gap-2" disabled={isGenerating}>
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
            </div>
          )}

          {exportMode === 'link' && generatedLink && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-secondary rounded-lg">
                <Label className="text-xs text-muted-foreground">Link gerado:</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input value={generatedLink} readOnly className="text-xs" />
                  <Button size="icon" variant="outline" onClick={handleCopyLink}>
                    {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </Button>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-sm text-amber-200">
                  <strong>Importante:</strong> Envie a senha separadamente para quem receber o link. O link expira em 7 dias.
                </p>
              </div>

              <Button variant="outline" onClick={() => setShowExportDialog(false)} className="w-full">
                Fechar
              </Button>
            </div>
          )}

          {exportMode === 'pdf' && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-secondary/50 rounded-lg text-center">
                <FileText size={48} className="mx-auto mb-3 text-primary" />
                <p className="font-medium">Relatório em PDF</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Formato paisagem • Fundo branco • Filtro: {getFilterLabel()}
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setExportMode(null)} className="flex-1">
                  Voltar
                </Button>
                <Button onClick={handleExportPDF} className="flex-1 gap-2">
                  <Download size={16} />
                  Baixar PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default Reports;
