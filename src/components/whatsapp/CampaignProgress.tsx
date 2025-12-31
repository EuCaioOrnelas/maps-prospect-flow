import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Send, 
  Pause, 
  Play, 
  Square,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  RefreshCw,
  Coffee
} from "lucide-react";
import type { CampaignState } from "@/pages/WhatsAppCampaign";

interface CampaignProgressProps {
  campaignState: CampaignState;
  totalLeads: number;
  messages: string[];
  delaySecondsMin: number;
  delaySecondsMax: number;
  pauseAfterContacts: number;
  pauseMinutes: number;
  enableSmartPause: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onNewCampaign: () => void;
  onUpdateStats?: (sent: number, failed: number) => void;
}

export const CampaignProgress = ({
  campaignState,
  totalLeads,
  messages,
  delaySecondsMin,
  delaySecondsMax,
  pauseAfterContacts,
  pauseMinutes,
  enableSmartPause,
  onPause,
  onResume,
  onStop,
  onNewCampaign,
  onUpdateStats
}: CampaignProgressProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sent, setSent] = useState(0);
  const [failed, setFailed] = useState(0);
  const [isSmartPausing, setIsSmartPausing] = useState(false);
  const [smartPauseCountdown, setSmartPauseCountdown] = useState(0);
  const [currentDelay, setCurrentDelay] = useState(delaySecondsMin);
  const [nextMessageCountdown, setNextMessageCountdown] = useState(delaySecondsMin);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(campaignState.status === 'running');

  // Generate random delay between min and max
  const getRandomDelay = () => {
    return Math.floor(Math.random() * (delaySecondsMax - delaySecondsMin + 1)) + delaySecondsMin;
  };

  // Simulate message sending
  useEffect(() => {
    if (campaignState.status !== 'running' || isSmartPausing) return;

    const interval = setInterval(() => {
      setNextMessageCountdown(prev => {
        if (prev <= 1) {
          // Send message
          if (currentIndex < totalLeads) {
            const success = Math.random() > 0.05; // 95% success rate
            if (success) {
              setSent(s => {
                const newSent = s + 1;
                onUpdateStats?.(newSent, failed);
                return newSent;
              });
            } else {
              setFailed(f => {
                const newFailed = f + 1;
                onUpdateStats?.(sent, newFailed);
                return newFailed;
              });
            }
            setCurrentIndex(i => i + 1);
            setCurrentMessageIndex(Math.floor(Math.random() * 5)); // Random message variation

            // Check for smart pause
            if (enableSmartPause && (currentIndex + 1) % pauseAfterContacts === 0 && currentIndex + 1 < totalLeads) {
              setIsSmartPausing(true);
              setSmartPauseCountdown(pauseMinutes * 60);
            }
          }
          // Get new random delay for next message
          const newDelay = getRandomDelay();
          setCurrentDelay(newDelay);
          return newDelay;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [campaignState.status, currentIndex, totalLeads, delaySecondsMin, delaySecondsMax, enableSmartPause, pauseAfterContacts, pauseMinutes, isSmartPausing]);

  // Smart pause countdown
  useEffect(() => {
    if (!isSmartPausing) return;

    const interval = setInterval(() => {
      setSmartPauseCountdown(prev => {
        if (prev <= 1) {
          setIsSmartPausing(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSmartPausing]);

  // Update running state based on campaign status
  useEffect(() => {
    setIsRunning(campaignState.status === 'running');
  }, [campaignState.status]);

  const progress = totalLeads > 0 ? ((sent + failed) / totalLeads) * 100 : 0;
  const isCompleted = currentIndex >= totalLeads || campaignState.status === 'completed';

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const estimatedTimeRemaining = () => {
    const remaining = totalLeads - currentIndex;
    const pauseCount = enableSmartPause ? Math.floor(remaining / pauseAfterContacts) : 0;
    // Use average delay for estimation
    const avgDelay = (delaySecondsMin + delaySecondsMax) / 2;
    const totalSeconds = remaining * avgDelay + pauseCount * pauseMinutes * 60;
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `~${hours}h ${mins}min`;
    }
    return `~${mins}min`;
  };

  return (
    <div className="glass rounded-2xl p-6">
      <div className="text-center mb-6">
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 ${
          isCompleted ? 'bg-primary/10' : isSmartPausing ? 'bg-warning/10' : 'bg-primary/10 animate-pulse'
        }`}>
          {isCompleted ? (
            <CheckCircle2 size={24} className="text-primary" />
          ) : isSmartPausing ? (
            <Coffee size={24} className="text-warning" />
          ) : (
            <Send size={24} className="text-primary" />
          )}
        </div>
        <h2 className="text-2xl font-bold mb-2">
          {isCompleted ? 'Campanha Finalizada!' : 
           isSmartPausing ? 'Pausa Inteligente' : 
           campaignState.status === 'paused' ? 'Campanha Pausada' : 
           'Enviando Mensagens...'}
        </h2>
        <p className="text-muted-foreground">
          {isCompleted ? `${sent} mensagens enviadas com sucesso` :
           isSmartPausing ? `Retomando em ${formatTime(smartPauseCountdown)}` :
           campaignState.status === 'paused' ? 'Clique em continuar para retomar' :
           `Progresso: ${currentIndex} de ${totalLeads}`}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2 mb-6">
        <Progress value={progress} className="h-3" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{Math.round(progress)}% concluído</span>
          {!isCompleted && <span>{estimatedTimeRemaining()} restante</span>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-muted/30 text-center">
          <div className="flex items-center justify-center gap-2 text-primary mb-1">
            <CheckCircle2 size={16} />
            <span className="text-2xl font-bold">{sent}</span>
          </div>
          <p className="text-xs text-muted-foreground">Enviadas</p>
        </div>
        
        <div className="p-4 rounded-lg bg-muted/30 text-center">
          <div className="flex items-center justify-center gap-2 text-destructive mb-1">
            <XCircle size={16} />
            <span className="text-2xl font-bold">{failed}</span>
          </div>
          <p className="text-xs text-muted-foreground">Falhas</p>
        </div>
        
        <div className="p-4 rounded-lg bg-muted/30 text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
            <Clock size={16} />
            <span className="text-2xl font-bold">{totalLeads - currentIndex}</span>
          </div>
          <p className="text-xs text-muted-foreground">Pendentes</p>
        </div>
      </div>

      {/* Current Status */}
      {!isCompleted && (
        <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border mb-6">
          {isSmartPausing ? (
            <div className="flex items-center gap-3">
              <Coffee size={18} className="text-warning" />
              <div className="flex-1">
                <p className="text-sm font-medium">Pausa inteligente ativa</p>
                <p className="text-xs text-muted-foreground">
                  Retomando automaticamente em {formatTime(smartPauseCountdown)}
                </p>
              </div>
            </div>
          ) : campaignState.status === 'running' ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={14} className="text-muted-foreground" />
                  <span>Próxima mensagem em:</span>
                </div>
                <span className="font-mono text-primary font-medium">{formatTime(nextMessageCountdown)}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <MessageSquare size={14} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Variação atual:</span>
                  <span className="font-medium">Mensagem {currentMessageIndex + 1}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Delay: {currentDelay}s
                </span>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {isCompleted ? (
          <Button onClick={onNewCampaign} className="flex-1 gap-2">
            <RefreshCw size={16} />
            Nova Campanha
          </Button>
        ) : (
          <>
            {campaignState.status === 'paused' || isSmartPausing ? (
              <Button onClick={onResume} className="flex-1 gap-2" disabled={isSmartPausing}>
                <Play size={16} />
                Continuar
              </Button>
            ) : (
              <Button onClick={onPause} variant="secondary" className="flex-1 gap-2">
                <Pause size={16} />
                Pausar
              </Button>
            )}
            
            <Button onClick={onStop} variant="destructive" className="gap-2">
              <Square size={16} />
              Encerrar
            </Button>
          </>
        )}
      </div>

      {/* Message Preview */}
      {!isCompleted && campaignState.status === 'running' && (
        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground mb-2">Prévia da mensagem atual:</p>
          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <p className="line-clamp-3">{messages[currentMessageIndex] || 'Mensagem não definida'}</p>
          </div>
        </div>
      )}
    </div>
  );
};
