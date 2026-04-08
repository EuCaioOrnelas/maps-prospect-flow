import { Position, type NodeProps } from "@xyflow/react";
import { FlowHandle } from "./FlowHandle";
import { FlaskConical, Trophy } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

const metricAbbr: Record<string, string> = {
  response_rate: "TR",
  click_rate: "CTR",
  conversion: "TC",
  handoff_rate: "TH",
};

export function WAABTestNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const variants: { id: string; name: string; weight: number; rank?: number }[] = cfg.variants || [];
  const objectives: string[] = cfg.objectives || (cfg.objective ? [cfg.objective] : []);
  const hasConfig = objectives.length > 0 || cfg.test_description;

  const nodeRef = useRef<HTMLDivElement>(null);
  const variantRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [handleTops, setHandleTops] = useState<number[]>([]);

  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeRect = nodeRef.current.getBoundingClientRect();
    const tops = variantRefs.current.map((el) => {
      if (!el) return 50;
      const r = el.getBoundingClientRect();
      return ((r.top + r.height / 2 - nodeRect.top) / nodeRect.height) * 100;
    });
    setHandleTops(tops);
  }, [variants.length, hasConfig]);

  return (
    <div ref={nodeRef} className="bg-card border border-border rounded-xl shadow-sm w-56 relative">
      <FlowHandle type="target" position={Position.Left} />
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
          <FlaskConical size={16} className="text-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate">
            {String((data as any).label || "Teste A/B")}
          </p>
          {hasConfig ? (
            <p className="text-[10px] text-muted-foreground truncate">
              {objectives.length > 1
                ? `${objectives.length} medições`
                : objectives.length === 1
                  ? metricAbbr[objectives[0]] || objectives[0]
                  : `${variants.length} variantes`}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground/60 italic">Clique para configurar</p>
          )}
        </div>
      </div>

      <div className="px-3 py-2 space-y-1">
        {variants.map((v, i) => {
          const rank = v.rank;
          return (
            <div
              key={v.id}
              ref={(el) => { variantRefs.current[i] = el; }}
              className="text-[10px] bg-muted/40 rounded px-2 py-1.5 truncate flex items-center justify-between"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="font-semibold text-foreground">{v.name}</span>
              </div>
              {rank != null && rank <= 3 && (
                <div className="flex items-center gap-0.5">
                  {rank === 1 && <Trophy size={9} className="text-amber-400" />}
                  <span className="text-[9px] font-bold text-muted-foreground">{rank}°</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {variants.map((v, i) => (
        <FlowHandle
          key={v.id}
          type="source"
          position={Position.Right}
          id={v.id}
          style={{ top: handleTops[i] != null ? `${handleTops[i]}%` : "50%" }}
        />
      ))}
    </div>
  );
}
