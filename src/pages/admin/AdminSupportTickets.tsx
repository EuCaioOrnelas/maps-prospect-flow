import { useEffect, useMemo, useRef, useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Search, MessageSquare, RefreshCw, HelpCircle, Mail, Phone, User, Tag, CreditCard,
  ExternalLink, Plus, Paperclip, X, Image as ImageIcon, Clock, Star, UserPlus, AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow, formatDistanceToNowStrict } from "date-fns";
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
  due_at: string | null;
  is_manual: boolean | null;
};

type Message = {
  id: string;
  role: string;
  content: string;
  created_at: string;
  metadata: any;
};

type HistoryEntry = {
  id: string;
  ticket_id: string;
  author_id: string | null;
  author_name: string | null;
  action_type: string;
  content: string | null;
  attachments: { path: string; name: string; type?: string }[];
  created_at: string;
};

type Rating = {
  id: string;
  stars: number | null;
  nps_score: number | null;
  nps_recommend: number | null;
  nps_comment: string | null;
  comment: string | null;
  created_at: string;
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
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [rating, setRating] = useState<Rating | null>(null);
  const [stats, setStats] = useState({ open: 0, escalated: 0, resolved: 0, total: 0, avgNps: null as number | null, ratingsCount: 0 });
  const [userPlan, setUserPlan] = useState<string | null>(null);
  const [ticketRatings, setTicketRatings] = useState<Record<string, { stars: number | null; nps_score: number | null; nps_recommend: number | null }>>({});

  // History entry form
  const [noteText, setNoteText] = useState("");
  const [noteFiles, setNoteFiles] = useState<File[]>([]);
  const [savingNote, setSavingNote] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual ticket modal
  const [manualOpen, setManualOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualCategory, setManualCategory] = useState("");
  const [manualPriority, setManualPriority] = useState("medium");
  const [manualSummary, setManualSummary] = useState("");
  const [creatingManual, setCreatingManual] = useState(false);

  const fetchStats = async () => {
    const [{ count: open }, { count: escalated }, { count: resolved }, { count: totalAll }, { data: ratings }] = await Promise.all([
      supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "escalated"),
      supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "resolved"),
      supabase.from("support_tickets").select("*", { count: "exact", head: true }),
      supabase.from("support_ratings").select("nps_score,stars"),
    ]);
    const scores = (ratings || [])
      .map((r: any) => (r.nps_score != null ? r.nps_score : (r.stars != null ? r.stars * 2 : null)))
      .filter((n: number | null): n is number => n != null);
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    setStats({
      open: open || 0,
      escalated: escalated || 0,
      resolved: resolved || 0,
      total: totalAll || 0,
      avgNps: avg,
      ratingsCount: scores.length,
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
      const list = (data as Ticket[]) || [];
      setTickets(list);
      setTotal(count || 0);

      // fetch ratings for visible tickets
      if (list.length) {
        const ids = list.map((t) => t.id);
        const { data: rs } = await supabase
          .from("support_ratings")
          .select("ticket_id,stars,nps_score,nps_recommend")
          .in("ticket_id", ids);
        const map: Record<string, any> = {};
        (rs || []).forEach((r: any) => { map[r.ticket_id] = r; });
        setTicketRatings(map);
      } else {
        setTicketRatings({});
      }
    } catch (e: any) {
      toast({ title: "Erro ao carregar tickets", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchTickets(); /* eslint-disable-next-line */ }, [page, statusFilter]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-support-tickets")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => {
        fetchStats(); fetchTickets();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line
  }, [page, statusFilter, search]);

  const refreshHistory = async (ticketId: string) => {
    const { data } = await supabase
      .from("support_ticket_history")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: false });
    const entries = (data as any as HistoryEntry[]) || [];
    setHistory(entries);
    // sign attachments
    const allPaths = entries.flatMap((e) => (e.attachments || []).map((a) => a.path));
    if (allPaths.length) {
      const { data: signed } = await supabase.storage.from("support-attachments").createSignedUrls(allPaths, 60 * 60);
      const map: Record<string, string> = {};
      signed?.forEach((s, i) => { if (s.signedUrl) map[allPaths[i]] = s.signedUrl; });
      setSignedUrls(map);
    } else {
      setSignedUrls({});
    }
  };

  const openTicket = async (t: Ticket) => {
    setSelected(t);
    setUserPlan(null);
    setNoteText(""); setNoteFiles([]);
    setLoadingMsgs(true);
    try {
      const [{ data: msgs, error: msgErr }, planRes, ratingRes] = await Promise.all([
        supabase.from("support_messages").select("*").eq("ticket_id", t.id).order("created_at", { ascending: true }),
        t.user_id
          ? supabase.from("profiles").select("plan").eq("id", t.user_id).maybeSingle()
          : (t.email
              ? supabase.from("profiles").select("plan").ilike("email", t.email).maybeSingle()
              : Promise.resolve({ data: null } as any)),
        supabase.from("support_ratings").select("*").eq("ticket_id", t.id).order("created_at", { ascending: false }).maybeSingle(),
      ]);
      if (msgErr) throw msgErr;
      setMessages((msgs as Message[]) || []);
      setUserPlan((planRes as any)?.data?.plan ?? null);
      setRating((ratingRes as any)?.data ?? null);
      await refreshHistory(t.id);
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
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Status atualizado" });
    setSelected({ ...selected, ...update });
    fetchStats(); fetchTickets();

    // log status change in history
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("support_ticket_history").insert({
      ticket_id: selected.id,
      author_id: user?.id ?? null,
      author_name: user?.email ?? "Equipe",
      action_type: "status_change",
      content: `Status alterado para "${status}"`,
      attachments: [],
    });
    refreshHistory(selected.id);
  };

  const updatePriority = async (priority: string) => {
    if (!selected) return;
    const { error } = await supabase.from("support_tickets").update({ priority }).eq("id", selected.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setSelected({ ...selected, priority });
    fetchTickets();
  };

  const handleAddFiles = (files: FileList | null) => {
    if (!files) return;
    const valid: File[] = [];
    Array.from(files).forEach((f) => {
      if (f.size > 10 * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: `${f.name} excede 10MB`, variant: "destructive" });
        return;
      }
      valid.push(f);
    });
    setNoteFiles((prev) => [...prev, ...valid]);
  };

  const addHistoryEntry = async () => {
    if (!selected) return;
    if (!noteText.trim() && noteFiles.length === 0) {
      toast({ title: "Adicione um texto ou anexo", variant: "destructive" });
      return;
    }
    setSavingNote(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Upload files
      const uploaded: { path: string; name: string; type?: string }[] = [];
      for (const file of noteFiles) {
        const ext = file.name.split(".").pop() || "bin";
        const path = `${selected.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("support-attachments").upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (upErr) throw upErr;
        uploaded.push({ path, name: file.name, type: file.type });
      }

      const { error } = await supabase.from("support_ticket_history").insert({
        ticket_id: selected.id,
        author_id: user?.id ?? null,
        author_name: user?.email ?? "Equipe",
        action_type: "note",
        content: noteText.trim() || null,
        attachments: uploaded,
      });
      if (error) throw error;

      setNoteText(""); setNoteFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast({ title: "Anotação adicionada" });
      refreshHistory(selected.id);
    } catch (e: any) {
      toast({ title: "Erro ao adicionar nota", description: e.message, variant: "destructive" });
    } finally {
      setSavingNote(false);
    }
  };

  const createManualTicket = async () => {
    if (!manualName.trim() || (!manualEmail.trim() && !manualPhone.trim())) {
      toast({ title: "Preencha nome e ao menos email ou telefone", variant: "destructive" });
      return;
    }
    setCreatingManual(true);
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          name: manualName.trim(),
          email: manualEmail.trim() || null,
          phone: manualPhone.trim() || null,
          category: manualCategory.trim() || "Cliente VIP",
          priority: manualPriority,
          ai_summary: manualSummary.trim() || null,
          status: "in_progress",
          is_manual: true,
          customer_type: "paid_client",
        })
        .select()
        .single();
      if (error) throw error;
      toast({ title: "Ticket criado", description: data.ticket_number || "" });
      setManualOpen(false);
      setManualName(""); setManualEmail(""); setManualPhone(""); setManualCategory(""); setManualSummary(""); setManualPriority("medium");
      fetchStats(); fetchTickets();
      openTicket(data as Ticket);
    } catch (e: any) {
      toast({ title: "Erro ao criar ticket", description: e.message, variant: "destructive" });
    } finally {
      setCreatingManual(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const ratingColor = (score: number | null | undefined) => {
    if (score == null) return "bg-muted text-muted-foreground border-border";
    if (score >= 8) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    if (score >= 5) return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    return "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30";
  };

  const avgColor = stats.avgNps == null
    ? "text-muted-foreground"
    : stats.avgNps >= 8 ? "text-emerald-500"
    : stats.avgNps >= 5 ? "text-amber-500"
    : "text-rose-500";

  const statCards = useMemo(() => ([
    { label: "Total", value: stats.total, color: "text-foreground", suffix: "" },
    { label: "Abertos", value: stats.open, color: "text-blue-500", suffix: "" },
    { label: "Escalados", value: stats.escalated, color: "text-rose-500", suffix: "" },
    { label: "Resolvidos", value: stats.resolved, color: "text-emerald-500", suffix: "" },
    {
      label: `Satisfação média (${stats.ratingsCount} avaliações)`,
      value: stats.avgNps == null ? "—" : stats.avgNps.toFixed(1),
      color: avgColor,
      suffix: stats.avgNps == null ? "" : "/10",
    },
  ]), [stats, avgColor]);

  const dueBadge = (t: Ticket) => {
    if (!t.due_at || t.status === "resolved" || t.status === "closed") return null;
    const due = new Date(t.due_at);
    const now = Date.now();
    const overdue = due.getTime() < now;
    return (
      <Badge variant="outline" className={overdue
        ? "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30 gap-1"
        : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1"}>
        <Clock className="w-3 h-3" />
        {overdue ? "Atrasado " : "Vence em "}{formatDistanceToNowStrict(due, { locale: ptBR })}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tickets de Suporte</h1>
          <p className="text-sm text-muted-foreground">Conversas e chamados gerenciados pelo Wian e equipe</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchStats(); fetchTickets(); }}>
            <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
          </Button>
          <Button size="sm" onClick={() => setManualOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Novo ticket manual
          </Button>
        </div>
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
                <TableHead>Prazo</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
              ) : tickets.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Nenhum ticket encontrado.</TableCell></TableRow>
              ) : tickets.map((t) => (
                <TableRow key={t.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openTicket(t)}>
                  <TableCell>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {t.ticket_number && <span className="font-mono text-[11px] text-primary">{t.ticket_number}</span>}
                      {t.is_manual && <Badge variant="outline" className="text-[9px] py-0 px-1 h-4 bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/30">Manual</Badge>}
                    </div>
                    <div className="font-medium text-sm">{t.name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{t.email || t.phone || "Visitante anônimo"}</div>
                  </TableCell>
                  <TableCell className="text-sm">{t.category || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className={STATUS_COLORS[t.status] || ""}>{t.status}</Badge></TableCell>
                  <TableCell>{dueBadge(t)}</TableCell>
                  <TableCell><span className={`text-xs px-2 py-0.5 rounded-md ${PRIORITY_COLORS[t.priority] || ""}`}>{t.priority}</span></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: ptBR })}</TableCell>
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

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {selected?.ticket_number || `Ticket #${selected?.id.slice(0, 8)}`}
              {selected && <Badge variant="outline" className={STATUS_COLORS[selected.status] || ""}>{selected.status}</Badge>}
              {selected?.is_manual && <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/30">Manual</Badge>}
              {selected && dueBadge(selected)}
            </DialogTitle>
            <DialogDescription>
              Detalhes do chamado, contato do solicitante e histórico completo da conversa.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="mt-2 space-y-6">
              {/* Card de contato */}
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold">Informações de contato</p>
                  {userPlan && (
                    <Badge variant="outline" className="gap-1">
                      <CreditCard className="w-3 h-3" /> Plano {getPlanLabel(userPlan)}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Nome</p>
                      <p className="font-medium truncate">{selected.name || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Tag className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Categoria</p>
                      <p className="font-medium truncate">{selected.category || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Email</p>
                      {selected.email ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{selected.email}</span>
                          <a
                            href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(selected.email)}&su=${encodeURIComponent(`Re: ${selected.ticket_number || "Ticket"} - Suporte Wiize`)}`}
                            target="_blank" rel="noopener noreferrer"
                          >
                            <Button size="sm" variant="outline" className="h-7 text-xs">
                              <ExternalLink className="w-3 h-3" /> Gmail
                            </Button>
                          </a>
                        </div>
                      ) : <p className="font-medium">—</p>}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Telefone</p>
                      {selected.phone ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{selected.phone}</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button size="sm" variant="outline" className="h-7 text-xs">
                                <ExternalLink className="w-3 h-3" /> WhatsApp
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2 bg-popover" align="end">
                              <p className="text-xs text-muted-foreground px-2 py-1">Abrir conversa em:</p>
                              {(() => {
                                const digits = selected.phone!.replace(/\D/g, "");
                                return (
                                  <div className="flex flex-col gap-1">
                                    <a href={`https://web.whatsapp.com/send?phone=${digits}`} target="_blank" rel="noopener noreferrer">
                                      <Button size="sm" variant="ghost" className="w-full justify-start h-8 text-xs">WhatsApp Web</Button>
                                    </a>
                                    <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer">
                                      <Button size="sm" variant="ghost" className="w-full justify-start h-8 text-xs">App / Mobile</Button>
                                    </a>
                                  </div>
                                );
                              })()}
                            </PopoverContent>
                          </Popover>
                        </div>
                      ) : <p className="font-medium">—</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status & Prioridade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground">
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 text-xs space-y-2 bg-popover" align="start">
                        <p className="font-semibold text-sm">O que cada status significa</p>
                        <div><span className="font-medium text-blue-600 dark:text-blue-300">Aberto</span> — chamado novo, ainda não atendido pela equipe.</div>
                        <div><span className="font-medium text-amber-600 dark:text-amber-300">Em andamento</span> — alguém da equipe já está cuidando do caso.</div>
                        <div><span className="font-medium text-rose-600 dark:text-rose-300">Escalado</span> — Wian não conseguiu resolver e passou para humano.</div>
                        <div><span className="font-medium text-emerald-600 dark:text-emerald-300">Resolvido</span> — problema solucionado, aguardando confirmação.</div>
                        <div><span className="font-medium text-muted-foreground">Fechado</span> — finalizado e arquivado.</div>
                      </PopoverContent>
                    </Popover>
                  </div>
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
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="text-xs text-muted-foreground">Prioridade</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground">
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 text-xs space-y-2 bg-popover" align="start">
                        <p className="font-semibold text-sm">Níveis de prioridade</p>
                        <div><span className="font-medium">Baixa</span> — dúvidas gerais, sem impacto imediato.</div>
                        <div><span className="font-medium text-blue-600 dark:text-blue-300">Média</span> — afeta o uso, mas há contorno.</div>
                        <div><span className="font-medium text-amber-600 dark:text-amber-300">Alta</span> — bloqueia funcionalidade importante.</div>
                        <div><span className="font-medium text-rose-600 dark:text-rose-300">Urgente</span> — cliente pagante parado, perda de receita.</div>
                      </PopoverContent>
                    </Popover>
                  </div>
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

              {/* NPS / Avaliação */}
              {rating && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Star className="w-4 h-4 text-emerald-500" /> Avaliação do cliente
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    {rating.stars != null && (
                      <div>
                        <p className="text-xs text-muted-foreground">Nota do atendimento</p>
                        <p className="font-bold text-lg">{rating.stars}/5 ★</p>
                      </div>
                    )}
                    {rating.nps_score != null && (
                      <div>
                        <p className="text-xs text-muted-foreground">Ajudou? (0-10)</p>
                        <p className="font-bold text-lg">{rating.nps_score}/10</p>
                      </div>
                    )}
                    {rating.nps_recommend != null && (
                      <div>
                        <p className="text-xs text-muted-foreground">Indicaria a um amigo? (0-10)</p>
                        <p className="font-bold text-lg">{rating.nps_recommend}/10</p>
                      </div>
                    )}
                  </div>
                  {(rating.nps_comment || rating.comment) && (
                    <p className="text-sm mt-3 italic text-muted-foreground">"{rating.nps_comment || rating.comment}"</p>
                  )}
                </div>
              )}

              {selected.ai_summary && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs font-semibold mb-1">Resumo gerado pela IA</p>
                  <p className="text-sm whitespace-pre-wrap">{selected.ai_summary}</p>
                </div>
              )}

              {/* Conversa */}
              <div>
                <p className="text-sm font-semibold mb-2">Conversa</p>
                <div className="rounded-lg border border-border bg-background max-h-[420px] overflow-y-auto p-3 space-y-2">
                  {loadingMsgs ? (
                    <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Sem mensagens (ticket manual ou sem chat).</p>
                  ) : messages.map((m) => (
                    <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                        m.role === "user"
                          ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-100"
                          : m.role === "ai"
                            ? "bg-muted text-foreground"
                            : "bg-primary/10 text-foreground border border-primary/30"
                      }`}>
                        <div className="text-[10px] uppercase tracking-wide opacity-60 mb-1 flex items-center gap-1">
                          {m.role}
                          {m.metadata?.has_image && <ImageIcon className="w-3 h-3" />}
                        </div>
                        {m.content}
                        {m.metadata?.has_image && (
                          <div className="mt-1 text-[10px] opacity-70 italic">📎 Cliente anexou imagem no chat</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Histórico interno */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold">Histórico interno (notas e anexos)</p>
                  <Badge variant="outline" className="text-xs">{history.length} registro(s)</Badge>
                </div>

                {/* Form de nova entrada */}
                <div className="rounded-lg border border-border bg-muted/10 p-3 space-y-2">
                  <Textarea
                    rows={3}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Adicione uma anotação interna (ex: 'Liguei para o cliente, voltarei amanhã 14h'...)"
                  />
                  {noteFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {noteFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-1 text-xs bg-background border border-border rounded px-2 py-1">
                          <Paperclip className="w-3 h-3" />
                          <span className="max-w-[160px] truncate">{f.name}</span>
                          <button onClick={() => setNoteFiles(noteFiles.filter((_, j) => j !== i))}>
                            <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => handleAddFiles(e.target.files)}
                    />
                    <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                      <Paperclip className="w-4 h-4 mr-1" /> Anexar prints
                    </Button>
                    <Button size="sm" onClick={addHistoryEntry} disabled={savingNote}>
                      {savingNote && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Adicionar ao histórico
                    </Button>
                  </div>
                </div>

                {/* Lista do histórico */}
                <div className="mt-3 space-y-2 max-h-[400px] overflow-y-auto">
                  {history.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhuma anotação ainda.</p>
                  ) : history.map((h) => (
                    <div key={h.id} className="rounded-lg border border-border bg-background p-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{h.author_name || "Sistema"}</span>
                          {h.action_type !== "note" && (
                            <Badge variant="outline" className="text-[9px] py-0 h-4">{h.action_type}</Badge>
                          )}
                        </div>
                        <span>{formatDistanceToNow(new Date(h.created_at), { addSuffix: true, locale: ptBR })}</span>
                      </div>
                      {h.content && <p className="text-sm whitespace-pre-wrap">{h.content}</p>}
                      {h.attachments?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {h.attachments.map((att, i) => {
                            const url = signedUrls[att.path];
                            const isImg = att.type?.startsWith("image/");
                            if (isImg && url) {
                              return (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                  <img src={url} alt={att.name} className="h-24 w-24 object-cover rounded border border-border hover:opacity-80 transition" />
                                </a>
                              );
                            }
                            return (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                 className="text-xs flex items-center gap-1 bg-muted px-2 py-1 rounded hover:bg-muted/80">
                                <Paperclip className="w-3 h-3" /> {att.name}
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manual ticket modal */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-lg bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" /> Novo ticket manual
            </DialogTitle>
            <DialogDescription>
              Para clientes VIP que falam direto pelo WhatsApp. O número do protocolo é gerado automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nome do cliente *</label>
              <Input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="João Silva" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <Input value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} placeholder="cliente@empresa.com" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Telefone</label>
                <Input value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} placeholder="+55 11 99999-9999" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                <Input value={manualCategory} onChange={(e) => setManualCategory(e.target.value)} placeholder="Cliente VIP" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Prioridade</label>
                <Select value={manualPriority} onValueChange={setManualPriority}>
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
            <div>
              <label className="text-xs font-medium text-muted-foreground">Resumo / motivo do contato</label>
              <Textarea rows={3} value={manualSummary} onChange={(e) => setManualSummary(e.target.value)} placeholder="Cliente reportou problema com integração WhatsApp..." />
            </div>
            <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded p-2">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>Use o histórico interno para registrar todas as interações pelo WhatsApp e manter a organização.</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOpen(false)}>Cancelar</Button>
            <Button onClick={createManualTicket} disabled={creatingManual}>
              {creatingManual && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
