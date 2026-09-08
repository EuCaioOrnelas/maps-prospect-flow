import { Position, type NodeProps } from "@xyflow/react";
import { FlowHandle } from "./FlowHandle";
import { NodeShell } from "./NodeShell";
import { MessageSquare, Image, FileAudio, Video, FileText, Clock } from "lucide-react";

const typeIcons: Record<string, any> = {
  text: MessageSquare,
  image: Image,
  audio: FileAudio,
  video: Video,
  document: FileText,
  delay: Clock,
};

export function WAMessageNode({ data }: NodeProps) {
  const cfg = (data as any).config || {};
  const contents: any[] = cfg.contents || [];
  const contentCount = contents.filter((c: any) => c.type !== "delay").length;
  const firstContent = contents.find((c: any) => c.type !== "delay");
  const Icon = firstContent ? (typeIcons[firstContent.type] || MessageSquare) : MessageSquare;

  return (
    <NodeShell
      icon={Icon}
      accent="bg-primary"
      title={String((data as any).label || "Mensagem")}
      subtitle={contents.length > 0 ? `${contentCount} conteúdo${contentCount !== 1 ? "s" : ""}` : null}
      placeholder="Clique para editar"
    >
      <FlowHandle type="target" position={Position.Left} />
      <FlowHandle type="source" position={Position.Right} />
    </NodeShell>
  );
}
