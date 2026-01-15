import { Button } from "@/components/ui/button";
import { 
  FileText, 
  ArrowLeft, 
  Send,
  CalendarClock,
  Users,
  MessageSquare,
  Clock,
  Pause,
  Smartphone,
  Shuffle,
  Shield,
  Layers
} from "lucide-react";
import type { Lead } from "@/pages/WhatsAppCampaign";
import type { WhatsAppNumber } from "@/hooks/useWhatsAppNumbers";
import { SENDING_WINDOWS } from "./WindowSystemModal";

interface CampaignSummaryProps {
  campaignName: string;
  selectedLeads: Lead[];
  messages: string[];
  delaySecondsMin: number;
  delaySecondsMax: number;
  pauseAfterContacts: number;
  pauseMinutes: number;
  enableSmartPause: boolean;
  isScheduled: boolean;
  scheduledDate: Date | undefined;
  scheduledTime: string;
  selectedNumber: WhatsAppNumber | undefined;
  isConnected: boolean;
  onBack: () => void;
  onStartCampaign: () => void;
  canStart: boolean;
  isStarting: boolean;
}

export const CampaignSummary = ({
  campaignName,
  selectedLeads,
  messages,
  delaySecondsMin,
  delaySecondsMax,
  pauseAfterContacts,
  pauseMinutes,
  enableSmartPause,
  isScheduled,
  scheduledDate,
  scheduledTime,
  selectedNumber,
  isConnected,
  onBack,
  onStartCampaign,
  canStart,
  isStarting
}: CampaignSummaryProps) => {
  
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  const formatScheduledDate = () => {
    if (!scheduledDate || !scheduledTime) return '';
    const date = new Date(scheduledDate);
    return `${date.toLocaleDateString('pt-BR')} às ${scheduledTime}`;
  };

  const estimatedDuration = () => {
    const totalMessages = selectedLeads.length;
    const pauseCount = enableSmartPause ? Math.floor(totalMessages / pauseAfterContacts) : 0;
    // Use average delay for estimation
    const avgDelay = (delaySecondsMin + delaySecondsMax) / 2;
    const messagingTime = totalMessages * avgDelay;
    const pauseTime = pauseCount * pauseMinutes * 60;
    const totalSeconds = messagingTime + pauseTime;
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `~${hours}h ${minutes}min`;
    }
    return `~${minutes} minutos`;
  };

  const filledMessages = messages.filter(m => m.trim()).length;

  // Check if messages use name variable
  const usesNameVariable = messages.some(m => m.includes('{nome}'));

  // Calculate which windows will be used
  const getWindowsUsed = () => {
    const leadCount = selectedLeads.length;
    let remaining = leadCount;
    const windows: { window: number; count: number }[] = [];
    
    for (let i = 0; i < SENDING_WINDOWS.length && remaining > 0; i++) {
      const windowLimit = SENDING_WINDOWS[i].limit;
      const toSend = Math.min(windowLimit, remaining);
      windows.push({ window: i + 1, count: toSend });
      remaining -= toSend;
    }
    
    return windows;
  };

  const windowsUsed = getWindowsUsed();

  return (
    <div className="glass rounded-2xl p-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <FileText size={24} className="text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Resumo da Campanha</h2>
        <p className="text-muted-foreground">
          Confirme os detalhes antes de iniciar
        </p>
      </div>

      <div className="space-y-4">
        {/* Campaign Name */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-3">
            <FileText size={18} className="text-primary" />
            <span className="text-muted-foreground">Nome da campanha</span>
          </div>
          <span className="font-medium">
            {campaignName || `Campanha ${new Date().toLocaleDateString('pt-BR')}`}
          </span>
        </div>

        {/* Selected Number */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-3">
            <Smartphone size={18} className="text-primary" />
            <span className="text-muted-foreground">Número WhatsApp</span>
          </div>
          <div className="text-right">
            <span className="font-medium">{selectedNumber?.name || 'Não selecionado'}</span>
            {selectedNumber?.phone_number && (
              <p className="text-xs text-muted-foreground">{selectedNumber.phone_number}</p>
            )}
          </div>
        </div>

        {/* Leads Count */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-3">
            <Users size={18} className="text-primary" />
            <span className="text-muted-foreground">Total de contatos</span>
          </div>
          <span className="font-medium text-lg">{selectedLeads.length}</span>
        </div>

        {/* Window System Info */}
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-3">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-amber-600" />
            <span className="font-medium text-amber-600">Sistema de Janelas Ativo</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {SENDING_WINDOWS.map((windowItem, idx) => {
              const windowInfo = windowsUsed.find(w => w.window === idx + 1);
              const isActive = !!windowInfo;
              return (
                <div 
                  key={idx}
                  className={`text-center p-2 rounded-lg text-xs ${
                    isActive 
                      ? 'bg-amber-500/20 border border-amber-500/30' 
                      : 'bg-muted/30 border border-border opacity-50'
                  }`}
                >
                  <div className={`font-semibold ${isActive ? 'text-amber-600' : 'text-muted-foreground'}`}>
                    Janela {idx + 1}
                  </div>
                  <div className={isActive ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}>
                    {windowInfo ? `${windowInfo.count}/${windowItem.limit}` : `0/${windowItem.limit}`}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Cada janela só é liberada após receber resposta. Sem resposta = pausa automática.
          </p>
        </div>

        {/* Messages */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-3">
            <MessageSquare size={18} className="text-primary" />
            <span className="text-muted-foreground">Variações de mensagem</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{filledMessages}/5</span>
            {usesNameVariable && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                usa {'{nome}'}
              </span>
            )}
          </div>
        </div>

        {/* Smart Delay */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-3">
            <Shuffle size={18} className="text-primary" />
            <span className="text-muted-foreground">Delay inteligente</span>
          </div>
          <span className="font-medium text-primary">
            {formatTime(delaySecondsMin)} a {formatTime(delaySecondsMax)}
          </span>
        </div>

        {/* Smart Pause */}
        {enableSmartPause && (
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-3">
              <Pause size={18} className="text-primary" />
              <span className="text-muted-foreground">Pausa inteligente</span>
            </div>
            <span className="font-medium">
              A cada {pauseAfterContacts} contatos, pausa {pauseMinutes}min
            </span>
          </div>
        )}

        {/* Schedule */}
        {isScheduled && scheduledDate && (
          <div className="flex items-center justify-between p-4 rounded-lg bg-info/10 border border-info/20">
            <div className="flex items-center gap-3">
              <CalendarClock size={18} className="text-info" />
              <span className="text-muted-foreground">Agendado para</span>
            </div>
            <span className="font-medium text-info">{formatScheduledDate()}</span>
          </div>
        )}

        {/* Estimated Duration */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-3">
            <Clock size={18} className="text-primary" />
            <span className="text-foreground font-medium">Duração estimada</span>
          </div>
          <span className="font-bold text-primary text-lg">{estimatedDuration()}</span>
        </div>
      </div>

      {/* Anti-Block Protection Info */}
      <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start gap-3">
        <Shield size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-green-600">Proteção anti-bloqueio ativa</p>
          <p className="text-muted-foreground">
            Envio por janelas + pausa automática + limite de 200/dia para proteger seu número.
          </p>
        </div>
      </div>

      {/* Connection Warning */}
      {!isScheduled && !isConnected && (
        <div className="mt-4 p-4 rounded-lg bg-warning/10 border border-warning/20 text-sm text-center">
          <span className="text-warning">⚠️ Conecte seu WhatsApp para iniciar a campanha</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between mt-6 pt-6 border-t border-border">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft size={16} />
          Voltar
        </Button>
        <Button 
          onClick={onStartCampaign} 
          disabled={!canStart || isStarting} 
          className="gap-2"
        >
          {isStarting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
              Iniciando...
            </>
          ) : isScheduled ? (
            <>
              <CalendarClock size={16} />
              Agendar Campanha
            </>
          ) : (
            <>
              <Send size={16} />
              Iniciar Disparos
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
