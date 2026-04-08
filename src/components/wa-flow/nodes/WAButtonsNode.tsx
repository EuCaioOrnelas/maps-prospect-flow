import { Position, type NodeProps } from "@xyflow/react";
import { FlowHandle } from "./FlowHandle";
import { ToggleLeft, List } from "lucide-react";
import { useRef, useState, useLayoutEffect } from "react";

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
  const rawItems = isListMode ? (cfg.list_items || []) : (cfg.buttons || cfg.reply_buttons || []);
  const items: InteractiveItem[] = rawItems.map((item: any, index: number) =>
    normalizeItem(item, index, isListMode ? "item" : "btn")
  );
  const hasItems = items.length > 0;
  const Icon = isListMode ? List : ToggleLeft;

  const nodeRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [handleTops, setHandleTops] = useState<number[]>([]);

  useLayoutEffect(() => {
    if (!nodeRef.current || !hasItems) return;
    const nodeRect = nodeRef.current.getBoundingClientRect();
    const tops = itemRefs.current.map((el) => {
      if (!el) return 50;
      const elRect = el.getBoundingClientRect();
      return ((elRect.top + elRect.height / 2 - nodeRect.top) / nodeRect.height) * 100;
    });
    setHandleTops(tops);
  }, [items.length, hasItems, cfg.body_text]);

  return (
    <div ref={nodeRef} className="bg-card border border-border rounded-xl shadow-sm w-56 relative">
      <FlowHandle type="target" position={Position.Left} />
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

      {cfg.body_text && (
        <div className="px-3 pt-2">
          <p className="text-[10px] text-foreground/70 line-clamp-3">{cfg.body_text}</p>
        </div>
      )}

      {hasItems && (
        <div className="px-3 py-2 space-y-1">
          {items.map((item, i) => (
            <div
              key={item.id}
              ref={(el) => { itemRefs.current[i] = el; }}
              className="text-[10px] bg-muted/50 rounded px-2 py-1.5 truncate text-foreground/80 flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
              {item.title}
            </div>
          ))}
        </div>
      )}

      {hasItems ? (
        items.map((item, i) => (
          <FlowHandle
            key={item.id}
            type="source"
            position={Position.Right}
            id={item.id}
            style={{ top: handleTops[i] != null ? `${handleTops[i]}%` : `${50}%` }}
          />
        ))
      ) : (
        <FlowHandle type="source" position={Position.Right} />
      )}
    </div>
  );
}
