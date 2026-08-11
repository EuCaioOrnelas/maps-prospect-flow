import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Check, Bell, CreditCard, WifiOff, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  title: string;
  content: string;
  expires_at: string;
  created_at: string;
}

interface DisconnectedNumberAlert {
  id: string;
  name: string;
  phone_number: string | null;
  instance_name: string | null;
}

interface AnnouncementsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disconnectedNumbers?: DisconnectedNumberAlert[];
  onDismissDisconnection?: (numberId: string) => void;
}

export const AnnouncementsDialog = ({ open, onOpenChange, disconnectedNumbers = [], onDismissDisconnection }: AnnouncementsDialogProps) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [dismissedDisconnections, setDismissedDisconnections] = useState<Set<string>>(new Set());

  // Load dismissed disconnections from localStorage
  useEffect(() => {
    if (user) {
      const dismissedKey = `dismissed_disconnections_${user.id}`;
      const dismissed = JSON.parse(localStorage.getItem(dismissedKey) || '[]') as string[];
      setDismissedDisconnections(new Set(dismissed));
    }
  }, [user, open]);

  // Check for subscription renewal reminder
  const subscriptionRenewalInfo = (() => {
    if (!profile?.subscription_current_period_end || profile?.plan === 'free') {
      return null;
    }
    const renewalDate = new Date(profile.subscription_current_period_end);
    const daysUntilRenewal = differenceInDays(renewalDate, new Date());
    
    if (daysUntilRenewal >= 0 && daysUntilRenewal <= 7) {
      return { daysRemaining: daysUntilRenewal, renewalDate };
    }
    return null;
  })();

  useEffect(() => {
    if (open && user) {
      fetchAnnouncements();
    }
  }, [open, user]);

  const fetchAnnouncements = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: announcementsData } = await supabase
        .from('announcements')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      const { data: readsData } = await supabase
        .from('user_announcement_reads')
        .select('announcement_id')
        .eq('user_id', user.id);

      setAnnouncements(announcementsData || []);
      setReadIds(new Set(readsData?.map(r => r.announcement_id) || []));
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (announcementId: string) => {
    if (!user || readIds.has(announcementId)) return;

    try {
      await supabase
        .from('user_announcement_reads')
        .insert({ user_id: user.id, announcement_id: announcementId });
      
      setReadIds(prev => new Set([...prev, announcementId]));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    const unreadIds = announcements
      .filter(a => !readIds.has(a.id))
      .map(a => a.id);
    
    if (unreadIds.length === 0) return;

    try {
      await supabase
        .from('user_announcement_reads')
        .insert(unreadIds.map(id => ({ user_id: user.id, announcement_id: id })));
      
      setReadIds(prev => new Set([...prev, ...unreadIds]));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }

    // Also dismiss all disconnection alerts
    undismissedDisconnections.forEach(n => {
      handleDismissDisconnection(n.id);
    });
  };

  const handleDismissDisconnection = (numberId: string) => {
    setDismissedDisconnections(prev => new Set([...prev, numberId]));
    onDismissDisconnection?.(numberId);
  };

  const undismissedDisconnections = disconnectedNumbers.filter(n => !dismissedDisconnections.has(n.id));
  const unreadCount = announcements.filter(a => !readIds.has(a.id)).length;
  const hasRenewalReminder = subscriptionRenewalInfo !== null;
  const totalUnread = unreadCount + undismissedDisconnections.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Avisos
            </DialogTitle>
            {totalUnread > 0 && (
              <Button size="sm" variant="ghost" onClick={markAllAsRead}>
                <Check className="w-4 h-4 mr-1" />
                Marcar todas como lidas
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          {/* Disconnected Numbers Alerts */}
          {undismissedDisconnections.length > 0 && (
            <div className="space-y-3 mb-4">
              {undismissedDisconnections.map(num => (
                <div key={num.id} className="p-4 rounded-lg border bg-amber-500/10 border-amber-500/30">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-[9px] bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm text-amber-700 dark:text-amber-300">Número Meta desconectado</h3>
                        <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] shrink-0">
                          Urgente
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        <strong className="text-foreground">{num.name}</strong>
                        {num.phone_number && <span> ({num.phone_number})</span>} perdeu a conexão com a Meta Cloud API.
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Chat, campanhas e fluxos não funcionarão até reconectar este número.
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-xs gap-1.5"
                          onClick={() => {
                            onOpenChange(false);
                            navigate('/meta/numeros');
                          }}
                        >
                          <Smartphone className="w-3 h-3" />
                          Reconectar número Meta
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => handleDismissDisconnection(num.id)}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Entendi
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Subscription Renewal Reminder */}
          {subscriptionRenewalInfo && (
            <div className="mb-4 p-4 rounded-lg border bg-amber-500/10 border-amber-500/30">
              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <h3 className="font-medium text-sm text-amber-500 mb-1">
                    Renovação da assinatura
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {subscriptionRenewalInfo.daysRemaining === 0 ? (
                      <>Sua assinatura renova <strong className="text-foreground">hoje</strong>.</>
                    ) : subscriptionRenewalInfo.daysRemaining === 1 ? (
                      <>Sua assinatura renova <strong className="text-foreground">amanhã</strong>.</>
                    ) : (
                      <>Sua assinatura renova em <strong className="text-foreground">{subscriptionRenewalInfo.daysRemaining} dias</strong> ({format(subscriptionRenewalInfo.renewalDate, "dd 'de' MMMM", { locale: ptBR })}).</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : announcements.length === 0 && !hasRenewalReminder && undismissedDisconnections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum aviso no momento</p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map(announcement => {
                const isRead = readIds.has(announcement.id);
                return (
                  <div
                    key={announcement.id}
                    className={cn(
                      "p-4 rounded-lg border transition-all",
                      isRead 
                        ? "bg-muted/30 border-border/50" 
                        : "bg-primary/5 border-primary/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-medium text-sm flex-1">{announcement.title}</h3>
                      {!isRead && (
                        <Badge variant="secondary" className="bg-primary/20 text-primary text-[10px] shrink-0">
                          Nova
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">
                      {announcement.content}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(announcement.created_at), "dd 'de' MMMM", { locale: ptBR })}
                      </span>
                      {!isRead && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => markAsRead(announcement.id)}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Marcar como lida
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
