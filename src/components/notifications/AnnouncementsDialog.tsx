import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Check, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  title: string;
  content: string;
  expires_at: string;
  created_at: string;
}

interface AnnouncementsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AnnouncementsDialog = ({ open, onOpenChange }: AnnouncementsDialogProps) => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && user) {
      fetchAnnouncements();
    }
  }, [open, user]);

  const fetchAnnouncements = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch active announcements
      const { data: announcementsData } = await supabase
        .from('announcements')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      // Fetch user's read announcements
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
  };

  const unreadCount = announcements.filter(a => !readIds.has(a.id)).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Novidades
            </DialogTitle>
            {unreadCount > 0 && (
              <Button size="sm" variant="ghost" onClick={markAllAsRead}>
                <Check className="w-4 h-4 mr-1" />
                Marcar todas como lidas
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma novidade no momento</p>
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
