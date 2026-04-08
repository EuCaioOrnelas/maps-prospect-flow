import { Handle, Position, type NodeProps } from "@xyflow/react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import gmailIcon from "@/assets/icons/gmail.png";

export function WAGmailNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const isConnected = !!cfg.google_connected;
  const isConfigured = isConnected && !!cfg.email_to;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm w-52 relative">
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50">
        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
          <img src={gmailIcon} alt="Gmail" className="w-5 h-5 object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate">
            {String((data as any).label || "Gmail")}
          </p>
          {isConfigured ? (
            <p className="text-[10px] text-green-500 flex items-center gap-1">
              <CheckCircle2 size={10} /> Configurado
            </p>
          ) : isConnected ? (
            <p className="text-[10px] text-yellow-500 flex items-center gap-1">
              <AlertCircle size={10} /> Configurar email
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground/60 italic">Clique para conectar</p>
          )}
        </div>
      </div>

      {isConfigured && (
        <div className="px-3 py-2">
          <p className="text-[10px] text-muted-foreground truncate">✉️ {cfg.email_subject || "Email configurado"}</p>
          <p className="text-[9px] text-muted-foreground truncate mt-0.5">📧 Para: {cfg.email_to}</p>
          {cfg.email_cc && (
            <p className="text-[9px] text-muted-foreground truncate mt-0.5">📋 CC: {cfg.email_cc}</p>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Right} />
    </div>
  );
}
