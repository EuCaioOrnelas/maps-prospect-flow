import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Loader2, RefreshCw, AlertTriangle, TrendingUp, Clock, Zap, XCircle, CheckCircle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

interface FunctionStat {
  name: string;
  description: string;
  total_events: number;
  success_events: number;
  error_events: number;
  last_activity: string | null;
  recent_events: Array<{ time: string; detail: string; status: 'success' | 'error' | 'info' }>;
}

interface RecentEvent {
  time: string;
  detail: string;
  status: 'success' | 'error' | 'info';
  function_name: string;
}

interface MonitorResult {
  hours_queried: number;
  totals: {
    total_events: number;
    total_errors: number;
    total_success: number;
    active_functions: number;
  };
  function_stats: FunctionStat[];
  recent_events: RecentEvent[];
  timestamp: string;
}

export function EdgeFunctionMonitor() {
  const [hours, setHours] = useState("24");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<MonitorResult | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('edge-function-monitor', {
        body: { hours: parseInt(hours) },
      });
      if (error) throw error;
      setResult(data as MonitorResult);
      toast.success('Dados carregados!');
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch { return '-'; }
  };

  const formatDateTime = (ts: string | null) => {
    if (!ts) return 'Nunca';
    try {
      return new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch { return '-'; }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'success') return <CheckCircle className="h-3 w-3 text-green-400" />;
    if (status === 'error') return <XCircle className="h-3 w-3 text-red-400" />;
    return <Info className="h-3 w-3 text-blue-400" />;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'success') return 'default';
    if (status === 'error') return 'destructive';
    return 'secondary';
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Monitor de Edge Functions
          </CardTitle>
          <CardDescription>
            Atividade das funções backend inferida a partir dos dados do banco de dados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={hours} onValueChange={setHours}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Última 1 hora</SelectItem>
                  <SelectItem value="3">Últimas 3 horas</SelectItem>
                  <SelectItem value="6">Últimas 6 horas</SelectItem>
                  <SelectItem value="12">Últimas 12 horas</SelectItem>
                  <SelectItem value="24">Últimas 24 horas</SelectItem>
                  <SelectItem value="48">Últimas 48 horas</SelectItem>
                  <SelectItem value="72">Últimas 72 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetchStats} disabled={isLoading} size="default">
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando...</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-2" /> Consultar</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-border/50 bg-card/80">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Zap className="h-3.5 w-3.5" />
                  Total Eventos
                </div>
                <div className="text-2xl font-bold">{result.totals.total_events.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {result.totals.total_success} sucesso · {result.totals.total_errors} erros
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/80">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <XCircle className="h-3.5 w-3.5" />
                  Erros
                </div>
                <div className={`text-2xl font-bold ${result.totals.total_errors > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {result.totals.total_errors}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Taxa: {result.totals.total_events > 0 ? ((result.totals.total_errors / result.totals.total_events) * 100).toFixed(1) : '0'}%
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/80">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Funções Ativas
                </div>
                <div className="text-2xl font-bold">{result.totals.active_functions}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  em {result.hours_queried}h
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/80">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Clock className="h-3.5 w-3.5" />
                  Última Atualização
                </div>
                <div className="text-lg font-bold">
                  {new Date(result.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(result.timestamp).toLocaleDateString('pt-BR')}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Function Stats */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Atividade por Função</CardTitle>
            </CardHeader>
            <CardContent>
              {result.function_stats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade encontrada no período.</p>
              ) : (
                <div className="space-y-3">
                  {result.function_stats.map((stat) => {
                    const maxEvents = Math.max(...result.function_stats.map(s => s.total_events));
                    const pct = maxEvents > 0 ? (stat.total_events / maxEvents) * 100 : 0;
                    const errorRate = stat.total_events > 0 ? (stat.error_events / stat.total_events * 100) : 0;
                    
                    return (
                      <div key={stat.name} className="p-3 rounded-lg bg-muted/20 border border-border/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge variant="outline" className="text-xs font-mono shrink-0">{stat.name}</Badge>
                            {stat.error_events > 0 && (
                              <Badge variant="destructive" className="text-[10px] shrink-0">{stat.error_events} erros</Badge>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-lg font-bold">{stat.total_events.toLocaleString()}</span>
                            <span className="text-xs text-muted-foreground ml-1">eventos</span>
                          </div>
                        </div>
                        
                        <Progress value={pct} className="h-1.5" />
                        
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="truncate max-w-[300px]" title={stat.description}>
                            {stat.description}
                          </span>
                          <span>
                            Sucesso: <span className="text-green-400 font-medium">{stat.success_events}</span>
                          </span>
                          <span>
                            Erro: <span className={`font-medium ${errorRate > 0 ? 'text-red-400' : 'text-green-400'}`}>
                              {errorRate.toFixed(1)}%
                            </span>
                          </span>
                          <span>
                            Último: <span className="text-foreground font-medium">{formatDateTime(stat.last_activity)}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Events Timeline */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Timeline de Eventos (últimos 100)</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-1">
                  {result.recent_events.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum evento encontrado.</p>
                  ) : (
                    result.recent_events.map((event, i) => (
                      <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded text-xs hover:bg-muted/20 transition-colors border-b border-border/10 last:border-0">
                        {getStatusIcon(event.status)}
                        <span className="text-muted-foreground w-16 shrink-0">{formatTime(event.time)}</span>
                        <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                          {event.function_name}
                        </Badge>
                        <span className="truncate text-muted-foreground">{event.detail}</span>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
