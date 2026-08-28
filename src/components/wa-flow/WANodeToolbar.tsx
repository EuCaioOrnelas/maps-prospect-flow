import { Button } from "@/components/ui/button";
import {
  MessageSquare, ToggleLeft, GitBranch, Clock, Settings,
  HeadphonesIcon, CircleStop, Star, Send, MessageCircleReply,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FaInstagram } from "react-icons/fa";
import { FaWhatsapp } from "react-icons/fa6";
import { isNodeAllowedInChannel, type FlowChannel } from "@/lib/flowChannels";

interface WANodeToolbarProps {
  onAddNode: (type: string) => void;
  channel?: FlowChannel;
}

type ToolbarButton = {
  type: string;
  icon: any;
  label: string;
  color?: string;
};

const nodeButtons: ToolbarButton[] = [
  { type: "entry", icon: FaWhatsapp, label: "Entrada WhatsApp", color: "text-emerald-500" },
  { type: "instagram_entry", icon: FaInstagram, label: "Entrada Instagram", color: "text-pink-500" },
  { type: "message", icon: MessageSquare, label: "Mensagem", color: "text-blue-400" },
  { type: "ig_send_dm", icon: Send, label: "Enviar Direct", color: "text-pink-500" },
  { type: "buttons", icon: ToggleLeft, label: "Botões", color: "text-indigo-400" },
  { type: "condition", icon: GitBranch, label: "Condição", color: "text-purple-400" },
  { type: "wait", icon: Clock, label: "Espera", color: "text-amber-400" },
  { type: "rating", icon: Star, label: "Avaliação", color: "text-amber-400" },
  { type: "action", icon: Settings, label: "Ação", color: "text-cyan-400" },
  { type: "ig_reply_comment", icon: MessageCircleReply, label: "Responder comentário", color: "text-fuchsia-500" },
  { type: "handoff", icon: HeadphonesIcon, label: "Humano", color: "text-orange-400" },
  { type: "end", icon: CircleStop, label: "Encerramento", color: "text-red-400" },
];

export function WANodeToolbar({ onAddNode, channel = "whatsapp" }: WANodeToolbarProps) {
  const buttons = nodeButtons.filter((btn) => isNodeAllowedInChannel(btn.type, channel));

  return (
    <div className="flex items-center gap-1 bg-card/95 backdrop-blur-sm border border-border rounded-full px-2 py-1.5 shadow-lg">
      {buttons.map((btn) => (
        <Tooltip key={btn.type}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-muted"
              onClick={() => onAddNode(btn.type)}
            >
              <btn.icon size={15} className={btn.color} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {btn.label}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
