import { useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Save, Loader2, FlaskConical } from "lucide-react";
import {
  WorkforceCanvas,
  type CanvasHandle,
} from "@/components/ai-workforce/canvas/WorkforceCanvas";
import { WorkforceTestChatDialog } from "@/components/ai-workforce/WorkforceTestChatDialog";
import { useWorkforce, useWorkforceCanvas, useSaveCanvas } from "@/hooks/useAIWorkforce";
import { toast } from "sonner";

export default function AIWorkforceBuilder() {
  const { id } = useParams<{ id: string }>();
  const { data: worker, isLoading: loadingW } = useWorkforce(id);
  const { data: canvas, isLoading: loadingC } = useWorkforceCanvas(id);
  const save = useSaveCanvas();
  const canvasRef = useRef<CanvasHandle>(null);
  const [testOpen, setTestOpen] = useState(false);

  const loading = loadingW || loadingC;

  async function handleSave() {
    if (!id || !canvasRef.current) return;
    try {
      await save.mutateAsync({ workforceId: id, state: canvasRef.current.getState() });
      toast.success("Construtor salvo.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  }

  async function handleTest() {
    if (!id || !canvasRef.current) return;
    // Auto-save before opening the test so the chat reflects the latest canvas.
    try {
      await save.mutateAsync({ workforceId: id, state: canvasRef.current.getState() });
    } catch {
      /* silent */
    }
    setTestOpen(true);
  }

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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleTest} disabled={loading}>
            <FlaskConical className="size-3.5 mr-1.5" /> Testar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={save.isPending || loading}>
            {save.isPending ? (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="size-3.5 mr-1.5" />
            )}
            Salvar
          </Button>
        </div>
      </header>
      <div className="flex-1 min-h-0 relative">
        {loading || !canvas ? (
          <div className="p-4 h-full">
            <Skeleton className="h-full w-full rounded-2xl" />
          </div>
        ) : (
          <WorkforceCanvas ref={canvasRef} initial={canvas} />
        )}
      </div>

      {id && worker && (
        <WorkforceTestChatDialog
          open={testOpen}
          onOpenChange={setTestOpen}
          workforceId={id}
          workforceName={worker.name}
        />
      )}
    </div>
  );
}
