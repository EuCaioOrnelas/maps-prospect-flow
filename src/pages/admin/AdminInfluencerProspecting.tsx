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
import { Loader2, Search, Youtube, X, Plus, BookmarkPlus, CheckCircle2 } from "lucide-react";

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

  useEffect(() => {
    loadSaved();
  }, []);

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
      if (error) throw new Error((error as any).message);
      if (data?.error) throw new Error(data.error);
      setProspects(data?.prospects ?? []);
      setStep(PROGRESS_STEPS.length - 1);
      toast({
        title: data?.prospects?.length
          ? `Encontramos ${data.prospects.length} canais potenciais.`
          : data?.message || "Nenhum canal encontrado.",
      });
    } catch (e: any) {
      toast({ title: "Não foi possível concluir a prospecção", description: e.message, variant: "destructive" });
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
    <div className="space-y-6">
      <PageHeader
        title="Prospecção de Influenciadores"
        subtitle="Encontre criadores com audiência e conteúdo alinhados à Wiize."
        icon={Youtube}
      />

      <Tabs defaultValue="youtube">
        <TabsList>
          <TabsTrigger value="youtube">YouTube Prospecting</TabsTrigger>
          <TabsTrigger value="saved">Salvos ({saved.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="youtube" className="space-y-6 mt-6">
          <Card>
            <CardContent className="p-6 space-y-5">
              <div>
                <Label>Descreva o tipo de criador que você procura</Label>
                <Textarea
                  className="mt-2 min-h-[110px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex.: Criadores brasileiros que falam sobre vendas B2B, prospecção comercial, SDR, CRM, geração de leads, marketing B2B e empreendedorismo. Público formado por empresários, vendedores, SDRs e gestores comerciais."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label>País</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BR">Brasil</SelectItem>
                      <SelectItem value="PT">Portugal</SelectItem>
                      <SelectItem value="US">Estados Unidos</SelectItem>
                      <SelectItem value="ES">Espanha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Idioma</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt">Português</SelectItem>
                      <SelectItem value="en">Inglês</SelectItem>
                      <SelectItem value="es">Espanhol</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Número de resultados</Label>
                  <Select value={resultsRequested} onValueChange={setResultsRequested}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Recência</Label>
                  <Select value={recency} onValueChange={setRecency}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">Últimos 30 dias</SelectItem>
                      <SelectItem value="60">Últimos 60 dias</SelectItem>
                      <SelectItem value="90">Últimos 90 dias</SelectItem>
                      <SelectItem value="180">Últimos 180 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Mínimo de inscritos</Label>
                  <Input className="mt-2" type="number" value={minSubs} onChange={(e) => setMinSubs(e.target.value)} />
                </div>
                <div>
                  <Label>Máximo de inscritos</Label>
                  <Input className="mt-2" type="number" value={maxSubs} onChange={(e) => setMaxSubs(e.target.value)} />
                </div>
                <div>
                  <Label>Mínimo de visualizações (opcional)</Label>
                  <Input className="mt-2" type="number" value={minViews} onChange={(e) => setMinViews(e.target.value)} placeholder="Opcional" />
                </div>
              </div>

              <div>
                <Label>Palavras-chave</Label>
                <div className="flex gap-2 mt-2">
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
                  <Button type="button" variant="outline" onClick={addKeyword}>
                    <Plus size={16} />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {keywords.map((k) => (
                    <Badge key={k} variant="secondary" className="gap-1">
                      {k}
                      <button onClick={() => setKeywords(keywords.filter((x) => x !== k))}>
                        <X size={12} />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={runSearch} disabled={loading}>
                  {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Search size={16} className="mr-2" />}
                  Encontrar Influenciadores
                </Button>
                {loading && (
                  <span className="text-sm text-muted-foreground">
                    {PROGRESS_STEPS[step]}… (pode levar alguns minutos)
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Label className="text-xs">Buscar</Label>
              <Input className="mt-1 w-[200px]" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome do canal" />
            </div>
            <div>
              <Label className="text-xs">Ordenar por</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="mt-1 w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fit_score">Fit Score</SelectItem>
                  <SelectItem value="subscriber_count">Inscritos</SelectItem>
                  <SelectItem value="avg_recent_views">Views</SelectItem>
                  <SelectItem value="latest_video_at">Último vídeo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Fit Score mínimo</Label>
              <Select value={minScore} onValueChange={setMinScore}>
                <SelectTrigger className="mt-1 w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Todos</SelectItem>
                  <SelectItem value="60">60+</SelectItem>
                  <SelectItem value="70">70+</SelectItem>
                  <SelectItem value="80">80+</SelectItem>
                  <SelectItem value="90">90+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="mt-1 w-[170px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {PROSPECT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
