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
  Calendar,
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

// Preços dos planos baseados nos IDs de preço da Stripe
const STRIPE_PRICE_TO_PLAN: { [key: string]: { name: string; price: number } } = {
  "price_1SlykAK8CM0R6xMMOCM684rz": { name: "start", price: 197 },
  "price_1SlykkK8CM0R6xMMZu7WJesV": { name: "growth", price: 497 },
  "price_1SlylcK8CM0R6xMMyHRWAd8G": { name: "scale", price: 897 },
};

const PLAN_PRICES: { [key: string]: number } = {
  free: 0,
  start: 197,
  growth: 497,
  scale: 897,
};

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

interface MonthlyMRR {
  month: string;
  mrr: number;
  purchases: number;
}

interface StripeMRRData {
  totalMRR: number;
  activeSubscriptions: number;
  planDistribution: { [plan: string]: number };
  monthlyMRR: Array<{ month: string; mrr: number }>;
}

const AdminLandingPages = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedPage, setSelectedPage] = useState<string>("all");
  const [stats, setStats] = useState<{ [key: string]: PageStats }>({});
  const [monthlyMRR, setMonthlyMRR] = useState<{ [key: string]: MonthlyMRR[] }>({});
  const [averageMRR, setAverageMRR] = useState<number>(0);
  const [totalMRR, setTotalMRR] = useState<number>(0);
  const [stripeMRR, setStripeMRR] = useState<StripeMRRData | null>(null);
  const [loadingStripeMRR, setLoadingStripeMRR] = useState(false);

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

  // Load all data (fetch events with pagination to avoid the 1000-row default limit)
  const loadAllData = useCallback(async () => {
    try {
      const PAGE_SIZE = 1000;

      const fetchAllEvents = async () => {
        const all: any[] = [];
        for (let offset = 0; offset < 50000; offset += PAGE_SIZE) {
          const { data, error } = await supabase
            .from("landing_page_events")
            .select("*")
            .order("created_at", { ascending: false })
            .range(offset, offset + PAGE_SIZE - 1);

          if (error) throw error;
          if (!data || data.length === 0) break;

          all.push(...data);
          if (data.length < PAGE_SIZE) break;
        }
        return all;
      };

      // Fetch pages and events in parallel
      const [pagesResult, events] = await Promise.all([
        supabase
          .from("landing_pages")
          .select("*")
          .order("created_at", { ascending: false }),
        fetchAllEvents(),
      ]);

      if (pagesResult.error) {
        console.error("Error loading pages:", pagesResult.error);
        return;
      }

      const loadedPages = pagesResult.data || [];
      setPages(loadedPages);

      // Calculate stats per page
      const statsMap: { [key: string]: PageStats } = {};
      const mrrMap: { [key: string]: { [month: string]: { mrr: number; purchases: number } } } = {};

      for (const page of loadedPages) {
        const pageEvents = events.filter((e) => e.landing_page_id === page.id);

        const pageViews = pageEvents.filter((e) => e.event_type === "page_view").length;
        const signupClicks = pageEvents.filter((e) => e.event_type === "signup_click").length;
        const signupCompleted = pageEvents.filter((e) => e.event_type === "signup_completed").length;
        const purchaseEvents = pageEvents.filter((e) => e.event_type === "purchase");
        const purchases = purchaseEvents.length;
        const trialNoUpgrade = pageEvents.filter((e) => e.event_type === "trial_no_upgrade").length;

        // Calculate total revenue from purchases
        let totalRevenue = 0;
        purchaseEvents.forEach((e) => {
          const metadata = e.metadata as { plan?: string; amount?: number } | null;
          if (metadata?.plan) {
            totalRevenue += PLAN_PRICES[metadata.plan] || 0;
          }
        });

        const conversionRate = pageViews > 0 ? (purchases / pageViews) * 100 : 0;

        statsMap[page.id] = {
          pageViews,
          signupClicks,
          signupCompleted,
          purchases,
          trialNoUpgrade,
          totalRevenue,
          conversionRate,
        };

        // Calculate monthly MRR
        mrrMap[page.id] = {};
        purchaseEvents.forEach((e) => {
          const date = new Date(e.created_at);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          const metadata = e.metadata as { plan?: string } | null;
          const revenue = metadata?.plan ? PLAN_PRICES[metadata.plan] || 0 : 0;

          if (!mrrMap[page.id][monthKey]) {
            mrrMap[page.id][monthKey] = { mrr: 0, purchases: 0 };
          }
          mrrMap[page.id][monthKey].mrr += revenue;
          mrrMap[page.id][monthKey].purchases += 1;
        });
      }

      setStats(statsMap);

      // Convert monthly MRR to array format
      const monthlyMRRMap: { [key: string]: MonthlyMRR[] } = {};
      for (const pageId in mrrMap) {
        monthlyMRRMap[pageId] = Object.entries(mrrMap[pageId])
          .map(([month, data]) => ({
            month,
            mrr: data.mrr,
            purchases: data.purchases,
          }))
          .sort((a, b) => a.month.localeCompare(b.month));
      }
      setMonthlyMRR(monthlyMRRMap);

      // Calculate total and average MRR from page events (fallback)
      const allMRR = Object.values(statsMap).reduce((sum, s) => sum + s.totalRevenue, 0);
      setTotalMRR(allMRR);
      setAverageMRR(loadedPages.length > 0 ? allMRR / loadedPages.length : 0);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }, []);

  const loadPages = useCallback(async () => {
    await loadAllData();
  }, [loadAllData]);

  // Load real MRR from Stripe
  const loadStripeMRR = useCallback(async () => {
    setLoadingStripeMRR(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-stripe-mrr");
      if (error) {
        console.error("Error loading Stripe MRR:", error);
        return;
      }
      if (data) {
        setStripeMRR(data);
        // Override with real Stripe data
        setTotalMRR(data.totalMRR);
      }
    } catch (err) {
      console.error("Error invoking get-stripe-mrr:", err);
    } finally {
      setLoadingStripeMRR(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!user || !profile) {
        navigate("/login");
        return;
      }

      const adminStatus = await checkIsAdmin();
      if (!adminStatus) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para acessar esta página.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
      
      // Load all data in parallel for faster loading
      await Promise.all([
        loadAllData(),
        loadStripeMRR()
      ]);
      
      setLoading(false);
    };

    init();
  }, [user, profile, navigate, toast, loadAllData, loadStripeMRR]);

  const createPage = async () => {
    if (!newPageName.trim() || !newPageSlug.trim()) {
      toast({
        title: "Erro",
        description: "Preencha o nome e o slug da página.",
        variant: "destructive",
      });
      return;
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(newPageSlug)) {
      toast({
        title: "Slug inválido",
        description: "O slug deve conter apenas letras minúsculas, números e hífens.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);

    const { error } = await supabase.from("landing_pages").insert({
      name: newPageName.trim(),
      slug: newPageSlug.trim().toLowerCase(),
    });

    if (error) {
      if (error.code === "23505") {
        toast({
          title: "Slug já existe",
          description: "Escolha um slug diferente.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao criar página",
          description: error.message,
          variant: "destructive",
        });
      }
      setCreating(false);
      return;
    }

    toast({
      title: "Página criada!",
      description: `A página "${newPageName}" foi criada com sucesso.`,
    });

    setNewPageName("");
    setNewPageSlug("");
    setShowCreateDialog(false);
    setCreating(false);
    await loadPages();
  };

  const togglePageStatus = async (pageId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("landing_pages")
      .update({ is_active: !currentStatus })
      .eq("id", pageId);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status da página.",
        variant: "destructive",
      });
      return;
    }

    await loadPages();
  };

  const deletePage = async (pageId: string, slug: string) => {
    if (slug === "index") {
      toast({
        title: "Erro",
        description: "Não é possível excluir a página principal.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("Tem certeza que deseja excluir esta página? Todos os dados de tracking serão perdidos.")) {
      return;
    }

    const { error } = await supabase.from("landing_pages").delete().eq("id", pageId);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a página.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Página excluída",
      description: "A página foi excluída com sucesso.",
    });

    await loadPages();
  };

  const copyPageUrl = (slug: string) => {
    const url = `${window.location.origin}/lp/${slug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copiado!",
      description: "O link da página foi copiado para a área de transferência.",
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

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
        {
          pageViews: 0,
          signupClicks: 0,
          signupCompleted: 0,
          purchases: 0,
          trialNoUpgrade: 0,
          totalRevenue: 0,
          conversionRate: 0,
        }
      );
    }
    return stats[selectedPage] || {
      pageViews: 0,
      signupClicks: 0,
      signupCompleted: 0,
      purchases: 0,
      trialNoUpgrade: 0,
      totalRevenue: 0,
      conversionRate: 0,
    };
  };

  const getChartData = () => {
    if (selectedPage === "all") {
      // Combine all pages' monthly MRR
      const combined: { [month: string]: { mrr: number; purchases: number } } = {};
      Object.values(monthlyMRR).forEach((pageData) => {
        pageData.forEach((item) => {
          if (!combined[item.month]) {
            combined[item.month] = { mrr: 0, purchases: 0 };
          }
          combined[item.month].mrr += item.mrr;
          combined[item.month].purchases += item.purchases;
        });
      });
      return Object.entries(combined)
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month));
    }
    return monthlyMRR[selectedPage] || [];
  };

  const filteredStats = getFilteredStats();
  const chartData = getChartData();

  // Pie chart data for page comparison
  const pieData = pages.map((page) => ({
    name: page.name,
    value: stats[page.id]?.totalRevenue || 0,
  }));

  const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

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
            <Link
              to="/admin"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
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
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-4">
            <Select value={selectedPage} onValueChange={setSelectedPage}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por página" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as páginas</SelectItem>
                {pages.map((page) => (
                  <SelectItem key={page.id} value={page.id}>
                    {page.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus size={18} className="mr-2" />
                Nova Página
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Landing Page</DialogTitle>
                <DialogDescription>
                  Crie uma nova versão da landing page para testes A/B ou campanhas específicas.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Página</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Campanha Black Friday"
                    value={newPageName}
                    onChange={(e) => setNewPageName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (URL)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">/lp/</span>
                    <Input
                      id="slug"
                      placeholder="black-friday"
                      value={newPageSlug}
                      onChange={(e) =>
                        setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use apenas letras minúsculas, números e hífens
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={createPage} disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={16} />
                      Criando...
                    </>
                  ) : (
                    "Criar Página"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye size={18} className="text-blue-400" />
              <span className="text-sm text-muted-foreground">Visualizações</span>
            </div>
            <p className="text-2xl font-bold">{filteredStats.pageViews.toLocaleString()}</p>
          </div>

          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <MousePointerClick size={18} className="text-purple-400" />
              <span className="text-sm text-muted-foreground">Cliques Signup</span>
            </div>
            <p className="text-2xl font-bold">{filteredStats.signupClicks.toLocaleString()}</p>
          </div>

          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <UserPlus size={18} className="text-green-400" />
              <span className="text-sm text-muted-foreground">Cadastros</span>
            </div>
            <p className="text-2xl font-bold">{filteredStats.signupCompleted.toLocaleString()}</p>
          </div>

          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart size={18} className="text-amber-400" />
              <span className="text-sm text-muted-foreground">Compras</span>
            </div>
            <p className="text-2xl font-bold">{filteredStats.purchases.toLocaleString()}</p>
          </div>

          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users size={18} className="text-red-400" />
              <span className="text-sm text-muted-foreground">Trial s/ Upgrade</span>
            </div>
            <p className="text-2xl font-bold">{filteredStats.trialNoUpgrade.toLocaleString()}</p>
          </div>

        <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={18} className="text-emerald-400" />
              <span className="text-sm text-muted-foreground">Faturamento</span>
            </div>
            <p className="text-2xl font-bold">
              {formatCurrency(stripeMRR?.totalMRR || filteredStats.totalRevenue)}
            </p>
          </div>
        </div>

        {/* MRR Summary - Using real Stripe data */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={20} className="text-primary" />
              <h3 className="font-semibold">MRR Total (Stripe)</h3>
              {loadingStripeMRR && <Loader2 size={16} className="animate-spin" />}
            </div>
            <p className="text-3xl font-bold text-primary">
              {formatCurrency(stripeMRR?.totalMRR || totalMRR)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {stripeMRR ? `${stripeMRR.activeSubscriptions} assinaturas ativas` : "Carregando..."}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              * Exclui contas admin
            </p>
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={20} className="text-primary" />
              <h3 className="font-semibold">Distribuição por Plano</h3>
            </div>
            {stripeMRR?.planDistribution ? (
              <div className="space-y-2">
                {Object.entries(stripeMRR.planDistribution).map(([plan, count]) => (
                  <div key={plan} className="flex justify-between items-center">
                    <span className="capitalize text-sm">{plan}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Carregando...</p>
            )}
          </div>

          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart size={20} className="text-primary" />
              <h3 className="font-semibold">Compras Reais</h3>
            </div>
            <p className="text-3xl font-bold text-primary">
              {stripeMRR?.activeSubscriptions || filteredStats.purchases}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Assinaturas ativas no Stripe
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly MRR Chart */}
          <div className="glass rounded-xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Calendar size={18} />
              Faturamento Mensal
            </h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [formatCurrency(value), "MRR"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="mrr"
                    stroke="#8b5cf6"
                    fill="url(#colorMrr)"
                    strokeWidth={2}
                  />
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
                Sem dados de faturamento ainda
              </div>
            )}
          </div>

          {/* Revenue Distribution Pie Chart */}
          <div className="glass rounded-xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <DollarSign size={18} />
              Distribuição de Faturamento por Página
            </h3>
            {pieData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      percent > 0 ? `${name} (${(percent * 100).toFixed(0)}%)` : ""
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [formatCurrency(value), "Faturamento"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sem dados de faturamento ainda
              </div>
            )}
          </div>
        </div>

        {/* Pages Table */}
        <div className="glass rounded-xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 size={18} />
            Landing Pages
          </h3>

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
                  <TableHead className="text-right">Faturamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.map((page) => {
                  const pageStats = stats[page.id] || {
                    pageViews: 0,
                    signupClicks: 0,
                    signupCompleted: 0,
                    purchases: 0,
                    totalRevenue: 0,
                    conversionRate: 0,
                  };
                  
                  // CTR: Cliques de signup / Views
                  const ctr = pageStats.pageViews > 0
                    ? ((pageStats.signupClicks / pageStats.pageViews) * 100).toFixed(1)
                    : "0.0";
                  
                  // Conversão: Compras / Views
                  const convRate = pageStats.pageViews > 0
                    ? ((pageStats.purchases / pageStats.pageViews) * 100).toFixed(2)
                    : "0.00";

                  return (
                    <TableRow key={page.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{page.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Criada em {formatDate(page.created_at)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-secondary px-2 py-1 rounded">
                          /lp/{page.slug}
                        </code>
                      </TableCell>
                      <TableCell className="text-center">
                        {pageStats.pageViews.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        {pageStats.signupClicks.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        {pageStats.signupCompleted.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        {pageStats.purchases.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={ctr !== "0.0" ? "text-blue-400" : "text-muted-foreground"}>
                          {ctr}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={convRate !== "0.00" ? "text-green-400" : "text-muted-foreground"}>
                          {convRate}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {page.slug === 'index' 
                          ? formatCurrency(stripeMRR?.totalMRR || pageStats.totalRevenue)
                          : formatCurrency(pageStats.totalRevenue)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant={page.is_active ? "default" : "outline"}
                          size="sm"
                          onClick={() => togglePageStatus(page.id, page.is_active)}
                        >
                          {page.is_active ? "Ativa" : "Inativa"}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyPageUrl(page.slug)}
                            title="Copiar link"
                          >
                            <Copy size={16} />
                          </Button>
                          <a
                            href={`/lp/${page.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="icon" title="Visualizar">
                              <ExternalLink size={16} />
                            </Button>
                          </a>
                          {page.slug !== "index" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deletePage(page.id, page.slug)}
                              title="Excluir"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 size={16} />
                            </Button>
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
