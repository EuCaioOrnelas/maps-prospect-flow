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
  Sparkles
} from "lucide-react";
import type { Lead } from "@/pages/WhatsAppCampaign";
import type { WhatsAppNumber } from "@/hooks/useWhatsAppNumbers";
import type { MessageMode } from "./MessageTypeSelector";

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
  messageMode?: MessageMode;
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
  isStarting,
  messageMode = 'custom'
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
        <div className={`flex items-center justify-between p-4 rounded-lg border ${selectedNumber ? 'bg-muted/50 border-border' : 'bg-destructive/10 border-destructive/30'}`}>
          <div className="flex items-center gap-3">
            <Smartphone size={18} className={selectedNumber ? "text-primary" : "text-destructive"} />
            <span className="text-muted-foreground">Número WhatsApp</span>
          </div>
          <div className="text-right">
            {selectedNumber ? (
              <>
                <span className="font-medium">{selectedNumber.name}</span>
                {selectedNumber.phone_number && (
                  <p className="text-xs text-muted-foreground">{selectedNumber.phone_number}</p>
                )}
              </>
            ) : (
              <span className="font-medium text-destructive">⚠️ Nenhum número selecionado</span>
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

      {/* System Info */}
      <div className="mt-4 p-4 rounded-lg bg-muted/50 border flex items-start gap-3">
        <Shield size={18} className="text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="text-sm space-y-2">
          <p className="font-medium text-foreground">Proteções ativas</p>
          <ul className="text-muted-foreground space-y-1">
            <li>• <strong>Delay inteligente</strong> entre mensagens</li>
            {enableSmartPause && <li>• <strong>Pausa inteligente</strong> a cada {pauseAfterContacts} contatos</li>}
            <li>• Limite diário: <strong>200 mensagens</strong> por número</li>
            <li>• Detecção automática de bloqueios</li>
          </ul>
        </div>
      </div>

      {/* No Number Warning */}
      {!selectedNumber && (
        <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-center">
          <span className="text-destructive font-medium">⚠️ Selecione um número de envio nas Configurações antes de iniciar</span>
        </div>
      )}

      {/* Connection Warning */}
      {!isScheduled && !isConnected && selectedNumber && (
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
