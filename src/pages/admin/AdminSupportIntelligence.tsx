import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, RefreshCw, AlertTriangle, TrendingUp, Users, Bot, DollarSign,
  Gauge, Inbox, Star, Zap,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

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

type CategoryStat = { category: string; tickets: number; avg_nps: number | null; avg_frustration: number };
type ProblemUser = { user_id: string; name: string | null; email: string | null; tickets: number };

const SINCE_DAYS = 30;

export default function AdminSupportIntelligence() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [kpis, setKpis] = useState({
    totalTickets: 0,
    aiResolved: 0,
    escalated: 0,
    avgFrustration: 0,
    avgNps: 0 as number | null,
    costUsd: 0,
    aiResolutionRate: 0,
  });
  const [byCategory, setByCategory] = useState<CategoryStat[]>([]);
  const [worstUsers, setWorstUsers] = useState<ProblemUser[]>([]);
  const [topKb, setTopKb] = useState<{ id: string; title: string; success_rate: number; total_uses: number }[]>([]);

  const sinceISO = useMemo(
    () => new Date(Date.now() - SINCE_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    [],
  );

  const load = async () => {
    setLoading(true);
    try {
      const [
        ticketsRes,
        incidentsRes,
        ratingsRes,
        costRes,
        kbRes,
      ] = await Promise.all([
        supabase
          .from("support_tickets")
          .select("id, status, phase, category, frustration_score, user_id, name, email, created_at")
          .gte("created_at", sinceISO)
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
          .limit(10),
      ]);

      const tickets = ticketsRes.data || [];
      const ratings = ratingsRes.data || [];
      const costs: any[] = costRes.data || [];

      const total = tickets.length;
      const escalated = tickets.filter((t: any) => t.status === "escalated" || t.phase === "escalated").length;
      const resolved = tickets.filter((t: any) => ["resolved", "closed", "rated"].includes(t.phase) || ["resolved", "closed"].includes(t.status)).length;
      const aiResolved = tickets.filter((t: any) => ["resolved", "closed", "rated"].includes(t.phase) && t.phase !== "escalated").length;
      const avgFrust = total > 0
        ? tickets.reduce((s: number, t: any) => s + (t.frustration_score || 0), 0) / total
        : 0;
      const npsScores = ratings.map((r: any) => r.nps_score).filter((n: any) => typeof n === "number");
      const avgNps = npsScores.length ? npsScores.reduce((a: number, b: number) => a + b, 0) / npsScores.length : null;
      const totalCost = costs.reduce((s: number, c: any) => s + Number(c.total_cost_usd || 0), 0);

      // Group by category
      const catMap = new Map<string, { tickets: number; nps: number[]; frust: number[] }>();
      for (const t of tickets as any[]) {
        const c = t.category || "Sem categoria";
        const g = catMap.get(c) || { tickets: 0, nps: [], frust: [] };
        g.tickets++;
        if (typeof t.frustration_score === "number") g.frust.push(t.frustration_score);
        catMap.set(c, g);
      }
      const ratingsByTicket = new Map(ratings.map((r: any) => [r.ticket_id, r.nps_score]));
      for (const t of tickets as any[]) {
        const nps = ratingsByTicket.get(t.id);
        if (typeof nps === "number") {
          const c = t.category || "Sem categoria";
          const g = catMap.get(c);
          if (g) g.nps.push(nps);
        }
      }
      const catStats: CategoryStat[] = Array.from(catMap.entries()).map(([category, g]) => ({
        category,
        tickets: g.tickets,
        avg_nps: g.nps.length ? Math.round((g.nps.reduce((a, b) => a + b, 0) / g.nps.length) * 10) / 10 : null,
        avg_frustration: g.frust.length ? Math.round(g.frust.reduce((a, b) => a + b, 0) / g.frust.length) : 0,
      })).sort((a, b) => b.tickets - a.tickets);

      // Top problem users
      const userMap = new Map<string, ProblemUser>();
      for (const t of tickets as any[]) {
        if (!t.user_id) continue;
        const cur = userMap.get(t.user_id) || { user_id: t.user_id, name: t.name, email: t.email, tickets: 0 };
        cur.tickets++;
        userMap.set(t.user_id, cur);
      }
      const wu = Array.from(userMap.values()).sort((a, b) => b.tickets - a.tickets).slice(0, 10);

      setKpis({
        totalTickets: total,
        aiResolved,
        escalated,
        avgFrustration: Math.round(avgFrust),
        avgNps,
        costUsd: totalCost,
        aiResolutionRate: total > 0 ? Math.round((aiResolved / total) * 100) : 0,
      });
      setByCategory(catStats);
      setIncidents(incidentsRes.data || []);
      setWorstUsers(wu);
      setTopKb(kbRes.data || []);
    } catch (e: any) {
      console.error(e);
      toast({ variant: "destructive", title: "Erro ao carregar inteligência", description: String(e?.message || e) });
    } finally {
      setLoading(false);
    }
  };

  const runDetector = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("support-incident-detector", { body: {} });
      if (error) throw error;
      toast({ title: "Detector executado", description: `Clusters: ${data?.clusters || 0} • Criados: ${data?.created || 0} • Atualizados: ${data?.updated || 0}` });
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

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" /> Inteligência de Suporte
          </h1>
          <p className="text-sm text-muted-foreground">Visão executiva do suporte nos últimos {SINCE_DAYS} dias</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Recarregar
          </Button>
          <Button size="sm" onClick={runDetector} disabled={running}>
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Detectar incidentes
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={<Inbox className="w-4 h-4" />} label="Tickets" value={kpis.totalTickets.toString()} />
        <Kpi icon={<Bot className="w-4 h-4" />} label="Resolvidos pela IA" value={`${kpis.aiResolutionRate}%`} sub={`${kpis.aiResolved} de ${kpis.totalTickets}`} />
        <Kpi icon={<AlertTriangle className="w-4 h-4 text-warning" />} label="Escalados" value={kpis.escalated.toString()} />
        <Kpi icon={<Gauge className="w-4 h-4" />} label="Frustração média" value={`${kpis.avgFrustration}/100`} tone={kpis.avgFrustration >= 50 ? "warn" : "ok"} />
        <Kpi icon={<Star className="w-4 h-4 text-amber-500" />} label="NPS médio" value={kpis.avgNps != null ? `${kpis.avgNps.toFixed(1)}/10` : "—"} />
        <Kpi icon={<DollarSign className="w-4 h-4 text-emerald-500" />} label="Custo IA" value={`$${kpis.costUsd.toFixed(4)}`} sub="período" />
        <Kpi icon={<Users className="w-4 h-4" />} label="Usuários afetados" value={worstUsers.length.toString()} sub="com 1+ ticket" />
        <Kpi icon={<TrendingUp className="w-4 h-4 text-primary" />} label="Incidentes ativos" value={incidents.filter((i) => i.status === "detected" || i.status === "investigating").length.toString()} />
      </div>

      {/* Incidentes */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-warning" /> Incidentes detectados</h2>
          <span className="text-xs text-muted-foreground">{incidents.length} clusters</span>
        </div>
        {incidents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum incidente. Rode o detector ou aguarde o cron diário.</p>
        ) : (
          <div className="space-y-2">
            {incidents.map((i) => (
              <div key={i.id} className="rounded-md border border-border p-3 flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{i.title}</span>
                    <Badge variant="outline" className="text-[10px]">{i.category}</Badge>
                    <Badge variant="outline" className={`text-[10px] ${i.status === "detected" ? "bg-warning/10 text-warning border-warning/30" : i.status === "resolved" ? "bg-success/10 text-success border-success/30" : i.status === "dismissed" ? "bg-muted" : "bg-primary/10 text-primary border-primary/30"}`}>{i.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{i.description}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{i.ticket_count} chamados • {i.affected_users} usuários afetados</p>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {i.status !== "investigating" && <Button size="sm" variant="outline" onClick={() => updateIncidentStatus(i.id, "investigating")}>Investigando</Button>}
                  {i.status !== "resolved" && <Button size="sm" variant="outline" onClick={() => updateIncidentStatus(i.id, "resolved")}>Resolvido</Button>}
                  {i.status !== "dismissed" && <Button size="sm" variant="ghost" onClick={() => updateIncidentStatus(i.id, "dismissed")}>Descartar</Button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Categoria mais problemática */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h2 className="font-semibold mb-3">Tickets por categoria</h2>
          {byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byCategory.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="tickets" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold mb-3">Categoria com pior NPS / mais frustração</h2>
          <div className="space-y-1.5 text-sm">
            {byCategory.slice(0, 8).map((c) => (
              <div key={c.category} className="flex items-center justify-between border-b border-border/50 py-1.5">
                <span>{c.category}</span>
                <div className="flex gap-2 text-xs">
                  <span className="text-muted-foreground">{c.tickets}</span>
                  <span className={c.avg_frustration >= 50 ? "text-destructive" : "text-muted-foreground"}>F:{c.avg_frustration}</span>
                  <span className={c.avg_nps != null && c.avg_nps < 7 ? "text-destructive" : "text-muted-foreground"}>NPS:{c.avg_nps ?? "—"}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Usuários com mais tickets + KB performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> Top usuários (risco de churn)</h2>
          {worstUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados.</p>
          ) : (
            <div className="space-y-1 text-sm">
              {worstUsers.map((u) => (
                <div key={u.user_id} className="flex items-center justify-between border-b border-border/50 py-1.5">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{u.name || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <Badge variant="outline" className={u.tickets >= 5 ? "bg-destructive/10 text-destructive border-destructive/30" : ""}>{u.tickets} tickets</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Bot className="w-4 h-4" /> Performance da Base de Conhecimento</h2>
          {topKb.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma KB usada ainda.</p>
          ) : (
            <div className="space-y-1 text-sm">
              {topKb.map((k) => {
                const sr = Math.round((k.success_rate || 0) * 100);
                return (
                  <div key={k.id} className="flex items-center justify-between border-b border-border/50 py-1.5 gap-2">
                    <span className="truncate flex-1">{k.title}</span>
                    <div className="flex gap-2 text-xs whitespace-nowrap">
                      <span className="text-muted-foreground">{k.total_uses} usos</span>
                      <span className={sr >= 70 ? "text-success" : sr >= 40 ? "text-warning" : "text-destructive"}>{sr}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: "ok" | "warn" }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        {icon} {label}
      </div>
      <p className={`text-xl font-bold ${tone === "warn" ? "text-warning" : ""}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </Card>
  );
}
