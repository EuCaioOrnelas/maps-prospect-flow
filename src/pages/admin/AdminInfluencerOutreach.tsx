import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PageHeader } from "@/components/partners/PageHeader";
import { OutreachComposeDialog } from "@/components/admin/partners/OutreachComposeDialog";
import { useToast } from "@/hooks/use-toast";
import { fmtNum } from "@/lib/influencerProspecting";
import {
  DEFAULT_TEMPLATE_BODY, DEFAULT_TEMPLATE_SUBJECT,
  contactTypeLabel, emailHtmlToText, sendStatusMeta,
  textToEmailHtml, PROSPECT_OUTREACH_STATUSES, prospectOutreachLabel,
} from "@/lib/influencerOutreach";
import { ChannelAvatar } from "@/components/admin/partners/ChannelAvatar";
import { InfluencerContactsDialog } from "@/components/admin/partners/InfluencerContactsDialog";
import { InfluencerThreadDialog } from "@/components/admin/partners/InfluencerThreadDialog";
import {
  Loader2, Mail, Search, Send, RefreshCw, Plus, Trash2, FileText, Users,
  CheckCircle2, XCircle, MessageSquareReply, Ban, PlayCircle, Filter, Info, Inbox, MessageSquare, SendHorizonal,
} from "lucide-react";


const PAGE = 25;

function IconAction({ label, children, ...props }: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button {...props} aria-label={label}>{children}</Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** Apenas leads qualificados (ou já em abordagem) entram na esteira. */
const QUALIFIED_STATUSES = [
  "qualificado",
  "contato_encontrado",
  "contatos_identificados",
  "pronto_abordagem",
  "sem_contato",
  "abordado",
  "email_enviado",
  "respondeu",
  "negociacao",
  "parceria_ativa",
];


export default function AdminInfluencerOutreach() {
  const { toast } = useToast();
  const [tab, setTab] = useState("abordagens");

  // ── Abordagens ────────────────────────────────────────────────────────────
  const [prospects, setProspects] = useState<any[]>([]);
  const [contactsMap, setContactsMap] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [contactFilter, setContactFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [finding, setFinding] = useState<string[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);
  const [thread, setThread] = useState<any | null>(null);
  const [testingTemplate, setTestingTemplate] = useState<string | null>(null);

  // ── Campanhas ─────────────────────────────────────────────────────────────
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [openCampaign, setOpenCampaign] = useState<any | null>(null);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const runningRef = useRef<string | null>(null);

  // ── Modelos ───────────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);

  const loadProspects = useCallback(async () => {
    setLoading(true);
    // Entram na esteira todos os influenciadores qualificados (salvos ou não),
    // inclusive os que ainda não têm e-mail descoberto.
    const { data } = await (supabase as any)
      .from("influencer_prospects")
      .select("*")
      .in("status", QUALIFIED_STATUSES)
      .order("fit_score", { ascending: false })
      .limit(600);

    const rows = data ?? [];
    setProspects(rows);
    if (rows.length) {
      const { data: cts } = await (supabase as any)
        .from("influencer_contacts").select("*").in("prospect_id", rows.map((r: any) => r.id));
      const map: Record<string, any[]> = {};
      (cts ?? []).forEach((c: any) => { (map[c.prospect_id] ||= []).push(c); });
      setContactsMap(map);
    }
    setLoading(false);
  }, []);

  const loadCampaigns = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("influencer_campaigns").select("*").order("created_at", { ascending: false }).limit(50);
    setCampaigns(data ?? []);
  }, []);

  const loadTemplates = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("influencer_email_templates").select("*").order("created_at", { ascending: false });
    setTemplates(data ?? []);
  }, []);

  useEffect(() => { loadProspects(); loadCampaigns(); loadTemplates(); }, [loadProspects, loadCampaigns, loadTemplates]);

  // Realtime: envios e campanhas atualizam sem recarregar a página.
  useEffect(() => {
    const ch = supabase
      .channel("influencer-outreach")
      .on("postgres_changes", { event: "*", schema: "public", table: "influencer_campaigns" }, () => loadCampaigns())
      .on("postgres_changes", { event: "*", schema: "public", table: "influencer_campaign_recipients" }, (p: any) => {
        if (openCampaign && p.new?.campaign_id === openCampaign.id) loadRecipients(openCampaign.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [openCampaign, loadCampaigns]);

  const emailOf = (p: any) => {
    const list = contactsMap[p.id] ?? [];
    const c = list.find((x) => x.type === "email" && x.is_primary && x.status !== "nao_contatar")
      ?? list.find((x) => x.type === "email" && x.status !== "nao_contatar");
    return { contact: c ?? null, email: c?.value || (p.contact_email ?? "") };
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return prospects.filter((p) => {
      if (q && !`${p.channel_name} ${p.channel_handle} ${p.contact_email ?? ""}`.toLowerCase().includes(q)) return false;
      const { email } = emailOf(p);
      const list = contactsMap[p.id] ?? [];
      if (contactFilter === "com_email" && !email) return false;
      if (contactFilter === "sem_email" && email) return false;
      if (contactFilter === "sem_contato" && (list.length > 0 || email)) return false;
      if (statusFilter !== "todos" && p.status !== statusFilter) return false;
      return true;
    });
  }, [prospects, contactsMap, search, contactFilter, statusFilter]);

  const selectedTargets = useMemo(
    () => selectedIds
      .map((id) => prospects.find((p) => p.id === id))
      .filter(Boolean)
      .map((p: any) => ({ prospect: p, ...emailOf(p) }))
      .filter((t) => !!t.email),
    [selectedIds, prospects, contactsMap],
  );

  const findContacts = async (ids: string[]) => {
    if (!ids.length) return;
    setFinding(ids);
    try {
      const { data, error } = await supabase.functions.invoke("influencer-contacts", {
        body: { action: "find", prospect_ids: ids },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({
        title: "Busca de contatos concluída",
        description: `${((data as any).results ?? []).reduce((a: number, r: any) => a + (r.created ?? 0), 0)} novo(s) contato(s) em ${ids.length} canal(is).`,
      });
      await loadProspects();
    } catch (e: any) {
      toast({ title: "Erro ao buscar contatos", description: e.message, variant: "destructive" });
    } finally {
      setFinding([]);
    }
  };

  // ── processamento da fila em lotes ────────────────────────────────────────
  const loadRecipients = async (campaignId: string) => {
    const { data } = await (supabase as any)
      .from("influencer_campaign_recipients")
      .select("*").eq("campaign_id", campaignId).order("created_at", { ascending: true });
    setRecipients(data ?? []);
  };

  const runQueue = async (campaignId: string) => {
    if (runningRef.current) return;
    runningRef.current = campaignId;
    setProcessing(campaignId);
    try {
      for (let i = 0; i < 60; i++) {
        const { data, error } = await supabase.functions.invoke("influencer-outreach", {
          body: { action: "process", campaign_id: campaignId },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        await loadCampaigns();
        if (openCampaign?.id === campaignId) await loadRecipients(campaignId);
        if (((data as any).remaining ?? 0) === 0) break;
      }
      toast({ title: "Envio concluído", description: "A fila da campanha foi processada." });
    } catch (e: any) {
      toast({ title: "Falha no envio", description: e.message, variant: "destructive" });
    } finally {
      runningRef.current = null;
      setProcessing(null);
    }
  };

  const campaignAction = async (action: string, campaignId: string) => {
    const { error } = await supabase.functions.invoke("influencer-outreach", { body: { action, campaign_id: campaignId } });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    await loadCampaigns();
    if (openCampaign?.id === campaignId) await loadRecipients(campaignId);
    if (action === "retry" || action === "resend_unanswered") runQueue(campaignId);
  };

  const sendTestTemplate = async (key: string, subject: string, bodyHtml: string) => {
    setTestingTemplate(key);
    try {
      const { data, error } = await supabase.functions.invoke("influencer-outreach", {
        body: { action: "send_test", subject, body_html: bodyHtml },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "E-mail de teste enviado", description: `Enviado para ${(data as any).to}.` });
    } catch (e: any) {
      toast({ title: "Não foi possível enviar o teste", description: e.message, variant: "destructive" });
    } finally {
      setTestingTemplate(null);
    }
  };

  const saveTemplate = async () => {
    if (!editing?.name?.trim() || !editing?.subject?.trim()) {
      toast({ title: "Informe nome e assunto", variant: "destructive" });
      return;
    }
    const payload = {
      name: editing.name.trim(),
      subject: editing.subject.trim(),
      body_html: textToEmailHtml(editing.bodyText || ""),
      description: editing.description ?? null,
    };
    const q = editing.id
      ? (supabase as any).from("influencer_email_templates").update(payload).eq("id", editing.id)
      : (supabase as any).from("influencer_email_templates").insert(payload);
    const { error } = await q;
    if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Modelo salvo" });
    setEditing(null);
    loadTemplates();
  };

  const allVisibleSelected = filtered.length > 0 && filtered.every((p) => selectedIds.includes(p.id));

  return (
    <TooltipProvider delayDuration={250}>
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Abordagem de Influenciadores"
        icon={Mail}
        subtitle="Identifique canais de contato, personalize a mensagem e acompanhe as respostas das parcerias."
      />

      {/* Como funciona o fluxo de abordagem */}
      <Card className="border-primary/20 bg-primary/[0.04]">
        <CardContent className="p-5 lg:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center text-primary">
              <Info size={15} />
            </div>
            <p className="text-sm font-semibold">Como funciona a abordagem</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                t: "1 · Qualificação",
                d: "Só aparecem aqui os influenciadores marcados como qualificados na Prospecção. Se um canal não estiver na lista, salve-o na aba de prospecção primeiro.",
              },
              {
                t: "2 · Contatos",
                d: "“Buscar contatos” varre a página do canal, descrições de vídeos e o site oficial atrás de e-mail e redes. O melhor e-mail encontrado vira o destino da abordagem.",
              },
              {
                t: "3 · Envio",
                d: "Você seleciona os canais, escreve a mensagem com variáveis e cria a campanha. Os e-mails saem em lotes controlados, com link de descadastro obrigatório.",
              },
              {
                t: "4 · Resposta",
                d: "Todos os e-mails usam parcerias@wiize.com.br. A resposta é vinculada ao contato e aparece na conversa do influenciador, alterando o envio para “Resposta recebida”.",
              },
            ].map((s) => (
              <div key={s.t} className="rounded-2xl border border-border bg-background p-4 space-y-1.5">
                <p className="text-xs font-semibold text-primary">{s.t}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-border bg-background p-3">
            <Inbox size={14} className="text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Para responder, basta responder o e-mail direto na caixa de parcerias — a conversa segue por e-mail normalmente.
              Dentro do sistema, acompanhe cada envio em <strong>Campanhas</strong> e use o botão de resposta para marcar
              manualmente quem já respondeu. Quem pede descadastro é bloqueado automaticamente em envios futuros.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="abordagens">Abordagens</TabsTrigger>
          <TabsTrigger value="campanhas">Campanhas</TabsTrigger>
          <TabsTrigger value="modelos">Modelos</TabsTrigger>
        </TabsList>


        {/* ─────────────── ABORDAGENS ─────────────── */}
        <TabsContent value="abordagens" className="space-y-5 mt-5">
          <Card>
            <CardContent className="p-5 lg:p-6 space-y-5">

              <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-8" placeholder="Buscar canal, handle ou e-mail"
                    value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Select value={contactFilter} onValueChange={setContactFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os canais</SelectItem>
                    <SelectItem value="com_email">Com e-mail disponível</SelectItem>
                    <SelectItem value="sem_email">Sem e-mail</SelectItem>
                    <SelectItem value="sem_contato">Sem nenhum contato</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    {PROSPECT_OUTREACH_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{filtered.length} canal(is)</Badge>
                <Badge variant="outline">{selectedIds.length} selecionado(s)</Badge>
                <div className="flex-1" />
                <Button size="sm" variant="outline" disabled={!selectedIds.length || finding.length > 0}
                  onClick={() => findContacts(selectedIds)}>
                  {finding.length ? <Loader2 className="animate-spin mr-2" size={14} /> : <Search className="mr-2" size={14} />}
                  Buscar contatos
                </Button>
                <Button size="sm" disabled={!selectedTargets.length} onClick={() => setComposeOpen(true)}>
                  <Mail className="mr-2" size={14} /> Abordar por e-mail ({selectedTargets.length})
                </Button>
              </div>

              <div className="rounded-xl border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 py-3">
                        <Checkbox checked={allVisibleSelected}
                          onCheckedChange={(v) => setSelectedIds(v ? filtered.map((p) => p.id) : [])} />
                      </TableHead>
                      <TableHead className="py-3">Canal</TableHead>
                      <TableHead className="py-3">Contatos</TableHead>
                      <TableHead className="text-right py-3">Inscritos</TableHead>
                      <TableHead className="text-right py-3">Fit</TableHead>
                      <TableHead className="py-3">Status</TableHead>
                      <TableHead className="py-3" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-12">
                        <Loader2 className="animate-spin mx-auto text-muted-foreground" size={18} />
                      </TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                        Nenhum influenciador qualificado com esses filtros. Salve canais na aba de Prospecção para que apareçam aqui.
                      </TableCell></TableRow>
                    ) : filtered.slice(0, 200).map((p) => {
                      const list = contactsMap[p.id] ?? [];
                      const { email } = emailOf(p);
                      return (
                        <TableRow key={p.id} className="cursor-pointer" onClick={() => setDetail(p)}>
                          <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                            <Checkbox checked={selectedIds.includes(p.id)}
                              onCheckedChange={(v) => setSelectedIds((s) => v ? [...s, p.id] : s.filter((x) => x !== p.id))} />
                          </TableCell>
                          <TableCell className="py-3 max-w-[260px]">
                            <div className="flex items-center gap-3 min-w-0">
                              <ChannelAvatar src={p.thumbnail_url} name={p.channel_name} size={36} />
                              <div className="min-w-0">
                                <p className="font-medium truncate">{p.channel_name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  <span className="uppercase tracking-wide mr-1">
                                    {p.platform === "instagram" ? "Instagram" : "YouTube"}
                                  </span>
                                  · {p.channel_handle || "Handle não informado"}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 max-w-[280px]">
                            {email ? (
                              <span className="text-xs text-primary break-all">{email}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground underline decoration-dotted">
                                Sem e-mail · clique para anotar
                              </span>
                            )}
                            {list.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {list.filter((c) => c.type !== "email").slice(0, 4).map((c) => (
                                  <Badge key={c.id} variant="outline" className="text-[10px]">{contactTypeLabel(c.type)}</Badge>
                                ))}
                              </div>
                            )}
                            {p.notes && (
                              <p className="text-[10px] text-muted-foreground mt-1 truncate">📝 {p.notes}</p>
                            )}
                          </TableCell>
                          <TableCell className="py-3 text-right text-sm">{fmtNum(p.subscriber_count)}</TableCell>
                          <TableCell className="py-3 text-right text-sm">{p.fit_score ?? 0}</TableCell>
                          <TableCell className="py-3"><Badge variant="secondary" className="text-[10px]">{prospectOutreachLabel(p.status)}</Badge></TableCell>
                          <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>

                             <IconAction label="Abrir conversa por e-mail" size="sm" variant="ghost"
                              onClick={() => setThread(p)}>
                              <MessageSquare size={14} />
                             </IconAction>
                             <IconAction label="Criar abordagem com IA" size="sm" variant="ghost"
                              onClick={() => setApproach({ prospect: p, email })}>
                              <Sparkles size={14} className="text-primary" />
                             </IconAction>
                             <IconAction label="Buscar novos contatos" size="sm" variant="ghost" disabled={finding.includes(p.id)}
                              onClick={() => findContacts([p.id])}>
                              {finding.includes(p.id)
                                ? <Loader2 className="animate-spin" size={14} />
                                : <RefreshCw size={14} />}
                             </IconAction>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────────────── CAMPANHAS ─────────────── */}
        <TabsContent value="campanhas" className="space-y-5 mt-5">
          <Card>
            <CardContent className="p-5 lg:p-6">
              <div className="rounded-xl border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="py-3">Campanha</TableHead>
                      <TableHead className="py-3">Criada em</TableHead>
                      <TableHead className="py-3">Status</TableHead>
                      <TableHead className="text-right py-3">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-12 text-sm text-muted-foreground">
                        Nenhuma campanha criada ainda.
                      </TableCell></TableRow>
                    ) : campaigns.map((c) => (
                      <TableRow key={c.id} className="cursor-pointer"
                        onClick={() => { setOpenCampaign(c); loadRecipients(c.id); }}>
                        <TableCell className="py-3">
                          <p className="font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[380px]">{c.subject}</p>
                        </TableCell>
                        <TableCell className="py-3 text-xs text-muted-foreground">
                          {new Date(c.created_at).toLocaleString("pt-BR")}
                        </TableCell>

                        <TableCell className="py-3"><Badge variant="secondary" className="text-[10px]">{c.status}</Badge></TableCell>
                        <TableCell className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1.5">

                             <IconAction label="Iniciar ou continuar a fila de envios" size="sm" variant="outline" disabled={processing === c.id || c.status === "cancelada"}
                              onClick={() => runQueue(c.id)}>
                              {processing === c.id
                                ? <Loader2 className="animate-spin" size={14} />
                                : <PlayCircle size={14} />}
                             </IconAction>
                             <IconAction label="Reenviar para contatos sem resposta" size="sm" variant="ghost" onClick={() => campaignAction("resend_unanswered", c.id)}>
                              <RefreshCw size={14} />
                             </IconAction>
                             <IconAction label="Cancelar envios pendentes" size="sm" variant="ghost" onClick={() => campaignAction("cancel", c.id)}>
                              <Ban size={14} />
                             </IconAction>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────────────── MODELOS ─────────────── */}
        <TabsContent value="modelos" className="space-y-5 mt-5">

          <div className="flex justify-end">
            <Button size="sm" onClick={() => setEditing({ name: "", subject: DEFAULT_TEMPLATE_SUBJECT, bodyText: DEFAULT_TEMPLATE_BODY })}>
              <Plus className="mr-2" size={14} /> Novo modelo
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {templates.length === 0 && (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">
                Nenhum modelo salvo. Crie modelos reutilizáveis com variáveis dinâmicas.
              </CardContent></Card>
            )}
            {templates.map((t) => (
              <Card key={t.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{t.subject}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                       <IconAction label="Enviar teste para o meu e-mail" size="sm" variant="ghost"
                        disabled={testingTemplate === t.id}
                        onClick={() => sendTestTemplate(t.id, t.subject, t.body_html)}>
                        {testingTemplate === t.id ? <Loader2 className="animate-spin" size={14} /> : <SendHorizonal size={14} />}
                       </IconAction>
                       <IconAction label="Editar modelo" size="sm" variant="ghost"
                        onClick={() => setEditing({ ...t, bodyText: emailHtmlToText(t.body_html || "") })}>
                        <FileText size={14} />
                       </IconAction>
                       <IconAction label="Excluir modelo" size="sm" variant="ghost" onClick={async () => {
                        await (supabase as any).from("influencer_email_templates").delete().eq("id", t.id);
                        loadTemplates();
                      }}>
                        <Trash2 size={14} />
                       </IconAction>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                    {emailHtmlToText(t.body_html || "")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Compose */}
      <OutreachComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        targets={selectedTargets}
        onCreated={(id) => { setSelectedIds([]); setTab("campanhas"); loadCampaigns(); runQueue(id); }}
      />

      {/* Detalhe da campanha */}
      <Dialog open={!!openCampaign} onOpenChange={(v) => !v && setOpenCampaign(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{openCampaign?.name}</DialogTitle></DialogHeader>
          {(() => {
            const total = recipients.length || 1;
            const done = recipients.filter((r) => ["enviado", "respondido", "falhou", "cancelado"].includes(r.status)).length;
            const sent = recipients.filter((r) => ["enviado", "respondido"].includes(r.status)).length;
            const replied = recipients.filter((r) => r.status === "respondido").length;
            const failed = recipients.filter((r) => r.status === "falhou").length;
            return (
              <div className="space-y-4">
                <Progress value={(done / total) * 100} className="h-2" />
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[["Total", recipients.length], ["Enviados", sent], ["Respostas", replied], ["Falhas", failed]].map(([l, v]) => (
                    <div key={String(l)} className="rounded-xl border border-border p-3">
                      <p className="text-lg font-semibold">{v as number}</p>
                      <p className="text-[11px] text-muted-foreground">{l as string}</p>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="rounded-xl border border-border overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Destinatário</TableHead><TableHead>Status</TableHead>
                      <TableHead>Enviado em</TableHead><TableHead>Erro</TableHead><TableHead />
                    </TableRow></TableHeader>
                    <TableBody>
                      {recipients.map((r) => {
                        const meta = sendStatusMeta(r.status);
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="text-xs break-all max-w-[240px]">{r.email}</TableCell>
                            <TableCell><Badge variant={meta.variant} className="text-[10px]">{meta.label}</Badge></TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {r.sent_at ? new Date(r.sent_at).toLocaleString("pt-BR") : "—"}
                            </TableCell>
                            <TableCell className="text-xs text-destructive max-w-[220px] truncate">{r.error_message || "—"}</TableCell>
                            <TableCell className="flex gap-1">
                               <IconAction label="Abrir conversa com este influenciador" size="sm" variant="ghost"
                                onClick={() => {
                                  const p = prospects.find((x) => x.id === r.prospect_id);
                                  if (p) { setOpenCampaign(null); setThread(p); }
                                }}>
                                <MessageSquare size={14} />
                               </IconAction>
                              {r.status === "enviado" && (
                                 <IconAction label="Marcar manualmente como respondido" size="sm" variant="ghost"
                                  onClick={async () => {
                                    await supabase.functions.invoke("influencer-outreach", {
                                      body: { action: "mark_replied", recipient_id: r.id },
                                    });
                                    loadRecipients(openCampaign.id);
                                  }}>
                                  <MessageSquareReply size={14} />
                                 </IconAction>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Editor de modelo */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar modelo" : "Novo modelo"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nome</Label>
              <Input value={editing?.name ?? ""} onChange={(e) => setEditing((s: any) => ({ ...s, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Assunto</Label>
              <Input value={editing?.subject ?? ""} onChange={(e) => setEditing((s: any) => ({ ...s, subject: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Mensagem</Label>
              <Textarea rows={12} value={editing?.bodyText ?? ""}
                onChange={(e) => setEditing((s: any) => ({ ...s, bodyText: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" disabled={testingTemplate === "editor"}
                onClick={() => sendTestTemplate("editor", editing?.subject ?? "", textToEmailHtml(editing?.bodyText || ""))}>
                {testingTemplate === "editor" ? <Loader2 className="animate-spin mr-2" size={14} /> : <SendHorizonal className="mr-2" size={14} />}
                Enviar teste
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={saveTemplate}>Salvar modelo</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ficha de contatos do influenciador (abre ao clicar no canal) */}
      <InfluencerThreadDialog
        prospect={thread}
        defaultEmail={thread ? emailOf(thread).email : ""}
        onClose={() => setThread(null)}
        onChanged={loadProspects}
      />

      <InfluencerContactsDialog
        prospect={detail}
        contacts={contactsMap[detail?.id] ?? []}
        onClose={() => setDetail(null)}
        onChanged={loadProspects}
        onFind={(id) => findContacts([id])}
        onOpenThread={() => { const p = detail; setDetail(null); setThread(p); }}
        finding={finding.includes(detail?.id)}
      />
    </div>
    </TooltipProvider>
  );
}
