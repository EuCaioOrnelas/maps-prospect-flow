import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Shield, Users, MessageCircle, Phone, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GroupParticipant {
  id: string;
  admin: boolean | null;
  name?: string;
  avatarUrl?: string;
}

interface GroupParticipantsListProps {
  instanceName: string;
  groupJid: string;
  onStartConversation?: (phone: string) => void;
}

const formatPhone = (jid: string): string => {
  const phone = jid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
  // Check if it's a LID (doesn't have proper phone format)
  if (phone.includes(':') || phone.length < 8) {
    return phone;
  }
  if (phone.length >= 11 && phone.startsWith('55')) {
    return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`;
  }
  if (phone.length >= 10) {
    return `+${phone}`;
  }
  return phone;
};

const getRawPhone = (jid: string): string => {
  return jid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
};

const isValidPhone = (jid: string): boolean => {
  const phone = getRawPhone(jid);
  // LIDs contain ':' or are too short
  return !phone.includes(':') && phone.length >= 8;
};

export const GroupParticipantsList = ({ instanceName, groupJid, onStartConversation }: GroupParticipantsListProps) => {
  const [participants, setParticipants] = useState<GroupParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchParticipants = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase.functions.invoke('evolution-get-group-participants', {
          body: { instanceName, groupJid },
        });

        if (fetchError) throw fetchError;

        if (data?.participants) {
          // Sort: admins first, then by name/phone
          const sorted = [...data.participants].sort((a, b) => {
            if (a.admin && !b.admin) return -1;
            if (!a.admin && b.admin) return 1;
            const nameA = a.name || formatPhone(a.id);
            const nameB = b.name || formatPhone(b.id);
            return nameA.localeCompare(nameB);
          });
          setParticipants(sorted);
        }
      } catch (err) {
        console.error('Error fetching participants:', err);
        setError('Não foi possível carregar os participantes');
      } finally {
        setIsLoading(false);
      }
    };

    if (instanceName && groupJid) {
      fetchParticipants();
    }
  }, [instanceName, groupJid]);

  const handleCopyPhone = (jid: string) => {
    const phone = getRawPhone(jid);
    navigator.clipboard.writeText(phone);
    toast.success('Número copiado!');
  };

  const handleStartConversation = (jid: string) => {
    const phone = getRawPhone(jid);
    if (onStartConversation) {
      onStartConversation(phone);
    } else {
      // Fallback: copy the phone
      navigator.clipboard.writeText(phone);
      toast.success('Número copiado! Use para iniciar uma conversa.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-1 min-w-0">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Nenhum participante encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground mb-3">
        <Users className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">{participants.length} participantes</span>
      </div>
      
      <ScrollArea className="max-h-64">
        <div className="space-y-1 pr-3">
          {participants.map((participant) => {
            const validPhone = isValidPhone(participant.id);
            const formattedPhone = formatPhone(participant.id);
            
            return (
              <div
                key={participant.id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <Avatar className="h-9 w-9 shrink-0">
                  {participant.avatarUrl && (
                    <AvatarImage src={participant.avatarUrl} alt="Avatar" />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-medium text-foreground text-sm truncate">
                      {participant.name || formattedPhone}
                    </span>
                    {participant.admin && (
                      <Badge variant="secondary" className="shrink-0 text-[10px] py-0 px-1 h-4">
                        <Shield className="h-2.5 w-2.5 mr-0.5" />
                        Admin
                      </Badge>
                    )}
                  </div>
                  {participant.name && (
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <Phone className="h-3 w-3 shrink-0" />
                      <span className="truncate">{formattedPhone}</span>
                    </p>
                  )}
                </div>

                {/* Action buttons - only for valid phones */}
                {validPhone && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleCopyPhone(participant.id)}
                      title="Copiar número"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-primary hover:text-primary"
                      onClick={() => handleStartConversation(participant.id)}
                      title="Enviar mensagem"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
