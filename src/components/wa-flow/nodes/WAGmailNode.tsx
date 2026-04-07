import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Mail } from "lucide-react";

export function WAGmailNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const isConfigured = !!cfg.webhook_url;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm w-52 relative">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50">
        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
          <Mail size={16} className="text-red-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate">
            {String((data as any).label || "Gmail")}
          </p>
          {isConfigured ? (
            <p className="text-[10px] text-muted-foreground truncate">✉️ {cfg.email_subject || "Email configurado"}</p>
          ) : (
            <p className="text-[10px] text-muted-foreground/60 italic">Clique para configurar</p>
          )}
        </div>
      </div>

      {isConfigured && cfg.email_to && (
        <div className="px-3 py-2">
          <p className="text-[10px] text-muted-foreground truncate">📧 {cfg.email_to}</p>
        </div>
      )}

      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-red-500 !border-2 !border-card !rounded-full" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-red-500 !border-2 !border-card !rounded-full" />
    </div>
  );
}
