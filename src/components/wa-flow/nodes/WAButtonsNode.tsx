import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ToggleLeft, List } from "lucide-react";

type InteractiveItem = {
  id: string;
  title: string;
  description?: string;
};

const normalizeItem = (item: any, index: number, prefix: "btn" | "item"): InteractiveItem => {
  if (typeof item === "string") {
    return { id: `${prefix}_${index}`, title: item };
  }

  return {
    id: item?.id || `${prefix}_${index}`,
    title: item?.title || `Opção ${index + 1}`,
    description: item?.description || "",
  };
};

export function WAButtonsNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const isListMode = cfg.interaction_type === "list";
  const items = (isListMode ? (cfg.list_items || []) : (cfg.buttons || [])).map((item: any, index: number) =>
    normalizeItem(item, index, isListMode ? "item" : "btn")
  );
  const hasItems = items.length > 0;
  const Icon = isListMode ? List : ToggleLeft;
  const headerText = typeof cfg.header_text === "string" ? cfg.header_text.trim() : "";
  const footerText = typeof cfg.footer_text === "string" ? cfg.footer_text.trim() : "";


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
      {headerText && (
        <div className="px-3 pt-2">
          <p className="text-[9px] uppercase tracking-wide text-muted-foreground truncate">{headerText}</p>
        </div>
      )}
      {cfg.body_text && (
        <div className="px-3 pt-2">
          <p className="text-[10px] text-foreground/70 line-clamp-2">{cfg.body_text}</p>
        </div>
      )}
      {hasItems && (
        <div className="px-3 py-2 space-y-1">
          {items.slice(0, 4).map((item, i) => (
            <div key={i} className="text-[10px] bg-muted/50 rounded px-2 py-1 truncate text-foreground/80">
              {item.title}
            </div>
          ))}
          {items.length > 4 && (
            <p className="text-[9px] text-muted-foreground text-center">+{items.length - 4} mais</p>
          )}
        </div>
      )}
      {footerText && (
        <div className="px-3 pb-2">
          <p className="text-[9px] text-muted-foreground truncate">{footerText}</p>
        </div>
      )}
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-card !rounded-full" />
      {hasItems ? (
        items.map((item, i: number) => (
          <Handle
            key={item.id}
            type="source"
            position={Position.Right}
            id={item.id}
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
