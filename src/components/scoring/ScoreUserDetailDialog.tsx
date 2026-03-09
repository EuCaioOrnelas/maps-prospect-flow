import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Loader2, TrendingUp, TrendingDown, Minus, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_CONFIG = [
  { key: "activation_score", label: "Ativação", icon: "🚀", color: "bg-emerald-500" },
  { key: "engagement_score", label: "Engajamento", icon: "💬", color: "bg-blue-500" },
  { key: "value_score", label: "Valor", icon: "💎", color: "bg-purple-500" },
  { key: "purchase_intent_score", label: "Intenção Compra", icon: "🛒", color: "bg-yellow-500" },
  { key: "churn_risk_score", label: "Risco Churn", icon: "⚠️", color: "bg-red-500" },
];

export const ScoreUserDetailDialog = ({ userId, open, onOpenChange }: Props) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    if (open && userId) loadDetail();
  }, [open, userId]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("score-processor", {
        body: { action: "get_user_detail", user_id: userId },
      });
      if (error) throw error;
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const { error } = await supabase.functions.invoke("score-processor", {
        body: { action: "recalculate", user_id: userId },
      });
      if (error) throw error;
      toast.success("Score recalculado!");
      await loadDetail();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRecalculating(false);
    }
  };

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === "rising") return <TrendingUp className="h-5 w-5 text-emerald-400" />;
    if (trend === "falling") return <TrendingDown className="h-5 w-5 text-destructive" />;
    return <Minus className="h-5 w-5 text-muted-foreground" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 81) return "text-purple-400";
    if (score >= 61) return "text-emerald-400";
    if (score >= 41) return "text-blue-400";
    if (score >= 21) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhe do Score</span>
            <Button variant="outline" size="sm" onClick={handleRecalculate} disabled={recalculating} className="gap-2">
              {recalculating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Recalcular
            </Button>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !data?.score ? (
          <p className="text-muted-foreground text-center py-8">Nenhum score encontrado para este usuário.</p>
        ) : (
          <div className="space-y-6">
            {/* Profile + Score Header */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
              <div>
                <h3 className="font-semibold text-lg">{data.profile?.name || "Sem nome"}</h3>
                <p className="text-sm text-muted-foreground">{data.profile?.email}</p>
                <Badge variant="secondary" className="mt-1">{data.profile?.plan || "free"}</Badge>
              </div>
              <div className="text-center">
                <p className={`text-4xl font-bold ${getScoreColor(Number(data.score.total_score))}`}>
                  {Number(data.score.total_score).toFixed(0)}
                </p>
                <div className="flex items-center gap-1 justify-center mt-1">
                  <TrendIcon trend={data.score.trend} />
                  <Badge variant="outline">{data.score.score_label}</Badge>
                </div>
              </div>
            </div>

            {/* Score Breakdown */}
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Breakdown do Score</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {CATEGORY_CONFIG.map((cat) => {
                  const value = Number(data.score[cat.key] || 0);
                  const maxPct = cat.key === "churn_risk_score" ? 20 : 30;
                  const pct = Math.min(100, (value / maxPct) * 100);
                  return (
                    <div key={cat.key} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <span>{cat.icon}</span> {cat.label}
                        </span>
                        <span className={cat.key === "churn_risk_score" ? "text-destructive font-bold" : "font-bold"}>
                          {cat.key === "churn_risk_score" ? `-${value.toFixed(1)}` : value.toFixed(1)}
                        </span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${cat.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Insights */}
            {data.insights?.length > 0 && (
              <Card className="bg-card border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-400" /> Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {data.insights.map((insight: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span> {insight}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Score History Chart */}
            {data.history?.length > 1 && (
              <Card className="bg-card border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Evolução do Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={[...data.history].reverse()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="created_at"
                        stroke="hsl(var(--muted-foreground))"
                        tickFormatter={(v) => new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                        labelFormatter={(v) => new Date(v).toLocaleString("pt-BR")}
                      />
                      <Line type="monotone" dataKey="new_score" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Recent Events */}
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Últimos Eventos</CardTitle>
              </CardHeader>
              <CardContent>
                {data.events?.length > 0 ? (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {data.events.slice(0, 30).map((event: any) => (
                      <div key={event.id} className="flex items-center justify-between p-2 rounded bg-muted/20 text-sm">
                        <div>
                          <span className="font-medium">{event.event_name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{event.event_category}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={Number(event.adjusted_points) >= 0 ? "text-emerald-400" : "text-destructive"}>
                            {Number(event.adjusted_points) >= 0 ? "+" : ""}{Number(event.adjusted_points).toFixed(1)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(event.event_occurred_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Nenhum evento registrado.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
