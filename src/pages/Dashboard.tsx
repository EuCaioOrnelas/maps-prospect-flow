import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Search, 
  MapPin, 
  Download, 
  Loader2,
  Building2,
  Phone,
  Globe,
  Star,
  ExternalLink,
  History,
  Brain,
  Target,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Zap,
  Clock,
  Crown,
  AlertCircle,
  CheckSquare,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { Checkbox } from "@/components/ui/checkbox";
import { useNotifications } from "@/hooks/useNotifications";
import { UpgradeModal } from "@/components/whatsapp/UpgradeModal";

// Onboarding modal removido — apenas o GuidedTour orienta novos usuários.
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAutoScoreTracking } from "@/hooks/useAutoScoreTracking";
import { CompanyProfileOnboarding } from "@/components/opportunities/CompanyProfileOnboarding";
interface Lead {
  name: string;
  category: string;
  address: string;
  city: string;
  phone: string;
  website: string;
  rating: number;
  reviewCount: number;
  mapsLink: string;
}

interface SearchHistoryItem {
  id: string;
  keyword: string;
  location: string;
  results_count: number;
  created_at: string;
  leads?: Lead[];
}

const RESULTS_PER_PAGE = 10;
const HISTORY_PER_PAGE = 20;
const MAX_HISTORY_ITEMS = 200; // Histórico ampliado para manter mais buscas

const Dashboard = () => {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showWhatsAppUpgradeModal, setShowWhatsAppUpgradeModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set());
  const [bulkExporting, setBulkExporting] = useState(false);
  
  // Pagination states
  const [currentResultPage, setCurrentResultPage] = useState(1);
  const [currentHistoryPage, setCurrentHistoryPage] = useState(1);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile, signOut, refreshProfile, user, isTrialExpired, trialDaysRemaining } = useAuth();
  const { requestPermission, notifyCreditsExhausted, notifyLowCredits, isSupported, permission } = useNotifications();
  const { trackScoreEvent } = useAutoScoreTracking("dashboard");

  // Company profile gate (mesmo perfil exigido em Oportunidades)
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [showCompanyOnboarding, setShowCompanyOnboarding] = useState(false);
  const [pendingSearch, setPendingSearch] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("company_profiles" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setCompanyProfile(data);
    })();
  }, [user]);

  const searchesRemaining = profile ? (profile.searches_limit - profile.searches_used) + (((profile as any).bonus_searches) || 0) : 0;  // opportunities remaining (plan + carried bonus)
  const isFreePlan = profile?.plan === 'free' || !profile?.plan;
  const showTrialIndicator = isFreePlan && trialDaysRemaining > 0 && !isTrialExpired;

  // Request notification permission on mount
  useEffect(() => {
    if (isSupported && permission === "default") {
      // Request permission after a short delay
      const timer = setTimeout(() => {
        requestPermission();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSupported, permission, requestPermission]);

  // Notify and show popup when credits are low or exhausted
  useEffect(() => {
    if (searchesRemaining === 3) {
      notifyLowCredits(3);
    } else if (searchesRemaining === 0 && profile?.searches_used && profile.searches_used > 0) {
      notifyCreditsExhausted();
      // Show upgrade modal automatically when credits reach zero
      setShowUpgradeModal(true);
    }
  }, [searchesRemaining, notifyLowCredits, notifyCreditsExhausted, profile?.searches_used]);

  // Calculate pagination for results
  const totalResultPages = Math.ceil(leads.length / RESULTS_PER_PAGE);
  const paginatedLeads = leads.slice(
    (currentResultPage - 1) * RESULTS_PER_PAGE,
    currentResultPage * RESULTS_PER_PAGE
  );

  // Calculate pagination for history
  const totalHistoryPages = Math.ceil(searchHistory.length / HISTORY_PER_PAGE);
  const paginatedHistory = searchHistory.slice(
    (currentHistoryPage - 1) * HISTORY_PER_PAGE,
    currentHistoryPage * HISTORY_PER_PAGE
  );

  // Check and reset monthly searches for free users
  useEffect(() => {
    const checkMonthlyReset = async () => {
      if (!user) return;
      
      try {
        const { data } = await supabase.rpc('check_and_reset_monthly_searches', {
          user_id: user.id
        });
        
        const result = data as { reset?: boolean; message?: string } | null;
        
        if (result?.reset) {
          toast({
            title: "Buscas renovadas!",
            description: result.message || "Suas 10 buscas gratuitas mensais foram renovadas.",
            duration: 6000,
          });
          await refreshProfile();
        }
      } catch (err) {
        console.error('Error checking monthly reset:', err);
      }
    };
    
    checkMonthlyReset();
  }, [user]);

  // Fetch search history and clean up old entries
  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;
      
      try {
        // Fetch history ordered by date, limit to MAX_HISTORY_ITEMS
        const { data, error } = await supabase
          .from('search_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(MAX_HISTORY_ITEMS);

        if (error) {
          console.error('Error fetching history:', error);
          return;
        }

        console.log('[Dashboard] Fetched search history:', data?.length, 'items for user:', user.id);

        setSearchHistory((data || []).map(item => ({
          ...item,
          leads: Array.isArray(item.leads) ? (item.leads as unknown as Lead[]) : []
        })));

        // Check if we need to delete old entries (more than MAX_HISTORY_ITEMS)
        const { count } = await supabase
          .from('search_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (count && count > MAX_HISTORY_ITEMS) {
          // Get IDs of entries to delete (oldest ones beyond limit)
          const { data: oldEntries } = await supabase
            .from('search_history')
            .select('id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })
            .limit(count - MAX_HISTORY_ITEMS);

          if (oldEntries && oldEntries.length > 0) {
            const idsToDelete = oldEntries.map(e => e.id);
            await supabase
              .from('search_history')
              .delete()
              .in('id', idsToDelete);
          }
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [user]);

  // Reset result page when leads change
  useEffect(() => {
    setCurrentResultPage(1);
  }, [leads]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!keyword.trim() || !location.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha a palavra-chave e a localização",
        variant: "destructive",
      });
      return;
    }

    if (searchesRemaining <= 0) {
      setShowUpgradeModal(true);
      return;
    }

    // Gate: exige Perfil da Empresa preenchido antes de qualquer busca/análise
    if (!companyProfile) {
      setPendingSearch(true);
      setShowCompanyOnboarding(true);
      toast({
        title: "Configure seu Perfil da Empresa",
        description: "Precisamos dessas informações para a IA analisar e personalizar suas oportunidades.",
      });
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Sessão expirada",
          description: "Por favor, faça login novamente",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      const response = await supabase.functions.invoke('search-leads', {
        body: { keyword, location },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao buscar leads');
      }

      const data = response.data;

      if (data.error) {
        if (data.limitReached) {
          toast({
            title: "Limite de oportunidades atingido",
            description: data.message,
            variant: "destructive",
          });
        } else if (data.allKeysExhausted || data.redirectToContact) {
          toast({
            title: "Serviço temporariamente indisponível",
            description: data.message,
            variant: "destructive",
            duration: 8000,
          });
          // Redirect to contact page after a short delay
          setTimeout(() => {
            navigate("/contact");
          }, 2000);
        } else {
          throw new Error(data.error);
        }
        setIsSearching(false);
        return;
      }

      setLeads(data.leads || []);
      await refreshProfile();

      // Track search for trial automation
      if (user && profile?.plan === 'free') {
        supabase.from('trial_product_events').insert({
          user_id: user.id,
          event_name: 'search_executed',
          event_source: 'frontend',
          metadata: { keyword, location, results: (data.leads || []).length },
        }).then(() => {});
      }
      
      // Track score event for search
      trackScoreEvent("leads_searched", { keyword, location, results: (data.leads || []).length });
      
      // Refresh history (limit to MAX_HISTORY_ITEMS)
      if (user) {
        const { data: historyData } = await supabase
          .from('search_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(MAX_HISTORY_ITEMS);
        
        if (historyData) {
          setSearchHistory(historyData.map(item => ({
            ...item,
            leads: Array.isArray(item.leads) ? (item.leads as unknown as Lead[]) : []
          })));
          setCurrentHistoryPage(1);
        }
      }
      
      // Show appropriate toast and redirect to opportunities management
      const resultsCount = data.leads?.length || 0;
      const baseDescription = data.foundLessThanExpected && data.message
        ? data.message
        : `${resultsCount} oportunidades encontradas para "${keyword}" em ${location}`;

      toast({
        title: resultsCount > 0 ? "Busca concluída!" : "Nenhuma oportunidade encontrada",
        description: resultsCount > 0 ? `${baseDescription} Abrindo a gestão de oportunidades...` : baseDescription,
        duration: data.foundLessThanExpected ? 8000 : 5000,
      });

      if (resultsCount > 0) {
        navigate("/oportunidades/gestao");
      }
      
    } catch (error: any) {
      console.error('Search error:', error);
      toast({
        title: "Erro na busca",
        description: error.message || "Erro ao buscar leads. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleExport = () => {
    if (leads.length === 0) return;

    // Create worksheet data with only essential columns (reduces file size)
    const worksheetData = leads.map(lead => ({
      'Nome': lead.name,
      'Telefone': lead.phone,
      'Categoria': lead.category,
      'Cidade': lead.city,
      'Site': lead.website || '',
      'Avaliação': lead.rating,
      'Link Maps': lead.mapsLink,
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);

    // Set optimized column widths
    worksheet['!cols'] = [
      { wch: 30 }, // Nome
      { wch: 15 }, // Telefone
      { wch: 20 }, // Categoria
      { wch: 15 }, // Cidade
      { wch: 25 }, // Site
      { wch: 8 },  // Avaliação
      { wch: 40 }, // Link Maps
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');

    // Generate and download file with compression
    XLSX.writeFile(workbook, `leads-${keyword}-${location}.xlsx`, { 
      compression: true,
      bookType: 'xlsx'
    });

    toast({
      title: "Download iniciado!",
      description: "Sua planilha Excel está sendo baixada",
    });
    trackScoreEvent("export_report", { type: "leads_excel" });
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
  };

  const getUserInitials = () => {
    if (profile?.name) {
      const names = profile.name.split(' ').filter(n => n.length > 0);
      if (names.length >= 2) {
        return (names[0][0] + names[1][0]).toUpperCase();
      }
      return names[0].slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getPlanName = (plan: string) => {
    switch (plan) {
      case 'start': return 'Start';
      case 'growth': return 'Growth';
      case 'scale': return 'Enterprise';
      default: return 'Gratuito';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleHistoryClick = (item: SearchHistoryItem) => {
    setKeyword(item.keyword);
    setLocation(item.location);
    setHasSearched(true);
    
    // Use saved leads from history instead of making a new search
    if (item.leads && item.leads.length > 0) {
      setLeads(item.leads);
      toast({
        title: "Resultados carregados",
        description: `${item.leads.length} leads da busca anterior`,
      });
    } else {
      // Fallback for old history items without saved leads
      setLeads([]);
      toast({
        title: "Busca antiga",
        description: "Esta busca não possui resultados salvos. Faça uma nova busca.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteHistoryItem = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation(); // Prevent triggering the card click
    
    try {
      const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('id', itemId);

      if (error) {
        throw error;
      }

      // Remove from local state
      setSearchHistory(prev => prev.filter(item => item.id !== itemId));
      
      toast({
        title: "Removido",
        description: "Item do histórico excluído",
      });
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o item",
        variant: "destructive",
      });
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background relative overflow-hidden">
        <BackgroundGlow />
        <AppSidebar 
          profile={profile} 
          onWhatsAppClick={() => setShowWhatsAppUpgradeModal(true)} 
        />

        <div className="flex-1 flex flex-col min-w-0 lg:pl-[72px]">
          <AppHeader 
            profile={profile} 
            onWhatsAppClick={() => setShowWhatsAppUpgradeModal(true)} 
          />

          <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-auto">
            <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Brain size={18} className="text-primary" />
              <span className="text-sm font-medium text-primary">Oportunidades Inteligentes com IA</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Encontre suas próximas oportunidades
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              Nossa IA analisa e entrega até <span className="text-primary font-semibold">50 oportunidades estratégicas</span> por busca
            </p>
          </div>

          {/* Search Card */}
          <div className="relative mb-10">
            {/* Glow effect behind card */}
            <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full scale-150 -z-10" />
            
            <form onSubmit={handleSearch} className="bg-card border border-border rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl" data-tour="search-card">
              {/* Feature badges */}
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mb-6 pb-6 border-b border-border/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Target size={16} className="text-primary" />
                  </div>
                  <span>Leads qualificados</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Sparkles size={16} className="text-primary" />
                  </div>
                  <span>Contatos verificados</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Globe size={16} className="text-primary" />
                  </div>
                  <span>Busca global</span>
                </div>
              </div>

              {/* Global search info */}
              <div className="flex items-center gap-3 p-3 mb-6 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Prospecção global no Google Maps</p>
                  <p className="text-xs text-muted-foreground">
                    Busque em qualquer lugar: <span className="text-primary/80">São Paulo, SP</span> • <span className="text-primary/80">Miami, FL, USA</span> • <span className="text-primary/80">Lisboa, Portugal</span> • <span className="text-primary/80">Tokyo, Japan</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6" data-tour="search-fields">
                <div className="space-y-2" data-tour="search-keyword">
                  <Label htmlFor="keyword" className="flex items-center gap-2 text-sm font-medium">
                    <Search size={14} className="text-primary" />
                    Palavra-chave
                  </Label>
                  <Input
                    id="keyword"
                    placeholder="Ex: restaurantes, dentistas, advogados..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="h-12 sm:h-14 bg-secondary/50 border-border/50 text-base placeholder:text-muted-foreground/60 focus:border-primary/50 transition-colors"
                  />
                </div>

                <div className="space-y-2" data-tour="search-location">
                  <Label htmlFor="location" className="flex items-center gap-2 text-sm font-medium">
                    <MapPin size={14} className="text-primary" />
                    Localização
                    <span className="ml-auto flex items-center gap-1 text-xs font-normal text-primary/70 bg-primary/10 px-2 py-0.5 rounded-full">
                      <Globe size={10} />
                      Global
                    </span>
                  </Label>
                  <Input
                    id="location"
                    placeholder="Ex: São Paulo, SP ou Miami, FL, USA"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="h-12 sm:h-14 bg-secondary/50 border-border/50 text-base placeholder:text-muted-foreground/60 focus:border-primary/50 transition-colors"
                  />
                  <p className="text-xs text-muted-foreground/70">
                    Cidade, Estado • Cidade, País • ou qualquer região do mundo
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full h-14 text-base font-semibold"
                disabled={isSearching || searchesRemaining <= 0}
                data-tour="search-button"
              >
                {isSearching ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Analisando e filtrando leads...
                  </>
                ) : (
                  <>
                    <Search size={20} />
                    Prospectar Leads Estratégicos
                  </>
                )}
              </Button>

              {searchesRemaining <= 0 && (
                <div className="flex items-center justify-center gap-2 mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
                  <AlertCircle size={16} className="text-destructive" />
                  <p className="text-destructive text-sm font-medium">
                    Limite de oportunidades atingido. Faça upgrade para continuar.
                  </p>
                </div>
              )}
            </form>
          </div>

          {/* Results Section */}
          {hasSearched && (
            <div className="animate-fade-in mb-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Target size={20} className="text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl sm:text-2xl font-bold">
                      {leads.length > 0 
                        ? `${leads.length} leads encontrados`
                        : "Nenhum lead encontrado"
                      }
                    </h2>
                    {leads.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Busca por "{keyword}" em {location}
                      </p>
                    )}
                  </div>
                </div>
                {leads.length > 0 && (
                  <Button variant="outline" onClick={handleExport} className="gap-2 h-11">
                    <Download size={18} />
                    Exportar Excel
                  </Button>
                )}
              </div>

              {leads.length > 0 && (
                <>
                  <div className="space-y-3">
                    {paginatedLeads.map((lead, index) => (
                      <div
                        key={index}
                        className="bg-card border border-border/50 rounded-xl p-4 sm:p-5 hover:border-primary/30 hover:bg-card/90 transition-all duration-300"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-3">
                              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 border border-primary/10">
                                <Building2 size={20} className="text-primary" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-base sm:text-lg truncate">{lead.name}</h3>
                                <p className="text-sm text-primary/80 font-medium">{lead.category}</p>
                                <p className="text-sm text-muted-foreground mt-1 truncate">
                                  {lead.address} • {lead.city}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm pl-14 lg:pl-0">
                            {lead.phone !== '-' && (
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-lg">
                                <Phone size={14} className="text-primary" />
                                <span className="font-medium">{lead.phone}</span>
                              </div>
                            )}
                            {lead.website !== "-" && lead.website !== '-' && (
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-lg max-w-[180px]">
                                <Globe size={14} className="text-primary flex-shrink-0" />
                                <span className="truncate">{lead.website}</span>
                              </div>
                            )}
                            {lead.rating > 0 && (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-warning/10 rounded-lg">
                                <Star size={14} className="text-warning" fill="currentColor" />
                                <span className="font-semibold text-warning">{lead.rating}</span>
                                <span className="text-muted-foreground text-xs">({lead.reviewCount})</span>
                              </div>
                            )}
                            {lead.mapsLink !== '-' && (
                              <a
                                href={lead.mapsLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-medium"
                              >
                                <ExternalLink size={14} />
                                Maps
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Results Pagination */}
                  {totalResultPages > 1 && (
                    <div className="flex items-center justify-center gap-2 sm:gap-4 mt-8 p-4 bg-card/50 rounded-xl border border-border/50">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentResultPage(prev => Math.max(1, prev - 1))}
                        disabled={currentResultPage === 1}
                        className="gap-1 sm:gap-2 h-10"
                      >
                        <ChevronLeft size={16} />
                        <span className="hidden sm:inline">Anterior</span>
                      </Button>
                      <div className="flex items-center gap-2 px-4">
                        <span className="text-sm font-medium">
                          Página {currentResultPage}
                        </span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-sm text-muted-foreground">{totalResultPages}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentResultPage(prev => Math.min(totalResultPages, prev + 1))}
                        disabled={currentResultPage === totalResultPages}
                        className="gap-1 sm:gap-2 h-10"
                      >
                        <span className="hidden sm:inline">Próxima</span>
                        <ChevronRight size={16} />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Empty state - when no search has been done yet */}
          {!hasSearched && (
            <div className="text-center py-12 sm:py-20">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6 border border-primary/10">
                <Search size={40} className="text-primary" />
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold mb-3">
                {searchHistory.length > 0 ? 'Pronto para prospectar?' : 'Faça sua primeira busca'}
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto text-base">
                {searchHistory.length > 0 
                  ? 'Insira uma palavra-chave e localização acima para descobrir novos leads qualificados'
                  : 'Digite uma palavra-chave e localização para encontrar empresas e profissionais no Google Maps'
                }
              </p>
            </div>
          )}

          {/* Search History Section - Below Results */}
          {searchHistory.length > 0 && (
            <div className="mt-8 sm:mt-12 pt-8 sm:pt-12 border-t border-border/50">
              <div className="flex items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <History size={20} className="text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg sm:text-xl font-bold">Prospecção</h3>
                    <p className="text-sm text-muted-foreground">{searchHistory.length} buscas realizadas</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedHistoryIds.size > 0 && (
                    <Button
                      variant="default"
                      size="sm"
                      disabled={bulkExporting}
                      onClick={() => {
                        setBulkExporting(true);
                        try {
                          const selectedItems = searchHistory.filter(h => selectedHistoryIds.has(h.id));
                          const allLeads = selectedItems.flatMap(item => 
                            (item.leads || []).map(lead => ({
                              'Busca': item.keyword,
                              'Localização': item.location,
                              'Nome': lead.name,
                              'Telefone': lead.phone,
                              'Categoria': lead.category,
                              'Cidade': lead.city,
                              'Site': lead.website || '',
                              'Avaliação': lead.rating,
                              'Link Maps': lead.mapsLink,
                            }))
                          );
                          if (allLeads.length === 0) {
                            toast({ title: "Sem leads", description: "As buscas selecionadas não possuem leads salvos", variant: "destructive" });
                            return;
                          }
                          const wb = XLSX.utils.book_new();
                          const ws = XLSX.utils.json_to_sheet(allLeads);
                          ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 8 }, { wch: 40 }];
                          XLSX.utils.book_append_sheet(wb, ws, 'Leads');
                          XLSX.writeFile(wb, `prospecção-${new Date().toISOString().split('T')[0]}.xlsx`, { compression: true });
                          toast({ title: "Exportado!", description: `${allLeads.length} leads de ${selectedItems.length} buscas exportados` });
                          setSelectedHistoryIds(new Set());
                        } catch (err) {
                          toast({ title: "Erro", description: "Não foi possível exportar", variant: "destructive" });
                        } finally {
                          setBulkExporting(false);
                        }
                      }}
                      className="gap-2"
                    >
                      <Download size={14} />
                      Exportar {selectedHistoryIds.size} {selectedHistoryIds.size === 1 ? 'busca' : 'buscas'}
                    </Button>
                  )}
                  {searchHistory.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (selectedHistoryIds.size === searchHistory.length) {
                          setSelectedHistoryIds(new Set());
                        } else {
                          setSelectedHistoryIds(new Set(searchHistory.map(h => h.id)));
                        }
                      }}
                      className="gap-1.5 text-xs"
                    >
                      <CheckSquare size={14} />
                      {selectedHistoryIds.size === searchHistory.length ? 'Desmarcar' : 'Selecionar tudo'}
                    </Button>
                  )}
                </div>
              </div>

              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={28} className="animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {selectedHistoryIds.size > 0 && (
                    <div className="flex items-center gap-3 p-3 mb-4 rounded-lg bg-primary/10 border border-primary/20 animate-fade-in">
                      <CheckSquare size={16} className="text-primary flex-shrink-0" />
                      <p className="text-sm text-foreground">
                        <strong>{selectedHistoryIds.size}</strong> {selectedHistoryIds.size === 1 ? 'busca selecionada' : 'buscas selecionadas'}. 
                        Navegue entre as páginas normalmente — as seleções serão mantidas.
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {paginatedHistory.map((item, index) => (
                      <div
                        key={item.id}
                        onClick={() => handleHistoryClick(item)}
                        className={`relative group bg-card border rounded-xl p-4 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer animate-fade-in ${selectedHistoryIds.has(item.id) ? 'border-primary/50 bg-primary/5' : 'border-border/50'}`}
                        style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                      >
                        {/* Checkbox */}
                        <div 
                          className="absolute top-3 left-3 z-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={selectedHistoryIds.has(item.id)}
                            onCheckedChange={(checked) => {
                              setSelectedHistoryIds(prev => {
                                const next = new Set(prev);
                                if (checked) next.add(item.id);
                                else next.delete(item.id);
                                return next;
                              });
                            }}
                          />
                        </div>
                        
                        {/* Delete button */}
                        <button
                          onClick={(e) => handleDeleteHistoryItem(e, item.id)}
                          className="absolute top-3 right-3 p-2 rounded-lg bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/20"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                        
                        <div className="pl-7 pr-10">
                          <p className="font-semibold text-foreground truncate text-base">{item.keyword}</p>
                          <p className="text-sm text-muted-foreground truncate mt-1 flex items-center gap-1.5">
                            <MapPin size={12} className="flex-shrink-0 text-primary/60" />
                            {item.location}
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock size={12} />
                            {formatDate(item.created_at)}
                          </div>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                            <Search size={10} />
                            {item.leads?.length || item.results_count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* History Pagination */}
                  {totalHistoryPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentHistoryPage(prev => Math.max(1, prev - 1))}
                        disabled={currentHistoryPage === 1}
                        className="h-9 px-3"
                      >
                        <ChevronLeft size={16} />
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Página {currentHistoryPage} de {totalHistoryPages}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentHistoryPage(prev => Math.min(totalHistoryPages, prev + 1))}
                        disabled={currentHistoryPage === totalHistoryPages}
                        className="h-9 px-3"
                      >
                        <ChevronRight size={16} />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Empty history state */}
          {!loadingHistory && searchHistory.length === 0 && hasSearched && (
            <div className="mt-8 pt-8 border-t border-border/50 text-center py-8">
              <History size={32} className="text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Seu histórico de buscas aparecerá aqui
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Upgrade Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Zap size={32} className="text-primary" />
            </div>
            <DialogTitle className="text-center text-2xl">Suas buscas acabaram!</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              Você utilizou todas as suas buscas disponíveis. Faça upgrade para continuar prospectando novos clientes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-primary/10 rounded-xl p-4 my-4 text-center">
            <div className="flex items-center justify-center gap-2 text-primary font-semibold">
              <Sparkles size={18} />
              Promoção de Lançamento
            </div>
            <p className="text-2xl font-bold mt-2">Até 50% OFF</p>
            <p className="text-sm text-muted-foreground mt-1">Em todos os planos por tempo limitado</p>
          </div>

          <div className="flex flex-col gap-3">
            <Button 
              variant="hero" 
              size="lg" 
              className="w-full"
              onClick={() => {
                setShowUpgradeModal(false);
                navigate("/upgrade");
              }}
            >
              <Crown size={18} />
              Ver Planos e Fazer Upgrade
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setShowUpgradeModal(false)}
            >
              Agora não
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Upgrade Modal for free users */}
      <UpgradeModal 
        isOpen={showWhatsAppUpgradeModal} 
        onClose={() => setShowWhatsAppUpgradeModal(false)} 
      />

      {user && (
        <CompanyProfileOnboarding
          open={showCompanyOnboarding}
          userId={user.id}
          initialData={companyProfile}
          onClose={() => { setShowCompanyOnboarding(false); setPendingSearch(false); }}
          onComplete={(profile) => {
            setCompanyProfile(profile);
            setShowCompanyOnboarding(false);
            if (pendingSearch) {
              setPendingSearch(false);
              // Reexecuta a busca automaticamente após salvar o perfil
              handleSearch({ preventDefault: () => {} } as any);
            }
          }}
        />
      )}
      {/* Onboarding/Trial-feedback modais removidos — orientação fica a cargo do tour guiado. */}

        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;