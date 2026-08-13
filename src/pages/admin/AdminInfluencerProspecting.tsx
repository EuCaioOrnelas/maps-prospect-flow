import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/partners/PageHeader";
import { InfluencerDetailSheet } from "@/components/admin/partners/InfluencerDetailSheet";
import { useToast } from "@/hooks/use-toast";
import {
  PROSPECT_STATUSES,
  PROGRESS_STEPS,
  fitBadgeVariant,
  fmtNum,
  statusLabel,
} from "@/lib/influencerProspecting";
import {
  Loader2, Search, Youtube, X, Plus, BookmarkPlus, CheckCircle2, Gauge,
  Globe, Languages, ListOrdered, CalendarClock, Users, TrendingUp, Eye,
  Tags, SlidersHorizontal, Sparkles, Target, Filter, ArrowUpDown, Bookmark,
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

const DEFAULT_KEYWORDS = ["prospecção B2B", "vendas B2B", "SDR", "CRM", "outbound", "geração de leads"];

export default function AdminInfluencerProspecting() {
  const { toast } = useToast();
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("BR");
  const [language, setLanguage] = useState("pt");
  const [resultsRequested, setResultsRequested] = useState("20");
  const [minSubs, setMinSubs] = useState("5000");
  const [maxSubs, setMaxSubs] = useState("100000");
  const [minViews, setMinViews] = useState("");
  const [recency, setRecency] = useState("90");
  const [keywords, setKeywords] = useState<string[]>(DEFAULT_KEYWORDS);
  const [kwInput, setKwInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [prospects, setProspects] = useState<any[]>([]);
  const [saved, setSaved] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [usage, setUsage] = useState<any | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const [sortBy, setSortBy] = useState("fit_score");
  const [statusFilter, setStatusFilter] = useState("all");
  const [minScore, setMinScore] = useState("0");
  const [search, setSearch] = useState("");

  const loadSaved = async () => {
    const { data } = await (supabase as any)
      .from("influencer_prospects")
      .select("*")
      .eq("saved", true)
      .order("fit_score", { ascending: false });
    setSaved(data ?? []);
  };

  const applyUsage = (u: any) => {
    if (!u) return;
    setUsage(u);
    setCooldown(u.cooldown_seconds_remaining ?? 0);
  };

  const loadUsage = async () => {
    const { data } = await supabase.functions.invoke("youtube-influencer-prospect", {
      body: { action: "quota" },
    });
    applyUsage(data?.usage);
  };

  useEffect(() => {
    loadSaved();
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
    const id = setInterval(() => setStep((s) => Math.min(s + 1, PROGRESS_STEPS.length - 2)), 3500);
    return () => clearInterval(id);
  }, [loading]);

  const addKeyword = () => {
    const v = kwInput.trim();
    if (!v || keywords.includes(v)) return;
    setKeywords([...keywords, v]);
    setKwInput("");
  };

  const runSearch = async () => {
    if (loading) return;
    if (cooldown > 0) {
      toast({ title: `Aguarde ${cooldown}s para iniciar outra prospecção.`, variant: "destructive" });
      return;
    }
    if (usage && usage.remaining_today <= 0) {
      toast({ title: "Limite diário de prospecções atingido.", variant: "destructive" });
      return;
    }
    if (description.trim().length < 10) {
      toast({ title: "Descreva o tipo de criador que você procura.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setProspects([]);
    try {
      const { data, error } = await supabase.functions.invoke("youtube-influencer-prospect", {
        body: {
          action: "search",
          query_description: description,
          country,
          language,
          keywords,
          min_subscribers: Number(minSubs) || 0,
          max_subscribers: Number(maxSubs) || 10000000,
          min_views: minViews ? Number(minViews) : null,
          recency_days: Number(recency),
          results_requested: Number(resultsRequested),
        },
      });
      if (error) {
        // erros HTTP (ex.: 429 de rate limit) trazem o corpo em error.context
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
      setProspects(data?.prospects ?? []);
      setStep(PROGRESS_STEPS.length - 1);
      toast({
        title: data?.prospects?.length
          ? `Encontramos ${data.prospects.length} canais potenciais.`
          : data?.message || "Nenhum canal encontrado.",
      });
    } catch (e: any) {
      toast({ title: "Não foi possível concluir a prospecção", description: e.message, variant: "destructive" });
      loadUsage();
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setProspects((p) => p.map((x) => (x.id === id ? { ...x, status } : x)));
    setSaved((p) => p.map((x) => (x.id === id ? { ...x, status } : x)));
    setSelected((s: any) => (s && s.id === id ? { ...s, status } : s));
    const { data, error } = await supabase.functions.invoke("youtube-influencer-prospect", {
      body: { action: "update_status", prospect_id: id, status },
    });
    if (error || data?.error) toast({ title: "Erro ao atualizar status", variant: "destructive" });
  };

  const saveProspect = async (p: any) => {
    const { data, error } = await supabase.functions.invoke("youtube-influencer-prospect", {
      body: { action: "save_prospect", prospect_id: p.id, saved: true },
    });
    if (error || data?.error) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
      return;
    }
    setProspects((list) => list.map((x) => (x.id === p.id ? { ...x, saved: true, status: "qualificado" } : x)));
    toast({ title: `${p.channel_name} salvo nos Parceiros.` });
    loadSaved();
  };

  const applyView = (list: any[]) =>
    list
      .filter((p) => (statusFilter === "all" ? true : p.status === statusFilter))
      .filter((p) => (p.fit_score ?? 0) >= Number(minScore))
      .filter((p) =>
        search.trim() ? (p.channel_name || "").toLowerCase().includes(search.trim().toLowerCase()) : true,
      )
      .sort((a, b) => {
        if (sortBy === "subscriber_count") return (b.subscriber_count ?? 0) - (a.subscriber_count ?? 0);
        if (sortBy === "avg_recent_views") return (b.avg_recent_views ?? 0) - (a.avg_recent_views ?? 0);
        if (sortBy === "latest_video_at")
          return new Date(b.latest_video_at ?? 0).getTime() - new Date(a.latest_video_at ?? 0).getTime();
        return (b.fit_score ?? 0) - (a.fit_score ?? 0);
      });

  const viewProspects = useMemo(() => applyView(prospects), [prospects, sortBy, statusFilter, minScore, search]);
  const viewSaved = useMemo(() => applyView(saved), [saved, sortBy, statusFilter, minScore, search]);

  const ResultsTable = ({ rows, showSave }: { rows: any[]; showSave: boolean }) => (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Canal</TableHead>
              <TableHead>Inscritos</TableHead>
              <TableHead>Views médias</TableHead>
              <TableHead>Último vídeo</TableHead>
              <TableHead>Fit Score</TableHead>
              <TableHead className="max-w-[280px]">Principal motivo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">
                  Nenhum canal para exibir.
                </TableCell>
              </TableRow>
            )}
            {rows.map((p) => (
              <TableRow
                key={p.id}
                className="cursor-pointer"
                onClick={() => {
                  setSelected(p);
                  setSheetOpen(true);
                }}
              >
                <TableCell>
                  <div className="flex items-center gap-3 min-w-0">
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt={p.channel_name} className="h-9 w-9 rounded-xl object-cover" />
                    ) : (
                      <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center">
                        <Youtube size={16} className="text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate max-w-[180px]">{p.channel_name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {p.channel_handle || "Handle não informado"}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{fmtNum(p.subscriber_count)}</TableCell>
                <TableCell className="text-sm">{fmtNum(p.avg_recent_views)}</TableCell>
                <TableCell className="text-sm">
                  {p.latest_video_at ? new Date(p.latest_video_at).toLocaleDateString("pt-BR") : "Não informado"}
                </TableCell>
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
                  {showSave &&
                    (p.saved ? (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 size={12} /> Salvo
                      </Badge>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => saveProspect(p)}>
                        <BookmarkPlus size={14} className="mr-1" /> Salvar
                      </Button>
                    ))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Prospecção de Influenciadores"
        subtitle="Encontre criadores com audiência e conteúdo alinhados à Wiize."
        icon={Youtube}
      />

      <Tabs defaultValue="youtube">
        <TabsList>
          <TabsTrigger value="youtube" className="gap-1.5">
            <Youtube size={14} /> YouTube Prospecting
          </TabsTrigger>
          <TabsTrigger value="saved" className="gap-1.5">
            <Bookmark size={14} /> Salvos ({saved.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="youtube" className="space-y-6 mt-6">
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
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Limite por administrador nas últimas 24h
                    </p>
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
                    Intervalo mínimo de {usage.cooldown_seconds}s entre buscas · máx. {usage.burst_max} a cada{" "}
                    {usage.burst_window_minutes} min · até {usage.max_results_per_search} canais por busca
                  </p>
                </div>
                {cooldown > 0 && (
                  <Badge variant="secondary" className="sm:ml-auto gap-1">
                    <Loader2 size={11} className="animate-spin" /> Próxima busca em {cooldown}s
                  </Badge>
                )}
                {usage.remaining_today <= 0 && cooldown === 0 && (
                  <Badge variant="destructive" className="sm:ml-auto">
                    Limite diário atingido
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
                description="A IA transforma esta descrição em consultas de busca focadas em conteúdo."
              />
              <div className="space-y-2">
                <FieldLabel icon={Target}>Descreva o tipo de criador que você procura</FieldLabel>
                <Textarea
                  className="min-h-[110px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex.: Criadores brasileiros que falam sobre vendas B2B, prospecção comercial, SDR, CRM, geração de leads, marketing B2B e empreendedorismo. Público formado por empresários, vendedores, SDRs e gestores comerciais."
                />
              </div>

              <div className="h-px bg-border" />

              <SectionTitle
                icon={SlidersHorizontal}
                title="Filtros da busca"
                description="Ajuste região, tamanho do canal e recência para refinar os resultados."
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
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="50">50 (máximo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <FieldLabel icon={CalendarClock}>Recência</FieldLabel>
                  <Select value={recency} onValueChange={setRecency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">Últimos 30 dias</SelectItem>
                      <SelectItem value="60">Últimos 60 dias</SelectItem>
                      <SelectItem value="90">Últimos 90 dias</SelectItem>
                      <SelectItem value="180">Últimos 180 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <FieldLabel icon={Users}>Mínimo de inscritos</FieldLabel>
                  <Input type="number" value={minSubs} onChange={(e) => setMinSubs(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <FieldLabel icon={TrendingUp}>Máximo de inscritos</FieldLabel>
                  <Input type="number" value={maxSubs} onChange={(e) => setMaxSubs(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <FieldLabel icon={Eye}>Mínimo de visualizações</FieldLabel>
                  <Input type="number" value={minViews} onChange={(e) => setMinViews(e.target.value)} placeholder="Opcional" />
                </div>
              </div>

              <div className="h-px bg-border" />

              <div className="space-y-2">
                <FieldLabel icon={Tags}>Palavras-chave</FieldLabel>
                <div className="flex gap-2">
                  <Input
                    value={kwInput}
                    onChange={(e) => setKwInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addKeyword();
                      }
                    }}
                    placeholder="Ex.: prospecção B2B"
                  />
                  <Button type="button" variant="outline" onClick={addKeyword} className="shrink-0">
                    <Plus size={16} className="mr-1" /> Adicionar
                  </Button>
                </div>
                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {keywords.map((k) => (
                      <Badge key={k} variant="secondary" className="gap-1 pl-2.5 pr-1.5 py-1">
                        {k}
                        <button
                          className="rounded-full p-0.5 hover:bg-foreground/10 transition-colors"
                          onClick={() => setKeywords(keywords.filter((x) => x !== k))}
                          aria-label={`Remover ${k}`}
                        >
                          <X size={11} />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button
                  onClick={runSearch}
                  disabled={loading || cooldown > 0 || (usage ? usage.remaining_today <= 0 : false)}
                >
                  {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Search size={16} className="mr-2" />}
                  {cooldown > 0 ? `Aguarde ${cooldown}s` : "Encontrar Influenciadores"}
                </Button>
                {loading && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Sparkles size={13} className="text-primary" />
                    {PROGRESS_STEPS[step]}… (pode levar alguns minutos)
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex flex-wrap gap-4 items-end">
              <div className="space-y-1.5">
                <FieldLabel icon={Search}>Buscar</FieldLabel>
                <Input className="w-[200px]" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome do canal" />
              </div>
              <div className="space-y-1.5">
                <FieldLabel icon={ArrowUpDown}>Ordenar por</FieldLabel>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fit_score">Fit Score</SelectItem>
                    <SelectItem value="subscriber_count">Inscritos</SelectItem>
                    <SelectItem value="avg_recent_views">Views</SelectItem>
                    <SelectItem value="latest_video_at">Último vídeo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <FieldLabel icon={Target}>Fit Score mínimo</FieldLabel>
                <Select value={minScore} onValueChange={setMinScore}>
                  <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Todos</SelectItem>
                    <SelectItem value="60">60+</SelectItem>
                    <SelectItem value="70">70+</SelectItem>
                    <SelectItem value="80">80+</SelectItem>
                    <SelectItem value="90">90+</SelectItem>
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

          <ResultsTable rows={viewProspects} showSave />
        </TabsContent>

        <TabsContent value="saved" className="mt-6">
          <ResultsTable rows={viewSaved} showSave={false} />
        </TabsContent>
      </Tabs>

      <InfluencerDetailSheet
        prospect={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onStatusChange={updateStatus}
      />
    </div>
  );
}

