import { Position, type NodeProps } from "@xyflow/react";
import { FlowHandle } from "./FlowHandle";
import { HeadphonesIcon, UserIcon, UsersIcon } from "lucide-react";

export function WAHandoffNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const isRoundRobin = cfg.distribution_type === "round_robin";
  const memberCount = Array.isArray(cfg.member_ids) ? cfg.member_ids.length : 0;

  let subtitle = "Transferir para humano";
  if (isRoundRobin) subtitle = `Distribuir entre ${memberCount || 0} colaboradores`;
  else if (cfg.specific_member_id) subtitle = "Colaborador específico";
  else if (cfg.notify_team) subtitle = "Notificar equipe";

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm w-52">
      <FlowHandle type="target" position={Position.Left} />
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
          <HeadphonesIcon size={16} className="text-orange-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate">{String((data as any).label || "Humano")}</p>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
            {isRoundRobin
              ? <UsersIcon size={9} />
              : <UserIcon size={9} />}
            {subtitle}
          </p>
        </div>
      </div>
      <FlowHandle type="source" position={Position.Right} />
    </div>
  );
}
