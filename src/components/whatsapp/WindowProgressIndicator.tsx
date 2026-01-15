import { Clock, CheckCircle2, Pause, MessageSquare, AlertTriangle, Shield } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { SENDING_WINDOWS, getWindowLimit, getAccumulatedLimit } from "./WindowSystemModal";

interface WindowProgressIndicatorProps {
  currentWindow: number;
  windowSentCount: number;
  totalSent: number;
  totalResponses: number;
  status: 'running' | 'paused' | 'waiting_response' | 'completed';
  pauseReason?: string;
}

export const WindowProgressIndicator = ({
  currentWindow,
  windowSentCount,
  totalSent,
  totalResponses,
  status,
  pauseReason,
}: WindowProgressIndicatorProps) => {
  const windowLimit = getWindowLimit(currentWindow);
  const windowProgress = windowLimit > 0 ? (windowSentCount / windowLimit) * 100 : 0;
  const accumulatedLimit = getAccumulatedLimit(4); // 200

  const getStatusInfo = () => {
    switch (status) {
      case 'running':
        return {
          icon: MessageSquare,
          text: "Enviando mensagens...",
          color: "text-primary",
          bgColor: "bg-primary/10",
        };
      case 'waiting_response':
        return {
          icon: Clock,
          text: "Aguardando resposta para liberar próxima janela",
          color: "text-amber-500",
          bgColor: "bg-amber-500/10",
        };
      case 'paused':
        if (pauseReason === 'no_response') {
          return {
            icon: AlertTriangle,
            text: "Envio pausado - Sem respostas nos primeiros 10 disparos",
            color: "text-destructive",
            bgColor: "bg-destructive/10",
          };
        }
        if (pauseReason === 'block_detected' || pauseReason === 'report_detected') {
          return {
            icon: AlertTriangle,
            text: "Envio pausado para proteção do número",
            color: "text-destructive",
            bgColor: "bg-destructive/10",
          };
        }
        return {
          icon: Pause,
          text: "Campanha pausada",
          color: "text-muted-foreground",
          bgColor: "bg-muted",
        };
      case 'completed':
        return {
          icon: CheckCircle2,
          text: "Campanha concluída",
          color: "text-green-500",
          bgColor: "bg-green-500/10",
        };
      default:
        return {
          icon: Clock,
          text: "Preparando...",
          color: "text-muted-foreground",
          bgColor: "bg-muted",
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-4 p-4 rounded-xl border bg-card">
      {/* Header com status */}
      <div className={`flex items-center gap-3 p-3 rounded-lg ${statusInfo.bgColor}`}>
        <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
        <span className={`text-sm font-medium ${statusInfo.color}`}>
          {statusInfo.text}
        </span>
      </div>

      {/* Indicador de janela atual */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">
              Janela atual: {currentWindow} de 4
            </span>
          </div>
          <Badge variant="secondary" className="font-mono">
            {windowSentCount} / {windowLimit}
          </Badge>
        </div>

        <Progress value={windowProgress} className="h-2" />

        <p className="text-xs text-muted-foreground">
          Mensagens enviadas nesta janela: <strong>{windowSentCount}</strong> de <strong>{windowLimit}</strong>
        </p>
      </div>

      {/* Janelas visuais */}
      <div className="grid grid-cols-4 gap-2">
        {SENDING_WINDOWS.map((window) => {
          const isCurrentWindow = window.window === currentWindow;
          const isCompletedWindow = window.window < currentWindow;
          const isFutureWindow = window.window > currentWindow;

          let bgClass = "bg-muted text-muted-foreground";
          if (isCompletedWindow) {
            bgClass = "bg-green-500/20 text-green-600 border-green-500/30";
          } else if (isCurrentWindow) {
            bgClass = "bg-primary/20 text-primary border-primary/30";
          }

          return (
            <div
              key={window.window}
              className={`flex flex-col items-center p-2 rounded-lg border ${bgClass} transition-all`}
            >
              <span className="text-xs font-medium">J{window.window}</span>
              <span className="text-xs font-bold">{window.limit}</span>
              {isCompletedWindow && <CheckCircle2 className="h-3 w-3 mt-1" />}
              {isCurrentWindow && <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1 animate-pulse" />}
            </div>
          );
        })}
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-3 gap-3 pt-2 border-t">
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{totalSent}</p>
          <p className="text-xs text-muted-foreground">Enviadas</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-green-500">{totalResponses}</p>
          <p className="text-xs text-muted-foreground">Respostas</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-muted-foreground">{accumulatedLimit - totalSent}</p>
          <p className="text-xs text-muted-foreground">Restantes</p>
        </div>
      </div>

      {/* Feedback quando aguardando resposta */}
      {status === 'waiting_response' && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <p className="text-xs text-amber-600 dark:text-amber-400">
            💡 A próxima janela será liberada assim que um contato responder sua mensagem.
          </p>
        </div>
      )}
    </div>
  );
};
