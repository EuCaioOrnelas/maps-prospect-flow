import { Button } from "@/components/ui/button";
import { 
  History, 
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  MessageSquare,
  Users,
  Loader2,
  Pause,
  Play
} from "lucide-react";
import type { Campaign } from "@/pages/WhatsAppCampaign";

interface CampaignHistoryProps {
  campaigns: Campaign[];
  loading: boolean;
  onDelete: (id: string) => void;
  onNewCampaign: () => void;
}

export const CampaignHistory = ({ campaigns, loading, onDelete, onNewCampaign }: CampaignHistoryProps) => {
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { label: 'Concluída', icon: CheckCircle2, color: 'text-primary' };
      case 'running':
        return { label: 'Em andamento', icon: Play, color: 'text-info' };
      case 'paused':
        return { label: 'Pausada', icon: Pause, color: 'text-warning' };
      case 'failed':
        return { label: 'Falhou', icon: XCircle, color: 'text-destructive' };
      default:
        return { label: 'Pendente', icon: Clock, color: 'text-muted-foreground' };
    }
  };

  const calculateSuccessRate = (sent: number, failed: number) => {
    const total = sent + failed;
    if (total === 0) return 0;
    return Math.round((sent / total) * 100);
  };

  if (loading) {
    return (
      <div className="glass rounded-2xl p-12 flex flex-col items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Carregando histórico...</p>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <History size={32} className="text-muted-foreground" />
        </div>
        <h3 className="text-xl font-bold mb-2">Nenhuma campanha ainda</h3>
        <p className="text-muted-foreground mb-6">
          Crie sua primeira campanha de disparos
        </p>
        <Button onClick={onNewCampaign} className="gap-2">
          <Plus size={16} />
          Nova Campanha
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{campaigns.length}</p>
          <p className="text-sm text-muted-foreground">Campanhas</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">
            {campaigns.reduce((acc, c) => acc + c.sent_count, 0)}
          </p>
          <p className="text-sm text-muted-foreground">Mensagens enviadas</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">
            {campaigns.reduce((acc, c) => acc + c.total_leads, 0)}
          </p>
          <p className="text-sm text-muted-foreground">Leads prospectados</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">
            {calculateSuccessRate(
              campaigns.reduce((acc, c) => acc + c.sent_count, 0),
              campaigns.reduce((acc, c) => acc + c.failed_count, 0)
            )}%
          </p>
          <p className="text-sm text-muted-foreground">Taxa de sucesso</p>
        </div>
      </div>

      {/* Campaign List */}
      <div className="space-y-3">
        {campaigns.map((campaign) => {
          const statusInfo = getStatusInfo(campaign.status);
          const successRate = calculateSuccessRate(campaign.sent_count, campaign.failed_count);
          
          return (
            <div
              key={campaign.id}
              className="glass rounded-xl p-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium truncate">{campaign.name}</h3>
                    <div className={`flex items-center gap-1 text-xs ${statusInfo.color}`}>
                      <statusInfo.icon size={12} />
                      <span>{statusInfo.label}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users size={14} />
                      <span>{campaign.total_leads} leads</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare size={14} />
                      <span>{campaign.messages.length} variações</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>{formatDate(campaign.created_at)}</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(campaign.id)}
                  className="text-muted-foreground hover:text-destructive flex-shrink-0"
                >
                  <Trash2 size={16} />
                </Button>
              </div>

              {/* Stats Bar */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 size={14} className="text-primary" />
                      <span className="text-foreground font-medium">{campaign.sent_count}</span>
                      <span className="text-muted-foreground">enviadas</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <XCircle size={14} className="text-destructive" />
                      <span className="text-foreground font-medium">{campaign.failed_count}</span>
                      <span className="text-muted-foreground">falhas</span>
                    </div>
                  </div>
                  <span className={`font-medium ${successRate >= 90 ? 'text-primary' : successRate >= 70 ? 'text-warning' : 'text-destructive'}`}>
                    {successRate}% sucesso
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full flex">
                    <div 
                      className="bg-primary transition-all"
                      style={{ width: `${(campaign.sent_count / campaign.total_leads) * 100}%` }}
                    />
                    <div 
                      className="bg-destructive transition-all"
                      style={{ width: `${(campaign.failed_count / campaign.total_leads) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
