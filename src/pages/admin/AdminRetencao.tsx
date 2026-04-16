import { useEffect, useMemo, useState } from "react";
import { Activity, Info, Users, TrendingDown, Calendar as CalIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Página de Retenção · Cohort Analysis
 *
 * COHORT = grupo de usuários que se cadastraram no MESMO mês.
 * O cohort de Janeiro acompanha SEMPRE os mesmos usuários ao longo dos
 * meses seguintes — mostra qual % deles continuou ativo em cada período.
 *
 * MÊS 0 (M0) = sempre 100% (todos os cadastros do mês são considerados retidos no mês 0).
 * MÊS 1 (M1) = % deles que tiveram atividade no mês seguinte.
 * E assim por diante.
 *
 * "Atividade" = updated_at do profile dentro daquele mês (proxy de login/uso).
 */

type CohortCell = { value: number | null; absolute: number | null };
type Cohort = { cohortKey: string; cohortLabel: string; cohortSize: number; cells: CohortCell[] };

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function shortLabel(key: string) {
  const [y, m] = key.split("-");
  return `${MONTH_LABELS[parseInt(m) - 1]}/${y.slice(2)}`;
}

export default function AdminRetencao() {
  const [loading, setLoading] = useState(true);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [d7, setD7] = useState(0);
  const [d30, setD30] = useState(0);
  const [dau, setDau] = useState(0);
  const [mau, setMau] = useState(0);
  const [periodMonths, setPeriodMonths] = useState<3 | 6 | 12>(6);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, created_at, updated_at");

      if (!profiles) { setLoading(false); return; }

      const now = new Date();
      const today = now.getTime();
      const sevenAgo = today - 7 * 86400000;
      const thirtyAgo = today - 30 * 86400000;
      const oneAgo = today - 86400000;

      // DAU/MAU/D7/D30 metrics
      const dauCount = profiles.filter((p: any) => new Date(p.updated_at).getTime() >= oneAgo).length;
      const mauCount = profiles.filter((p: any) => new Date(p.updated_at).getTime() >= thirtyAgo).length;
      // D7 retention = ativos nos últimos 7 dias / total cadastrado
      const total = profiles.length || 1;
      const active7  = profiles.filter((p: any) => new Date(p.updated_at).getTime() >= sevenAgo).length;
      const active30 = profiles.filter((p: any) => new Date(p.updated_at).getTime() >= thirtyAgo).length;

      setDau(dauCount);
      setMau(mauCount);
      setD7((active7 / total) * 100);
      setD30((active30 / total) * 100);

      // Build cohorts for last N months
      const cohortKeys: string[] = [];
      for (let i = periodMonths - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        cohortKeys.push(monthKey(d));
      }

      const built: Cohort[] = cohortKeys.map((cKey, cIdx) => {
        const [yStr, mStr] = cKey.split("-");
        const cohortStart = new Date(parseInt(yStr), parseInt(mStr) - 1, 1);
        const cohortEnd = new Date(parseInt(yStr), parseInt(mStr), 1);

        // Users created within this cohort month
        const cohortUsers = profiles.filter((p: any) => {
          const c = new Date(p.created_at);
          return c >= cohortStart && c < cohortEnd;
        });

        const size = cohortUsers.length;
        const cells: CohortCell[] = [];

        const monthsToShow = periodMonths - cIdx;
        for (let m = 0; m < monthsToShow; m++) {
          const periodStart = new Date(parseInt(yStr), parseInt(mStr) - 1 + m, 1);
          const periodEnd   = new Date(parseInt(yStr), parseInt(mStr) + m, 1);

          if (m === 0) {
            // M0 is always 100% by definition (everyone was active when they signed up)
            cells.push({ value: size > 0 ? 100 : null, absolute: size });
            continue;
          }

          if (size === 0) { cells.push({ value: null, absolute: null }); continue; }
          if (periodStart > now) { cells.push({ value: null, absolute: null }); continue; }

          // Count users from this cohort whose updated_at falls in this period
          const retained = cohortUsers.filter((u: any) => {
            const updated = new Date(u.updated_at);
            return updated >= periodStart && updated < periodEnd;
          }).length;
          cells.push({ value: (retained / size) * 100, absolute: retained });
        }

        // Pad with nulls
        while (cells.length < periodMonths) cells.push({ value: null, absolute: null });

        return { cohortKey: cKey, cohortLabel: shortLabel(cKey), cohortSize: size, cells };
      });

      setCohorts(built);
      setLoading(false);
    };
    load();
  }, [periodMonths]);

  const getColor = (value: number | null) => {
    if (value === null) return "bg-muted/20 text-muted-foreground/30";
    if (value >= 80)    return "bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-semibold";
    if (value >= 60)    return "bg-emerald-500/15 text-emerald-600/80 dark:text-emerald-400/80";
    if (value >= 40)    return "bg-amber-500/20 text-amber-600 dark:text-amber-400";
    if (value >= 20)    return "bg-orange-500/20 text-orange-600 dark:text-orange-400";
    return "bg-red-500/20 text-red-600 dark:text-red-400";
  };

  return (
    <TooltipProvider>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        {/* Header + filter */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">Retenção</h1>
              <CohortHelpDialog />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Quanto dos seus usuários continuam ativos com o passar do tempo
            </p>
          </div>
          <Tabs value={String(periodMonths)} onValueChange={(v) => setPeriodMonths(Number(v) as 3 | 6 | 12)}>
            <TabsList>
              <TabsTrigger value="3">3 meses</TabsTrigger>
              <TabsTrigger value="6">6 meses</TabsTrigger>
              <TabsTrigger value="12">12 meses</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricMini label="Retenção D7"  value={loading ? null : `${d7.toFixed(1)}%`}  sub="Ativos últimos 7 dias / total" />
          <MetricMini label="Retenção D30" value={loading ? null : `${d30.toFixed(1)}%`} sub="Ativos últimos 30 dias / total" />
          <MetricMini label="DAU"          value={loading ? null : dau.toLocaleString("pt-BR")} sub="Usuários ativos hoje (24h)" />
          <MetricMini label="MAU"          value={loading ? null : mau.toLocaleString("pt-BR")} sub="Usuários ativos no mês (30d)" />
        </div>

        {/* Cohort heatmap */}
        <Card className="border-border/40 bg-card/80 rounded-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-base">Cohort Retention Heatmap</CardTitle>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  Cada linha = um grupo (cohort) de usuários cadastrados no mesmo mês. Cada coluna = quantos meses depois.
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <Info size={14} className="text-muted-foreground/60" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-sm text-xs">
                  <p className="font-semibold mb-1">Como ler o heatmap</p>
                  <p className="text-muted-foreground">
                    Pegue a linha "Mai/25" — ela mostra quantos % dos usuários que se cadastraram em maio
                    continuaram ativos 1 mês depois (M1), 2 meses depois (M2), etc. Verde escuro = retenção alta;
                    vermelho = baixa retenção.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : cohorts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem dados de cadastro nos últimos meses.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left p-2 text-[10px] text-muted-foreground/70 font-semibold uppercase tracking-wider w-32">
                        Cohort
                      </th>
                      <th className="text-center p-2 text-[10px] text-muted-foreground/70 font-semibold uppercase tracking-wider w-20">
                        Tamanho
                      </th>
                      {Array.from({ length: periodMonths }).map((_, i) => (
                        <th key={i} className="p-2 text-[10px] text-muted-foreground/70 font-semibold uppercase tracking-wider text-center min-w-[60px]">
                          M{i}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cohorts.map((cohort) => (
                      <tr key={cohort.cohortKey} className="border-t border-border/10">
                        <td className="p-2 text-xs font-semibold text-foreground">{cohort.cohortLabel}</td>
                        <td className="p-2 text-center text-xs text-muted-foreground">
                          {cohort.cohortSize.toLocaleString("pt-BR")}
                        </td>
                        {cohort.cells.map((cell, j) => (
                          <td key={j} className="p-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className={`rounded-lg px-2 py-2.5 text-center text-[11px] cursor-default ${getColor(cell.value)}`}>
                                  {cell.value !== null ? `${cell.value.toFixed(0)}%` : "—"}
                                </div>
                              </TooltipTrigger>
                              {cell.value !== null && (
                                <TooltipContent side="top" className="text-xs">
                                  <strong>{cell.absolute}</strong> de <strong>{cohort.cohortSize}</strong> usuários ativos no mês {j} após cadastro
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Legend */}
                <div className="flex items-center justify-end gap-3 mt-4 flex-wrap">
                  <span className="text-[10px] text-muted-foreground/60">Retenção:</span>
                  <LegendCell color="bg-red-500/20 text-red-600" label="<20%" />
                  <LegendCell color="bg-orange-500/20 text-orange-600" label="20–40%" />
                  <LegendCell color="bg-amber-500/20 text-amber-600" label="40–60%" />
                  <LegendCell color="bg-emerald-500/15 text-emerald-600/80" label="60–80%" />
                  <LegendCell color="bg-emerald-500/25 text-emerald-600 font-semibold" label="≥80%" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

function MetricMini({ label, value, sub }: { label: string; value: string | null; sub: string }) {
  return (
    <Card className="border-border/40 bg-card/80 rounded-2xl">
      <CardContent className="p-5">
        <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{label}</p>
        {value === null ? (
          <Skeleton className="h-8 w-16 mt-1.5" />
        ) : (
          <p className="text-2xl font-bold text-foreground mt-1.5 tracking-tight">{value}</p>
        )}
        <p className="text-[10px] text-muted-foreground/50 mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}

function LegendCell({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-4 h-4 rounded ${color}`} />
      <span className="text-[10px] text-muted-foreground/70">{label}</span>
    </div>
  );
}

function CohortHelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-primary/10">
          <Info size={14} className="text-primary" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity size={16} className="text-primary" />
            Como funciona Cohort Retention
          </DialogTitle>
          <DialogDescription>Entenda o que cada número significa</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <div>
            <p className="font-semibold text-foreground mb-1">📊 O que é um Cohort?</p>
            <p>Um <strong>cohort</strong> é um grupo de usuários que se cadastraram no <strong>mesmo mês</strong>. Por exemplo, todos que criaram conta em <em>Maio/25</em> formam o "cohort de Mai/25".</p>
          </div>

          <div>
            <p className="font-semibold text-foreground mb-1">📅 O que significa M0, M1, M2…?</p>
            <ul className="space-y-1 ml-2">
              <li><strong>M0</strong> = mês do cadastro (sempre 100%)</li>
              <li><strong>M1</strong> = % do cohort ainda ativo 1 mês depois</li>
              <li><strong>M2</strong> = % ativo 2 meses depois… e assim por diante</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-foreground mb-1">🎯 Como interpretar?</p>
            <p>
              Se o cohort de Mai/25 mostra <strong>M1 = 60%</strong>, significa que 60% dos usuários cadastrados em maio continuaram usando a plataforma em junho.
            </p>
          </div>

          <div className="bg-muted/40 rounded-lg p-3 border border-border/30">
            <p className="text-xs">
              <strong className="text-foreground">⚠️ Sobre "atividade":</strong> consideramos um usuário ativo no mês se a coluna <code className="text-primary">updated_at</code> da tabela <code className="text-primary">profiles</code> caiu naquele período. É um proxy de login/uso.
            </p>
          </div>

          <div>
            <p className="font-semibold text-foreground mb-1">📈 Quanto melhor?</p>
            <p>Quanto <strong>mais verde</strong> o heatmap, melhor. Vermelho indica que o cohort está abandonando a plataforma rapidamente.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
