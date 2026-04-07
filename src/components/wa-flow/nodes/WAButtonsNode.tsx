import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ToggleLeft } from "lucide-react";

export function WAButtonsNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const buttons: string[] = cfg.buttons || [];
  const hasButtons = buttons.length > 0;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm w-52">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
          <ToggleLeft size={16} className="text-indigo-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate">{String((data as any).label || "Botões")}</p>
          <p className="text-[10px] text-muted-foreground">{hasButtons ? `${buttons.length} opções` : "Configurar"}</p>
        </div>
      </div>
      {hasButtons && (
        <div className="px-3 py-2 space-y-1">
          {buttons.map((btn: string, i: number) => (
            <div key={i} className="text-[10px] bg-muted/50 rounded px-2 py-1 truncate text-foreground/80">
              {btn}
            </div>
          ))}
        </div>
      )}
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-card !rounded-full" />
      {/* One handle per button or default */}
      {hasButtons ? (
        buttons.map((_: string, i: number) => (
          <Handle
            key={i}
            type="source"
            position={Position.Right}
            id={`btn-${i}`}
            className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-card !rounded-full"
            style={{ top: `${35 + ((i + 1) * 100) / (buttons.length + 1)}%` }}
          />
        ))
      ) : (
        <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-card !rounded-full" />
      )}
    </div>
  );
}
