import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PencilRuler, LayoutTemplate, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

const OPTIONS = [
  {
    mode: "blank" as const,
    icon: PencilRuler,
    title: "Em branco",
    subtitle: "Comece do zero e monte tudo no construtor visual.",
  },
  {
    mode: "templates" as const,
    icon: LayoutTemplate,
    title: "Usar modelo pronto",
    subtitle: "Templates de SDR, suporte, cobrança e mais.",
  },
  {
    mode: "ai" as const,
    icon: Wand2,
    title: "Criar com IA",
    subtitle: "Descreva o objetivo e a IA monta o colaborador.",
    badge: "Recomendado",
  },
];

export function CreateEquipeDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] bg-card">
        <DialogHeader>
          <DialogTitle>Criar colaborador</DialogTitle>
          <DialogDescription>Escolha como deseja começar.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {OPTIONS.map((o) => {
            const Icon = o.icon;
            return (
              <button
                key={o.mode}
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/equipe-ia/novo?mode=${o.mode}`);
                }}
                className={cn(
                  "group relative flex flex-col items-center text-center gap-3 p-5 rounded-2xl border bg-card",
                  "hover:border-primary/50 hover:bg-primary/5 transition-all",
                )}
              >
                {o.badge && (
                  <Badge className="absolute -top-2 right-3 bg-primary text-primary-foreground text-[10px] px-2 py-0.5">
                    {o.badge}
                  </Badge>
                )}
                <div className="w-12 h-12 rounded-xl bg-primary/15 ring-1 ring-primary/20 flex items-center justify-center text-primary">
                  <Icon size={22} />
                </div>
                <div>
                  <p className="font-semibold text-sm">{o.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{o.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
