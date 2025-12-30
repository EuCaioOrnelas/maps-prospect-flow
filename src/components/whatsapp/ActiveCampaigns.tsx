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
  CalendarClock
} from "lucide-react";
import type { Campaign } from "@/pages/WhatsAppCampaign";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ActiveCampaignsProps {
  campaigns: Campaign[];
  usedToday: number;
  dailyLimit: number;
  onResume: (campaign: Campaign) => void;
  onPause: (campaign: Campaign) => void;
}

export const ActiveCampaigns = ({ 
  campaigns, 
  usedToday, 
  dailyLimit, 
  onResume,
  onPause
}: ActiveCampaignsProps) => {
  const activeCampaigns = campaigns.filter(c => 
    c.status === 'running' || c.status === 'paused' || c.status === 'scheduled'
  );

  const pausedByLimit = activeCampaigns.filter(c => 
    c.status === 'paused' && (c as any).paused_at_limit
  );

  const remainingToday = dailyLimit - usedToday;
  const limitReached = remainingToday <= 0;

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

      {/* Active Campaigns List */}
      {activeCampaigns.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Play size={16} className="text-primary" />
            Campanhas Ativas ({activeCampaigns.length})
          </h3>
          
          {activeCampaigns.map((campaign) => {
            const isPausedByLimit = campaign.status === 'paused' && (campaign as any).paused_at_limit;
            const isScheduled = campaign.status === 'scheduled';
            const progress = campaign.total_leads > 0 
              ? Math.round((campaign.sent_count / campaign.total_leads) * 100) 
              : 0;

            return (
              <div 
                key={campaign.id}
                className={`glass rounded-xl p-4 border-l-4 ${
                  isPausedByLimit 
                    ? 'border-l-destructive' 
                    : isScheduled 
                      ? 'border-l-blue-500' 
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
                          : isScheduled
                            ? 'bg-blue-500/20 text-blue-500'
                            : campaign.status === 'running' 
                              ? 'bg-primary/20 text-primary' 
                              : 'bg-yellow-500/20 text-yellow-500'
                      }`}>
                        {isPausedByLimit ? 'Limite Atingido' : 
                         isScheduled ? 'Agendada' :
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
                      {isScheduled && (campaign as any).scheduled_at && (
                        <div className="flex items-center gap-1 text-blue-500">
                          <CalendarClock size={14} />
                          <span>
                            {format(new Date((campaign as any).scheduled_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </span>
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
                  </div>

                  {!isScheduled && (
                    <div className="flex-shrink-0">
                      {campaign.status === 'running' ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onPause(campaign)}
                          className="gap-1"
                        >
                          <Pause size={14} />
                          Pausar
                        </Button>
                      ) : !isPausedByLimit && (
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
                      )}
                    </div>
                  )}
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
    </div>
  );
};
