import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Mail, Send, CheckCircle2, XCircle, Clock, Eye, MousePointerClick,
  Search, Loader2, ChevronLeft, ChevronRight, RefreshCw, BarChart3,
  ExternalLink, CalendarIcon, User, AlertTriangle
} from "lucide-react";

const PAGE_SIZE = 20;

type EmailLog = {
  id: string;
  user_id: string;
  email_type: string;
  status: string;
  to_email: string;
  payload: any;
  created_at: string;
  sent_at: string | null;
  error_message: string | null;
  provider_message_id: string | null;
  opened_at: string | null;
  opened_count: number;
  clicked_at: string | null;
  clicked_count: number;
  subject: string | null;
};

type KPIs = {
  total: number;
  sent: number;
  failed: number;
  queued: number;
  opened: number;
  clicked: number;
  openRate: number;
  clickRate: number;
};

// ── KPI Cards ─────────────────────────────────────────────────────────────────

function KPICards({ kpis, loading }: { kpis: KPIs; loading: boolean }) {
  const cards = [
    { label: "Total Enviados", value: kpis.sent, icon: Send, color: "text-primary" },
    { label: "Falhas", value: kpis.failed, icon: XCircle, color: "text-destructive" },
    { label: "Aberturas", value: kpis.opened, icon: Eye, color: "text-accent", sub: `${kpis.openRate.toFixed(1)}%` },
    { label: "Cliques", value: kpis.clicked, icon: MousePointerClick, color: "text-primary", sub: `${kpis.clickRate.toFixed(1)}%` },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">{c.label}</span>
            <c.icon size={14} className={c.color} />
          </div>
          <p className="text-2xl font-bold text-foreground">
            {loading ? "–" : c.value.toLocaleString("pt-BR")}
          </p>
          {c.sub && !loading && (
            <p className="text-xs text-muted-foreground">Taxa: <span className="font-semibold text-foreground">{c.sub}</span></p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Email Type Label ──────────────────────────────────────────────────────────

function emailTypeLabel(type: string): string {
  const map: Record<string, string> = {
    CAMPAIGN_SCHEDULED_STARTED: "Campanha Iniciada",
    NUMBER_DISCONNECTED: "Número Desconectado",
    CAMPAIGN_FAILED_TO_START: "Campanha Falhou",
    WEEKLY_SUMMARY: "Resumo Semanal",
    CAMPAIGN_COMPLETED: "Campanha Concluída",
    ADMIN_BROADCAST: "Broadcast",
    TRIAL_WELCOME: "Boas-vindas Trial",
    TRIAL_REMINDER: "Lembrete Trial",
    TRIAL_EXPIRING: "Trial Expirando",
  };
  return map[type] || type;
}

function statusBadge(status: string) {
  if (status === "sent") return <Badge className="bg-primary/20 text-primary border-primary/30 gap-1"><CheckCircle2 size={10} /> Enviado</Badge>;
  if (status === "failed") return <Badge variant="destructive" className="gap-1"><XCircle size={10} /> Falhou</Badge>;
  return <Badge variant="secondary" className="gap-1"><Clock size={10} /> Na fila</Badge>;
}

// ── Email Detail Dialog ───────────────────────────────────────────────────────

function EmailDetailDialog({ log, open, onClose }: { log: EmailLog | null; open: boolean; onClose: () => void }) {
  if (!log) return null;

  const payload = log.payload as any;
  const emailSubject = log.subject || payload?.subject || "Sem assunto";
  const emailContent = payload?.content || payload?.title || "";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Mail size={18} />
            Detalhes do E-mail
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh]">
          <div className="space-y-5 pr-4">
            {/* Meta info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Destinatário</span>
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <User size={12} className="text-muted-foreground" />
                  {log.to_email}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Tipo</span>
                <p className="text-sm font-medium text-foreground">{emailTypeLabel(log.email_type)}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Enviado em</span>
                <p className="text-sm text-foreground flex items-center gap-1.5">
                  <CalendarIcon size={12} className="text-muted-foreground" />
                  {log.sent_at ? new Date(log.sent_at).toLocaleString("pt-BR") : new Date(log.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Status</span>
                <div>{statusBadge(log.status)}</div>
              </div>
            </div>

            {/* Error */}
            {log.error_message && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-xs font-medium text-destructive flex items-center gap-1.5 mb-1">
                  <AlertTriangle size={12} /> Erro no envio
                </p>
                <p className="text-xs text-destructive/80 font-mono">{log.error_message}</p>
              </div>
            )}

            {/* Tracking metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Eye size={12} className="text-accent" /> Aberturas
                </div>
                <p className="text-xl font-bold text-foreground">{log.opened_count || 0}</p>
                {log.opened_at && (
                  <p className="text-xs text-muted-foreground">
                    Primeira: {new Date(log.opened_at).toLocaleString("pt-BR")}
                  </p>
                )}
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MousePointerClick size={12} className="text-primary" /> Cliques
                </div>
                <p className="text-xl font-bold text-foreground">{log.clicked_count || 0}</p>
                {log.clicked_at && (
                  <p className="text-xs text-muted-foreground">
                    Primeiro: {new Date(log.clicked_at).toLocaleString("pt-BR")}
                  </p>
                )}
              </div>
            </div>

            {/* Email Preview */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Assunto</h4>
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{emailSubject}</p>
            </div>

            {emailContent && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Preview do Conteúdo</h4>
                <div
                  className="rounded-lg border bg-background p-4 text-sm text-foreground prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: emailContent }}
                />
              </div>
            )}

            {/* Provider ID */}
            {log.provider_message_id && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Provider Message ID</span>
                <p className="text-xs font-mono text-muted-foreground bg-muted/30 rounded p-2 break-all">
                  {log.provider_message_id}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function EmailHistoryPanel() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState<KPIs>({ total: 0, sent: 0, failed: 0, queued: 0, opened: 0, clicked: 0, openRate: 0, clickRate: 0 });
  const [kpisLoading, setKpisLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Load KPIs
  const loadKPIs = useCallback(async () => {
    setKpisLoading(true);
    try {
      const { data: allLogs, error } = await supabase
        .from("email_logs")
        .select("status, opened_count, clicked_count");

      if (error) throw error;

      const logs = allLogs || [];
      const sent = logs.filter(l => l.status === "sent").length;
      const failed = logs.filter(l => l.status === "failed").length;
      const queued = logs.filter(l => l.status === "queued").length;
      const opened = logs.filter(l => (l.opened_count || 0) > 0).length;
      const clicked = logs.filter(l => (l.clicked_count || 0) > 0).length;

      setKpis({
        total: logs.length,
        sent,
        failed,
        queued,
        opened,
        clicked,
        openRate: sent > 0 ? (opened / sent) * 100 : 0,
        clickRate: sent > 0 ? (clicked / sent) * 100 : 0,
      });
    } catch (err) {
      console.error("Error loading KPIs:", err);
    } finally {
      setKpisLoading(false);
    }
  }, []);

  // Load logs with pagination and filters
  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("email_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (search.trim()) {
        query = query.ilike("to_email", `%${search.trim()}%`);
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as "sent" | "failed" | "queued");
      }
      if (typeFilter !== "all") {
        query = query.eq("email_type", typeFilter as any);
      }

      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      setLogs((data as EmailLog[]) || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error("Error loading logs:", err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, typeFilter]);

  useEffect(() => {
    loadKPIs();
  }, [loadKPIs]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    setPage(0);
  }, [search, statusFilter, typeFilter]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleOpenDetail = (log: EmailLog) => {
    setSelectedLog(log);
    setDetailOpen(true);
  };

  const handleRefresh = () => {
    loadKPIs();
    loadLogs();
  };

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <KPICards kpis={kpis} loading={kpisLoading} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por email do destinatário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="sent">Enviados</SelectItem>
            <SelectItem value="failed">Falhas</SelectItem>
            <SelectItem value="queued">Na fila</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="ADMIN_BROADCAST">Broadcast</SelectItem>
            <SelectItem value="WEEKLY_SUMMARY">Resumo Semanal</SelectItem>
            <SelectItem value="CAMPAIGN_COMPLETED">Campanha Concluída</SelectItem>
            <SelectItem value="CAMPAIGN_SCHEDULED_STARTED">Campanha Iniciada</SelectItem>
            <SelectItem value="NUMBER_DISCONNECTED">Número Desconectado</SelectItem>
            <SelectItem value="CAMPAIGN_FAILED_TO_START">Campanha Falhou</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading} title="Atualizar">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </Button>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {totalCount > 0
            ? `${totalCount.toLocaleString("pt-BR")} email(s) encontrado(s) · Página ${page + 1} de ${totalPages}`
            : "Nenhum email encontrado"}
        </p>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Destinatário</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Tipo</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                <th className="text-center p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  <Eye size={12} className="inline mr-1" />Abriu
                </th>
                <th className="text-center p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  <MousePointerClick size={12} className="inline mr-1" />Clicou
                </th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Data</th>
                <th className="text-right p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    <Loader2 size={20} className="animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    <Mail size={24} className="mx-auto mb-2 opacity-40" />
                    Nenhum email encontrado
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => handleOpenDetail(log)}
                  >
                    <td className="p-3">
                      <p className="text-foreground font-medium text-sm truncate max-w-[200px]">{log.to_email}</p>
                    </td>
                    <td className="p-3">
                      <span className="text-xs font-mono text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
                        {emailTypeLabel(log.email_type)}
                      </span>
                    </td>
                    <td className="p-3">{statusBadge(log.status)}</td>
                    <td className="p-3 text-center">
                      {(log.opened_count || 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 text-accent text-xs font-semibold">
                          <Eye size={12} /> {log.opened_count}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {(log.clicked_count || 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 text-primary text-xs font-semibold">
                          <MousePointerClick size={12} /> {log.clicked_count}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("pt-BR", {
                        day: "2-digit", month: "2-digit", year: "2-digit",
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); handleOpenDetail(log); }}>
                        <ExternalLink size={14} className="text-muted-foreground" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
            className="gap-1"
          >
            <ChevronLeft size={14} /> Anterior
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i;
              } else if (page < 3) {
                pageNum = i;
              } else if (page > totalPages - 4) {
                pageNum = totalPages - 5 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? "default" : "outline"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage(pageNum)}
                  disabled={loading}
                >
                  {pageNum + 1}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1 || loading}
            className="gap-1"
          >
            Próximo <ChevronRight size={14} />
          </Button>
        </div>
      )}

      {/* Detail Dialog */}
      <EmailDetailDialog
        log={selectedLog}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}
