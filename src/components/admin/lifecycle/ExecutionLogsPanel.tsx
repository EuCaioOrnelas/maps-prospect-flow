import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const db = supabase as any;
const fmt = (v: string | null) => (v ? new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");

export function ExecutionLogsPanel({ onAfterRun }: { onAfterRun?: () => void }) {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await db
      .from("lifecycle_worker_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(50);
    setRuns(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const runNow = async () => {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke("lifecycle-worker", { body: {} });
    setRunning(false);
    if (error) {
      toast.error("Falha ao executar o processador");
    } else {
      toast.success(
        data?.skipped
          ? "Já existe uma execução em andamento"
          : `Execução concluída — ${data?.sent ?? 0} e-mail(s) enviado(s)`,
      );
    }
    await load();
    onAfterRun?.();
  };

  return (
    <Card className="border-border/40 bg-card/80">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold">Logs de execução</h3>
            <p className="text-xs text-muted-foreground">O processador roda automaticamente a cada 15 minutos.</p>
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
