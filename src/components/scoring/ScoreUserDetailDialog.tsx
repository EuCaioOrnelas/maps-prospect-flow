import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Loader2, TrendingUp, TrendingDown, Minus, Lightbulb, ChevronLeft, ChevronRight, Calendar, User, CreditCard, Clock } from "lucide-react";
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

const EVENTS_PER_PAGE = 15;

export const ScoreUserDetailDialog = ({ userId, open, onOpenChange }: Props) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [eventsPage, setEventsPage] = useState(0);

  useEffect(() => {
    if (open && userId) {
      loadDetail();
      setEventsPage(0);
    }
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
    if (trend === "rising") return <TrendingUp className="h-4 w-4 text-emerald-400" />;
    if (trend === "falling") return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 81) return "text-purple-400";
    if (score >= 61) return "text-emerald-400";
    if (score >= 41) return "text-blue-400";
    if (score >= 21) return "text-yellow-400";
    return "text-red-400";
  };

  const sortedEvents = data?.events ? [...data.events].sort(
    (a: any, b: any) => new Date(b.event_occurred_at).getTime() - new Date(a.event_occurred_at).getTime()
  ) : [];
  const totalEventPages = Math.ceil(sortedEvents.length / EVENTS_PER_PAGE);
  const paginatedEvents = sortedEvents.slice(
    eventsPage * EVENTS_PER_PAGE,
    (eventsPage + 1) * EVENTS_PER_PAGE
  );

  const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  const formatDateTime = (d: string) => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhe do Usuário</span>
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
          <div className="space-y-4">
            {/* User Profile Header */}
            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">{data.profile?.name || "Sem nome"}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{data.profile?.email}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    <CreditCard className="h-3 w-3 mr-1" />
                    {(data.profile?.plan || "free").toUpperCase()}
                  </Badge>
                  {data.score.last_event_at && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Último evento: {formatDate(data.score.last_event_at)}
                    </Badge>
                  )}
                  {data.profile?.created_at && (
                    <Badge variant="outline" className="text-xs">
                      <Calendar className="h-3 w-3 mr-1" />
                      Desde {formatDate(data.profile.created_at)}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-center shrink-0">
                <p className={`text-3xl font-bold ${getScoreColor(Number(data.score.total_score))}`}>
                  {Number(data.score.total_score).toFixed(0)}
                </p>
                <div className="flex items-center gap-1 justify-center mt-1">
                  <TrendIcon trend={data.score.trend} />
                  <Badge variant="outline" className="text-xs">{data.score.score_label}</Badge>
                </div>
              </div>
            </div>

            <Tabs defaultValue="breakdown" className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="breakdown">Score</TabsTrigger>
                <TabsTrigger value="history">Histórico ({sortedEvents.length})</TabsTrigger>
                <TabsTrigger value="evolution">Evolução</TabsTrigger>
              </TabsList>

              {/* Score Breakdown Tab */}
              <TabsContent value="breakdown" className="space-y-4 mt-4">
                <Card className="bg-card border-border/50">
                  <CardContent className="pt-4 space-y-3">
                    {CATEGORY_CONFIG.map((cat) => {
                      const value = Number(data.score[cat.key] || 0);
                      const maxPct = cat.key === "churn_risk_score" ? 20 : 30;
                      const pct = Math.min(100, (Math.abs(value) / maxPct) * 100);
                      return (
                        <div key={cat.key} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <span>{cat.icon}</span> {cat.label}
                            </span>
                            <span className={cat.key === "churn_risk_score" ? "text-destructive font-bold" : "font-bold"}>
                              {cat.key === "churn_risk_score" ? `-${Math.abs(value).toFixed(1)}` : value.toFixed(1)}
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
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-400" /> Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1.5">
                        {data.insights.map((insight: string, i: number) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span> {insight}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Score History Tab with Pagination */}
              <TabsContent value="history" className="mt-4">
                <Card className="bg-card border-border/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Histórico de Eventos</CardTitle>
                      {totalEventPages > 1 && (
                        <span className="text-xs text-muted-foreground">
                          Página {eventsPage + 1} de {totalEventPages}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {paginatedEvents.length > 0 ? (
                      <div className="space-y-1.5">
                        {paginatedEvents.map((event: any) => (
                          <div key={event.id} className="flex items-center justify-between p-2.5 rounded-md bg-muted/20 border border-border/30 text-sm">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{event.event_name}</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                                  {event.event_category}
                                </Badge>
                              </div>
                              {event.source && event.source !== "system" && (
                                <span className="text-[10px] text-muted-foreground">via {event.source}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-2">
                              <span className={`font-mono text-sm font-bold ${Number(event.adjusted_points) >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                                {Number(event.adjusted_points) >= 0 ? "+" : ""}{Number(event.adjusted_points).toFixed(1)}
                              </span>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatDateTime(event.event_occurred_at)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-6">Nenhum evento registrado.</p>
                    )}

                    {/* Pagination Controls */}
                    {totalEventPages > 1 && (
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/50">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEventsPage(p => Math.max(0, p - 1))}
                          disabled={eventsPage === 0}
                          className="gap-1"
                        >
                          <ChevronLeft className="h-3 w-3" /> Anterior
                        </Button>
                        <div className="flex gap-1">
                          {Array.from({ length: Math.min(5, totalEventPages) }, (_, i) => {
                            const pageNum = eventsPage < 3 ? i : eventsPage - 2 + i;
                            if (pageNum >= totalEventPages) return null;
                            return (
                              <Button
                                key={pageNum}
                                variant={pageNum === eventsPage ? "default" : "outline"}
                                size="sm"
                                className="w-8 h-8 p-0"
                                onClick={() => setEventsPage(pageNum)}
                              >
                                {pageNum + 1}
                              </Button>
                            );
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEventsPage(p => Math.min(totalEventPages - 1, p + 1))}
                          disabled={eventsPage >= totalEventPages - 1}
                          className="gap-1"
                        >
                          Próxima <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Evolution Chart Tab */}
              <TabsContent value="evolution" className="mt-4">
                <Card className="bg-card border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Evolução do Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.history?.length > 1 ? (
                      <ResponsiveContainer width="100%" height={250}>
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
                            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                            labelFormatter={(v) => new Date(v).toLocaleString("pt-BR")}
                          />
                          <Line type="monotone" dataKey="new_score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">Dados insuficientes para exibir o gráfico.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
