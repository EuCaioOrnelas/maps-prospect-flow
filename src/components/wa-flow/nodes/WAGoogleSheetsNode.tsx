import { Position, type NodeProps } from "@xyflow/react";
import { FlowHandle } from "./FlowHandle";
import { CheckCircle2, AlertCircle } from "lucide-react";
import sheetsIcon from "@/assets/icons/google-sheets-sm.png";

export function WAGoogleSheetsNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const isConfigured = !!cfg.spreadsheet_id;
  const isConnected = !!cfg.google_connected;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm w-52 relative">
      <FlowHandle type="target" position={Position.Left} />
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50">
        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
          <img src={sheetsIcon} alt="Google Sheets" width={20} height={20} className="w-5 h-5 object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate">
            {String((data as any).label || "Google Sheets")}
          </p>
          {isConnected && isConfigured ? (
            <p className="text-[10px] text-green-500 flex items-center gap-1">
              <CheckCircle2 size={10} /> Conectado
            </p>
          ) : isConnected ? (
            <p className="text-[10px] text-yellow-500 flex items-center gap-1">
              <AlertCircle size={10} /> Configurar planilha
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground/60 italic">Clique para conectar</p>
          )}
        </div>
      </div>

      {isConnected && (
        <div className="px-3 py-2">
          <p className="text-[10px] text-muted-foreground truncate">📧 {cfg.google_email}</p>
          {cfg.spreadsheet_name && (
            <p className="text-[9px] text-muted-foreground truncate mt-0.5">📊 {cfg.spreadsheet_name}</p>
          )}
          {cfg.sheet_name && (
            <p className="text-[9px] text-muted-foreground truncate mt-0.5">📋 Aba: {cfg.sheet_name}</p>
          )}
          {cfg.columns && (
            <p className="text-[9px] text-muted-foreground mt-0.5">🔢 {cfg.columns.length} colunas</p>
          )}
        </div>
      )}

      <FlowHandle type="source" position={Position.Right} />
    </div>
  );
}
