import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Lightbulb, Search, Eye, CheckCheck, Archive, Inbox, CalendarDays, TrendingUp, Tag, Hammer, Loader2 } from "lucide-react";
import {
  SUGGESTION_CATEGORIES,
  SUGGESTION_PERIODS,
  SUGGESTION_STATUS_LABEL,
  IMPORTANCE_MAP,
  formatSuggestionDate,
  periodToRange,
  type SuggestionPeriod,
  type SuggestionRow,
  type SuggestionStatus,
} from "@/lib/suggestions";

const PAGE_SIZE = 20;

function importanceBadge(value: string) {
  const item = IMPORTANCE_MAP[value as keyof typeof IMPORTANCE_MAP];
  if (!item) return <Badge variant="outline">—</Badge>;
  return (
    <Badge variant="outline" className={item.badgeClass}>
      {item.emoji} {item.label}
    </Badge>
  );
}

function statusBadge(value: string) {
  const label = SUGGESTION_STATUS_LABEL[value as SuggestionStatus] || value;
  if (value === "em_desenvolvimento") {
    return (
      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
        {label}
      </Badge>
    );
  }
  return <Badge variant="secondary">{label}</Badge>;
}

export default function AdminSuggestions() {
  const { toast } = useToast();

  const [period, setPeriod] = useState<SuggestionPeriod>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);

  const [rows, setRows] = useState<SuggestionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    total: number; last7: number; last30: number; topCategory: { name: string; count: number } | null;
  }>({ total: 0, last7: 0, last30: 0, topCategory: null });
  const [selected, setSelected] = useState<SuggestionRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  const range = useMemo(
    () => periodToRange(period, customFrom, customTo),
    [period, customFrom, customTo]
  );

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(0); }, [period, customFrom, customTo, category, status]);

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
      if (debouncedSearch) {
        const term = `%${debouncedSearch}%`;
        query = query.or(
          `company_name.ilike.${term},title.ilike.${term},user_name.ilike.${term},user_email.ilike.${term}`
        );
      }

      const { data, count, error } = await query;
      if (error) throw error;
      setRows((data || []) as SuggestionRow[]);
      setTotal(count || 0);
    } catch (e: any) {
      toast({ title: "Erro ao carregar sugestões", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, category, status, debouncedSearch, page, toast]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  // Métricas dos cards (independentes do filtro de período da tabela)
  const fetchStats = useCallback(async () => {
    const now = Date.now();
    const d7 = new Date(now - 7 * 86400000).toISOString();
    const d30 = new Date(now - 30 * 86400000).toISOString();

    const [all, last7, last30, cats] = await Promise.all([
      supabase.from("suggestions").select("id", { count: "exact", head: true }),
      supabase.from("suggestions").select("id", { count: "exact", head: true }).gte("created_at", d7),
      supabase.from("suggestions").select("id", { count: "exact", head: true }).gte("created_at", d30),
      supabase.from("suggestions").select("category"),
    ]);

    const counts = new Map<string, number>();
    ((cats.data || []) as { category: string }[]).forEach((r) => {
      counts.set(r.category, (counts.get(r.category) || 0) + 1);
    });
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];

    setStats({
      total: all.count || 0,
      last7: last7.count || 0,
      last30: last30.count || 0,
      topCategory: top ? { name: top[0], count: top[1] } : null,
    });
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const updateStatus = async (id: string, next: SuggestionStatus) => {
    setBusy(true);
    try {
      const { error } = await supabase.from("suggestions").update({ status: next }).eq("id", id);
      if (error) throw error;
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: next } : r)));
      setSelected((prev) => (prev && prev.id === id ? { ...prev, status: next } : prev));
      toast({ title: `Sugestão marcada como ${SUGGESTION_STATUS_LABEL[next]}` });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const statCards = [
    { label: "Total de sugestões", value: stats.total, icon: Inbox },
    { label: "Últimos 7 dias", value: stats.last7, icon: CalendarDays },
    { label: "Últimos 30 dias", value: stats.last30, icon: TrendingUp },
    {
      label: "Categoria mais utilizada",
      value: stats.topCategory ? stats.topCategory.name : "—",
      hint: stats.topCategory ? `${stats.topCategory.count} sugestões` : undefined,
      icon: Tag,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Lightbulb size={22} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Central de Sugestões</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie sugestões enviadas pelos clientes.</p>
        </div>
      </div>

      {/* Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((c) => (
          <Card key={c.label} className="border-border/60">
            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{c.label}</p>
                <p className="text-2xl font-semibold text-foreground mt-1 truncate">{c.value}</p>
                {c.hint && <p className="text-xs text-muted-foreground mt-0.5">{c.hint}</p>}
              </div>
              <c.icon size={18} className="text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <Card className="border-border/60">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3">
            <div className="space-y-1.5 lg:w-48">
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

            <div className="space-y-1.5 lg:w-56">
              <Label className="text-xs text-muted-foreground">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {SUGGESTION_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 lg:w-40">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="recebida">Recebida</SelectItem>
                  <SelectItem value="lida">Lida</SelectItem>
                  <SelectItem value="arquivada">Arquivada</SelectItem>
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
                    <TableHead>Empresa</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Importância</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.company_name || "—"}</TableCell>
                      <TableCell>
                        <div className="text-sm">{r.user_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.user_email || ""}</div>
                      </TableCell>
                      <TableCell className="text-sm">{r.category}</TableCell>
                      <TableCell className="max-w-[240px] truncate text-sm">{r.title}</TableCell>
                      <TableCell>{importanceBadge(r.importance)}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{formatSuggestionDate(r.created_at)}</TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelected(r)}>
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

      {/* Drawer lateral */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.title}</SheetTitle>
                <SheetDescription>{formatSuggestionDate(selected.created_at)}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5">
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
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Importância</p>
                    {importanceBadge(selected.importance)}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Descrição</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selected.description}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={busy || selected.status === "lida"}
                    onClick={() => updateStatus(selected.id, "lida")}
                  >
                    <CheckCheck size={15} className="mr-2" /> Marcar como Lida
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={busy || selected.status === "arquivada"}
                    onClick={() => updateStatus(selected.id, "arquivada")}
                  >
                    <Archive size={15} className="mr-2" /> Arquivar
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
