import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LayoutGrid, FileText, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCreateEquipe, useGenerateWorkforce } from "@/hooks/useEquipeIA";
import { TemplateGallery } from "./TemplateGallery";
import type { WorkforceBlueprint } from "./workforceTemplates";

type Mode = "menu" | "templates" | "blank";

const ENTRIES = [
  {
    id: "templates" as const,
    icon: LayoutGrid,
    title: "Templates prontos",
    subtitle: "Instale em 1 clique e personalize depois.",
    recommended: true,
  },
  {
    id: "blank" as const,
    icon: FileText,
    title: "Começar em branco",
    subtitle: "Comece do zero e monte tudo no canvas.",
  },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function NewWorkforceModal({ open, onOpenChange }: Props) {
  const [mode, setMode] = useState<Mode>("menu");
  const [blankName, setBlankName] = useState("");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const generate = useGenerateWorkforce();
  const createBlank = useCreateEquipe();

  function close() {
    onOpenChange(false);
    setTimeout(() => { setMode("menu"); setBlankName(""); }, 200);
  }

  async function handleBlueprint(blueprint: WorkforceBlueprint) {
    try {
      const id = await generate.mutateAsync({ blueprint });
      toast.success("Colaborador montado!");
      close();
      navigate(`/equipe-ia/colaboradores/${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar colaborador");
    }
  }

  async function handleCreateBlank() {
    const name = blankName.trim();
    if (!name) { toast.error("Dê um nome ao colaborador."); return; }
    try {
      setCreating(true);
      const w = await createBlank.mutateAsync({ name });
      toast.success("Colaborador criado.");
      close();
      navigate(`/equipe-ia/colaboradores/${w.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); else onOpenChange(true); }}>
      <DialogContent
        className="p-0 sm:max-w-3xl bg-card border-border max-h-[90vh] h-[620px] flex flex-col gap-0 overflow-hidden"
      >
        {mode === "menu" && (
          <div className="p-8 flex-1 flex flex-col">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Criar novo colaborador</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Escolha um template pronto ou comece do zero.
              </p>
            </div>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
              {ENTRIES.map((e) => {
                const Icon = e.icon;
                return (
                  <button key={e.id} onClick={() => setMode(e.id)}
                    className={cn(
                      "group relative text-left p-6 rounded-xl border bg-background hover:border-primary transition-all flex flex-col",
                      e.recommended && "border-primary/40 bg-primary/[0.03]",
                    )}>
                    {e.recommended && (
                      <span className="absolute -top-2 left-4 text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                        Recomendado
                      </span>
                    )}
                    <div className="w-12 h-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                      <Icon size={22} />
                    </div>
                    <p className="font-semibold mt-4 text-base">{e.title}</p>
                    <p className="text-sm text-muted-foreground mt-1 flex-1">{e.subtitle}</p>
                    <div className="flex items-center gap-1 text-xs text-primary mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      Começar <ArrowRight className="size-3" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {mode === "templates" && (
          <TemplateGallery onCancel={close} onInstall={(t) => handleBlueprint(t.blueprint)} onBack={() => setMode("menu")} />
        )}

        {mode === "blank" && (
          <div className="p-8 flex-1 flex flex-col">
            <h2 className="text-xl font-semibold">Começar em branco</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Dê um nome para começar. Você configura o resto no canvas.
            </p>
            <div className="mt-6 space-y-2">
              <label className="text-xs font-semibold">Nome do colaborador</label>
              <input
                value={blankName}
                onChange={(e) => setBlankName(e.target.value)}
                placeholder="Ex: Atendente do Pós-venda"
                autoFocus
                className="w-full h-10 px-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex-1" />
            <div className="flex justify-between gap-2">
              <button
                onClick={() => setMode("menu")}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Voltar
              </button>
              <div className="flex gap-2">
                <button onClick={close} className="px-4 py-2 text-sm rounded-lg border hover:bg-muted">
                  Cancelar
                </button>
                <button
                  onClick={handleCreateBlank}
                  disabled={creating || !blankName.trim()}
                  className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                >
                  {creating && <Loader2 className="size-4 animate-spin" />}
                  Criar colaborador
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
