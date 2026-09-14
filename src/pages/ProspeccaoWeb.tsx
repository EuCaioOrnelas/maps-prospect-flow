import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Globe,
  MapPin,
  Search,
  Loader2,
  Sparkles,
  Building2,
  Phone,
  Mail,
  Share2,
  CheckCircle2,
  AlertCircle,
  Lock,
  Settings,
  Target,
  History,
  Download,
  Trash2,
  CheckSquare,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SidebarProvider } from "@/components/ui/sidebar";
import { CompanyProfileOnboarding } from "@/components/opportunities/CompanyProfileOnboarding";
import { IdealAudienceMismatchBanner } from "@/components/opportunities/IdealAudienceMismatchBanner";
import { hasSDRAccess } from "@/lib/planAccess";
import { clearAutoApproachPrefs } from "@/lib/autoApproachPrefs";

type Phase = "idle" | "searching" | "diagnosing" | "done";

interface SearchSummary {
  found: number;
  saved: number;
  withPhone: number;
  withWhatsApp: number;
  withEmail: number;
  withSocial: number;
}

interface WebHistoryLeadRef {
  id: string;
  name: string;
  domain: string;
}

interface WebHistoryItem {
  id: string;
  keyword: string;
  location: string | null;
  results_count: number;
  created_at: string;
  status: string | null;
  leads: WebHistoryLeadRef[];
}

const HISTORY_PER_PAGE = 20;
const MAX_HISTORY_ITEMS = 200;

const formatHistoryDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const ProspeccaoWeb = () => {
  const { user, profile, refreshProfile, accountOwnerId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");

  const [phase, setPhase] = useState<Phase>("idle");
  const [summary, setSummary] = useState<SearchSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);

  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [showCompanyOnboarding, setShowCompanyOnboarding] = useState(false);
  const inFlight = useRef(false);

  const [webHistory, setWebHistory] = useState<WebHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set());
  const [bulkExporting, setBulkExporting] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);

  const isBusy = phase === "searching" || phase === "diagnosing";
  const hasAccess = hasSDRAccess(profile);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("company_profiles")
      .select("*")
      .or(`owner_user_id.eq.${accountOwnerId || user.id},user_id.eq.${user.id}`)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setCompanyProfile(data));
  }, [user, accountOwnerId]);

  const canSubmit = useMemo(
    () => query.trim().length >= 2 && !isBusy,
    [query, isBusy],
  );

  const handleSearch = async () => {
    if (!canSubmit || inFlight.current) return;

    if (!companyProfile) {
      setShowCompanyOnboarding(true);
      toast({
        title: "Configure seu Perfil da Empresa",
        description: "Precisamos dessas informações para a IA analisar suas oportunidades.",
      });
      return;
    }

    inFlight.current = true;
    setErrorText(null);
    setSummary(null);
    setPhase("searching");
    clearAutoApproachPrefs();

    try {
      const { data, error } = await supabase.functions.invoke("search-leads-web", {
        body: {
          query: query.trim(),
          location: location.trim() || undefined,
        },
      });

      let payload: any = data;
      if (error) {
        const ctx = (error as { context?: Response }).context;
        payload = ctx ? await ctx.clone().json().catch(() => null) : null;
        if (!payload) throw new Error(error.message || "Erro ao buscar empresas");
      }

      if (payload?.error) {
        setPhase("idle");
        setErrorText(payload.message || payload.error);
        toast({
          title: "Não foi possível concluir a busca",
          description: payload.message || payload.error,
          variant: "destructive",
        });
        return;
      }

      setSearchQuery(payload.searchQuery || "");
      await refreshProfile();

      const saved = payload?.summary?.saved || 0;
      setSummary(payload.summary);
      setPhase("done");
      void fetchWebHistory();

      toast({
        title: "Busca concluída!",
        description: `${saved} empresas encontradas. Abrindo a Gestão de Oportunidades...`,
      });

      if (saved > 0) {
        const params = new URLSearchParams({ source: "web" });
        if (payload.searchQuery) params.set("q", payload.searchQuery);
        navigate(`/oportunidades/gestao?${params.toString()}`, { state: { justSearched: true } });
      }
    } catch (e: any) {
      console.error("[prospeccao-web]", e);
      setPhase("idle");
      setErrorText(e?.message || "Erro inesperado ao buscar empresas.");
      toast({
        title: "Erro na busca",
        description: e?.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      inFlight.current = false;
    }
  };

  const goToManagement = () => {
    const params = new URLSearchParams({ source: "web" });
    if (searchQuery) params.set("q", searchQuery);
    navigate(`/oportunidades/gestao?${params.toString()}`);
  };

  const fetchWebHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from("search_history")
      .select("id, keyword, location, results_count, created_at, status, leads")
      .eq("user_id", user.id)
      .eq("source", "web")
      .order("created_at", { ascending: false })
      .limit(MAX_HISTORY_ITEMS);
    if (!error && data) {
      setWebHistory(
        data.map((item: any) => ({
          ...item,
          leads: Array.isArray(item.leads) ? (item.leads as WebHistoryLeadRef[]) : [],
        })),
      );
    }
    setLoadingHistory(false);
  };

  useEffect(() => {
    void fetchWebHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const totalHistoryPages = Math.ceil(webHistory.length / HISTORY_PER_PAGE);
  const paginatedHistory = webHistory.slice(
    (historyPage - 1) * HISTORY_PER_PAGE,
    historyPage * HISTORY_PER_PAGE,
  );

  const handleHistoryClick = (item: WebHistoryItem) => {
    const params = new URLSearchParams({ source: "web" });
    if (item.keyword) params.set("q", item.keyword);
    navigate(`/oportunidades/gestao?${params.toString()}`);
  };

  const handleDeleteHistoryItem = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    const { error } = await supabase.from("search_history").delete().eq("id", itemId);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível excluir o item", variant: "destructive" });
      return;
    }
    setWebHistory((prev) => prev.filter((item) => item.id !== itemId));
    setSelectedHistoryIds((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
    toast({ title: "Removido", description: "Item do histórico excluído" });
  };

  const handleExportSelected = async () => {
    const selectedItems = webHistory.filter((h) => selectedHistoryIds.has(h.id));
    const leadIds = selectedItems.flatMap((item) => item.leads.map((l) => l.id));
    if (leadIds.length === 0) {
      toast({ title: "Sem leads", description: "As buscas selecionadas não possuem leads salvos", variant: "destructive" });
      return;
    }

    setBulkExporting(true);
    try {
      const searchByLeadId = new Map<string, WebHistoryItem>();
      selectedItems.forEach((item) => item.leads.forEach((l) => searchByLeadId.set(l.id, item)));

      const rows: Record<string, unknown>[] = [];
      const CHUNK = 100;
      for (let i = 0; i < leadIds.length; i += CHUNK) {
        const { data, error } = await supabase
          .from("leads")
          .select("id, company_name, phone, email, website, domain, city, address, category")
          .in("id", leadIds.slice(i, i + CHUNK));
        if (error) throw error;
        (data || []).forEach((lead: any) => {
          const search = searchByLeadId.get(lead.id);
          rows.push({
            Busca: search?.keyword || "",
            "Localização": search?.location || "",
            Nome: lead.company_name || "",
            Telefone: lead.phone || "",
            "E-mail": lead.email || "",
            Site: lead.website || lead.domain || "",
            Cidade: lead.city || "",
            "Endereço": lead.address || "",
            Categoria: lead.category || "",
          });
        });
      }

      if (rows.length === 0) {
        toast({ title: "Sem leads", description: "Os leads dessas buscas não foram encontrados", variant: "destructive" });
        return;
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 18 }, { wch: 28 }, { wch: 28 }, { wch: 18 }, { wch: 30 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(wb, ws, "Leads Web");
      XLSX.writeFile(wb, `prospeccao-web-${new Date().toISOString().split("T")[0]}.xlsx`, { compression: true });
      toast({ title: "Exportado!", description: `${rows.length} leads de ${selectedItems.length} buscas exportados` });
      setSelectedHistoryIds(new Set());
    } catch (err) {
      console.error("[prospeccao-web] export error", err);
      toast({ title: "Erro", description: "Não foi possível exportar", variant: "destructive" });
    } finally {
      setBulkExporting(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full max-w-full bg-background relative overflow-x-hidden">
        <BackgroundGlow />
        <AppSidebar profile={profile} />

        <div className="flex-1 flex flex-col min-w-0 lg:pl-[72px]">
          <AppHeader profile={profile} />

          <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8">
            {!hasAccess ? (
              <div className="max-w-2xl mx-auto mt-12">
                <div className="rounded-2xl border border-primary/30 bg-card/60 backdrop-blur p-8 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-[16px] bg-primary/10 border border-primary/20 mb-5">
                    <Lock size={24} className="text-primary" />
                  </div>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold mb-3">
                    Prospecção Web não está inclusa no seu plano
                  </h1>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    A prospecção com IA é exclusiva do plano{" "}
                    <strong className="text-foreground">Growth IA</strong>.
                  </p>
                  <Button size="lg" variant="hero" onClick={() => navigate("/perfil?upgrade=growth")}>
                    Fazer upgrade para Growth IA
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mx-auto w-full max-w-4xl min-w-0">
                <div className="text-center mb-8 sm:mb-12 relative">
                  {companyProfile && (
                    <div className="absolute right-0 top-0 hidden sm:block">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => setShowCompanyOnboarding(true)}
                      >
                        <Settings size={14} />
                        Editar Perfil
                      </Button>
                    </div>
                  )}
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                    <Globe size={18} className="text-primary" />
                    <span className="text-sm font-medium text-primary">Oportunidades Web com IA</span>
                  </div>
                  <h1 className="mb-4 font-display text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
                    <span className="text-foreground">Encontre oportunidades pela </span>
                     <span className="text-shimmer-highlight">Web</span>
                  </h1>
                  <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
                    Encontramos o máximo de sites empresariais válidos e extraímos os contatos públicos disponíveis
                  </p>
                  {companyProfile && (
                    <div className="mt-3 sm:hidden">
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowCompanyOnboarding(true)}>
                        <Settings size={14} />
                        Editar Perfil
                      </Button>
                    </div>
                  )}
                </div>

                {companyProfile && (
                  <div className="mb-6">
                    <IdealAudienceMismatchBanner
                      accountOwnerId={accountOwnerId}
                      onEditProfile={() => setShowCompanyOnboarding(true)}
                    />
                  </div>
                )}

                <div className="relative mb-10 w-full min-w-0">
                  <div className="pointer-events-none absolute inset-x-8 -inset-y-3 -z-10 rounded-panel bg-primary/5 blur-3xl" />
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleSearch();
                    }}
                    className="w-full min-w-0 overflow-hidden rounded-panel border border-border/80 bg-card p-5 shadow-card sm:p-8"
                  >
                    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mb-6 pb-6 border-b border-border/50">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Target size={16} className="text-primary" />
                        </div>
                        <span>Sites empresariais</span>
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
                         <span>Busca via Search</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 mb-6 bg-primary/5 border border-primary/20 rounded-xl">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Globe size={18} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">Prospecção por sites no Google</p>
                        <p className="text-xs text-muted-foreground">
                          Buscamos o máximo de sites próprios e removemos redes sociais, marketplaces, diretórios e duplicidades.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:gap-6 mb-6">
                    <div className="space-y-2">
                      <Label htmlFor="query" className="flex items-center gap-2 text-sm font-medium">
                        <Search size={14} className="text-primary" />
                        O que você quer buscar
                      </Label>
                      <Input
                        id="query"
                        placeholder='Ex: clínicas odontológicas em Maringá PR'
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        disabled={isBusy}
                        className="h-12 sm:h-14 bg-secondary/50 border-border/50 text-base placeholder:text-muted-foreground/60 focus:border-primary/50 transition-colors"
                      />
                      <p className="text-xs text-muted-foreground/70">
                        Escreva como pesquisaria no Google. É o único campo obrigatório.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location" className="flex items-center gap-2 text-sm font-medium">
                        <MapPin size={14} className="text-primary" />
                        Localização{" "}
                        <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
                      </Label>
                      <Input
                        id="location"
                        placeholder="Ex: Maringa, State of Parana, Brazil"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        disabled={isBusy}
                        className="h-12 sm:h-14 bg-secondary/50 border-border/50 text-base placeholder:text-muted-foreground/60 focus:border-primary/50 transition-colors"
                      />
                      <p className="text-xs text-muted-foreground/70">
                        Usada para simular a busca a partir dessa região. Se não for reconhecida, buscamos sem ela.
                      </p>
                    </div>
                    </div>


                    <Button
                    type="submit"
                    className="w-full h-14 text-base font-semibold"
                    size="lg"
                    variant="hero"
                    disabled={!canSubmit}
                  >
                    {isBusy ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Analisando sites e contatos...
                      </>
                    ) : (
                      <>
                        <Search size={18} />
                        Buscar Oportunidades
                      </>
                    )}
                    </Button>

                    <p className="mt-3 text-center text-xs text-muted-foreground">
                      Aguarde: a busca analisa cada site encontrado e pode levar até 3 minutos.
                    </p>


                    {errorText && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <span>{errorText}</span>
                    </div>
                    )}
                  </form>
                </div>

                {/* Resumo */}
                {phase === "done" && summary && (
                  <div className="rounded-2xl border border-primary/30 bg-card p-5 sm:p-6 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle2 size={20} className="text-primary" />
                      <h2 className="font-display text-lg font-bold">Busca concluída</h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { icon: Building2, label: "Empresas", value: summary.saved },
                        { icon: Phone, label: "Com telefone", value: summary.withPhone },
                        { icon: Mail, label: "Com e-mail", value: summary.withEmail },
                        { icon: Share2, label: "Com redes", value: summary.withSocial },
                      ].map((s) => (
                        <div key={s.label} className="rounded-xl border border-border bg-background p-3">
                          <s.icon size={16} className="text-primary mb-2" />
                          <p className="text-2xl font-bold leading-none">{s.value}</p>
                          <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                        </div>
                      ))}
                    </div>
                    <Button className="w-full mt-5" variant="hero" onClick={goToManagement}>
                      <Sparkles size={16} />
                      Ver oportunidades
                    </Button>
                  </div>
                )}

                {phase === "idle" && !summary && webHistory.length === 0 && !loadingHistory && (
                  <div className="text-center py-12 sm:py-20">
                    <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6 border border-primary/10">
                      <Globe size={40} className="text-primary" />
                    </div>
                    <h3 className="font-display text-xl sm:text-2xl font-bold mb-3">Pronto para prospectar na web?</h3>
                    <p className="text-muted-foreground max-w-md mx-auto text-base">
                      Insira um termo de busca e uma localização acima para descobrir novos leads qualificados.
                    </p>
                  </div>
                )}

                {/* Histórico de buscas Web — mesma lista de prospecção da Prospecção IA */}
                {webHistory.length > 0 && (
                  <div className="mt-8 sm:mt-12 pt-8 sm:pt-12 border-t border-border/50">
                    <div className="flex items-center justify-between gap-3 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                          <History size={20} className="text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-display text-lg sm:text-xl font-bold">Prospecção Web</h3>
                          <p className="text-sm text-muted-foreground">{webHistory.length} buscas realizadas</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedHistoryIds.size > 0 && (
                          <Button
                            variant="default"
                            size="sm"
                            disabled={bulkExporting}
                            onClick={() => void handleExportSelected()}
                            className="gap-2"
                          >
                            {bulkExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                            Exportar {selectedHistoryIds.size} {selectedHistoryIds.size === 1 ? "busca" : "buscas"}
                          </Button>
                        )}
                        {webHistory.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (selectedHistoryIds.size === webHistory.length) {
                                setSelectedHistoryIds(new Set());
                              } else {
                                setSelectedHistoryIds(new Set(webHistory.map((h) => h.id)));
                              }
                            }}
                            className="gap-1.5 text-xs"
                          >
                            <CheckSquare size={14} />
                            {selectedHistoryIds.size === webHistory.length ? "Desmarcar" : "Selecionar tudo"}
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                          {paginatedHistory.map((item, index) => (
                            <div
                              key={item.id}
                              onClick={() => handleHistoryClick(item)}
                              className={`relative group bg-card border rounded-xl p-4 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer animate-fade-in ${selectedHistoryIds.has(item.id) ? "border-primary/50 bg-primary/5" : "border-border/50"}`}
                              style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
                            >
                              <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={selectedHistoryIds.has(item.id)}
                                  onCheckedChange={(checked) => {
                                    setSelectedHistoryIds((prev) => {
                                      const next = new Set(prev);
                                      if (checked) next.add(item.id);
                                      else next.delete(item.id);
                                      return next;
                                    });
                                  }}
                                />
                              </div>

                              <button
                                onClick={(e) => void handleDeleteHistoryItem(e, item.id)}
                                className="absolute top-3 right-3 p-2 rounded-lg bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/20"
                                title="Excluir"
                              >
                                <Trash2 size={14} />
                              </button>

                              <div className="pl-7 pr-10">
                                <p className="font-semibold text-foreground truncate text-base">{item.keyword}</p>
                                <p className="text-sm text-muted-foreground truncate mt-1 flex items-center gap-1.5">
                                  <MapPin size={12} className="flex-shrink-0 text-primary/60" />
                                  {item.location || "Brasil"}
                                </p>
                              </div>

                              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Clock size={12} />
                                  {formatHistoryDate(item.created_at)}
                                </div>
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                                  <Globe size={10} />
                                  {item.leads?.length || item.results_count}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {totalHistoryPages > 1 && (
                          <div className="flex items-center justify-center gap-4 mt-6">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
                              disabled={historyPage === 1}
                              className="h-9 px-3"
                            >
                              <ChevronLeft size={16} />
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              Página {historyPage} de {totalHistoryPages}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setHistoryPage((prev) => Math.min(totalHistoryPages, prev + 1))}
                              disabled={historyPage === totalHistoryPages}
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
              </div>
            )}
          </main>
        </div>
      </div>

      {user && (
        <CompanyProfileOnboarding
          open={showCompanyOnboarding}
          userId={user.id}
          initialData={companyProfile}
          onClose={() => setShowCompanyOnboarding(false)}
          onComplete={(p: any) => {
            setCompanyProfile(p);
            setShowCompanyOnboarding(false);
          }}
        />
      )}
    </SidebarProvider>
  );
};

export default ProspeccaoWeb;
