import { Position, type NodeProps } from "@xyflow/react";
import { FlowHandle } from "./FlowHandle";
import { NodeShell } from "./NodeShell";
import { ToggleLeft, List, ListOrdered } from "lucide-react";
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
  const isEvolution = cfg._provider === "evolution";
  const isListMode = cfg.interaction_type === "list";
  const rawItems = isListMode ? (cfg.list_items || []) : (cfg.buttons || cfg.reply_buttons || []);
  const items: InteractiveItem[] = rawItems.map((item: any, index: number) =>
    normalizeItem(item, index, isListMode ? "item" : "btn")
  );
  const hasItems = items.length > 0;
  const Icon = isEvolution ? ListOrdered : isListMode ? List : ToggleLeft;

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
  }, [items.length, hasItems, cfg.body_text, isEvolution]);

  const subtitle = hasItems
    ? `${items.length} ${isEvolution ? "opções numeradas" : isListMode ? "itens" : "botões"}`
    : null;

  return (
    <div ref={nodeRef}>
      <NodeShell
        icon={Icon}
        accent="bg-primary"
        width="w-60"
        title={String((data as any).label || (isEvolution ? "Opções" : "Botões"))}
        subtitle={subtitle}
        placeholder="Clique para configurar"
      >
        <FlowHandle type="target" position={Position.Left} />

        {cfg.body_text && (
          <div className="px-3.5 -mt-1 pb-1">
            <p className="text-[11px] text-foreground/70 line-clamp-3">{cfg.body_text}</p>
          </div>
        )}

        {hasItems && (
          <div className="px-3.5 pb-3 space-y-1.5">
            {items.map((item, i) => (
              <div
                key={item.id}
                ref={(el) => { itemRefs.current[i] = el; }}
                className="text-[11px] bg-muted/50 rounded-xs px-3 py-2 truncate text-foreground/80 flex items-center gap-2"
              >
                {isEvolution ? (
                  <span className="text-[10px] font-bold text-primary shrink-0">{i + 1}.</span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                )}
                <span className="flex-1 truncate">{item.title}</span>
                <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
              </div>
            ))}
          </div>
        )}

        {isEvolution && (
          <div className="px-3.5 pb-3">
            <p className="text-[10px] text-muted-foreground leading-snug">
              Número de Atendimento: as opções vão numeradas no texto e o cliente responde com o número.
            </p>
          </div>
        )}

        {hasItems ? (
          items.map((item, i) => (
            <FlowHandle
              key={item.id}
              type="source"
              position={Position.Right}
              id={item.id}
              style={{ top: handleTops[i] != null ? `${handleTops[i]}%` : "50%" }}
            />
          ))
        ) : (
          <FlowHandle type="source" position={Position.Right} />
        )}
      </NodeShell>
    </div>
  );
}
