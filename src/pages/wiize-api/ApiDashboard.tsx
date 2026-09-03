import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Wallet,
  Coins,
  Receipt,
  Activity,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { PageHeader, StatCard, SectionCard } from "@/components/wiize-api/WiizeApiUI";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  brl,
  mockBalance,
  mockRecentActivity,
  mockUsageSeries,
  periodOptions,
  type PeriodKey,
} from "@/data/wiizeApiMocks";

export default function ApiDashboard() {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const series = mockUsageSeries[period];

  return (
    <>
      <Helmet>
        <title>Overview — Wiize API</title>
        <meta name="description" content="Saldo, consumo de tokens e atividade recente do seu workspace Wiize API." />
      </Helmet>

      <PageHeader
        title="Overview"
        description="Acompanhe saldo, consumo de Wiize Tokens e atividade das suas integrações."
        actions={
          <>
            <div className="flex rounded-lg border border-border p-0.5">
              {periodOptions.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    period === p.key
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Button asChild className="gap-2">
              <Link to="/api/credits">
                <Plus size={16} /> Adicionar saldo
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Saldo disponível"
          value={brl(mockBalance.balance)}
          hint={`${mockBalance.tokensAvailable.toLocaleString("pt-BR")} Wiize Tokens`}
          icon={Wallet}
        />
        <StatCard
          label="Tokens utilizados"
          value={mockBalance.tokensUsedPeriod.toLocaleString("pt-BR")}
          hint="No período selecionado"
          icon={Coins}
        />
        <StatCard
          label="Custo no período"
          value={brl(mockBalance.costPeriod)}
          hint="R$ 0,15 por Wiize Token"
          icon={Receipt}
        />
        <StatCard
          label="Requisições"
          value={mockBalance.requestsPeriod.toLocaleString("pt-BR")}
          hint={`${mockBalance.apisUsed} API utilizada`}
          icon={Activity}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Consumo de tokens"
          description="Evolução diária no período selecionado"
          className="lg:col-span-2"
        >
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="tokensFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <RTooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${v} tokens`, "Consumo"]}
                />
                <Area
                  type="monotone"
                  dataKey="tokens"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#tokensFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Uso por API" description="Distribuição do consumo">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Prospecting Intelligence API</span>
                <span className="tabular-nums text-muted-foreground">100%</span>
              </div>
              <Progress value={100} className="mt-2 h-1.5 bg-primary/15 [&>div]:bg-primary" />
            </div>
            <div className="rounded-lg border border-dashed border-border px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
              Novas APIs (Engagement Intelligence e Wian) aparecerão aqui automaticamente quando
              estiverem disponíveis.
            </div>
            <Button asChild variant="outline" size="sm" className="w-full gap-2">
              <Link to="/api/apis">
                Ver catálogo de APIs <ArrowUpRight size={14} />
              </Link>
            </Button>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Atividade recente"
        description="Últimas chamadas registradas no workspace"
        actions={
          <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
            <Link to="/api/usage">
              Ver tudo <ArrowUpRight size={13} />
            </Link>
          </Button>
        }
      >
        <ul className="divide-y divide-border/70">
          {mockRecentActivity.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{a.title}</p>
                <p className="truncate font-mono text-xs text-muted-foreground">{a.endpoint}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm tabular-nums text-foreground">{a.tokens} tokens</p>
                <p className="text-xs text-muted-foreground">{a.when}</p>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>
    </>
  );
}
