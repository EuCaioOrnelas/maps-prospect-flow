import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  Lightbulb, Search, Eye, CheckCheck, Archive, CalendarDays, TrendingUp, Tag,
  Hammer, Loader2, CircleDot, OctagonAlert, PackageCheck, ThumbsUp,
  BrainCircuit, LayoutDashboard, ListChecks, CalendarClock, RefreshCw, Save,
} from "lucide-react";
import {
  SUGGESTION_ALL_CATEGORIES,
  SUGGESTION_PERIODS,
  SUGGESTION_STATUS_LABEL,
  SUGGESTION_STATUS_BADGE_CLASS,
  SUGGESTION_AI_STATUS_LABEL,
  IMPORTANCE_MAP,
  formatSuggestionDate,
  periodToRange,
  type SuggestionPeriod,
  type SuggestionRow,
  type SuggestionStatus,
} from "@/lib/suggestions";
import SuggestionsDashboard from "@/components/admin/suggestions/SuggestionsDashboard";
import SuggestionGroupsPanel from "@/components/admin/suggestions/SuggestionGroupsPanel";
import SuggestionCyclesPanel from "@/components/admin/suggestions/SuggestionCyclesPanel";

const PAGE_SIZE = 20;

const IMPORTANCE_ICON: Record<string, typeof CircleDot> = {
  comodidade: CircleDot,
  melhoraria: TrendingUp,
  bloqueio: OctagonAlert,
};

const IMPORTANCE_SHORT: Record<string, string> = {
  comodidade: "Comodidade",
  melhoraria: "Melhoria",
  bloqueio: "Bloqueio",
};

const ALL_STATUSES: SuggestionStatus[] = [
  "recebida", "em_analise", "em_avaliacao_comunidade", "planejada",
  "em_desenvolvimento", "implementada", "nao_planejada",
  "lida", "entregue", "arquivada",
];

function importanceBadge(value: string) {
  const item = IMPORTANCE_MAP[value as keyof typeof IMPORTANCE_MAP];
  if (!item) return <Badge variant="outline">—</Badge>;
  const Icon = IMPORTANCE_ICON[value] || CircleDot;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`${item.badgeClass} gap-1.5 font-medium`}>
            <Icon size={13} />
            {IMPORTANCE_SHORT[value] || item.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{item.label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function statusBadge(value: string) {
  const label = SUGGESTION_STATUS_LABEL[value as SuggestionStatus] || value;
  return (
    <Badge variant="outline" className={SUGGESTION_STATUS_BADGE_CLASS[value] || ""}>
      {label}
    </Badge>
  );
}

function aiStatusBadge(value: string) {
  const label = SUGGESTION_AI_STATUS_LABEL[value] || value;
  const cls =
    value === "analisada" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" :
    value === "falha" ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" :
    value === "revisao" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" :
    "bg-muted text-muted-foreground border-border";
  return <Badge variant="outline" className={cls}>{label}</Badge>;
}

export default function AdminSuggestions() {
  const { toast } = useToast();

  const [period, setPeriod] = useState<SuggestionPeriod>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [aiFilter, setAiFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);

  const [rows, setRows] = useState<SuggestionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [groupNames, setGroupNames] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<SuggestionRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);

  const range = useMemo(
    () => periodToRange(period, customFrom, customTo),
    [period, customFrom, customTo]
  );

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(0); }, [period, customFrom, customTo, category, status, aiFilter]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("suggestions")
        .select("*", { count: "exact" })
        .gte("created_at", range.from.toISOString())
        .lte("created_at", range.to.toISOString())
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (category !== "all") query = query.eq("category", category);
      if (status !== "all") query = query.eq("status", status);
      if (aiFilter !== "all") query = query.eq("ai_status", aiFilter);
      if (debouncedSearch) {
        const term = `%${debouncedSearch}%`;
        query = query.or(
          `company_name.ilike.${term},title.ilike.${term},user_name.ilike.${term},user_email.ilike.${term}`
        );
      }

      const { data, count, error } = await query;
      if (error) throw error;
      const list = (data || []) as unknown as SuggestionRow[];
      setRows(list);
      setTotal(count || 0);

      // Nomes dos grupos vinculados
      const groupIds = [...new Set(list.map((r) => r.ai_group_id).filter(Boolean))] as string[];
      if (groupIds.length > 0) {
        const { data: gs } = await supabase
          .from("suggestion_groups")
          .select("id, name")
          .in("id", groupIds);
        const map: Record<string, string> = {};
        ((gs || []) as any[]).forEach((g) => { map[g.id] = g.name; });
        setGroupNames((prev) => ({ ...prev, ...map }));
      }
    } catch (e: any) {
      toast({ title: "Erro ao carregar sugestões", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, category, status, aiFilter, debouncedSearch, page, toast]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const audit = async (action: string, entityId: string, details: Record<string, unknown> = {}) => {
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("suggestion_audit_log").insert({
      actor_id: userData.user?.id ?? null,
      action,
      entity: "suggestion",
      entity_id: entityId,
      details,
    } as any);
  };

  // Dispara o e-mail "Estamos trabalhando em melhorias..." — 1x por sugestão
  const notifyInDevelopment = async (row: SuggestionRow): Promise<"sent" | "skipped"> => {
    if ((row.metadata as any)?.dev_email_sent_at) return "skipped";

    const { error } = await supabase.functions.invoke("send-email", {
      body: {
        user_id: row.user_id,
        email_type: "SUGGESTION_IN_DEVELOPMENT",
        idempotency_key: `suggestion-dev-${row.id}`,
        payload: {
          area: row.category,
          suggestion_title: row.title,
        },
      },
    });
    if (error) throw error;

    // Carimbo só após envio bem-sucedido (permite nova tentativa em caso de falha)
    await supabase
      .from("suggestions")
      .update({
        metadata: { ...((row.metadata as any) || {}), dev_email_sent_at: new Date().toISOString() },
      } as any)
      .eq("id", row.id);
    return "sent";
  };

  const markNotified = (id: string) => {
    const stamp = new Date().toISOString();
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, metadata: { ...(r.metadata || {}), dev_email_sent_at: stamp } } : r))
    );
    setSelected((prev) =>
      prev && prev.id === id ? { ...prev, metadata: { ...(prev.metadata || {}), dev_email_sent_at: stamp } } : prev
    );
  };

  const updateStatus = async (id: string, next: SuggestionStatus) => {
    setBusy(true);
    try {
      const patch: Record<string, unknown> = { status: next };
      if (next === "implementada") patch.implemented_at = new Date().toISOString();
      const { error } = await supabase.from("suggestions").update(patch as any).eq("id", id);
      if (error) throw error;

      await audit("alterar_status", id, { status: next });

      const row = rows.find((r) => r.id === id) || (selected?.id === id ? selected : null);
      if (next === "em_desenvolvimento" && row) {
        try {
          const result = await notifyInDevelopment(row);
          if (result === "sent") markNotified(id);
        } catch (e: any) {
          toast({ title: "Status atualizado, mas o e-mail falhou", description: e.message, variant: "destructive" });
        }
      }

      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: next } : r)));
      setSelected((prev) => (prev && prev.id === id ? { ...prev, status: next } : prev));
      toast({ title: `Sugestão marcada como ${SUGGESTION_STATUS_LABEL[next]}` });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const saveAdminNotes = async () => {
    if (!selected) return;
    setSavingNotes(true);
    const { error } = await supabase
      .from("suggestions")
      .update({ admin_notes: adminNotes } as any)
      .eq("id", selected.id);
    setSavingNotes(false);
    if (error) {
      toast({ title: "Erro ao salvar observações", description: error.message, variant: "destructive" });
      return;
    }
    await audit("observacoes_internas", selected.id, {});
    setSelected({ ...selected, admin_notes: adminNotes });
    setRows((prev) => prev.map((r) => (r.id === selected.id ? { ...r, admin_notes: adminNotes } : r)));
    toast({ title: "Observações salvas" });
  };

  const reanalyze = async (id: string) => {
    setReanalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggestions-analyst", {
        body: { action: "reanalyze", suggestion_id: id },
      });
      if (error) throw error;
      toast({ title: "Análise concluída", description: "A IA reprocessou esta sugestão." });
      fetchRows();
      if (selected?.id === id) {
        const { data: fresh } = await supabase.from("suggestions").select("*").eq("id", id).single();
        if (fresh) setSelected(fresh as unknown as SuggestionRow);
      }
    } catch (e: any) {
      toast({ title: "Erro na análise", description: e.message, variant: "destructive" });
    } finally {
      setReanalyzing(false);
    }
  };

  const toggleRow = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.includes(r.id));
  const toggleAll = () =>
    setSelectedIds((prev) => (allSelected ? prev.filter((id) => !rows.some((r) => r.id === id)) : [...new Set([...prev, ...rows.map((r) => r.id)])]));

  const bulkMarkInDevelopment = async () => {
    if (selectedIds.length === 0) return;
    setBulkBusy(true);
    try {
      const targets = rows.filter((r) => selectedIds.includes(r.id));
      const { error } = await supabase
        .from("suggestions")
        .update({ status: "em_desenvolvimento" })
        .in("id", selectedIds);
      if (error) throw error;

      let sent = 0;
      let skipped = 0;
      let failed = 0;
      for (const row of targets) {
        try {
          const result = await notifyInDevelopment(row);
          if (result === "sent") { sent++; markNotified(row.id); } else skipped++;
        } catch { failed++; }
      }

      setRows((prev) =>
        prev.map((r) => (selectedIds.includes(r.id) ? { ...r, status: "em_desenvolvimento" } : r))
      );
      setSelectedIds([]);
      toast({
        title: `${targets.length} sugestão(ões) em desenvolvimento`,
        description: `${sent} e-mail(s) enviado(s)${skipped ? ` · ${skipped} já avisado(s)` : ""}${failed ? ` · ${failed} falha(s)` : ""}.`,
      });
    } catch (e: any) {
      toast({ title: "Erro na ação em massa", description: e.message, variant: "destructive" });
    } finally {
      setBulkBusy(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">

      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Lightbulb size={22} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Wiize Evolui — Central de Inteligência de Sugestões</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Todas as sugestões dos clientes, análise de IA e planejamento mensal de evolução.
          </p>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="dashboard">
            <LayoutDashboard size={14} className="mr-1.5 hidden sm:inline" />
            Visão geral
          </TabsTrigger>
          <TabsTrigger value="lista">
            <ListChecks size={14} className="mr-1.5 hidden sm:inline" />
            Sugestões
          </TabsTrigger>
          <TabsTrigger value="grupos">
            <BrainCircuit size={14} className="mr-1.5 hidden sm:inline" />
            Análise inteligente
          </TabsTrigger>
          <TabsTrigger value="planejamento">
            <CalendarClock size={14} className="mr-1.5 hidden sm:inline" />
            Planejamento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <SuggestionsDashboard />
        </TabsContent>

        <TabsContent value="lista" className="space-y-6">
          {/* Filtros */}
          <Card className="border-border/60">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-end gap-3">
                <div className="space-y-1.5 lg:w-44">
                  <Label className="text-xs text-muted-foreground">Período</Label>
                  <Select value={period} onValueChange={(v) => setPeriod(v as SuggestionPeriod)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SUGGESTION_PERIODS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {period === "custom" && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">De</Label>
                      <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Até</Label>
                      <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                    </div>
                  </>
                )}

                <div className="space-y-1.5 lg:w-48">
                  <Label className="text-xs text-muted-foreground">Categoria</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {SUGGESTION_ALL_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 lg:w-48">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {ALL_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{SUGGESTION_STATUS_LABEL[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 lg:w-44">
                  <Label className="text-xs text-muted-foreground">Análise IA</Label>
                  <Select value={aiFilter} onValueChange={setAiFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {Object.entries(SUGGESTION_AI_STATUS_LABEL).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 flex-1">
                  <Label className="text-xs text-muted-foreground">Pesquisar</Label>
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Empresa, título ou usuário"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ações em massa */}
          {selectedIds.length > 0 && (
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm text-foreground">
                  <strong>{selectedIds.length}</strong> sugestão(ões) selecionada(s)
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" disabled={bulkBusy} onClick={() => setSelectedIds([])}>
                    Limpar
                  </Button>
                  <Button size="sm" disabled={bulkBusy} onClick={bulkMarkInDevelopment}>
                    {bulkBusy ? <Loader2 size={15} className="mr-2 animate-spin" /> : <Hammer size={15} className="mr-2" />}
                    Marcar como Em desenvolvimento + avisar clientes
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabela */}
          <Card className="border-border/60">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : rows.length === 0 ? (
                <div className="py-16 px-6 flex flex-col items-center text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
                    <Lightbulb size={24} className="text-muted-foreground/40" />
                  </div>
                  <div className="space-y-1 max-w-md">
                    <p className="font-medium text-foreground">Nenhuma sugestão encontrada.</p>
                    <p className="text-sm text-muted-foreground">
                      Quando clientes começarem a enviar sugestões, elas aparecerão aqui.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto animate-fade-in">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Selecionar todos" />
                        </TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead className="text-center">Votos</TableHead>
                        <TableHead>Grupo IA</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Análise IA</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.id} data-state={selectedIds.includes(r.id) ? "selected" : undefined}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.includes(r.id)}
                              onCheckedChange={() => toggleRow(r.id)}
                              aria-label={`Selecionar ${r.title}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{r.company_name || "—"}</TableCell>
                          <TableCell>
                            <div className="text-sm">{r.user_name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{r.user_email || ""}</div>
                          </TableCell>
                          <TableCell className="text-sm">{r.category}</TableCell>
                          <TableCell className="max-w-[220px] truncate text-sm">{r.title}</TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center gap-1 text-sm">
                              <ThumbsUp size={12} className="text-muted-foreground" />
                              {r.vote_count}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground">
                            {r.ai_group_id ? groupNames[r.ai_group_id] || "—" : "—"}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{formatSuggestionDate(r.created_at)}</TableCell>
                          <TableCell>{statusBadge(r.status)}</TableCell>
                          <TableCell>{aiStatusBadge(r.ai_status)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => { setSelected(r); setAdminNotes(r.admin_notes || ""); }}>
                              <Eye size={15} className="mr-1.5" /> Visualizar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Paginação */}
          {!loading && total > PAGE_SIZE && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{total} sugestões · página {page + 1} de {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="grupos">
          <SuggestionGroupsPanel />
        </TabsContent>

        <TabsContent value="planejamento">
          <SuggestionCyclesPanel />
        </TabsContent>
      </Tabs>

      {/* Modal de detalhes */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6">{selected.title}</DialogTitle>
                <DialogDescription>{formatSuggestionDate(selected.created_at)}</DialogDescription>
              </DialogHeader>

              <div className="mt-2 space-y-5">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Empresa</p>
                    <p className="text-foreground">{selected.company_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Usuário</p>
                    <p className="text-foreground">{selected.user_name || "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">E-mail</p>
                    <p className="text-foreground break-all">{selected.user_email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Categoria</p>
                    <p className="text-foreground">{selected.category}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <div className="mt-1">{statusBadge(selected.status)}</div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Importância</p>
                    {importanceBadge(selected.importance)}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Votos da comunidade</p>
                    <p className="text-foreground inline-flex items-center gap-1">
                      <ThumbsUp size={13} className="text-muted-foreground" /> {selected.vote_count}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Descrição</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selected.description}
                  </p>
                </div>

                {(selected.problem || selected.expected_behavior || selected.expected_benefit) && (
                  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                    {selected.problem && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Problema a resolver</p>
                        <p className="text-sm text-foreground">{selected.problem}</p>
                      </div>
                    )}
                    {selected.expected_behavior && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Como deveria funcionar</p>
                        <p className="text-sm text-foreground">{selected.expected_behavior}</p>
                      </div>
                    )}
                    {selected.expected_benefit && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Benefício esperado</p>
                        <p className="text-sm text-foreground">{selected.expected_benefit}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Análise da IA */}
                <div className="rounded-lg border border-primary/25 bg-primary/5 p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
                      <BrainCircuit size={15} className="text-primary" /> Análise da IA
                    </p>
                    {aiStatusBadge(selected.ai_status)}
                  </div>
                  {selected.ai_summary ? (
                    <>
                      <p className="text-xs text-foreground/80 leading-relaxed">{selected.ai_summary}</p>
                      {(selected.metadata as any)?.ai_analysis?.justificativa && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {(selected.metadata as any).ai_analysis.justificativa}
                        </p>
                      )}
                      {selected.ai_category && (
                        <p className="text-[11px] text-muted-foreground">
                          Categoria sugerida: {selected.ai_category}
                          {selected.ai_group_id && groupNames[selected.ai_group_id]
                            ? ` · Grupo: ${groupNames[selected.ai_group_id]}`
                            : ""}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Ainda não analisada. Clique em "Analisar com IA" para processar.
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={reanalyzing}
                    onClick={() => reanalyze(selected.id)}
                  >
                    {reanalyzing ? <Loader2 size={13} className="mr-1.5 animate-spin" /> : <RefreshCw size={13} className="mr-1.5" />}
                    {selected.ai_summary ? "Reexecutar análise" : "Analisar com IA"}
                  </Button>
                </div>

                {/* Observações internas */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Observações internas (visíveis só para administradores)</p>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    className="resize-none text-sm"
                    placeholder="Anotações da equipe sobre esta sugestão..."
                  />
                  <Button variant="outline" size="sm" disabled={savingNotes} onClick={saveAdminNotes}>
                    {savingNotes ? <Loader2 size={13} className="mr-1.5 animate-spin" /> : <Save size={13} className="mr-1.5" />}
                    Salvar observações
                  </Button>
                </div>

                {/* Alteração de status */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Alterar status</p>
                  <div className="flex flex-wrap gap-2">
                    {ALL_STATUSES.filter((s) => s !== selected.status).map((s) => (
                      <Button
                        key={s}
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => updateStatus(selected.id, s)}
                      >
                        {SUGGESTION_STATUS_LABEL[s]}
                      </Button>
                    ))}
                  </div>
                  {selected.status === "em_desenvolvimento" && (
                    <p className="text-[11px] text-muted-foreground">
                      {(selected.metadata as any)?.dev_email_sent_at
                        ? "Cliente já avisado por e-mail."
                        : "O cliente será avisado por e-mail ao entrar em desenvolvimento."}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
