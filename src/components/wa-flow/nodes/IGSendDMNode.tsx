import { Position, type NodeProps } from "@xyflow/react";
import { FlowHandle } from "./FlowHandle";
import { Send } from "lucide-react";

export function IGSendDMNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const contents: any[] = cfg.contents || cfg.items || [];
  const count = contents.filter((c: any) => c.type !== "delay").length;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm w-52">
      <FlowHandle type="target" position={Position.Left} />
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center shrink-0">
          <Send size={16} className="text-pink-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate">
            {String((data as any).label || "Enviar Direct")}
          </p>
          {count > 0 ? (
            <p className="text-[10px] text-muted-foreground truncate">
              {count} conteúdo{count !== 1 ? "s" : ""}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground/60 italic">Clique para editar</p>
          )}
        </div>
      </div>
      <FlowHandle type="source" position={Position.Right} />
    </div>
  );
}
