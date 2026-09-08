import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { BarChart3, TrendingUp, Activity, Download, Copy, Check, ChevronLeft, ChevronRight, Layers } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
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
import { buildDailySeries, useApiRequests, type ApiRequestRow } from "@/hooks/useWiizeApi";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

/** Linha exibida na tabela: uma chamada isolada ou um agrupamento do mesmo minuto. */
interface UsageRow {
  key: string;
  created_at: string;
  last_at: string;
  endpoint: string;
  environment: string;
  status_code: number;
  calls: number;
  tokens: number;
  duration_ms: number | null;
  identifier: string | null;
  hasErrors: boolean;
}

const minuteKey = (iso: string) => iso.slice(0, 16); // YYYY-MM-DDTHH:MM

/** Junta chamadas do mesmo minuto, endpoint, ambiente e resultado numa linha só. */
function groupRequests(rows: ApiRequestRow[], grouped: boolean): UsageRow[] {
  if (!grouped) {
    return rows.map((r) => ({
      key: r.id,
      created_at: r.created_at,
      last_at: r.created_at,
      endpoint: r.endpoint,
      environment: r.environment,
      status_code: r.status_code,
      calls: 1,
      tokens: r.tokens_charged || 0,
      duration_ms: r.duration_ms ?? null,
      identifier: r.request_id || r.id,
      hasErrors: r.status_code >= 400,
    }));
  }

  const map = new Map<string, UsageRow & { _durSum: number; _durCount: number }>();
  for (const r of rows) {
    const ok = r.status_code < 400;
    const key = `${minuteKey(r.created_at)}|${r.endpoint}|${r.environment}|${ok ? "ok" : `err${r.status_code}`}`;
    const current = map.get(key);
    if (!current) {
      map.set(key, {
        key,
        created_at: r.created_at,
        last_at: r.created_at,
        endpoint: r.endpoint,
        environment: r.environment,
        status_code: r.status_code,
        calls: 1,
        tokens: r.tokens_charged || 0,
        duration_ms: r.duration_ms ?? null,
        identifier: r.request_id || r.id,
        hasErrors: !ok,
        _durSum: r.duration_ms || 0,
        _durCount: r.duration_ms ? 1 : 0,
      });
      continue;
    }
    current.calls += 1;
    current.tokens += r.tokens_charged || 0;
    current._durSum += r.duration_ms || 0;
    current._durCount += r.duration_ms ? 1 : 0;
    current.duration_ms = current._durCount ? Math.round(current._durSum / current._durCount) : null;
    if (r.created_at < current.created_at) current.created_at = r.created_at;
    if (r.created_at > current.last_at) current.last_at = r.created_at;
    if (!ok) current.hasErrors = true;
  }

  return Array.from(map.values())
    .map(({ _durSum, _durCount, ...row }) => row)
    .sort((a, b) => (a.last_at < b.last_at ? 1 : -1));
}

function IdentifierCell({ value, calls }: { value: string | null; calls: number }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <span className="text-muted-foreground">—</span>;
  const short = value.length > 12 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Identificador copiado");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={calls > 1 ? `${value} (primeira de ${calls} chamadas)` : value}
      className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {short}
      {copied ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
    </button>
  );
}

export default function ApiUsage() {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [endpoint, setEndpoint] = useState("all");
  const [status, setStatus] = useState("all");
  const [grouped, setGrouped] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const days = periodOptions.find((p) => p.key === period)?.days ?? 30;
  const { data: requests = [], isLoading } = useApiRequests(period);

  const filtered = useMemo(
    () =>
      requests.filter(
        (r) =>
          (endpoint === "all" || r.endpoint === endpoint) &&
          (status === "all" || (status === "ok" ? r.status_code < 400 : r.status_code >= 400)),
      ),
    [requests, endpoint, status],
  );

  const rows = useMemo(() => groupRequests(filtered, grouped), [filtered, grouped]);

  useEffect(() => {
    setPage(1);
  }, [period, endpoint, status, grouped, pageSize]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const series = useMemo(() => buildDailySeries(requests, days), [requests, days]);
  const total = requests.reduce((s, r) => s + (r.tokens_charged || 0), 0);
  const daily = Math.round(total / Math.max(series.length, 1));

  const exportCsv = () => {
    const header = "data,identificador,endpoint,chamadas,status,tokens,custo_brl,duracao_media_ms\n";
    const body = rows
      .map((r) =>
        [
          r.last_at,
          r.identifier ?? "",
          r.endpoint,
          r.calls,
          r.status_code,
          r.tokens,
          brlForTokens(r.tokens).toFixed(2),
          r.duration_ms ?? "",
        ].join(","),
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

      <SectionCard
        icon={Activity}
        title="Requisições"
        description={grouped ? "Chamadas do mesmo minuto agrupadas por endpoint" : "Detalhamento chamada a chamada"}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Switch id="group-usage" checked={grouped} onCheckedChange={setGrouped} />
            <Label htmlFor="group-usage" className="flex cursor-pointer items-center gap-1.5 text-sm font-normal">
              <Layers size={14} className="text-muted-foreground" />
              Agrupar chamadas do mesmo minuto
            </Label>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              {rows.length.toLocaleString("pt-BR")} {grouped ? "grupos" : "chamadas"}
            </span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover">
                {[25, 50, 100, 200].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} por página</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={BarChart3} title="Nenhuma utilização encontrada." description="Ajuste os filtros ou aguarde novas chamadas." />
        ) : (
          <>
            <div className="-mx-5 overflow-x-auto px-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Identificador</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Ambiente</TableHead>
                    <TableHead className="text-right">Chamadas</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-right">Latência</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((r) => (
                    <TableRow key={r.key}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {fmtDate(r.last_at)}
                        {r.calls > 1 && r.created_at !== r.last_at && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({fmtTime(r.created_at)}–{fmtTime(r.last_at)})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <IdentifierCell value={r.identifier} calls={r.calls} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs">{r.endpoint}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.environment}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.calls > 1 ? <Badge variant="outline" className="tabular-nums">{r.calls}×</Badge> : r.calls}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{r.tokens.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right tabular-nums">{brl(brlForTokens(r.tokens))}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {r.duration_ms ? `${r.duration_ms} ms${r.calls > 1 ? " méd." : ""}` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={r.hasErrors ? "outline" : "secondary"}
                          className={r.hasErrors ? "text-destructive" : "bg-primary/10 text-primary hover:bg-primary/10"}
                        >
                          {r.hasErrors ? r.status_code : "200"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Mostrando {((currentPage - 1) * pageSize + 1).toLocaleString("pt-BR")}–
                {Math.min(currentPage * pageSize, rows.length).toLocaleString("pt-BR")} de {rows.length.toLocaleString("pt-BR")}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft size={14} /> Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Próxima <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          </>
        )}
      </SectionCard>
    </>
  );
}
