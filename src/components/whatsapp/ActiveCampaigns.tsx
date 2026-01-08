import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Play,
  Pause,
  AlertTriangle,
  Clock,
  Users,
  MessageSquare,
  Shield,
  Zap,
  CalendarClock,
  RefreshCw,
  WifiOff,
  Timer,
  X,
  Trash2
} from "lucide-react";
import type { Campaign } from "@/pages/WhatsAppCampaign";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

interface ActiveCampaignsProps {
  campaigns: Campaign[];
  usedToday: number;
  dailyLimit: number;
  onResume: (campaign: Campaign) => void;
  onPause: (campaign: Campaign) => void;
  onCancel?: (campaign: Campaign) => void;
  onDelete?: (campaign: Campaign) => void;
}

export const ActiveCampaigns = ({ 
  campaigns, 
  usedToday, 
  dailyLimit, 
  onResume,
  onPause,
  onCancel,
  onDelete
}: ActiveCampaignsProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [retryingCampaignId, setRetryingCampaignId] = useState<string | null>(null);
  const [cancellingCampaignId, setCancellingCampaignId] = useState<string | null>(null);
  const [deletingCampaignId, setDeletingCampaignId] = useState<string | null>(null);
  const [showReconnectDialog, setShowReconnectDialog] = useState(false);
  const [disconnectedCampaign, setDisconnectedCampaign] = useState<Campaign | null>(null);

  const activeCampaigns = campaigns.filter(c => 
    c.status === 'running' || c.status === 'paused' || c.status === 'scheduled'
  );

  const pausedByLimit = activeCampaigns.filter(c => 
    c.status === 'paused' && (c as any).paused_at_limit
  );

  const scheduledCampaigns = activeCampaigns.filter(c => c.status === 'scheduled');
  const runningOrPausedCampaigns = activeCampaigns.filter(c => 
    c.status === 'running' || c.status === 'paused'
  );

  const remainingToday = dailyLimit - usedToday;
  const limitReached = remainingToday <= 0;

  // Calculate estimated time for a campaign
  const calculateEstimatedTime = (campaign: Campaign) => {
    const remaining = campaign.total_leads - campaign.sent_count - campaign.failed_count;
    if (remaining <= 0) return null;
    
    // Average delay (assuming 40-60 seconds range = ~50 seconds average)
    const avgDelaySeconds = campaign.delay_seconds + 10;
    const totalSeconds = remaining * avgDelaySeconds;
    
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `~${hours}h ${mins}min`;
    }
    return `~${mins}min`;
  };

  // Retry a failed/paused campaign
  const handleRetryCampaign = async (campaign: Campaign) => {
    setRetryingCampaignId(campaign.id);
    
    try {
      // Check if the number is connected
      const { data: numberData, error: numberError } = await supabase
        .from('whatsapp_numbers')
        .select('id, instance_name, is_connected')
        .eq('id', campaign.whatsapp_number_id)
        .single();

      if (numberError || !numberData) {
        toast({
          title: "Erro",
          description: "Número não encontrado. Configure um novo número.",
          variant: "destructive",
        });
        return;
      }

      if (!numberData.is_connected) {
        setDisconnectedCampaign(campaign);
        setShowReconnectDialog(true);
        return;
      }

      // Update campaign to running and trigger edge function
      const { error: updateError } = await supabase
        .from('whatsapp_campaigns')
        .update({ 
          status: 'running',
          started_at: new Date().toISOString(),
          pause_reason: null,
          paused_at_limit: false
        })
        .eq('id', campaign.id);

      if (updateError) throw updateError;

      // Parse leads and messages
      let leads = campaign.leads;
      let messages = campaign.messages;

      // Invoke the run campaign function
      const { error: runError } = await supabase.functions.invoke('evolution-run-campaign', {
        body: {
          campaignId: campaign.id,
          numberId: campaign.whatsapp_number_id,
          instanceName: numberData.instance_name,
          leads: leads,
          messages: messages,
          delaySecondsMin: campaign.delay_seconds,
          delaySecondsMax: campaign.delay_seconds + 20
        }
      });

      if (runError) {
        toast({
          title: "Erro ao iniciar",
          description: runError.message,
          variant: "destructive",
        });
        
        // Revert status
        await supabase
          .from('whatsapp_campaigns')
          .update({ status: 'paused', pause_reason: runError.message })
          .eq('id', campaign.id);
      } else {
        toast({
          title: "Campanha reiniciada!",
          description: "Os disparos foram retomados com sucesso.",
        });
      }
    } catch (error: any) {
      console.error('Error retrying campaign:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível reiniciar a campanha",
        variant: "destructive",
      });
    } finally {
      setRetryingCampaignId(null);
    }
  };

  // Cancel a scheduled campaign
  const handleCancelCampaign = async (campaign: Campaign) => {
    setCancellingCampaignId(campaign.id);
    try {
      await supabase
        .from('whatsapp_campaigns')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', campaign.id);
      
      toast({
        title: "Campanha cancelada",
        description: "A campanha agendada foi cancelada com sucesso.",
      });
      
      if (onCancel) onCancel(campaign);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível cancelar a campanha",
        variant: "destructive",
      });
    } finally {
      setCancellingCampaignId(null);
    }
  };

  // Delete a campaign completely
  const handleDeleteCampaign = async (campaign: Campaign) => {
    setDeletingCampaignId(campaign.id);
    try {
      // First, cancel the campaign if it's running
      if (campaign.status === 'running') {
        await supabase
          .from('whatsapp_campaigns')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', campaign.id);
        
        // Wait a bit to ensure the campaign stops
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Then delete
      await supabase
        .from('whatsapp_campaigns')
        .delete()
        .eq('id', campaign.id);
      
      toast({
        title: "Campanha excluída",
        description: "A campanha foi excluída com sucesso.",
      });
      
      if (onDelete) onDelete(campaign);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a campanha",
        variant: "destructive",
      });
    } finally {
      setDeletingCampaignId(null);
    }
  };

  const handleGoToReconnect = () => {
    setShowReconnectDialog(false);
    // Scroll to numbers manager or open it
    navigate('/whatsapp', { state: { openNumbersManager: true } });
  };

  if (activeCampaigns.length === 0 && !limitReached) return null;

  return (
    <div className="space-y-4 mb-8">
      {/* Anti-Ban Warning Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Shield size={20} className="text-amber-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-amber-600 dark:text-amber-400 mb-1">
              Proteção Anti-Ban Ativa
            </h3>
            <p className="text-sm text-muted-foreground">
              Limite de <strong>{dailyLimit} disparos por dia</strong> para evitar bloqueios do WhatsApp. 
              Campanhas são pausadas automaticamente ao atingir o limite e retomadas no próximo dia.
            </p>
          </div>
        </div>
      </div>

      {/* Daily Usage Indicator */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-primary" />
            <span className="font-medium">Disparos Hoje</span>
          </div>
          <span className={`font-bold ${limitReached ? 'text-destructive' : 'text-primary'}`}>
            {usedToday} / {dailyLimit}
          </span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all ${limitReached ? 'bg-destructive' : 'bg-primary'}`}
            style={{ width: `${Math.min((usedToday / dailyLimit) * 100, 100)}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {limitReached 
            ? "Limite atingido. Campanhas serão retomadas amanhã às 00:00"
            : `Restam ${remainingToday} disparos disponíveis hoje`
          }
        </p>
      </div>

      {/* Paused by Limit Warning */}
      {pausedByLimit.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-destructive mb-1">
                {pausedByLimit.length} campanha{pausedByLimit.length > 1 ? 's' : ''} pausada{pausedByLimit.length > 1 ? 's' : ''} por limite diário
              </h4>
              <p className="text-sm text-muted-foreground">
                Para sua segurança, estas campanhas foram pausadas automaticamente ao atingir 
                o limite de {dailyLimit} disparos. Elas serão retomadas automaticamente amanhã.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Scheduled Campaigns */}
      {scheduledCampaigns.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <CalendarClock size={16} className="text-blue-500" />
            Campanhas Agendadas ({scheduledCampaigns.length})
          </h3>
          
          {scheduledCampaigns.map((campaign) => {
            const estimatedTime = calculateEstimatedTime(campaign);
            const hasPauseReason = !!campaign.pause_reason;
            const needsReconnect = campaign.pause_reason?.includes('desconectado') || 
                                   campaign.pause_reason?.includes('WhatsApp');

            return (
              <div 
                key={campaign.id}
                className={`glass rounded-xl p-4 border-l-4 ${
                  hasPauseReason ? 'border-l-amber-500' : 'border-l-blue-500'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium truncate">{campaign.name}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        hasPauseReason 
                          ? 'bg-amber-500/20 text-amber-600' 
                          : 'bg-blue-500/20 text-blue-500'
                      }`}>
                        {hasPauseReason ? 'Atenção Necessária' : 'Agendada'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Users size={14} />
                        <span>{campaign.total_leads} leads</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare size={14} />
                        <span>{campaign.messages.length} variações</span>
                      </div>
                      {campaign.scheduled_at && (
                        <div className="flex items-center gap-1 text-blue-500">
                          <CalendarClock size={14} />
                          <span>
                            {format(new Date(campaign.scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      )}
                      {estimatedTime && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Timer size={14} />
                          <span>Duração: {estimatedTime}</span>
                        </div>
                      )}
                    </div>

                    {/* Pause reason / error message */}
                    {hasPauseReason && (
                      <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg">
                        {needsReconnect ? (
                          <WifiOff size={14} />
                        ) : (
                          <AlertTriangle size={14} />
                        )}
                        <span>{campaign.pause_reason}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0 flex items-center gap-2">
                    {/* Delete button */}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteCampaign(campaign)}
                      disabled={deletingCampaignId === campaign.id}
                      className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      {deletingCampaignId === campaign.id ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      Excluir
                    </Button>
                    {/* Cancel button for scheduled campaigns */}
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleCancelCampaign(campaign)}
                      disabled={cancellingCampaignId === campaign.id}
                      className="gap-1"
                    >
                      {cancellingCampaignId === campaign.id ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <X size={14} />
                      )}
                      Cancelar
                    </Button>
                    {hasPauseReason && (
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => handleRetryCampaign(campaign)}
                        disabled={retryingCampaignId === campaign.id}
                        className="gap-1"
                      >
                        {retryingCampaignId === campaign.id ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            Iniciando...
                          </>
                        ) : (
                          <>
                            <RefreshCw size={14} />
                            Tentar Novamente
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Running/Paused Campaigns */}
      {runningOrPausedCampaigns.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Play size={16} className="text-primary" />
            Em Andamento ({runningOrPausedCampaigns.length})
          </h3>
          
          {runningOrPausedCampaigns.map((campaign) => {
            const isPausedByLimit = campaign.status === 'paused' && campaign.paused_at_limit;
            const progress = campaign.total_leads > 0 
              ? Math.round((campaign.sent_count / campaign.total_leads) * 100) 
              : 0;
            const estimatedTime = calculateEstimatedTime(campaign);
            const hasPauseReason = !!campaign.pause_reason && !isPausedByLimit;

            return (
              <div 
                key={campaign.id}
                className={`glass rounded-xl p-4 border-l-4 ${
                  isPausedByLimit 
                    ? 'border-l-destructive' 
                    : campaign.status === 'running' 
                      ? 'border-l-primary' 
                      : 'border-l-yellow-500'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium truncate">{campaign.name}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        isPausedByLimit 
                          ? 'bg-destructive/20 text-destructive' 
                          : campaign.status === 'running' 
                            ? 'bg-primary/20 text-primary' 
                            : 'bg-yellow-500/20 text-yellow-500'
                      }`}>
                        {isPausedByLimit ? 'Limite Atingido' : 
                         campaign.status === 'running' ? 'Em Andamento' : 'Pausada'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Users size={14} />
                        <span>{campaign.sent_count}/{campaign.total_leads} leads</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare size={14} />
                        <span>{campaign.messages.length} variações</span>
                      </div>
                      {estimatedTime && campaign.status === 'running' && (
                        <div className="flex items-center gap-1 text-primary">
                          <Timer size={14} />
                          <span>Restante: {estimatedTime}</span>
                        </div>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${isPausedByLimit ? 'bg-destructive' : 'bg-primary'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {progress}% concluído
                    </p>

                    {/* Pause reason */}
                    {hasPauseReason && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg">
                        <AlertTriangle size={14} />
                        <span>{campaign.pause_reason}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0 flex flex-col gap-2">
                    {campaign.status === 'running' ? (
                      <>
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
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteCampaign(campaign)}
                          disabled={deletingCampaignId === campaign.id}
                          className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          {deletingCampaignId === campaign.id ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          Excluir
                        </Button>
                      </>
                    ) : !isPausedByLimit && (
                      <>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => onResume(campaign)}
                          className="gap-1"
                          disabled={limitReached}
                        >
                          <Play size={14} />
                          Retomar
                        </Button>
                        {hasPauseReason && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleRetryCampaign(campaign)}
                            disabled={retryingCampaignId === campaign.id}
                            className="gap-1"
                          >
                            {retryingCampaignId === campaign.id ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <RefreshCw size={14} />
                            )}
                            Reiniciar
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteCampaign(campaign)}
                          disabled={deletingCampaignId === campaign.id}
                          className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          {deletingCampaignId === campaign.id ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          Excluir
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {isPausedByLimit && (
                  <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock size={14} />
                    <span>Será retomada automaticamente amanhã às 00:00</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Estimated time summary for all campaigns */}
      {activeCampaigns.length > 0 && (
        <div className="glass rounded-xl p-4 bg-muted/30">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Timer size={16} className="text-primary" />
            <span>
              <strong className="text-foreground">Tempo médio por disparo:</strong> {activeCampaigns[0]?.delay_seconds || 40}-{(activeCampaigns[0]?.delay_seconds || 40) + 20}s
              {" • "}
              Campanhas são processadas automaticamente em segundo plano.
            </span>
          </div>
        </div>
      )}

      {/* Reconnect Dialog */}
      <Dialog open={showReconnectDialog} onOpenChange={setShowReconnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <WifiOff className="h-5 w-5 text-destructive" />
              WhatsApp Desconectado
            </DialogTitle>
            <DialogDescription>
              O número WhatsApp associado a esta campanha está desconectado. 
              Para iniciar os disparos, você precisa reconectar o número primeiro.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReconnectDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGoToReconnect}>
              Ir para Reconectar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
