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
  ThermometerSun
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WarmingSession {
  id: string;
  status: 'idle' | 'active' | 'paused' | 'completed' | 'error';
  warming_level: number;
  warming_status: 'cold' | 'warm' | 'hot';
  leads_used: number;
  leads_limit: number;
  current_day: number;
}

interface WarmingNumberCardProps {
  number: {
    id: string;
    name: string;
    phone_number: string | null;
    is_connected: boolean;
  };
  session?: WarmingSession;
  onStart: () => void;
  onPause: () => void;
  onViewDetails: () => void;
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
      return { name: 'Nível 1 - Ativação Inicial', days: '1-5', progress: 25 };
    case 2:
      return { name: 'Nível 2 - Conversa Leve', days: '6-10', progress: 50 };
    case 3:
      return { name: 'Nível 3 - Interação Natural', days: '11-15', progress: 75 };
    case 4:
      return { name: 'Nível 4 - Pré-Comercial', days: '16-20', progress: 100 };
    default:
      return { name: 'Não iniciado', days: '-', progress: 0 };
  }
};

export function WarmingNumberCard({
  number,
  session,
  onStart,
  onPause,
  onViewDetails
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
              {number.phone_number || 'Número não identificado'}
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

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {!number.is_connected ? (
            <Button 
              variant="outline" 
              className="flex-1" 
              disabled
            >
              Conecte o número
            </Button>
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

          <Button 
            variant="ghost" 
            size="icon"
            onClick={onViewDetails}
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
