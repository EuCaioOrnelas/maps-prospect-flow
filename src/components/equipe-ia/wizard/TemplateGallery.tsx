import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X, ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { WORKFORCE_TEMPLATES, type TemplateCategory, type WorkforceTemplate } from "./workforceTemplates";

const CATS: TemplateCategory[] = ["Vendas", "Atendimento", "Suporte", "Cobrança", "RH", "Marketing"];

interface Props {
  onCancel: () => void;
  onInstall: (template: WorkforceTemplate) => Promise<void>;
  onBack?: () => void;
}

export function TemplateGallery({ onCancel, onInstall, onBack }: Props) {
  const [cat, setCat] = useState<TemplateCategory | "Todos">("Todos");
  const [installing, setInstalling] = useState<string | null>(null);

  const list = useMemo(
    () => cat === "Todos" ? WORKFORCE_TEMPLATES : WORKFORCE_TEMPLATES.filter((t) => t.category === cat),
    [cat],
  );

  async function install(t: WorkforceTemplate) {
    setInstalling(t.id);
    try { await onInstall(t); } finally { setInstalling(null); }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" /> Biblioteca de Templates
        </div>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
        <h2 className="text-2xl font-semibold tracking-tight">Instale um colaborador pronto</h2>
        <p className="text-sm text-muted-foreground mt-1">Tudo pré-configurado. Você só edita o que precisar.</p>

        <div className="flex flex-wrap gap-2 mt-5">
          {(["Todos", ...CATS] as const).map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                cat === c ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted")}>
              {c}
            </button>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((t) => {
            const Icon = t.icon;
            const busy = installing === t.id;
            return (
              <div key={t.id} className="rounded-xl border bg-card p-4 flex flex-col">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm leading-tight">{t.blueprint.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{t.category}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 line-clamp-3 flex-1">{t.blueprint.description}</p>
                <Button size="sm" className="mt-4" onClick={() => install(t)} disabled={!!installing}>
                  {busy ? <><Loader2 className="size-3.5 mr-1.5 animate-spin" /> Instalando…</> : "Instalar"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t bg-card px-6 py-4 flex items-center justify-between shrink-0">
        <Button variant="ghost" onClick={onBack ?? onCancel} disabled={!!installing}>
          <ArrowLeft className="size-4 mr-1" /> Voltar
        </Button>
      </div>
    </div>
  );
}
