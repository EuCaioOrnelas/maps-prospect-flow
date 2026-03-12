import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Mail, Send, CheckCircle2, XCircle, Clock, Eye, MousePointerClick,
  Search, Loader2, ChevronLeft, ChevronRight, RefreshCw,
  CalendarIcon, User, AlertTriangle, ArrowLeft, Users
} from "lucide-react";

const PAGE_SIZE = 15;

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

type GroupedEmail = {
  key: string;
  email_type: string;
  subject: string;
  firstSentAt: string;
  total: number;
  sent: number;
  failed: number;
  queued: number;
  opened: number;
  clicked: number;
  samplePayload: any;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function emailTypeColor(type: string): string {
  const map: Record<string, string> = {
    ADMIN_BROADCAST: "bg-primary/15 text-primary border-primary/25",
    WEEKLY_SUMMARY: "bg-accent/15 text-accent border-accent/25",
    CAMPAIGN_COMPLETED: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25",
    CAMPAIGN_SCHEDULED_STARTED: "bg-blue-500/15 text-blue-600 border-blue-500/25",
    NUMBER_DISCONNECTED: "bg-destructive/15 text-destructive border-destructive/25",
    CAMPAIGN_FAILED_TO_START: "bg-destructive/15 text-destructive border-destructive/25",
    TRIAL_WELCOME: "bg-violet-500/15 text-violet-600 border-violet-500/25",
    TRIAL_REMINDER: "bg-amber-500/15 text-amber-600 border-amber-500/25",
    TRIAL_EXPIRING: "bg-orange-500/15 text-orange-600 border-orange-500/25",
  };
  return map[type] || "bg-muted text-muted-foreground border-border";
}

function statusBadge(status: string) {
  if (status === "sent") return <Badge className="bg-primary/20 text-primary border-primary/30 gap-1 text-[10px]"><CheckCircle2 size={10} /> Enviado</Badge>;
  if (status === "failed") return <Badge variant="destructive" className="gap-1 text-[10px]"><XCircle size={10} /> Falhou</Badge>;
  return <Badge variant="secondary" className="gap-1 text-[10px]"><Clock size={10} /> Na fila</Badge>;
}

// ── KPI Cards ─────────────────────────────────────────────────────────────────

function KPICards({ total, sent, failed, opened, clicked, loading }: {
  total: number; sent: number; failed: number; opened: number; clicked: number; loading: boolean;
}) {
  const openRate = sent > 0 ? (opened / sent) * 100 : 0;
  const clickRate = sent > 0 ? (clicked / sent) * 100 : 0;

  const cards = [
    { label: "Total Enviados", value: sent, icon: Send, color: "text-primary" },
    { label: "Falhas", value: failed, icon: XCircle, color: "text-destructive" },
    { label: "Aberturas", value: opened, icon: Eye, color: "text-accent", sub: `${openRate.toFixed(1)}%` },
    { label: "Cliques", value: clicked, icon: MousePointerClick, color: "text-primary", sub: `${clickRate.toFixed(1)}%` },
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

// ── Email Detail Dialog (per recipient) ───────────────────────────────────────

function RecipientDetailDialog({ log, open, onClose }: { log: EmailLog | null; open: boolean; onClose: () => void }) {
  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground text-sm">
            <User size={16} /> {log.to_email}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Status</span>
              <div>{statusBadge(log.status)}</div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Enviado em</span>
              <p className="text-xs text-foreground">
                {log.sent_at ? new Date(log.sent_at).toLocaleString("pt-BR") : new Date(log.created_at).toLocaleString("pt-BR")}
              </p>
            </div>
          </div>

          {log.error_message && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-xs font-medium text-destructive flex items-center gap-1.5 mb-1">
                <AlertTriangle size={12} /> Erro
              </p>
              <p className="text-xs text-destructive/80 font-mono">{log.error_message}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Eye size={12} className="text-accent" /> Aberturas
              </div>
              <p className="text-xl font-bold text-foreground">{log.opened_count || 0}</p>
              {log.opened_at && (
                <p className="text-[10px] text-muted-foreground">
                  {new Date(log.opened_at).toLocaleString("pt-BR")}
                </p>
              )}
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MousePointerClick size={12} className="text-primary" /> Cliques
              </div>
              <p className="text-xl font-bold text-foreground">{log.clicked_count || 0}</p>
              {log.clicked_at && (
                <p className="text-[10px] text-muted-foreground">
                  {new Date(log.clicked_at).toLocaleString("pt-BR")}
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Email Detail View (drill-down) ────────────────────────────────────────────

function EmailDetailView({ group, onBack }: { group: GroupedEmail; onBack: () => void }) {
  const [recipients, setRecipients] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchRecipient, setSearchRecipient] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<EmailLog | null>(null);
  const [recipientDetailOpen, setRecipientDetailOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const loadRecipients = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("email_logs")
        .select("*", { count: "exact" })
        .eq("email_type", group.email_type as any)
        .order("created_at", { ascending: false });

      if (group.subject && group.subject !== "Sem assunto") {
        query = query.eq("subject", group.subject);
      }

      if (searchRecipient.trim()) {
        query = query.ilike("to_email", `%${searchRecipient.trim()}%`);
      }

      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      setRecipients((data as EmailLog[]) || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error("Error loading recipients:", err);
    } finally {
      setLoading(false);
    }
  }, [group, searchRecipient, page]);

  useEffect(() => { loadRecipients(); }, [loadRecipients]);
  useEffect(() => { setPage(0); }, [searchRecipient]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const payload = group.samplePayload as any;
  const emailContent = payload?.content || payload?.title || "";

  return (
    <div className="space-y-5">
      {/* Header with back */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} /> Voltar
        </Button>
      </div>

      {/* Email info card */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <Badge className={cn("text-[10px] font-medium", emailTypeColor(group.email_type))}>
              {emailTypeLabel(group.email_type)}
            </Badge>
            <h3 className="text-lg font-semibold text-foreground">{group.subject}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CalendarIcon size={11} />
              {new Date(group.firstSentAt).toLocaleString("pt-BR")}
            </p>
          </div>
        </div>

        {/* Stats for this email */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Destinatários", value: group.total, icon: Users, color: "text-foreground" },
            { label: "Enviados", value: group.sent, icon: Send, color: "text-primary" },
            { label: "Falhas", value: group.failed, icon: XCircle, color: "text-destructive" },
            { label: "Aberturas", value: group.opened, icon: Eye, color: "text-accent" },
            { label: "Cliques", value: group.clicked, icon: MousePointerClick, color: "text-primary" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border bg-muted/20 p-3 space-y-0.5">
              <div className="flex items-center gap-1.5">
                <s.icon size={11} className={s.color} />
                <span className="text-[10px] text-muted-foreground font-medium">{s.label}</span>
              </div>
              <p className="text-lg font-bold text-foreground">{s.value.toLocaleString("pt-BR")}</p>
            </div>
          ))}
        </div>

        {/* Email preview */}
        {emailContent && (
          <div className="space-y-2 pt-2 border-t border-border">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preview do Conteúdo</h4>
            <div
              className="rounded-lg border bg-background p-4 text-sm text-foreground prose prose-sm max-w-none max-h-[300px] overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: emailContent }}
            />
          </div>
        )}
      </div>

      {/* Recipients search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar destinatário..."
            value={searchRecipient}
            onChange={(e) => setSearchRecipient(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {totalCount > 0 ? `${totalCount} destinatário(s)` : ""}
        </p>
      </div>

      {/* Recipients table */}
      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Destinatário</th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                <th className="text-center p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  <Eye size={12} className="inline mr-1" />Abriu
                </th>
                <th className="text-center p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  <MousePointerClick size={12} className="inline mr-1" />Clicou
                </th>
                <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Data</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center">
                    <Loader2 size={20} className="animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : recipients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">
                    Nenhum destinatário encontrado
                  </td>
                </tr>
              ) : (
                recipients.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => { setSelectedRecipient(r); setRecipientDetailOpen(true); }}
                  >
                    <td className="p-3">
                      <p className="text-foreground font-medium text-sm truncate max-w-[220px]">{r.to_email}</p>
                    </td>
                    <td className="p-3">{statusBadge(r.status)}</td>
                    <td className="p-3 text-center">
                      {(r.opened_count || 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 text-accent text-xs font-semibold">
                          <Eye size={12} /> {r.opened_count}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {(r.clicked_count || 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 text-primary text-xs font-semibold">
                          <MousePointerClick size={12} /> {r.clicked_count}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString("pt-BR", {
                        day: "2-digit", month: "2-digit", year: "2-digit",
                        hour: "2-digit", minute: "2-digit"
                      })}
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
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0 || loading} className="gap-1">
            <ChevronLeft size={14} /> Anterior
          </Button>
          <span className="text-xs text-muted-foreground">Página {page + 1} de {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1 || loading} className="gap-1">
            Próximo <ChevronRight size={14} />
          </Button>
        </div>
      )}

      <RecipientDetailDialog
        log={selectedRecipient}
        open={recipientDetailOpen}
        onClose={() => setRecipientDetailOpen(false)}
      />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function EmailHistoryPanel() {
  const [allLogs, setAllLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [selectedGroup, setSelectedGroup] = useState<GroupedEmail | null>(null);

  // Load all logs to group client-side
  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (typeFilter !== "all") {
        query = query.eq("email_type", typeFilter as any);
      }
      if (dateFrom) {
        query = query.gte("created_at", dateFrom.toISOString());
      }
      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endOfDay.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      setAllLogs((data as EmailLog[]) || []);
    } catch (err) {
      console.error("Error loading logs:", err);
      setAllLogs([]);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, dateFrom, dateTo]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  // Group emails by type + subject
  const grouped: GroupedEmail[] = (() => {
    const map = new Map<string, GroupedEmail>();
    for (const log of allLogs) {
      const subject = log.subject || (log.payload as any)?.subject || "Sem assunto";
      const key = `${log.email_type}::${subject}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          email_type: log.email_type,
          subject,
          firstSentAt: log.created_at,
          total: 0,
          sent: 0,
          failed: 0,
          queued: 0,
          opened: 0,
          clicked: 0,
          samplePayload: log.payload,
        });
      }
      const g = map.get(key)!;
      g.total++;
      if (log.status === "sent") g.sent++;
      if (log.status === "failed") g.failed++;
      if (log.status === "queued") g.queued++;
      if ((log.opened_count || 0) > 0) g.opened++;
      if ((log.clicked_count || 0) > 0) g.clicked++;
      // Keep earliest date
      if (log.created_at < g.firstSentAt) g.firstSentAt = log.created_at;
    }
    return Array.from(map.values()).sort((a, b) => new Date(b.firstSentAt).getTime() - new Date(a.firstSentAt).getTime());
  })();

  // Global KPIs
  const globalKpis = {
    total: allLogs.length,
    sent: allLogs.filter(l => l.status === "sent").length,
    failed: allLogs.filter(l => l.status === "failed").length,
    opened: allLogs.filter(l => (l.opened_count || 0) > 0).length,
    clicked: allLogs.filter(l => (l.clicked_count || 0) > 0).length,
  };

  if (selectedGroup) {
    return <EmailDetailView group={selectedGroup} onBack={() => setSelectedGroup(null)} />;
  }

  return (
    <div className="space-y-5">
      {/* Global KPIs */}
      <KPICards {...globalKpis} loading={loading} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs h-9", dateFrom && "border-primary/50 bg-primary/5")}>
              <CalendarIcon size={13} />
              {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Data início"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={setDateFrom}
              disabled={(date) => date > new Date() || (dateTo ? date > dateTo : false)}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        <span className="text-xs text-muted-foreground">até</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs h-9", dateTo && "border-primary/50 bg-primary/5")}>
              <CalendarIcon size={13} />
              {dateTo ? format(dateTo, "dd/MM/yyyy") : "Data fim"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={setDateTo}
              disabled={(date) => date > new Date() || (dateFrom ? date < dateFrom : false)}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px] h-9">
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

        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
            Limpar datas
          </Button>
        )}

        <Button variant="outline" size="icon" className="h-9 w-9 ml-auto" onClick={loadLogs} disabled={loading} title="Atualizar">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </Button>
      </div>

      {/* Email count */}
      <p className="text-xs text-muted-foreground">
        {grouped.length > 0
          ? `${grouped.length} email(s) · ${allLogs.length.toLocaleString("pt-BR")} envio(s) no total`
          : "Nenhum email encontrado"}
      </p>

      {/* Grouped email cards */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <Mail size={32} className="mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhum email encontrado no período</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((g) => {
            const openRate = g.sent > 0 ? ((g.opened / g.sent) * 100).toFixed(1) : "0";
            const clickRate = g.sent > 0 ? ((g.clicked / g.sent) * 100).toFixed(1) : "0";

            return (
              <div
                key={g.key}
                className="rounded-xl border bg-card hover:bg-muted/30 transition-all cursor-pointer p-4 group"
                onClick={() => setSelectedGroup(g)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={cn("text-[10px] font-medium", emailTypeColor(g.email_type))}>
                        {emailTypeLabel(g.email_type)}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <CalendarIcon size={10} />
                        {new Date(g.firstSentAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {g.subject}
                    </h4>
                  </div>

                  {/* Mini stats */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-center">
                      <p className="text-xs font-bold text-foreground">{g.total}</p>
                      <p className="text-[10px] text-muted-foreground">envios</p>
                    </div>
                    {g.failed > 0 && (
                      <div className="text-center">
                        <p className="text-xs font-bold text-destructive">{g.failed}</p>
                        <p className="text-[10px] text-muted-foreground">falhas</p>
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-xs font-bold text-accent">{openRate}%</p>
                      <p className="text-[10px] text-muted-foreground">abertura</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-primary">{clickRate}%</p>
                      <p className="text-[10px] text-muted-foreground">cliques</p>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
