import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Save, Loader2, FlaskConical, Sparkles, Check } from "lucide-react";
import { EquipeCanvas, type CanvasHandle, type CanvasState } from "@/components/equipe-ia/canvas/EquipeCanvas";
import { EquipeTestChatDialog } from "@/components/equipe-ia/EquipeTestChatDialog";
import { MandatoryProviderDialog } from "@/components/equipe-ia/MandatoryProviderDialog";
import { useUserAICredentials } from "@/hooks/useUserAICredentials";
import { useEquipe, useEquipeCanvas, useSaveCanvas } from "@/hooks/useEquipeIA";
import { toast } from "sonner";

export default function EquipeBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: worker, isLoading: loadingW } = useEquipe(id);
  const { data: canvas, isLoading: loadingC } = useEquipeCanvas(id);
  const credsQ = useUserAICredentials();
  const save = useSaveCanvas();
  const canvasRef = useRef<CanvasHandle>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [autoState, setAutoState] = useState<"idle" | "saving" | "saved">("idle");
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const autoSave = useCallback((state: CanvasState) => {
    if (!id) return;
    setAutoState("saving");
    save.mutateAsync({ equipeId: id, state })
      .then(() => {
        setAutoState("saved");
        if (autoTimer.current) clearTimeout(autoTimer.current);
        autoTimer.current = setTimeout(() => setAutoState("idle"), 1500);
      })
      .catch(() => setAutoState("idle"));
  }, [id, save]);

  const hasIA = useMemo(
    () => (credsQ.data ?? []).some((c) => c.is_active && c.api_key),
    [credsQ.data],
  );
  const [providerOpen, setProviderOpen] = useState(false);
  useEffect(() => {
    if (!credsQ.isLoading && !hasIA) setProviderOpen(true);
  }, [credsQ.isLoading, hasIA]);

  const loading = loadingW || loadingC;

  async function handleSave() {
    if (!id || !canvasRef.current) return;
    try {
      await save.mutateAsync({ equipeId: id, state: canvasRef.current.getState() });
      toast.success("Construtor salvo.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  }

  async function handleTest() {
    if (!id || !canvasRef.current) return;
    try {
      await save.mutateAsync({ equipeId: id, state: canvasRef.current.getState() });
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
            <Link to="/equipe-ia"><ChevronLeft className="size-4 mr-1" /> Voltar</Link>
          </Button>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate leading-tight">{worker?.name ?? "Construtor"}</p>
            <p className="text-[11px] text-muted-foreground truncate leading-tight">{worker?.role ?? "Equipe IA"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {autoState !== "idle" && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 mr-1">
              {autoState === "saving" ? (
                <><Loader2 className="size-3 animate-spin" /> Salvando…</>
              ) : (
                <><Check className="size-3 text-emerald-500" /> Salvo</>
              )}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleTest} disabled={loading || !hasIA}>
            <FlaskConical className="size-3.5 mr-1.5" /> Testar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={save.isPending || loading || !hasIA}>
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
        ) : !hasIA ? (
          <div className="h-full w-full flex items-center justify-center p-6">
            <div className="max-w-md text-center space-y-4 rounded-2xl border bg-card p-8 shadow-sm">
              <div className="mx-auto w-12 h-12 rounded-xl bg-primary/15 ring-1 ring-primary/20 flex items-center justify-center text-primary">
                <Sparkles className="size-5" />
              </div>
              <div>
                <p className="font-semibold">Conecte uma IA para abrir o construtor</p>
                <p className="text-xs text-muted-foreground mt-1">
                  O canvas só fica disponível depois que esse colaborador tiver um provedor de IA conectado.
                </p>
              </div>
              <Button size="sm" onClick={() => setProviderOpen(true)}>Configurar IA</Button>
            </div>
          </div>
        ) : (
          <EquipeCanvas ref={canvasRef} initial={canvas} onAutoSave={autoSave} />
        )}
      </div>

      <MandatoryProviderDialog
        open={providerOpen}
        onOpenChange={setProviderOpen}
        onConfigured={() => { /* canvas unlocks via hasIA */ }}
        onSkip={() => { navigate("/equipe-ia"); }}
      />

      {id && worker && (
        <EquipeTestChatDialog
          open={testOpen}
          onOpenChange={setTestOpen}
          equipeId={id}
          equipeName={worker.name}
        />
      )}
    </div>
  );
}
