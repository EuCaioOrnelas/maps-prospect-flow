import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ToggleLeft, List } from "lucide-react";

export function WAButtonsNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const buttons: any[] = cfg.buttons || [];
  const listItems: any[] = cfg.list_items || [];
  const isListMode = cfg.interaction_type === "list";
  const items = isListMode ? listItems : buttons;
  const hasItems = items.length > 0;
  const Icon = isListMode ? List : ToggleLeft;

  // Normalize items to get title string
  const getItemTitle = (item: any, i: number): string => {
    if (typeof item === "string") return item;
    return item.title || `Opção ${i + 1}`;
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm w-52">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
          <Icon size={16} className="text-indigo-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate">{String((data as any).label || "Botões")}</p>
          <p className="text-[10px] text-muted-foreground">
            {hasItems ? `${items.length} ${isListMode ? "itens" : "botões"}` : "Configurar"}
          </p>
        </div>
      </div>
      {/* Show body text if present */}
      {cfg.body_text && (
        <div className="px-3 pt-2">
          <p className="text-[10px] text-foreground/70 line-clamp-2">{cfg.body_text}</p>
        </div>
      )}
      {hasItems && (
        <div className="px-3 py-2 space-y-1">
          {items.slice(0, 4).map((item: any, i: number) => (
            <div key={i} className="text-[10px] bg-muted/50 rounded px-2 py-1 truncate text-foreground/80">
              {getItemTitle(item, i)}
            </div>
          ))}
          {items.length > 4 && (
            <p className="text-[9px] text-muted-foreground text-center">+{items.length - 4} mais</p>
          )}
        </div>
      )}
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-card !rounded-full" />
      {hasItems ? (
        items.map((_: any, i: number) => (
          <Handle
            key={i}
            type="source"
            position={Position.Right}
            id={`btn-${i}`}
            className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-card !rounded-full"
            style={{ top: `${35 + ((i + 1) * 100) / (items.length + 1)}%` }}
          />
        ))
      ) : (
        <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-card !rounded-full" />
      )}
    </div>
  );
}
