import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plug,
  Wallet,
  TrendingUp,
  Receipt,
  Activity,
  AlertTriangle,
  Loader2,
  Ban,
  CheckCircle2,
  Coins,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { brl } from "@/data/wiizeApi";

const PERIODS = [
  { days: 7, label: "7 dias" },
  { days: 30, label: "30 dias" },
  { days: 90, label: "90 dias" },
];

interface AdminAccount {
  user_id: string;
  name: string;
  status: string;
  balance_tokens: number;
  reserved_tokens: number;
  lifetime_credited_tokens: number;
  lifetime_spent_tokens: number;
  period_tokens: number;
  period_requests: number;
  period_cost_brl: number;
}

export default function AdminWiizeApi() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [days, setDays] = useState(30);
  const [adjust, setAdjust] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin-wiize-api", days],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("wiize-api-admin", {
        body: { action: "overview", days },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data as {
        totals: Record<string, number>;
        by_endpoint: { endpoint: string; requests: number; tokens: number; cost: number; errors: number; revenue: number }[];
        by_day: { date: string; tokens: number; requests: number; cost: number; revenue: number }[];
        accounts: AdminAccount[];
        topups: { id: string; name: string; amount_brl: number; tokens: number; status: string; method: string; created_at: string }[];
      };
    },
    staleTime: 30_000,
  });

  const mutate = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const { data, error } = await supabase.functions.invoke("wiize-api-admin", { body });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-wiize-api"] });
      toast({ title: "Ação aplicada" });
    },
    onError: (e: Error) => toast({ title: "Falha na ação", description: e.message, variant: "destructive" }),
  });

  const t = data?.totals || {};

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Plug size={22} className="text-primary" /> Wiize API
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Contas, saldos, consumo, receita, custo operacional e margem da API pública
          </p>
        </div>
        <div className="flex rounded-lg border border-border p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                days === p.days ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={Receipt} label="Receita (recargas pagas)" value={brl(t.revenue_brl || 0)} />
            <Metric icon={Coins} label="Consumo faturado" value={brl(t.consumed_brl || 0)} hint={`${(t.consumed_tokens || 0).toLocaleString("pt-BR")} tokens`} />
            <Metric icon={TrendingUp} label="Custo operacional" value={brl(t.cost_brl || 0)} hint="Estimado por operação" />
            <Metric icon={TrendingUp} label="Margem" value={brl(t.margin_brl || 0)} hint={`${t.margin_pct || 0}% sobre o consumo`} />
            <Metric icon={Wallet} label="Float em carteiras" value={brl((t.float_tokens || 0) * 0.01)} hint={`${(t.float_tokens || 0).toLocaleString("pt-BR")} tokens`} />
            <Metric icon={Activity} label="Requisições" value={(t.requests || 0).toLocaleString("pt-BR")} />
            <Metric icon={AlertTriangle} label="Erros" value={(t.errors || 0).toLocaleString("pt-BR")} hint={`${t.pending_topups || 0} recargas pendentes`} />
            <Metric icon={Plug} label="Contas / chaves ativas" value={`${t.accounts || 0} / ${t.active_keys || 0}`} />
          </div>

          <Card className="border-border/40 bg-card/80">
            <CardHeader><CardTitle className="text-base">Consumo x custo por dia</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.by_day || []} margin={{ left: -20, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <RTooltip
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12 }}
                    />
                    <Area type="monotone" dataKey="revenue" name="Receita" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                    <Area type="monotone" dataKey="cost" name="Custo" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.1} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="accounts">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="accounts">Contas</TabsTrigger>
              <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
              <TabsTrigger value="topups">Recargas</TabsTrigger>
            </TabsList>

            <TabsContent value="accounts" className="mt-6">
              <Card className="border-border/40 bg-card/80">
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Conta</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                        <TableHead className="text-right">Consumo período</TableHead>
                        <TableHead className="text-right">Custo</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                        <TableHead className="text-right">Ajuste (tokens)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.accounts || []).map((a) => (
                        <TableRow key={a.user_id}>
                          <TableCell className="text-sm">
                            <p className="font-medium">{a.name}</p>
                            <p className="font-mono text-[11px] text-muted-foreground">{a.user_id.slice(0, 8)}…</p>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {a.balance_tokens.toLocaleString("pt-BR")}
                            <span className="block text-[11px] text-muted-foreground">{brl(a.balance_tokens * 0.01)}</span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {a.period_tokens.toLocaleString("pt-BR")}
                            <span className="block text-[11px] text-muted-foreground">{a.period_requests} req</span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{brl(a.period_cost_brl)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-xs"
                              onClick={() =>
                                mutate.mutate({
                                  action: "set_status",
                                  user_id: a.user_id,
                                  status: a.status === "active" ? "blocked" : "active",
                                })
                              }
                            >
                              {a.status === "active" ? (
                                <><CheckCircle2 size={13} className="text-emerald-500" /> Ativa</>
                              ) : (
                                <><Ban size={13} className="text-destructive" /> Bloqueada</>
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Input
                                className="h-8 w-24 text-right"
                                placeholder="+100"
                                value={adjust[a.user_id] || ""}
                                onChange={(e) => setAdjust((p) => ({ ...p, [a.user_id]: e.target.value }))}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={mutate.isPending || !adjust[a.user_id]}
                                onClick={() => {
                                  const tokens = Math.round(Number(adjust[a.user_id]));
                                  if (!tokens) return;
                                  mutate.mutate({ action: "adjust", user_id: a.user_id, tokens });
                                  setAdjust((p) => ({ ...p, [a.user_id]: "" }));
                                }}
                              >
                                {mutate.isPending ? <Loader2 size={13} className="animate-spin" /> : "Aplicar"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="endpoints" className="mt-6">
              <Card className="border-border/40 bg-card/80">
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Endpoint</TableHead>
                        <TableHead className="text-right">Requisições</TableHead>
                        <TableHead className="text-right">Erros</TableHead>
                        <TableHead className="text-right">Tokens</TableHead>
                        <TableHead className="text-right">Receita</TableHead>
                        <TableHead className="text-right">Custo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.by_endpoint || []).map((e) => (
                        <TableRow key={e.endpoint}>
                          <TableCell className="font-mono text-xs">{e.endpoint}</TableCell>
                          <TableCell className="text-right tabular-nums">{e.requests}</TableCell>
                          <TableCell className="text-right tabular-nums">{e.errors}</TableCell>
                          <TableCell className="text-right tabular-nums">{e.tokens}</TableCell>
                          <TableCell className="text-right tabular-nums">{brl(e.revenue)}</TableCell>
                          <TableCell className="text-right tabular-nums">{brl(e.cost)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="topups" className="mt-6">
              <Card className="border-border/40 bg-card/80">
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Conta</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-right">Tokens</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.topups || []).map((tp) => (
                        <TableRow key={tp.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {new Date(tp.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </TableCell>
                          <TableCell className="text-sm">{tp.name}</TableCell>
                          <TableCell className="text-sm uppercase">{tp.method}</TableCell>
                          <TableCell className="text-right tabular-nums">{brl(tp.amount_brl)}</TableCell>
                          <TableCell className="text-right tabular-nums">{tp.tokens.toLocaleString("pt-BR")}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={tp.status === "paid" ? "default" : "outline"} className="text-[10px]">
                              {tp.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="border-border/40 bg-card/80">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <Icon size={15} className="text-primary shrink-0" strokeWidth={1.75} />
        </div>
        <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">{value}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}
