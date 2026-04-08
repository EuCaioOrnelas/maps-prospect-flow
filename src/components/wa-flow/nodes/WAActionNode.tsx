import { Position, type NodeProps } from "@xyflow/react";
import { FlowHandle } from "./FlowHandle";
import { Settings } from "lucide-react";

const actionLabels: Record<string, string> = {
  add_tag: "Adicionar tag",
  remove_tag: "Remover tag",
  move_pipeline: "Mover no Kanban",
  send_to_crm: "Criar/atualizar lead",
};

export function WAActionNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const actions = cfg.actions || [];
  const hasActions = actions.length > 0;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm w-48">
      <FlowHandle type="target" position={Position.Left} />
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
          <Settings size={16} className="text-cyan-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate">{String((data as any).label || "Ação")}</p>
          {hasActions ? (
            <p className="text-[10px] text-muted-foreground truncate">
              {actions.length} {actions.length === 1 ? "ação" : "ações"}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground/60 italic">Configurar ações</p>
          )}
        </div>
      </div>
      <FlowHandle type="source" position={Position.Right} />
    </div>
  );
}
