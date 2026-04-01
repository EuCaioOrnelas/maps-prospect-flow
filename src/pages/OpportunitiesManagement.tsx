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
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search, Star, Globe, Phone, MapPin, ExternalLink, Loader2, BarChart3,
  TrendingUp, Target, ChevronLeft, ChevronRight, Sparkles, RefreshCw,
  Info, MessageSquare, Copy, Check, Send, Pencil,
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
        .not("origin", "is", null)
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
      setLeads((prev) =>
        prev.map((l) =>
          l.id === lead.id
            ? { ...l, ai_score: data.score, opportunity_level: data.nivel_oportunidade, closing_probability: data.probabilidade_fechamento, ai_diagnosis: data.diagnostico, ai_recommended_action: data.acao_recomendada }
            : l
        )
      );
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
      const updatedLead = { ...lead, ai_approach_message: data.mensagem, enrichment_data: { ...(lead.enrichment_data || {}), approach_analysis: { analise_nicho: data.analise_nicho, analise_cidade: data.analise_cidade, pontos_fracos: data.pontos_fracos, estrategia: data.estrategia } } };
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
    if (!score) return <Badge variant="outline" className="text-xs">—</Badge>;
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
    const total = filteredLeads.length;
    const scored = leads.filter((l) => l.ai_score).length;
    const highOpp = leads.filter((l) => l.opportunity_level === "Alta").length;
    const avgScore = scored > 0 ? Math.round(leads.filter((l) => l.ai_score).reduce((s, l) => s + (l.ai_score || 0), 0) / scored) : 0;
    return { total, scored, highOpp, avgScore };
  }, [leads, filteredLeads]);

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
                      <TableHead>Empresa</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead className="text-center">Avaliação</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead className="text-center">Oportunidade</TableHead>
                      <TableHead className="text-center">Abordagem</TableHead>
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
                          <TableCell className="font-medium max-w-[220px]">
                            <div className="flex items-center gap-2">
                              <span className="truncate" title={lead.company_name || "Sem nome"}>
                                {lead.company_name || "Sem nome"}
                              </span>
                              {lead.google_maps_link && lead.google_maps_link !== "-" && (
                                <a
                                  href={lead.google_maps_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                                  title="Ver no Google"
                                >
                                  <ExternalLink size={13} />
                                </a>
                              )}
                            </div>
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
                              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                                <MessageSquare size={10} className="mr-1" />
                                Pronta
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => { e.stopPropagation(); approachLead(lead); }}
                                disabled={approachingLeadId === lead.id}
                                className="h-8 gap-1 text-xs"
                                title="Gerar abordagem com IA"
                              >
                                {approachingLeadId === lead.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Send size={14} />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => { e.stopPropagation(); scoreLead(lead); }}
                                disabled={scoring && scoringLeadId === lead.id}
                                className="h-8"
                                title="Qualificar com IA"
                              >
                                {scoring && scoringLeadId === lead.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <RefreshCw size={14} />
                                )}
                              </Button>
                            </div>
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
                  {/* Page numbers */}
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
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedLead && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  <span className="break-words">{selectedLead.company_name || "Sem nome"}</span>
                  {getLevelBadge(selectedLead.opportunity_level)}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Score */}
                {selectedLead.ai_score != null && selectedLead.ai_score > 0 && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Score de Oportunidade</span>
                      <span className="text-2xl font-bold text-primary">{selectedLead.ai_score}/100</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${selectedLead.ai_score}%` }} />
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
                  <a href={selectedLead.google_maps_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
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
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{selectedLead.ai_diagnosis}</p>
                  </div>
                )}

                {/* Approach Analysis */}
                {selectedLead.enrichment_data?.approach_analysis && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Análise de Mercado</h4>
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      {selectedLead.enrichment_data.approach_analysis.analise_nicho && (
                        <div className="bg-muted/50 rounded-lg p-2.5">
                          <span className="font-medium text-foreground">Nicho:</span>{" "}
                          <span className="text-muted-foreground">{selectedLead.enrichment_data.approach_analysis.analise_nicho}</span>
                        </div>
                      )}
                      {selectedLead.enrichment_data.approach_analysis.analise_cidade && (
                        <div className="bg-muted/50 rounded-lg p-2.5">
                          <span className="font-medium text-foreground">Cidade:</span>{" "}
                          <span className="text-muted-foreground">{selectedLead.enrichment_data.approach_analysis.analise_cidade}</span>
                        </div>
                      )}
                      {selectedLead.enrichment_data.approach_analysis.estrategia && (
                        <div className="bg-muted/50 rounded-lg p-2.5">
                          <span className="font-medium text-foreground">Estratégia:</span>{" "}
                          <span className="text-muted-foreground">{selectedLead.enrichment_data.approach_analysis.estrategia}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Approach Message */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
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
                      <div className="relative">
                        <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 whitespace-pre-wrap">
                          {selectedLead.ai_approach_message}
                        </p>
                        <div className="flex gap-1 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyMessage(selectedLead.ai_approach_message!, selectedLead.id)}
                            className="gap-1 text-xs"
                          >
                            {copiedId === selectedLead.id ? <Check size={12} /> : <Copy size={12} />}
                            {copiedId === selectedLead.id ? "Copiada" : "Copiar"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setEditedMessage(selectedLead.ai_approach_message || ""); setEditingMessage(true); }}
                            className="gap-1 text-xs"
                          >
                            <Pencil size={12} /> Editar
                          </Button>
                        </div>
                      </div>
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nenhuma mensagem gerada ainda</p>
                  )}
                </div>

                {/* Closing probability */}
                {selectedLead.closing_probability && (
                  <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                    <span className="text-sm text-muted-foreground">Probabilidade de Fechamento</span>
                    <Badge variant="outline">{selectedLead.closing_probability}</Badge>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
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
                    {scoring ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    Score
                  </Button>
                </div>
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
