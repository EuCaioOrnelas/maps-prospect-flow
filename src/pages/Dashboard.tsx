import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
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
  LogOut, 
  Loader2,
  Building2,
  Phone,
  Globe,
  Star,
  ExternalLink,
  Crown,
  History,
  Clock,
  Brain,
  Target,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Zap,
  BarChart3,
  MessageSquare,
  User,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { useNotifications } from "@/hooks/useNotifications";
import { UpgradeModal } from "@/components/whatsapp/UpgradeModal";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { TrialFeedbackModal } from "@/components/onboarding/TrialFeedbackModal";
import { useOnboardingModals } from "@/hooks/useOnboardingModals";
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
const HISTORY_PER_PAGE = 5;

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
  
  // Pagination states
  const [currentResultPage, setCurrentResultPage] = useState(1);
  const [currentHistoryPage, setCurrentHistoryPage] = useState(1);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile, signOut, refreshProfile, user, isTrialExpired, trialDaysRemaining } = useAuth();
  const { requestPermission, notifyCreditsExhausted, notifyLowCredits, isSupported, permission } = useNotifications();
  const { showOnboarding, showTrialFeedback, closeOnboarding, closeTrialFeedback } = useOnboardingModals();

  const searchesRemaining = profile ? profile.searches_limit - profile.searches_used : 0;
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

  // Fetch search history
  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('search_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Error fetching history:', error);
          return;
        }

        setSearchHistory((data || []).map(item => ({
          ...item,
          leads: Array.isArray(item.leads) ? (item.leads as unknown as Lead[]) : []
        })));
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
            title: "Limite de buscas atingido",
            description: data.message,
            variant: "destructive",
          });
        } else {
          throw new Error(data.error);
        }
        setIsSearching(false);
        return;
      }

      setLeads(data.leads || []);
      await refreshProfile();
      
      // Refresh history
      if (user) {
        const { data: historyData } = await supabase
          .from('search_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (historyData) {
          setSearchHistory(historyData.map(item => ({
            ...item,
            leads: Array.isArray(item.leads) ? (item.leads as unknown as Lead[]) : []
          })));
          setCurrentHistoryPage(1);
        }
      }
      
      // Show appropriate toast based on results count
      const resultsCount = data.leads?.length || 0;
      if (data.foundLessThanExpected && data.message) {
        toast({
          title: `${resultsCount} leads encontrados`,
          description: data.message,
          duration: 8000,
        });
      } else {
        toast({
          title: "Busca concluída!",
          description: `${resultsCount} leads encontrados para "${keyword}" em ${location}`,
        });
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

    // Create worksheet data
    const worksheetData = leads.map(lead => ({
      'Nome': lead.name,
      'Categoria': lead.category,
      'Endereço': lead.address,
      'Cidade': lead.city,
      'Telefone': lead.phone,
      'Site': lead.website,
      'Avaliação': lead.rating,
      'Nº Avaliações': lead.reviewCount,
      'Link Maps': lead.mapsLink,
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 30 }, // Nome
      { wch: 20 }, // Categoria
      { wch: 40 }, // Endereço
      { wch: 20 }, // Cidade
      { wch: 15 }, // Telefone
      { wch: 30 }, // Site
      { wch: 10 }, // Avaliação
      { wch: 12 }, // Nº Avaliações
      { wch: 50 }, // Link Maps
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');

    // Generate and download file
    XLSX.writeFile(workbook, `leads-${keyword}-${location}.xlsx`);

    toast({
      title: "Download iniciado!",
      description: "Sua planilha Excel está sendo baixada",
    });
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
  };

  const getPlanName = (plan: string) => {
    switch (plan) {
      case 'start': return 'Start';
      case 'growth': return 'Growth';
      case 'scale': return 'Scale';
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Logo size="md" />
            
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Trial indicator */}
              {showTrialIndicator && (
                <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                  trialDaysRemaining <= 3 
                    ? 'bg-destructive/10 text-destructive border border-destructive/20' 
                    : trialDaysRemaining <= 7 
                      ? 'bg-warning/10 text-warning border border-warning/20'
                      : 'bg-primary/10 text-primary border border-primary/20'
                }`}>
                  <Clock size={14} />
                  <span>
                    {trialDaysRemaining === 1 
                      ? 'Último dia de trial' 
                      : `${trialDaysRemaining} dias restantes`}
                  </span>
                </div>
              )}
              
              {/* Trial expired indicator */}
              {isTrialExpired && isFreePlan && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-destructive/10 text-destructive border border-destructive/20">
                  <AlertCircle size={14} />
                  <span>Trial expirado</span>
                </div>
              )}

              {/* Credits indicator - shows searches used */}
              <div className="flex items-center gap-2 text-sm">
                <Search size={14} className="text-muted-foreground" />
                <span className="text-muted-foreground">Buscas:</span>
                <span className="font-semibold text-primary">{profile?.searches_used || 0}</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">{profile?.searches_limit || 10}</span>
                <div className="hidden sm:block w-16 h-1.5 bg-muted rounded-full overflow-hidden ml-1">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${((profile?.searches_used || 0) / (profile?.searches_limit || 10)) * 100}%` }}
                  />
                </div>
                <span className="hidden md:inline text-xs text-muted-foreground ml-1 px-2 py-0.5 bg-secondary rounded">
                  {getPlanName(profile?.plan || 'free')}
                </span>
              </div>

              {/* Action buttons with proper spacing */}
              <div className="flex items-center gap-2 sm:gap-3">
                <Link to="/reports">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 sm:h-10 px-3 sm:px-4 gap-2 text-sm font-medium"
                  >
                    <BarChart3 size={16} />
                    <span className="hidden sm:inline">Relatórios</span>
                  </Button>
                </Link>

                {isFreePlan ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 sm:h-10 px-3 sm:px-4 gap-2 text-sm font-medium"
                    onClick={() => setShowWhatsAppUpgradeModal(true)}
                  >
                    <MessageSquare size={16} />
                    <span className="hidden sm:inline">Disparos</span>
                  </Button>
                ) : (
                  <Link to="/whatsapp">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-9 sm:h-10 px-3 sm:px-4 gap-2 text-sm font-medium"
                    >
                      <MessageSquare size={16} />
                      <span className="hidden sm:inline">Disparos</span>
                    </Button>
                  </Link>
                )}

                {profile?.plan !== 'scale' && (
                  <Link to="/upgrade">
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="h-9 sm:h-10 px-3 sm:px-4 gap-2 text-sm font-medium"
                    >
                      <Crown size={16} />
                      <span className="hidden sm:inline">Upgrade</span>
                    </Button>
                  </Link>
                )}

                <div className="w-px h-6 bg-border mx-1 hidden sm:block" />

                <Link to="/profile">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 sm:h-10 sm:w-10"
                    title="Meu perfil"
                  >
                    <User size={18} />
                  </Button>
                </Link>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleLogout} 
                  className="h-9 w-9 sm:h-10 sm:w-10"
                  title="Sair da conta"
                >
                  <LogOut size={18} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-4">
                  <Brain size={16} className="text-primary" />
                  <span className="text-sm text-muted-foreground">Prospecção Inteligente com IA</span>
                </div>
                <h1 className="font-display text-3xl font-bold mb-2">
                  Encontre seus próximos clientes
                </h1>
                <p className="text-muted-foreground">
                  Nossa IA analisa e entrega até 50 leads estratégicos por busca
                </p>
              </div>

              <form onSubmit={handleSearch} className="glass rounded-2xl p-6 mb-8">
                {/* AI Badge */}
                <div className="flex flex-wrap items-center justify-center gap-4 mb-6 pb-6 border-b border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Target size={16} className="text-primary" />
                    <span>Leads pré-qualificados</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles size={16} className="text-primary" />
                    <span>Contatos verificados</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Brain size={16} className="text-primary" />
                    <span>Alto potencial de conversão</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <Label htmlFor="keyword" className="flex items-center gap-2">
                      <Search size={16} className="text-primary" />
                      Palavra-chave
                    </Label>
                    <Input
                      id="keyword"
                      placeholder="Ex: restaurantes italianos, dentistas, advogados..."
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      className="h-12 bg-secondary border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location" className="flex items-center gap-2">
                      <MapPin size={16} className="text-primary" />
                      Cidade ou Região
                    </Label>
                    <Input
                      id="location"
                      placeholder="Ex: São Paulo, SP"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="h-12 bg-secondary border-border"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  className="w-full"
                  disabled={isSearching || searchesRemaining <= 0}
                >
                  {isSearching ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Analisando e filtrando leads...
                    </>
                  ) : (
                    <>
                      <Search size={20} />
                      Buscar Leads Estratégicos
                    </>
                  )}
                </Button>

                {searchesRemaining <= 0 && (
                  <p className="text-center text-destructive mt-4 text-sm">
                    Você atingiu seu limite de buscas. Faça upgrade para continuar.
                  </p>
                )}
              </form>

              {/* Results */}
              {hasSearched && (
                <div className="animate-fade-in">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-display text-xl font-semibold">
                      {leads.length > 0 
                        ? `${leads.length} leads encontrados`
                        : "Nenhum lead encontrado"
                      }
                    </h2>
                    {leads.length > 0 && (
                      <Button variant="outline" onClick={handleExport} className="gap-2">
                        <Download size={18} />
                        Exportar Excel
                      </Button>
                    )}
                  </div>

                  {leads.length > 0 && (
                    <>
                      <div className="space-y-4">
                        {paginatedLeads.map((lead, index) => (
                          <div
                            key={index}
                            className="glass rounded-xl p-5 hover:bg-card/90 transition-colors"
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <Building2 size={20} className="text-primary" />
                                  </div>
                                  <div>
                                    <h3 className="font-semibold text-lg">{lead.name}</h3>
                                    <p className="text-sm text-muted-foreground">{lead.category}</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {lead.address} • {lead.city}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-4 text-sm">
                                {lead.phone !== '-' && (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Phone size={16} />
                                    <span>{lead.phone}</span>
                                  </div>
                                )}
                                {lead.website !== "-" && lead.website !== '-' && (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Globe size={16} />
                                    <span className="truncate max-w-[150px]">{lead.website}</span>
                                  </div>
                                )}
                                {lead.rating > 0 && (
                                  <div className="flex items-center gap-1 text-warning">
                                    <Star size={16} fill="currentColor" />
                                    <span className="font-medium">{lead.rating}</span>
                                    <span className="text-muted-foreground">({lead.reviewCount})</span>
                                  </div>
                                )}
                                {lead.mapsLink !== '-' && (
                                  <a
                                    href={lead.mapsLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-primary hover:underline"
                                  >
                                    <ExternalLink size={16} />
                                    Ver no Maps
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Results Pagination */}
                      {totalResultPages > 1 && (
                        <div className="flex items-center justify-center gap-4 mt-6">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentResultPage(prev => Math.max(1, prev - 1))}
                            disabled={currentResultPage === 1}
                            className="gap-2"
                          >
                            <ChevronLeft size={16} />
                            Anterior
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Página {currentResultPage} de {totalResultPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentResultPage(prev => Math.min(totalResultPages, prev + 1))}
                            disabled={currentResultPage === totalResultPages}
                            className="gap-2"
                          >
                            Próxima
                            <ChevronRight size={16} />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Empty state */}
              {!hasSearched && (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Search size={40} className="text-primary" />
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-2">
                    Faça sua primeira busca
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Digite uma palavra-chave e localização para encontrar empresas e profissionais no Google Maps
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar - Search History */}
            <div className="lg:col-span-1">
              <div className="glass rounded-2xl p-5 sticky top-8">
                <div className="flex items-center gap-2 mb-4">
                  <History size={18} className="text-primary" />
                  <h3 className="font-semibold">Histórico de Buscas</h3>
                </div>

                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-primary" />
                  </div>
                ) : searchHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma busca realizada ainda
                  </p>
                ) : (
                  <>
                    <div className="space-y-3">
                      {paginatedHistory.map((item, index) => (
                        <div
                          key={item.id}
                          onClick={() => handleHistoryClick(item)}
                          className="relative group w-full text-left p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-all duration-300 border border-transparent hover:border-border cursor-pointer animate-fade-in"
                          style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
                        >
                          {/* Delete button */}
                          <button
                            onClick={(e) => handleDeleteHistoryItem(e, item.id)}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                          
                          <p className="font-semibold text-foreground truncate pr-8">{item.keyword}</p>
                          <p className="text-sm text-muted-foreground truncate mt-1 flex items-center gap-1">
                            <MapPin size={12} className="flex-shrink-0" />
                            {item.location}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <Clock size={12} className="flex-shrink-0" />
                            {formatDate(item.created_at)}
                          </p>
                          <div className="mt-2">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                              <Search size={10} />
                              {item.leads?.length || item.results_count} leads
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* History Pagination */}
                    {totalHistoryPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentHistoryPage(prev => Math.max(1, prev - 1))}
                          disabled={currentHistoryPage === 1}
                          className="h-8 px-2"
                        >
                          <ChevronLeft size={14} />
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {currentHistoryPage}/{totalHistoryPages}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentHistoryPage(prev => Math.min(totalHistoryPages, prev + 1))}
                          disabled={currentHistoryPage === totalHistoryPages}
                          className="h-8 px-2"
                        >
                          <ChevronRight size={14} />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
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

      {/* Onboarding Modal */}
      <OnboardingModal isOpen={showOnboarding} onClose={closeOnboarding} />

      {/* Trial Feedback Modal */}
      <TrialFeedbackModal isOpen={showTrialFeedback} onClose={closeTrialFeedback} />
    </div>
  );
};

export default Dashboard;