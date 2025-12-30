import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Pause,
  Play,
  Square,
  MessageSquare,
  Smartphone,
  RefreshCw,
  Loader2,
  Wifi
} from "lucide-react";
import type { Campaign } from "@/pages/WhatsAppCampaign";
import type { WhatsAppNumber } from "@/hooks/useWhatsAppNumbers";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RealtimeMonitorProps {
  campaigns: Campaign[];
  numbers: WhatsAppNumber[];
  onPause: (campaign: Campaign) => void;
  onResume: (campaign: Campaign) => void;
  onStop: (campaign: Campaign) => void;
}

export const RealtimeMonitor = ({
  campaigns,
  numbers,
  onPause,
  onResume,
  onStop
}: RealtimeMonitorProps) => {
  const [now, setNow] = useState(new Date());

  // Update time every second for live countdowns
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const runningCampaigns = campaigns.filter(c => c.status === 'running');
  const pausedCampaigns = campaigns.filter(c => c.status === 'paused');

  if (runningCampaigns.length === 0 && pausedCampaigns.length === 0) {
    return null;
  }

  const getNumberName = (numberId: string | null | undefined) => {
    if (!numberId) return 'Número não definido';
    const number = numbers.find(n => n.id === numberId);
    return number?.name || number?.phone_number || 'Desconhecido';
  };

  const formatEstimatedTime = (campaign: Campaign) => {
    const remaining = campaign.total_leads - campaign.sent_count - campaign.failed_count;
    if (remaining <= 0) return 'Concluindo...';
    
    const totalSeconds = remaining * campaign.delay_seconds;
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `~${hours}h ${mins}min restante`;
    }
    return `~${mins}min restante`;
  };

  return (
    <div className="space-y-4 mb-8">
      {/* Real-time Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Activity size={20} className="text-primary" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
          <h2 className="font-semibold">Monitoramento em Tempo Real</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Wifi size={14} className="text-green-500" />
          <span>Conectado</span>
        </div>
      </div>

      {/* Running Campaigns */}
      {runningCampaigns.map((campaign) => {
        const progress = campaign.total_leads > 0 
          ? ((campaign.sent_count + campaign.failed_count) / campaign.total_leads) * 100 
          : 0;
        const isNearComplete = progress >= 90;

        return (
          <div 
            key={campaign.id}
            className="glass rounded-xl p-5 border-l-4 border-l-green-500 animate-in slide-in-from-top-2"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  <h3 className="font-medium truncate">{campaign.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-600 dark:text-green-400">
                    Enviando
                  </span>
                </div>
                
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Smartphone size={14} />
                    <span>{getNumberName(campaign.whatsapp_number_id)}</span>
                  </div>
                  <span>•</span>
                  <span>{formatEstimatedTime(campaign)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onPause(campaign)}
                  className="gap-1"
                >
                  <Pause size={14} />
                  Pausar
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => onStop(campaign)}
                  className="gap-1"
                >
                  <Square size={14} />
                  Parar
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2 mb-4">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{Math.round(progress)}% concluído</span>
                <span>
                  {campaign.sent_count + campaign.failed_count} / {campaign.total_leads} leads
                </span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <div className="flex items-center justify-center gap-1 text-green-500 mb-0.5">
                  <CheckCircle2 size={14} />
                  <span className="text-lg font-bold">{campaign.sent_count}</span>
                </div>
                <p className="text-xs text-muted-foreground">Enviadas</p>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <div className="flex items-center justify-center gap-1 text-destructive mb-0.5">
                  <XCircle size={14} />
                  <span className="text-lg font-bold">{campaign.failed_count}</span>
                </div>
                <p className="text-xs text-muted-foreground">Falhas</p>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                  <Clock size={14} />
                  <span className="text-lg font-bold">
                    {campaign.total_leads - campaign.sent_count - campaign.failed_count}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>

            {/* Message Variations Info */}
            <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare size={14} />
              <span>Usando {campaign.messages.length} variações de mensagem</span>
              {campaign.enable_smart_pause && (
                <>
                  <span>•</span>
                  <span>Pausa inteligente a cada {campaign.pause_after_contacts} contatos</span>
                </>
              )}
            </div>
          </div>
        );
      })}

      {/* Paused Campaigns */}
      {pausedCampaigns.map((campaign) => {
        const progress = campaign.total_leads > 0 
          ? ((campaign.sent_count + campaign.failed_count) / campaign.total_leads) * 100 
          : 0;
        const isPausedByLimit = campaign.paused_at_limit;

        return (
          <div 
            key={campaign.id}
            className={`glass rounded-xl p-5 border-l-4 ${
              isPausedByLimit ? 'border-l-destructive' : 'border-l-yellow-500'
            }`}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Pause size={16} className={isPausedByLimit ? 'text-destructive' : 'text-yellow-500'} />
                  <h3 className="font-medium truncate">{campaign.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    isPausedByLimit 
                      ? 'bg-destructive/20 text-destructive' 
                      : 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {isPausedByLimit ? 'Limite Diário' : 'Pausada'}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Smartphone size={14} />
                    <span>{getNumberName(campaign.whatsapp_number_id)}</span>
                  </div>
                  {campaign.resume_at && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>
                          Retoma em {format(new Date(campaign.resume_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {!isPausedByLimit && (
                <div className="flex items-center gap-2">
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => onResume(campaign)}
                    className="gap-1"
                  >
                    <Play size={14} />
                    Retomar
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => onStop(campaign)}
                    className="gap-1"
                  >
                    <Square size={14} />
                    Parar
                  </Button>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{Math.round(progress)}% concluído</span>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">{campaign.sent_count} enviadas</span>
                  <span>•</span>
                  <span className="text-destructive">{campaign.failed_count} falhas</span>
                </div>
              </div>
            </div>

            {isPausedByLimit && campaign.pause_reason && (
              <div className="mt-3 pt-3 border-t border-border text-sm text-muted-foreground">
                <p>Será retomada automaticamente quando o limite diário resetar.</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
