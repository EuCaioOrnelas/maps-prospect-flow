import { useEffect, useMemo, useState } from "react";
import { DollarSign, Coins, Users as UsersIcon, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Legend,
} from "recharts";

// ============================================================
// CUSTOS IA — cálculo real baseado em caracteres trafegados.
// ------------------------------------------------------------
// Modelo de referência: gpt-4o-mini (usado nos agentes da Wiize).
//   - Input:  $0.150 / 1M tokens  →  $0.00000015 / token
//   - Output: $0.600 / 1M tokens  →  $0.00000060 / token
//   - Heurística PT-BR: 1 token ≈ 4 caracteres
//
// Direção dos logs em agent_message_logs:
//   - 'received' = mensagem do lead   → INPUT do modelo
//   - 'sent'     = resposta do agente → OUTPUT do modelo
//
// Custo / Usuário = custo do mês ÷ usuários distintos que rodaram agentes
// Projeção 12m   = baseada na média diária dos últimos 30 dias.
// ============================================================

const PRICE_INPUT  = 0.150 / 1_000_000;
const PRICE_OUTPUT = 0.600 / 1_000_000;
const CHARS_PER_TOKEN = 4;
const USD_TO_BRL = 5.0; // aprox; usado só para exibição em R$

type DayPoint = { day: string; cost: number; tokens: number };
type ProjPoint = { month: string; projected: number };

export default function AdminIACustos() {
  const [loading, setLoading] = useState(true);
  const [daily, setDaily] = useState<DayPoint[]>([]);
  const [monthCost, setMonthCost] = useState(0);
  const [monthTokens, setMonthTokens] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Logs dos últimos 30 dias (limita por segurança a 10k linhas)
      const { data: logs } = await supabase
        .from("agent_message_logs")
        .select("agent_id, direction, content, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(10000);

      // Mapa agent_id → user_id (para contar usuários distintos)
      const agentIds = Array.from(new Set((logs || []).map((l: any) => l.agent_id))).filter(Boolean);
      let agentUserMap: Record<string, string> = {};
      if (agentIds.length > 0) {
        const { data: ags } = await supabase.from("ai_agents").select("id, user_id").in("id", agentIds);
        (ags || []).forEach((a: any) => { agentUserMap[a.id] = a.user_id; });
      }

      // Agrega por dia
      const buckets: Record<string, DayPoint> = {};
      const now = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000);
        const key = d.toISOString().slice(0, 10);
        buckets[key] = { day: key.slice(5), cost: 0, tokens: 0 };
      }

      let totalCost = 0;
      let totalTokens = 0;
      const userSet = new Set<string>();

      (logs || []).forEach((l: any) => {
        const key = l.created_at.slice(0, 10);
        const chars = l.content?.length || 0;
        const tokens = chars / CHARS_PER_TOKEN;
        const cost = l.direction === "received" ? tokens * PRICE_INPUT : tokens * PRICE_OUTPUT;
        if (buckets[key]) {
          buckets[key].cost += cost;
          buckets[key].tokens += tokens;
        }
        totalCost += cost;
        totalTokens += tokens;
        const uid = agentUserMap[l.agent_id];
        if (uid) userSet.add(uid);
      });

      setDaily(Object.values(buckets));
      setMonthCost(totalCost);
      setMonthTokens(totalTokens);
      setActiveUsers(userSet.size);
      setLoading(false);
    };
    load();
  }, []);

  // Projeção: usa média diária dos últimos 30d × 30 para cada um dos próximos 12 meses.
  // Modelo flat — assume uso constante. Se houver crescimento real, será refletido na
  // próxima atualização do dashboard.
  const projection = useMemo<ProjPoint[]>(() => {
    const dailyAvg = monthCost / 30;
    const now = new Date();
    const arr: ProjPoint[] = [];
    for (let i = 1; i <= 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      arr.push({
        month: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        projected: dailyAvg * 30,
      });
    }
    return arr;
  }, [monthCost]);

  const costPerUserUSD = activeUsers > 0 ? monthCost / activeUsers : 0;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <DollarSign size={20} className="text-primary" />
          Custos IA
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Custo real baseado em caracteres trafegados nos agentes (gpt-4o-mini · últimos 30d)
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPI
          icon={DollarSign}
          label="Custo Mensal Estimado"
          value={loading ? null : `$${monthCost.toFixed(2)} · R$ ${(monthCost * USD_TO_BRL).toFixed(2)}`}
          sub="Soma de input + output dos últimos 30 dias"
          accent="text-emerald-500"
        />
        <KPI
          icon={Coins}
          label="Tokens Consumidos"
          value={loading ? null : monthTokens >= 1_000_000
            ? `${(monthTokens / 1_000_000).toFixed(2)}M`
            : monthTokens >= 1_000
              ? `${(monthTokens / 1_000).toFixed(1)}k`
              : Math.round(monthTokens).toString()
          }
          sub="≈ caracteres ÷ 4 (heurística PT-BR)"
          accent="text-blue-500"
        />
        <KPI
          icon={UsersIcon}
          label="Custo / Usuário"
          value={loading ? null : activeUsers === 0 ? "—" : `$${costPerUserUSD.toFixed(3)}`}
          sub={`${activeUsers} usuário(s) ativo(s) com agentes`}
          accent="text-primary"
        />
      </div>

      {/* Evolução de custos diários */}
      <Card className="border-border/40 bg-card/80 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Evolução de Custos · 30 dias</CardTitle>
          <p className="text-xs text-muted-foreground/70">Custo diário em USD agregado de todos os agentes</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={42}
                  tickFormatter={(v) => `$${v.toFixed(2)}`} />
                <RTooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`$${v.toFixed(4)}`, "Custo"]}
                />
                <Area type="monotone" dataKey="cost" stroke="hsl(var(--primary))" fill="url(#costGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Projeção 12 meses */}
      <Card className="border-border/40 bg-card/80 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp size={14} className="text-primary" />
            Projeção · Próximos 12 meses
          </CardTitle>
          <p className="text-xs text-muted-foreground/70">
            Baseado na média diária atual ({`$${(monthCost / 30).toFixed(3)}/dia`}) × 30 dias. Recalcula automaticamente conforme o uso muda.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={projection} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={42}
                  tickFormatter={(v) => `$${v.toFixed(0)}`} />
                <RTooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`$${v.toFixed(2)} · R$ ${(v * USD_TO_BRL).toFixed(2)}`, "Projetado"]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="projected" name="Custo projetado (USD)" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
          {!loading && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
              <SmallStat label="Total 12m projetado" value={`$${(projection.reduce((a, b) => a + b.projected, 0)).toFixed(2)}`} />
              <SmallStat label="Total 12m em R$" value={`R$ ${(projection.reduce((a, b) => a + b.projected, 0) * USD_TO_BRL).toFixed(2)}`} />
              <SmallStat label="Custo médio mensal" value={`$${(projection.reduce((a, b) => a + b.projected, 0) / 12).toFixed(2)}`} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({
  icon: Icon, label, value, sub, accent,
}: { icon: any; label: string; value: string | null; sub: string; accent: string }) {
  return (
    <Card className="border-border/40 bg-card/80 rounded-2xl">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{label}</p>
          <Icon size={14} className={accent} />
        </div>
        {value === null ? (
          <Skeleton className="h-8 w-20 mt-1.5" />
        ) : (
          <p className="text-2xl font-bold text-foreground mt-1.5 tracking-tight">{value}</p>
        )}
        <p className="text-[10px] text-muted-foreground/50 mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/30 bg-background/50 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">{label}</p>
      <p className="text-sm font-semibold text-foreground mt-1">{value}</p>
    </div>
  );
}
