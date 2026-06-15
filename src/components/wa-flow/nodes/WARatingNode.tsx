import { Position, type NodeProps } from "@xyflow/react";
import { FlowHandle } from "./FlowHandle";
import { Star } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  buttons: "Botões (até 3)",
  menu: "Menu",
  numeric: "Numérica",
  stars: "Estrelas",
  free: "Texto livre",
};

export function WARatingNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const type = cfg.type || "buttons";
  const askSuggestion = !!cfg.ask_suggestion;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm w-60 relative">
      <FlowHandle type="target" position={Position.Left} />
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
          <Star size={16} className="text-amber-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate">
            {String((data as any).label || cfg.name || "Avaliação")}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {TYPE_LABELS[type] || type}
            {askSuggestion ? " · com sugestão" : ""}
          </p>
        </div>
      </div>


      <FlowHandle type="source" position={Position.Right} />
    </div>
  );
}
