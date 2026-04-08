import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Settings } from "lucide-react";

const actionLabels: Record<string, string> = {
  add_tag: "Adicionar tag",
  remove_tag: "Remover tag",
  update_field: "Atualizar campo",
  move_pipeline: "Mover pipeline",
  send_to_crm: "Enviar ao CRM",
  webhook: "Disparar webhook",
  mark_hot: "Marcar quente",
  mark_cold: "Marcar frio",
  mark_converted: "Marcar convertido",
};

export function WAActionNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const isConfigured = !!cfg.action_type;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm w-48">
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
          <Settings size={16} className="text-cyan-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate">{String((data as any).label || "Ação")}</p>
          {isConfigured ? (
            <p className="text-[10px] text-muted-foreground truncate">
              {actionLabels[cfg.action_type] || cfg.action_type}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground/60 italic">Configurar ação</p>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
