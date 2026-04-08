import { Position, type NodeProps } from "@xyflow/react";
import { FlowHandle } from "./FlowHandle";
import { GitBranch } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

const conditionLabels: Record<string, string> = {
  button_clicked: "Clicou botão",
  keyword_match: "Palavra-chave",
  has_tag: "Possui tag",
  responded: "Respondeu",
  no_response: "Não respondeu",
  score_above: "Score acima de",
  is_customer: "É cliente",
};

export function WAConditionNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const isConfigured = !!cfg.condition_type;
  const nodeRef = useRef<HTMLDivElement>(null);
  const yesRef = useRef<HTMLDivElement>(null);
  const noRef = useRef<HTMLDivElement>(null);
  const [yesTop, setYesTop] = useState(65);
  const [noTop, setNoTop] = useState(85);

  useLayoutEffect(() => {
    if (!nodeRef.current) return;
    const nodeRect = nodeRef.current.getBoundingClientRect();
    if (yesRef.current) {
      const r = yesRef.current.getBoundingClientRect();
      setYesTop(((r.top + r.height / 2 - nodeRect.top) / nodeRect.height) * 100);
    }
    if (noRef.current) {
      const r = noRef.current.getBoundingClientRect();
      setNoTop(((r.top + r.height / 2 - nodeRect.top) / nodeRect.height) * 100);
    }
  }, [cfg.condition_type]);

  return (
    <div ref={nodeRef} className="bg-card border border-border rounded-xl shadow-sm w-52 relative">
      <FlowHandle type="target" position={Position.Left} />
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50">
        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
          <GitBranch size={16} className="text-purple-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate">
            {String((data as any).label || "Condição")}
          </p>
          {isConfigured ? (
            <p className="text-[10px] text-muted-foreground truncate">
              {conditionLabels[cfg.condition_type] || cfg.condition_type}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground/60 italic">Clique para configurar</p>
          )}
        </div>
      </div>

      <div className="px-3 py-2 space-y-1.5">
        <div ref={yesRef} className="w-full">
          <div className="bg-primary/10 rounded-md py-1.5 flex items-center justify-center w-full">
            <span className="text-[11px] font-semibold text-primary">Sim</span>
          </div>
        </div>
        <div ref={noRef} className="w-full">
          <div className="bg-destructive/10 rounded-md py-1.5 flex items-center justify-center w-full">
            <span className="text-[11px] font-semibold text-destructive">Não</span>
          </div>
        </div>
      </div>

      <FlowHandle type="source" position={Position.Right} id="yes" style={{ top: `${yesTop}%` }} />
      <FlowHandle type="source" position={Position.Right} id="no" style={{ top: `${noTop}%` }} />
    </div>
  );
}
