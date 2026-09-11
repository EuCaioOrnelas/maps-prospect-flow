import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, TimerReset, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

type TrialRow = {
  id: string;
  name: string | null;
  email: string | null;
  plan: string | null;
  created_at: string;
  trial_start_at: string | null;
  trial_end_at: string | null;
  trial_will_charge_at: string | null;
  trial_auto_charge_cancelled: boolean | null;
  trial_auto_charge_cancelled_at: string | null;
  trial_plan_chosen: string | null;
  trial_billing_period: string | null;
  trial_asaas_subscription_id: string | null;
  trial_card_brand: string | null;
  trial_card_last4: string | null;
  is_archived: boolean | null;
};

const fmt = (v: string | null) => (v ? new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");

export default function AdminTrials() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<TrialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"active" | "expired" | "cancelled" | "all">("active");

  const load = async () => {
    setLoading(true);
    const pageSize = 1000;
    let from = 0;
    let all: TrialRow[] = [];
    while (true) {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, name, email, plan, created_at, trial_start_at, trial_end_at, trial_will_charge_at, trial_auto_charge_cancelled, trial_auto_charge_cancelled_at, trial_plan_chosen, trial_billing_period, trial_asaas_subscription_id, trial_card_brand, trial_card_last4, is_archived"
        )
        .or("trial_start_at.not.is.null,trial_end_at.not.is.null,trial_will_charge_at.not.is.null")
        .order("trial_end_at", { ascending: false, nullsFirst: false })
        .range(from, from + pageSize - 1);
      if (error || !data || data.length === 0) break;
      all = all.concat(data as any);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    setRows(all);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const enriched = useMemo(
    () =>
      rows.map((r) => {
        const end = r.trial_end_at || r.trial_will_charge_at;
        const endMs = end ? new Date(end).getTime() : 0;
        const active = endMs > Date.now();
        const daysLeft = active ? Math.ceil((endMs - Date.now()) / 86400000) : 0;
        return { ...r, end, active, daysLeft, cancelled: !!r.trial_auto_charge_cancelled };
      }),
    [rows]
  );

  const filtered = useMemo(
    () =>
      enriched.filter((r) => {
        const matchSearch =
          !search ||
          r.email?.toLowerCase().includes(search.toLowerCase()) ||
          r.name?.toLowerCase().includes(search.toLowerCase());
        const matchStatus =
          status === "all" ||
          (status === "active" && r.active) ||
          (status === "expired" && !r.active) ||
          (status === "cancelled" && r.cancelled);
        return matchSearch && matchStatus;
      }),
    [enriched, search, status]
  );

  const counters = useMemo(() => {
    const active = enriched.filter((r) => r.active).length;
    const cancelled = enriched.filter((r) => r.active && r.cancelled).length;
    return { total: enriched.length, active, cancelled, willCharge: active - cancelled };
  }, [enriched]);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TimerReset size={20} /> Trials
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {counters.total} registros · {counters.active} em trial · {counters.willCharge} com cobrança prevista ·{" "}
            {counters.cancelled} com ativação cancelada
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="text-xs">
          <RefreshCw size={14} className="mr-1.5" /> Atualizar
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por email ou nome..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as any)}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Em trial</SelectItem>
            <SelectItem value="cancelled">Ativação cancelada</SelectItem>
            <SelectItem value="expired">Trial encerrado</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border/40 bg-card/80">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Nenhum trial encontrado.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Cobrança automática</TableHead>
                  <TableHead>Plano escolhido</TableHead>
                  <TableHead>Cartão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => navigate(`/admin/usuarios/${r.id}`)}
                  >
                    <TableCell>
                      <p className="font-medium text-sm">{r.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{r.email}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {r.active ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-xs">
                            Em trial · {r.daysLeft}d
                          </Badge>
                        ) : (
                          <Badge className="bg-muted text-muted-foreground border-0 text-xs">Encerrado</Badge>
                        )}
                        {r.is_archived && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            Arquivado
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmt(r.trial_start_at || r.created_at)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmt(r.end)}</TableCell>
                    <TableCell>
                      {r.cancelled ? (
                        <div>
                          <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30 px-1.5 py-0">
                            Cancelada
                          </Badge>
                          <p className="text-[10px] text-muted-foreground mt-1">{fmt(r.trial_auto_charge_cancelled_at)}</p>
                        </div>
                      ) : r.trial_will_charge_at ? (
                        <div>
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 px-1.5 py-0">
                            Prevista
                          </Badge>
                          <p className="text-[10px] text-muted-foreground mt-1">{fmt(r.trial_will_charge_at)}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.trial_plan_chosen || r.plan || "—"}
                      {r.trial_billing_period ? ` · ${r.trial_billing_period}` : ""}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.trial_card_last4 ? `${r.trial_card_brand || "cartão"} ····${r.trial_card_last4}` : "—"}
                    </TableCell>
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
