import { Position, type NodeProps } from "@xyflow/react";
import { FlowHandle } from "./FlowHandle";
import { Star } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  buttons: "Botões (até 3)",
  menu: "Menu",
  numeric: "Numérica",
  stars: "Estrelas",
  free: "Livre",
};

const HANDLES = [
  { id: "received", label: "Avaliação recebida", color: "bg-amber-400" },
  { id: "positive", label: "Positiva", color: "bg-emerald-400" },
  { id: "neutral", label: "Neutra", color: "bg-sky-400" },
  { id: "negative", label: "Negativa", color: "bg-rose-400" },
  { id: "suggestion", label: "Sugestão recebida", color: "bg-violet-400" },
];

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
            {askSuggestion ? " · sugestão" : ""}
          </p>
        </div>
      </div>

      {cfg.message && (
        <div className="px-3 pt-2">
          <p className="text-[10px] text-foreground/70 line-clamp-2">{cfg.message}</p>
        </div>
      )}

      <div className="px-3 py-2 space-y-1">
        {HANDLES.map((h) => (
          <div
            key={h.id}
            className="text-[10px] bg-muted/40 rounded px-2 py-1.5 truncate text-foreground/80 flex items-center gap-1.5"
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${h.color}`} />
            {h.label}
          </div>
        ))}
      </div>

      {HANDLES.map((h, i) => (
        <FlowHandle
          key={h.id}
          type="source"
          position={Position.Right}
          id={h.id}
          style={{ top: `${30 + i * 12}%` }}
        />
      ))}
    </div>
  );
}
