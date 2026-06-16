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

const HEX_CLIP = "polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0% 50%)";

const KIND_ACCENT: Record<EquipeNodeKind, { text: string; bg: string; dot: string; border: string; glow: string }> = {
  core:            { text: "text-foreground",     bg: "bg-muted",             dot: "!bg-muted-foreground", border: "border-border",                glow: "" },
  goal:            { text: "text-emerald-400",    bg: "bg-emerald-500/10",    dot: "!bg-emerald-400",     border: "hover:border-emerald-500/40", glow: "hover:shadow-[0_0_20px_-4px_hsl(160_84%_45%/0.35)]" },
  rules:           { text: "text-rose-400",       bg: "bg-rose-500/10",       dot: "!bg-rose-400",        border: "hover:border-rose-500/40",    glow: "hover:shadow-[0_0_20px_-4px_hsl(350_84%_60%/0.35)]" },
  decision:        { text: "text-fuchsia-400",    bg: "bg-fuchsia-500/10",    dot: "!bg-fuchsia-400",     border: "hover:border-fuchsia-500/40", glow: "hover:shadow-[0_0_20px_-4px_hsl(290_84%_60%/0.35)]" },
  memory:          { text: "text-violet-400",     bg: "bg-violet-500/10",     dot: "!bg-violet-400",      border: "hover:border-violet-500/40",  glow: "hover:shadow-[0_0_20px_-4px_hsl(260_84%_65%/0.35)]" },
  knowledge:       { text: "text-amber-400",      bg: "bg-amber-500/10",      dot: "!bg-amber-400",       border: "hover:border-amber-500/40",   glow: "hover:shadow-[0_0_20px_-4px_hsl(40_90%_55%/0.35)]" },
  crm_data:        { text: "text-sky-400",        bg: "bg-sky-500/10",        dot: "!bg-sky-400",         border: "hover:border-sky-500/40",     glow: "hover:shadow-[0_0_20px_-4px_hsl(200_90%_55%/0.35)]" },
  data_collection: { text: "text-cyan-400",       bg: "bg-cyan-500/10",       dot: "!bg-cyan-400",        border: "hover:border-cyan-500/40",    glow: "hover:shadow-[0_0_20px_-4px_hsl(190_90%_55%/0.35)]" },
  analysis:        { text: "text-teal-400",       bg: "bg-teal-500/10",       dot: "!bg-teal-400",        border: "hover:border-teal-500/40",    glow: "hover:shadow-[0_0_20px_-4px_hsl(170_84%_45%/0.35)]" },
  tools:           { text: "text-indigo-400",     bg: "bg-indigo-500/10",     dot: "!bg-indigo-400",      border: "hover:border-indigo-500/40",  glow: "hover:shadow-[0_0_20px_-4px_hsl(235_84%_65%/0.35)]" },
  actions:         { text: "text-orange-400",     bg: "bg-orange-500/10",     dot: "!bg-orange-400",      border: "hover:border-orange-500/40",  glow: "hover:shadow-[0_0_20px_-4px_hsl(25_90%_55%/0.35)]" },
  escalation:      { text: "text-yellow-400",     bg: "bg-yellow-500/10",     dot: "!bg-yellow-400",      border: "hover:border-yellow-500/40",  glow: "hover:shadow-[0_0_20px_-4px_hsl(50_95%_55%/0.35)]" },
};

function EquipeNodeInner({ data, selected }: NodeProps) {
  const nodeData = data as unknown as EquipeNodeData;
  const meta = EQUIPE_NODE_META[nodeData.kind];
  if (!meta) return null;
  const Icon = meta.icon;
  const isCore = meta.kind === "core";
  const accent = KIND_ACCENT[nodeData.kind] ?? KIND_ACCENT.core;

  if (isCore) {
    const size = 280;
    return (
      <div className="relative" style={{ width: size, height: size }}>
        {/* Subtle soft gray border ring (no strong glow) */}
        <div
          className={cn(
            "absolute inset-0 transition-colors",
            selected ? "bg-border" : "bg-border/70",
          )}
          style={{ clipPath: HEX_CLIP }}
        />
        {/* Inner hex */}
        <div
          className="absolute inset-[2px] bg-card flex items-center justify-center"
          style={{ clipPath: HEX_CLIP }}
        >
          <div className="relative flex flex-col items-center gap-3 px-8 text-center">
            {/* Big logo, no glow */}
            <img
              src={coreMarkAsset.url}
              alt=""
              className="size-32 select-none pointer-events-none"
              draggable={false}
            />
            <div className="space-y-0.5">
              <p className="text-base font-bold text-foreground tracking-tight leading-tight">
                {nodeData.title || "Núcleo do Colaborador"}
              </p>
              {nodeData.summary && (
                <p className="text-[11px] text-muted-foreground line-clamp-2 max-w-[200px]">
                  {nodeData.summary}
                </p>
              )}
            </div>
          </div>
        </div>
        {/* Single hidden handle (floating edges compute closest point) */}
        <Handle
          type="source" position={Position.Top} id="src"
          style={{ left: "50%", top: "50%", width: 1, height: 1, transform: "translate(-50%, -50%)", background: "transparent", border: "none", opacity: 0, pointerEvents: "none" }}
        />
        <Handle
          type="target" position={Position.Top} id="tgt"
          style={{ left: "50%", top: "50%", width: 1, height: 1, transform: "translate(-50%, -50%)", background: "transparent", border: "none", opacity: 0, pointerEvents: "none" }}
        />
      </div>
    );
  }

  const isConfigured = !!(nodeData.summary && nodeData.summary.trim());
  const isRequired = meta.required;

  return (
    <div
      className={cn(
        "bg-card border rounded-xl w-60 overflow-hidden transition-all duration-200",
        "shadow-[0_2px_12px_hsl(0_0%_0%/0.25)]",
        selected ? "border-primary shadow-[0_0_24px_-6px_hsl(var(--primary)/0.5)]" : cn("border-border", accent.border, accent.glow),
      )}
    >
      <div className="px-3.5 py-2 flex items-center gap-2 border-b border-border/60">
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", accent.bg)}>
          <Icon size={14} className={accent.text} />
        </div>
        <span className={cn("text-[11px] font-semibold uppercase tracking-wider truncate", accent.text)}>
          {meta.label}
        </span>
        <span className="ml-auto flex items-center gap-1">
          {isRequired && !isConfigured && (
            <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wide">Obrig.</span>
          )}
          {isConfigured ? (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Configurado" />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" title="Pendente" />
          )}
        </span>
      </div>
      <div className="px-3.5 py-3">
        <p className="text-sm font-semibold text-foreground truncate">
          {nodeData.title || meta.label}
        </p>
        {isConfigured ? (
          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{nodeData.summary}</p>
        ) : (
          <p className="text-[11px] text-muted-foreground/60 mt-1 italic">Clique para configurar</p>
        )}
      </div>
      {/* Floating edges use closest side — handles centered & hidden */}
      <Handle type="target" position={Position.Left} id="tgt" className={cn("!w-2.5 !h-2.5 !border-2 !border-card !rounded-full opacity-0", accent.dot)} style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }} />
      <Handle type="source" position={Position.Right} id="src" className={cn("!w-2.5 !h-2.5 !border-2 !border-card !rounded-full opacity-0", accent.dot)} style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }} />
    </div>
  );
}

export const EquipeNode = memo(EquipeNodeInner);
