import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { EQUIPE_NODE_META, type EquipeNodeKind } from "../nodeTypes";
import { KIND_ICON_BG } from "./EquipeCanvas";
import { cn } from "@/lib/utils";

interface EquipeNodeData {
  kind: EquipeNodeKind;
  title?: string;
  summary?: string;
  status?: string;
}

// Sharp hexagon (flat-top). Single clip used by all hex layers so borders stay crisp.
const HEX_CLIP = "polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0% 50%)";

/**
 * Wiize core mark — 8 rounded parallelogram petals arranged in a pinwheel,
 * inspired by the user-provided reference logo.
 */
function CoreMark({ className }: { className?: string }) {
  const petals = Array.from({ length: 8 }, (_, i) => i);
  return (
    <svg viewBox="0 0 80 80" className={className} fill="currentColor">
      {petals.map((i) => {
        const a = i * 45;
        return (
          <rect
            key={i}
            x={32}
            y={8}
            width={16}
            height={9}
            rx={2.5}
            ry={2.5}
            transform={`rotate(${a} 40 40) rotate(22 40 12.5)`}
          />
        );
      })}
    </svg>
  );
}

function EquipeNodeInner({ data, selected }: NodeProps) {
  const nodeData = data as unknown as EquipeNodeData;
  const meta = EQUIPE_NODE_META[nodeData.kind];
  if (!meta) return null;
  const Icon = meta.icon;
  const isCore = meta.kind === "core";
  const iconBg = KIND_ICON_BG[nodeData.kind] ?? "bg-muted";

  if (isCore) {
    const size = 260;
    return (
      <div className="relative" style={{ width: size, height: size }}>
        <div
          className={cn(
            "absolute inset-0 transition-colors",
            selected ? "bg-primary" : "bg-primary/70",
          )}
          style={{ clipPath: HEX_CLIP }}
        />
        <div
          className="absolute inset-[3px] bg-card flex items-center justify-center"
          style={{ clipPath: HEX_CLIP }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              clipPath: HEX_CLIP,
              boxShadow: "inset 0 0 36px 4px hsl(var(--primary) / 0.18)",
            }}
          />
          <div className="relative flex flex-col items-center gap-2.5 px-8 text-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full" />
              <div className="relative w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6)]">
                <CoreMark className="size-10 text-primary-foreground" />
              </div>
            </div>
            <p className="text-sm font-bold text-foreground tracking-tight leading-tight">
              {nodeData.title || "Núcleo do Colaborador"}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.18em] font-medium">
              Núcleo de Inteligência
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/12 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-300">Ativo</span>
            </div>
          </div>
        </div>
        <Handle
          type="target" position={Position.Left} id="core-target"
          style={{ left: "50%", top: "50%", width: 1, height: 1, transform: "translate(-50%, -50%)", background: "transparent", border: "none", opacity: 0, pointerEvents: "none" }}
        />
        <Handle
          type="source" position={Position.Right} id="core-source"
          style={{ left: "50%", top: "50%", width: 1, height: 1, transform: "translate(-50%, -50%)", background: "transparent", border: "none", opacity: 0, pointerEvents: "none" }}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-sm transition-all w-56",
        selected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-foreground/30",
      )}
    >
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !bg-primary/70 !border-2 !border-background" />
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !bg-muted-foreground/50 !border-2 !border-background" />

      <div className="flex items-center gap-3 p-3">
        <div className={cn(
          "w-9 h-9 rounded-md flex items-center justify-center shrink-0 text-white",
          iconBg,
        )}>
          <Icon size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold truncate">
            {meta.label}
          </p>
          <p className="font-semibold text-sm text-foreground leading-tight truncate">
            {nodeData.title || meta.label}
          </p>
        </div>
      </div>
    </div>
  );
}

export const EquipeNode = memo(EquipeNodeInner);

