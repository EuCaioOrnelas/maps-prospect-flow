import { Position, type NodeProps } from "@xyflow/react";
import { FlowHandle } from "./FlowHandle";
import openaiIcon from "@/assets/logos/openai-icon.png";
import geminiIcon from "@/assets/logos/gemini-icon.png";
import deepseekIcon from "@/assets/logos/deepseek-icon.png";

const PROVIDER_ICONS: Record<string, string> = {
  openai: openaiIcon,
  gemini: geminiIcon,
  deepseek: deepseekIcon,
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  deepseek: "DeepSeek",
};

export function WAAgentNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const provider = cfg.ai_provider || "openai";
  const providerIcon = PROVIDER_ICONS[provider] || openaiIcon;
  const providerLabel = PROVIDER_LABELS[provider] || String(provider);

  return (
    <div className="rounded-2xl bg-card border border-border/70 shadow-[0_6px_20px_-12px_hsl(var(--foreground)/0.35)] w-52">
      <FlowHandle type="target" position={Position.Left} />
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <img src={providerIcon} alt={providerLabel} className="w-5 h-5 object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate">
            {String((data as any).label || "Agente IA")}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">{providerLabel}</p>
        </div>
      </div>
      <FlowHandle type="source" position={Position.Right} />
    </div>
  );
}
