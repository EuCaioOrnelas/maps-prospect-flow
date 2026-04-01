import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SEO } from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Star,
  Globe,
  Phone,
  MapPin,
  ExternalLink,
  Loader2,
  BarChart3,
  TrendingUp,
  Target,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface OpportunityLead {
  id: string;
  company_name: string | null;
  phone: string;
  category: string | null;
  city: string | null;
  website: string | null;
  google_maps_link: string | null;
  address: string | null;
  rating: number | null;
  review_count: number | null;
  ai_score: number | null;
  opportunity_level: string | null;
  closing_probability: string | null;
  ai_diagnosis: string | null;
  ai_recommended_action: string | null;
  social_media: any;
  phone_numbers: any;
  enrichment_data: any;
  created_at: string;
  origin: string | null;
}

const ITEMS_PER_PAGE = 20;

export default function OpportunitiesManagement() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<OpportunityLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLead, setSelectedLead] = useState<OpportunityLead | null>(null);
  const [scoring, setScoring] = useState(false);
  const [scoringLeadId, setScoringLeadId] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchLeads();
  }, [user]);

  const fetchLeads = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("id, company_name, phone, category, city, website, google_maps_link, address, rating, review_count, ai_score, opportunity_level, closing_probability, ai_diagnosis, ai_recommended_action, social_media, phone_numbers, enrichment_data, created_at, origin")
        .eq("user_id", user.id)
        .not("origin", "is", null)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;
      setLeads((data as OpportunityLead[]) || []);
    } catch (err) {
      console.error("Error fetching leads:", err);
    } finally {
      setLoading(false);
    }
  };

  const scoreLead = async (lead: OpportunityLead) => {
    setScoringLeadId(lead.id);
    setScoring(true);
    try {
      const { data, error } = await supabase.functions.invoke("score-opportunity", {
        body: {
          lead_id: lead.id,
          nome_empresa: lead.company_name || "Desconhecido",
          endereco: lead.address || "",
          google_maps_link: lead.google_maps_link || "",
          avaliacao_media: lead.rating || 0,
          quantidade_avaliacoes: lead.review_count || 0,
          possui_site: !!lead.website && lead.website !== "-",
          possui_telefone: !!lead.phone && lead.phone !== "-",
          redes_sociais: Array.isArray(lead.social_media) ? lead.social_media : [],
        },
      });

      if (error) throw error;

      toast({
        title: "Lead qualificado!",
        description: `Score: ${data.score}/100 — ${data.nivel_oportunidade}`,
      });

      // Update local state
      setLeads((prev) =>
        prev.map((l) =>
          l.id === lead.id
            ? {
                ...l,
                ai_score: data.score,
                opportunity_level: data.nivel_oportunidade,
                closing_probability: data.probabilidade_fechamento,
                ai_diagnosis: data.diagnostico,
                ai_recommended_action: data.acao_recomendada,
              }
            : l
        )
      );
    } catch (err: any) {
      console.error("Scoring error:", err);
      toast({
        title: "Erro ao qualificar",
        description: err.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setScoring(false);
      setScoringLeadId(null);
    }
  };

  const scoreAllLeads = async () => {
    const unscored = filteredLeads.filter((l) => !l.ai_score);
    if (unscored.length === 0) {
      toast({ title: "Todos os leads já foram qualificados!" });
      return;
    }

    setScoring(true);
    let scored = 0;
    for (const lead of unscored.slice(0, 20)) {
      try {
        await scoreLead(lead);
        scored++;
        // Small delay to avoid rate limits
        await new Promise((r) => setTimeout(r, 800));
      } catch {
        break;
      }
    }
    setScoring(false);
    toast({
      title: `${scored} leads qualificados`,
      description: scored < unscored.length ? `${unscored.length - scored} restantes` : "Todos prontos!",
    });
  };

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (l) =>
          l.company_name?.toLowerCase().includes(term) ||
          l.phone?.includes(term) ||
          l.category?.toLowerCase().includes(term) ||
          l.city?.toLowerCase().includes(term)
      );
    }
    if (filterLevel !== "all") {
      result = result.filter((l) => l.opportunity_level === filterLevel);
    }
    return result;
  }, [leads, searchTerm, filterLevel]);

  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getScoreBadge = (score: number | null) => {
    if (!score) return <Badge variant="outline" className="text-xs">Não qualificado</Badge>;
    if (score >= 61) return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">{score}</Badge>;
    if (score >= 31) return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">{score}</Badge>;
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">{score}</Badge>;
  };

  const getLevelBadge = (level: string | null) => {
    if (!level) return null;
    const colors: Record<string, string> = {
      Alta: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      Média: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      Baixa: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    return <Badge className={`${colors[level] || ""} text-xs`}>{level}</Badge>;
  };

  const stats = useMemo(() => {
    const total = leads.length;
    const scored = leads.filter((l) => l.ai_score).length;
    const highOpp = leads.filter((l) => l.opportunity_level === "Alta").length;
    const avgScore = scored > 0 ? Math.round(leads.filter((l) => l.ai_score).reduce((s, l) => s + (l.ai_score || 0), 0) / scored) : 0;
    return { total, scored, highOpp, avgScore };
  }, [leads]);

  return (
    <SidebarProvider>
      <SEO title="Gestão de Oportunidades | Wiize" description="Gerencie e qualifique suas oportunidades com IA" />
      <div className="min-h-screen flex w-full bg-background relative overflow-hidden">
        <BackgroundGlow />
        <AppSidebar profile={profile} />
        <div className="flex-1 flex flex-col min-w-0 lg:pl-[72px]">
          <AppHeader profile={profile} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header */}
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold">Gestão de Oportunidades</h1>
                <p className="text-muted-foreground mt-1">Qualifique e gerencie todas as oportunidades geradas pela IA</p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total", value: stats.total, icon: Target, color: "text-primary" },
                  { label: "Qualificados", value: stats.scored, icon: Sparkles, color: "text-blue-400" },
                  { label: "Alta Oportunidade", value: stats.highOpp, icon: TrendingUp, color: "text-emerald-400" },
                  { label: "Score Médio", value: stats.avgScore, icon: BarChart3, color: "text-amber-400" },
                ].map((kpi) => (
                  <div key={kpi.label} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <kpi.icon size={16} className={kpi.color} />
                      <span className="text-xs text-muted-foreground">{kpi.label}</span>
                    </div>
                    <p className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-12" /> : kpi.value}</p>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, telefone, categoria..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-9"
                  />
                </div>
                <Select value={filterLevel} onValueChange={(v) => { setFilterLevel(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Nível" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os níveis</SelectItem>
                    <SelectItem value="Alta">Alta Oportunidade</SelectItem>
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={scoreAllLeads} disabled={scoring} variant="outline" className="gap-2">
                  {scoring ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Qualificar com IA
                </Button>
              </div>

              {/* Table */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead className="text-center">Avaliação</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead className="text-center">Oportunidade</TableHead>
                      <TableHead className="text-center">Prob. Fech.</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 8 }).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : paginatedLeads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          {searchTerm || filterLevel !== "all"
                            ? "Nenhuma oportunidade encontrada com esses filtros"
                            : "Nenhuma oportunidade ainda. Faça uma busca em Oportunidades → Buscar"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedLeads.map((lead) => (
                        <TableRow
                          key={lead.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedLead(lead)}
                        >
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {lead.company_name || "Sem nome"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                            {lead.category || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{lead.city || "-"}</TableCell>
                          <TableCell className="text-center">
                            {lead.rating ? (
                              <div className="flex items-center justify-center gap-1">
                                <Star size={14} className="text-amber-400 fill-amber-400" />
                                <span className="text-sm">{lead.rating}</span>
                                <span className="text-xs text-muted-foreground">({lead.review_count || 0})</span>
                              </div>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-center">{getScoreBadge(lead.ai_score)}</TableCell>
                          <TableCell className="text-center">{getLevelBadge(lead.opportunity_level)}</TableCell>
                          <TableCell className="text-center">
                            <span className="text-xs text-muted-foreground">{lead.closing_probability || "-"}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => { e.stopPropagation(); scoreLead(lead); }}
                              disabled={scoring && scoringLeadId === lead.id}
                              className="h-8"
                            >
                              {scoring && scoringLeadId === lead.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <RefreshCw size={14} />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {filteredLeads.length} oportunidade(s) — Página {currentPage} de {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedLead && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedLead.company_name || "Sem nome"}
                  {getLevelBadge(selectedLead.opportunity_level)}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Score */}
                {selectedLead.ai_score && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Score de Oportunidade</span>
                      <span className="text-2xl font-bold text-primary">{selectedLead.ai_score}/100</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{ width: `${selectedLead.ai_score}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3">
                  <InfoItem icon={<MapPin size={14} />} label="Endereço" value={selectedLead.address} />
                  <InfoItem icon={<Phone size={14} />} label="Telefone" value={selectedLead.phone} />
                  <InfoItem icon={<Globe size={14} />} label="Site" value={selectedLead.website} isLink />
                  <InfoItem icon={<Star size={14} />} label="Avaliação" value={selectedLead.rating ? `${selectedLead.rating} (${selectedLead.review_count || 0} avaliações)` : null} />
                </div>

                {/* Google Maps Link */}
                {selectedLead.google_maps_link && selectedLead.google_maps_link !== "-" && (
                  <a
                    href={selectedLead.google_maps_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink size={14} />
                    Ver no Google Maps
                  </a>
                )}

                {/* AI Diagnosis */}
                {selectedLead.ai_diagnosis && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Sparkles size={14} className="text-primary" />
                      Diagnóstico IA
                    </h4>
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                      {selectedLead.ai_diagnosis}
                    </p>
                  </div>
                )}

                {/* Recommended Action */}
                {selectedLead.ai_recommended_action && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Target size={14} className="text-primary" />
                      Ação Recomendada
                    </h4>
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                      {selectedLead.ai_recommended_action}
                    </p>
                  </div>
                )}

                {/* Closing probability */}
                {selectedLead.closing_probability && (
                  <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                    <span className="text-sm text-muted-foreground">Probabilidade de Fechamento</span>
                    <Badge variant="outline">{selectedLead.closing_probability}</Badge>
                  </div>
                )}

                {/* Score button */}
                <Button
                  onClick={() => scoreLead(selectedLead)}
                  disabled={scoring}
                  className="w-full gap-2"
                >
                  {scoring ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {selectedLead.ai_score ? "Requalificar com IA" : "Qualificar com IA"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}

function InfoItem({ icon, label, value, isLink }: { icon: React.ReactNode; label: string; value: string | number | null | undefined; isLink?: boolean }) {
  if (!value || value === "-") return null;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      {isLink && typeof value === "string" ? (
        <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate block">
          {value}
        </a>
      ) : (
        <p className="text-sm truncate">{value}</p>
      )}
    </div>
  );
}
