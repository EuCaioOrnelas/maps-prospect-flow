import { Button } from "@/components/ui/button";
import { 
  Zap, MessageSquare, ToggleLeft, GitBranch, Clock, Settings, 
  HeadphonesIcon, CircleStop 
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface WANodeToolbarProps {
  onAddNode: (type: string) => void;
}

const nodeButtons = [
  { type: "entry", icon: Zap, label: "Entrada", color: "text-primary" },
  { type: "message", icon: MessageSquare, label: "Mensagem", color: "text-blue-400" },
  { type: "buttons", icon: ToggleLeft, label: "Botões", color: "text-indigo-400" },
  { type: "condition", icon: GitBranch, label: "Condição", color: "text-purple-400" },
  { type: "wait", icon: Clock, label: "Espera", color: "text-amber-400" },
  { type: "action", icon: Settings, label: "Ação", color: "text-cyan-400" },
  { type: "handoff", icon: HeadphonesIcon, label: "Humano", color: "text-orange-400" },
  { type: "end", icon: CircleStop, label: "Encerramento", color: "text-red-400" },
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
