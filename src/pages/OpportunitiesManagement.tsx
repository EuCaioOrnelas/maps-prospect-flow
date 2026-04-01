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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search, Star, Globe, Phone, MapPin, ExternalLink, Loader2, BarChart3,
  TrendingUp, Target, ChevronLeft, ChevronRight, Sparkles, RefreshCw,
  Info, MessageSquare, Copy, Check, Pencil, Building2, Tag, Map,
  CheckCircle2, Clock, Send,
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
  ai_approach_message: string | null;
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
  const [approachingLeadId, setApproachingLeadId] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState(false);
  const [editedMessage, setEditedMessage] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchLeads();
  }, [user]);

  const fetchLeads = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("id, company_name, phone, category, city, website, google_maps_link, address, rating, review_count, ai_score, opportunity_level, closing_probability, ai_diagnosis, ai_recommended_action, ai_approach_message, social_media, phone_numbers, enrichment_data, created_at, origin")
        .eq("user_id", user.id)
        .eq("origin", "prospeccao")
        .order("created_at", { ascending: false });

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
      toast({ title: "Lead qualificado!", description: `Score: ${data.score}/100 — ${data.nivel_oportunidade}` });
      const updated = {
        ...lead,
        ai_score: data.score,
        opportunity_level: data.nivel_oportunidade,
        closing_probability: data.probabilidade_fechamento,
        ai_diagnosis: data.diagnostico,
        ai_recommended_action: data.acao_recomendada,
      };
      setLeads((prev) => prev.map((l) => l.id === lead.id ? updated : l));
      if (selectedLead?.id === lead.id) setSelectedLead(updated);
    } catch (err: any) {
      console.error("Scoring error:", err);
      toast({ title: "Erro ao qualificar", description: err.message || "Tente novamente", variant: "destructive" });
    } finally {
      setScoring(false);
      setScoringLeadId(null);
    }
  };

  const approachLead = async (lead: OpportunityLead) => {
    setApproachingLeadId(lead.id);
    try {
      const { data, error } = await supabase.functions.invoke("approach-lead", {
        body: { lead_id: lead.id },
      });
      if (error) throw error;
      toast({ title: "Mensagem gerada!", description: "Mensagem de abordagem criada com sucesso" });
      const updatedLead = {
        ...lead,
        ai_approach_message: data.mensagem,
        enrichment_data: {
          ...(lead.enrichment_data || {}),
          approach_analysis: {
            analise_nicho: data.analise_nicho,
            analise_cidade: data.analise_cidade,
            pontos_fracos: data.pontos_fracos,
            estrategia: data.estrategia,
          },
        },
      };
      setLeads((prev) => prev.map((l) => l.id === lead.id ? updatedLead : l));
      if (selectedLead?.id === lead.id) setSelectedLead(updatedLead);
    } catch (err: any) {
      console.error("Approach error:", err);
      toast({ title: "Erro ao gerar abordagem", description: err.message || "Tente novamente", variant: "destructive" });
    } finally {
      setApproachingLeadId(null);
    }
  };

  const saveEditedMessage = async (lead: OpportunityLead) => {
    try {
      const { error } = await supabase
        .from("leads")
        .update({ ai_approach_message: editedMessage } as any)
        .eq("id", lead.id);
      if (error) throw error;
      const updated = { ...lead, ai_approach_message: editedMessage };
      setLeads((prev) => prev.map((l) => l.id === lead.id ? updated : l));
      if (selectedLead?.id === lead.id) setSelectedLead(updated);
      setEditingMessage(false);
      toast({ title: "Mensagem atualizada!" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
  };

  const copyMessage = (text: string, leadId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(leadId);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Mensagem copiada!" });
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

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / ITEMS_PER_PAGE));
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getScoreBadge = (score: number | null) => {
    if (!score && score !== 0) return <Badge variant="outline" className="text-xs">—</Badge>;
    if (score >= 61) return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">{score}/100</Badge>;
    if (score >= 31) return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">{score}/100</Badge>;
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">{score}/100</Badge>;
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
    const scored = leads.filter((l) => l.ai_score != null && l.ai_score > 0).length;
    const highOpp = leads.filter((l) => l.opportunity_level === "Alta").length;
    const avgScore = scored > 0 ? Math.round(leads.filter((l) => l.ai_score != null && l.ai_score > 0).reduce((s, l) => s + (l.ai_score || 0), 0) / scored) : 0;
    return { total, scored, highOpp, avgScore };
  }, [leads]);

  const scoreInfoContent = (
    <div className="space-y-3 text-sm max-w-xs">
      <h4 className="font-semibold">Como funciona o Score</h4>
      <p className="text-muted-foreground">Nosso modelo analisa 4 dimensões:</p>
      <ul className="space-y-1.5 text-muted-foreground">
        <li><span className="font-medium text-foreground">Estrutura Digital (35pts)</span> — Site e redes sociais</li>
        <li><span className="font-medium text-foreground">Reputação (30pts)</span> — Avaliações e volume</li>
        <li><span className="font-medium text-foreground">Acessibilidade (20pts)</span> — Telefone disponível</li>
        <li><span className="font-medium text-foreground">Oportunidade Oculta (15pts)</span> — Falta de site ou baixa avaliação</li>
      </ul>
      <div className="border-t border-border pt-2 space-y-1">
        <p className="text-xs"><span className="text-emerald-400 font-medium">61-100:</span> Alta Oportunidade</p>
        <p className="text-xs"><span className="text-amber-400 font-medium">31-60:</span> Média</p>
        <p className="text-xs"><span className="text-red-400 font-medium">0-30:</span> Baixa</p>
      </div>
    </div>
  );

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
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold">Gestão de Oportunidades</h1>
                <p className="text-muted-foreground mt-1">Qualifique e aborde suas oportunidades com IA</p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={16} className="text-primary" />
                    <span className="text-xs text-muted-foreground">Total</span>
                  </div>
                  <p className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-12" /> : stats.total}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={16} className="text-blue-400" />
                    <span className="text-xs text-muted-foreground">Qualificados</span>
                  </div>
                  <p className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-12" /> : stats.scored}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={16} className="text-emerald-400" />
                    <span className="text-xs text-muted-foreground">Alta Oportunidade</span>
                  </div>
                  <p className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-12" /> : stats.highOpp}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 size={16} className="text-amber-400" />
                    <span className="text-xs text-muted-foreground">Score Médio</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="ml-auto p-0.5 rounded hover:bg-muted transition-colors">
                          <Info size={14} className="text-muted-foreground" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="bottom" align="end" className="w-80">
                        {scoreInfoContent}
                      </PopoverContent>
                    </Popover>
                  </div>
                  <p className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-12" /> : stats.avgScore}</p>
                </div>
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
              </div>

              {/* Table */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead><div className="flex items-center gap-1.5"><Building2 size={14} />Empresa</div></TableHead>
                      <TableHead><div className="flex items-center gap-1.5"><Tag size={14} />Categoria</div></TableHead>
                      <TableHead><div className="flex items-center gap-1.5"><MapPin size={14} />Cidade</div></TableHead>
                      <TableHead className="text-center"><div className="flex items-center justify-center gap-1.5"><Star size={14} />Avaliação</div></TableHead>
                      <TableHead className="text-center"><div className="flex items-center justify-center gap-1.5"><BarChart3 size={14} />Score</div></TableHead>
                      <TableHead className="text-center"><div className="flex items-center justify-center gap-1.5"><TrendingUp size={14} />Nível</div></TableHead>
                      <TableHead className="text-center"><div className="flex items-center justify-center gap-1.5"><CheckCircle2 size={14} />Status</div></TableHead>
                      <TableHead className="text-center"><div className="flex items-center justify-center gap-1.5"><Map size={14} />Maps</div></TableHead>
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
                          onClick={() => { setSelectedLead(lead); setEditingMessage(false); }}
                        >
                          <TableCell className="font-medium max-w-[220px]">
                            <span className="truncate block" title={lead.company_name || "Sem nome"}>
                              {lead.company_name || "Sem nome"}
                            </span>
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
                            {lead.ai_approach_message ? (
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs gap-1">
                                <CheckCircle2 size={10} />
                                Abordado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
                                <Clock size={10} />
                                Pendente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {lead.google_maps_link && lead.google_maps_link !== "-" ? (
                              <a
                                href={lead.google_maps_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
                                title="Ver no Google Maps"
                              >
                                <Map size={16} />
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
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
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page: number;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={page}
                        size="sm"
                        variant={page === currentPage ? "default" : "outline"}
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    );
                  })}
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
            </div>
          </main>
        </div>
      </div>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => { if (!open) { setSelectedLead(null); setEditingMessage(false); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          {selectedLead && (
            <div className="flex flex-col">
              {/* Header */}
              <div className="p-5 pb-4 border-b border-border">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2.5 text-lg">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 size={18} className="text-primary" />
                    </div>
                    <span className="break-words leading-tight">{selectedLead.company_name || "Sem nome"}</span>
                  </DialogTitle>
                  <DialogDescription className="flex items-center gap-2 flex-wrap mt-2">
                    {selectedLead.category && <Badge variant="outline" className="text-xs">{selectedLead.category}</Badge>}
                    {selectedLead.city && <Badge variant="outline" className="text-xs"><MapPin size={10} className="mr-1" />{selectedLead.city}</Badge>}
                    {getLevelBadge(selectedLead.opportunity_level)}
                    {selectedLead.ai_approach_message ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs gap-1">
                        <CheckCircle2 size={10} /> Abordado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
                        <Clock size={10} /> Pendente
                      </Badge>
                    )}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="p-5 space-y-4">
                {/* Score Card */}
                {selectedLead.ai_score != null && selectedLead.ai_score > 0 && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium flex items-center gap-1.5">
                        <BarChart3 size={14} className="text-primary" />
                        Score de Oportunidade
                      </span>
                      <span className="text-2xl font-bold text-primary">{selectedLead.ai_score}/100</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5 mb-3">
                      <div className="bg-primary rounded-full h-2.5 transition-all" style={{ width: `${selectedLead.ai_score}%` }} />
                    </div>
                    {selectedLead.closing_probability && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Probabilidade de fechamento</span>
                        <Badge variant="outline" className="text-xs">{selectedLead.closing_probability}</Badge>
                      </div>
                    )}
                  </div>
                )}

                {/* Company Info Card */}
                <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Building2 size={14} className="text-primary" />
                    Informações da Empresa
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <DetailItem icon={<MapPin size={13} />} label="Endereço" value={selectedLead.address} />
                    <DetailItem icon={<Phone size={13} />} label="Telefone" value={selectedLead.phone} />
                    <DetailItem icon={<Globe size={13} />} label="Site" value={selectedLead.website} isLink />
                    <DetailItem icon={<Star size={13} className="text-amber-400" />} label="Avaliação" value={selectedLead.rating ? `${selectedLead.rating}/5 (${selectedLead.review_count || 0})` : null} />
                  </div>
                  {selectedLead.google_maps_link && selectedLead.google_maps_link !== "-" && (
                    <a href={selectedLead.google_maps_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline bg-muted/50 rounded-lg px-3 py-2 mt-2 transition-colors hover:bg-muted">
                      <Map size={14} />
                      Ver no Google Maps
                      <ExternalLink size={12} className="ml-auto opacity-50" />
                    </a>
                  )}
                </div>

                {/* AI Diagnosis Card */}
                {selectedLead.ai_diagnosis && (
                  <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                      <Sparkles size={14} className="text-primary" />
                      Diagnóstico IA
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{selectedLead.ai_diagnosis}</p>
                    {selectedLead.ai_recommended_action && (
                      <div className="bg-primary/5 border border-primary/15 rounded-lg p-3">
                        <p className="text-xs font-medium text-primary mb-1">Ação Recomendada</p>
                        <p className="text-sm text-muted-foreground">{selectedLead.ai_recommended_action}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Market Analysis Card */}
                {selectedLead.enrichment_data?.approach_analysis && (
                  <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                      <Target size={14} className="text-primary" />
                      Análise de Mercado
                    </h4>
                    <div className="space-y-2">
                      {selectedLead.enrichment_data.approach_analysis.analise_nicho && (
                        <div className="bg-muted/40 rounded-lg p-3">
                          <p className="text-xs font-medium text-foreground mb-0.5">Nicho</p>
                          <p className="text-xs text-muted-foreground">{selectedLead.enrichment_data.approach_analysis.analise_nicho}</p>
                        </div>
                      )}
                      {selectedLead.enrichment_data.approach_analysis.analise_cidade && (
                        <div className="bg-muted/40 rounded-lg p-3">
                          <p className="text-xs font-medium text-foreground mb-0.5">Cidade</p>
                          <p className="text-xs text-muted-foreground">{selectedLead.enrichment_data.approach_analysis.analise_cidade}</p>
                        </div>
                      )}
                      {selectedLead.enrichment_data.approach_analysis.estrategia && (
                        <div className="bg-muted/40 rounded-lg p-3">
                          <p className="text-xs font-medium text-foreground mb-0.5">Estratégia</p>
                          <p className="text-xs text-muted-foreground">{selectedLead.enrichment_data.approach_analysis.estrategia}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Approach Message Card */}
                <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <MessageSquare size={14} className="text-primary" />
                    Mensagem de Abordagem
                  </h4>
                  {selectedLead.ai_approach_message ? (
                    editingMessage ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editedMessage}
                          onChange={(e) => setEditedMessage(e.target.value)}
                          rows={6}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveEditedMessage(selectedLead)} className="gap-1">
                            <Check size={14} /> Salvar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingMessage(false)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-3 whitespace-pre-wrap leading-relaxed">
                          {selectedLead.ai_approach_message}
                        </p>
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyMessage(selectedLead.ai_approach_message!, selectedLead.id)}
                            className="gap-1.5 text-xs"
                          >
                            {copiedId === selectedLead.id ? <Check size={12} /> : <Copy size={12} />}
                            {copiedId === selectedLead.id ? "Copiada" : "Copiar"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setEditedMessage(selectedLead.ai_approach_message || ""); setEditingMessage(true); }}
                            className="gap-1.5 text-xs"
                          >
                            <Pencil size={12} /> Editar
                          </Button>
                        </div>
                      </div>
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground italic py-2">Nenhuma mensagem gerada ainda. Clique em "Abordar com IA" para gerar.</p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={() => approachLead(selectedLead)}
                    disabled={approachingLeadId === selectedLead.id}
                    className="flex-1 gap-2"
                  >
                    {approachingLeadId === selectedLead.id ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {selectedLead.ai_approach_message ? "Regenerar Abordagem" : "Abordar com IA"}
                  </Button>
                  <Button
                    onClick={() => scoreLead(selectedLead)}
                    disabled={scoring}
                    variant="outline"
                    className="gap-2"
                  >
                    {scoring && scoringLeadId === selectedLead.id ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    Score
                  </Button>
                </div>
              </div>
            </div>
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
