import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Loader2, RefreshCw, AlertTriangle, TrendingUp, Clock, Zap, XCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

interface FunctionStat {
  function_id: string;
  function_name: string;
  total_calls: number;
  real_calls: number;
  options_calls: number;
  error_count: number;
  success_count: number;
  avg_execution_ms: number | null;
  max_execution_ms: number | null;
  min_execution_ms: number | null;
  error_rate: string;
  first_call: string;
  last_call: string;
}

interface RecentCall {
  timestamp: string;
  function_id: string;
  function_name: string;
  method: string;
  status_code: number;
  execution_time_ms: number;
}

interface MonitorResult {
  analytics_available: boolean;
  hours_queried: number;
  totals: {
    total_invocations: number;
    real_invocations: number;
    total_errors: number;
    unique_functions: number;
  };
  function_stats: FunctionStat[];
  recent_calls: RecentCall[];
  known_functions: Record<string, string>;
  timestamp: string;
}

export function EdgeFunctionMonitor() {
  const [hours, setHours] = useState("1");
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
      toast.success('Dados carregados com sucesso!');
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatMs = (ms: number | null) => {
    if (ms === null || ms === undefined) return '-';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(Number(ts) / 1000);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '-';
    }
  };

  const getStatusColor = (code: number) => {
    if (code >= 200 && code < 300) return 'text-green-400';
    if (code >= 400 && code < 500) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getExecTimeColor = (ms: number) => {
    if (ms < 300) return 'text-green-400';
    if (ms < 1000) return 'text-yellow-400';
    return 'text-red-400';
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
            Monitore invocações, tempos de execução e erros de todas as funções em tempo real.
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
                  Total Invocações
                </div>
                <div className="text-2xl font-bold">{result.totals.total_invocations.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {result.totals.real_invocations} reais + {result.totals.total_invocations - result.totals.real_invocations} OPTIONS
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
                  Taxa: {result.totals.total_invocations > 0 ? ((result.totals.total_errors / result.totals.total_invocations) * 100).toFixed(1) : '0'}%
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/80">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Funções Ativas
                </div>
                <div className="text-2xl font-bold">{result.totals.unique_functions}</div>
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

          {!result.analytics_available && (
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  <span className="font-medium">Analytics API não disponível</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Não foi possível acessar os dados de analytics. Verifique as permissões.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Function Stats Table */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Invocações por Função</CardTitle>
            </CardHeader>
            <CardContent>
              {result.function_stats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma invocação encontrada no período.</p>
              ) : (
                <div className="space-y-3">
                  {result.function_stats.map((stat) => {
                    const maxCalls = Math.max(...result.function_stats.map(s => Number(s.total_calls)));
                    const pct = maxCalls > 0 ? (Number(stat.total_calls) / maxCalls) * 100 : 0;
                    
                    return (
                      <div key={stat.function_id} className="p-3 rounded-lg bg-muted/20 border border-border/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs font-mono">{stat.function_name}</Badge>
                            {Number(stat.error_count) > 0 && (
                              <Badge variant="destructive" className="text-[10px]">{stat.error_count} erros</Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold">{Number(stat.total_calls).toLocaleString()}</span>
                            <span className="text-xs text-muted-foreground ml-1">chamadas</span>
                          </div>
                        </div>
                        
                        <Progress value={pct} className="h-1.5" />
                        
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            Reais: <span className="text-foreground font-medium">{Number(stat.real_calls).toLocaleString()}</span>
                          </span>
                          <span>
                            OPTIONS: <span className="text-foreground font-medium">{Number(stat.options_calls).toLocaleString()}</span>
                          </span>
                          <span>
                            Média: <span className={`font-medium ${stat.avg_execution_ms ? getExecTimeColor(stat.avg_execution_ms) : ''}`}>
                              {formatMs(stat.avg_execution_ms)}
                            </span>
                          </span>
                          <span>
                            Máx: <span className={`font-medium ${stat.max_execution_ms ? getExecTimeColor(stat.max_execution_ms) : ''}`}>
                              {formatMs(stat.max_execution_ms)}
                            </span>
                          </span>
                          <span>
                            Erro: <span className={`font-medium ${Number(stat.error_rate) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                              {stat.error_rate}%
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Calls */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Chamadas Recentes (últimas 100)</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-1">
                  {result.recent_calls.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhuma chamada encontrada.</p>
                  ) : (
                    result.recent_calls.map((call, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded text-xs hover:bg-muted/20 transition-colors border-b border-border/10 last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-muted-foreground w-16 shrink-0">{formatTimestamp(call.timestamp)}</span>
                          <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                            {call.method}
                          </Badge>
                          <span className="font-medium truncate">{call.function_name}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={getExecTimeColor(call.execution_time_ms)}>
                            {formatMs(call.execution_time_ms)}
                          </span>
                          <span className={`font-mono font-bold ${getStatusColor(call.status_code)}`}>
                            {call.status_code}
                          </span>
                        </div>
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
