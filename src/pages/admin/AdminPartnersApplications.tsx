import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Check, X, Mail, Phone, Calendar, Users, Building2, MapPin, FileText,
  Instagram, Youtube, Linkedin, Globe, ExternalLink, Loader2, Award, Sparkles, Copy,
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

const fmtCpf = (s: string | null) => s ? s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : "—";
const fmtCnpj = (s: string | null) => s ? s.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5") : "—";

export default function AdminPartnersApplications() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pending");
  const [search, setSearch] = useState("");
  const [reviewing, setReviewing] = useState<Application | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [tempPasswordModal, setTempPasswordModal] = useState<{ email: string; password: string } | null>(null);
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
      console.error("[approve] error:", { error, data, ctx: (error as any)?.context });
      toast({ title: "Erro ao aprovar", description: msg, variant: "destructive" });
      setSubmitting(false);
      return;
    }
    toast({ title: "Parceiro aprovado", description: "Conta criada e e-mail enviado." });
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
      // Extrai a mensagem real do FunctionsHttpError (supabase-js esconde o body em error.context)
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
    s >= 70 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
    : s >= 40 ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
    : "bg-muted text-muted-foreground border-border";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Candidaturas de parceiros</h1>
        <p className="text-sm text-muted-foreground mt-1">Análise e aprovação de candidaturas vindas da landing pública.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={filter} onValueChange={setFilter} className="flex-1">
          <TabsList>
            <TabsTrigger value="pending">Pendentes <Badge variant="secondary" className="ml-2">{counts.pending}</Badge></TabsTrigger>
            <TabsTrigger value="approved">Aprovadas <Badge variant="secondary" className="ml-2">{counts.approved}</Badge></TabsTrigger>
            <TabsTrigger value="rejected">Recusadas <Badge variant="secondary" className="ml-2">{counts.rejected}</Badge></TabsTrigger>
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
          {filtered.map((a) => (
            <Card key={a.id} className="group hover:shadow-elegant transition-all cursor-pointer" onClick={() => setReviewing(a)}>
              <CardContent className="p-5 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="font-semibold">{a.full_name}</h3>
                    <Badge variant={a.status === "pending" ? "default" : a.status === "approved" ? "secondary" : "destructive"}>
                      {a.status === "pending" ? "Pendente" : a.status === "approved" ? "Aprovada" : "Recusada"}
                    </Badge>
                    {a.internal_score !== null && (
                      <span className={`px-2 py-0.5 rounded-full border text-xs font-medium inline-flex items-center gap-1 ${scoreColor(a.internal_score)}`}>
                        <Sparkles className="h-3 w-3" /> Score {a.internal_score}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5"><Mail size={12} />{a.email}</div>
                    {a.phone && <div className="flex items-center gap-1.5"><Phone size={12} />{a.phone}</div>}
                    {a.company_name && <div className="flex items-center gap-1.5"><Building2 size={12} />{a.company_name}</div>}
                    {a.profile && <div className="flex items-center gap-1.5"><Users size={12} />{profileLabels[a.profile] || a.profile}</div>}
                    {(a.city || a.state) && <div className="flex items-center gap-1.5"><MapPin size={12} />{[a.city, a.state].filter(Boolean).join("/")}</div>}
                    <div className="flex items-center gap-1.5"><Calendar size={12} />{fmtDateTime(a.created_at)}</div>
                  </div>
                </div>
                {a.status === "pending" && (
                  <Button size="sm" variant="outline">Revisar</Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* REVIEW DIALOG */}
      <Dialog open={!!reviewing} onOpenChange={(o) => { if (!o) { setReviewing(null); setRejectReason(""); setDocUrls({}); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {reviewing?.full_name}
              {reviewing?.internal_score !== null && reviewing?.internal_score !== undefined && (
                <span className={`px-2 py-0.5 rounded-full border text-xs font-medium inline-flex items-center gap-1 ${scoreColor(reviewing.internal_score)}`}>
                  <Award className="h-3 w-3" /> Score {reviewing.internal_score}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {reviewing && (
            <div className="space-y-6 text-sm">
              {/* IDENTIFICAÇÃO */}
              <Section title="Identificação">
                <Grid>
                  <FieldRow label="E-mail" value={reviewing.email} />
                  <FieldRow label="WhatsApp" value={reviewing.phone || "—"} />
                  <FieldRow label="Telefone secundário" value={reviewing.phone_secondary || "—"} />
                  <FieldRow label="CPF" value={fmtCpf(reviewing.cpf)} />
                  <FieldRow label="CNPJ" value={fmtCnpj(reviewing.cnpj)} />
                  <FieldRow label="Empresa" value={reviewing.company_name || "—"} />
                  <FieldRow label="Cidade/UF" value={`${reviewing.city || "—"}${reviewing.state ? "/" + reviewing.state : ""}`} />
                  <FieldRow label="CEP" value={reviewing.postal_code || "—"} />
                  <FieldRow label="Endereço" value={reviewing.address || "—"} full />
                </Grid>
              </Section>

              {/* PERFIL */}
              <Section title="Perfil profissional">
                <Grid>
                  <FieldRow label="Perfil" value={profileLabels[reviewing.profile || ""] || reviewing.profile || "—"} />
                  <FieldRow label="Experiência" value={yearsLabels[reviewing.years_in_market || ""] || reviewing.years_in_market || "—"} />
                  <FieldRow label="Possui equipe" value={reviewing.has_team === null ? "—" : reviewing.has_team ? "Sim" : "Não"} />
                  <FieldRow label="Clientes atuais" value={reviewing.current_clients_count?.toString() || "—"} />
                </Grid>
              </Section>

              {/* AUDIÊNCIA */}
              <Section title="Audiência e canais">
                <Grid>
                  <FieldRow label="Audiência" value={reviewing.audience_size || "—"} />
                  <FieldRow label="Leads/mês" value={reviewing.monthly_leads_estimate || "—"} />
                </Grid>
                <div className="flex flex-wrap gap-2 mt-3">
                  <SocialLink icon={Instagram} url={reviewing.instagram_url} label="Instagram" />
                  <SocialLink icon={Youtube} url={reviewing.youtube_url} label="YouTube" />
                  <SocialLink icon={Globe} url={reviewing.tiktok_url} label="TikTok" />
                  <SocialLink icon={Linkedin} url={reviewing.linkedin_url} label="LinkedIn" />
                  <SocialLink icon={Globe} url={reviewing.website_url} label="Site" />
                  <SocialLink icon={Users} url={reviewing.community_url} label="Comunidade" />
                </div>
              </Section>

              {/* PARCERIA */}
              <Section title="Modelo de parceria">
                <Grid>
                  <FieldRow label="Indicações esperadas/mês" value={reviewing.expected_monthly_referrals?.toString() || "—"} />
                  <FieldRow label="Já promoveu softwares" value={reviewing.promoted_other_softwares === null ? "—" : reviewing.promoted_other_softwares ? "Sim" : "Não"} />
                </Grid>
                {reviewing.promotion_channels && reviewing.promotion_channels.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Canais</div>
                    <div className="flex flex-wrap gap-1.5">
                      {reviewing.promotion_channels.map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
                    </div>
                  </div>
                )}
                {reviewing.other_softwares_details && (
                  <FreeText label="Detalhes de softwares" value={reviewing.other_softwares_details} />
                )}
              </Section>

              {/* RESPOSTAS LIVRES */}
              <Section title="Respostas">
                <FreeText label="Por que ser parceiro" value={reviewing.reason_to_be_partner} />
                <FreeText label="Por que aprovar" value={reviewing.reason_to_be_approved} />
                <FreeText label="Como venderia" value={reviewing.how_would_sell} />
                <FreeText label="Diferencial" value={reviewing.differential} />
                <FreeText label="Resultados 90 dias" value={reviewing.results_90_days} />
              </Section>

              {/* DOCUMENTOS */}
              {Array.isArray(reviewing.documents) && reviewing.documents.length > 0 && (
                <Section title={`Documentos (${reviewing.documents.length})`}>
                  <div className="space-y-2">
                    {reviewing.documents.map((doc: any, i: number) => (
                      <a
                        key={i}
                        href={docUrls[doc.url] || "#"}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted transition"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium truncate">{doc.filename}</div>
                            <div className="text-xs text-muted-foreground">{doc.type} · {Math.round((doc.size || 0) / 1024)} KB</div>
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                </Section>
              )}

              {/* META */}
              <Section title="Origem e metadados">
                <Grid>
                  <FieldRow label="Origem" value={reviewing.source || "—"} />
                  <FieldRow label="UTM source" value={reviewing.utm_source || "—"} />
                  <FieldRow label="UTM medium" value={reviewing.utm_medium || "—"} />
                  <FieldRow label="UTM campaign" value={reviewing.utm_campaign || "—"} />
                  <FieldRow label="IP" value={reviewing.ip_address || "—"} />
                  <FieldRow label="Recebida em" value={fmtDateTime(reviewing.created_at)} />
                </Grid>
              </Section>

              {reviewing.status === "pending" && (
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Motivo da recusa (apenas se for recusar)</Label>
                  <Textarea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Mensagem cordial que será enviada por e-mail." className="mt-1.5" />
                </div>
              )}
              {reviewing.rejection_reason && (
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Motivo da recusa</Label>
                  <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm mt-1.5">{reviewing.rejection_reason}</div>
                </div>
              )}
            </div>
          )}
          {reviewing?.status === "pending" && (
            <DialogFooter>
              <Button variant="outline" onClick={() => reject(reviewing)} disabled={submitting} className="gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <X size={14} />} Recusar
              </Button>
              <Button onClick={() => approve(reviewing)} disabled={submitting} className="gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check size={14} />} Aprovar e criar parceiro
              </Button>
            </DialogFooter>
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
                  <Label className="text-xs">E-mail de acesso</Label>
                  <div className="bg-muted rounded-lg p-2.5 font-mono text-sm mt-1">{tempPasswordModal.email}</div>
                </div>
                <div>
                  <Label className="text-xs">Senha temporária</Label>
                  <div className="flex gap-2 mt-1">
                    <div className="bg-muted rounded-lg p-2.5 font-mono text-sm flex-1">{tempPasswordModal.password}</div>
                    <Button size="sm" variant="outline" onClick={() => {
                      navigator.clipboard.writeText(tempPasswordModal.password);
                      toast({ title: "Senha copiada" });
                    }}><Copy className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
              <div className="bg-warning/10 border border-warning/30 text-warning rounded-lg p-3 text-xs">
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
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</h4>
      {children}
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>;
}
function FieldRow({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium mt-0.5 break-words">{value}</div>
    </div>
  );
}
function FreeText({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="mt-3 first:mt-0">
      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
      <div className="bg-muted/50 rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap">{value}</div>
    </div>
  );
}
function SocialLink({ icon: Icon, url, label }: { icon: any; url: string | null; label: string }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted hover:bg-muted/70 text-xs transition">
      <Icon className="h-3 w-3" /> {label} <ExternalLink className="h-2.5 w-2.5" />
    </a>
  );
}
function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={`font-medium ${className || ""}`}>{children}</div>;
}
