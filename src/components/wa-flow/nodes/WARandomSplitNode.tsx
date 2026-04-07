import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Shuffle } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

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

  const colors = [
    "bg-sky-400/10 text-sky-400",
    "bg-violet-400/10 text-violet-400",
    "bg-rose-400/10 text-rose-400",
    "bg-amber-400/10 text-amber-400",
    "bg-teal-400/10 text-teal-400",
  ];

  return (
    <div ref={nodeRef} className="bg-card border border-border rounded-xl shadow-sm w-52 relative">
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
            className={`text-[10px] ${colors[i % colors.length]} rounded px-2 py-1.5 truncate flex items-center gap-1.5 font-semibold`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
            {o.name}
          </div>
        ))}
      </div>

      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-sky-400 !border-2 !border-card !rounded-full" />
      {outputs.map((o, i) => (
        <Handle
          key={o.id}
          type="source"
          position={Position.Right}
          id={o.id}
          className="!w-3 !h-3 !bg-sky-400 !border-2 !border-card !rounded-full"
          style={{ top: handleTops[i] != null ? `${handleTops[i]}%` : "50%" }}
        />
      ))}
    </div>
  );
}
