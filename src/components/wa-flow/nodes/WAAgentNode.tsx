import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Bot } from "lucide-react";

export function WAAgentNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const hasPrompt = !!cfg.system_prompt;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm w-52">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-card !rounded-full" />
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50">
        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
          <Bot size={16} className="text-violet-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate">{String((data as any).label || "Agente IA")}</p>
          <p className="text-[10px] text-muted-foreground">
            {hasPrompt ? "Prompt configurado" : "Configurar agente"}
          </p>
        </div>
      </div>
      {hasPrompt && (
        <div className="px-3 py-2">
          <p className="text-[10px] text-foreground/70 line-clamp-3">{cfg.system_prompt}</p>
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-primary !border-2 !border-card !rounded-full" />
    </div>
  );
}
