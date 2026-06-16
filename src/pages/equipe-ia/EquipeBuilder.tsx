import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronLeft, Save, Loader2, FlaskConical, Sparkles, Check, MoreVertical, Trash2 } from "lucide-react";
import { EquipeCanvas, type CanvasHandle, type CanvasState } from "@/components/equipe-ia/canvas/EquipeCanvas";
import { EquipeTestChatDialog } from "@/components/equipe-ia/EquipeTestChatDialog";
import { MandatoryProviderDialog } from "@/components/equipe-ia/MandatoryProviderDialog";
import { WorkforceScorePanel } from "@/components/equipe-ia/canvas/WorkforceScorePanel";
import { WorkforceOverview } from "@/components/equipe-ia/builder/WorkforceOverview";
import { WorkforceAnalytics } from "@/components/equipe-ia/builder/WorkforceAnalytics";
import { WorkforceVersions } from "@/components/equipe-ia/builder/WorkforceVersions";
import { useUserAICredentials } from "@/hooks/useUserAICredentials";
import { useEquipe, useEquipeCanvas, useSaveCanvas, useDeleteEquipe, buildCanvasFromBlueprint } from "@/hooks/useEquipeIA";
import type { WorkforceBlueprint } from "@/components/equipe-ia/wizard/workforceTemplates";
import { toast } from "sonner";

export default function EquipeBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: worker, isLoading: loadingW } = useEquipe(id);
  const { data: canvas, isLoading: loadingC } = useEquipeCanvas(id);
  const credsQ = useUserAICredentials();
  const save = useSaveCanvas();
  const del = useDeleteEquipe();
  const canvasRef = useRef<CanvasHandle>(null);
  const [tab, setTab] = useState<"overview" | "canvas" | "testes" | "analytics" | "versoes">("canvas");
  const [testOpen, setTestOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [autoState, setAutoState] = useState<"idle" | "saving" | "saved">("idle");
  const [liveState, setLiveState] = useState<CanvasState | null>(null);
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

  const generatedFromBlueprintRef = useRef(false);
  useEffect(() => {
    if (loading || !canvas || !id || generatedFromBlueprintRef.current) return;
    if (canvas.nodes.length > 1) return;
    const cfg = (worker?.config as { blueprint?: WorkforceBlueprint } | undefined) ?? {};
    if (!cfg.blueprint || !Array.isArray(cfg.blueprint.nodes) || cfg.blueprint.nodes.length === 0) return;
    generatedFromBlueprintRef.current = true;
    const built = buildCanvasFromBlueprint(cfg.blueprint);
    save.mutateAsync({ equipeId: id, state: built }).catch(() => {});
  }, [loading, canvas, id, worker, save]);

  const displayedState = liveState ?? canvas ?? null;
  const workforceStatus = (worker?.status?.toLowerCase() === "active" ? "active" : "draft") as "active" | "draft";

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
    try { await save.mutateAsync({ equipeId: id, state: canvasRef.current.getState() }); } catch { /* */ }
    setTestOpen(true);
  }

  async function handleDelete() {
    if (!id) return;
    try {
      await del.mutateAsync(id);
      toast.success("Colaborador excluído.");
      navigate("/equipe-ia");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
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

        {/* Tabs centered */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="hidden md:block">
          <TabsList className="h-8">
            <TabsTrigger value="overview" className="text-xs px-3">Overview</TabsTrigger>
            <TabsTrigger value="canvas" className="text-xs px-3">Canvas</TabsTrigger>
            <TabsTrigger value="testes" className="text-xs px-3">Testes</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs px-3">Analytics</TabsTrigger>
            <TabsTrigger value="versoes" className="text-xs px-3">Versões</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          {autoState !== "idle" && tab === "canvas" && (
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
          {tab === "canvas" && (
            <Button size="sm" onClick={handleSave} disabled={save.isPending || loading || !hasIA}>
              {save.isPending ? (<Loader2 className="size-3.5 mr-1.5 animate-spin" />) : (<Save className="size-3.5 mr-1.5" />)}
              Salvar
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setProviderOpen(true)}>
                <Sparkles className="size-4 mr-2" /> Configurar IA
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={(e) => { e.preventDefault(); setDeleteOpen(true); }}
              >
                <Trash2 className="size-4 mr-2" /> Excluir colaborador
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
          <>
            {tab === "overview" && worker && (
              <WorkforceOverview worker={worker} nodes={displayedState?.nodes ?? canvas.nodes} />
            )}
            {tab === "canvas" && (
              <>
                <EquipeCanvas
                  ref={canvasRef}
                  initial={canvas}
                  workforceStatus={workforceStatus}
                  onAutoSave={autoSave}
                  onStateChange={setLiveState}
                />
                {displayedState && (
                  <WorkforceScorePanel
                    nodes={displayedState.nodes}
                    onAddKind={(k) => canvasRef.current?.addNodeByKind(k)}
                  />
                )}
              </>
            )}
            {tab === "testes" && (
              <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center text-primary">
                  <FlaskConical className="size-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Ambiente de Teste</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mt-1">
                    Converse com o seu colaborador digital para validar respostas, regras e objetivos antes de publicar.
                  </p>
                </div>
                <Button onClick={() => setTestOpen(true)}>
                  <FlaskConical className="size-4 mr-2" /> Abrir chat de teste
                </Button>
              </div>
            )}
            {tab === "analytics" && id && <WorkforceAnalytics equipeId={id} />}
            {tab === "versoes" && <WorkforceVersions />}
          </>
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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir colaborador</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <span className="font-semibold text-foreground">{worker?.name}</span>?
              Esta ação é permanente e removerá toda a configuração, canvas e histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={del.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={del.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {del.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
