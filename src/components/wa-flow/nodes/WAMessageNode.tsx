import { Position, type NodeProps } from "@xyflow/react";
import { FlowHandle } from "./FlowHandle";
import { MessageSquare, Image, FileAudio, Video, FileText, FileUp } from "lucide-react";

const typeIcons: Record<string, any> = {
  text: MessageSquare,
  image: Image,
  audio: FileAudio,
  video: Video,
  document: FileText,
};

export function WAMessageNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const msgType = cfg.message_type || "text";
  const Icon = typeIcons[msgType] || MessageSquare;
  const hasContent = !!cfg.content || !!cfg.template_name;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm w-52">
      <FlowHandle type="target" position={Position.Left} />
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
          <Icon size={16} className="text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-foreground truncate">{String((data as any).label || "Mensagem")}</p>
          {hasContent ? (
            <p className="text-[10px] text-muted-foreground truncate">
              {cfg.content?.substring(0, 40) || cfg.template_name || msgType}
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
