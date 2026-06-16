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

const PROVIDER_ACCENT: Record<string, string> = {
  openai: "#10A37F",
  gemini: "#4285F4",
  deepseek: "#4D6BFA",
};

export function WAAgentNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const hasPrompt = !!cfg.system_prompt || !!cfg.saved_agent_id;
  const provider = cfg.ai_provider || "openai";
  const model = cfg.ai_model || "";
  const maxChars = cfg.max_chars || 500;
  const providerIcon = PROVIDER_ICONS[provider];
  const accent = PROVIDER_ACCENT[provider] || "#8B5CF6";

  return (
    <div
      className={`rounded-xl shadow-sm w-52 transition-all ${
        hasPrompt
          ? "bg-violet-50/60 dark:bg-violet-950/30 border-2 border-violet-400/60 shadow-[0_0_0_4px_rgba(139,92,246,0.12)]"
          : "bg-card border border-border"
      }`}
    >
      <FlowHandle type="target" position={Position.Left} />
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-violet-200/40 dark:border-violet-800/30">
        {providerIcon && hasPrompt ? (
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{ backgroundColor: `${accent}15` }}
          >
            <img src={providerIcon} alt={PROVIDER_LABELS[provider]} className="w-5 h-5 rounded" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
            <Bot size={16} className="text-violet-400" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-bold text-foreground truncate">
              {String((data as any).label || "Agente IA")}
            </p>
            {hasPrompt && (
              <span
                className="relative flex h-2 w-2"
                title="IA ativa"
              >
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: accent }}
                />
                <span
                  className="relative inline-flex rounded-full h-2 w-2"
                  style={{ backgroundColor: accent }}
                />
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {hasPrompt ? (
              <span className="text-violet-600 dark:text-violet-300 font-medium">
                {PROVIDER_LABELS[provider] || provider}
              </span>
            ) : (
              "Configurar agente"
            )}
          </p>
        </div>
      </div>
      {hasPrompt && (
        <div className="px-3 py-2.5 space-y-1.5">
          {model && (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-semibold text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/40 px-1.5 py-0.5 rounded-md">
                {model}
              </span>
              <span className="text-[9px] text-muted-foreground">· {maxChars}c</span>
            </div>
          )}
          {cfg.system_prompt && (
            <p className="text-[10px] text-foreground/80 line-clamp-2 leading-relaxed">{cfg.system_prompt}</p>
          )}
        </div>
      )}
      <FlowHandle type="source" position={Position.Right} />
    </div>
  );
}
