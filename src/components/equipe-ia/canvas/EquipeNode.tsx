import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Bot, MoreVertical } from "lucide-react";
import { EQUIPE_NODE_META, type EquipeNodeKind } from "../nodeTypes";
import { cn } from "@/lib/utils";

interface EquipeNodeData {
  kind: EquipeNodeKind;
  title?: string;
  summary?: string;
  status?: string;
}

const HEX_CLIP = "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)";

function EquipeNodeInner({ data, selected }: NodeProps) {
  const nodeData = data as unknown as EquipeNodeData;
  const meta = EQUIPE_NODE_META[nodeData.kind];
  if (!meta) return null;
  const Icon = meta.icon;
  const isCore = meta.kind === "core";

  if (isCore) {
    const size = 240;
    return (
      <div className="relative" style={{ width: size, height: size }}>
        {/* Outer glow */}
        <div
          className="absolute inset-0 bg-primary/25 blur-3xl animate-pulse"
          style={{ clipPath: HEX_CLIP }}
        />
        {/* Outline hex */}
        <div
          className="absolute inset-2 bg-gradient-to-br from-primary/40 via-primary/20 to-primary/40"
          style={{ clipPath: HEX_CLIP }}
        />
        {/* Inner hex (background) */}
        <div
          className={cn(
            "absolute inset-[6px] flex items-center justify-center text-center",
            "bg-gradient-to-br from-[#1a1f3a] via-[#0f1428] to-[#1a1f3a]",
            "transition-all",
          )}
          style={{ clipPath: HEX_CLIP }}
        >
          <div className="flex flex-col items-center gap-2 px-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/40 blur-xl rounded-full" />
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-[0_0_30px_-4px_hsl(var(--primary))]">
                <Bot className="size-7 text-primary-foreground" />
              </div>
            </div>
            <p className="text-sm font-bold text-foreground tracking-tight">
              {nodeData.title || "Workforce Core"}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Núcleo de Inteligência
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-medium text-emerald-300">Ativo</span>
            </div>
          </div>
        </div>
        {/* Selected ring */}
        {selected && (
          <div
            className="absolute inset-0 ring-2 ring-primary/60 pointer-events-none"
            style={{ clipPath: HEX_CLIP }}
          />
        )}
        {/* Centered handles: edges visually terminate at the hex border because the shape covers them */}
        <Handle
          type="target"
          position={Position.Left}
          id="core-target"
          style={{
            left: "50%", top: "50%", width: 1, height: 1,
            transform: "translate(-50%, -50%)",
            background: "transparent", border: "none", opacity: 0,
            pointerEvents: "none",
          }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="core-source"
          style={{
            left: "50%", top: "50%", width: 1, height: 1,
            transform: "translate(-50%, -50%)",
            background: "transparent", border: "none", opacity: 0,
            pointerEvents: "none",
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card text-card-foreground shadow-sm transition-all w-60 overflow-hidden",
        selected ? "border-primary ring-2 ring-primary/40" : "border-border/60 hover:border-border",
      )}
    >
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-primary/70 !border-2 !border-background" />
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-muted-foreground/50 !border-2 !border-background" />

      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3">
        <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/50 border border-border/40", meta.color)}>
          <Icon size={11} />
          <span className="text-[9px] font-bold uppercase tracking-wider">{meta.label}</span>
        </div>
        <MoreVertical size={14} className="text-muted-foreground/60" />
      </div>

      {/* Body */}
      <div className="px-3 pt-2 pb-3">
        <p className="font-semibold text-sm text-foreground leading-tight">
          {nodeData.title || meta.label}
        </p>
        <p className="text-[11px] text-muted-foreground line-clamp-3 mt-1 leading-snug">
          {nodeData.summary || meta.description}
        </p>
      </div>

      {/* Status footer */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/30 border border-border/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-[10px] text-muted-foreground">{nodeData.status || "Configurado"}</span>
        </div>
      </div>
    </div>
  );
}

export const EquipeNode = memo(EquipeNodeInner);
