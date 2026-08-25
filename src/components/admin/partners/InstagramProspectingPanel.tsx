import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ChannelAvatar } from "@/components/admin/partners/ChannelAvatar";
import { InfluencerDetailSheet } from "@/components/admin/partners/InfluencerDetailSheet";
import { exportProspectsPdf, exportProspectsXlsx } from "@/lib/influencerExport";
import {
  PROSPECT_STATUSES,
  IG_PROGRESS_STEPS,
  fitBadgeVariant,
  fmtNum,
  fmtPct,
  statusLabel,
} from "@/lib/influencerProspecting";
import {
  Loader2, Search, Instagram, X, Plus, BookmarkPlus, CheckCircle2, Gauge, Globe, Languages,
  ListOrdered, Users, Tags, SlidersHorizontal, Sparkles, Target, Filter, ArrowUpDown, TrendingUp,
  BadgeCheck, Heart, CheckSquare, ListChecks, FileSpreadsheet, FileText, ChevronLeft, ChevronRight,
  RefreshCw, CalendarClock,
} from "lucide-react";

function FieldLabel({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <Icon size={13} className="text-primary/70" />
      {children}
    </Label>
  );
}

function SectionTitle({ icon: Icon, title, description }: { icon: any; title: string; description?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-9 w-9 rounded-[10px] bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center text-primary shrink-0">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight">{title}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

const DEFAULT_TERMS = ["vendas B2B", "prospecção comercial", "CRM", "empreendedorismo B2B"];

export function InstagramProspectingPanel() {
  const { toast } = useToast();

  const [description, setDescription] = useState("");
  const [terms, setTerms] = useState<string[]>(DEFAULT_TERMS);
  const [termInput, setTermInput] = useState("");
  const [country, setCountry] = useState("BR");
  const [language, setLanguage] = useState("pt");
  const [resultsRequested, setResultsRequested] = useState("20");
  const [minFollowers, setMinFollowers] = useState("5000");
  const [maxFollowers, setMaxFollowers] = useState("500000");
  const [accountType, setAccountType] = useState("all");
  const [includeExisting, setIncludeExisting] = useState(false);

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [rows, setRows] = useState<any[]>([]);
  const [usage, setUsage] = useState<any | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [lastRun, setLastRun] = useState<any | null>(null);
  const [savingIds, setSavingIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reanalyzing, setReanalyzing] = useState(false);

  const [selected, setSelected] = useState<any | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [sortBy, setSortBy] = useState("fit_score");
  const [statusFilter, setStatusFilter] = useState("all");
  const [minScore, setMinScore] = useState("0");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState("20");
  const [page, setPage] = useState(1);

  const loadProspects = async () => {
    const { data } = await (supabase as any)
      .from("influencer_prospects")
      .select("*")
      .eq("platform", "instagram")
      .order("fit_score", { ascending: false })
      .limit(2000);
    setRows(data ?? []);
  };

  const applyUsage = (u: any) => {
    if (!u) return;
    setUsage(u);
    setCooldown(u.cooldown_seconds_remaining ?? 0);
  };

  const loadUsage = async () => {
    const { data } = await supabase.functions.invoke("instagram-influencer-prospect", {
      body: { action: "quota" },
    });
    applyUsage(data?.usage);
  };

  useEffect(() => {
    loadProspects();
    loadUsage();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  useEffect(() => {
    if (!loading) return;
    setStep(0);
    const id = setInterval(() => setStep((s) => Math.min(s + 1, IG_PROGRESS_STEPS.length - 2)), 3500);
    return () => clearInterval(id);
  }, [loading]);

  useEffect(() => { setPage(1); }, [search, statusFilter, minScore, sortBy, pageSize]);

  const addTerm = () => {
    const v = termInput.trim();
    if (!v || terms.includes(v)) return;
    setTerms([...terms, v]);
    setTermInput("");
  };

  const runSearch = async () => {
    if (loading) return;
    if (cooldown > 0) {
      toast({ title: `Aguarde ${cooldown}s para iniciar outra prospecção.`, variant: "destructive" });
      return;
    }
    if (description.trim().length < 10 && terms.length === 0) {
      toast({ title: "Descreva o criador ideal ou adicione ao menos um termo.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setLastRun(null);
    try {
      const { data, error } = await supabase.functions.invoke("instagram-influencer-prospect", {
        body: {
          action: "search",
          query_description: description,
          terms,
          keywords: terms,
          country,
          language,
          min_followers: Number(minFollowers) || 0,
          max_followers: Number(maxFollowers) || 0,
          account_type: accountType,
          include_existing: includeExisting,
          results_requested: Number(resultsRequested),
        },
      });
      if (error) {
        let message = (error as any).message;
        try {
          const payload = await (error as any).context?.json?.();
          if (payload?.error) message = payload.error;
          if (payload?.usage) applyUsage(payload.usage);
        } catch { /* corpo não-JSON */ }
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);
      applyUsage(data?.usage);

      // A busca roda em segundo plano na edge function (pode passar de 150s).
      // Acompanhamos o progresso pelo registro em influencer_searches.
      let finalRow: any = null;
      if (data?.search_id) {
        const deadline = Date.now() + 15 * 60 * 1000;
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 5000));
          const { data: row } = await supabase
            .from("influencer_searches")
            .select("status, results_found, stats, error_message")
            .eq("id", data.search_id)
            .maybeSingle();
          if (!row) continue;
          if (row.status === "error") throw new Error(row.error_message || "A prospecção falhou.");
          if (row.status === "done") { finalRow = row; break; }
        }
        if (!finalRow) throw new Error("A prospecção demorou mais que o esperado. Recarregue em instantes para ver os resultados.");
      }

      const stats = (finalRow?.stats ?? {}) as any;
      setLastRun({
        search_id: data?.search_id,
        prospects: new Array(finalRow?.results_found ?? 0),
        discovered: stats.discovered,
        duplicated: stats.duplicated,
        analyzed: stats.analyzed,
        filtered_out: stats.filtered_out,
        serp_credits: stats.serp_credits,
      });
      await loadProspects();
      loadUsage();
      setPage(1);
      setStep(IG_PROGRESS_STEPS.length - 1);
      toast({
        title: finalRow?.results_found
          ? `Encontramos ${finalRow.results_found} perfis do Instagram.`
          : finalRow?.error_message || "Nenhum perfil encontrado.",
      });
    } catch (e: any) {
      toast({ title: "Não foi possível concluir a prospecção", description: e.message, variant: "destructive" });
      loadUsage();
    } finally {
      setLoading(false);
    }
  };

  const reanalyze = async () => {
    if (selectedIds.length === 0 || reanalyzing) return;
    setReanalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("instagram-influencer-prospect", {
        body: {
          action: "reanalyze",
          prospect_ids: selectedIds,
          query_description: description,
          keywords: terms,
        },
      });
      if (error || data?.error) throw new Error(data?.error || (error as any).message);
      await loadProspects();
      toast({ title: `${data?.updated ?? 0} perfil(is) reanalisado(s) pela IA.` });
    } catch (e: any) {
      toast({ title: "Não foi possível reanalisar", description: e.message, variant: "destructive" });
    } finally {
      setReanalyzing(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setRows((p) => p.map((x) => (x.id === id ? { ...x, status } : x)));
    setSelected((s: any) => (s && s.id === id ? { ...s, status } : s));
    const { data, error } = await supabase.functions.invoke("youtube-influencer-prospect", {
      body: { action: "update_status", prospect_id: id, status },
    });
    if (error || data?.error) toast({ title: "Erro ao atualizar status", variant: "destructive" });
  };

  const updateStatusBulk = async (ids: string[], status: string) => {
    if (ids.length === 0) return;
    setRows((p) => p.map((x) => (ids.includes(x.id) ? { ...x, status } : x)));
    const { data, error } = await supabase.functions.invoke("youtube-influencer-prospect", {
      body: { action: "update_status", prospect_ids: ids, status },
    });
    if (error || data?.error) {
      toast({ title: "Erro ao atualizar status em lote", variant: "destructive" });
      await loadProspects();
    } else {
      toast({ title: `${ids.length} perfil(is) movidos para "${statusLabel(status)}".` });
    }
  };

  const saveProspect = async (p: any) => {
    if (savingIds.includes(p.id)) return;
    setSavingIds((s) => [...s, p.id]);
    setRows((list) => list.map((x) => (x.id === p.id ? { ...x, saved: true, status: "qualificado" } : x)));
    const { data, error } = await supabase.functions.invoke("youtube-influencer-prospect", {
      body: { action: "save_prospect", prospect_id: p.id, saved: true },
    });
    setSavingIds((s) => s.filter((id) => id !== p.id));
    if (error || data?.error) {
      setRows((list) => list.map((x) => (x.id === p.id ? { ...x, saved: false } : x)));
      toast({ title: "Erro ao salvar", variant: "destructive" });
      return;
    }
    toast({ title: `${p.channel_name} enviado para a esteira de abordagem.` });
  };

  const view = useMemo(
    () =>
      rows
        .filter((p) => (statusFilter === "all" ? true : p.status === statusFilter))
        .filter((p) => (p.fit_score ?? 0) >= Number(minScore))
        .filter((p) =>
          search.trim()
            ? `${p.channel_name ?? ""} ${p.username ?? ""}`.toLowerCase().includes(search.trim().toLowerCase())
            : true,
        )
        .sort((a, b) => {
          if (sortBy === "subscriber_count") return (b.subscriber_count ?? 0) - (a.subscriber_count ?? 0);
          if (sortBy === "engagement_rate") return (b.engagement_rate ?? 0) - (a.engagement_rate ?? 0);
          if (sortBy === "latest_video_at")
            return new Date(b.latest_video_at ?? 0).getTime() - new Date(a.latest_video_at ?? 0).getTime();
          return (b.fit_score ?? 0) - (a.fit_score ?? 0);
        }),
    [rows, sortBy, statusFilter, minScore, search],
  );

  const size = Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(view.length / size));
  const safePage = Math.min(page, totalPages);
  const pageRows = view.slice((safePage - 1) * size, safePage * size);
  const pageAllSelected = pageRows.length > 0 && pageRows.every((p) => selectedIds.includes(p.id));
  const selectedRows = useMemo(
    () => selectedIds.map((id) => rows.find((r) => r.id === id)).filter(Boolean),
    [selectedIds, rows],
  );
  const [bulkStatus, setBulkStatus] = useState("");

  const togglePage = () =>
    setSelectedIds((s) =>
      pageAllSelected
        ? s.filter((id) => !pageRows.some((p) => p.id === id))
        : Array.from(new Set([...s, ...pageRows.map((p) => p.id)])),
    );

  return (
    <div className="space-y-6">
      {usage && (
        <Card>
          <CardContent className="p-5 flex flex-wrap items-center gap-x-6 gap-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-[12px] bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center text-primary shrink-0">
                <Gauge size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">
                  {usage.remaining_today} de {usage.daily_limit} prospecções disponíveis
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Limite por administrador nas últimas 24h</p>
              </div>
            </div>
            <div className="h-9 w-px bg-border hidden sm:block" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="flex items-center gap-1.5">
                <Users size={12} className="text-primary/70" />
                Equipe:{" "}
                <span className="font-medium text-foreground">
                  {usage.used_global_today}/{usage.global_daily_limit}
                </span>{" "}
                buscas em 24h
              </p>
              <p className="flex items-center gap-1.5">
                <CalendarClock size={12} className="text-primary/70" />
                Intervalo mínimo de {usage.cooldown_seconds}s · máx. {usage.burst_max} a cada{" "}
                {usage.burst_window_minutes} min · até {usage.max_results_per_search} perfis por busca
              </p>
            </div>
            {cooldown > 0 && (
              <Badge variant="secondary" className="sm:ml-auto gap-1">
                <Loader2 size={11} className="animate-spin" /> Próxima busca em {cooldown}s
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6 space-y-6">
          <SectionTitle
            icon={Sparkles}
            title="Perfil ideal do criador (ICP)"
            description="A IA transforma a descrição e os termos em consultas de descoberta de perfis no Instagram."
          />
          <div className="space-y-2">
            <FieldLabel icon={Target}>Descreva o tipo de criador que você procura</FieldLabel>
            <Textarea
              className="min-h-[110px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: Criadores brasileiros que falam sobre vendas B2B, prospecção comercial, CRM e gestão comercial. Público formado por empresários, vendedores e gestores."
            />
          </div>

          <div className="space-y-2">
            <FieldLabel icon={Tags}>Termos / nichos de busca</FieldLabel>
            <div className="flex gap-2">
              <Input
                value={termInput}
                onChange={(e) => setTermInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTerm();
                  }
                }}
                placeholder="Ex.: vendas B2B"
              />
              <Button type="button" variant="outline" onClick={addTerm} className="shrink-0">
                <Plus size={16} className="mr-1" /> Adicionar
              </Button>
            </div>
            {terms.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {terms.map((k) => (
                  <Badge key={k} variant="secondary" className="gap-1 pl-2.5 pr-1.5 py-1">
                    {k}
                    <button
                      className="rounded-full p-0.5 hover:bg-foreground/10 transition-colors"
                      onClick={() => setTerms(terms.filter((x) => x !== k))}
                      aria-label={`Remover ${k}`}
                    >
                      <X size={11} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-border" />

          <SectionTitle
            icon={SlidersHorizontal}
            title="Filtros da busca"
            description="Ajuste região, tamanho e tipo de conta para refinar os perfis coletados."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <FieldLabel icon={Globe}>País</FieldLabel>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BR">Brasil</SelectItem>
                  <SelectItem value="PT">Portugal</SelectItem>
                  <SelectItem value="US">Estados Unidos</SelectItem>
                  <SelectItem value="ES">Espanha</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <FieldLabel icon={Languages}>Idioma</FieldLabel>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="en">Inglês</SelectItem>
                  <SelectItem value="es">Espanhol</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <FieldLabel icon={ListOrdered}>Número de resultados</FieldLabel>
              <Select value={resultsRequested} onValueChange={setResultsRequested}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["10", "20", "30", "50"].map((n) => (
                    <SelectItem key={n} value={n}>{n === "50" ? "50 (máximo)" : n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <FieldLabel icon={BadgeCheck}>Tipo de conta</FieldLabel>
              <Select value={accountType} onValueChange={setAccountType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="business">Comercial</SelectItem>
                  <SelectItem value="personal">Pessoal</SelectItem>
                  <SelectItem value="verified">Verificadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <FieldLabel icon={Users}>Mínimo de seguidores</FieldLabel>
              <Input type="number" value={minFollowers} onChange={(e) => setMinFollowers(e.target.value)} />
            </div>
            <div className="space-y-2">
              <FieldLabel icon={TrendingUp}>Máximo de seguidores</FieldLabel>
              <Input type="number" value={maxFollowers} onChange={(e) => setMaxFollowers(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                id="ig-include-existing"
                checked={includeExisting}
                onCheckedChange={(v) => setIncludeExisting(v === true)}
              />
              <Label htmlFor="ig-include-existing" className="text-xs text-muted-foreground">
                Reanalisar perfis já prospectados (dados com mais de 7 dias)
              </Label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button onClick={runSearch} disabled={loading || cooldown > 0 || (usage ? usage.remaining_today <= 0 : false)}>
              {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Search size={16} className="mr-2" />}
              {cooldown > 0 ? `Aguarde ${cooldown}s` : "Encontrar Criadores no Instagram"}
            </Button>
            {loading && (
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Sparkles size={13} className="text-primary" />
                {IG_PROGRESS_STEPS[step]}… (pode levar alguns minutos)
              </span>
            )}
          </div>

          {lastRun && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="outline">{lastRun.discovered ?? 0} perfis descobertos</Badge>
              <Badge variant="outline">{lastRun.duplicated ?? 0} duplicados ignorados</Badge>
              <Badge variant="outline">{lastRun.analyzed ?? 0} analisados pela IA</Badge>
              <Badge variant="outline">{lastRun.filtered_out ?? 0} fora dos filtros</Badge>
              <Badge variant="secondary">{lastRun.serp_credits ?? 0} créditos SerpApi usados</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5">
            <FieldLabel icon={Search}>Buscar</FieldLabel>
            <Input className="w-[200px]" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome ou @usuário" />
          </div>
          <div className="space-y-1.5">
            <FieldLabel icon={ArrowUpDown}>Ordenar por</FieldLabel>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fit_score">Fit Score</SelectItem>
                <SelectItem value="subscriber_count">Seguidores</SelectItem>
                <SelectItem value="engagement_rate">Engajamento</SelectItem>
                <SelectItem value="latest_video_at">Último post</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <FieldLabel icon={Target}>Fit Score mínimo</FieldLabel>
            <Select value={minScore} onValueChange={setMinScore}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["0", "60", "70", "80", "90"].map((n) => (
                  <SelectItem key={n} value={n}>{n === "0" ? "Todos" : `${n}+`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <FieldLabel icon={Filter}>Status</FieldLabel>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {PROSPECT_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={togglePage} className="h-8 text-xs">
            <CheckSquare size={13} className="mr-1.5" />
            {pageAllSelected ? "Desmarcar esta página" : "Marcar todos desta página"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() =>
              setSelectedIds((s) => {
                const ids = view.map((p) => p.id);
                return ids.every((id) => s.includes(id)) ? s.filter((id) => !ids.includes(id)) : Array.from(new Set([...s, ...ids]));
              })
            }
          >
            <ListChecks size={13} className="mr-1.5" /> Marcar todos ({view.length})
          </Button>
          {selectedIds.length > 0 && (
            <>
              <Badge variant="secondary" className="h-7 px-2">{selectedIds.length} selecionado(s)</Badge>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])} className="h-8 text-xs">
                <X size={13} className="mr-1.5" /> Limpar seleção
              </Button>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue placeholder="Mudar status" /></SelectTrigger>
                <SelectContent>
                  {PROSPECT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                disabled={!bulkStatus}
                onClick={async () => {
                  await updateStatusBulk(selectedIds, bulkStatus);
                  setBulkStatus("");
                }}
              >
                <Tags size={13} className="mr-1" /> Aplicar
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" disabled={reanalyzing} onClick={reanalyze}>
                {reanalyzing ? <Loader2 size={13} className="mr-1.5 animate-spin" /> : <RefreshCw size={13} className="mr-1.5" />}
                Reanalisar com IA
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportProspectsXlsx(selectedRows)} className="h-8 text-xs">
                <FileSpreadsheet size={13} className="mr-1.5" /> Exportar planilha
              </Button>
              <Button size="sm" onClick={() => exportProspectsPdf(selectedRows)} className="h-8 text-xs">
                <FileText size={13} className="mr-1.5" /> Exportar PDF
              </Button>
            </>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Por página</span>
            <Select value={pageSize} onValueChange={setPageSize}>
              <SelectTrigger className="h-8 w-[80px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["20", "30", "40", "50"].map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox checked={pageAllSelected} onCheckedChange={togglePage} aria-label="Selecionar página" />
                  </TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Seguidores</TableHead>
                  <TableHead>Engajamento</TableHead>
                  <TableHead>Posts</TableHead>
                  <TableHead>Fit Score</TableHead>
                  <TableHead className="max-w-[280px]">Principal motivo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-10">
                      Nenhum perfil do Instagram para exibir.
                    </TableCell>
                  </TableRow>
                )}
                {pageRows.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelected(p);
                      setSheetOpen(true);
                    }}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(p.id)}
                        onCheckedChange={() =>
                          setSelectedIds((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]))
                        }
                        aria-label={`Selecionar ${p.channel_name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 min-w-0">
                        <ChannelAvatar src={p.thumbnail_url} name={p.channel_name} size={36} />
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[180px] flex items-center gap-1">
                            {p.channel_name}
                            {p.is_verified && <BadgeCheck size={13} className="text-primary shrink-0" />}
                          </p>
                          <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                            @{p.username ?? "não informado"}
                            {p.category_name ? ` · ${p.category_name}` : ""}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{fmtNum(p.subscriber_count)}</TableCell>
                    <TableCell className="text-sm">
                      <span className="flex items-center gap-1">
                        <Heart size={12} className="text-primary/70" />
                        {fmtPct(p.engagement_rate)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{fmtNum(p.video_count)}</TableCell>
                    <TableCell>
                      <Badge variant={fitBadgeVariant(p.fit_score)}>{p.fit_score ?? 0}/100</Badge>
                      <p className="text-[11px] text-muted-foreground mt-1">{p.fit_category}</p>
                    </TableCell>
                    <TableCell className="max-w-[280px]">
                      <p className="text-xs text-muted-foreground line-clamp-2">{p.ai_summary || "Não informado"}</p>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select value={p.status} onValueChange={(v) => updateStatus(p.id, v)}>
                        <SelectTrigger className="h-8 w-[150px] text-xs">
                          <SelectValue>{statusLabel(p.status)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {PROSPECT_STATUSES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {p.saved ? (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 size={12} /> Salvo
                        </Badge>
                      ) : (
                        <Button size="sm" variant="outline" disabled={savingIds.includes(p.id)} onClick={() => saveProspect(p)}>
                          {savingIds.includes(p.id) ? (
                            <Loader2 size={14} className="mr-1 animate-spin" />
                          ) : (
                            <BookmarkPlus size={14} className="mr-1" />
                          )}
                          {savingIds.includes(p.id) ? "Salvando…" : "Salvar"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Mostrando {pageRows.length} de {view.length} perfis · página {safePage} de {totalPages}
          </p>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" className="h-8" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
              <ChevronLeft size={14} /> Anterior
            </Button>
            <Button size="sm" variant="outline" className="h-8" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
              Próxima <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </div>

      <InfluencerDetailSheet prospect={selected} open={sheetOpen} onOpenChange={setSheetOpen} onStatusChange={updateStatus} />

      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
        <Instagram size={12} /> Dados públicos coletados via SerpApi (Instagram Profile API) e analisados por IA. Nenhum login do Instagram é usado.
      </p>
    </div>
  );
}
