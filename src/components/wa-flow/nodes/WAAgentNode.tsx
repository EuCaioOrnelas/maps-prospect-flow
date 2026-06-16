import { Position, type NodeProps } from "@xyflow/react";
import { FlowHandle } from "./FlowHandle";
import { Bot } from "lucide-react";
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
  const providerIcon = PROVIDER_ICONS[provider];
  const providerLabel = PROVIDER_LABELS[provider] || provider;

  return (
    <div className="rounded-xl bg-card border border-border shadow-sm w-52">
      <FlowHandle type="target" position={Position.Left} />
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
          {providerIcon ? (
            <img src={providerIcon} alt={providerLabel} className="w-5 h-5 rounded" />
          ) : (
            <Bot size={16} className="text-emerald-500" />
          )}
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
