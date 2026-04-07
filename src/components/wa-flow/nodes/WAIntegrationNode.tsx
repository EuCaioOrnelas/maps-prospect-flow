import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Plug } from "lucide-react";

const integrationLabels: Record<string, { label: string; emoji: string }> = {
  google_sheets: { label: "Google Sheets", emoji: "📊" },
  google_calendar: { label: "Google Agenda", emoji: "📅" },
  gmail: { label: "Gmail", emoji: "✉️" },
  webhook: { label: "Webhook", emoji: "🔗" },
};

export function WAIntegrationNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const intType = cfg.integration_type || "";
  const info = integrationLabels[intType];
  const isConfigured = !!intType && !!cfg.webhook_url;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm w-52 relative">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50">
        <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
          <Plug size={16} className="text-rose-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate">
            {String((data as any).label || "Integração")}
          </p>
          {isConfigured ? (
            <p className="text-[10px] text-muted-foreground truncate">
              {info?.emoji} {info?.label || intType}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground/60 italic">Clique para configurar</p>
          )}
        </div>
      </div>

      {isConfigured && (
        <div className="px-3 py-2 space-y-1">
          <div className="text-[10px] bg-rose-400/10 rounded px-2 py-1.5 text-rose-400 font-medium truncate">
            {info?.emoji} {info?.label}
          </div>
          {cfg.webhook_url && (
            <p className="text-[9px] text-muted-foreground truncate px-1">
              🔗 {cfg.webhook_url.substring(0, 35)}...
            </p>
          )}
        </div>
      )}

      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-rose-400 !border-2 !border-card !rounded-full" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-rose-400 !border-2 !border-card !rounded-full" />
    </div>
  );
}
