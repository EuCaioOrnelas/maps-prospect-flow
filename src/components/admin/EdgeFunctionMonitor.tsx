import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Loader2, RefreshCw, Server, Copy, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

interface MonitorResult {
  analytics_available: boolean;
  hours_queried: number;
  function_stats: any[];
  recent_calls: any[];
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
      toast.info('Mapeamento carregado. Peça no chat para analytics detalhados.');
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyFunctionId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('ID copiado!');
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Monitor de Edge Functions
          </CardTitle>
          <CardDescription>
            Identifique quais funções estão gerando mais invocações. Para dados detalhados, peça no chat: "me mostra as invocações das edge functions".
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetchStats} disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</>
              ) : (
                <><RefreshCw className="h-4 w-4" /> Consultar</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          {/* Known Functions Mapping */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="h-4 w-4" />
                Mapeamento de Funções (ID → Nome)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {Object.entries(result.known_functions).map(([id, name]) => (
                  <div key={id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/20">
                    <Badge variant="outline" className="text-xs font-mono">{name}</Badge>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground font-mono">{id.slice(0, 12)}...</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyFunctionId(id)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Use estes IDs para identificar funções nos logs. Para ver invocações em tempo real, me peça no chat.
              </p>
            </CardContent>
          </Card>

          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold">Dica: Analytics via Chat</h4>
                  <p className="text-sm mt-1 text-muted-foreground">
                    A API de analytics não é acessível diretamente de edge functions. Para ver invocações detalhadas, me peça no chat: 
                    <strong> "quais edge functions estão sendo mais chamadas?"</strong>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
