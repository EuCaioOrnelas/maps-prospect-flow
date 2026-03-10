import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Mail, MousePointerClick, ShoppingCart } from "lucide-react";

export function EmailNode({ data }: NodeProps) {
  const cfg = data.config as any || {};
  const isConfigured = !!cfg.subject && !!cfg.body;
  const metrics = data.metrics as any;

  return (
    <div className="bg-card border border-border rounded-xl shadow-[0_2px_12px_hsl(0_0%_0%/0.3)] w-60 overflow-hidden backdrop-blur-sm">
      <div className="px-3.5 py-2 flex items-center gap-2 border-b border-border">
        <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center">
          <Mail size={13} className="text-blue-400" />
        </div>
        <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">Email</span>
        {isConfigured && <span className="ml-auto text-[10px] text-primary">✓</span>}
      </div>
      <div className="px-3.5 py-3">
        <p className="text-sm font-medium text-foreground truncate">{String(data.label || "Email")}</p>
        {isConfigured ? (
          <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{cfg.subject}</p>
        ) : (
          <p className="text-[11px] text-muted-foreground/60 mt-1.5 italic">Configure o email</p>
        )}
        {metrics && metrics.passed > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50 grid grid-cols-2 gap-x-3 gap-y-1">
            <span className="text-[10px] text-muted-foreground">Enviados <span className="font-medium text-foreground/80">{metrics.sent}</span></span>
            <span className="text-[10px] text-muted-foreground">Abertos <span className="font-medium text-foreground/80">{metrics.opened}</span></span>
            {cfg.track_clicks !== false && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <MousePointerClick size={9} /> <span className="font-medium text-foreground/80">{metrics.clicked}</span>
              </span>
            )}
            {cfg.track_purchases && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <ShoppingCart size={9} /> <span className="font-medium text-foreground/80">{metrics.purchased || 0}</span>
              </span>
            )}
          </div>
        )}
      </div>
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-blue-400 !border-2 !border-card !rounded-full" />
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-blue-400 !border-2 !border-card !rounded-full" />
    </div>
  );
}
