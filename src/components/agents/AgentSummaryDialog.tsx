import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bot,
  Play,
  Pause,
  Flame,
  Settings,
  Trash2,
  MessageSquare,
  Clock,
  Target,
  Copy,
  Info,
  Phone,
  Pencil,
  WifiOff,
  QrCode,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentSummaryDialogProps {
  agent: {
    id: string;
    name: string;
    objective: string;
    status: string;
    daily_limit: number;
    messages_sent_today: number;
    is_warmed: boolean;
    communication_style: string;
    operating_hours_start: string;
    operating_hours_end: string;
    whatsapp_number_id: string | null;
    whatsapp_number?: {
      name: string;
      phone_number: string;
    };
    created_at: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleStatus: (agent: any) => void;
  onOpenDetails: (agent: any) => void;
  onEdit: (agent: any) => void;
  onSaveTemplate: (agent: any) => void;
  onDelete: (agent: any) => void;
  onShowLeadsLimitInfo: () => void;
  disconnectedNumberIds?: Set<string>;
}

const getObjectiveLabel = (objective: string) => {
  switch (objective) {
    case 'prospecting': return 'Prospecção';
    case 'warming': return 'Aquecimento';
    case 'first_contact': return 'Primeiro Contato';
    default: return objective;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Ativo</Badge>;
    case 'paused':
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pausado</Badge>;
    case 'warming':
      return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Aquecendo</Badge>;
    case 'error':
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Erro</Badge>;
    default:
      return <Badge className="bg-muted text-muted-foreground">Rascunho</Badge>;
  }
};

const getCommunicationStyleLabel = (style: string) => {
  switch (style) {
    case 'formal': return 'Formal';
    case 'casual': return 'Casual';
    case 'friendly': return 'Amigável';
    case 'professional': return 'Profissional';
    default: return style;
  }
};

export function AgentSummaryDialog({
  agent,
  open,
  onOpenChange,
  onToggleStatus,
  onOpenDetails,
  onEdit,
  onSaveTemplate,
  onDelete,
  onShowLeadsLimitInfo,
  disconnectedNumberIds = new Set(),
}: AgentSummaryDialogProps) {
  const navigate = useNavigate();

  if (!agent) return null;

  const isNumberDisconnected = agent.whatsapp_number_id ? disconnectedNumberIds.has(agent.whatsapp_number_id) : false;
  const isNumberDeleted = !!(agent.whatsapp_number_id && !agent.whatsapp_number);
  const hasNumberProblem = isNumberDisconnected || isNumberDeleted;

  const isUnlimited = agent.daily_limit >= 9999 || agent.is_warmed;
  const progressPercent = isUnlimited ? 0 : Math.min((agent.messages_sent_today / agent.daily_limit) * 100, 100);
  const isAtLimit = !isUnlimited && agent.messages_sent_today >= agent.daily_limit;
  const isNearLimit = !isUnlimited && agent.messages_sent_today >= agent.daily_limit * 0.8;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="p-5 pb-4">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={cn("p-2.5 rounded-xl", hasNumberProblem ? "bg-destructive/10" : "bg-primary/10")}>
                    <Bot className={cn("h-6 w-6", hasNumberProblem ? "text-destructive" : "text-primary")} />
                  </div>
                  {agent.status === 'active' && !hasNumberProblem && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 ring-2 ring-background"></span>
                    </span>
                  )}
                </div>
                <div>
                  <DialogTitle className="text-lg">{agent.name}</DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{getObjectiveLabel(agent.objective)}</p>
                </div>
              </div>
              {hasNumberProblem 
                ? <Badge className="bg-destructive/20 text-destructive border-destructive/30">
                    {isNumberDeleted ? 'Sem número' : 'Desconectado'}
                  </Badge>
                : getStatusBadge(agent.status)
              }
            </div>
          </DialogHeader>
        </div>

        {/* Disconnection / Deleted Warning Banner */}
        {hasNumberProblem && (
          <div className="mx-5 mb-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-start gap-2.5">
              <WifiOff className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive mb-1">
                  {isNumberDeleted ? 'Número removido' : 'Número desconectado'}
                </p>
                <p className="text-xs text-muted-foreground mb-2.5">
                  {isNumberDeleted 
                    ? 'O número vinculado a este agente foi excluído. Edite o agente para vincular um novo número.'
                    : 'O número perdeu a conexão com a ferramenta. O agente não funcionará enquanto não houver uma nova conexão.'
                  }
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => {
                    onOpenChange(false);
                    if (isNumberDeleted) {
                      onEdit(agent);
                    } else {
                      navigate('/whatsapp');
                    }
                  }}
                >
                  <QrCode className="h-3 w-3" />
                  {isNumberDeleted ? 'Vincular Novo Número' : 'Reconectar Número'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Info Rows */}
        <div className="px-5 pb-4 space-y-1">
          {/* WhatsApp Number */}
          {agent.whatsapp_number && (
            <div className="flex items-center justify-between py-2.5 border-b border-border/50">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Número
              </span>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  hasNumberProblem ? "bg-destructive" : agent.is_warmed ? "bg-green-500" : "bg-yellow-500"
                )} />
                <span className={cn("text-sm font-medium", hasNumberProblem && "text-destructive")}>
                  {agent.whatsapp_number.name || agent.whatsapp_number.phone_number}
                </span>
                {!agent.is_warmed && !hasNumberProblem && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-yellow-500/30 text-yellow-500">
                    <Flame className="h-2.5 w-2.5 mr-0.5" />
                    Frio
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Deleted number indicator */}
          {isNumberDeleted && !agent.whatsapp_number && (
            <div className="flex items-center justify-between py-2.5 border-b border-border/50">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Número
              </span>
              <span className="text-sm font-medium text-destructive">Removido</span>
            </div>
          )}

          {/* Messages Today */}
          <div className="py-2.5 border-b border-border/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Mensagens hoje
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`text-sm font-semibold tabular-nums ${
                  isAtLimit ? 'text-red-500' : isNearLimit ? 'text-yellow-500' : 'text-foreground'
                }`}>
                  {agent.messages_sent_today} / {isUnlimited ? '∞' : agent.daily_limit}
                </span>
                <button
                  onClick={() => onShowLeadsLimitInfo()}
                  className="text-muted-foreground/50 hover:text-foreground transition-colors"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-primary'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Operating Hours */}
          <div className="flex items-center justify-between py-2.5 border-b border-border/50">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horário ativo
            </span>
            <span className="text-sm font-medium tabular-nums">
              {agent.operating_hours_start?.slice(0, 5)} – {agent.operating_hours_end?.slice(0, 5)}
            </span>
          </div>

          {/* Objective */}
          <div className="flex items-center justify-between py-2.5 border-b border-border/50">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Objetivo
            </span>
            <span className="text-sm font-medium">
              {getObjectiveLabel(agent.objective)}
            </span>
          </div>

          {/* Communication Style */}
          <div className="flex items-center justify-between py-2.5">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Estilo
            </span>
            <span className="text-sm font-medium">
              {getCommunicationStyleLabel(agent.communication_style)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 p-4 border-t border-border bg-muted/30">
          {hasNumberProblem ? (
            <Button
              variant="destructive"
              size="sm"
              className="flex-1 h-9 gap-1.5"
              onClick={() => {
                onOpenChange(false);
                if (isNumberDeleted) {
                  onEdit(agent);
                } else {
                  navigate('/whatsapp');
                }
              }}
            >
              <QrCode className="h-4 w-4" />
              {isNumberDeleted ? 'Vincular Número' : 'Reconectar'}
            </Button>
          ) : (
            <Button
              variant={agent.status === 'active' ? 'outline' : 'default'}
              size="sm"
              className="flex-1 h-9"
              onClick={() => {
                onToggleStatus(agent);
                onOpenChange(false);
              }}
            >
              {agent.status === 'active' ? (
                <>
                  <Pause className="h-4 w-4 mr-1.5" />
                  Pausar
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1.5" />
                  Ativar
                </>
              )}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9"
            onClick={() => {
              onOpenChange(false);
              onEdit(agent);
            }}
          >
            <Pencil className="h-4 w-4 mr-1.5" />
            Editar
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9"
            onClick={() => {
              onOpenChange(false);
              onOpenDetails(agent);
            }}
          >
            <Settings className="h-4 w-4 mr-1.5" />
            Detalhes
          </Button>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => {
                  onOpenChange(false);
                  onSaveTemplate(agent);
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Salvar como template</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                onClick={() => {
                  onOpenChange(false);
                  onDelete(agent);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Excluir</TooltipContent>
          </Tooltip>
        </div>
      </DialogContent>
    </Dialog>
  );
}
