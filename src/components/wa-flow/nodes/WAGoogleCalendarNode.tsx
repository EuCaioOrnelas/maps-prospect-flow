import { Position, type NodeProps } from "@xyflow/react";
import { FlowHandle } from "./FlowHandle";
import { CheckCircle2, AlertCircle } from "lucide-react";
import calendarIcon from "@/assets/icons/google-calendar-sm.png";

export function WAGoogleCalendarNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const isConnected = !!cfg.google_connected;
  const isConfigured = isConnected && !!cfg.event_title;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm w-52 relative">
      <FlowHandle type="target" position={Position.Left} />
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
          <img src={calendarIcon} alt="Google Calendar" width={20} height={20} className="w-5 h-5 object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate">
            {String((data as any).label || "Google Agenda")}
          </p>
          {isConfigured ? (
            <p className="text-[10px] text-green-500 flex items-center gap-1">
              <CheckCircle2 size={10} /> Configurado
            </p>
          ) : isConnected ? (
            <p className="text-[10px] text-yellow-500 flex items-center gap-1">
              <AlertCircle size={10} /> Configurar evento
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground/60 italic">Clique para conectar</p>
          )}
        </div>
      </div>

      {isConnected && (
        <div className="px-3 py-2">
          {cfg.calendar_name && (
            <p className="text-[10px] text-muted-foreground truncate">📅 {cfg.calendar_name}</p>
          )}
          {cfg.event_title && (
            <p className="text-[9px] text-muted-foreground truncate mt-0.5">📝 {cfg.event_title}</p>
          )}
          {cfg.event_duration && (
            <p className="text-[9px] text-muted-foreground mt-0.5">⏱ {cfg.event_duration} min</p>
          )}
        </div>
      )}

      <FlowHandle type="source" position={Position.Right} />
    </div>
  );
}
