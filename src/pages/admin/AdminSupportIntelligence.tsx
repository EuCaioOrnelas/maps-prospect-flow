import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, RefreshCw, AlertTriangle, Users, Bot, DollarSign,
  Inbox, Star, Zap, CheckCircle2, Clock, ArrowUpRight, TicketIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Incident = {
  id: string;
  title: string;
  category: string | null;
  status: string;
  ticket_count: number;
  affected_users: number;
  first_seen_at: string;
  last_seen_at: string;
  description: string | null;
};

type CategoryStat = { category: string; tickets: number; open: number; resolved: number; escalated: number; avg_nps: number | null; avg_frustration: number };
type ProblemUser = { user_id: string; name: string | null; email: string | null; tickets: number; open: number };
type Ticket = {
  id: string;
  ticket_number: string | null;
  name: string | null;
  email: string | null;
  status: string;
  phase: string | null;
  priority: string | null;
  category: string | null;
  frustration_score: number | null;
  created_at: string;
  resolved_at: string | null;
};

const RANGE_OPTIONS = [
  { value: 7, label: "7 dias" },
  { value: 30, label: "30 dias" },
  { value: 90, label: "90 dias" },
  { value: 365, label: "12 meses" },
];

const STATUS_LABEL: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  escalated: "Escalado",
  resolved: "Resolvido",
  closed: "Fechado",
};

export default function AdminSupportIntelligence() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [rangeDays, setRangeDays] = useState<number>(30);

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ratingsByTicket, setRatingsByTicket] = useState<Map<string, number>>(new Map());
  const [costUsd, setCostUsd] = useState(0);
  const [topKb, setTopKb] = useState<{ id: string; title: string; success_rate: number; total_uses: number }[]>([]);

  const sinceISO = useMemo(
    () => new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString(),
    [rangeDays],
  );

  const load = async () => {
    setLoading(true);
    try {
      const [ticketsRes, incidentsRes, ratingsRes, costRes, kbRes] = await Promise.all([
        supabase
          .from("support_tickets")
          .select("id, ticket_number, name, email, status, phase, priority, category, frustration_score, created_at, resolved_at, user_id")
          .gte("created_at", sinceISO)
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase
          .from("support_incidents")
          .select("*")
          .order("last_seen_at", { ascending: false })
          .limit(50),
        supabase
          .from("support_ratings")
          .select("ticket_id, nps_score, stars, created_at")
          .gte("created_at", sinceISO)
          .limit(2000),
        supabase
          .from("support_cost_by_category")
          .select("*")
          .limit(50),
        supabase
          .from("knowledge_base")
          .select("id, title, success_rate, total_uses")
          .order("total_uses", { ascending: false })
          .limit(8),
      ]);

      const tk = (ticketsRes.data || []) as any[];
      setTickets(tk);
      setIncidents(incidentsRes.data || []);
      const rmap = new Map<string, number>();
      for (const r of (ratingsRes.data || []) as any[]) {
        if (typeof r.nps_score === "number") rmap.set(r.ticket_id, r.nps_score);
      }
      setRatingsByTicket(rmap);
      const total = ((costRes.data || []) as any[]).reduce((s, c) => s + Number(c.total_cost_usd || 0), 0);
      setCostUsd(total);
      setTopKb(kbRes.data || []);
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "Erro ao carregar", description: String(e?.message || e) });
    } finally {
      setLoading(false);
    }
  };

  const runDetector = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("support-incident-detector", { body: {} });
      if (error) throw error;
      toast({ title: "Detector executado", description: `Clusters: ${data?.clusters || 0} • Criados: ${data?.created || 0}` });
      await load();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Falha no detector", description: String(e?.message || e) });
    } finally {
      setRunning(false);
    }
  };

  const updateIncidentStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("support_incidents").update({ status }).eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
      return;
    }
    setIncidents((cur) => cur.map((i) => (i.id === id ? { ...i, status } : i)));
  };

  useEffect(() => { load(); }, [sinceISO]);

  // ====== Derivações
  const isResolved = (t: Ticket) => ["resolved", "closed"].includes(t.status) || ["resolved", "closed", "rated"].includes(t.phase || "");
  const isEscalated = (t: Ticket) => t.status === "escalated" || t.phase === "escalated";
  const isOpen = (t: Ticket) => !isResolved(t) && !isEscalated(t);

  const kpis = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter(isOpen).length;
    const escalated = tickets.filter(isEscalated).length;
    const resolved = tickets.filter(isResolved).length;
    const aiResolved = tickets.filter((t) => isResolved(t) && t.phase !== "escalated").length;
    const avgFrust = total > 0 ? Math.round(tickets.reduce((s, t) => s + (t.frustration_score || 0), 0) / total) : 0;

    const npsList = Array.from(ratingsByTicket.values());
    const avgNps = npsList.length ? Math.round((npsList.reduce((a, b) => a + b, 0) / npsList.length) * 10) / 10 : null;

    // Tempo médio de resolução (h)
    const resolvedWithTime = tickets.filter((t) => t.resolved_at && t.created_at);
    const avgResolutionHours = resolvedWithTime.length
      ? Math.round(
          resolvedWithTime.reduce((s, t) => s + (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()), 0) /
          resolvedWithTime.length / 3600000 * 10,
        ) / 10
      : null;

    const aiRate = total > 0 ? Math.round((aiResolved / total) * 100) : 0;
    return { total, open, escalated, resolved, aiResolved, avgFrust, avgNps, avgResolutionHours, aiRate };
  }, [tickets, ratingsByTicket]);

  const byCategory: CategoryStat[] = useMemo(() => {
    const map = new Map<string, CategoryStat>();
    for (const t of tickets) {
      const c = t.category || "Sem categoria";
      const g = map.get(c) || { category: c, tickets: 0, open: 0, resolved: 0, escalated: 0, avg_nps: null, avg_frustration: 0 };
      g.tickets++;
      if (isOpen(t)) g.open++;
      if (isResolved(t)) g.resolved++;
      if (isEscalated(t)) g.escalated++;
      g.avg_frustration += (t.frustration_score || 0);
      map.set(c, g);
    }
    const npsAcc = new Map<string, number[]>();
    for (const t of tickets) {
      const nps = ratingsByTicket.get(t.id);
      if (typeof nps === "number") {
        const c = t.category || "Sem categoria";
        if (!npsAcc.has(c)) npsAcc.set(c, []);
        npsAcc.get(c)!.push(nps);
      }
    }
    return Array.from(map.values())
      .map((g) => {
        const nps = npsAcc.get(g.category) || [];
        return {
          ...g,
          avg_frustration: g.tickets ? Math.round(g.avg_frustration / g.tickets) : 0,
          avg_nps: nps.length ? Math.round((nps.reduce((a, b) => a + b, 0) / nps.length) * 10) / 10 : null,
        };
      })
      .sort((a, b) => b.tickets - a.tickets);
  }, [tickets, ratingsByTicket]);

  const worstUsers: ProblemUser[] = useMemo(() => {
    const map = new Map<string, ProblemUser>();
    for (const t of tickets as any[]) {
      if (!t.user_id) continue;
      const cur = map.get(t.user_id) || { user_id: t.user_id, name: t.name, email: t.email, tickets: 0, open: 0 };
      cur.tickets++;
      if (isOpen(t)) cur.open++;
      map.set(t.user_id, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.tickets - a.tickets).slice(0, 10);
  }, [tickets]);

  const recentOpenTickets = useMemo(
    () => tickets.filter(isOpen).slice(0, 12),
    [tickets],
  );

  const activeIncidents = incidents.filter((i) => i.status === "detected" || i.status === "investigating");

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inteligência de Suporte</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão completa do suporte: tickets, IA, incidentes e satisfação.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(rangeDays)} onValueChange={(v) => setRangeDays(Number(v))}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="h-9">
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
          <Button size="sm" onClick={runDetector} disabled={running} className="h-9">
            {running ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Zap className="w-4 h-4 mr-1.5" />}
            Detectar incidentes
          </Button>
        </div>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi
          icon={<Inbox className="w-4 h-4 text-muted-foreground" />}
          label="Tickets no período"
          value={kpis.total.toString()}
          sub={`${kpis.open} em aberto`}
        />
        <Kpi
          icon={<CheckCircle2 className="w-4 h-4 text-muted-foreground" />}
          label="Resolvidos"
          value={kpis.resolved.toString()}
          sub={`${kpis.aiRate}% pela IA`}
        />
        <Kpi
          icon={<AlertTriangle className="w-4 h-4 text-muted-foreground" />}
          label="Escalados p/ humano"
          value={kpis.escalated.toString()}
          sub={kpis.total ? `${Math.round((kpis.escalated / kpis.total) * 100)}% do total` : "—"}
        />
        <Kpi
          icon={<Clock className="w-4 h-4 text-muted-foreground" />}
          label="Tempo médio resolução"
          value={kpis.avgResolutionHours != null ? `${kpis.avgResolutionHours}h` : "—"}
          sub="criação → resolvido"
        />
      </div>

      {/* KPIs secundários */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={<Bot className="w-4 h-4 text-muted-foreground" />} label="IA resolvendo" value={`${kpis.aiRate}%`} sub={`${kpis.aiResolved} tickets`} />
        <Kpi icon={<Star className="w-4 h-4 text-muted-foreground" />} label="NPS médio" value={kpis.avgNps != null ? `${kpis.avgNps.toFixed(1)}/10` : "—"} sub={`${ratingsByTicket.size} avaliações`} />
        <Kpi icon={<DollarSign className="w-4 h-4 text-muted-foreground" />} label="Custo IA" value={`$${costUsd.toFixed(4)}`} sub="acumulado" />
        <Kpi icon={<Users className="w-4 h-4 text-muted-foreground" />} label="Frustração média" value={`${kpis.avgFrust}/100`} sub={kpis.avgFrust >= 50 ? "atenção" : "saudável"} />
      </div>

      {/* Incidentes */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              Incidentes detectados
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeIncidents.length} ativos · {incidents.length} no histórico
            </p>
          </div>
        </div>
        {incidents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum incidente. Rode o detector ou aguarde o cron diário.
          </p>
        ) : (
          <div className="space-y-2">
            {incidents.slice(0, 8).map((i) => (
              <div
                key={i.id}
                className="rounded-lg border border-border p-3 flex items-start justify-between gap-3 flex-wrap hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{i.title}</span>
                    {i.category && <Badge variant="outline" className="text-[10px] font-normal">{i.category}</Badge>}
                    <IncidentStatusBadge status={i.status} />
                  </div>
                  {i.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{i.description}</p>}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {i.ticket_count} chamados · {i.affected_users} usuários · última ocorrência{" "}
                    {formatDistanceToNow(new Date(i.last_seen_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {i.status !== "investigating" && (
                    <Button size="sm" variant="outline" className="h-8" onClick={() => updateIncidentStatus(i.id, "investigating")}>
                      Investigando
                    </Button>
                  )}
                  {i.status !== "resolved" && (
                    <Button size="sm" variant="outline" className="h-8" onClick={() => updateIncidentStatus(i.id, "resolved")}>
                      Resolvido
                    </Button>
                  )}
                  {i.status !== "dismissed" && (
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => updateIncidentStatus(i.id, "dismissed")}>
                      Descartar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Tickets em aberto */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <TicketIcon className="w-4 h-4 text-muted-foreground" />
              Tickets em aberto
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {kpis.open} aguardando atendimento
            </p>
          </div>
          <Link to="/admin/suporte/tickets">
            <Button variant="outline" size="sm" className="h-8">
              Ver todos <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
        {recentOpenTickets.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum ticket em aberto. 🎉</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[110px]">Ticket</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aberto há</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOpenTickets.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.ticket_number || t.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium truncate max-w-[200px]">{t.name || "—"}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">{t.email}</div>
                    </TableCell>
                    <TableCell className="text-sm">{t.category || "—"}</TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(t.created_at), { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Categorias e usuários */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="text-base font-semibold mb-4">Performance por categoria</h2>
          {byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sem dados.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Aberto</TableHead>
                    <TableHead className="text-right">Frust.</TableHead>
                    <TableHead className="text-right">NPS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byCategory.slice(0, 8).map((c) => (
                    <TableRow key={c.category}>
                      <TableCell className="text-sm">{c.category}</TableCell>
                      <TableCell className="text-right text-sm">{c.tickets}</TableCell>
                      <TableCell className="text-right text-sm">
                        {c.open > 0 ? <span className="font-medium">{c.open}</span> : <span className="text-muted-foreground">0</span>}
                      </TableCell>
                      <TableCell className={`text-right text-sm ${c.avg_frustration >= 50 ? "text-destructive" : "text-muted-foreground"}`}>
                        {c.avg_frustration}
                      </TableCell>
                      <TableCell className={`text-right text-sm ${c.avg_nps != null && c.avg_nps < 7 ? "text-destructive" : "text-muted-foreground"}`}>
                        {c.avg_nps != null ? c.avg_nps.toFixed(1) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            Usuários com mais tickets
          </h2>
          {worstUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sem dados.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Usuário</TableHead>
                    <TableHead className="text-right">Tickets</TableHead>
                    <TableHead className="text-right">Aberto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {worstUsers.map((u) => (
                    <TableRow key={u.user_id}>
                      <TableCell>
                        <div className="text-sm font-medium truncate max-w-[220px]">{u.name || "—"}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[220px]">{u.email}</div>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        <Badge variant="outline" className={u.tickets >= 5 ? "border-destructive/40 text-destructive" : ""}>
                          {u.tickets}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {u.open > 0 ? u.open : <span className="text-muted-foreground">0</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      {/* Base de conhecimento */}
      <Card className="p-5">
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
          <Bot className="w-4 h-4 text-muted-foreground" />
          Performance da base de conhecimento
        </h2>
        {topKb.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhum artigo usado ainda.</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Artigo</TableHead>
                  <TableHead className="text-right">Usos</TableHead>
                  <TableHead className="text-right">Taxa de sucesso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topKb.map((k) => {
                  const sr = Math.round((k.success_rate || 0) * 100);
                  return (
                    <TableRow key={k.id}>
                      <TableCell className="text-sm">{k.title}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{k.total_uses}</TableCell>
                      <TableCell className={`text-right text-sm font-medium ${sr >= 70 ? "text-success" : sr >= 40 ? "text-warning" : "text-destructive"}`}>
                        {sr}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Kpi({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABEL[status] || status;
  const cls =
    status === "open" ? "border-warning/40 text-warning" :
    status === "escalated" ? "border-destructive/40 text-destructive" :
    status === "resolved" || status === "closed" ? "border-success/40 text-success" :
    "";
  return <Badge variant="outline" className={`text-[10px] font-normal ${cls}`}>{label}</Badge>;
}

function IncidentStatusBadge({ status }: { status: string }) {
  const cls =
    status === "detected" ? "border-warning/40 text-warning" :
    status === "investigating" ? "border-primary/40 text-primary" :
    status === "resolved" ? "border-success/40 text-success" :
    "border-border text-muted-foreground";
  return <Badge variant="outline" className={`text-[10px] font-normal ${cls}`}>{status}</Badge>;
}
