import { Handle, Position, type NodeProps } from "@xyflow/react";
import { FlaskConical } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

export function WAABTestNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const testName = cfg.test_name || "";
  const variants: { id: string; name: string; weight: number }[] = cfg.variants || [
    { id: "var_a", name: "Variante A", weight: 50 },
    { id: "var_b", name: "Variante B", weight: 50 },
  ];
  const objective = cfg.objective || "";
  const hasConfig = !!testName || !!objective;

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
  }, [variants.length, testName, objective]);

  const colors = ["text-primary", "text-blue-400", "text-amber-400", "text-purple-400", "text-pink-400"];
  const bgColors = ["bg-primary/10", "bg-blue-400/10", "bg-amber-400/10", "bg-purple-400/10", "bg-pink-400/10"];

  return (
    <div ref={nodeRef} className="bg-card border border-border rounded-xl shadow-sm w-56 relative">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-card !rounded-full" />
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
              {testName || objective || `${variants.length} variantes`}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground/60 italic">Clique para configurar</p>
          )}
        </div>
      </div>

      {objective && (
        <div className="px-3 pt-2">
          <p className="text-[10px] text-muted-foreground">
            📊 Objetivo: <span className="text-foreground/80">{objective === "response_rate" ? "Taxa de resposta" : objective === "click_rate" ? "Taxa de clique" : objective === "conversion" ? "Conversão" : objective === "handoff_rate" ? "Taxa de handoff" : objective}</span>
          </p>
        </div>
      )}

      <div className="px-3 py-2 space-y-1">
        {variants.map((v, i) => (
          <div
            key={v.id}
            ref={(el) => { variantRefs.current[i] = el; }}
            className={`text-[10px] ${bgColors[i % bgColors.length]} rounded px-2 py-1.5 truncate flex items-center justify-between`}
          >
            <span className={`font-semibold ${colors[i % colors.length]}`}>{v.name}</span>
            <span className="text-muted-foreground font-mono">{v.weight}%</span>
          </div>
        ))}
      </div>

      {variants.map((v, i) => (
        <Handle
          key={v.id}
          type="source"
          position={Position.Right}
          id={v.id}
          className="!w-3 !h-3 !bg-primary !border-2 !border-card !rounded-full"
          style={{ top: handleTops[i] != null ? `${handleTops[i]}%` : "50%" }}
        />
      ))}
    </div>
  );
}
