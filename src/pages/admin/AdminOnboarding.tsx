import { useEffect, useMemo, useState } from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import {
  CalendarIcon,
  Download,
  Users,
  CheckCircle2,
  SkipForward,
  TrendingUp,
  Search,
  Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart as RPieChart,
  Pie,
  Cell,
} from "recharts";

// ============================================================
// Mapeamento (precisa bater com src/pages/Onboarding.tsx)
// ============================================================
const FIELD_LABELS: Record<string, string> = {
  role: "Perfil",
  sales_team_size: "Tamanho do time",
  biggest_challenge: "Maior desafio",
  sales_method: "Como vendem hoje",
  monthly_revenue: "Faturamento mensal",
  goal_90d: "Objetivo 90 dias",
};

const VALUE_LABELS: Record<string, Record<string, string>> = {
  role: {
    founder: "Founder / Dono",
    gestor: "Gestor Comercial",
    sdr: "SDR / Vendas",
    marketing: "Marketing",
    consultor: "Consultor / Agência",
    outro: "Outro",
  },
  sales_team_size: {
    "1": "Só eu",
    "2-5": "2 a 5",
    "6-20": "6 a 20",
    "21-100": "21 a 100",
    "100+": "100+",
  },
  biggest_challenge: {
    leads: "Gerar leads qualificados",
    operacao: "Organizar operação comercial",
    conversao: "Aumentar conversão",
    ia: "Prospectar com IA",
    equipe: "Gerir equipe comercial",
    previsao: "Prever receita",
  },
  sales_method: {
    whatsapp: "WhatsApp",
    crm: "CRM tradicional",
    planilha: "Planilha",
    sdr: "SDR outbound",
    indicacao: "Indicação",
    trafego: "Tráfego pago",
  },
  monthly_revenue: {
    "ate-20k": "Até R$ 20k",
    "20k-100k": "R$ 20k – R$ 100k",
    "100k-500k": "R$ 100k – R$ 500k",
    "500k+": "R$ 500k+",
    "nao-dizer": "Prefiro não dizer",
  },
  goal_90d: {
    "dobrar-leads": "Dobrar leads",
    organizar: "Organizar vendas",
    "fechar-mais": "Fechar mais",
    "escalar-time": "Escalar time",
    automatizar: "Automatizar operação",
  },
};

const ANSWER_FIELDS: Array<keyof typeof FIELD_LABELS> = [
  "role",
  "sales_team_size",
  "biggest_challenge",
  "sales_method",
  "monthly_revenue",
  "goal_90d",
];

const labelOf = (field: string, value: string | null) => {
  if (!value) return "—";
  return VALUE_LABELS[field]?.[value] || value;
};

interface OnboardingRow {
  id: string;
  user_id: string;
  role: string | null;
  sales_team_size: string | null;
  biggest_challenge: string | null;
  sales_method: string | null;
  monthly_revenue: string | null;
  goal_90d: string | null;
  skipped: boolean | null;
  created_at: string;
  completed_at: string | null;
  email?: string | null;
  name?: string | null;
  plan?: string | null;
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(217 91% 60%)",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(0 84% 60%)",
  "hsl(280 70% 60%)",
];

export default function AdminOnboarding() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<OnboardingRow[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [search, setSearch] = useState("");
  const [selectedRow, setSelectedRow] = useState<OnboardingRow | null>(null);

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  async function loadData() {
    setLoading(true);
    try {
      let query = supabase
        .from("user_onboarding")
        .select("*")
        .order("created_at", { ascending: false });

      if (startDate) query = query.gte("created_at", startOfDay(startDate).toISOString());
      if (endDate) query = query.lte("created_at", endOfDay(endDate).toISOString());

      const { data: onboardings, error } = await query;
      if (error) throw error;

      const userIds = (onboardings || []).map((o: any) => o.user_id);
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, name, plan")
          .in("id", userIds);
        (profiles || []).forEach((p: any) => {
          profilesMap[p.id] = p;
        });
      }

      const merged: OnboardingRow[] = (onboardings || []).map((o: any) => ({
        ...o,
        email: profilesMap[o.user_id]?.email ?? null,
        name: profilesMap[o.user_id]?.name ?? null,
        plan: profilesMap[o.user_id]?.plan ?? null,
      }));
      setRows(merged);
    } catch (e) {
      console.error("[AdminOnboarding] load error", e);
    } finally {
      setLoading(false);
    }
  }

  // ====== Filtros ======
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter(
      (r) =>
        (r.email || "").toLowerCase().includes(s) ||
        (r.name || "").toLowerCase().includes(s)
    );
  }, [rows, search]);

  // ====== KPIs ======
  const stats = useMemo(() => {
    const total = rows.length;
    const skipped = rows.filter((r) => r.skipped).length;
    const completed = rows.filter((r) => !r.skipped && r.completed_at).length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    return { total, skipped, completed, completionRate };
  }, [rows]);

  // ====== Gráfico evolução por dia ======
  const evolutionData = useMemo(() => {
    const map = new Map<string, { date: string; total: number; completed: number; skipped: number }>();
    rows.forEach((r) => {
      const day = format(new Date(r.created_at), "yyyy-MM-dd");
      const existing = map.get(day) || { date: day, total: 0, completed: 0, skipped: 0 };
      existing.total += 1;
      if (r.skipped) existing.skipped += 1;
      else if (r.completed_at) existing.completed += 1;
      map.set(day, existing);
    });
    return Array.from(map.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({ ...d, label: format(new Date(d.date), "dd/MM") }));
  }, [rows]);

  // ====== Gráficos de distribuição por resposta ======
  const distributions = useMemo(() => {
    const result: Record<string, { name: string; value: number }[]> = {};
    ANSWER_FIELDS.forEach((field) => {
      const counts: Record<string, number> = {};
      rows.forEach((r) => {
        const v = (r as any)[field];
        if (!v) return;
        counts[v] = (counts[v] || 0) + 1;
      });
      result[field] = Object.entries(counts)
        .map(([k, v]) => ({ name: labelOf(field, k), value: v }))
        .sort((a, b) => b.value - a.value);
    });
    return result;
  }, [rows]);

  // ====== Export ======
  function exportToXlsx() {
    const data = filteredRows.map((r) => ({
      Nome: r.name || "—",
      Email: r.email || "—",
      Plano: r.plan || "free",
      "Data do onboarding": format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      "Concluído em": r.completed_at
        ? format(new Date(r.completed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
        : "—",
      Status: r.skipped ? "Pulado" : r.completed_at ? "Concluído" : "Em andamento",
      Perfil: labelOf("role", r.role),
      "Tamanho do time": labelOf("sales_team_size", r.sales_team_size),
      "Maior desafio": labelOf("biggest_challenge", r.biggest_challenge),
      "Como vendem hoje": labelOf("sales_method", r.sales_method),
      "Faturamento mensal": labelOf("monthly_revenue", r.monthly_revenue),
      "Objetivo 90 dias": labelOf("goal_90d", r.goal_90d),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Onboarding");
    const fileName = `onboarding-wiize-${format(new Date(), "yyyy-MM-dd-HHmm")}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Onboarding</h1>
          <p className="text-muted-foreground mt-1">
            Respostas coletadas no fluxo de boas-vindas dos novos usuários.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DatePickerButton date={startDate} onChange={setStartDate} placeholder="Data inicial" />
          <DatePickerButton date={endDate} onChange={setEndDate} placeholder="Data final" />
          <Button variant="default" onClick={exportToXlsx} disabled={filteredRows.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar planilha
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          icon={<Users className="h-5 w-5" />}
          label="Total de onboardings"
          value={stats.total.toString()}
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          label="Concluídos"
          value={stats.completed.toString()}
          hint={`${stats.completionRate.toFixed(1)}% de conclusão`}
        />
        <KpiCard
          icon={<SkipForward className="h-5 w-5 text-amber-500" />}
          label="Pulados"
          value={stats.skipped.toString()}
          hint={
            stats.total > 0
              ? `${((stats.skipped / stats.total) * 100).toFixed(1)}% do total`
              : undefined
          }
        />
        <KpiCard
          icon={<TrendingUp className="h-5 w-5 text-primary" />}
          label="Taxa de conclusão"
          value={`${stats.completionRate.toFixed(1)}%`}
        />
      </div>

      {/* Evolução */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução diária</CardTitle>
          <CardDescription>Onboardings iniciados, concluídos e pulados por dia.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Iniciados"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  name="Concluídos"
                  stroke="hsl(142 71% 45%)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="skipped"
                  name="Pulados"
                  stroke="hsl(38 92% 50%)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Distribuição por resposta */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {ANSWER_FIELDS.map((field, idx) => {
          const data = distributions[field] || [];
          const usePie = field === "role" || field === "sales_team_size";
          return (
            <Card key={field}>
              <CardHeader>
                <CardTitle className="text-base">{FIELD_LABELS[field]}</CardTitle>
                <CardDescription>
                  Distribuição das respostas ({data.reduce((s, x) => s + x.value, 0)} respostas)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {usePie ? (
                      <RPieChart>
                        <Pie
                          data={data}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={(e: any) => `${e.name} (${e.value})`}
                        >
                          {data.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RPieChart>
                    ) : (
                      <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={150}
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 8,
                          }}
                        />
                        <Bar dataKey="value" fill={CHART_COLORS[idx % CHART_COLORS.length]} radius={[0, 6, 6, 0]} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Lista */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Usuários que responderam</CardTitle>
              <CardDescription>
                {filteredRows.length} de {rows.length} usuário(s) no período selecionado.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Maior desafio</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum onboarding encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.email || "—"}</div>
                      </TableCell>
                      <TableCell>
                        {r.skipped ? (
                          <Badge variant="secondary">Pulado</Badge>
                        ) : r.completed_at ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20">
                            Concluído
                          </Badge>
                        ) : (
                          <Badge variant="outline">Em andamento</Badge>
                        )}
                      </TableCell>
                      <TableCell>{labelOf("role", r.role)}</TableCell>
                      <TableCell>{labelOf("biggest_challenge", r.biggest_challenge)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedRow(r)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detalhe */}
      <Dialog open={!!selectedRow} onOpenChange={(o) => !o && setSelectedRow(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resposta completa</DialogTitle>
            <DialogDescription>
              {selectedRow?.name || selectedRow?.email}
            </DialogDescription>
          </DialogHeader>
          {selectedRow && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 p-4 rounded-lg bg-muted/40">
                <DetailItem label="Nome" value={selectedRow.name || "—"} />
                <DetailItem label="E-mail" value={selectedRow.email || "—"} />
                <DetailItem label="Plano" value={selectedRow.plan || "free"} />
                <DetailItem
                  label="Status"
                  value={
                    selectedRow.skipped
                      ? "Pulado"
                      : selectedRow.completed_at
                      ? "Concluído"
                      : "Em andamento"
                  }
                />
                <DetailItem
                  label="Iniciado em"
                  value={format(new Date(selectedRow.created_at), "dd/MM/yyyy HH:mm", {
                    locale: ptBR,
                  })}
                />
                <DetailItem
                  label="Concluído em"
                  value={
                    selectedRow.completed_at
                      ? format(new Date(selectedRow.completed_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })
                      : "—"
                  }
                />
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Respostas
                </h4>
                {ANSWER_FIELDS.map((field) => {
                  const value = (selectedRow as any)[field];
                  return (
                    <div
                      key={field}
                      className="flex justify-between items-start gap-4 p-3 rounded-lg border"
                    >
                      <div className="text-sm font-medium">{FIELD_LABELS[field]}</div>
                      <div className="text-sm text-right">{labelOf(field, value)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Helpers de UI
// ============================================================
function KpiCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          {icon}
        </div>
        <div className="mt-2 text-3xl font-bold">{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function DatePickerButton({
  date,
  onChange,
  placeholder,
}: {
  date: Date | undefined;
  onChange: (d: Date | undefined) => void;
  placeholder: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("justify-start text-left font-normal", !date && "text-muted-foreground")}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onChange}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
