import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { WORKFORCE_NODE_META, type WorkforceNodeKind } from "../nodeTypes";
import { cn } from "@/lib/utils";

interface WorkforceNodeData {
  kind: WorkforceNodeKind;
  title?: string;
  summary?: string;
}

function WorkforceNodeInner({ data, selected }: NodeProps) {
  const nodeData = data as unknown as WorkforceNodeData;
  const meta = WORKFORCE_NODE_META[nodeData.kind];
  if (!meta) return null;
  const Icon = meta.icon;
  const isCore = meta.kind === "core";

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card text-card-foreground shadow-sm transition-all",
        isCore ? "w-72 p-5" : "w-56 p-4",
        selected ? "border-primary ring-2 ring-primary/40" : "border-border/60 hover:border-border"
      )}
    >
      {!isCore && <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-muted-foreground/40" />}
      <div className="flex items-start gap-3">
        <div className={cn("rounded-lg p-2 bg-muted/40", meta.color)}>
          <Icon size={isCore ? 22 : 18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("font-semibold leading-tight truncate", isCore ? "text-base" : "text-sm")}>
            {nodeData.title || meta.label}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {nodeData.summary || meta.description}
          </p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-muted-foreground/40" />
    </div>
  );
}

export const WorkforceNode = memo(WorkforceNodeInner);
