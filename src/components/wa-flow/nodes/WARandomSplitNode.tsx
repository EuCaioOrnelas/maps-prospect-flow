import { Position, type NodeProps } from "@xyflow/react";
import { FlowHandle } from "./FlowHandle";
import { Shuffle } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

const dotColors = [
  "bg-sky-400",
  "bg-violet-400",
  "bg-rose-400",
  "bg-amber-400",
  "bg-teal-400",
];

export function WARandomSplitNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const outputs: { id: string; name: string }[] = cfg.outputs || [
    { id: "out_0", name: "Saída 1" },
    { id: "out_1", name: "Saída 2" },
  ];

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

  return (
    <div ref={nodeRef} className="bg-card border border-border rounded-xl shadow-sm w-52 relative">
      <FlowHandle type="target" position={Position.Left} />
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50">
        <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0">
          <Shuffle size={16} className="text-sky-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate">
            {String((data as any).label || "Random Split")}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {outputs.length} saídas aleatórias
          </p>
        </div>
      </div>

      <div className="px-3 py-2 space-y-1">
        {outputs.map((o, i) => (
          <div
            key={o.id}
            ref={(el) => { outputRefs.current[i] = el; }}
            className="text-[10px] bg-muted/30 border border-border/30 rounded px-2 py-1.5 truncate flex items-center gap-1.5 font-semibold text-foreground"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${dotColors[i % dotColors.length]} shrink-0`} />
            {o.name}
          </div>
        ))}
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
    </div>
  );
}
