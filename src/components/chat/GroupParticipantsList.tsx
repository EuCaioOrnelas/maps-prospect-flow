import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Shield, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface GroupParticipant {
  id: string;
  admin: boolean | null;
  name?: string;
  avatarUrl?: string;
}

interface GroupParticipantsListProps {
  instanceName: string;
  groupJid: string;
}

const formatPhone = (jid: string): string => {
  const phone = jid.replace('@s.whatsapp.net', '').replace('@c.us', '');
  if (phone.length >= 11 && phone.startsWith('55')) {
    return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`;
  }
  return `+${phone}`;
};

export const GroupParticipantsList = ({ instanceName, groupJid }: GroupParticipantsListProps) => {
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

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1">
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
        <Users className="h-4 w-4" />
        <span className="text-sm font-medium">{participants.length} participantes</span>
      </div>
      
      <ScrollArea className="max-h-64">
        <div className="space-y-2 pr-3">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Avatar className="h-10 w-10 shrink-0">
                {participant.avatarUrl && (
                  <AvatarImage src={participant.avatarUrl} alt="Avatar" />
                )}
                <AvatarFallback className="bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground truncate">
                    {participant.name || formatPhone(participant.id)}
                  </span>
                  {participant.admin && (
                    <Badge variant="secondary" className="shrink-0 text-xs py-0 px-1.5">
                      <Shield className="h-3 w-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                </div>
                {participant.name && (
                  <p className="text-xs text-muted-foreground truncate">
                    {formatPhone(participant.id)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
