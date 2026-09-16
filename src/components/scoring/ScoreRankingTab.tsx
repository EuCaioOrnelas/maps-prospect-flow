import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, TrendingUp, TrendingDown, Minus, RefreshCw, Loader2, Medal } from "lucide-react";
import { ScoreUserDetailDialog } from "./ScoreUserDetailDialog";
import { cn } from "@/lib/utils";

type SortKey = "total_score" | "purchase_intent" | "value" | "engagement" | "activation" | "churn_risk";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "total_score", label: "Score geral" },
  { key: "purchase_intent", label: "Intenção de compra" },
  { key: "value", label: "Uso de valor" },
  { key: "engagement", label: "Engajamento" },
  { key: "activation", label: "Ativação" },
  { key: "churn_risk", label: "Risco de churn" },
];

const bandStyle = (score: number) => {
  if (score >= 81) return "bg-purple-500/10 text-purple-500 border-purple-500/25";
  if (score >= 61) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/25";
  if (score >= 41) return "bg-blue-500/10 text-blue-500 border-blue-500/25";
  if (score >= 21) return "bg-yellow-500/10 text-yellow-600 border-yellow-500/25";
  return "bg-red-500/10 text-red-500 border-red-500/25";
};

const medalColor = (i: number) =>
  i === 0 ? "text-yellow-500" : i === 1 ? "text-zinc-400" : i === 2 ? "text-amber-700" : "text-muted-foreground";

interface RankRow {
  user_id: string;
  total_score: number;
  score_label: string;
  trend: string;
  activation_score: number;
  engagement_score: number;
  value_score: number;
  purchase_intent_score: number;
  churn_risk_score: number;
  profiles?: { name?: string | null; email?: string | null; plan?: string | null } | null;
}

export const ScoreRankingTab = () => {
  const [rows, setRows] = useState<RankRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>("total_score");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const load = async (sort: SortKey) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("score-processor", {
        body: { action: "get_ranking", limit: 50, sort_by: sort },
      });
      if (error) throw error;
      setRows(((data as any)?.ranking || []) as RankRow[]);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(sortBy);
  }, [sortBy]);

  const metricFor = (r: RankRow) => {
    switch (sortBy) {
      case "purchase_intent": return Number(r.purchase_intent_score || 0);
      case "value": return Number(r.value_score || 0);
      case "engagement": return Number(r.engagement_score || 0);
      case "activation": return Number(r.activation_score || 0);
      case "churn_risk": return Number(r.churn_risk_score || 0);
      default: return Number(r.total_score || 0);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {SORTS.map((s) => (
          <Button
            key={s.key}
            size="sm"
            variant={sortBy === s.key ? "default" : "outline"}
            className="h-8 rounded-full text-xs"
            onClick={() => setSortBy(s.key)}
          >
            {s.label}
          </Button>
        ))}
        <Button
          size="sm"
          variant="ghost"
          className="h-8 gap-2 text-xs ml-auto"
          onClick={() => load(sortBy)}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Atualizar
        </Button>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b border-border/60 px-5 py-4">
            <Trophy size={16} className="text-primary" />
            <h2 className="text-sm font-semibold">Top 50 usuários por {SORTS.find((s) => s.key === sortBy)?.label.toLowerCase()}</h2>
          </div>

          {loading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Nenhum usuário com score calculado ainda. Use "Recalcular Todos" para gerar o ranking.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {rows.map((r, i) => {
                const total = Number(r.total_score || 0);
                return (
                  <button
                    key={r.user_id}
                    onClick={() => setSelectedUserId(r.user_id)}
                    className="flex w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-muted/40"
                  >
                    <div className={cn("w-8 shrink-0 text-center text-sm font-bold", medalColor(i))}>
                      {i < 3 ? <Medal size={16} className="mx-auto" /> : i + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {r.profiles?.name || r.profiles?.email || "Usuário sem nome"}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{r.profiles?.email || "—"}</div>
                    </div>

                    <Badge variant="outline" className="hidden shrink-0 text-[10px] uppercase sm:inline-flex">
                      {(r.profiles?.plan || "free")}
                    </Badge>

                    <Badge variant="outline" className={cn("hidden shrink-0 text-[10px] md:inline-flex", bandStyle(total))}>
                      {r.score_label || "—"}
                    </Badge>

                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold tabular-nums">{metricFor(r).toFixed(1)}</div>
                      <div className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
                        {r.trend === "rising" ? (
                          <TrendingUp size={12} className="text-emerald-500" />
                        ) : r.trend === "falling" ? (
                          <TrendingDown size={12} className="text-destructive" />
                        ) : (
                          <Minus size={12} />
                        )}
                        score {total.toFixed(0)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedUserId && (
        <ScoreUserDetailDialog
          userId={selectedUserId}
          open={!!selectedUserId}
          onOpenChange={(o) => !o && setSelectedUserId(null)}
        />
      )}
    </div>
  );
};
