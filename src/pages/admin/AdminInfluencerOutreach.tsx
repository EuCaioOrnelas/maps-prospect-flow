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
import { PageHeader } from "@/components/partners/PageHeader";
import { OutreachComposeDialog } from "@/components/admin/partners/OutreachComposeDialog";
import { useToast } from "@/hooks/use-toast";
import { fmtNum } from "@/lib/influencerProspecting";
import {
  CONTACT_TYPES, CONTACT_STATUSES, DEFAULT_TEMPLATE_BODY, DEFAULT_TEMPLATE_SUBJECT,
  confidenceMeta, contactStatusLabel, contactTypeLabel, emailHtmlToText, sendStatusMeta,
  sourceLabel, textToEmailHtml, PROSPECT_OUTREACH_STATUSES, prospectOutreachLabel,
} from "@/lib/influencerOutreach";
import {
  Loader2, Mail, Search, Send, RefreshCw, Plus, Trash2, FileText, Users,
  CheckCircle2, XCircle, MessageSquareReply, Ban, PlayCircle, Filter,
} from "lucide-react";

const PAGE = 25;

export default function AdminInfluencerOutreach() {
  const { toast } = useToast();
  const [tab, setTab] = useState("abordagens");

  // ── Abordagens ────────────────────────────────────────────────────────────
  const [prospects, setProspects] = useState<any[]>([]);
  const [contactsMap, setContactsMap] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [contactFilter, setContactFilter] = useState("com_email");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [finding, setFinding] = useState<string[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);

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
    const { data } = await (supabase as any)
      .from("influencer_prospects")
      .select("*")
      .order("fit_score", { ascending: false })
      .limit(400);
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
    const c = (contactsMap[p.id] ?? []).find((x) => x.type === "email" && x.status !== "nao_contatar");
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
    if (action === "retry") runQueue(campaignId);
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
    <div className="space-y-6">
      <PageHeader
        title="Abordagem de Influenciadores"
        icon={Mail}
        subtitle="Identifique canais de contato, personalize a mensagem e acompanhe as respostas das parcerias."
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="abordagens">Abordagens</TabsTrigger>
          <TabsTrigger value="campanhas">Campanhas</TabsTrigger>
          <TabsTrigger value="modelos">Modelos</TabsTrigger>
        </TabsList>

        {/* ─────────────── ABORDAGENS ─────────────── */}
        <TabsContent value="abordagens" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4 space-y-4">
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
                      <TableHead className="w-10">
                        <Checkbox checked={allVisibleSelected}
                          onCheckedChange={(v) => setSelectedIds(v ? filtered.map((p) => p.id) : [])} />
                      </TableHead>
                      <TableHead>Canal</TableHead>
                      <TableHead>Contatos</TableHead>
                      <TableHead className="text-right">Inscritos</TableHead>
                      <TableHead className="text-right">Fit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-10">
                        <Loader2 className="animate-spin mx-auto text-muted-foreground" size={18} />
                      </TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-10 text-sm text-muted-foreground">
                        Nenhum influenciador encontrado com esses filtros.
                      </TableCell></TableRow>
                    ) : filtered.slice(0, 200).map((p) => {
                      const list = contactsMap[p.id] ?? [];
                      const { email } = emailOf(p);
                      return (
                        <TableRow key={p.id} className="cursor-pointer" onClick={() => setDetail(p)}>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox checked={selectedIds.includes(p.id)}
                              onCheckedChange={(v) => setSelectedIds((s) => v ? [...s, p.id] : s.filter((x) => x !== p.id))} />
                          </TableCell>
                          <TableCell className="max-w-[240px]">
                            <p className="font-medium truncate">{p.channel_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{p.channel_handle || "Handle não informado"}</p>
                          </TableCell>
                          <TableCell className="max-w-[280px]">
                            {email ? (
                              <span className="text-xs text-primary break-all">{email}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Sem e-mail</span>
                            )}
                            {list.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {list.filter((c) => c.type !== "email").slice(0, 4).map((c) => (
                                  <Badge key={c.id} variant="outline" className="text-[10px]">{contactTypeLabel(c.type)}</Badge>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm">{fmtNum(p.subscriber_count)}</TableCell>
                          <TableCell className="text-right text-sm">{p.fit_score ?? 0}</TableCell>
                          <TableCell><Badge variant="secondary" className="text-[10px]">{prospectOutreachLabel(p.status)}</Badge></TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="ghost" disabled={finding.includes(p.id)}
                              onClick={() => findContacts([p.id])}>
                              {finding.includes(p.id)
                                ? <Loader2 className="animate-spin" size={14} />
                                : <RefreshCw size={14} />}
                            </Button>
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
        <TabsContent value="campanhas" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="rounded-xl border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campanha</TableHead>
                      <TableHead>Criada em</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-10 text-sm text-muted-foreground">
                        Nenhuma campanha criada ainda.
                      </TableCell></TableRow>
                    ) : campaigns.map((c) => (
                      <TableRow key={c.id} className="cursor-pointer"
                        onClick={() => { setOpenCampaign(c); loadRecipients(c.id); }}>
                        <TableCell>
                          <p className="font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[380px]">{c.subject}</p>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(c.created_at).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="text-[10px]">{c.status}</Badge></TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" disabled={processing === c.id || c.status === "cancelada"}
                              onClick={() => runQueue(c.id)}>
                              {processing === c.id
                                ? <Loader2 className="animate-spin" size={14} />
                                : <PlayCircle size={14} />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => campaignAction("retry", c.id)}>
                              <RefreshCw size={14} />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => campaignAction("cancel", c.id)}>
                              <Ban size={14} />
                            </Button>
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
        <TabsContent value="modelos" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setEditing({ name: "", subject: DEFAULT_TEMPLATE_SUBJECT, bodyText: DEFAULT_TEMPLATE_BODY })}>
              <Plus className="mr-2" size={14} /> Novo modelo
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
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
                      <Button size="sm" variant="ghost"
                        onClick={() => setEditing({ ...t, bodyText: emailHtmlToText(t.body_html || "") })}>
                        <FileText size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={async () => {
                        await (supabase as any).from("influencer_email_templates").delete().eq("id", t.id);
                        loadTemplates();
                      }}>
                        <Trash2 size={14} />
                      </Button>
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
                            <TableCell>
                              {r.status === "enviado" && (
                                <Button size="sm" variant="ghost" title="Marcar como respondido"
                                  onClick={async () => {
                                    await supabase.functions.invoke("influencer-outreach", {
                                      body: { action: "mark_replied", recipient_id: r.id },
                                    });
                                    loadRecipients(openCampaign.id);
                                  }}>
                                  <MessageSquareReply size={14} />
                                </Button>
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
              <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={saveTemplate}>Salvar modelo</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contatos do influenciador */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{detail?.channel_name}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {(contactsMap[detail?.id] ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum canal de contato identificado. Use “Buscar contatos” para varrer o YouTube e o site oficial.
              </p>
            ) : (contactsMap[detail?.id] ?? []).map((c) => {
              const conf = confidenceMeta(c.confidence);
              return (
                <div key={c.id} className="rounded-xl border border-border p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[10px]">{contactTypeLabel(c.type)}</Badge>
                    <span className={`inline-flex items-center gap-1 text-[11px] ${conf.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${conf.dot}`} /> Confiança {conf.label}
                    </span>
                  </div>
                  <p className="text-sm break-all">{c.value}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {(c.sources ?? []).map(sourceLabel).join(" · ") || "Origem não informada"} · {contactStatusLabel(c.status)}
                  </p>
                  <Select value={c.status} onValueChange={async (v) => {
                    await (supabase as any).from("influencer_contacts").update({ status: v }).eq("id", c.id);
                    loadProspects();
                  }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONTACT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
