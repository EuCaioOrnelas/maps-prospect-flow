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
  const hasPrompt = !!cfg.system_prompt || !!cfg.saved_agent_id;
  const provider = cfg.ai_provider || "openai";
  const model = cfg.ai_model || "";
  const maxChars = cfg.max_chars || 500;
  const providerIcon = PROVIDER_ICONS[provider];

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm w-52">
      <FlowHandle type="target" position={Position.Left} />
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50">
        {providerIcon && hasPrompt ? (
          <img src={providerIcon} alt={PROVIDER_LABELS[provider]} className="w-8 h-8 rounded-lg" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
            <Bot size={16} className="text-violet-400" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate">{String((data as any).label || "Agente IA")}</p>
          <p className="text-[10px] text-muted-foreground">
            {hasPrompt ? PROVIDER_LABELS[provider] || provider : "Configurar agente"}
          </p>
        </div>
      </div>
      {hasPrompt && (
        <div className="px-3 py-2 space-y-1">
          {model && (
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">{model}</span>
              <span className="text-[9px] text-muted-foreground">· {maxChars}c</span>
            </div>
          )}
          {cfg.system_prompt && (
            <p className="text-[10px] text-foreground/70 line-clamp-2">{cfg.system_prompt}</p>
          )}
        </div>
      )}
      <FlowHandle type="source" position={Position.Right} />
    </div>
  );
}
