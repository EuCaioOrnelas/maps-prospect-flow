import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft } from "lucide-react";
import { WorkforceCanvas } from "@/components/ai-workforce/canvas/WorkforceCanvas";
import { useWorkforce, useWorkforceCanvas, useSaveCanvas } from "@/hooks/useAIWorkforce";
import { toast } from "sonner";

export default function AIWorkforceBuilder() {
  const { id } = useParams<{ id: string }>();
  const { data: worker, isLoading: loadingW } = useWorkforce(id);
  const { data: canvas, isLoading: loadingC } = useWorkforceCanvas(id);
  const save = useSaveCanvas();

  const loading = loadingW || loadingC;

  return (
    <div className="fixed inset-0 flex flex-col bg-background z-30">
      <header className="h-12 flex items-center justify-between px-4 border-b bg-card/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/ai-workforce/colaboradores"><ChevronLeft className="size-4 mr-1" /> Voltar</Link>
          </Button>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate leading-tight">{worker?.name ?? "Construtor"}</p>
            <p className="text-[11px] text-muted-foreground truncate leading-tight">{worker?.role ?? "Equipe IA"}</p>
          </div>
        </div>
      </header>
      <div className="flex-1 min-h-0">
        {loading || !canvas ? (
          <div className="p-4 h-full">
            <Skeleton className="h-full w-full rounded-2xl" />
          </div>
        ) : (
          <WorkforceCanvas
            initial={canvas}
            saving={save.isPending}
            onSave={async (state) => {
              if (!id) return;
              try {
                await save.mutateAsync({ workforceId: id, state });
                toast.success("Construtor salvo.");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Erro ao salvar");
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
