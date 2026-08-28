import { Position, type NodeProps } from "@xyflow/react";
import { FlowHandle } from "./FlowHandle";
import { FaInstagram } from "react-icons/fa6";
import { igTriggerLabel } from "@/lib/flowChannels";

export function IGEntryNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const configured = !!cfg.trigger_type && !!cfg.instagram_connection_id;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm w-52">
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center shrink-0">
          <FaInstagram size={16} className="text-pink-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate">
            {String((data as any).label || "Entrada Instagram")}
          </p>
          {configured ? (
            <p className="text-[10px] text-muted-foreground truncate">
              {igTriggerLabel(cfg.trigger_type)}
              {cfg.ig_username ? ` · @${cfg.ig_username}` : ""}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground/60 italic">Clique para configurar</p>
          )}
        </div>
      </div>
      <FlowHandle type="source" position={Position.Right} />
    </div>
  );
}
