import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Search, Download, CalendarIcon, ChevronLeft, ChevronRight, X,
  SlidersHorizontal, Loader2, Users, CheckCircle2, AlertTriangle, Clock,
  ArrowLeft,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FlowFunnel } from "./FlowFunnel";
import * as XLSX from "xlsx";

interface FlowResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flowId: string;
  flowName: string;
}

interface FlowExecution {
  id: string;
  lead_phone: string;
  lead_name: string | null;
  status: string;
  current_node_name: string | null;
  exit_node_name: string | null;
  node_history: any[];
  collected_data: Record<string, any>;
  started_at: string;
  completed_at: string | null;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: "Em andamento", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  completed: { label: "Concluído", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  abandoned: { label: "Abandonou", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  error: { label: "Erro", color: "bg-destructive/10 text-destructive border-destructive/20" },
};

const ITEMS_PER_PAGE = 15;

export function FlowResultsDialog({ open, onOpenChange, flowId, flowName }: FlowResultsDialogProps) {
  const { user } = useAuth();
  const [executions, setExecutions] = useState<FlowExecution[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [quickDate, setQuickDate] = useState("all");

  const applyQuickDate = (key: string) => {
    setQuickDate(key);
    setCurrentPage(1);
    const now = new Date();
    if (key === "all") { setDateFrom(undefined); setDateTo(undefined); return; }
    if (key === "today") { const d = new Date(now); d.setHours(0,0,0,0); setDateFrom(d); setDateTo(now); return; }
    if (key === "7d") { const d = new Date(now); d.setDate(d.getDate() - 7); setDateFrom(d); setDateTo(now); return; }
    if (key === "30d") { const d = new Date(now); d.setDate(d.getDate() - 30); setDateFrom(d); setDateTo(now); return; }
    if (key === "90d") { const d = new Date(now); d.setDate(d.getDate() - 90); setDateFrom(d); setDateTo(now); return; }
  };

  const loadExecutions = useCallback(async () => {
    if (!user || !flowId) return;
    setLoading(true);
    try {
      let query = supabase
        .from("wa_flow_executions")
        .select("*")
        .eq("flow_id", flowId)
        .eq("user_id", user.id)
        .order("started_at", { ascending: false });

      if (statusFilter) query = query.eq("status", statusFilter);
      if (dateFrom) query = query.gte("started_at", dateFrom.toISOString());
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query = query.lte("started_at", end.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      setExecutions((data || []) as FlowExecution[]);
    } catch {
      toast.error("Erro ao carregar resultados");
    } finally {
      setLoading(false);
    }
  }, [user, flowId, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (open) {
      loadExecutions();
      setCurrentPage(1);
    }
  }, [open, loadExecutions]);

  const filtered = useMemo(() => {
    if (!search.trim()) return executions;
    const q = search.toLowerCase();
    return executions.filter(
      (e) =>
        e.lead_phone.toLowerCase().includes(q) ||
        (e.lead_name || "").toLowerCase().includes(q) ||
        (e.current_node_name || "").toLowerCase().includes(q) ||
        (e.exit_node_name || "").toLowerCase().includes(q)
    );
  }, [executions, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const stats = useMemo(() => ({
    total: executions.length,
    active: executions.filter((e) => e.status === "active").length,
    completed: executions.filter((e) => e.status === "completed").length,
    abandoned: executions.filter((e) => e.status === "abandoned").length,
  }), [executions]);

  const activeFiltersCount = [statusFilter, dateFrom, dateTo].filter(Boolean).length;

  const clearFilters = () => {
    setStatusFilter("");
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearch("");
    setCurrentPage(1);
  };

  const getNodePath = (history: any[]) => {
    if (!Array.isArray(history) || history.length === 0) return "—";
    return history
      .map((h: any) => h.node_name || h.node_id || "?")
      .join(" → ");
  };

  const getLastResponse = (history: any[]) => {
    if (!Array.isArray(history) || history.length === 0) return "—";
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].response) return history[i].response;
    }
    return "—";
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error("Nenhum resultado para exportar");
      return;
    }

    const data = filtered.map((e) => ({
      "Telefone": e.lead_phone,
      "Nome": e.lead_name || "",
      "Status": STATUS_MAP[e.status]?.label || e.status,
      "Nó Atual": e.current_node_name || "",
      "Último Nó": e.exit_node_name || "",
      "Caminho": getNodePath(e.node_history),
      "Última Resposta": getLastResponse(e.node_history),
      "Dados Coletados": Object.entries(e.collected_data || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join("; "),
      "Início": e.started_at ? format(new Date(e.started_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "",
      "Fim": e.completed_at ? format(new Date(e.completed_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resultados");
    ws["!cols"] = Object.keys(data[0]).map((k) => ({ wch: Math.max(k.length, 18) }));
    XLSX.writeFile(wb, `resultados_${flowName.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success(`${filtered.length} resultados exportados!`);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
        <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="shrink-0">
          <ArrowLeft size={18} />
        </Button>
        <h1 className="text-lg font-semibold">Resultados — {flowName}</h1>
      </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
            <Users size={18} className="text-muted-foreground" />
            <div>
              <p className="text-xl font-bold">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground">Total de entradas</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
            <Clock size={18} className="text-blue-500" />
            <div>
              <p className="text-xl font-bold text-blue-500">{stats.active}</p>
              <p className="text-[10px] text-muted-foreground">Em andamento</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <div>
              <p className="text-xl font-bold text-emerald-500">{stats.completed}</p>
              <p className="text-[10px] text-muted-foreground">Concluídos</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
            <AlertTriangle size={18} className="text-amber-500" />
            <div>
              <p className="text-xl font-bold text-amber-500">{stats.abandoned}</p>
              <p className="text-[10px] text-muted-foreground">Abandonaram</p>
            </div>
          </div>
        </div>

        {/* Horizontal Funnel */}
        {stats.total > 0 && (
          <div className="px-6 py-4 border-b border-border shrink-0">
            <FlowFunnel total={stats.total} active={stats.active} completed={stats.completed} abandoned={stats.abandoned} />
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-border shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Buscar por nome ou telefone..."
              className="pl-9 rounded-full h-9"
            />
          </div>

          {/* Quick date filters */}
          <div className="flex items-center gap-1">
            {[
              { key: "all", label: "Tudo" },
              { key: "today", label: "Hoje" },
              { key: "7d", label: "7 dias" },
              { key: "30d", label: "30 dias" },
              { key: "90d", label: "90 dias" },
            ].map((opt) => (
              <Button
                key={opt.key}
                variant={quickDate === opt.key ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-xs rounded-full"
                onClick={() => applyQuickDate(opt.key)}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <SlidersHorizontal size={14} />
                Filtros
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">{activeFiltersCount}</Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Filtros</h4>
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar</Button>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Status</label>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setCurrentPage(1); }}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {Object.entries(STATUS_MAP).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">
                    <div className="flex items-center gap-1">
                      <CalendarIcon size={12} />
                      Período
                    </div>
                  </label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("flex-1 justify-start text-left font-normal text-xs h-9", !dateFrom && "text-muted-foreground")}>
                          {dateFrom ? format(dateFrom, "dd/MM/yy", { locale: ptBR }) : "De"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setCurrentPage(1); }} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("flex-1 justify-start text-left font-normal text-xs h-9", !dateTo && "text-muted-foreground")}>
                          {dateTo ? format(dateTo, "dd/MM/yy", { locale: ptBR }) : "Até"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); setCurrentPage(1); }} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X size={14} className="mr-1" />
              Limpar filtros
            </Button>
          )}

          <div className="flex-1" />

          <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0} className="gap-2">
            <Download size={14} />
            Exportar Excel
          </Button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-muted-foreground" size={24} />
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Users size={40} className="mb-3 opacity-40" />
              <p className="text-sm font-medium">Nenhum resultado encontrado</p>
              <p className="text-xs mt-1">Os leads que entrarem neste fluxo aparecerão aqui</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Telefone</TableHead>
                  <TableHead className="w-[140px]">Nome</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="w-[150px]">Parou em</TableHead>
                  <TableHead>Caminho percorrido</TableHead>
                  <TableHead className="w-[180px]">Última resposta</TableHead>
                  <TableHead className="w-[150px]">Dados coletados</TableHead>
                  <TableHead className="w-[130px]">Entrada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((exec) => (
                  <TableRow key={exec.id}>
                    <TableCell className="font-mono text-xs">{exec.lead_phone}</TableCell>
                    <TableCell className="text-sm">{exec.lead_name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px]", STATUS_MAP[exec.status]?.color)}>
                        {STATUS_MAP[exec.status]?.label || exec.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {exec.exit_node_name || exec.current_node_name || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate" title={getNodePath(exec.node_history)}>
                      {getNodePath(exec.node_history)}
                    </TableCell>
                    <TableCell className="text-xs max-w-[180px] truncate" title={getLastResponse(exec.node_history)}>
                      {getLastResponse(exec.node_history)}
                    </TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate">
                      {Object.keys(exec.collected_data || {}).length > 0
                        ? Object.entries(exec.collected_data).map(([k, v]) => `${k}: ${v}`).join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(exec.started_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        {filtered.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-border shrink-0">
            <p className="text-xs text-muted-foreground">
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""} • Página {currentPage} de {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
                <ChevronLeft size={14} />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8 text-xs"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>
  );
}
