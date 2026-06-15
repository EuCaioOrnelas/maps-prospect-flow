import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft } from "lucide-react";
import { WorkforceCanvas } from "@/components/ai-workforce/canvas/WorkforceCanvas";
import { useWorkforce, useWorkforceCanvas, useSaveCanvas } from "@/hooks/useAIWorkforce";
import { toast } from "sonner";
import { WorkforcePageLayout } from "@/components/ai-workforce/WorkforcePageLayout";

export default function AIWorkforceBuilder() {
  const { id } = useParams<{ id: string }>();
  const { data: worker, isLoading: loadingW } = useWorkforce(id);
  const { data: canvas, isLoading: loadingC } = useWorkforceCanvas(id);
  const save = useSaveCanvas();

  const loading = loadingW || loadingC;

  return (
    <WorkforcePageLayout wide>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/ai-workforce/colaboradores"><ChevronLeft className="size-4 mr-1" /> Voltar</Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{worker?.name ?? "Construtor"}</h1>
            <p className="text-xs text-muted-foreground">{worker?.role ?? "AI Workforce"}</p>
          </div>
        </div>
      </div>

      {loading || !canvas ? (
        <Skeleton className="h-[calc(100vh-200px)] rounded-2xl" />
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
    </WorkforcePageLayout>
  );
}
