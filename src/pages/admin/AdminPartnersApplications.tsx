import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Check, X, Mail, Phone, Calendar, Users, Building2, MapPin, FileText,
  Instagram, Youtube, Linkedin, Globe, ExternalLink, Loader2, Award, Sparkles, Copy,
  IdCard, Briefcase, MessageSquare, Activity, AlertCircle, Clock, CheckCircle2, XCircle,
} from "lucide-react";
import { fmtDateTime } from "@/lib/partnerFormat";

interface Application {
  id: string;
  full_name: string;
  company_name: string | null;
  cpf: string | null;
  cnpj: string | null;
  email: string;
  phone: string | null;
  phone_secondary: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  address: string | null;
  postal_code: string | null;
  access_email: string | null;
  profile: string | null;
  years_in_market: string | null;
  has_team: boolean | null;
  current_clients_count: number | null;
  instagram_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  community_url: string | null;
  audience_size: string | null;
  monthly_leads_estimate: string | null;
  promotion_channels: string[] | null;
  expected_monthly_referrals: number | null;
  promoted_other_softwares: boolean | null;
  other_softwares_details: string | null;
  reason_to_be_partner: string | null;
  reason_to_be_approved: string | null;
  how_would_sell: string | null;
  differential: string | null;
  results_90_days: string | null;
  motivation: string | null;
  documents: any;
  internal_score: number | null;
  status: string;
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  ip_address: string | null;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  approved_partner_id: string | null;
}

const profileLabels: Record<string, string> = {
  influencer: "Influenciador", agency: "Agência", freelancer: "Freelancer",
  consultant: "Consultor", automation: "Automação", reseller: "Revendedor",
  wiize_client: "Cliente Wiize", tech_company: "Tech", other: "Outro",
};
const yearsLabels: Record<string, string> = {
  beginner: "Iniciante", "1-2": "1-2 anos", "3-5": "3-5 anos", "5+": "5+ anos",
};
const docTypeLabels: Record<string, string> = {
  id_doc: "Documento pessoal", cnpj_card: "Cartão CNPJ",
  selfie: "Selfie c/ documento", address_proof: "Comp. de endereço",
};

const fmtCpf = (s: string | null) => s ? s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : "—";
const fmtCnpj = (s: string | null) => s ? s.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5") : "—";

// === STATUS THEMING (clean & minimal) ===
const STATUS_THEME: Record<string, {
  label: string; pill: string; dot: string; iconBg: string; iconColor: string; cardBorder: string; icon: React.ComponentType<{ className?: string }>;
}> = {
  pending: {
    label: "Pendente",
    pill: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
    dot: "bg-amber-500",
    iconBg: "bg-amber-50 dark:bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
    cardBorder: "border-l-amber-500/70",
    icon: Clock,
  },
  approved: {
    label: "Aprovada",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
    dot: "bg-emerald-500",
    iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    cardBorder: "border-l-emerald-500/70",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Recusada",
    pill: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20",
    dot: "bg-red-500",
    iconBg: "bg-red-50 dark:bg-red-500/10",
    iconColor: "text-red-600 dark:text-red-400",
    cardBorder: "border-l-red-500/70",
    icon: XCircle,
  },
};

function StatusBadge({ status }: { status: string }) {
  const t = STATUS_THEME[status] || STATUS_THEME.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium ${t.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
      {t.label}
    </span>
  );
}

export default function AdminPartnersApplications() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pending");
  const [search, setSearch] = useState("");
  const [reviewing, setReviewing] = useState<Application | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [tempPasswordModal, setTempPasswordModal] = useState<{ email: string; password: string } | null>(null);
  const [dialogTab, setDialogTab] = useState("resumo");
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("partner_applications")
      .select("*")
      .order("created_at", { ascending: false });
    setApps((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Reset tab when opening a new candidate
  useEffect(() => { if (reviewing) setDialogTab("resumo"); }, [reviewing?.id]);

  // Generate signed URLs for documents whenever a candidate is opened
  useEffect(() => {
    const fetchSigned = async () => {
      if (!reviewing?.documents || !Array.isArray(reviewing.documents)) return;
      const next: Record<string, string> = {};
      for (const doc of reviewing.documents) {
        if (!doc?.url) continue;
        const { data } = await supabase.storage
          .from("partner-applications")
          .createSignedUrl(doc.url, 3600);
        if (data?.signedUrl) next[doc.url] = data.signedUrl;
      }
      setDocUrls(next);
    };
    fetchSigned();
  }, [reviewing?.id]);

  const filtered = apps.filter((a) => {
    if (filter !== "all" && a.status !== filter) return false;
    if (search && !`${a.full_name} ${a.email} ${a.company_name || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    pending: apps.filter((a) => a.status === "pending").length,
    approved: apps.filter((a) => a.status === "approved").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
  };

  const approve = async (a: Application) => {
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("approve-partner-application", {
      body: { application_id: a.id, level: "bronze" },
    });
    if (error || !data?.success) {
      let msg = "Não foi possível aprovar.";
      try {
        const ctx = (error as any)?.context;
        if (ctx?.json) msg = ctx.json.error || msg;
        else if (ctx?.body) {
          const parsed = typeof ctx.body === "string" ? JSON.parse(ctx.body) : ctx.body;
          msg = parsed?.error || msg;
        } else if (data?.error) msg = data.error;
      } catch { /* ignore */ }
      console.error("[approve] error:", { error, data });
      toast({ title: "Erro ao aprovar", description: msg, variant: "destructive" });
      setSubmitting(false);
      return;
    }
    toast({ title: "Parceiro aprovado", description: "Conta criada e e-mail enviado com o certificado." });
    if (data.temp_password) {
      setTempPasswordModal({ email: a.access_email || a.email, password: data.temp_password });
    }
    setReviewing(null);
    setSubmitting(false);
    load();
  };

  const reject = async (a: Application) => {
    if (!rejectReason.trim()) {
      toast({ title: "Informe o motivo da recusa", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("reject-partner-application", {
      body: { application_id: a.id, reason: rejectReason, send_email: true },
    });
    if (error || !data?.success) {
      let msg = "Não foi possível recusar.";
      try {
        const ctx = (error as any)?.context;
        if (ctx?.json) msg = ctx.json.error || msg;
        else if (ctx?.body) {
          const parsed = typeof ctx.body === "string" ? JSON.parse(ctx.body) : ctx.body;
          msg = parsed?.error || msg;
        } else if (data?.error) msg = data.error;
      } catch { /* ignore */ }
      console.error("[reject] error:", { error, data });
      toast({ title: "Erro ao recusar", description: msg, variant: "destructive" });
      setSubmitting(false);
      return;
    }
    toast({ title: "Candidatura recusada" });
    setReviewing(null);
    setRejectReason("");
    setSubmitting(false);
    load();
  };

  const scoreColor = (s: number) =>
    s >= 70 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
    : s >= 40 ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
    : "bg-muted/50 text-muted-foreground border-border";

  const docsArr = Array.isArray(reviewing?.documents) ? reviewing!.documents : [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Candidaturas de parceiros</h1>
        <p className="text-sm text-muted-foreground mt-1">Análise e aprovação de candidaturas vindas da landing pública.</p>
      </div>

      {/* Stat cards — estilo Wiize Cockpit (clean, ícone topo + número grande + label) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(["pending", "approved", "rejected"] as const).map((s) => {
          const t = STATUS_THEME[s];
          const Icon = t.icon;
          const active = filter === s;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-left rounded-2xl bg-card border border-border p-5 transition-all hover:border-foreground/20 ${
                active ? "border-foreground/30 shadow-sm" : ""
              }`}
            >
              <div className={`h-9 w-9 rounded-lg ${t.iconBg} ${t.iconColor} flex items-center justify-center mb-4`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="text-3xl font-semibold tracking-tight text-foreground">{counts[s]}</div>
              <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mt-1">{t.label}s</div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={filter} onValueChange={setFilter} className="flex-1">
          <TabsList>
            <TabsTrigger value="pending" className="gap-1.5">
              <span className={`h-2 w-2 rounded-full ${STATUS_THEME.pending.dot}`} />
              Pendentes <Badge variant="secondary" className="ml-1">{counts.pending}</Badge>
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-1.5">
              <span className={`h-2 w-2 rounded-full ${STATUS_THEME.approved.dot}`} />
              Aprovadas <Badge variant="secondary" className="ml-1">{counts.approved}</Badge>
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-1.5">
              <span className={`h-2 w-2 rounded-full ${STATUS_THEME.rejected.dot}`} />
              Recusadas <Badge variant="secondary" className="ml-1">{counts.rejected}</Badge>
            </TabsTrigger>
            <TabsTrigger value="all">Todas</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar nome, e-mail ou empresa" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">Nenhuma candidatura encontrada.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((a) => {
            const theme = STATUS_THEME[a.status] || STATUS_THEME.pending;
            return (
              <Card
                key={a.id}
                className={`group hover:shadow-elegant transition-all cursor-pointer border-l-4 ${theme.cardBorder}`}
                onClick={() => setReviewing(a)}
              >
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-semibold">{a.full_name}</h3>
                      <StatusBadge status={a.status} />
                      {a.internal_score !== null && (
                        <span className={`px-2 py-0.5 rounded-md border text-[11px] font-medium inline-flex items-center gap-1 ${scoreColor(a.internal_score)}`}>
                          <Sparkles className="h-2.5 w-2.5" /> Score {a.internal_score}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 truncate"><Mail size={12} />{a.email}</div>
                      {a.phone && <div className="flex items-center gap-1.5"><Phone size={12} />{a.phone}</div>}
                      {a.company_name && <div className="flex items-center gap-1.5 truncate"><Building2 size={12} />{a.company_name}</div>}
                      {a.profile && <div className="flex items-center gap-1.5"><Users size={12} />{profileLabels[a.profile] || a.profile}</div>}
                      {(a.city || a.state) && <div className="flex items-center gap-1.5"><MapPin size={12} />{[a.city, a.state].filter(Boolean).join("/")}</div>}
                      <div className="flex items-center gap-1.5"><Calendar size={12} />{fmtDateTime(a.created_at)}</div>
                    </div>
                  </div>
                  <Button size="sm" variant={a.status === "pending" ? "default" : "outline"}>
                    {a.status === "pending" ? "Revisar" : "Detalhes"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ===================== REVIEW DIALOG ===================== */}
      <Dialog open={!!reviewing} onOpenChange={(o) => { if (!o) { setReviewing(null); setRejectReason(""); setDocUrls({}); } }}>
        <DialogContent className="max-w-4xl h-[92vh] p-0 overflow-hidden gap-0 bg-background flex flex-col">
          {reviewing && (
            <>
              {/* HEADER */}
              <div className={`border-b border-border px-6 py-5 pr-14 shrink-0 ${
                reviewing.status === "pending" ? "bg-amber-50/50 dark:bg-amber-500/5"
                : reviewing.status === "approved" ? "bg-emerald-50/50 dark:bg-emerald-500/5"
                : "bg-red-50/50 dark:bg-red-500/5"
              }`}>
                <DialogHeader className="space-y-2">
                  <DialogTitle className="text-xl flex items-center gap-2.5 flex-wrap">
                    {reviewing.full_name}
                    <StatusBadge status={reviewing.status} />
                    {reviewing.internal_score !== null && (
                      <span className={`px-2 py-0.5 rounded-md border text-[11px] font-medium inline-flex items-center gap-1 ${scoreColor(reviewing.internal_score)}`}>
                        <Award className="h-2.5 w-2.5" /> Score {reviewing.internal_score}/100
                      </span>
                    )}
                  </DialogTitle>
                  <DialogDescription className="flex items-center gap-3 text-xs flex-wrap">
                    <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {reviewing.email}</span>
                    {reviewing.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {reviewing.phone}</span>}
                    <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {fmtDateTime(reviewing.created_at)}</span>
                  </DialogDescription>
                </DialogHeader>
              </div>

              {/* TABS */}
              <Tabs value={dialogTab} onValueChange={setDialogTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="px-6 border-b border-border bg-muted/30 shrink-0">
                  <TabsList className="bg-transparent h-auto p-0 gap-0 rounded-none w-full justify-start overflow-x-auto">
                    <TabsTriggerNav value="resumo" icon={Activity} label="Resumo" current={dialogTab} />
                    <TabsTriggerNav value="identidade" icon={IdCard} label="Identidade" current={dialogTab} />
                    <TabsTriggerNav value="perfil" icon={Briefcase} label="Perfil & Audiência" current={dialogTab} />
                    <TabsTriggerNav value="parceria" icon={Users} label="Parceria" current={dialogTab} />
                    <TabsTriggerNav value="respostas" icon={MessageSquare} label="Respostas" current={dialogTab} />
                    <TabsTriggerNav value="documentos" icon={FileText} label="Documentos" current={dialogTab} badge={docsArr.length} />
                    <TabsTriggerNav value="origem" icon={Globe} label="Origem" current={dialogTab} />
                  </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
                  {/* RESUMO */}
                  <TabsContent value="resumo" className="m-0 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <SummaryCard icon={IdCard} label="Documento" value={reviewing.cnpj ? `CNPJ ${fmtCnpj(reviewing.cnpj)}` : `CPF ${fmtCpf(reviewing.cpf)}`} />
                      <SummaryCard icon={Briefcase} label="Perfil" value={profileLabels[reviewing.profile || ""] || reviewing.profile || "—"} sub={yearsLabels[reviewing.years_in_market || ""] || ""} />
                      <SummaryCard icon={MapPin} label="Localização" value={`${reviewing.city || "—"}${reviewing.state ? "/" + reviewing.state : ""}`} />
                      <SummaryCard icon={Users} label="Equipe / Clientes" value={`${reviewing.has_team ? "Com equipe" : "Sem equipe"} · ${reviewing.current_clients_count ?? 0} clientes`} />
                      <SummaryCard icon={Activity} label="Indicações esperadas" value={reviewing.expected_monthly_referrals ? `${reviewing.expected_monthly_referrals}/mês` : "—"} />
                      <SummaryCard icon={FileText} label="Documentos" value={`${docsArr.length} enviados`} sub={docsArr.length > 0 ? docsArr.map((d: any) => docTypeLabels[d.type] || d.type).join(", ") : ""} />
                    </div>
                    {reviewing.rejection_reason && (
                      <div className="mt-2 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                        <div className="text-xs font-semibold text-red-700 dark:text-red-400 flex items-center gap-1.5 mb-1">
                          <XCircle className="h-3.5 w-3.5" /> MOTIVO DA RECUSA
                        </div>
                        <div className="text-sm text-foreground/90">{reviewing.rejection_reason}</div>
                      </div>
                    )}
                    {reviewing.reviewed_at && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3 w-3" /> Revisada em {fmtDateTime(reviewing.reviewed_at)}
                      </div>
                    )}
                  </TabsContent>

                  {/* IDENTIDADE */}
                  <TabsContent value="identidade" className="m-0">
                    <SectionCard title="Dados pessoais">
                      <Grid>
                        <FieldRow label="Nome completo" value={reviewing.full_name} />
                        <FieldRow label="E-mail principal" value={reviewing.email} />
                        <FieldRow label="E-mail de acesso" value={reviewing.access_email || "—"} />
                        <FieldRow label="WhatsApp" value={reviewing.phone || "—"} />
                        <FieldRow label="Telefone secundário" value={reviewing.phone_secondary || "—"} />
                        <FieldRow label="CPF" value={fmtCpf(reviewing.cpf)} />
                      </Grid>
                    </SectionCard>
                    <SectionCard title="Empresa">
                      <Grid>
                        <FieldRow label="Razão social / marca" value={reviewing.company_name || "—"} />
                        <FieldRow label="CNPJ" value={fmtCnpj(reviewing.cnpj)} />
                      </Grid>
                    </SectionCard>
                    <SectionCard title="Endereço">
                      <Grid>
                        <FieldRow label="País" value={reviewing.country || "BR"} />
                        <FieldRow label="Cidade/UF" value={`${reviewing.city || "—"}${reviewing.state ? "/" + reviewing.state : ""}`} />
                        <FieldRow label="CEP" value={reviewing.postal_code || "—"} />
                        <FieldRow label="Endereço" value={reviewing.address || "—"} full />
                      </Grid>
                    </SectionCard>
                  </TabsContent>

                  {/* PERFIL & AUDIÊNCIA */}
                  <TabsContent value="perfil" className="m-0">
                    <SectionCard title="Perfil profissional">
                      <Grid>
                        <FieldRow label="Perfil" value={profileLabels[reviewing.profile || ""] || reviewing.profile || "—"} />
                        <FieldRow label="Experiência" value={yearsLabels[reviewing.years_in_market || ""] || reviewing.years_in_market || "—"} />
                        <FieldRow label="Possui equipe" value={reviewing.has_team === null ? "—" : reviewing.has_team ? "Sim" : "Não"} />
                        <FieldRow label="Clientes atuais" value={reviewing.current_clients_count?.toString() || "—"} />
                      </Grid>
                    </SectionCard>
                    <SectionCard title="Audiência">
                      <Grid>
                        <FieldRow label="Tamanho da audiência" value={reviewing.audience_size || "—"} />
                        <FieldRow label="Leads/mês" value={reviewing.monthly_leads_estimate || "—"} />
                      </Grid>
                      <div className="mt-4">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Canais sociais</div>
                        <div className="flex flex-wrap gap-2">
                          <SocialLink icon={Instagram} url={reviewing.instagram_url} label="Instagram" />
                          <SocialLink icon={Youtube} url={reviewing.youtube_url} label="YouTube" />
                          <SocialLink icon={Globe} url={reviewing.tiktok_url} label="TikTok" />
                          <SocialLink icon={Linkedin} url={reviewing.linkedin_url} label="LinkedIn" />
                          <SocialLink icon={Globe} url={reviewing.website_url} label="Site" />
                          <SocialLink icon={Users} url={reviewing.community_url} label="Comunidade" />
                          {![reviewing.instagram_url, reviewing.youtube_url, reviewing.tiktok_url, reviewing.linkedin_url, reviewing.website_url, reviewing.community_url].some(Boolean) && (
                            <span className="text-xs text-muted-foreground italic">Nenhum canal informado</span>
                          )}
                        </div>
                      </div>
                    </SectionCard>
                  </TabsContent>

                  {/* PARCERIA */}
                  <TabsContent value="parceria" className="m-0">
                    <SectionCard title="Modelo de parceria">
                      <Grid>
                        <FieldRow label="Indicações esperadas/mês" value={reviewing.expected_monthly_referrals?.toString() || "—"} />
                        <FieldRow label="Já promoveu softwares" value={reviewing.promoted_other_softwares === null ? "—" : reviewing.promoted_other_softwares ? "Sim" : "Não"} />
                      </Grid>
                      {reviewing.promotion_channels && reviewing.promotion_channels.length > 0 && (
                        <div className="mt-4">
                          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Canais de promoção</div>
                          <div className="flex flex-wrap gap-1.5">
                            {reviewing.promotion_channels.map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
                          </div>
                        </div>
                      )}
                      {reviewing.other_softwares_details && (
                        <FreeText label="Detalhes de softwares" value={reviewing.other_softwares_details} />
                      )}
                    </SectionCard>
                  </TabsContent>

                  {/* RESPOSTAS */}
                  <TabsContent value="respostas" className="m-0 space-y-3">
                    <FreeText label="Por que ser parceiro Wiize?" value={reviewing.reason_to_be_partner} />
                    <FreeText label="Por que aprovar esta candidatura?" value={reviewing.reason_to_be_approved} />
                    <FreeText label="Como venderia a Wiize?" value={reviewing.how_would_sell} />
                    <FreeText label="Qual seu diferencial?" value={reviewing.differential} />
                    <FreeText label="Resultados esperados em 90 dias" value={reviewing.results_90_days} />
                    {!reviewing.reason_to_be_partner && !reviewing.reason_to_be_approved && !reviewing.how_would_sell && !reviewing.differential && !reviewing.results_90_days && (
                      <div className="text-sm text-muted-foreground italic">Nenhuma resposta fornecida.</div>
                    )}
                  </TabsContent>

                  {/* DOCUMENTOS */}
                  <TabsContent value="documentos" className="m-0">
                    {docsArr.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border p-8 text-center">
                        <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <div className="text-sm text-muted-foreground">Nenhum documento enviado.</div>
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-3">
                        {docsArr.map((doc: any, i: number) => (
                          <a
                            key={i}
                            href={docUrls[doc.url] || "#"}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-sm transition group"
                          >
                            <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium truncate text-sm">{docTypeLabels[doc.type] || doc.type}</div>
                              <div className="text-xs text-muted-foreground truncate">{doc.filename}</div>
                              <div className="text-[11px] text-muted-foreground">{Math.round((doc.size || 0) / 1024)} KB</div>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition shrink-0" />
                          </a>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* ORIGEM */}
                  <TabsContent value="origem" className="m-0">
                    <SectionCard title="Metadados de origem">
                      <Grid>
                        <FieldRow label="Source" value={reviewing.source || "—"} />
                        <FieldRow label="UTM source" value={reviewing.utm_source || "—"} />
                        <FieldRow label="UTM medium" value={reviewing.utm_medium || "—"} />
                        <FieldRow label="UTM campaign" value={reviewing.utm_campaign || "—"} />
                        <FieldRow label="IP" value={reviewing.ip_address || "—"} />
                        <FieldRow label="Recebida em" value={fmtDateTime(reviewing.created_at)} />
                      </Grid>
                    </SectionCard>
                  </TabsContent>
                </div>

                {/* REJECT REASON (only pending) */}
                {reviewing.status === "pending" && (
                  <div className="px-6 py-4 border-t border-border bg-muted/30 shrink-0">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <AlertCircle className="h-3 w-3" /> Motivo da recusa (preencha apenas se for recusar)
                    </label>
                    <Textarea
                      rows={2}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Mensagem cordial que será enviada por e-mail ao candidato."
                      className="mt-1.5 bg-background"
                    />
                  </div>
                )}
              </Tabs>

              {/* FOOTER */}
              {reviewing.status === "pending" && (
                <DialogFooter className="px-6 py-4 border-t border-border bg-background shrink-0">
                  <Button variant="outline" onClick={() => reject(reviewing)} disabled={submitting} className="gap-2 border-red-500/40 text-red-600 hover:bg-red-500/10 hover:text-red-700">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <X size={14} />} Recusar candidatura
                  </Button>
                  <Button onClick={() => approve(reviewing)} disabled={submitting} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check size={14} />} Aprovar e criar parceiro
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* TEMP PASSWORD MODAL */}
      <Dialog open={!!tempPasswordModal} onOpenChange={(o) => !o && setTempPasswordModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Parceiro aprovado!
            </DialogTitle>
          </DialogHeader>
          {tempPasswordModal && (
            <div className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                A senha temporária foi enviada por e-mail. Caso precise, copie aqui:
              </p>
              <div className="space-y-2">
                <div>
                  <div className="text-xs font-medium">E-mail de acesso</div>
                  <div className="bg-muted rounded-lg p-2.5 font-mono text-sm mt-1">{tempPasswordModal.email}</div>
                </div>
                <div>
                  <div className="text-xs font-medium">Senha temporária</div>
                  <div className="flex gap-2 mt-1">
                    <div className="bg-muted rounded-lg p-2.5 font-mono text-sm flex-1">{tempPasswordModal.password}</div>
                    <Button size="sm" variant="outline" onClick={() => {
                      navigator.clipboard.writeText(tempPasswordModal.password);
                      toast({ title: "Senha copiada" });
                    }}><Copy className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 rounded-lg p-3 text-xs">
                <strong>Atenção:</strong> esta senha não será exibida novamente. O parceiro poderá alterá-la no primeiro login.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setTempPasswordModal(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================ HELPERS ============================
function TabsTriggerNav({
  value, icon: Icon, label, current, badge,
}: { value: string; icon: any; label: string; current: string; badge?: number }) {
  const active = current === value;
  return (
    <TabsTrigger
      value={value}
      className={`relative rounded-none px-4 py-3 h-auto bg-transparent text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none border-b-2 ${
        active ? "border-primary" : "border-transparent"
      } gap-1.5 text-sm whitespace-nowrap`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      {badge !== undefined && badge > 0 && (
        <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{badge}</Badge>
      )}
    </TabsTrigger>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 mb-4 last:mb-0">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</h4>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">{children}</div>;
}

function FieldRow({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium mt-0.5 break-words text-sm">{value}</div>
    </div>
  );
}

function FreeText({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2 font-semibold">{label}</div>
      <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">{value}</div>
    </div>
  );
}

function SocialLink({ icon: Icon, url, label }: { icon: any; url: string | null; label: string }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border hover:border-primary/40 hover:bg-primary/5 text-xs transition">
      <Icon className="h-3 w-3" /> {label} <ExternalLink className="h-2.5 w-2.5" />
    </a>
  );
}

function SummaryCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{label}</div>
        <div className="font-semibold text-sm mt-0.5 truncate">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</div>}
      </div>
    </div>
  );
}
