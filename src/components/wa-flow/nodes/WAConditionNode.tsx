import { Position, type NodeProps } from "@xyflow/react";
import { FlowHandle } from "./FlowHandle";
import { NodeShell } from "./NodeShell";
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
    <div ref={nodeRef}>
      <NodeShell
        icon={GitBranch}
        accent="bg-amber-500"
        title={String((data as any).label || "Condição")}
        subtitle={isConfigured ? (conditionLabels[cfg.condition_type] || cfg.condition_type) : null}
        placeholder="Clique para configurar"
      >
        <FlowHandle type="target" position={Position.Left} />

        <div className="px-3.5 pb-3 space-y-1.5">
          <div ref={yesRef}>
            <div className="bg-primary/10 rounded-lg py-1.5 flex items-center justify-center">
              <span className="text-[11px] font-semibold text-primary">Sim</span>
            </div>
          </div>
          <div ref={noRef}>
            <div className="bg-destructive/10 rounded-lg py-1.5 flex items-center justify-center">
              <span className="text-[11px] font-semibold text-destructive">Não</span>
            </div>
          </div>
        </div>

        <FlowHandle type="source" position={Position.Right} id="yes" style={{ top: `${yesTop}%` }} />
        <FlowHandle type="source" position={Position.Right} id="no" style={{ top: `${noTop}%` }} />
      </NodeShell>
    </div>
  );
}
