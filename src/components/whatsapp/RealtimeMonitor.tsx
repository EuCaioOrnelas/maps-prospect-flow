import { useEffect, useState, useRef } from "react";
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
  Wifi,
  MessageCircle,
  AlertTriangle
} from "lucide-react";
import type { Campaign } from "@/pages/WhatsAppCampaign";
import type { WhatsAppNumber } from "@/hooks/useWhatsAppNumbers";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ProcessorHeartbeat } from "./ProcessorHeartbeat";
import { useToast } from "@/hooks/use-toast";

interface ExtendedCampaign extends Campaign {
  total_responses?: number;
}

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
  const { toast } = useToast();
  const previousCampaignStatesRef = useRef<Map<string, { status: string; pause_reason?: string }>>(new Map());

  // Update time every second for live countdowns
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Detect status changes and show notifications
  useEffect(() => {
    campaigns.forEach(campaign => {
      const prevState = previousCampaignStatesRef.current.get(campaign.id);
      const currentStatus = campaign.status;
      const currentPauseReason = campaign.pause_reason;

      // Check if status changed from running to paused
      if (prevState?.status === 'running' && currentStatus === 'paused') {
        if (currentPauseReason === 'incident_detected') {
          toast({
            title: "🚨 Incidente detectado",
            description: `"${campaign.name}" foi pausada por segurança. Verifique possíveis bloqueios.`,
            variant: "destructive",
            duration: 15000,
          });
        } else if (currentPauseReason === 'daily_limit') {
          toast({
            title: "📊 Limite diário atingido",
            description: `"${campaign.name}" atingiu o limite diário. Será retomada automaticamente amanhã.`,
            duration: 10000,
          });
        } else if (currentPauseReason === 'smart_pause') {
          toast({
            title: "⏸️ Pausa inteligente",
            description: `"${campaign.name}" está em pausa inteligente. Retomará automaticamente.`,
            duration: 8000,
          });
        }
      }

      // Update previous state
      previousCampaignStatesRef.current.set(campaign.id, {
        status: currentStatus,
        pause_reason: currentPauseReason,
      });
    });
  }, [campaigns, toast]);

  const runningCampaigns = campaigns.filter(c => c.status === 'running') as ExtendedCampaign[];
  const pausedCampaigns = campaigns.filter(c => c.status === 'paused') as ExtendedCampaign[];
  
  // Check for campaigns with incidents
  const campaignsWithIncident = pausedCampaigns.filter(c => c.pause_reason === 'incident_detected');

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

  const formatRunningTime = (startedAt: string | null) => {
    if (!startedAt) return '0s';
    
    const start = new Date(startedAt);
    const diffMs = now.getTime() - start.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    
    const hours = Math.floor(diffSecs / 3600);
    const mins = Math.floor((diffSecs % 3600) / 60);
    const secs = diffSecs % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
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
        <div className="flex items-center gap-4">
          <ProcessorHeartbeat />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Wifi size={14} className="text-green-500" />
            <span>Conectado</span>
          </div>
        </div>
      </div>

      {/* Alert for incidents */}
      {campaignsWithIncident.length > 0 && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
          <div className="flex items-center gap-2 text-destructive font-medium mb-1">
            <AlertTriangle className="h-4 w-4" />
            <span>🚨 Incidente detectado</span>
          </div>
          <p className="text-sm text-destructive/80">
            {campaignsWithIncident.length === 1 
              ? `A campanha "${campaignsWithIncident[0].name}" foi pausada por detecção de bloqueio ou denúncia. Recomendamos verificar o status do seu número WhatsApp.`
              : `${campaignsWithIncident.length} campanhas foram pausadas por incidentes detectados. Verifique o status dos seus números.`
            }
          </p>
        </div>
      )}

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
                  <div className="flex items-center gap-1">
                    <Clock size={14} className="text-primary" />
                    <span className="font-medium text-foreground">{formatRunningTime(campaign.started_at)}</span>
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
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <div className="flex items-center justify-center gap-1 text-green-500 mb-0.5">
                  <CheckCircle2 size={14} />
                  <span className="text-lg font-bold">{campaign.sent_count}</span>
                </div>
                <p className="text-xs text-muted-foreground">Enviadas</p>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <div className="flex items-center justify-center gap-1 text-blue-500 mb-0.5">
                  <MessageCircle size={14} />
                  <span className="text-lg font-bold">{campaign.total_responses || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground">Respostas</p>
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
        const isPausedManually = campaign.pause_reason === 'manual';
        const isPausedSmartPause = campaign.pause_reason === 'smart_pause';

        return (
          <div 
            key={campaign.id}
            className={`glass rounded-xl p-5 border-l-4 ${
              isPausedByLimit ? 'border-l-destructive' : 
              isPausedManually ? 'border-l-blue-500' : 'border-l-yellow-500'
            }`}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Pause size={16} className={
                    isPausedByLimit ? 'text-destructive' : 
                    isPausedManually ? 'text-blue-500' : 'text-yellow-500'
                  } />
                  <h3 className="font-medium truncate">{campaign.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    isPausedByLimit 
                      ? 'bg-destructive/20 text-destructive' 
                      : isPausedManually
                      ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                      : 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {isPausedByLimit ? 'Limite Diário' : 
                     isPausedManually ? 'Pausada Manualmente' :
                     isPausedSmartPause ? 'Pausa Inteligente' : 'Pausada'}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Smartphone size={14} />
                    <span>{getNumberName(campaign.whatsapp_number_id)}</span>
                  </div>
                  {campaign.resume_at && !isPausedManually && (
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
                  {isPausedManually && (
                    <>
                      <span>•</span>
                      <span className="text-blue-500">Aguardando você retomar</span>
                    </>
                  )}
                </div>
              </div>

              {/* Show resume button for manually paused campaigns (and non-limit paused) */}
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
                  <span className="text-blue-500">{campaign.total_responses || 0} respostas</span>
                  <span>•</span>
                  <span className="text-destructive">{campaign.failed_count} falhas</span>
                  <span>•</span>
                  <span>{campaign.total_leads - campaign.sent_count - campaign.failed_count} restantes</span>
                </div>
              </div>
            </div>

            {isPausedByLimit && campaign.pause_reason && (
              <div className="mt-3 pt-3 border-t border-border text-sm text-muted-foreground">
                <p>Será retomada automaticamente quando o limite diário resetar às 00:00.</p>
              </div>
            )}

            {isPausedManually && (
              <div className="mt-3 pt-3 border-t border-border text-sm text-blue-500">
                <p>Clique em "Retomar" para continuar os disparos de onde parou.</p>
              </div>
            )}

            {campaign.pause_reason === 'incident_detected' && (
              <div className="mt-3 pt-3 border-t border-border text-sm text-destructive">
                <p>Pausado por segurança: bloqueio ou denúncia detectado.</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
