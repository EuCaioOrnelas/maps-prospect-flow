import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Brain } from "lucide-react";
import { EQUIPE_NODE_META, type EquipeNodeKind } from "../nodeTypes";
import { cn } from "@/lib/utils";

interface EquipeNodeData {
  kind: EquipeNodeKind;
  title?: string;
  summary?: string;
}

function EquipeNodeInner({ data, selected }: NodeProps) {
  const nodeData = data as unknown as EquipeNodeData;
  const meta = EQUIPE_NODE_META[nodeData.kind];
  if (!meta) return null;
  const Icon = meta.icon;
  const isCore = meta.kind === "core";

  if (isCore) {
    return (
      <div className="relative" style={{ width: 220, height: 220 }}>
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-3xl animate-pulse" />
        <div className="absolute inset-4 rounded-full bg-primary/10 blur-2xl" />
        <div className="absolute inset-2 rounded-full border border-primary/30 [animation:spin_18s_linear_infinite]" />
        <div className="absolute inset-6 rounded-full border border-primary/20 [animation:spin_24s_linear_infinite_reverse]" />
        <div
          className={cn(
            "absolute inset-8 rounded-full flex items-center justify-center text-center",
            "bg-gradient-to-br from-primary via-primary/90 to-primary/70",
            "text-primary-foreground shadow-[0_0_60px_-10px_hsl(var(--primary))]",
            "border-2 transition-all",
            selected ? "border-primary-foreground/80 scale-105" : "border-primary-foreground/40",
          )}
        >
          <div className="absolute inset-3 rounded-full bg-background/10 backdrop-blur-sm" />
          <div className="relative flex flex-col items-center gap-1.5">
            <Brain className="size-9 drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
            <p className="text-[11px] font-bold uppercase tracking-widest opacity-90">Núcleo</p>
            <p className="text-[10px] font-medium opacity-70 px-3 line-clamp-2">
              {nodeData.title || meta.label}
            </p>
          </div>
        </div>
        <Handle
          type="target"
          position={Position.Left}
          id="core-target"
          style={{
            left: "50%", top: "50%", width: "85%", height: "85%",
            transform: "translate(-50%, -50%)",
            background: "transparent", border: "none", borderRadius: "9999px",
            pointerEvents: "all",
          }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="core-source"
          style={{
            left: "50%", top: "50%", width: 8, height: 8,
            transform: "translate(-50%, -50%)",
            background: "transparent", border: "none", opacity: 0,
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card text-card-foreground shadow-sm transition-all w-56 p-4",
        selected ? "border-primary ring-2 ring-primary/40" : "border-border/60 hover:border-border",
      )}
    >
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !bg-primary/60 !border-2 !border-background" />
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !bg-muted-foreground/40 !border-2 !border-background" />
      <div className="flex items-start gap-3">
        <div className={cn("rounded-lg bg-muted/60 border border-border/40 flex items-center justify-center shrink-0 w-9 h-9", meta.color)}>
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight truncate text-sm">{nodeData.title || meta.label}</p>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{nodeData.summary || meta.description}</p>
        </div>
      </div>
    </div>
  );
}

export const EquipeNode = memo(EquipeNodeInner);
