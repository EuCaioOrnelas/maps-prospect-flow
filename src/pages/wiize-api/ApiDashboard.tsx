import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Wallet, Coins, Receipt, Activity, ArrowUpRight } from "lucide-react";
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
import { PageHeader, StatCard, SectionCard, EmptyState } from "@/components/wiize-api/WiizeApiUI";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { brl, brlForTokens, endpointLabels, periodOptions, type PeriodKey } from "@/data/wiizeApi";
import { buildDailySeries, useApiRequests, useApiWallet } from "@/hooks/useWiizeApi";

const relative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.round(h / 24)} d`;
};

export default function ApiDashboard() {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const days = periodOptions.find((p) => p.key === period)?.days ?? 30;
  const { data: wallet, isLoading: loadingWallet } = useApiWallet();
  const { data: requests = [], isLoading: loadingReqs } = useApiRequests(period);

  const series = useMemo(() => buildDailySeries(requests, days), [requests, days]);
  const tokensUsed = requests.reduce((s, r) => s + (r.tokens_charged || 0), 0);
  const balanceTokens = wallet?.balance_tokens ?? 0;

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
          <div className="flex rounded-lg border border-border p-0.5">
            {periodOptions.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  period === p.key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Saldo disponível"
          value={brl(brlForTokens(balanceTokens))}
          hint={`${balanceTokens.toLocaleString("pt-BR")} Wiize Tokens`}
          icon={Wallet}
          loading={loadingWallet}
        />
        <StatCard
          label="Tokens utilizados"
          value={tokensUsed.toLocaleString("pt-BR")}
          hint="No período selecionado"
          icon={Coins}
          loading={loadingReqs}
        />
        <StatCard
          label="Custo no período"
          value={brl(brlForTokens(tokensUsed))}
          hint="R$ 0,01 por Wiize Token"
          icon={Receipt}
          loading={loadingReqs}
        />
        <StatCard
          label="Requisições"
          value={requests.length.toLocaleString("pt-BR")}
          hint={`${requests.filter((r) => r.status_code >= 400).length} com erro`}
          icon={Activity}
          loading={loadingReqs}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          icon={Activity}
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
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <RTooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${v} tokens`, "Consumo"]}
                />
                <Area type="monotone" dataKey="tokens" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#tokensFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard icon={Coins} title="Uso por API" description="Distribuição do consumo">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Prospecting Intelligence API</span>
                <span className="tabular-nums text-muted-foreground">{requests.length > 0 ? "100%" : "0%"}</span>
              </div>
              <Progress
                value={requests.length > 0 ? 100 : 0}
                className="mt-2 h-1.5 bg-primary/15 [&>div]:bg-primary"
              />
            </div>
            <div className="rounded-lg border border-dashed border-border px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
              Novas APIs (Engagement Intelligence e Wian) aparecerão aqui automaticamente quando estiverem disponíveis.
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
        icon={Receipt}
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
        {requests.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="Nenhuma chamada registrada ainda."
            description="Crie uma API Key e faça sua primeira requisição para ver o consumo aqui."
            action={
              <Button asChild size="sm">
                <Link to="/api/keys">Criar API Key</Link>
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border/70">
            {requests.slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {endpointLabels[a.endpoint] || a.endpoint}
                  </p>
                  <p className="truncate font-mono text-xs text-muted-foreground">{a.endpoint}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm tabular-nums text-foreground">{a.tokens_charged} tokens</p>
                  <p className="text-xs text-muted-foreground">{relative(a.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </>
  );
}
