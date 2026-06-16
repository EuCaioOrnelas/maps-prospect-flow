import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { MoreVertical } from "lucide-react";
import { EQUIPE_NODE_META, type EquipeNodeKind } from "../nodeTypes";
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
 * Meta-AI inspired tech mark — multi-layered ribbon composed of overlapping
 * orbital arcs, a central nucleus and accent dots. Each layer uses a different
 * opacity to feel like a built-up vector logo.
 */
function CoreMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} fill="none">
      <defs>
        <linearGradient id="ribbonA" x1="0" y1="20" x2="80" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="ribbonB" x1="80" y1="20" x2="0" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.4" />
        </linearGradient>
      </defs>

      {/* Outer orbit ring */}
      <ellipse cx="40" cy="40" rx="32" ry="20" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
      {/* Counter orbit ring (rotated) */}
      <ellipse cx="40" cy="40" rx="32" ry="20" stroke="currentColor" strokeWidth="1.5" opacity="0.25" transform="rotate(60 40 40)" />
      <ellipse cx="40" cy="40" rx="32" ry="20" stroke="currentColor" strokeWidth="1.5" opacity="0.25" transform="rotate(-60 40 40)" />

      {/* Left ribbon loop */}
      <path
        d="M14 40 C14 26 28 22 36 32 C42 40 46 48 54 48 C62 48 66 42 66 36"
        stroke="url(#ribbonA)"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right ribbon loop (mirrored) */}
      <path
        d="M66 40 C66 54 52 58 44 48 C38 40 34 32 26 32 C18 32 14 38 14 44"
        stroke="url(#ribbonB)"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />

      {/* Center nucleus */}
      <circle cx="40" cy="40" r="4" fill="currentColor" />
      <circle cx="40" cy="40" r="7" stroke="currentColor" strokeWidth="1.25" opacity="0.5" />

      {/* Accent satellites */}
      <circle cx="14" cy="40" r="2.2" fill="currentColor" />
      <circle cx="66" cy="40" r="2.2" fill="currentColor" />
      <circle cx="40" cy="14" r="1.5" fill="currentColor" opacity="0.7" />
      <circle cx="40" cy="66" r="1.5" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

function EquipeNodeInner({ data, selected }: NodeProps) {
  const nodeData = data as unknown as EquipeNodeData;
  const meta = EQUIPE_NODE_META[nodeData.kind];
  if (!meta) return null;
  const Icon = meta.icon;
  const isCore = meta.kind === "core";

  if (isCore) {
    const size = 260;
    return (
      <div className="relative" style={{ width: size, height: size }}>
        {/* Sharp solid border layer (no animation) */}
        <div
          className={cn(
            "absolute inset-0 transition-colors",
            selected ? "bg-primary" : "bg-primary/70",
          )}
          style={{ clipPath: HEX_CLIP }}
        />
        {/* Card body — 3px gap reveals the border above */}
        <div
          className="absolute inset-[3px] bg-card flex items-center justify-center"
          style={{ clipPath: HEX_CLIP }}
        >
          {/* Soft inner glow hugging the inner border */}
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
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/75 flex items-center justify-center shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6)]">
                <CoreMark className="size-9 text-primary-foreground" />
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
