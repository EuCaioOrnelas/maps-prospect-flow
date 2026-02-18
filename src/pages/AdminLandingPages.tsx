import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Eye,
  Copy,
  Trash2,
  BarChart3,
  Users,
  MousePointerClick,
  UserPlus,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  ExternalLink,
  Calendar as CalendarIcon,
  ArrowRightLeft,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, subYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface LandingPage {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

interface PageStats {
  pageViews: number;
  signupClicks: number;
  signupCompleted: number;
  purchases: number;
  trialNoUpgrade: number;
  totalRevenue: number;
  conversionRate: number;
}

interface StripeMRRData {
  totalMRR: number;
  activeSubscriptions: number;
  planDistribution: { [plan: string]: number };
  monthlyMRR: Array<{ month: string; mrr: number }>;
}

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface CompareData {
  pageId: string;
  pageName: string;
  dateRange: DateRange;
  stats: PageStats | null;
}

// Date preset shortcuts
const DATE_PRESETS = [
  { label: "Último mês", getRange: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: "Últimos 3 meses", getRange: () => ({ from: startOfMonth(subMonths(new Date(), 3)), to: new Date() }) },
  { label: "Últimos 6 meses", getRange: () => ({ from: startOfMonth(subMonths(new Date(), 6)), to: new Date() }) },
  { label: "Ano atual", getRange: () => ({ from: startOfYear(new Date()), to: new Date() }) },
  { label: "Último ano", getRange: () => ({ from: startOfYear(subYears(new Date(), 1)), to: endOfMonth(new Date(new Date().getFullYear() - 1, 11, 31)) }) },
  { label: "Todo período", getRange: () => ({ from: undefined, to: undefined }) },
];

const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

const AdminLandingPages = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedPage, setSelectedPage] = useState<string>("all");
  const [stats, setStats] = useState<{ [key: string]: PageStats }>({});
  const [stripeMRR, setStripeMRR] = useState<StripeMRRData | null>(null);
  const [loadingStripeMRR, setLoadingStripeMRR] = useState(false);

  // Date filter
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [showDateFrom, setShowDateFrom] = useState(false);
  const [showDateTo, setShowDateTo] = useState(false);

  // Comparison
  const [showCompare, setShowCompare] = useState(false);
  const [compareA, setCompareA] = useState<CompareData>({ pageId: "", pageName: "", dateRange: { from: undefined, to: undefined }, stats: null });
  const [compareB, setCompareB] = useState<CompareData>({ pageId: "", pageName: "", dateRange: { from: undefined, to: undefined }, stats: null });
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [showCompareFromA, setShowCompareFromA] = useState(false);
  const [showCompareToA, setShowCompareToA] = useState(false);
  const [showCompareFromB, setShowCompareFromB] = useState(false);
  const [showCompareToB, setShowCompareToB] = useState(false);

  // Create page dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [newPageSlug, setNewPageSlug] = useState("");
  const [creating, setCreating] = useState(false);

  const checkIsAdmin = async (): Promise<boolean> => {
    const { data, error } = await supabase.rpc("is_current_user_admin");
    if (error) return false;
    return data === true;
  };

  const fetchStats = useCallback(async (startDate?: Date, endDate?: Date) => {
    const params: { p_start_date?: string; p_end_date?: string } = {};
    if (startDate) params.p_start_date = startDate.toISOString();
    if (endDate) params.p_end_date = endDate.toISOString();

    const { data, error } = await supabase.rpc("get_landing_page_stats_filtered", params);
    if (error) {
      console.error("Error loading stats:", error);
      return {};
    }

    const statsMap: { [key: string]: PageStats } = {};
    const rpcStats = (data || []) as Array<{
      landing_page_id: string;
      page_views: number;
      signup_clicks: number;
      signup_completed: number;
      purchases: number;
      trial_no_upgrade: number;
    }>;

    for (const row of rpcStats) {
      const pageViews = row.page_views || 0;
      const purchases = row.purchases || 0;
      const conversionRate = pageViews > 0 ? (purchases / pageViews) * 100 : 0;

      statsMap[row.landing_page_id] = {
        pageViews,
        signupClicks: row.signup_clicks || 0,
        signupCompleted: row.signup_completed || 0,
        purchases,
        trialNoUpgrade: row.trial_no_upgrade || 0,
        totalRevenue: 0,
        conversionRate,
      };
    }
    return statsMap;
  }, []);

  const loadAllData = useCallback(async () => {
    try {
      const [pagesResult, statsMap] = await Promise.all([
        supabase.from("landing_pages").select("*").order("created_at", { ascending: false }),
        fetchStats(dateRange.from, dateRange.to),
      ]);

      if (pagesResult.error) {
        console.error("Error loading pages:", pagesResult.error);
        return;
      }

      setPages(pagesResult.data || []);
      setStats(statsMap);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }, [fetchStats, dateRange]);

  const loadStripeMRR = useCallback(async () => {
    setLoadingStripeMRR(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-stripe-mrr");
      if (error) {
        console.error("Error loading Stripe MRR:", error);
        return;
      }
      if (data) setStripeMRR(data);
    } catch (err) {
      console.error("Error invoking get-stripe-mrr:", err);
    } finally {
      setLoadingStripeMRR(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!user || !profile) { navigate("/login"); return; }
      const adminStatus = await checkIsAdmin();
      if (!adminStatus) {
        toast({ title: "Acesso negado", description: "Você não tem permissão.", variant: "destructive" });
        navigate("/dashboard");
        return;
      }
      setIsAdmin(true);
      await Promise.all([loadAllData(), loadStripeMRR()]);
      setLoading(false);
    };
    init();
  }, [user, profile, navigate, toast, loadAllData, loadStripeMRR]);

  // Reload stats when date range changes
  useEffect(() => {
    if (!loading && isAdmin) {
      loadAllData();
    }
  }, [dateRange]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyDatePreset = (preset: typeof DATE_PRESETS[0]) => {
    const range = preset.getRange();
    setDateRange({ from: range.from, to: range.to });
  };

  // Compare logic
  const runComparison = async () => {
    if (!compareA.pageId || !compareB.pageId) {
      toast({ title: "Selecione as páginas", variant: "destructive" });
      return;
    }
    setLoadingCompare(true);
    try {
      const [statsA, statsB] = await Promise.all([
        fetchStats(compareA.dateRange.from, compareA.dateRange.to),
        fetchStats(compareB.dateRange.from, compareB.dateRange.to),
      ]);
      setCompareA(prev => ({ ...prev, stats: statsA[prev.pageId] || { pageViews: 0, signupClicks: 0, signupCompleted: 0, purchases: 0, trialNoUpgrade: 0, totalRevenue: 0, conversionRate: 0 } }));
      setCompareB(prev => ({ ...prev, stats: statsB[prev.pageId] || { pageViews: 0, signupClicks: 0, signupCompleted: 0, purchases: 0, trialNoUpgrade: 0, totalRevenue: 0, conversionRate: 0 } }));
    } finally {
      setLoadingCompare(false);
    }
  };

  const createPage = async () => {
    if (!newPageName.trim() || !newPageSlug.trim()) {
      toast({ title: "Erro", description: "Preencha o nome e o slug.", variant: "destructive" });
      return;
    }
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(newPageSlug)) {
      toast({ title: "Slug inválido", description: "Use apenas letras minúsculas, números e hífens.", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("landing_pages").insert({ name: newPageName.trim(), slug: newPageSlug.trim().toLowerCase() });
    if (error) {
      toast({ title: error.code === "23505" ? "Slug já existe" : "Erro ao criar", description: error.message, variant: "destructive" });
      setCreating(false);
      return;
    }
    toast({ title: "Página criada!", description: `"${newPageName}" criada com sucesso.` });
    setNewPageName(""); setNewPageSlug(""); setShowCreateDialog(false); setCreating(false);
    await loadAllData();
  };

  const togglePageStatus = async (pageId: string, currentStatus: boolean) => {
    const { error } = await supabase.from("landing_pages").update({ is_active: !currentStatus }).eq("id", pageId);
    if (error) { toast({ title: "Erro", variant: "destructive" }); return; }
    await loadAllData();
  };

  const deletePage = async (pageId: string, slug: string) => {
    if (slug === "index") { toast({ title: "Erro", description: "Não pode excluir a principal.", variant: "destructive" }); return; }
    if (!confirm("Excluir esta página? Dados de tracking serão perdidos.")) return;
    const { error } = await supabase.from("landing_pages").delete().eq("id", pageId);
    if (error) { toast({ title: "Erro", variant: "destructive" }); return; }
    toast({ title: "Página excluída" });
    await loadAllData();
  };

  const copyPageUrl = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/lp/${slug}`);
    toast({ title: "Link copiado!" });
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const getFilteredStats = (): PageStats => {
    if (selectedPage === "all") {
      return Object.values(stats).reduce(
        (acc, s) => ({
          pageViews: acc.pageViews + s.pageViews,
          signupClicks: acc.signupClicks + s.signupClicks,
          signupCompleted: acc.signupCompleted + s.signupCompleted,
          purchases: acc.purchases + s.purchases,
          trialNoUpgrade: acc.trialNoUpgrade + s.trialNoUpgrade,
          totalRevenue: acc.totalRevenue + s.totalRevenue,
          conversionRate: 0,
        }),
        { pageViews: 0, signupClicks: 0, signupCompleted: 0, purchases: 0, trialNoUpgrade: 0, totalRevenue: 0, conversionRate: 0 }
      );
    }
    return stats[selectedPage] || { pageViews: 0, signupClicks: 0, signupCompleted: 0, purchases: 0, trialNoUpgrade: 0, totalRevenue: 0, conversionRate: 0 };
  };

  const filteredStats = getFilteredStats();

  // Use Stripe data for charts
  const chartData = stripeMRR?.monthlyMRR || [];

  const pieData = pages.map((page) => ({
    name: page.name,
    value: stats[page.id]?.signupCompleted || 0,
  }));

  // Date picker helper
  const DatePickerButton = ({ date, onClick, placeholder }: { date: Date | undefined; onClick: () => void; placeholder: string }) => (
    <Button variant="outline" size="sm" onClick={onClick} className="text-xs h-8">
      <CalendarIcon size={14} className="mr-1" />
      {date ? format(date, "dd/MM/yyyy") : placeholder}
    </Button>
  );

  // Comparison metric row
  const CompareMetricRow = ({ label, valueA, valueB, format: fmt }: { label: string; valueA: number; valueB: number; format?: (v: number) => string }) => {
    const fmtFn = fmt || ((v: number) => v.toLocaleString());
    const diff = valueA - valueB;
    const pctDiff = valueB > 0 ? ((diff / valueB) * 100).toFixed(1) : valueA > 0 ? "+∞" : "0";
    return (
      <div className="grid grid-cols-4 gap-2 py-2 border-b border-border/30 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-center font-medium">{fmtFn(valueA)}</span>
        <span className="text-center font-medium">{fmtFn(valueB)}</span>
        <span className={cn("text-center font-semibold", diff > 0 ? "text-green-400" : diff < 0 ? "text-red-400" : "text-muted-foreground")}>
          {typeof pctDiff === "string" ? pctDiff : `${pctDiff}%`}{diff > 0 ? " ↑" : diff < 0 ? " ↓" : ""}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">Voltar ao Admin</span>
            </Link>
            <Logo size="sm" />
          </div>
          <h1 className="text-lg font-semibold">Analytics de Landing Pages</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-4 flex-wrap">
              <Select value={selectedPage} onValueChange={setSelectedPage}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por página" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as páginas</SelectItem>
                  {pages.map((page) => (
                    <SelectItem key={page.id} value={page.id}>{page.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={() => setShowCompare(!showCompare)}>
                <ArrowRightLeft size={16} className="mr-1" />
                Comparar
              </Button>
            </div>

            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button><Plus size={18} className="mr-2" />Nova Página</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Landing Page</DialogTitle>
                  <DialogDescription>Crie uma nova versão para testes A/B ou campanhas.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input id="name" placeholder="Ex: Campanha Black Friday" value={newPageName} onChange={(e) => setNewPageName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug (URL)</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">/lp/</span>
                      <Input id="slug" placeholder="black-friday" value={newPageSlug} onChange={(e) => setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
                  <Button onClick={createPage} disabled={creating}>
                    {creating ? <><Loader2 className="animate-spin mr-2" size={16} />Criando...</> : "Criar Página"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Date Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Período:</span>
            {DATE_PRESETS.map((preset) => (
              <Button key={preset.label} variant="ghost" size="sm" className="text-xs h-7" onClick={() => applyDatePreset(preset)}>
                {preset.label}
              </Button>
            ))}
            <div className="flex items-center gap-1 ml-2">
              <Popover open={showDateFrom} onOpenChange={setShowDateFrom}>
                <PopoverTrigger asChild>
                  <DatePickerButton date={dateRange.from} onClick={() => setShowDateFrom(true)} placeholder="De" />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateRange.from} onSelect={(d) => { setDateRange(prev => ({ ...prev, from: d })); setShowDateFrom(false); }} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground text-xs">→</span>
              <Popover open={showDateTo} onOpenChange={setShowDateTo}>
                <PopoverTrigger asChild>
                  <DatePickerButton date={dateRange.to} onClick={() => setShowDateTo(true)} placeholder="Até" />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateRange.to} onSelect={(d) => { setDateRange(prev => ({ ...prev, to: d })); setShowDateTo(false); }} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              {(dateRange.from || dateRange.to) && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDateRange({ from: undefined, to: undefined })}>
                  <X size={14} />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Comparison Panel */}
        {showCompare && (
          <div className="glass rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2"><ArrowRightLeft size={18} />Comparador de Desempenho</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowCompare(false)}><X size={18} /></Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Side A */}
              <div className="space-y-3 p-4 border border-border/50 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-400">Lado A</h4>
                <Select value={compareA.pageId} onValueChange={(v) => setCompareA(prev => ({ ...prev, pageId: v, pageName: pages.find(p => p.id === v)?.name || "" }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma página" /></SelectTrigger>
                  <SelectContent>
                    {pages.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <Popover open={showCompareFromA} onOpenChange={setShowCompareFromA}>
                    <PopoverTrigger asChild><DatePickerButton date={compareA.dateRange.from} onClick={() => setShowCompareFromA(true)} placeholder="De" /></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={compareA.dateRange.from} onSelect={(d) => { setCompareA(prev => ({ ...prev, dateRange: { ...prev.dateRange, from: d } })); setShowCompareFromA(false); }} className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                  <span className="text-xs text-muted-foreground">→</span>
                  <Popover open={showCompareToA} onOpenChange={setShowCompareToA}>
                    <PopoverTrigger asChild><DatePickerButton date={compareA.dateRange.to} onClick={() => setShowCompareToA(true)} placeholder="Até" /></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={compareA.dateRange.to} onSelect={(d) => { setCompareA(prev => ({ ...prev, dateRange: { ...prev.dateRange, to: d } })); setShowCompareToA(false); }} className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              {/* Side B */}
              <div className="space-y-3 p-4 border border-border/50 rounded-lg">
                <h4 className="text-sm font-semibold text-purple-400">Lado B</h4>
                <Select value={compareB.pageId} onValueChange={(v) => setCompareB(prev => ({ ...prev, pageId: v, pageName: pages.find(p => p.id === v)?.name || "" }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma página" /></SelectTrigger>
                  <SelectContent>
                    {pages.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <Popover open={showCompareFromB} onOpenChange={setShowCompareFromB}>
                    <PopoverTrigger asChild><DatePickerButton date={compareB.dateRange.from} onClick={() => setShowCompareFromB(true)} placeholder="De" /></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={compareB.dateRange.from} onSelect={(d) => { setCompareB(prev => ({ ...prev, dateRange: { ...prev.dateRange, from: d } })); setShowCompareFromB(false); }} className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                  <span className="text-xs text-muted-foreground">→</span>
                  <Popover open={showCompareToB} onOpenChange={setShowCompareToB}>
                    <PopoverTrigger asChild><DatePickerButton date={compareB.dateRange.to} onClick={() => setShowCompareToB(true)} placeholder="Até" /></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={compareB.dateRange.to} onSelect={(d) => { setCompareB(prev => ({ ...prev, dateRange: { ...prev.dateRange, to: d } })); setShowCompareToB(false); }} className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
            <Button onClick={runComparison} disabled={loadingCompare} className="w-full">
              {loadingCompare ? <><Loader2 className="animate-spin mr-2" size={16} />Comparando...</> : "Comparar"}
            </Button>
            {compareA.stats && compareB.stats && (
              <div className="mt-4">
                <div className="grid grid-cols-4 gap-2 py-2 border-b border-border font-semibold text-sm">
                  <span>Métrica</span>
                  <span className="text-center text-blue-400">{compareA.pageName || "A"}</span>
                  <span className="text-center text-purple-400">{compareB.pageName || "B"}</span>
                  <span className="text-center">Diferença</span>
                </div>
                <CompareMetricRow label="Views" valueA={compareA.stats.pageViews} valueB={compareB.stats.pageViews} />
                <CompareMetricRow label="Cliques" valueA={compareA.stats.signupClicks} valueB={compareB.stats.signupClicks} />
                <CompareMetricRow label="Cadastros" valueA={compareA.stats.signupCompleted} valueB={compareB.stats.signupCompleted} />
                <CompareMetricRow label="Compras" valueA={compareA.stats.purchases} valueB={compareB.stats.purchases} />
                <CompareMetricRow label="Trial s/ Upgrade" valueA={compareA.stats.trialNoUpgrade} valueB={compareB.stats.trialNoUpgrade} />
                <CompareMetricRow label="Conv. %" valueA={compareA.stats.conversionRate} valueB={compareB.stats.conversionRate} format={(v) => `${v.toFixed(2)}%`} />
              </div>
            )}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2"><Eye size={18} className="text-blue-400" /><span className="text-sm text-muted-foreground">Visualizações</span></div>
            <p className="text-2xl font-bold">{filteredStats.pageViews.toLocaleString()}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2"><MousePointerClick size={18} className="text-purple-400" /><span className="text-sm text-muted-foreground">Cliques Signup</span></div>
            <p className="text-2xl font-bold">{filteredStats.signupClicks.toLocaleString()}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2"><UserPlus size={18} className="text-green-400" /><span className="text-sm text-muted-foreground">Cadastros</span></div>
            <p className="text-2xl font-bold">{filteredStats.signupCompleted.toLocaleString()}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2"><ShoppingCart size={18} className="text-amber-400" /><span className="text-sm text-muted-foreground">Compras</span></div>
            <p className="text-2xl font-bold">{filteredStats.purchases.toLocaleString()}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2"><Users size={18} className="text-red-400" /><span className="text-sm text-muted-foreground">Trial s/ Upgrade</span></div>
            <p className="text-2xl font-bold">{filteredStats.trialNoUpgrade.toLocaleString()}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2"><DollarSign size={18} className="text-emerald-400" /><span className="text-sm text-muted-foreground">Faturamento</span></div>
            <p className="text-2xl font-bold">{formatCurrency(stripeMRR?.totalMRR || 0)}</p>
          </div>
        </div>

        {/* MRR Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={20} className="text-primary" />
              <h3 className="font-semibold">MRR Total</h3>
              {loadingStripeMRR && <Loader2 size={16} className="animate-spin" />}
            </div>
            <p className="text-3xl font-bold text-primary">{formatCurrency(stripeMRR?.totalMRR || 0)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {stripeMRR ? `${stripeMRR.activeSubscriptions} assinaturas ativas` : "Carregando..."}
            </p>
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={20} className="text-primary" />
              <h3 className="font-semibold">Distribuição por Plano</h3>
            </div>
            {stripeMRR?.planDistribution && Object.keys(stripeMRR.planDistribution).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(stripeMRR.planDistribution).map(([plan, count]) => (
                  <div key={plan} className="flex justify-between items-center">
                    <span className="capitalize text-sm">{plan}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">{loadingStripeMRR ? "Carregando..." : "Sem dados"}</p>
            )}
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart size={20} className="text-primary" />
              <h3 className="font-semibold">Compras Reais</h3>
            </div>
            <p className="text-3xl font-bold text-primary">{stripeMRR?.activeSubscriptions || 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Assinaturas ativas</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass rounded-xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <CalendarIcon size={18} />Faturamento Mensal (Stripe)
            </h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }} formatter={(value: number) => [formatCurrency(value), "MRR"]} />
                  <Area type="monotone" dataKey="mrr" stroke="#8b5cf6" fill="url(#colorMrr)" strokeWidth={2} />
                  <defs>
                    <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                {loadingStripeMRR ? "Carregando dados do Stripe..." : "Sem dados de faturamento"}
              </div>
            )}
          </div>

          <div className="glass rounded-xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <UserPlus size={18} />Cadastros por Página
            </h3>
            {pieData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => percent > 0 ? `${name} (${(percent * 100).toFixed(0)}%)` : ""} outerRadius={100} fill="#8884d8" dataKey="value">
                    {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">Sem dados</div>
            )}
          </div>
        </div>

        {/* Pages Table */}
        <div className="glass rounded-xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><BarChart3 size={18} />Landing Pages</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Página</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="text-center">Views</TableHead>
                  <TableHead className="text-center">Cliques</TableHead>
                  <TableHead className="text-center">Cadastros</TableHead>
                  <TableHead className="text-center">Compras</TableHead>
                  <TableHead className="text-center">CTR %</TableHead>
                  <TableHead className="text-center">Conv. %</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.map((page) => {
                  const ps = stats[page.id] || { pageViews: 0, signupClicks: 0, signupCompleted: 0, purchases: 0, totalRevenue: 0, conversionRate: 0 };
                  const ctr = ps.pageViews > 0 ? ((ps.signupClicks / ps.pageViews) * 100).toFixed(1) : "0.0";
                  const convRate = ps.pageViews > 0 ? ((ps.purchases / ps.pageViews) * 100).toFixed(2) : "0.00";

                  return (
                    <TableRow key={page.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{page.name}</p>
                          <p className="text-xs text-muted-foreground">Criada em {formatDate(page.created_at)}</p>
                        </div>
                      </TableCell>
                      <TableCell><code className="text-xs bg-secondary px-2 py-1 rounded">/lp/{page.slug}</code></TableCell>
                      <TableCell className="text-center">{ps.pageViews.toLocaleString()}</TableCell>
                      <TableCell className="text-center">{ps.signupClicks.toLocaleString()}</TableCell>
                      <TableCell className="text-center">{ps.signupCompleted.toLocaleString()}</TableCell>
                      <TableCell className="text-center">{ps.purchases.toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        <span className={ctr !== "0.0" ? "text-blue-400" : "text-muted-foreground"}>{ctr}%</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={convRate !== "0.00" ? "text-green-400" : "text-muted-foreground"}>{convRate}%</span>
                      </TableCell>
                      <TableCell>
                        <Button variant={page.is_active ? "default" : "outline"} size="sm" onClick={() => togglePageStatus(page.id, page.is_active)}>
                          {page.is_active ? "Ativa" : "Inativa"}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => copyPageUrl(page.slug)} title="Copiar link"><Copy size={16} /></Button>
                          <Button variant="ghost" size="icon" asChild title="Abrir página">
                            <a href={`/lp/${page.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /></a>
                          </Button>
                          {page.slug !== "index" && (
                            <Button variant="ghost" size="icon" onClick={() => deletePage(page.id, page.slug)} className="text-destructive" title="Excluir"><Trash2 size={16} /></Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLandingPages;
