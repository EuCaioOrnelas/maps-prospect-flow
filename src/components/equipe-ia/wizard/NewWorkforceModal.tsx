import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sparkles, Wand2, LayoutGrid, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useGenerateWorkforce } from "@/hooks/useEquipeIA";
import { WorkforceWizard } from "./WorkforceWizard";
import { WorkforcePromptCreator } from "./WorkforcePromptCreator";
import { TemplateGallery } from "./TemplateGallery";
import type { WorkforceBlueprint } from "./workforceTemplates";

type Mode = "menu" | "wizard" | "prompt" | "templates";

const ENTRIES = [
  {
    id: "wizard" as const,
    icon: Sparkles,
    title: "Assistente Inteligente",
    subtitle: "Responda 7 perguntas e a IA monta tudo.",
    recommended: true,
  },
  {
    id: "prompt" as const,
    icon: Wand2,
    title: "Criar com IA",
    subtitle: "Descreva o colaborador em uma frase.",
  },
  {
    id: "templates" as const,
    icon: LayoutGrid,
    title: "Templates prontos",
    subtitle: "Instale em 1 clique e personalize.",
  },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function NewWorkforceModal({ open, onOpenChange }: Props) {
  const [mode, setMode] = useState<Mode>("menu");
  const navigate = useNavigate();
  const generate = useGenerateWorkforce();

  function close() {
    onOpenChange(false);
    setTimeout(() => setMode("menu"), 200);
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

  async function handlePrompt(prompt: string) {
    try {
      const { data, error } = await supabase.functions.invoke("generate-equipe-ai", { body: { prompt } });
      if (error) throw new Error(error.message);
      if (!data || data.error) throw new Error(data?.error || "Falha ao gerar");
      const blueprint: WorkforceBlueprint = {
        name: data.name, role: data.role, description: data.description,
        persona: data.persona, system_prompt: data.system_prompt, nodes: data.nodes ?? [],
      };
      await handleBlueprint(blueprint);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar com IA");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); else onOpenChange(true); }}>
      <DialogContent
        className="p-0 sm:max-w-3xl bg-card border-border max-h-[90vh] h-[680px] flex flex-col gap-0 overflow-hidden"
      >
        {mode === "menu" && (
          <div className="p-8 flex-1 flex flex-col">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Criar novo colaborador</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Você quer criar um colaborador, não configurar uma IA. Escolha por onde começar.
              </p>
            </div>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
              {ENTRIES.map((e) => {
                const Icon = e.icon;
                return (
                  <button key={e.id} onClick={() => setMode(e.id)}
                    className={cn(
                      "group relative text-left p-5 rounded-xl border bg-background hover:border-primary transition-all flex flex-col",
                      e.recommended && "border-primary/40 bg-primary/[0.03]",
                    )}>
                    {e.recommended && (
                      <span className="absolute -top-2 left-4 text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                        Recomendado
                      </span>
                    )}
                    <div className="w-11 h-11 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                      <Icon size={20} />
                    </div>
                    <p className="font-semibold mt-4">{e.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex-1">{e.subtitle}</p>
                    <div className="flex items-center gap-1 text-xs text-primary mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      Começar <ArrowRight className="size-3" />
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground text-center mt-6">
              Você poderá personalizar tudo depois no construtor visual.
            </p>
          </div>
        )}

        {mode === "wizard" && (
          <WorkforceWizard onCancel={close} onComplete={handleBlueprint} />
        )}
        {mode === "prompt" && (
          <WorkforcePromptCreator onCancel={close} onSubmit={handlePrompt} onBack={() => setMode("menu")} />
        )}
        {mode === "templates" && (
          <TemplateGallery onCancel={close} onInstall={(t) => handleBlueprint(t.blueprint)} onBack={() => setMode("menu")} />
        )}
      </DialogContent>
    </Dialog>
  );
}
