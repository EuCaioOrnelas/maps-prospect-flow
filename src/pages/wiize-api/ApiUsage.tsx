import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { BarChart3, TrendingUp, Activity, Download } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, StatCard, SectionCard, EmptyState } from "@/components/wiize-api/WiizeApiUI";
import { brl, brlForTokens, periodOptions, type PeriodKey } from "@/data/wiizeApi";
import { buildDailySeries, useApiRequests } from "@/hooks/useWiizeApi";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function ApiUsage() {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [endpoint, setEndpoint] = useState("all");
  const [status, setStatus] = useState("all");

  const days = periodOptions.find((p) => p.key === period)?.days ?? 30;
  const { data: requests = [], isLoading } = useApiRequests(period);

  const rows = useMemo(
    () =>
      requests.filter(
        (r) =>
          (endpoint === "all" || r.endpoint === endpoint) &&
          (status === "all" || (status === "ok" ? r.status_code < 400 : r.status_code >= 400)),
      ),
    [requests, endpoint, status],
  );

  const series = useMemo(() => buildDailySeries(requests, days), [requests, days]);
  const total = requests.reduce((s, r) => s + (r.tokens_charged || 0), 0);
  const daily = Math.round(total / Math.max(series.length, 1));

  const exportCsv = () => {
    const header = "data,endpoint,status,tokens,custo_brl,duracao_ms\n";
    const body = rows
      .map((r) =>
        [r.created_at, r.endpoint, r.status_code, r.tokens_charged, brlForTokens(r.tokens_charged).toFixed(2), r.duration_ms ?? ""].join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([header + body], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `wiize-api-usage-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Helmet>
        <title>Consumo — Wiize API</title>
        <meta name="description" content="Acompanhe o consumo de tokens, custos e status das chamadas às APIs da Wiize." />
      </Helmet>

      <PageHeader
        title="Consumo"
        description="Acompanhe consumo, custos e status das suas requisições."
        actions={
          <Button variant="outline" size="sm" className="gap-2" onClick={exportCsv} disabled={rows.length === 0}>
            <Download size={14} /> Exportar CSV
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Consumo atual" value={`${total.toLocaleString("pt-BR")} tokens`} hint="No período" icon={BarChart3} loading={isLoading} />
        <StatCard label="Média diária" value={`${daily.toLocaleString("pt-BR")} tokens`} hint="Base do período" icon={TrendingUp} loading={isLoading} />
        <StatCard
          label="Estimativa mensal"
          value={brl(brlForTokens(daily * 30))}
          hint={`${(daily * 30).toLocaleString("pt-BR")} tokens projetados`}
          icon={TrendingUp}
          loading={isLoading}
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
          <Select value={endpoint} onValueChange={setEndpoint}>
            <SelectTrigger className="w-[230px]"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">Todos endpoints</SelectItem>
              <SelectItem value="/v1/prospecting/search">/v1/prospecting/search</SelectItem>
              <SelectItem value="/v1/prospecting/analyze">/v1/prospecting/analyze</SelectItem>
              <SelectItem value="/v1/prospecting/approach">/v1/prospecting/approach</SelectItem>
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
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Ambiente</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Latência</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 200).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-sm">{fmtDate(r.created_at)}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs">{r.endpoint}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.environment}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.tokens_charged}</TableCell>
                    <TableCell className="text-right tabular-nums">{brl(brlForTokens(r.tokens_charged))}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {r.duration_ms ? `${r.duration_ms} ms` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={r.status_code < 400 ? "secondary" : "outline"}
                        className={r.status_code < 400 ? "bg-primary/10 text-primary hover:bg-primary/10" : "text-destructive"}
                      >
                        {r.status_code}
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
