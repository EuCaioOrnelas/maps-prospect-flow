import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
import { Progress } from "@/components/ui/progress";
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
  CheckCircle2, Clock, Send, ShieldCheck, Eye, AlertTriangle, Zap, SlidersHorizontal, X,
  Settings, Wifi, ChevronDown, ChevronUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyProfileOnboarding } from "@/components/opportunities/CompanyProfileOnboarding";
import { SendMessageDialog } from "@/components/opportunities/SendMessageDialog";
import { NumbersManager } from "@/components/whatsapp/NumbersManager";
import { useWhatsAppNumbers } from "@/hooks/useWhatsAppNumbers";
import { formatPhoneNumber } from "@/lib/phoneUtils";

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
  first_message_sent: boolean | null;
  whatsapp_number_id: string | null;
}

const ITEMS_PER_PAGE = 20;

export default function OpportunitiesManagement() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<OpportunityLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [minScore, setMinScore] = useState("");
  const [minRating, setMinRating] = useState("");
  const [onlyHighOpp, setOnlyHighOpp] = useState(false);
  const [sortOrder, setSortOrder] = useState<"default" | "score_desc" | "score_asc">("default");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterCity, setFilterCity] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLead, setSelectedLead] = useState<OpportunityLead | null>(null);
  const [popupTab, setPopupTab] = useState<"score" | "dados">("dados");
  const [scoring, setScoring] = useState(false);
  const [scoringLeadId, setScoringLeadId] = useState<string | null>(null);
  const [approachingLeadId, setApproachingLeadId] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState(false);
  const [editedMessage, setEditedMessage] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // Batch scoring state
  const [batchScoring, setBatchScoring] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchCurrentName, setBatchCurrentName] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Diagnostic editing state
  const [editingDiagnostic, setEditingDiagnostic] = useState(false);
  const [editDiagnosis, setEditDiagnosis] = useState("");
  const [editRecommendedAction, setEditRecommendedAction] = useState("");
  const [editPontosFortes, setEditPontosFortes] = useState<string[]>([]);
  const [editPontosFracos, setEditPontosFracos] = useState<string[]>([]);
  const [editCustomDiagnosis, setEditCustomDiagnosis] = useState("");
  const [savingDiagnostic, setSavingDiagnostic] = useState(false);

  const scoredAttemptedRef = useRef(new Set<string>());

  // Company profile & onboarding state
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Send message state
  const [sendingLead, setSendingLead] = useState<OpportunityLead | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(true);
  const [sendCooldown, setSendCooldown] = useState(0);

  // WhatsApp numbers management
  const { numbers, maxNumbers, fetchNumbers } = useWhatsAppNumbers();
  const [showNumbersManager, setShowNumbersManager] = useState(false);

  // Check company profile on mount
  useEffect(() => {
    if (user) {
      fetchCompanyProfile();
    }
  }, [user]);

  // Cooldown timer
  useEffect(() => {
    if (sendCooldown <= 0) return;
    const timer = setInterval(() => {
      setSendCooldown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [sendCooldown]);

  const fetchCompanyProfile = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("company_profiles" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setCompanyProfile(data);
        // Check last_message_sent_at for cooldown
        if ((data as any).last_message_sent_at) {
          const lastSent = new Date((data as any).last_message_sent_at).getTime();
          const diff = 120 - Math.floor((Date.now() - lastSent) / 1000);
          if (diff > 0) setSendCooldown(diff);
        }
      } else {
        setShowOnboarding(true);
      }
    } catch (err) {
      console.error("Error fetching company profile:", err);
    } finally {
      setProfileLoaded(true);
    }
  };

  useEffect(() => {
    if (user && profileLoaded && !showOnboarding) fetchLeads();
  }, [user, profileLoaded, showOnboarding]);

  // Auto-score unscored leads when they appear
  useEffect(() => {
    const unscored = leads.filter(l => (l.ai_score == null || l.ai_score === 0) && !scoredAttemptedRef.current.has(l.id));
    if (unscored.length > 0 && !batchScoring && !loading) {
      unscored.forEach(l => scoredAttemptedRef.current.add(l.id));
      batchScoreLeads(unscored);
    }
  }, [leads.length, loading]);

  const fetchLeads = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("id, company_name, phone, category, city, website, google_maps_link, address, rating, review_count, ai_score, opportunity_level, closing_probability, ai_diagnosis, ai_recommended_action, ai_approach_message, social_media, phone_numbers, enrichment_data, created_at, origin, first_message_sent, whatsapp_number_id")
        .eq("user_id", user.id)
        .in("origin", ["oportunidades", "prospeccao"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeads((data as OpportunityLead[]) || []);
    } catch (err) {
      console.error("Error fetching leads:", err);
    } finally {
      setLoading(false);
    }
  };

  const batchScoreLeads = async (unscoredLeads: OpportunityLead[]) => {
    setBatchScoring(true);
    setBatchTotal(unscoredLeads.length);
    setBatchProgress(0);

    for (let i = 0; i < unscoredLeads.length; i++) {
      const lead = unscoredLeads[i];
      setBatchCurrentName(lead.company_name || "Lead");
      setBatchProgress(i + 1);

      try {
        const { data, error } = await supabase.functions.invoke("score-opportunity", {
          body: {
            lead_id: lead.id,
            nome_empresa: lead.company_name || "Desconhecido",
            endereco: lead.address || "",
            categoria: lead.category || "",
            cidade: lead.city || "",
            google_maps_link: lead.google_maps_link || "",
            avaliacao_media: lead.rating || 0,
            quantidade_avaliacoes: lead.review_count || 0,
            possui_site: !!lead.website && lead.website !== "-",
            site_url: lead.website || "",
            possui_telefone: !!lead.phone && lead.phone !== "-",
            redes_sociais: Array.isArray(lead.social_media) ? lead.social_media : [],
          },
        });
        if (!error && data) {
          setLeads(prev => prev.map(l => l.id === lead.id ? {
            ...l,
            ai_score: data.score,
            opportunity_level: data.nivel_oportunidade,
            closing_probability: data.probabilidade_fechamento,
            ai_diagnosis: data.diagnostico,
            ai_recommended_action: data.acao_recomendada,
            enrichment_data: {
              ...(l.enrichment_data || {}),
              score_breakdown: data.score_breakdown,
              pontos_fortes: data.pontos_fortes,
              pontos_fracos: data.pontos_fracos,
              justificativa_score: data.justificativa_score,
              analise_site: data.analise_site,
              analise_redes_sociais: data.analise_redes_sociais,
              analise_concorrencia_regional: data.analise_concorrencia_regional,
              analise_demanda_regional: data.analise_demanda_regional,
            },
          } : l));
        }
      } catch (err) {
        console.error(`Score error for ${lead.company_name}:`, err);
      }
    }

    setBatchScoring(false);
    toast({ title: "Qualificação concluída!", description: `${unscoredLeads.length} lead(s) analisados com IA` });
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
          categoria: lead.category || "",
          cidade: lead.city || "",
          google_maps_link: lead.google_maps_link || "",
          avaliacao_media: lead.rating || 0,
          quantidade_avaliacoes: lead.review_count || 0,
          possui_site: !!lead.website && lead.website !== "-",
          site_url: lead.website || "",
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
        enrichment_data: {
          ...(lead.enrichment_data || {}),
          score_breakdown: data.score_breakdown,
          pontos_fortes: data.pontos_fortes,
          pontos_fracos: data.pontos_fracos,
          justificativa_score: data.justificativa_score,
          analise_site: data.analise_site,
          analise_redes_sociais: data.analise_redes_sociais,
          analise_concorrencia_regional: data.analise_concorrencia_regional,
          analise_demanda_regional: data.analise_demanda_regional,
        },
      };
      setLeads(prev => prev.map(l => l.id === lead.id ? updated : l));
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
      setLeads(prev => prev.map(l => l.id === lead.id ? updatedLead : l));
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
      setLeads(prev => prev.map(l => l.id === lead.id ? updated : l));
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

  // Derive correct level from score to fix inconsistency
  const getIntentionFromScore = (score: number | null): string | null => {
    if (score == null || score === 0) return null;
    if (score >= 61) return "Alta";
    if (score >= 31) return "Média";
    return "Baixa";
  };

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(l =>
        l.company_name?.toLowerCase().includes(term) ||
        l.phone?.includes(term) ||
        l.category?.toLowerCase().includes(term) ||
        l.city?.toLowerCase().includes(term)
      );
    }
    if (filterLevel !== "all") {
      result = result.filter(l => {
        const intention = l.ai_score != null && l.ai_score > 0 ? getIntentionFromScore(l.ai_score) : l.opportunity_level;
        return intention === filterLevel;
      });
    }
    if (minScore) {
      const ms = parseInt(minScore);
      if (!isNaN(ms)) result = result.filter(l => (l.ai_score ?? 0) >= ms);
    }
    if (minRating) {
      const mr = parseFloat(minRating);
      if (!isNaN(mr)) result = result.filter(l => (l.rating ?? 0) >= mr);
    }
    if (onlyHighOpp) {
      result = result.filter(l => (l.ai_score ?? 0) >= 70);
    }
    if (filterCategory !== "all") {
      result = result.filter(l => l.category === filterCategory);
    }
    if (filterCity !== "all") {
      result = result.filter(l => l.city === filterCity);
    }
    if (sortOrder === "score_desc") {
      result = [...result].sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0));
    } else if (sortOrder === "score_asc") {
      result = [...result].sort((a, b) => (a.ai_score ?? 0) - (b.ai_score ?? 0));
    }
    return result;
  }, [leads, searchTerm, filterLevel, minScore, minRating, onlyHighOpp, sortOrder, filterCategory, filterCity]);

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


  const getLevelBadge = (level: string | null, score?: number | null) => {
    // Use score-derived level to avoid AI inconsistency
    const correctedLevel = score != null && score > 0 ? getIntentionFromScore(score) : level;
    if (!correctedLevel) return null;
    const colors: Record<string, string> = {
      Alta: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      Média: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      Baixa: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    return <Badge className={`${colors[correctedLevel] || ""} text-xs`}>{correctedLevel}</Badge>;
  };

  const stats = useMemo(() => {
    const total = leads.length;
    const scored = leads.filter(l => l.ai_score != null && l.ai_score > 0).length;
    const highOpp = leads.filter(l => (l.ai_score ?? 0) >= 70).length;
    const avgScore = scored > 0 ? Math.round(leads.filter(l => l.ai_score != null && l.ai_score > 0).reduce((s, l) => s + (l.ai_score || 0), 0) / scored) : 0;
    return { total, scored, highOpp, avgScore };
  }, [leads]);

  const uniqueCategories = useMemo(() => {
    const cats = leads.map(l => l.category).filter(Boolean) as string[];
    return [...new Set(cats)].sort();
  }, [leads]);

  const uniqueCities = useMemo(() => {
    const cities = leads.map(l => l.city).filter(Boolean) as string[];
    return [...new Set(cities)].sort();
  }, [leads]);

  const scoreInfoContent = (
    <div className="space-y-3 text-sm max-w-xs">
      <h4 className="font-semibold">Como funciona o Score</h4>
      <p className="text-muted-foreground">A IA analisa cada empresa individualmente em 5 dimensões:</p>
      <ul className="space-y-1.5 text-muted-foreground">
        <li><span className="font-medium text-foreground">Estrutura Digital (25pts)</span> — Site e redes sociais</li>
        <li><span className="font-medium text-foreground">Reputação (25pts)</span> — Avaliações e respostas</li>
        <li><span className="font-medium text-foreground">Acessibilidade (20pts)</span> — Telefone e endereço</li>
        <li><span className="font-medium text-foreground">Engajamento (15pts)</span> — Atividade nas redes e site</li>
        <li><span className="font-medium text-foreground">Potencial de Venda (15pts)</span> — Oportunidades ocultas</li>
      </ul>
      <div className="border-t border-border pt-2 space-y-1">
        <p className="text-xs"><span className="text-emerald-400 font-medium">61-100:</span> Alta Oportunidade</p>
        <p className="text-xs"><span className="text-amber-400 font-medium">31-60:</span> Média</p>
        <p className="text-xs"><span className="text-red-400 font-medium">0-30:</span> Baixa</p>
      </div>
    </div>
  );

  const startEditingDiagnostic = (lead: OpportunityLead) => {
    setEditDiagnosis(lead.ai_diagnosis || "");
    setEditRecommendedAction(lead.ai_recommended_action || "");
    setEditPontosFortes(lead.enrichment_data?.pontos_fortes || []);
    setEditPontosFracos(lead.enrichment_data?.pontos_fracos || []);
    setEditCustomDiagnosis(lead.enrichment_data?.custom_diagnosis || "");
    setEditingDiagnostic(true);
  };

  const saveDiagnostic = async (lead: OpportunityLead) => {
    if (!user) return;
    setSavingDiagnostic(true);
    try {
      const updatedEnrichment = {
        ...(typeof lead.enrichment_data === 'object' && lead.enrichment_data ? lead.enrichment_data : {}),
        pontos_fortes: editPontosFortes.filter(p => p.trim()),
        pontos_fracos: editPontosFracos.filter(p => p.trim()),
        custom_diagnosis: editCustomDiagnosis.trim(),
      };

      const { error } = await supabase
        .from('leads')
        .update({
          ai_diagnosis: editDiagnosis,
          ai_recommended_action: editRecommendedAction,
          enrichment_data: updatedEnrichment,
        })
        .eq('id', lead.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setLeads(prev => prev.map(l => l.id === lead.id ? {
        ...l,
        ai_diagnosis: editDiagnosis,
        ai_recommended_action: editRecommendedAction,
        enrichment_data: updatedEnrichment,
      } : l));
      setSelectedLead(prev => prev && prev.id === lead.id ? {
        ...prev,
        ai_diagnosis: editDiagnosis,
        ai_recommended_action: editRecommendedAction,
        enrichment_data: updatedEnrichment,
      } : prev);
      setEditingDiagnostic(false);
      toast({ title: "Diagnóstico atualizado!" });
    } catch (err) {
      console.error('Error saving diagnostic:', err);
      toast({ title: "Erro ao salvar", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setSavingDiagnostic(false);
    }
  };

  const renderScoreBreakdown = (lead: OpportunityLead) => {
    const breakdown = lead.enrichment_data?.score_breakdown;
    const pontosFortes = lead.enrichment_data?.pontos_fortes || [];
    const pontosFracos = lead.enrichment_data?.pontos_fracos || [];
    const justificativa = lead.enrichment_data?.justificativa_score || "";

    const dimensions = [
      { label: "Estrutura Digital", value: breakdown?.estrutura_digital ?? 0, max: 25, icon: <Globe size={14} className="text-primary" />, tooltip: "Avalia se o lead possui site, blog, landing pages ou presença digital estruturada. Sites profissionais, com SSL e boa velocidade pontuam mais." },
      { label: "Reputação", value: breakdown?.reputacao ?? 0, max: 25, icon: <Star size={14} className="text-primary" />, tooltip: "Considera avaliações no Google Maps, nota média, quantidade de reviews e sentimento geral dos comentários." },
      { label: "Acessibilidade", value: breakdown?.acessibilidade ?? 0, max: 20, icon: <Phone size={14} className="text-primary" />, tooltip: "Verifica se o lead possui telefone válido, WhatsApp ativo, e-mail de contato e outros canais de comunicação acessíveis." },
      
      { label: "Potencial de Venda", value: breakdown?.potencial_venda ?? 0, max: 15, icon: <Zap size={14} className="text-primary" />, tooltip: "Estima a probabilidade de conversão com base no nicho, porte do negócio, localização e compatibilidade com seu produto/serviço." },
    ];

    return (
      <div className="space-y-4">
        {/* Score Principal */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 text-center">
          <p className="text-5xl font-bold text-primary">{lead.ai_score ?? 0}</p>
          <p className="text-sm text-muted-foreground mt-1">de 100 pontos</p>
          <div className="w-full bg-muted rounded-full h-3 mt-4">
            <div className="bg-primary rounded-full h-3 transition-all duration-500" style={{ width: `${lead.ai_score ?? 0}%` }} />
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-muted-foreground">Intenção: {getIntentionFromScore(lead.ai_score) || lead.opportunity_level || "—"}</span>
            {lead.closing_probability && <Badge variant="outline" className="text-xs">{lead.closing_probability}</Badge>}
          </div>
        </div>

        {/* Breakdown por dimensão */}
        {breakdown && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 size={14} className="text-primary" />
              Detalhamento do Score
            </h4>
            {dimensions.map(dim => (
              <div key={dim.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    {dim.icon}
                    {dim.label}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="text-muted-foreground/50 hover:text-primary transition-colors">
                          <Info size={12} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="top" className="text-xs text-muted-foreground max-w-[240px] p-3">
                        {dim.tooltip}
                      </PopoverContent>
                    </Popover>
                  </span>
                  <span className="font-semibold">{dim.value}/{dim.max}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500 bg-primary" style={{ width: `${(dim.value / dim.max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Justificativa */}
        {justificativa && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Info size={14} className="text-primary" />
              Por que este score?
            </h4>
            <p className="text-sm text-muted-foreground">{justificativa}</p>
          </div>
        )}

        {/* Edit / View toggle button */}
        <div className="flex justify-end">
          {!editingDiagnostic ? (
            <Button variant="outline" size="sm" onClick={() => startEditingDiagnostic(lead)} className="gap-1.5">
              <Pencil size={13} />
              Editar Diagnóstico
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditingDiagnostic(false)} disabled={savingDiagnostic}>
                <X size={13} className="mr-1" /> Cancelar
              </Button>
              <Button size="sm" onClick={() => saveDiagnostic(lead)} disabled={savingDiagnostic} className="gap-1.5">
                {savingDiagnostic ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Salvar
              </Button>
            </div>
          )}
        </div>

        {/* Pontos fortes e fracos */}
        {editingDiagnostic ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-primary flex items-center gap-1.5 mb-3">
                <CheckCircle2 size={14} />
                Pontos Fortes
              </h4>
              <div className="space-y-2">
                {editPontosFortes.map((p, i) => (
                  <div key={i} className="flex gap-1.5">
                    <Input
                      value={p}
                      onChange={(e) => { const arr = [...editPontosFortes]; arr[i] = e.target.value; setEditPontosFortes(arr); }}
                      className="text-sm h-8"
                    />
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => setEditPontosFortes(editPontosFortes.filter((_, idx) => idx !== i))}>
                      <X size={12} />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setEditPontosFortes([...editPontosFortes, ""])}>
                  + Adicionar
                </Button>
              </div>
            </div>
            <div className="bg-muted/30 border border-border rounded-xl p-4">
              <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 mb-3">
                <AlertTriangle size={14} />
                Pontos Fracos
              </h4>
              <div className="space-y-2">
                {editPontosFracos.map((p, i) => (
                  <div key={i} className="flex gap-1.5">
                    <Input
                      value={p}
                      onChange={(e) => { const arr = [...editPontosFracos]; arr[i] = e.target.value; setEditPontosFracos(arr); }}
                      className="text-sm h-8"
                    />
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => setEditPontosFracos(editPontosFracos.filter((_, idx) => idx !== i))}>
                      <X size={12} />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setEditPontosFracos([...editPontosFracos, ""])}>
                  + Adicionar
                </Button>
              </div>
            </div>
          </div>
        ) : (pontosFortes.length > 0 || pontosFracos.length > 0) ? (
          <div className="grid grid-cols-2 gap-3">
            {pontosFortes.length > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-primary flex items-center gap-1.5 mb-3">
                  <CheckCircle2 size={14} />
                  Pontos Fortes
                </h4>
                <ul className="space-y-2">
                  {pontosFortes.map((p: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 size={12} className="text-primary mt-0.5 shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {pontosFracos.length > 0 && (
              <div className="bg-muted/30 border border-border rounded-xl p-4">
                <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 mb-3">
                  <AlertTriangle size={14} />
                  Pontos Fracos
                </h4>
                <ul className="space-y-2">
                  {pontosFracos.map((p: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <AlertTriangle size={12} className="mt-0.5 shrink-0 opacity-60" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}

        {/* Diagnóstico IA */}
        {editingDiagnostic ? (
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles size={14} className="text-primary" />
              Diagnóstico IA
            </h4>
            <Textarea value={editDiagnosis} onChange={(e) => setEditDiagnosis(e.target.value)} className="text-sm min-h-[120px]" placeholder="Escreva o diagnóstico..." />
          </div>
        ) : lead.ai_diagnosis ? (
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles size={14} className="text-primary" />
              Diagnóstico IA
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{lead.ai_diagnosis}</p>
          </div>
        ) : null}

        {/* Diagnóstico Adicional (custom) - antes da Oportunidade */}
        {editingDiagnostic ? (
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Pencil size={14} className="text-primary" />
              Diagnóstico Adicional
            </h4>
            <p className="text-xs text-muted-foreground">Adicione observações extras da sua análise pessoal. A IA usará isso para melhorar mensagens e respostas.</p>
            <Textarea value={editCustomDiagnosis} onChange={(e) => setEditCustomDiagnosis(e.target.value)} className="text-sm min-h-[120px]" placeholder="Ex: O dono é muito receptivo, gosta de tecnologia, já tentou contratar serviço similar..." />
          </div>
        ) : lead.enrichment_data?.custom_diagnosis ? (
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Pencil size={14} className="text-primary" />
              Diagnóstico Adicional
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{lead.enrichment_data.custom_diagnosis}</p>
          </div>
        ) : !editingDiagnostic ? (
          <button
            onClick={() => startEditingDiagnostic(lead)}
            className="w-full border border-dashed border-primary/30 rounded-xl p-3 flex items-center justify-center gap-2 text-sm text-primary hover:bg-primary/5 transition-colors"
          >
            <Pencil size={13} />
            Adicionar Diagnóstico Adicional
          </button>
        ) : null}

        {/* Oportunidade Encontrada - sempre no final */}
        {editingDiagnostic ? (
          <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
              <Zap size={14} />
              Oportunidade Encontrada
            </h4>
            <Textarea value={editRecommendedAction} onChange={(e) => setEditRecommendedAction(e.target.value)} className="text-sm min-h-[100px]" placeholder="Descreva a oportunidade..." />
          </div>
        ) : lead.ai_recommended_action ? (
          <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
              <Zap size={14} />
              Oportunidade Encontrada
            </h4>
            <p className="text-sm text-muted-foreground">{lead.ai_recommended_action}</p>
          </div>
        ) : null}
      </div>
    );
  };

  const renderLeadData = (lead: OpportunityLead) => (
    <div className="space-y-4">
      {/* Company Info Card */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Building2 size={14} className="text-primary" />
          Informações da Empresa
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <DetailCard icon={<MapPin size={13} />} label="Endereço" value={lead.address} />
          <DetailCard icon={<Phone size={13} />} label="Telefone" value={formatPhoneNumber(lead.phone)} />
          <DetailCard icon={<Globe size={13} />} label="Site" value={lead.website} isLink />
          <DetailCard icon={<Star size={13} className="text-amber-400" />} label="Avaliação" value={lead.rating ? `${lead.rating}/5 (${lead.review_count || 0})` : null} />
          <DetailCard icon={<Tag size={13} />} label="Categoria" value={lead.category} />
          <DetailCard icon={<MapPin size={13} />} label="Cidade" value={lead.city} />
        </div>
        {lead.google_maps_link && lead.google_maps_link !== "-" && (
          <a href={lead.google_maps_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline bg-muted/50 rounded-lg px-3 py-2 mt-2 transition-colors hover:bg-muted">
            <Map size={14} />
            Ver no Google Maps
            <ExternalLink size={12} className="ml-auto opacity-50" />
          </a>
        )}

        {/* Social Media Links */}
        {(() => {
          const socialLinks: { url: string; platform: string }[] = [];
          
          // Extract from enrichment_data.scoring_inputs.redes_sociais (most reliable)
          const enrichSocials = lead.enrichment_data?.scoring_inputs?.redes_sociais;
          if (Array.isArray(enrichSocials)) {
            enrichSocials.forEach((s: any) => {
              if (s?.url && s?.platform) socialLinks.push({ url: s.url, platform: s.platform });
            });
          }
          
          // Fallback: extract from social_media field
          if (socialLinks.length === 0 && lead.social_media) {
            const sm = lead.social_media;
            if (Array.isArray(sm)) {
              sm.forEach((item: any) => {
                const url = typeof item === 'string' ? item : item?.url || item?.link;
                if (url) {
                  const host = (() => { try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.toLowerCase(); } catch { return ''; } })();
                  const platform = host.includes('instagram') ? 'Instagram' : host.includes('facebook') ? 'Facebook' : host.includes('linkedin') ? 'LinkedIn' : host.includes('youtube') ? 'YouTube' : host.includes('tiktok') ? 'TikTok' : 'Rede Social';
                  socialLinks.push({ url: url.startsWith('http') ? url : `https://${url}`, platform });
                }
              });
            } else if (typeof sm === 'object') {
              Object.values(sm).forEach((val: any) => {
                const url = typeof val === 'string' ? val : val?.url;
                if (url) {
                  const host = (() => { try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.toLowerCase(); } catch { return ''; } })();
                  const platform = host.includes('instagram') ? 'Instagram' : host.includes('facebook') ? 'Facebook' : host.includes('linkedin') ? 'LinkedIn' : host.includes('youtube') ? 'YouTube' : host.includes('tiktok') ? 'TikTok' : 'Rede Social';
                  socialLinks.push({ url: url.startsWith('http') ? url : `https://${url}`, platform });
                }
              });
            }
          }

          // Also check if website is actually a social link
          if (socialLinks.length === 0 && lead.website && lead.website !== '-') {
            const host = (() => { try { return new URL(lead.website.startsWith('http') ? lead.website : `https://${lead.website}`).hostname.toLowerCase(); } catch { return ''; } })();
            if (host.includes('instagram') || host.includes('facebook')) {
              const platform = host.includes('instagram') ? 'Instagram' : 'Facebook';
              socialLinks.push({ url: lead.website.startsWith('http') ? lead.website : `https://${lead.website}`, platform });
            }
          }

          if (socialLinks.length === 0) return null;

          const getPlatformIcon = (platform: string) => {
            switch (platform) {
              case 'Instagram': return '📸';
              case 'Facebook': return '📘';
              case 'LinkedIn': return '💼';
              case 'YouTube': return '▶️';
              case 'TikTok': return '🎵';
              default: return '🌐';
            }
          };

          return (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Globe size={14} className="text-primary" />
                Redes Sociais
              </h4>
              <div className="space-y-2">
                {socialLinks.map((link, idx) => (
                  <a 
                    key={idx} 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-2 text-sm text-primary hover:underline bg-muted/50 rounded-lg px-3 py-2 transition-colors hover:bg-muted"
                  >
                    <span>{getPlatformIcon(link.platform)}</span>
                    {link.platform}
                    <ExternalLink size={12} className="ml-auto opacity-50" />
                  </a>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">Clique para analisar o perfil diretamente</p>
            </div>
          );
        })()}
      </div>

      {/* Análises colapsáveis */}
      <CollapsibleAnalysis icon={<Globe size={14} className="text-primary" />} title="Análise de Redes Sociais" content={lead.enrichment_data?.analise_redes_sociais} />
      <CollapsibleAnalysis icon={<Globe size={14} className="text-primary" />} title="Análise do Site" content={lead.enrichment_data?.analise_site} />
      <CollapsibleAnalysis icon={<Target size={14} className="text-primary" />} title="Concorrência Regional (raio de 5km)" content={lead.enrichment_data?.analise_concorrencia_regional} />
      <CollapsibleAnalysis icon={<MapPin size={14} className="text-primary" />} title="Demanda Regional" content={lead.enrichment_data?.analise_demanda_regional} />

      {/* Market Analysis - each item as collapsible */}
      {lead.enrichment_data?.approach_analysis && (
        <>
          <CollapsibleAnalysis icon={<Target size={14} className="text-primary" />} title="Análise de Nicho" content={lead.enrichment_data.approach_analysis.analise_nicho} />
          <CollapsibleAnalysis icon={<MapPin size={14} className="text-primary" />} title="Análise da Cidade" content={lead.enrichment_data.approach_analysis.analise_cidade} />
          <CollapsibleAnalysis icon={<Sparkles size={14} className="text-primary" />} title="Estratégia" content={lead.enrichment_data.approach_analysis.estrategia} />
        </>
      )}

      {/* Approach Message Card */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare size={14} className="text-primary" />
          Mensagem de Abordagem
        </h4>
        {lead.ai_approach_message ? (
          editingMessage ? (
            <div className="space-y-2">
              <Textarea
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                rows={6}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => saveEditedMessage(lead)} className="gap-1">
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
                {lead.ai_approach_message}
              </p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => copyMessage(lead.ai_approach_message!, lead.id)} className="gap-1.5 text-xs">
                  {copiedId === lead.id ? <Check size={12} /> : <Copy size={12} />}
                  {copiedId === lead.id ? "Copiada" : "Copiar"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setEditedMessage(lead.ai_approach_message || ""); setEditingMessage(true); }} className="gap-1.5 text-xs">
                  <Pencil size={12} /> Editar
                </Button>
              </div>
            </div>
          )
        ) : (
          <p className="text-sm text-muted-foreground italic py-2">Nenhuma mensagem gerada ainda. Clique em "Gerar abordagem personalizada com IA" para gerar.</p>
        )}
      </div>

          {/* Action buttons */}
      <div className="flex flex-col gap-2 pt-1">
        {!lead.ai_approach_message && (
          <Button
            onClick={() => approachLead(lead)}
            disabled={approachingLeadId === lead.id}
            className="w-full gap-2"
          >
            {approachingLeadId === lead.id ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Gerar abordagem personalizada com IA
          </Button>
        )}
        {lead.ai_approach_message && !lead.first_message_sent && (
          <Button
            onClick={() => {
              setSelectedLead(null);
              setTimeout(() => { setSendingLead(lead); setSendDialogOpen(true); }, 150);
            }}
            disabled={sendCooldown > 0}
            className="w-full gap-2 bg-[#25D366] hover:bg-[#1da851] text-white"
          >
            {sendCooldown > 0 ? (
              <>
                <Clock size={16} />
                {sendCooldown}s
              </>
            ) : (
              <>
                <Send size={16} />
                Enviar via WhatsApp
              </>
            )}
          </Button>
        )}
        {lead.first_message_sent && (
          <Badge variant="outline" className="flex items-center justify-center gap-1 text-primary border-primary/30 px-3 py-2 w-full">
            <Send size={12} />
            Enviado
          </Badge>
        )}
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
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold">Gestão de Oportunidades</h1>
                  <p className="text-muted-foreground mt-1">Qualifique e aborde suas oportunidades com IA</p>
                </div>
                {companyProfile && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => setShowNumbersManager(true)}
                    >
                      <Wifi size={14} />
                      Gerenciar Números
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => setShowOnboarding(true)}
                    >
                      <Settings size={14} />
                      Editar Perfil
                    </Button>
                  </div>
                )}
              </div>

              {/* Batch scoring progress */}
              {batchScoring && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-primary" />
                      <span className="text-sm font-medium">Analisando leads com IA...</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{batchProgress}/{batchTotal}</span>
                  </div>
                  <Progress value={(batchProgress / batchTotal) * 100} className="h-2" />
                  <p className="text-xs text-muted-foreground">Qualificando: {batchCurrentName}</p>
                </div>
              )}

              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    label: "Total",
                    value: stats.total,
                    icon: <Target size={18} />,
                    accent: "from-primary/15 to-primary/5",
                    iconBg: "bg-primary/10 text-primary",
                    border: "border-primary/10",
                  },
                  {
                    label: "Qualificados",
                    value: stats.scored,
                    icon: <Sparkles size={18} />,
                    accent: "from-blue-500/15 to-blue-500/5",
                    iconBg: "bg-blue-500/10 text-blue-400",
                    border: "border-blue-500/10",
                  },
                  {
                    label: "Alta Oportunidade",
                    value: stats.highOpp,
                    icon: <TrendingUp size={18} />,
                    accent: "from-emerald-500/15 to-emerald-500/5",
                    iconBg: "bg-emerald-500/10 text-emerald-400",
                    border: "border-emerald-500/10",
                  },
                  {
                    label: "Score Médio",
                    value: stats.avgScore,
                    icon: <BarChart3 size={18} />,
                    accent: "from-amber-500/15 to-amber-500/5",
                    iconBg: "bg-amber-500/10 text-amber-400",
                    border: "border-amber-500/10",
                    extra: (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="ml-auto p-0.5 rounded-md hover:bg-muted/80 transition-colors">
                            <Info size={13} className="text-muted-foreground/60" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent side="bottom" align="end" className="w-80">
                          {scoreInfoContent}
                        </PopoverContent>
                      </Popover>
                    ),
                  },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className={`relative overflow-hidden rounded-xl border ${kpi.border} bg-gradient-to-br ${kpi.accent} backdrop-blur-sm p-4 transition-all hover:shadow-md hover:shadow-black/5`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${kpi.iconBg}`}>
                        {kpi.icon}
                      </div>
                      {(kpi as any).extra || null}
                    </div>
                    <div>
                      {loading ? (
                        <Skeleton className="h-8 w-16 mb-1" />
                      ) : (
                        <p className="text-2xl font-bold tracking-tight text-foreground">{kpi.value}</p>
                      )}
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">{kpi.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Filters */}
              {(() => {
                const activeFilterCount = [
                  filterLevel !== "all",
                  !!minScore,
                  !!minRating,
                  onlyHighOpp,
                  sortOrder !== "default",
                  filterCategory !== "all",
                  filterCity !== "all",
                ].filter(Boolean).length;

                return (
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
                    <Button
                      variant="outline"
                      className="gap-2 overflow-visible"
                      onClick={() => setShowFilters(true)}
                    >
                      <SlidersHorizontal size={16} />
                      Filtros
                      {activeFilterCount > 0 && (
                        <Badge className="ml-1 h-5 min-w-5 px-1.5 text-[10px] font-bold rounded-full bg-primary text-primary-foreground">
                          {activeFilterCount}
                        </Badge>
                      )}
                    </Button>
                  </div>
                );
              })()}

              {/* Filter Dialog */}
              <Dialog open={showFilters} onOpenChange={setShowFilters}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <SlidersHorizontal size={18} />
                      Filtros Avançados
                    </DialogTitle>
                    <DialogDescription>Configure os filtros para refinar suas oportunidades</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-5 pt-2">
                    {/* Ordenação */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ordenar por</label>
                      <Select value={sortOrder} onValueChange={(v: any) => { setSortOrder(v); setCurrentPage(1); }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Ordenar por" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Mais recentes</SelectItem>
                          <SelectItem value="score_desc">Maior score</SelectItem>
                          <SelectItem value="score_asc">Menor score</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Intenção */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Intenção</label>
                      <Select value={filterLevel} onValueChange={(v) => { setFilterLevel(v); setCurrentPage(1); }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="Alta">Alta</SelectItem>
                          <SelectItem value="Média">Média</SelectItem>
                          <SelectItem value="Baixa">Baixa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Categoria */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Categoria</label>
                      <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setCurrentPage(1); }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todas categorias" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas categorias</SelectItem>
                          {uniqueCategories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Cidade */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Cidade</label>
                      <Select value={filterCity} onValueChange={(v) => { setFilterCity(v); setCurrentPage(1); }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todas cidades" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas cidades</SelectItem>
                          {uniqueCities.map(city => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Score e Avaliação */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Score mínimo</label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          placeholder="0"
                          value={minScore}
                          onChange={(e) => { setMinScore(e.target.value); setCurrentPage(1); }}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Avaliação mínima</label>
                        <Input
                          type="number"
                          min={0}
                          max={5}
                          step={0.1}
                          placeholder="0"
                          value={minRating}
                          onChange={(e) => { setMinRating(e.target.value); setCurrentPage(1); }}
                        />
                      </div>
                    </div>

                    {/* Alta Oportunidade toggle */}
                    <Button
                      variant={onlyHighOpp ? "default" : "outline"}
                      className="w-full gap-2"
                      onClick={() => { setOnlyHighOpp(!onlyHighOpp); setCurrentPage(1); }}
                    >
                      <TrendingUp size={16} />
                      {onlyHighOpp ? "Alta Oportunidade ativado" : "Somente Alta Oportunidade (≥70)"}
                    </Button>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2 border-t border-border">
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => { setMinScore(""); setMinRating(""); setOnlyHighOpp(false); setFilterLevel("all"); setSortOrder("default"); setFilterCategory("all"); setFilterCity("all"); setCurrentPage(1); }}
                      >
                        Limpar tudo
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Table */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead><div className="flex items-center gap-1.5"><Building2 size={14} />Empresa</div></TableHead>
                      <TableHead><div className="flex items-center gap-1.5"><Tag size={14} />Categoria</div></TableHead>
                      <TableHead><div className="flex items-center gap-1.5"><MapPin size={14} />Cidade</div></TableHead>
                      <TableHead className="text-center"><div className="flex items-center justify-center gap-1.5"><Star size={14} />Avaliação</div></TableHead>
                      <TableHead className="text-center"><div className="flex items-center justify-center gap-1.5 whitespace-nowrap"><BarChart3 size={14} />Índ. Fech.</div></TableHead>
                      <TableHead className="text-center"><div className="flex items-center justify-center gap-1.5"><TrendingUp size={14} />Intenção</div></TableHead>
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
                      paginatedLeads.map(lead => (
                        <TableRow
                          key={lead.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => { setSelectedLead(lead); setPopupTab("dados"); setEditingMessage(false); }}
                        >
                          <TableCell className="font-medium max-w-[220px]">
                            <span className="truncate block whitespace-nowrap" title={lead.company_name || "Sem nome"}>
                              {lead.company_name || "Sem nome"}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{lead.category || "-"}</TableCell>
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
                          <TableCell className="text-center">
                            {batchScoring && (lead.ai_score == null || lead.ai_score === 0) ? (
                              <Loader2 size={14} className="animate-spin text-muted-foreground mx-auto" />
                            ) : (
                              getScoreBadge(lead.ai_score)
                            )}
                          </TableCell>
                          <TableCell className="text-center">{getLevelBadge(lead.opportunity_level, lead.ai_score)}</TableCell>
                          <TableCell className="text-center">
                            {lead.first_message_sent ? (
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs gap-1">
                                <Send size={10} />
                                Enviado
                              </Badge>
                            ) : sendingLead?.id === lead.id ? (
                              <Badge variant="outline" className="text-xs gap-1 text-amber-400 border-amber-400/30 animate-pulse">
                                <Loader2 size={10} className="animate-spin" />
                                Enviando...
                              </Badge>
                            ) : lead.ai_approach_message ? (
                              <div className="flex items-center justify-center gap-1">
                                <Badge variant="outline" className="text-xs gap-1 text-blue-400 border-blue-400/30">
                                  <MessageSquare size={10} />
                                  Msg Gerada
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  title={sendCooldown > 0 ? `Aguarde ${sendCooldown}s` : "Enviar mensagem"}
                                  disabled={sendCooldown > 0}
                                  onClick={(e) => { e.stopPropagation(); setSendingLead(lead); setSendDialogOpen(true); }}
                                >
                                  {sendCooldown > 0 ? (
                                    <Clock size={12} className="text-muted-foreground" />
                                  ) : (
                                    <Send size={12} className="text-primary" />
                                  )}
                                </Button>
                              </div>
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
                                onClick={e => e.stopPropagation()}
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
                  <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                    <ChevronLeft size={16} />
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page: number;
                    if (totalPages <= 5) page = i + 1;
                    else if (currentPage <= 3) page = i + 1;
                    else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                    else page = currentPage - 2 + i;
                    return (
                      <Button key={page} size="sm" variant={page === currentPage ? "default" : "outline"} onClick={() => setCurrentPage(page)} className="w-8 h-8 p-0">
                        {page}
                      </Button>
                    );
                  })}
                  <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Lead Detail Dialog with Tabs */}
      <Dialog open={!!selectedLead} onOpenChange={open => { if (!open) { setSelectedLead(null); setEditingMessage(false); } }}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] p-0 gap-0 bg-background overflow-hidden"
          onWheelCapture={(e) => {
            const scrollArea = document.getElementById("lead-detail-scroll-area");
            if (!scrollArea) return;

            e.preventDefault();
            scrollArea.scrollBy({ top: e.deltaY });
          }}
        >
          {selectedLead && (
            <div className="flex flex-col max-h-[90vh]">
              {/* Header - fixed */}
              <div className="p-5 pb-4 border-b border-border shrink-0">
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
                    {getLevelBadge(selectedLead.opportunity_level, selectedLead.ai_score)}
                    {selectedLead.ai_score != null && selectedLead.ai_score > 0 && getScoreBadge(selectedLead.ai_score)}
                  </DialogDescription>
                </DialogHeader>

                {/* Tab Switcher */}
                <div className="flex gap-1 mt-4 bg-muted/50 rounded-lg p-1">
                  <button
                    onClick={() => setPopupTab("dados")}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${popupTab === "dados" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Eye size={14} />
                    Dados do Lead
                  </button>
                  <button
                    onClick={() => setPopupTab("score")}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${popupTab === "score" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <BarChart3 size={14} />
                    Score & Análise
                  </button>
                </div>
              </div>

              {/* Content - scrollable */}
              <div id="lead-detail-scroll-area" className="p-5 overflow-y-auto overscroll-contain flex-1">
                {popupTab === "score" ? renderScoreBreakdown(selectedLead) : renderLeadData(selectedLead)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Company Profile Onboarding */}
      {user && (
        <CompanyProfileOnboarding
          open={showOnboarding}
          userId={user.id}
          initialData={companyProfile}
          onClose={() => setShowOnboarding(false)}
          onComplete={(profile) => {
            setCompanyProfile(profile);
            setShowOnboarding(false);
          }}
        />
      )}

      {/* Send Message Dialog */}
      {sendingLead && user && (
        <SendMessageDialog
          open={!!sendingLead && sendDialogOpen}
          onOpenChange={(open) => { if (!open) setSendDialogOpen(false); }}
          leadId={sendingLead.id}
          leadPhone={sendingLead.phone}
          leadName={sendingLead.company_name || "Lead"}
          leadData={{
            company_name: sendingLead.company_name,
            category: sendingLead.category,
            city: sendingLead.city,
            address: sendingLead.address,
            website: sendingLead.website,
            rating: sendingLead.rating,
            review_count: sendingLead.review_count,
            ai_score: sendingLead.ai_score,
            social_media: sendingLead.social_media,
            phone_numbers: sendingLead.phone_numbers,
          }}
          message={sendingLead.ai_approach_message || ""}
          userId={user.id}
          availableNumbers={numbers}
          onSent={() => {
            setSendCooldown(120);
            setLeads(prev => prev.map(l => l.id === sendingLead.id ? { ...l, first_message_sent: true } : l));
            if (selectedLead?.id === sendingLead.id) {
              setSelectedLead({ ...selectedLead, first_message_sent: true });
            }
            setSendingLead(null);
            setSendDialogOpen(true);
          }}
          onRequestConnect={() => { setSendingLead(null); setSendDialogOpen(true); setShowNumbersManager(true); }}
        />
      )}

      {/* Numbers Manager Dialog */}
      {showNumbersManager && (
        <NumbersManager
          numbers={numbers}
          onNumbersChange={() => { void fetchNumbers(); }}
          maxNumbers={maxNumbers}
          onConnect={() => { void fetchNumbers(); }}
          forceOpen={true}
          onClose={() => setShowNumbersManager(false)}
        />
      )}
    </SidebarProvider>
  );
}

function DetailCard({ icon, label, value, isLink }: { icon: React.ReactNode; label: string; value: string | number | null | undefined; isLink?: boolean }) {
  if (!value || value === "-") return null;
  return (
    <div className="bg-muted/40 border border-border/50 rounded-lg p-2.5 space-y-1">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">{icon}{label}</div>
      {isLink && typeof value === "string" ? (
        <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate block">
          {value}
        </a>
      ) : (
        <p className="text-sm truncate font-medium">{value}</p>
      )}
    </div>
  );
}

function CollapsibleAnalysis({ icon, title, content }: { icon: React.ReactNode; title: string; content: string | null | undefined }) {
  const [open, setOpen] = useState(false);
  if (!content) return null;
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 transition-colors"
      >
        <h4 className="text-sm font-semibold flex items-center gap-2">
          {icon}
          {title}
        </h4>
        {open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border/50 pt-3">
          <p className="text-xs text-muted-foreground leading-relaxed">{content}</p>
        </div>
      )}
    </div>
  );
}
