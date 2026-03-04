import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  Eye, 
  Wifi, 
  WifiOff,
  Flame,
  Thermometer,
  ThermometerSun,
  Search,
  MapPin,
  AlertTriangle,
  RefreshCw,
  Clock,
  MessageSquare,
  SkipForward
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WarmingSession {
  id: string;
  status: 'idle' | 'active' | 'paused' | 'completed' | 'error';
  warming_level: number;
  warming_status: 'cold' | 'warm' | 'hot';
  leads_used: number;
  leads_limit: number;
  current_day: number;
  error_message?: string | null;
  messages_sent_today?: number;
  last_message_at?: string | null;
}

interface SearchAssignment {
  whatsapp_number_id: string;
  search_query: string;
  search_city: string | null;
}

interface WarmingNumberCardProps {
  number: {
    id: string;
    name: string;
    phone_number: string | null;
    is_connected: boolean;
    instance_name?: string | null;
  };
  session?: WarmingSession;
  assignment?: SearchAssignment;
  onStart: () => void;
  onPause: () => void;
  onViewDetails: () => void;
  onSelectSearch?: () => void;
  onReconnect?: () => void;
  onSkipWarming?: () => void;
}

const getWarmingStatusConfig = (status: 'cold' | 'warm' | 'hot' | undefined) => {
  switch (status) {
    case 'hot':
      return {
        label: 'Aquecido',
        color: 'bg-green-500',
        textColor: 'text-green-500',
        bgColor: 'bg-green-500/10',
        icon: ThermometerSun,
        emoji: '🟢'
      };
    case 'warm':
      return {
        label: 'Morno',
        color: 'bg-yellow-500',
        textColor: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
        icon: Thermometer,
        emoji: '🟡'
      };
    default:
      return {
        label: 'Frio',
        color: 'bg-red-500',
        textColor: 'text-red-500',
        bgColor: 'bg-red-500/10',
        icon: Flame,
        emoji: '🔴'
      };
  }
};

const getLevelInfo = (level: number) => {
  switch (level) {
    case 1:
      return { name: 'Nível 1 - Ativação Inicial', days: '1-5', progress: 25, dailyLimit: 2 };
    case 2:
      return { name: 'Nível 2 - Conversa Leve', days: '6-10', progress: 50, dailyLimit: 5 };
    case 3:
      return { name: 'Nível 3 - Interação Natural', days: '11-15', progress: 75, dailyLimit: 8 };
    case 4:
      return { name: 'Nível 4 - Pré-Comercial', days: '16-20', progress: 100, dailyLimit: 10 };
    default:
      return { name: 'Não iniciado', days: '-', progress: 0, dailyLimit: 2 };
  }
};

// Calculate estimated next message time based on interval (10-30 min)
const getNextMessageEstimate = (lastMessageAt: string | null): string => {
  if (!lastMessageAt) return 'Aguardando...';
  
  const lastMessage = new Date(lastMessageAt);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - lastMessage.getTime()) / (1000 * 60));
  
  // Average interval is 20 minutes (between 10-30)
  const avgInterval = 20;
  const remainingMinutes = Math.max(0, avgInterval - diffMinutes);
  
  if (remainingMinutes <= 0) {
    return 'Em breve...';
  }
  
  return `~${remainingMinutes} min`;
};

export function WarmingNumberCard({
  number,
  session,
  assignment,
  onStart,
  onPause,
  onViewDetails,
  onSelectSearch,
  onReconnect,
  onSkipWarming
}: WarmingNumberCardProps) {
  const warmingStatus = getWarmingStatusConfig(session?.warming_status);
  const levelInfo = getLevelInfo(session?.warming_level || 0);
  const WarmingIcon = warmingStatus.icon;

  const isActive = session?.status === 'active';
  const isPaused = session?.status === 'paused';
  const isCompleted = session?.status === 'completed';
  const hasError = session?.status === 'error';

  // Calculate overall progress (0-100)
  const overallProgress = session 
    ? Math.min(100, ((session.current_day - 1) / 20) * 100)
    : 0;

  const daysRemaining = session ? Math.max(0, 20 - session.current_day + 1) : 20;

  // Daily progress calculation
  const messagesSentToday = session?.messages_sent_today || 0;
  const dailyLimit = levelInfo.dailyLimit;
  const dailyProgress = Math.min(100, (messagesSentToday / dailyLimit) * 100);
  const nextMessageTime = getNextMessageEstimate(session?.last_message_at || null);

  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-foreground truncate">
                {number.name}
              </span>
              {number.is_connected ? (
                <Wifi className="w-4 h-4 text-green-500 shrink-0" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500 shrink-0" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {number.phone_number || number.instance_name || 'Aguardando detecção...'}
            </p>
          </div>

          {/* Status Badge */}
          <Badge 
            variant="outline" 
            className={cn(
              "shrink-0 border-0",
              warmingStatus.bgColor,
              warmingStatus.textColor
            )}
          >
            <WarmingIcon className="w-3 h-3 mr-1" />
            {warmingStatus.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Assigned Search Info - Only show if assigned, clicking allows changing */}
        {assignment && (
          <div 
            className="p-3 rounded-lg bg-primary/5 border border-primary/20 cursor-pointer hover:bg-primary/10 transition-colors"
            onClick={onSelectSearch}
            title="Clique para trocar a busca"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm min-w-0">
                <Search className="w-4 h-4 text-primary shrink-0" />
                <span className="font-medium text-foreground truncate">{assignment.search_query}</span>
              </div>
              <span className="text-xs text-muted-foreground shrink-0 ml-2">Trocar</span>
            </div>
            {assignment.search_city && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <MapPin className="w-3 h-3" />
                <span>{assignment.search_city}</span>
              </div>
            )}
          </div>
        )}

        {/* Level Info */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              {session ? levelInfo.name : 'Aguardando início'}
            </span>
          </div>
          <Progress value={overallProgress} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
            <span>Dia {session?.current_day || 0} de 20</span>
            <span>{daysRemaining} dias restantes</span>
          </div>
        </div>

        {/* Leads Used */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Leads utilizados</span>
          <span className="font-medium text-foreground">
            {session?.leads_used || 0} / {session?.leads_limit || 50}
          </span>
        </div>

        {/* Status Message */}
        {isCompleted && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <p className="text-sm text-green-500">
              ✓ Número pronto para campanhas
            </p>
          </div>
        )}

        {hasError && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">
              ⚠ Erro no aquecimento
            </p>
          </div>
        )}

        {/* Disconnection Warning - Show when paused due to disconnection */}
        {!number.is_connected && isPaused && session?.error_message?.includes('desconectado') && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <p className="text-sm font-medium text-amber-500">
                Número desconectado
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              O aquecimento foi pausado. Reconecte para continuar de onde parou.
            </p>
          </div>
        )}

        {/* Needs Leads Warning - Show when paused due to running out of leads */}
        {isPaused && session?.error_message?.includes('NEEDS_LEADS') && (
          <div 
            className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 cursor-pointer hover:bg-orange-500/20 transition-colors"
            onClick={onSelectSearch}
          >
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-4 h-4 text-orange-500" />
              <p className="text-sm font-medium text-orange-500">
                Leads esgotados
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {session.error_message.replace('NEEDS_LEADS:', '')}
            </p>
            <p className="text-xs text-orange-500 mt-2 font-medium">
              Clique aqui para selecionar novos leads →
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {!number.is_connected ? (
            onReconnect ? (
              <Button 
                variant="default" 
                className="flex-1 bg-amber-500 hover:bg-amber-600"
                onClick={onReconnect}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reconectar
              </Button>
            ) : (
              <Button 
                variant="outline" 
                className="flex-1" 
                disabled
              >
                Conecte o número
              </Button>
            )
          ) : isActive ? (
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={onPause}
            >
              <Pause className="w-4 h-4 mr-2" />
              Pausar
            </Button>
          ) : isCompleted ? (
            <Button 
              variant="outline" 
              className="flex-1" 
              disabled
            >
              <ThermometerSun className="w-4 h-4 mr-2" />
              Concluído
            </Button>
          ) : (
            <Button 
              className="flex-1 bg-primary hover:bg-primary/90" 
              onClick={onStart}
            >
              <Play className="w-4 h-4 mr-2" />
              {isPaused ? 'Retomar' : 'Iniciar'}
            </Button>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={onViewDetails}
                  className="relative"
                >
                  <Eye className="w-4 h-4" />
                  {isActive && session && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {isActive && session ? (
                  <div className="text-center">
                    <p className="font-medium">{messagesSentToday}/{dailyLimit} msgs hoje</p>
                    <p className="text-muted-foreground">Próximo: {nextMessageTime}</p>
                  </div>
                ) : (
                  <span>Ver detalhes</span>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
