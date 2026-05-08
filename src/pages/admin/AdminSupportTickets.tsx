import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, MessageSquare, RefreshCw, HelpCircle, Mail, Phone, User, Tag, CreditCard, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getPlanLabel } from "@/lib/planLabels";

type Ticket = {
  id: string;
  ticket_number: string | null;
  user_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  priority: string;
  category: string | null;
  resolved_by: string | null;
  ai_confidence: number | null;
  ai_summary: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

type Message = {
  id: string;
  role: string;
  content: string;
  created_at: string;
  metadata: any;
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30",
  in_progress: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",
  resolved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
  closed: "bg-muted text-muted-foreground border-border",
  escalated: "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
  high: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  urgent: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
};

const PAGE_SIZE = 20;

export default function AdminSupportTickets() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [internalNotes, setInternalNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [stats, setStats] = useState({ open: 0, escalated: 0, resolved: 0, total: 0 });

  const fetchStats = async () => {
    const [{ count: open }, { count: escalated }, { count: resolved }, { count: totalAll }] = await Promise.all([
      supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "escalated"),
      supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "resolved"),
      supabase.from("support_tickets").select("*", { count: "exact", head: true }),
    ]);
    setStats({
      open: open || 0,
      escalated: escalated || 0,
      resolved: resolved || 0,
      total: totalAll || 0,
    });
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("support_tickets")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(`name.ilike.${s},email.ilike.${s},phone.ilike.${s},category.ilike.${s},ai_summary.ilike.${s},ticket_number.ilike.${s}`);
      }

      const { data, error, count } = await q;
      if (error) throw error;
      setTickets((data as Ticket[]) || []);
      setTotal(count || 0);
    } catch (e: any) {
      toast({ title: "Erro ao carregar tickets", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  // realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("admin-support-tickets")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => {
        fetchStats();
        fetchTickets();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, search]);

  const openTicket = async (t: Ticket) => {
    setSelected(t);
    setInternalNotes(t.internal_notes || "");
    setLoadingMsgs(true);
    try {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", t.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setMessages((data as Message[]) || []);
    } catch (e: any) {
      toast({ title: "Erro ao carregar mensagens", description: e.message, variant: "destructive" });
    } finally {
      setLoadingMsgs(false);
    }
  };

  const updateStatus = async (status: string) => {
    if (!selected) return;
    const update: any = { status };
    if (status === "resolved" || status === "closed") {
      update.resolved_at = new Date().toISOString();
      update.resolved_by = "human";
    }
    const { error } = await supabase.from("support_tickets").update(update).eq("id", selected.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Status atualizado" });
    setSelected({ ...selected, ...update });
    fetchStats();
    fetchTickets();
  };

  const updatePriority = async (priority: string) => {
    if (!selected) return;
    const { error } = await supabase.from("support_tickets").update({ priority }).eq("id", selected.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setSelected({ ...selected, priority });
    fetchTickets();
  };

  const saveNotes = async () => {
    if (!selected) return;
    setSavingNotes(true);
    const { error } = await supabase
      .from("support_tickets")
      .update({ internal_notes: internalNotes })
      .eq("id", selected.id);
    setSavingNotes(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Notas salvas" });
    setSelected({ ...selected, internal_notes: internalNotes });
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const statCards = useMemo(() => ([
    { label: "Total", value: stats.total, color: "text-foreground" },
    { label: "Abertos", value: stats.open, color: "text-blue-500" },
    { label: "Escalados", value: stats.escalated, color: "text-rose-500" },
    { label: "Resolvidos", value: stats.resolved, color: "text-emerald-500" },
  ]), [stats]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tickets de Suporte</h1>
          <p className="text-sm text-muted-foreground">Conversas e chamados gerenciados pelo Wian e equipe</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchStats(); fetchTickets(); }}>
          <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por protocolo (WIZ-...), nome, email, telefone, categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setPage(0); fetchTickets(); } }}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="open">Abertos</SelectItem>
              <SelectItem value="in_progress">Em andamento</SelectItem>
              <SelectItem value="escalated">Escalados</SelectItem>
              <SelectItem value="resolved">Resolvidos</SelectItem>
              <SelectItem value="closed">Fechados</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => { setPage(0); fetchTickets(); }}>Buscar</Button>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contato</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>IA</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Nenhum ticket encontrado.
                  </TableCell>
                </TableRow>
              ) : tickets.map((t) => (
                <TableRow key={t.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openTicket(t)}>
                  <TableCell>
                    {t.ticket_number && (
                      <div className="font-mono text-[11px] text-primary mb-0.5">{t.ticket_number}</div>
                    )}
                    <div className="font-medium text-sm">{t.name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{t.email || t.phone || "Visitante anônimo"}</div>
                  </TableCell>
                  <TableCell className="text-sm">{t.category || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_COLORS[t.status] || ""}>{t.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-md ${PRIORITY_COLORS[t.priority] || ""}`}>{t.priority}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {t.ai_confidence != null ? `${Math.round(t.ai_confidence * 100)}%` : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openTicket(t); }}>
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{total} tickets — Página {page + 1} de {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
          </div>
        </div>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selected?.ticket_number || `Ticket #${selected?.id.slice(0, 8)}`}</SheetTitle>
          </SheetHeader>

          {selected && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Contato</p>
                  <p className="font-medium">{selected.name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{selected.email || selected.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Categoria</p>
                  <p className="font-medium">{selected.category || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <Select value={selected.status} onValueChange={updateStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Aberto</SelectItem>
                      <SelectItem value="in_progress">Em andamento</SelectItem>
                      <SelectItem value="escalated">Escalado</SelectItem>
                      <SelectItem value="resolved">Resolvido</SelectItem>
                      <SelectItem value="closed">Fechado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Prioridade</p>
                  <Select value={selected.priority} onValueChange={updatePriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selected.ai_summary && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs font-semibold mb-1">Resumo gerado pela IA</p>
                  <p className="text-sm whitespace-pre-wrap">{selected.ai_summary}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-semibold mb-2">Conversa</p>
                <div className="rounded-lg border border-border bg-background max-h-[420px] overflow-y-auto p-3 space-y-2">
                  {loadingMsgs ? (
                    <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Sem mensagens.</p>
                  ) : messages.map((m) => (
                    <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                        m.role === "user"
                          ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-100"
                          : m.role === "ai"
                            ? "bg-muted text-foreground"
                            : "bg-primary/10 text-foreground border border-primary/30"
                      }`}>
                        <div className="text-[10px] uppercase tracking-wide opacity-60 mb-1">{m.role}</div>
                        {m.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold mb-2">Notas internas</p>
                <Textarea
                  rows={4}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Anotações visíveis apenas para a equipe..."
                />
                <Button size="sm" className="mt-2" onClick={saveNotes} disabled={savingNotes}>
                  {savingNotes && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar notas
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
