import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { EQUIPE_NODE_META, type EquipeNodeKind } from "../nodeTypes";
import { cn } from "@/lib/utils";
import coreMarkAsset from "@/assets/equipe-core-mark.png.asset.json";

interface EquipeNodeData {
  kind: EquipeNodeKind;
  title?: string;
  summary?: string;
  status?: string;
}

// Sharp hexagon (flat-top). Single clip used by all hex layers so borders stay crisp.
const HEX_CLIP = "polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0% 50%)";

// Per-kind accent tokens mirroring the Flow node style: tinted icon chip + colored
// uppercase label + matching handle dot.
const KIND_ACCENT: Record<EquipeNodeKind, { text: string; bg: string; dot: string }> = {
  core:            { text: "text-primary",        bg: "bg-primary/10",        dot: "!bg-primary" },
  goal:            { text: "text-emerald-400",    bg: "bg-emerald-500/10",    dot: "!bg-emerald-400" },
  rules:           { text: "text-rose-400",       bg: "bg-rose-500/10",       dot: "!bg-rose-400" },
  decision:        { text: "text-fuchsia-400",    bg: "bg-fuchsia-500/10",    dot: "!bg-fuchsia-400" },
  memory:          { text: "text-violet-400",     bg: "bg-violet-500/10",     dot: "!bg-violet-400" },
  knowledge:       { text: "text-amber-400",      bg: "bg-amber-500/10",      dot: "!bg-amber-400" },
  crm_data:        { text: "text-sky-400",        bg: "bg-sky-500/10",        dot: "!bg-sky-400" },
  data_collection: { text: "text-cyan-400",       bg: "bg-cyan-500/10",       dot: "!bg-cyan-400" },
  analysis:        { text: "text-teal-400",       bg: "bg-teal-500/10",       dot: "!bg-teal-400" },
  tools:           { text: "text-indigo-400",     bg: "bg-indigo-500/10",     dot: "!bg-indigo-400" },
  actions:         { text: "text-orange-400",     bg: "bg-orange-500/10",     dot: "!bg-orange-400" },
  escalation:      { text: "text-yellow-400",     bg: "bg-yellow-500/10",     dot: "!bg-yellow-400" },
};

function EquipeNodeInner({ data, selected }: NodeProps) {
  const nodeData = data as unknown as EquipeNodeData;
  const meta = EQUIPE_NODE_META[nodeData.kind];
  if (!meta) return null;
  const Icon = meta.icon;
  const isCore = meta.kind === "core";
  const accent = KIND_ACCENT[nodeData.kind] ?? KIND_ACCENT.core;

  if (isCore) {
    const size = 260;
    const hasSummary = !!(nodeData.summary && nodeData.summary.trim());
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
                <img src={coreMarkAsset.url} alt="" className="size-10 select-none pointer-events-none" draggable={false} />
              </div>
            </div>
            <p className="text-sm font-bold text-foreground tracking-tight leading-tight">
              {nodeData.title || "Núcleo do Colaborador"}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.18em] font-medium">
              Núcleo de Inteligência
            </p>
            {hasSummary ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/12 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-300">Ativo</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/12 border border-amber-500/40">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-300">
                  Clique para configurar instruções
                </span>
              </div>
            )}
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

  const isConfigured = !!(nodeData.summary && nodeData.summary.trim());

  return (
    <div
      className={cn(
        "bg-card border rounded-xl shadow-[0_2px_12px_hsl(0_0%_0%/0.3)] w-60 overflow-hidden backdrop-blur-sm transition-colors",
        selected ? "border-primary" : "border-border hover:border-foreground/30",
      )}
    >
      <div className="px-3.5 py-2 flex items-center gap-2 border-b border-border">
        <div className={cn("w-6 h-6 rounded-md flex items-center justify-center", accent.bg)}>
          <Icon size={13} className={accent.text} />
        </div>
        <span className={cn("text-[11px] font-semibold uppercase tracking-wider", accent.text)}>
          {meta.label}
        </span>
        {isConfigured && <span className="ml-auto text-[10px] text-primary">✓</span>}
      </div>
      <div className="px-3.5 py-3">
        <p className="text-sm font-medium text-foreground truncate">
          {nodeData.title || meta.label}
        </p>
        {isConfigured ? (
          <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2">{nodeData.summary}</p>
        ) : (
          <p className="text-[11px] text-muted-foreground/60 mt-1.5 italic">Clique para configurar</p>
        )}
      </div>
      <Handle type="target" position={Position.Left} className={cn("!w-2.5 !h-2.5 !border-2 !border-card !rounded-full", accent.dot)} />
      <Handle type="source" position={Position.Right} className={cn("!w-2.5 !h-2.5 !border-2 !border-card !rounded-full", accent.dot)} />
    </div>
  );
}

export const EquipeNode = memo(EquipeNodeInner);
