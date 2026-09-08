import { Position, type NodeProps } from "@xyflow/react";
import { FlowHandle } from "./FlowHandle";
import { NodeShell } from "./NodeShell";
import { Shuffle } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

const dotColors = [
  "bg-amber-400",
  "bg-amber-400",
  "bg-amber-400",
  "bg-amber-400",
  "bg-amber-400",
];

export function WARandomSplitNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const outputs: { id: string; name: string }[] = cfg.outputs || [
    { id: "out_0", name: "Saída 1" },
    { id: "out_1", name: "Saída 2" },
  ];
  const stats = (data as any).stats as
    | { total: number; variants: Record<string, { picked: number; share: number }> }
    | undefined;

  const nodeRef = useRef<HTMLDivElement>(null);
  const outputRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [handleTops, setHandleTops] = useState<number[]>([]);

  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeRect = nodeRef.current.getBoundingClientRect();
    const tops = outputRefs.current.map((el) => {
      if (!el) return 50;
      const r = el.getBoundingClientRect();
      return ((r.top + r.height / 2 - nodeRect.top) / nodeRect.height) * 100;
    });
    setHandleTops(tops);
  }, [outputs.length]);

  const equalShare = outputs.length > 0 ? 100 / outputs.length : 0;

  return (
    <div ref={nodeRef}>
      <NodeShell
        icon={Shuffle}
        accent="bg-amber-500"
        title={String((data as any).label || "Random Split")}
        subtitle={stats && stats.total > 0 ? `${stats.total} divisões reais` : `${outputs.length} saídas aleatórias`}
        placeholder="Clique para configurar"
        width="w-52"
      >
        <FlowHandle type="target" position={Position.Left} />

        <div className="px-3.5 pb-3 space-y-1">
          {outputs.map((o, i) => {
            const vs = stats?.variants?.[o.id];
            const pct = vs ? vs.share : equalShare;
            return (
              <div
                key={o.id}
                ref={(el) => { outputRefs.current[i] = el; }}
                className="text-[10px] bg-muted/30 border border-border/30 rounded-lg px-2 py-1.5 flex items-center justify-between gap-2 font-semibold text-foreground"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full ${dotColors[i % dotColors.length]} shrink-0`} />
                  <span className="truncate">{o.name}</span>
                </div>
                <span className="text-[9px] font-bold text-muted-foreground shrink-0">
                  {pct.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>

        {outputs.map((o, i) => (
          <FlowHandle
            key={o.id}
            type="source"
            position={Position.Right}
            id={o.id}
            style={{ top: handleTops[i] != null ? `${handleTops[i]}%` : "50%" }}
          />
        ))}
      </NodeShell>
    </div>
  );
}
