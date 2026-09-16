import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock3, Play, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const db = supabase as any;
const fmt = (v: string | null) => (v ? new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");

export function ExecutionLogsPanel({ onAfterRun }: { onAfterRun?: () => void }) {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    const { data, error } = await db
      .from("lifecycle_worker_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(50);
    setLoadError(!!error);
    setRuns(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const runNow = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("lifecycle-worker", { body: {} });
      if (error || data?.error) {
        toast.error(data?.error || "Falha ao executar o processador");
      } else {
        toast.success(
          data?.skipped
            ? "Já existe uma execução em andamento"
            : `Execução concluída — ${data?.sent ?? 0} e-mail(s) enviado(s)`,
        );
      }
    } catch {
      toast.error("Falha ao executar o processador");
    } finally {
      setRunning(false);
      await load();
      onAfterRun?.();
    }
  };

  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2"><Activity className="text-primary" /> Logs de execução</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1"><Clock3 /> Execução automática a cada hora, no minuto zero.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={load}>
              <RefreshCw size={14} className="mr-1.5" /> Atualizar
            </Button>
            <Button size="sm" variant="outline" onClick={runNow} disabled={running}>
              <Play size={14} className="mr-1.5" /> {running ? "Executando..." : "Executar agora"}
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
        ) : loadError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-5 text-center">
            <p className="text-sm text-destructive">Não foi possível carregar as execuções.</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={load}><RefreshCw /> Tentar novamente</Button>
          </div>
        ) : runs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma execução registrada ainda.</p>
        ) : (
          <div className="space-y-2">
            {runs.map((r) => (
              <div key={r.id} className="rounded-lg border border-border/50 px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-medium text-foreground">{fmt(r.started_at)}</span>
                  <Badge
                    variant="outline"
                    className={
                      r.status === "success"
                        ? "text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                        : r.status === "error"
                        ? "text-[10px] bg-destructive/10 text-destructive border-destructive/30"
                        : "text-[10px]"
                    }
                  >
                    {r.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1">
                  encontrados {r.users_found} · inscritos {r.enrolled} · elegíveis {r.eligible} · ignorados {r.skipped} ·
                  enviados {r.sent} · falhas {r.failed} · saíram {r.exited}
                </p>
                {r.details?.notes?.length > 0 && (
                  <p className="text-muted-foreground/80 mt-1">{r.details.notes.join(" · ")}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
