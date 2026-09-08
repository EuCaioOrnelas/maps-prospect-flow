import { Button } from "@/components/ui/button";
import {
  MessageSquare, ToggleLeft, GitBranch, Clock, Settings,
  HeadphonesIcon, CircleStop, Star, Zap,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

interface WANodeToolbarProps {
  onAddNode: (type: string) => void;
}

type ToolbarButton = {
  type: string;
  icon: any;
  label: string;
  color?: string;
};

const nodeButtons: ToolbarButton[] = [
  { type: "entry", icon: WhatsAppIcon, label: "Gatilho", color: "text-whatsapp" },
  { type: "message", icon: MessageSquare, label: "Mensagem", color: "text-primary" },
  { type: "buttons", icon: ToggleLeft, label: "Botões / Opções", color: "text-primary" },
  { type: "condition", icon: GitBranch, label: "Condição", color: "text-amber-500" },
  { type: "wait", icon: Clock, label: "Espera", color: "text-amber-500" },
  { type: "rating", icon: Star, label: "Avaliação", color: "text-amber-500" },
  { type: "action", icon: Settings, label: "Ação", color: "text-cyan-500" },
  { type: "handoff", icon: HeadphonesIcon, label: "Humano", color: "text-cyan-500" },
  { type: "end", icon: CircleStop, label: "Encerramento", color: "text-rose-500" },
];

export function WANodeToolbar({ onAddNode }: WANodeToolbarProps) {
  return (
    <div className="flex items-center gap-1 bg-card/95 backdrop-blur-sm border border-border rounded-full px-2 py-1.5 shadow-lg">
      {nodeButtons.map((btn) => (
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
