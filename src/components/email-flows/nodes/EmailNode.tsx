import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Mail, MousePointerClick, ShoppingCart } from "lucide-react";

export function EmailNode({ data }: NodeProps) {
  const cfg = data.config as any || {};
  const isConfigured = !!cfg.subject && !!cfg.body;
  const metrics = data.metrics as any;

  return (
    <div className="bg-card border-2 border-blue-500/50 rounded-xl shadow-lg w-56 overflow-hidden">
      <div className="bg-blue-500/15 px-3 py-2 flex items-center gap-2 border-b border-blue-500/20">
        <Mail size={14} className="text-blue-400" />
        <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">Email</span>
        {isConfigured && <span className="ml-auto text-[10px] text-emerald-400">✓</span>}
      </div>
      <div className="px-3 py-2.5">
        <p className="text-sm font-medium text-foreground truncate">{String(data.label || "Email")}</p>
        {isConfigured ? (
          <p className="text-[11px] text-muted-foreground mt-1 truncate">Assunto: {cfg.subject}</p>
        ) : (
          <p className="text-[11px] text-amber-400 mt-1">⚠ Configure o email</p>
        )}
        {metrics && (
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground border-t border-border pt-1.5">
            <span>👥 {metrics.passed}</span>
            <span>📤 {metrics.sent}</span>
            <span>👁 {metrics.opened}</span>
            {cfg.track_clicks !== false && <span className="flex items-center gap-0.5"><MousePointerClick size={10} /> {metrics.clicked}</span>}
            {cfg.track_purchases && <span className="flex items-center gap-0.5"><ShoppingCart size={10} /> {metrics.purchased || 0}</span>}
          </div>
        )}
      </div>
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-blue-400 !border-2 !border-card" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-blue-400 !border-2 !border-card" />
    </div>
  );
}
