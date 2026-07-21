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
  Settings, Wifi, ChevronDown, ChevronUp, Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyProfileOnboarding } from "@/components/opportunities/CompanyProfileOnboarding";
import { IdealAudienceMismatchBanner } from "@/components/opportunities/IdealAudienceMismatchBanner";
import { SendMessageDialog } from "@/components/opportunities/SendMessageDialog";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import { useAutoScoreTracking } from "@/hooks/useAutoScoreTracking";
import { buildTourDemoLead } from "@/lib/tourDemoLead";
import { buildTourFillerLeads } from "@/lib/tourDemoCockpit";
import { useAccountRole } from "@/hooks/useAccountRole";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import { CRMResponsibleFilter, type ResponsibleFilter } from "@/components/crm/CRMResponsibleFilter";
import { OpportunityBulkBar } from "@/components/opportunities/OpportunityBulkBar";
import { Checkbox } from "@/components/ui/checkbox";

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
  responsible_user_id: string | null;
  archived_at: string | null;
}

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 60] as const;

// Ícone de "enviar" (paper plane) branco, usado no botão verde de envio manual
const WhatsAppIcon = ({ size = 18 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);




export default function OpportunitiesManagement() {
  const { profile, user, accountOwnerId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  useAutoScoreTracking("opportunities_management");
  const { role } = useAccountRole();
  const { members: accountMembers } = useAccountMembers();
  const canChangeResponsible = role === "owner" || role === "admin";
  const responsibleMembers = useMemo(
    () => accountMembers.map((m) => ({ user_id: m.user_id, name: m.name, email: m.email, avatar_url: m.avatar_url })),
    [accountMembers]
  );

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
  const [pageSize, setPageSize] = useState<number>(20);
  const [responsibleFilter, setResponsibleFilter] = useState<ResponsibleFilter>("me");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedLead, setSelectedLead] = useState<OpportunityLead | null>(null);
  const [popupTab, setPopupTab] = useState<"score" | "dados">("dados");
  const [scoring, setScoring] = useState(false);
  const [scoringLeadId, setScoringLeadId] = useState<string | null>(null);
  const [approachingLeadId, setApproachingLeadId] = useState<string | null>(null);
  const [approachingMode, setApproachingMode] = useState<"manual" | "meta">("manual");
  const [editingMessage, setEditingMessage] = useState(false);
  const [editedMessage, setEditedMessage] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // Toggle da aba de mensagem: manual (envio 1º contato) vs meta (follow-up após template)
  const [messageMode, setMessageMode] = useState<"manual" | "meta">("manual");
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


  // Dual scroll refs for table
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const tableContentRef = useRef<HTMLDivElement>(null);

  const syncTopScroll = () => {
    if (topScrollRef.current && bottomScrollRef.current) {
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    }
  };
  const syncBottomScroll = () => {
    if (topScrollRef.current && bottomScrollRef.current) {
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };


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
        .eq("owner_user_id", accountOwnerId)
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
        .select("id, company_name, phone, category, city, website, google_maps_link, address, rating, review_count, ai_score, opportunity_level, closing_probability, ai_diagnosis, ai_recommended_action, ai_approach_message, social_media, phone_numbers, enrichment_data, created_at, origin, first_message_sent, whatsapp_number_id, responsible_user_id, archived_at")
        .eq("owner_user_id", accountOwnerId)
        .in("origin", ["oportunidades", "prospeccao"])
        .is("archived_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeads((data as OpportunityLead[]) || []);
    } catch (err) {
      console.error("Error fetching leads:", err);
    } finally {
      setLoading(false);
    }
  };

  // Realtime — refetch on any account-scoped lead change (throttled)
  useEffect(() => {
    if (!user) return;
    let pending = false;
    let timer: any = null;
    const scheduleRefetch = () => {
      if (pending) return;
      pending = true;
      timer = setTimeout(() => { pending = false; fetchLeads(); }, 1500);
    };
    const channel = supabase
      .channel(`opps-leads-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        () => { scheduleRefetch(); }
      )
      .subscribe();
    return () => { if (timer) clearTimeout(timer); supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);


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

  const approachLead = async (lead: OpportunityLead, mode: "manual" | "meta" = "meta") => {
    setApproachingLeadId(lead.id);
    setApproachingMode(mode);
    try {
      const fnName = mode === "manual" ? "approach-lead-manual" : "approach-lead";
      const { data, error } = await supabase.functions.invoke(fnName, {
        body: { lead_id: lead.id },
      });
      if (error) throw error;
      toast({ title: "Mensagem gerada!", description: mode === "manual" ? "Mensagem de primeiro contato criada" : "Mensagem de follow-up criada" });

      let updatedLead: OpportunityLead;
      if (mode === "manual") {
        updatedLead = {
          ...lead,
          enrichment_data: {
            ...(lead.enrichment_data || {}),
            manual_approach: {
              message: data.mensagem,
              estrategia: data.estrategia,
              gancho: data.gancho,
              insight: data.insight,
              generated_at: new Date().toISOString(),
            },
          },
        };
      } else {
        updatedLead = {
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
      }
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
      if (messageMode === "manual") {
        const newEnrichment = {
          ...(lead.enrichment_data || {}),
          manual_approach: {
            ...((lead.enrichment_data?.manual_approach) || {}),
            message: editedMessage,
          },
        };
        const { error } = await supabase
          .from("leads")
          .update({ enrichment_data: newEnrichment } as any)
          .eq("id", lead.id);
        if (error) throw error;
        const updated = { ...lead, enrichment_data: newEnrichment };
        setLeads(prev => prev.map(l => l.id === lead.id ? updated : l));
        if (selectedLead?.id === lead.id) setSelectedLead(updated);
      } else {
        const { error } = await supabase
          .from("leads")
          .update({ ai_approach_message: editedMessage } as any)
          .eq("id", lead.id);
        if (error) throw error;
        const updated = { ...lead, ai_approach_message: editedMessage };
        setLeads(prev => prev.map(l => l.id === lead.id ? updated : l));
        if (selectedLead?.id === lead.id) setSelectedLead(updated);
      }
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

  // Normaliza telefone para wa.me (só dígitos, garantindo DDI 55 quando faltar)
  const normalizePhoneForWa = (raw: string | null | undefined): string => {
    const digits = (raw || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("55")) return digits;
    // Brasil: 10 ou 11 dígitos -> prefixa 55
    if (digits.length === 10 || digits.length === 11) return "55" + digits;
    return digits;
  };

  // Abre WhatsApp Web ou App reutilizando SEMPRE a mesma aba (target nomeado)
  const openWhatsApp = (lead: OpportunityLead, message: string, target: "web" | "app") => {
    const phone = normalizePhoneForWa(lead.phone);
    if (!phone) {
      toast({ title: "Telefone inválido", description: "Não foi possível abrir o WhatsApp para este lead.", variant: "destructive" });
      return;
    }
    const encoded = encodeURIComponent(message || "");
    const url = target === "web"
      ? `https://web.whatsapp.com/send?phone=${phone}&text=${encoded}`
      : `https://api.whatsapp.com/send?phone=${phone}&text=${encoded}`; // abre o app nativo (mobile) ou o desktop se instalado
    window.open(url, "wiize_wa_send");
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
    if (responsibleFilter === "me") {
      result = result.filter(l => l.responsible_user_id === user?.id);
    } else if (responsibleFilter !== "all") {
      result = result.filter(l => l.responsible_user_id === responsibleFilter);
    }
    if (sortOrder === "score_desc") {
      result = [...result].sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0));
    } else if (sortOrder === "score_asc") {
      result = [...result].sort((a, b) => (a.ai_score ?? 0) - (b.ai_score ?? 0));
    } else {
      // Ordem padrão estável: created_at desc, com id como desempate para nunca reordenar
      // ao atualizar enrichment_data (evita "lead sumir" ao fechar popup).
      result = [...result].sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (db !== da) return db - da;
        return String(b.id).localeCompare(String(a.id));
      });
    }
    return result;
  }, [leads, searchTerm, filterLevel, minScore, minRating, onlyHighOpp, sortOrder, filterCategory, filterCity, responsibleFilter, user?.id]);

  // Bulk actions handlers
  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAllVisible = () => setSelectedIds(new Set(paginatedLeadsIds()));
  const paginatedLeadsIds = (): string[] => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize).map(l => l.id).filter(id => !String(id).startsWith("__tour_"));
  };
  const clearSelection = () => setSelectedIds(new Set());

  const bulkAssign = async (responsibleUserId: string | null) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from("leads")
      .update({ responsible_user_id: responsibleUserId })
      .in("id", ids);
    if (error) {
      console.error(error);
      toast({ title: "Erro ao transferir", description: error.message, variant: "destructive" });
      return;
    }
    setLeads(prev => prev.map(l => ids.includes(l.id) ? { ...l, responsible_user_id: responsibleUserId } : l));
    toast({ title: "Responsável atualizado", description: `${ids.length} lead(s) transferido(s).` });
    clearSelection();
  };

  const assignSingle = async (leadId: string, responsibleUserId: string | null) => {
    const { error } = await supabase
      .from("leads")
      .update({ responsible_user_id: responsibleUserId })
      .eq("id", leadId);
    if (error) {
      console.error(error);
      toast({ title: "Erro ao atualizar responsável", description: error.message, variant: "destructive" });
      return;
    }
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, responsible_user_id: responsibleUserId } : l));
    const m = responsibleMembers.find(x => x.user_id === responsibleUserId);
    toast({ title: "Responsável atualizado", description: responsibleUserId ? `Atribuído a ${m?.name || m?.email || "membro"}.` : "Removido." });
  };

  const bulkArchive = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from("leads")
      .update({ archived_at: new Date().toISOString() })
      .in("id", ids);
    if (error) {
      console.error(error);
      toast({ title: "Erro ao arquivar", description: error.message, variant: "destructive" });
      return;
    }
    setLeads(prev => prev.filter(l => !ids.includes(l.id)));
    toast({ title: "Arquivado", description: `${ids.length} lead(s) arquivado(s).` });
    clearSelection();
  };

  const bulkMarkSent = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from("leads")
      .update({ first_message_sent: true } as any)
      .in("id", ids);
    if (error) {
      console.error(error);
      toast({ title: "Erro ao marcar", description: error.message, variant: "destructive" });
      return;
    }
    setLeads(prev => prev.map(l => ids.includes(l.id) ? { ...l, first_message_sent: true } : l));
    toast({ title: "Marcado como enviado", description: `${ids.length} lead(s) atualizado(s).` });
    clearSelection();
  };


  // Tour demo lead injection (synthetic, never persisted)
  const [tourDemoActive, setTourDemoActive] = useState(
    typeof document !== "undefined" && document.body.classList.contains("tour-demo-lead")
  );
  useEffect(() => {
    const update = () => setTourDemoActive(document.body.classList.contains("tour-demo-lead"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (tourDemoActive) {
      setCurrentPage(1);
    }
  }, [tourDemoActive]);

  const displayLeads = useMemo(() => {
    if (!tourDemoActive) return filteredLeads;
    const hasDemo = filteredLeads.some((l) => l.id === "__tour_demo_lead__");
    const base = hasDemo ? filteredLeads : [buildTourDemoLead() as any, ...filteredLeads];
    // If the user's real list is empty, also pad with filler leads so the
    // Gestão page never looks empty during the tour.
    const realCount = filteredLeads.filter((l) => !String(l.id).startsWith("__tour_")).length;
    if (realCount === 0) {
      return [...base, ...buildTourFillerLeads()];
    }
    return base;
  }, [filteredLeads, tourDemoActive]);

  const totalPages = Math.max(1, Math.ceil(displayLeads.length / pageSize));
  const paginatedLeads = displayLeads.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    const updateWidth = () => {
      if (bottomScrollRef.current && tableContentRef.current) {
        tableContentRef.current.style.width = `${bottomScrollRef.current.scrollWidth}px`;
      }
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    if (bottomScrollRef.current) ro.observe(bottomScrollRef.current);
    window.addEventListener('resize', updateWidth);
    return () => { ro.disconnect(); window.removeEventListener('resize', updateWidth); };
  }, [filteredLeads.length, paginatedLeads.length]);

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
        .eq('owner_user_id', accountOwnerId);

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
        <div data-tour="lead-score-summary" className="space-y-4">
          {/* Score Principal */}
          <div data-tour="lead-score-hero" className="bg-primary/5 border border-primary/20 rounded-xl p-5 text-center">
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
            <div data-tour="lead-score-breakdown" className="bg-card border border-border rounded-xl p-4 space-y-4">
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
        </div>

        {/* Análises detalhadas do score */}
        <CollapsibleAnalysis icon={<Globe size={14} className="text-primary" />} title="Análise de Redes Sociais" content={lead.enrichment_data?.analise_redes_sociais} />
        <CollapsibleAnalysis icon={<Globe size={14} className="text-primary" />} title="Análise do Site" content={lead.enrichment_data?.analise_site} />
        <CollapsibleAnalysis icon={<Target size={14} className="text-primary" />} title="Concorrência Regional (raio de 5km)" content={lead.enrichment_data?.analise_concorrencia_regional} />
        <CollapsibleAnalysis icon={<MapPin size={14} className="text-primary" />} title="Demanda Regional" content={lead.enrichment_data?.analise_demanda_regional} />

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


      {/* Market Analysis - each item as collapsible */}
      {lead.enrichment_data?.approach_analysis && (
        <>
          <CollapsibleAnalysis icon={<Target size={14} className="text-primary" />} title="Análise de Nicho" content={lead.enrichment_data.approach_analysis.analise_nicho} />
          <CollapsibleAnalysis icon={<MapPin size={14} className="text-primary" />} title="Análise da Cidade" content={lead.enrichment_data.approach_analysis.analise_cidade} />
          <CollapsibleAnalysis icon={<Sparkles size={14} className="text-primary" />} title="Estratégia" content={lead.enrichment_data.approach_analysis.estrategia} />
        </>
      )}

      {/* Approach Message Card com toggle Manual / Meta API */}
      <div data-tour="lead-approach-card" className="bg-card border border-border rounded-xl p-4 space-y-3">
        {/* Toggle segmentado full-width */}
        <div className="w-full bg-muted/50 p-1 rounded-full flex items-center gap-1">
          <button
            type="button"
            onClick={() => { setMessageMode("manual"); setEditingMessage(false); }}
            className={`flex-1 text-xs sm:text-sm font-medium py-2 rounded-full transition-all ${
              messageMode === "manual"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Mensagem para envio manual
          </button>
          <button
            type="button"
            onClick={() => { setMessageMode("meta"); setEditingMessage(false); }}
            className={`flex-1 text-xs sm:text-sm font-medium py-2 rounded-full transition-all ${
              messageMode === "meta"
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Follow-up p/ Meta API
          </button>
        </div>

        {messageMode === "manual" ? (
          <>
            <div className="space-y-1.5">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare size={14} className="text-primary" />
                Mensagem de Primeiro Contato (envio manual)
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                📩 Copy pensada para <strong>o PRIMEIRO envio manual</strong> (WhatsApp, e-mail, etc.). O objetivo é gerar
                desejo nos primeiros segundos, com gancho forte, insight consultivo e baixa pressão — evitando ser
                descartada por donos ocupados.
              </p>
            </div>
            {lead.enrichment_data?.manual_approach?.message ? (
              editingMessage ? (
                <div className="space-y-2">
                  <Textarea value={editedMessage} onChange={(e) => setEditedMessage(e.target.value)} rows={8} className="text-sm" />
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
                    {lead.enrichment_data.manual_approach.message}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button size="sm" className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                          <Send size={12} /> Enviar via WhatsApp
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-56 p-2">
                        <p className="text-xs text-muted-foreground px-2 pt-1 pb-2">Abrir conversa com a mensagem já escrita:</p>
                        <button
                          type="button"
                          onClick={() => openWhatsApp(lead, lead.enrichment_data.manual_approach.message, "web")}
                          className="w-full text-left px-2 py-2 rounded-md hover:bg-muted text-sm flex items-center gap-2"
                        >
                          <Globe size={14} className="text-emerald-500" />
                          WhatsApp Web
                        </button>
                        <button
                          type="button"
                          onClick={() => openWhatsApp(lead, lead.enrichment_data.manual_approach.message, "app")}
                          className="w-full text-left px-2 py-2 rounded-md hover:bg-muted text-sm flex items-center gap-2"
                        >
                          <MessageSquare size={14} className="text-emerald-500" />
                          Aplicativo (Desktop/Celular)
                        </button>
                      </PopoverContent>
                    </Popover>
                    <Button size="sm" variant="outline" onClick={() => copyMessage(lead.enrichment_data.manual_approach.message, lead.id)} className="gap-1.5 text-xs">
                      {copiedId === lead.id ? <Check size={12} /> : <Copy size={12} />}
                      {copiedId === lead.id ? "Copiada" : "Copiar"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditedMessage(lead.enrichment_data.manual_approach.message || ""); setEditingMessage(true); }} className="gap-1.5 text-xs">
                      <Pencil size={12} /> Editar
                    </Button>
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground italic py-2">
                  Nenhuma mensagem manual gerada ainda. Quer criar uma copy de primeiro contato de alta conversão para este lead?
                </p>
                <Button
                  onClick={() => approachLead(lead, "manual")}
                  disabled={approachingLeadId === lead.id}
                  className="w-full gap-2"
                >
                  {approachingLeadId === lead.id && approachingMode === "manual" ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Gerar mensagem manual com IA
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="space-y-1.5">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare size={14} className="text-primary" />
                Mensagem de Follow-up (pós-resposta do template)
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                ⚡ <strong>Importante:</strong> esta <strong>NÃO</strong> é a mensagem fria — o primeiro contato é feito por um <strong>template oficial da Meta</strong>.
                <br />
                Esta é a <strong>resposta humana e consultiva</strong> enviada <strong>depois que o lead respondeu "sim/pode/quero saber"</strong> ao template, já com a janela de 24h aberta.
              </p>
            </div>
            {lead.ai_approach_message ? (
              editingMessage ? (
                <div className="space-y-2">
                  <Textarea value={editedMessage} onChange={(e) => setEditedMessage(e.target.value)} rows={6} className="text-sm" />
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
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={() => copyMessage(lead.ai_approach_message!, lead.id)} className="gap-1.5 text-xs">
                      {copiedId === lead.id ? <Check size={12} /> : <Copy size={12} />}
                      {copiedId === lead.id ? "Copiada" : "Copiar"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditedMessage(lead.ai_approach_message || ""); setEditingMessage(true); }} className="gap-1.5 text-xs">
                      <Pencil size={12} /> Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => approachLead(lead, "meta")} disabled={approachingLeadId === lead.id} className="gap-1.5 text-xs">
                      {approachingLeadId === lead.id && approachingMode === "meta" ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      Regenerar
                    </Button>
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground italic py-2">
                  Nenhum follow-up gerado ainda. Clique abaixo para gerar a mensagem usada após a resposta ao template.
                </p>
                <Button
                  onClick={() => approachLead(lead, "meta")}
                  disabled={approachingLeadId === lead.id}
                  className="w-full gap-2"
                >
                  {approachingLeadId === lead.id && approachingMode === "meta" ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Gerar follow-up com IA (pós-resposta do template)
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action buttons (envio via API Meta — apenas no modo Meta) */}
      <div className="flex flex-col gap-2 pt-1">
        {messageMode === "meta" && lead.ai_approach_message && !lead.first_message_sent && (
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
        {messageMode === "meta" && lead.first_message_sent && (
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
                      onClick={() => navigate("/meta/numeros")}
                    >
                      <Wifi size={14} />
                      Números WhatsApp (Meta)
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

              {/* Banner: muitos leads vindo "fora do público" */}
              {companyProfile && (
                <IdealAudienceMismatchBanner
                  accountOwnerId={accountOwnerId}
                  onEditProfile={() => setShowOnboarding(true)}
                />
              )}

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
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Qualificando: {batchCurrentName}</p>
                    <p className="text-xs text-muted-foreground">
                      ⏱ Tempo médio: ~{Math.max(1, Math.ceil((batchTotal - batchProgress) * 12 / 60))} min restante{Math.ceil((batchTotal - batchProgress) * 12 / 60) !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )}

              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Total", value: stats.total, icon: <Target size={17} className="text-primary" />, circle: "bg-primary/[0.12]" },
                  { label: "Qualificados", value: stats.scored, icon: <Sparkles size={17} className="text-blue-400" />, circle: "bg-blue-400/[0.12]" },
                  { label: "Alta Oportunidade", value: stats.highOpp, icon: <TrendingUp size={17} className="text-emerald-400" />, circle: "bg-emerald-400/[0.12]" },
                  {
                    label: "Score Médio", value: stats.avgScore, icon: <BarChart3 size={17} className="text-amber-400" />, circle: "bg-amber-400/[0.12]",
                    extra: (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="p-0.5 rounded hover:bg-muted/60 transition-colors"><Info size={12} className="text-muted-foreground/40" /></button>
                        </PopoverTrigger>
                        <PopoverContent side="bottom" align="end" className="w-80">{scoreInfoContent}</PopoverContent>
                      </Popover>
                    ),
                  },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="group relative overflow-hidden bg-card border border-border/60 rounded-[var(--radius-card)] p-5 transition-colors hover:border-border"
                  >
                    {/* Green glow */}
                    <div className="absolute -bottom-10 -right-10 w-36 h-36 rounded-full bg-emerald-500/[0.04] dark:bg-emerald-500/[0.07] blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col gap-3">
                      <div className={`w-10 h-10 rounded-xl ${kpi.circle} flex items-center justify-center`}>
                        {kpi.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{kpi.label}</p>
                          {(kpi as any).extra || null}
                        </div>
                        {loading ? (
                          <Skeleton className="h-8 w-14" />
                        ) : (
                          <p className="text-[30px] font-bold leading-tight tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>{kpi.value}</p>
                        )}
                      </div>
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
                  responsibleFilter !== "me",
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
                    <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>

                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZE_OPTIONS.map(n => (
                          <SelectItem key={n} value={String(n)}>{n} / pág</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    {/* Responsável */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Responsável</label>
                      <CRMResponsibleFilter
                        value={responsibleFilter}
                        onChange={(v) => { setResponsibleFilter(v); setCurrentPage(1); clearSelection(); }}
                        members={responsibleMembers}
                        currentUserId={user?.id ?? null}
                      />
                    </div>

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

              {/* Bulk actions bar */}
              <OpportunityBulkBar
                selectedCount={selectedIds.size}
                totalVisible={paginatedLeads.filter(l => !String(l.id).startsWith("__tour_")).length}
                onSelectAllVisible={selectAllVisible}
                onClear={clearSelection}
                onChangeResponsible={bulkAssign}
                onArchive={bulkArchive}
                onMarkSent={bulkMarkSent}
                members={responsibleMembers}
                canChangeResponsible={canChangeResponsible}
              />


              {/* Table with dual scroll */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Top scroll bar */}
                <div
                  ref={topScrollRef}
                  onScroll={syncBottomScroll}
                  className="overflow-x-auto scrollbar-thin"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  <div ref={tableContentRef} className="min-w-max" />
                </div>
                <div
                  ref={bottomScrollRef}
                  onScroll={syncTopScroll}
                  className="overflow-x-auto"
                >
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={selectedIds.size > 0 && paginatedLeads.filter(l => !String(l.id).startsWith("__tour_")).every(l => selectedIds.has(l.id))}
                          onCheckedChange={(checked) => {
                            if (checked) selectAllVisible(); else clearSelection();
                          }}
                          aria-label="Selecionar página"
                        />
                      </TableHead>
                      <TableHead><div className="flex items-center gap-1.5"><Building2 size={14} />Empresa</div></TableHead>
                      <TableHead><div className="flex items-center gap-1.5"><Tag size={14} />Categoria</div></TableHead>
                      <TableHead><div className="flex items-center gap-1.5"><MapPin size={14} />Cidade</div></TableHead>
                      <TableHead className="text-center"><div className="flex items-center justify-center gap-1.5"><Star size={14} />Avaliação</div></TableHead>
                      <TableHead className="text-center"><div className="flex items-center justify-center gap-1.5 whitespace-nowrap"><BarChart3 size={14} />Índ. Fech.</div></TableHead>
                      <TableHead className="text-center"><div className="flex items-center justify-center gap-1.5"><TrendingUp size={14} />Intenção</div></TableHead>
                      <TableHead className="text-center"><div className="flex items-center justify-center gap-1.5"><Users size={14} />Resp.</div></TableHead>
                      <TableHead className="text-center"><div className="flex items-center justify-center gap-1.5"><CheckCircle2 size={14} />Status</div></TableHead>
                      <TableHead className="text-center"><div className="flex items-center justify-center gap-1.5"><Send size={14} />Enviar</div></TableHead>
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
                        <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                          {searchTerm || filterLevel !== "all"
                            ? "Nenhuma oportunidade encontrada com esses filtros"
                            : "Nenhuma oportunidade ainda. Faça uma busca em Oportunidades → Buscar"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedLeads.map((lead, idx) => (
                        <TableRow
                          key={lead.id}
                          data-tour={lead.id === "__tour_demo_lead__" ? "lead-row-demo" : idx === 0 ? "lead-row-first" : undefined}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => { setSelectedLead(lead); setPopupTab("dados"); setEditingMessage(false); }}
                        >
                          <TableCell className="w-[40px]" onClick={(e) => e.stopPropagation()}>
                            {!String(lead.id).startsWith("__tour_") && (
                              <Checkbox
                                checked={selectedIds.has(lead.id)}
                                onCheckedChange={() => toggleSelected(lead.id)}
                                aria-label="Selecionar lead"
                              />
                            )}
                          </TableCell>
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
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            {(() => {
                              const m = responsibleMembers.find(x => x.user_id === lead.responsible_user_id);
                              const label = m ? (m.name || m.email || "?") : "Sem responsável";
                              const initial = m ? (m.name || m.email || "?").trim().charAt(0).toUpperCase() : "?";
                              const trigger = (
                                <button
                                  type="button"
                                  title={`Responsável: ${label}${canChangeResponsible ? " — clique para alterar" : ""}`}
                                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold border border-border/60 transition hover:ring-2 hover:ring-primary/40 ${m ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"} ${canChangeResponsible ? "cursor-pointer" : "cursor-default"}`}
                                  disabled={!canChangeResponsible}
                                >
                                  {m?.avatar_url ? (
                                    <img src={m.avatar_url} alt={label} className="h-full w-full rounded-full object-cover" />
                                  ) : initial}
                                </button>
                              );
                              if (!canChangeResponsible) return trigger;
                              return (
                                <Popover>
                                  <PopoverTrigger asChild>{trigger}</PopoverTrigger>
                                  <PopoverContent className="w-60 p-1" align="center" onClick={(e) => e.stopPropagation()}>
                                    <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                                      Alterar responsável
                                    </div>
                                    <button
                                      className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted ${!lead.responsible_user_id ? "bg-muted/60 font-medium" : "text-muted-foreground"}`}
                                      onClick={() => assignSingle(lead.id, null)}
                                    >
                                      Sem responsável
                                    </button>
                                    <div className="max-h-56 overflow-y-auto">
                                      {responsibleMembers.length === 0 ? (
                                        <div className="px-2 py-2 text-xs text-muted-foreground">Nenhum membro disponível.</div>
                                      ) : responsibleMembers.map((mm) => {
                                        const active = mm.user_id === lead.responsible_user_id;
                                        return (
                                          <button
                                            key={mm.user_id}
                                            className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted flex items-center gap-2 ${active ? "bg-muted/60 font-medium" : ""}`}
                                            onClick={() => assignSingle(lead.id, mm.user_id)}
                                          >
                                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-semibold overflow-hidden">
                                              {mm.avatar_url ? <img src={mm.avatar_url} alt="" className="h-full w-full object-cover" /> : (mm.name || mm.email || "?").trim().charAt(0).toUpperCase()}
                                            </span>
                                            <span className="truncate">{mm.name || mm.email || mm.user_id.slice(0, 8)}</span>
                                            {active && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              );
                            })()}
                          </TableCell>
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
                            ) : (lead.ai_approach_message || lead.enrichment_data?.manual_approach?.message) ? (
                              <Badge variant="outline" className="text-xs gap-1 text-blue-400 border-blue-400/30">
                                <MessageSquare size={10} />
                                Msg Gerada
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
                                <Clock size={10} />
                                Pendente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            {(() => {
                              const manualMsg: string = lead.enrichment_data?.manual_approach?.message || "";
                              const metaMsg: string = lead.ai_approach_message || "";
                              const hasManual = !!manualMsg.trim();
                              const hasMeta = !!metaMsg.trim() && !lead.first_message_sent;
                              if (!hasManual && !hasMeta) {
                                return <span className="text-muted-foreground text-xs">—</span>;
                              }
                              const openMeta = () => { setSendingLead(lead); setSendDialogOpen(true); };
                              const sendBtnClass = "inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#25D366] hover:bg-[#20BA5A] text-white shadow-sm shadow-emerald-900/20 transition-all hover:scale-105 active:scale-95";
                              // Só uma opção → ação direta (manual abre popover de web/app; meta abre dialog)
                              if (hasManual && !hasMeta) {
                                return (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button className={sendBtnClass} title="Enviar via WhatsApp (manual)">
                                        <WhatsAppIcon />
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-52 p-1" align="center">
                                      <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">Abrir WhatsApp</div>
                                      <button className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted" onClick={() => openWhatsApp(lead, manualMsg, "web")}>WhatsApp Web</button>
                                      <button className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted" onClick={() => openWhatsApp(lead, manualMsg, "app")}>Aplicativo</button>
                                    </PopoverContent>
                                  </Popover>
                                );
                              }
                              if (hasMeta && !hasManual) {
                                return (
                                  <button
                                    className={sendBtnClass}
                                    title={sendCooldown > 0 ? `Aguarde ${sendCooldown}s` : "Enviar via Meta API"}
                                    disabled={sendCooldown > 0}
                                    onClick={openMeta}
                                  >
                                    <WhatsAppIcon />
                                  </button>
                                );
                              }
                              // Ambas geradas → mini-popup perguntando qual enviar
                              return (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button className={sendBtnClass} title="Enviar mensagem">
                                      <WhatsAppIcon />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-64 p-1" align="center">
                                    <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">Qual mensagem enviar?</div>
                                    <button
                                      className="w-full text-left px-2 py-2 text-sm rounded hover:bg-muted flex flex-col gap-0.5"
                                      onClick={openMeta}
                                      disabled={sendCooldown > 0}
                                    >
                                      <span className="font-medium">Meta API</span>
                                      <span className="text-[11px] text-muted-foreground">Envio oficial pela Meta Cloud</span>
                                    </button>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <button className="w-full text-left px-2 py-2 text-sm rounded hover:bg-muted flex flex-col gap-0.5">
                                          <span className="font-medium">Manual (link WhatsApp)</span>
                                          <span className="text-[11px] text-muted-foreground">Abre conversa com texto pronto</span>
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-52 p-1" align="center">
                                        <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">Abrir WhatsApp</div>
                                        <button className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted" onClick={() => openWhatsApp(lead, manualMsg, "web")}>WhatsApp Web</button>
                                        <button className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted" onClick={() => openWhatsApp(lead, manualMsg, "app")}>Aplicativo</button>
                                      </PopoverContent>
                                    </Popover>
                                  </PopoverContent>
                                </Popover>
                              );
                            })()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                </div>
              </div>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">
                  {filteredLeads.length.toLocaleString('pt-BR')} oportunidade(s) — Página {currentPage.toLocaleString('pt-BR')} de {totalPages.toLocaleString('pt-BR')}
                </span>
                <div className="flex items-center gap-1 flex-wrap justify-center">
                  {/* First page */}
                  <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(1)} className="h-8 px-2 text-xs">
                    <ChevronLeft size={14} /><ChevronLeft size={14} className="-ml-2" />
                  </Button>
                  {/* Previous */}
                  <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-8 px-2">
                    <ChevronLeft size={16} />
                  </Button>

                  {(() => {
                    const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];
                    if (totalPages <= 7) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      if (currentPage > 4) pages.push('ellipsis-start');
                      const start = Math.max(2, currentPage - 2);
                      const end = Math.min(totalPages - 1, currentPage + 2);
                      for (let i = start; i <= end; i++) pages.push(i);
                      if (currentPage < totalPages - 3) pages.push('ellipsis-end');
                      pages.push(totalPages);
                    }
                    return pages.map((p, idx) => {
                      if (p === 'ellipsis-start' || p === 'ellipsis-end') {
                        return <span key={p} className="px-1 text-muted-foreground text-xs select-none">…</span>;
                      }
                      return (
                        <Button
                          key={`page-${p}-${idx}`}
                          size="sm"
                          variant={p === currentPage ? "default" : "outline"}
                          onClick={() => setCurrentPage(p)}
                          className="h-8 min-w-[2rem] px-2 text-xs"
                        >
                          {p.toLocaleString('pt-BR')}
                        </Button>
                      );
                    });
                  })()}

                  {/* Next */}
                  <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-8 px-2">
                    <ChevronRight size={16} />
                  </Button>
                  {/* Last page */}
                  <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)} className="h-8 px-2 text-xs">
                    <ChevronRight size={14} /><ChevronRight size={14} className="-ml-2" />
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
          data-tour={selectedLead?.id === "__tour_demo_lead__" ? "lead-dialog-demo" : undefined}
          data-tour-selected-lead-id={selectedLead?.id}
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
                    data-tour="lead-tab-dados"
                    onClick={() => setPopupTab("dados")}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${popupTab === "dados" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Eye size={14} />
                    Dados do Lead
                  </button>
                  <button
                    data-tour="lead-tab-score"
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
          ownerUserId={accountOwnerId}
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
          userId={accountOwnerId || user.id}
          availableNumbers={[]}
          onSent={() => {
            setSendCooldown(120);
            setLeads(prev => prev.map(l => l.id === sendingLead.id ? { ...l, first_message_sent: true } : l));
            if (selectedLead?.id === sendingLead.id) {
              setSelectedLead({ ...selectedLead, first_message_sent: true });
            }
            setSendingLead(null);
            setSendDialogOpen(true);
          }}
          onRequestConnect={() => { setSendingLead(null); setSendDialogOpen(true); }}
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
