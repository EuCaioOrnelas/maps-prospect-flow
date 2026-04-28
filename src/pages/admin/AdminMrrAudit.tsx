import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Download, RefreshCw, Search } from "lucide-react";

type Row = {
  provider?: "stripe" | "asaas";
  subscription_id: string;
  customer_email: string;
  stripe_status: string;
  plan: string;
  price_id: string;
  interval: string;
  monthly_mrr: number;
  cancel_at_period_end: boolean;
  trial_end: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  trial_will_charge_at: string | null;
  profile_plan: string | null;
  counted_in_mrr: boolean;
  counted_as_trial: boolean;
  reason: string;
};

type Summary = {
  total_subscriptions: number;
  stripe_count?: number;
  asaas_count?: number;
  active_count: number;
  active_mrr: number;
  trialing_count: number;
  trialing_mrr: number;
  excluded_count: number;
};

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString("pt-BR") : "—");

type Filter = "all" | "included" | "trial" | "excluded";
type ProviderFilter = "all" | "stripe" | "asaas";
const PAGE_SIZE = 25;

export default function AdminMrrAudit() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("audit-mrr");
      if (error) throw error;
      setRows(data.rows ?? []);
      setSummary(data.summary ?? null);
      setGeneratedAt(data.generated_at ?? null);
    } catch (e: any) {
      toast({ title: "Erro ao carregar auditoria", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter === "included" && !r.counted_in_mrr) return false;
      if (filter === "trial" && !r.counted_as_trial) return false;
      if (filter === "excluded" && (r.counted_in_mrr || r.counted_as_trial)) return false;
      if (providerFilter !== "all" && (r.provider ?? "stripe") !== providerFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        if (
          !r.customer_email.toLowerCase().includes(q) &&
          !r.subscription_id.toLowerCase().includes(q) &&
          !r.plan.toLowerCase().includes(q) &&
          !r.reason.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [rows, filter, providerFilter, query]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [filter, providerFilter, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  const exportCsv = () => {
    const headers = [
      "subscription_id",
      "customer_email",
      "stripe_status",
      "plan",
      "interval",
      "monthly_mrr",
      "cancel_at_period_end",
      "trial_end",
      "current_period_end",
      "canceled_at",
      "trial_will_charge_at",
      "profile_plan",
      "counted_in_mrr",
      "counted_as_trial",
      "reason",
    ];
    const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      headers.join(","),
      ...filtered.map((r) => headers.map((h) => escape((r as any)[h])).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mrr-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const StatusBadge = ({ row }: { row: Row }) => {
    if (row.counted_in_mrr) return <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20">Conta no MRR</Badge>;
    if (row.counted_as_trial) return <Badge className="bg-orange-500/15 text-orange-600 hover:bg-orange-500/20">Trial (não conta)</Badge>;
    return <Badge variant="secondary">Excluído</Badge>;
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Auditoria de MRR</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lista de cada assinatura Stripe com decisão de inclusão/exclusão no MRR e o motivo.
            {generatedAt && (
              <span className="ml-2 text-xs">Atualizado em {new Date(generatedAt).toLocaleString("pt-BR")}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={loading || rows.length === 0}>
            <Download size={14} className="mr-1.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Assinaturas (total)</div>
            <div className="text-xl font-semibold mt-1">{summary?.total_subscriptions ?? "—"}</div>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">No MRR</div>
            <div className="text-xl font-semibold mt-1 text-emerald-600">{summary?.active_count ?? "—"}</div>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">MRR ativo</div>
            <div className="text-xl font-semibold mt-1">{summary ? fmtBRL(summary.active_mrr) : "—"}</div>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Em trial</div>
            <div className="text-xl font-semibold mt-1 text-orange-600">
              {summary?.trialing_count ?? "—"}{" "}
              <span className="text-xs text-muted-foreground font-normal">
                ({summary ? fmtBRL(summary.trialing_mrr) : "—"})
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Excluídas</div>
            <div className="text-xl font-semibold mt-1">{summary?.excluded_count ?? "—"}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "included", "trial", "excluded"] as Filter[]).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Todas" : f === "included" ? "No MRR" : f === "trial" ? "Trial" : "Excluídas"}
          </Button>
        ))}
        <div className="relative flex-1 min-w-[240px] max-w-md ml-auto">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por email, plano, motivo, sub_id..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {/* Tabela */}
      <Card className="border-border/40 bg-card/80">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Nenhuma assinatura encontrada para o filtro atual.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Stripe</TableHead>
                  <TableHead className="text-right">MRR/mês</TableHead>
                  <TableHead>trial_end</TableHead>
                  <TableHead>trial_will_charge_at</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.subscription_id}>
                    <TableCell><StatusBadge row={r} /></TableCell>
                    <TableCell className="text-sm">{r.customer_email || "—"}</TableCell>
                    <TableCell className="text-sm capitalize">
                      {r.plan}
                      {r.profile_plan && r.profile_plan !== r.plan && (
                        <span className="ml-1 text-xs text-muted-foreground">(profile: {r.profile_plan})</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="font-mono">{r.stripe_status}</span>
                      {r.cancel_at_period_end && (
                        <Badge variant="outline" className="ml-1 text-[10px]">cancel@end</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">{fmtBRL(r.monthly_mrr)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(r.trial_end)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(r.trial_will_charge_at)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[360px]">{r.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
