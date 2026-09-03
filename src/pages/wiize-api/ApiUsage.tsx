import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { BarChart3, TrendingUp, Activity } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, StatCard, SectionCard, EmptyState } from "@/components/wiize-api/WiizeApiUI";
import {
  brl,
  mockUsageRows,
  mockUsageSeries,
  periodOptions,
  type PeriodKey,
} from "@/data/wiizeApiMocks";

export default function ApiUsage() {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [endpoint, setEndpoint] = useState("all");
  const [status, setStatus] = useState("all");

  const rows = useMemo(
    () =>
      mockUsageRows.filter(
        (r) =>
          (endpoint === "all" || r.endpoint === endpoint) &&
          (status === "all" ||
            (status === "ok" ? r.status.startsWith("2") : !r.status.startsWith("2"))),
      ),
    [endpoint, status],
  );

  const series = mockUsageSeries[period];
  const total = series.reduce((s, p) => s + p.tokens, 0);
  const daily = Math.round(total / series.length);

  return (
    <>
      <Helmet>
        <title>Usage — Wiize API</title>
        <meta name="description" content="Acompanhe o consumo de tokens, custos e status das chamadas às APIs da Wiize." />
      </Helmet>

      <PageHeader title="Usage" description="Acompanhe consumo, custos e status das suas requisições." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Consumo atual" value={`${total.toLocaleString("pt-BR")} tokens`} hint="No período" icon={BarChart3} />
        <StatCard label="Média diária" value={`${daily.toLocaleString("pt-BR")} tokens`} hint="Base do período" icon={TrendingUp} />
        <StatCard
          label="Estimativa mensal"
          value={brl(daily * 30 * 0.15)}
          hint={`${(daily * 30).toLocaleString("pt-BR")} tokens projetados`}
          icon={TrendingUp}
        />
      </div>

      <SectionCard icon={BarChart3} title="Tokens utilizados" description="Evolução ao longo do tempo">
        <div className="mb-4 flex flex-wrap gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover">
              {periodOptions.map((p) => (
                <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value="prospecting" onValueChange={() => {}}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="prospecting">Prospecting Intelligence API</SelectItem>
            </SelectContent>
          </Select>
          <Select value={endpoint} onValueChange={setEndpoint}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">Todos endpoints</SelectItem>
              <SelectItem value="/companies">/companies</SelectItem>
              <SelectItem value="/analyze">/analyze</SelectItem>
              <SelectItem value="/diagnose">/diagnose</SelectItem>
              <SelectItem value="/approach">/approach</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="ok">Sucesso</SelectItem>
              <SelectItem value="error">Erro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ left: -20, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="usageFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={24} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <RTooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12 }}
                formatter={(v: number) => [`${v} tokens`, "Consumo"]}
              />
              <Area type="monotone" dataKey="tokens" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#usageFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard icon={Activity} title="Requisições" description="Detalhamento por chamada">
        {rows.length === 0 ? (
          <EmptyState icon={BarChart3} title="Nenhuma utilização encontrada." description="Ajuste os filtros ou aguarde novas chamadas." />
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>API</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-sm">{r.date}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{r.api}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs">{r.endpoint}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.tokens}</TableCell>
                    <TableCell className="text-right tabular-nums">{brl(r.cost)}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={r.status.startsWith("2") ? "secondary" : "outline"}
                        className={r.status.startsWith("2") ? "bg-primary/10 text-primary hover:bg-primary/10" : "text-destructive"}
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>
    </>
  );
}
