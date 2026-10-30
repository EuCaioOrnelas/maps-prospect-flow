import { useEffect, useMemo, useState } from "react";
import {
  Inbox, Sparkles, Search, CalendarClock, Hammer, PackageCheck,
  ThumbsUp, Users, Tag, TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import {
  SUGGESTION_STATUS_LABEL,
  periodToRange,
  SUGGESTION_PERIODS,
  SUGGESTION_ALL_CATEGORIES,
  type SuggestionPeriod,
} from "@/lib/suggestions";

const STATUS_COLORS: Record<string, string> = {
  recebida: "#94a3b8",
  em_analise: "#3b82f6",
  em_avaliacao_comunidade: "#8b5cf6",
  planejada: "#f59e0b",
  em_desenvolvimento: "#178C61",
  implementada: "#10b981",
  nao_planejada: "#64748b",
  lida: "#94a3b8",
  entregue: "#10b981",
  arquivada: "#64748b",
};

const CHART_PRIMARY = "#178C61";

interface DashRow {
  id: string;
  category: string;
  status: string;
  vote_count: number;
  user_id: string;
  account_owner_id: string | null;
  created_at: string;
}

export default function SuggestionsDashboard() {
  const [period, setPeriod] = useState<SuggestionPeriod>("90d");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [rows, setRows] = useState<DashRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const range = periodToRange(period);
      let q = supabase
        .from("suggestions")
        .select("id, category, status, vote_count, user_id, account_owner_id, created_at")
        .gte("created_at", range.from.toISOString())
        .lte("created_at", range.to.toISOString());
      if (categoryFilter !== "all") q = q.eq("category", categoryFilter);
      const { data } = await q;
      if (!cancelled) {
        setRows((data || []) as unknown as DashRow[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [period, categoryFilter]);

  const stats = useMemo(() => {
    const by = (s: string) => rows.filter((r) => r.status === s).length;
    return {
      total: rows.length,
      novas: by("recebida"),
      emAnalise: by("em_analise") + by("lida"),
      planejadas: by("planejada"),
      emDesenvolvimento: by("em_desenvolvimento"),
      implementadas: by("implementada") + by("entregue"),
      votos: rows.reduce((acc, r) => acc + (r.vote_count || 0), 0),
      participantes: new Set(rows.map((r) => r.user_id)).size,
    };
  }, [rows]);

  const byMonth = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const key = r.created_at.slice(0, 7);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, total]) => ({
        month: new Date(`${month}-02`).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        total,
      }));
  }, [rows]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => map.set(r.category, (map.get(r.category) || 0) + 1));
    return [...map.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [rows]);

  const byStatus = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => map.set(r.status, (map.get(r.status) || 0) + 1));
    return [...map.entries()].map(([status, value]) => ({
      name: SUGGESTION_STATUS_LABEL[status as keyof typeof SUGGESTION_STATUS_LABEL] || status,
      value,
      color: STATUS_COLORS[status] || "#94a3b8",
    }));
  }, [rows]);

  const votesByMonth = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const key = r.created_at.slice(0, 7);
      map.set(key, (map.get(key) || 0) + (r.vote_count || 0));
    });
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, votos]) => ({
        month: new Date(`${month}-02`).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        votos,
      }));
  }, [rows]);

  const cards = [
    { label: "Total recebidas", value: stats.total, icon: Inbox },
    { label: "Novas (não analisadas)", value: stats.novas, icon: Sparkles },
    { label: "Em análise", value: stats.emAnalise, icon: Search },
    { label: "Planejadas", value: stats.planejadas, icon: CalendarClock },
    { label: "Em desenvolvimento", value: stats.emDesenvolvimento, icon: Hammer },
    { label: "Implementadas", value: stats.implementadas, icon: PackageCheck },
    { label: "Total de votos", value: stats.votos, icon: ThumbsUp },
    { label: "Usuários participantes", value: stats.participantes, icon: Users },
  ];

  return (
    <div className="space-y-6">
      {/* Filtros do dashboard */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="space-y-1.5 sm:w-48">
          <p className="text-xs text-muted-foreground">Período</p>
          <Select value={period} onValueChange={(v) => setPeriod(v as SuggestionPeriod)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SUGGESTION_PERIODS.filter((p) => p.value !== "custom").map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:w-56">
          <p className="text-xs text-muted-foreground">Categoria</p>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {SUGGESTION_ALL_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="border-border/60">
            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{c.label}</p>
                {loading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-semibold text-foreground mt-1">{c.value}</p>
                )}
              </div>
              <c.icon size={18} className="text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-foreground mb-3 inline-flex items-center gap-2">
              <TrendingUp size={15} className="text-primary" /> Sugestões recebidas por mês
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={byMonth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis allowDecimals={false} fontSize={11} />
                  <Tooltip />
                  <Area type="monotone" dataKey="total" stroke={CHART_PRIMARY} fill={CHART_PRIMARY} fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-foreground mb-3 inline-flex items-center gap-2">
              <Tag size={15} className="text-primary" /> Sugestões por categoria
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCategory} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis type="number" allowDecimals={false} fontSize={11} />
                  <YAxis type="category" dataKey="name" fontSize={11} width={120} />
                  <Tooltip />
                  <Bar dataKey="total" fill={CHART_PRIMARY} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-foreground mb-3 inline-flex items-center gap-2">
              <ThumbsUp size={15} className="text-primary" /> Evolução dos votos
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={votesByMonth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis allowDecimals={false} fontSize={11} />
                  <Tooltip />
                  <Area type="monotone" dataKey="votos" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-foreground mb-3">Status das sugestões</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {byStatus.map((s) => (
                      <Cell key={s.name} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend fontSize={11} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
