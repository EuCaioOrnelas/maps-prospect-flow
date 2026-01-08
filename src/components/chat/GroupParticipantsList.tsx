import { useState, useEffect, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Shield, Users, MessageCircle, Phone, Copy, Search, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useContacts } from '@/hooks/useContacts';
import { cn } from '@/lib/utils';

interface GroupParticipant {
  id: string;
  admin: boolean | null;
  name?: string;
  avatarUrl?: string;
}

interface SelectedParticipant {
  id: string;
  displayName: string;
  phone: string | null;
}

interface GroupParticipantsListProps {
  instanceName: string;
  groupJid: string;
  onStartConversation?: (phone: string) => void;
}

const digitsOnly = (value: string) => value.replace(/\D/g, '');

const isLidJid = (jid: string) => jid.includes('@lid');

const getRawPhone = (jid: string): string => {
  const base = jid.includes('@') ? jid.split('@')[0] : jid;
  return digitsOnly(base);
};

const getPhoneKey = (digits: string) => digits.slice(-8);

const isValidPhone = (jid: string): boolean => {
  if (isLidJid(jid)) return false;
  const digits = getRawPhone(jid);
  return digits.length >= 10 && digits.length <= 15;
};

const formatPhone = (jid: string): string | null => {
  if (!isValidPhone(jid)) return null;

  const phone = getRawPhone(jid);

  // Format Brazilian numbers
  if (phone.length >= 12 && phone.length <= 13 && phone.startsWith('55')) {
    const ddd = phone.slice(2, 4);
    const rest = phone.slice(4);
    if (rest.length === 9) return `+55 (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
    if (rest.length === 8) return `+55 (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }

  return `+${phone}`;
};

export const GroupParticipantsList = ({ instanceName, groupJid, onStartConversation }: GroupParticipantsListProps) => {
  const [participants, setParticipants] = useState<GroupParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState<SelectedParticipant | null>(null);
  const { contacts } = useContacts();

  const contactNameByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of contacts) {
      const digits = digitsOnly(c.phone ?? '');
      if (digits.length < 8) continue;
      if (c.name) map.set(getPhoneKey(digits), c.name);
    }
    return map;
  }, [contacts]);

  // Get contact name by phone number (match by last 8 digits)
  const getContactName = (jid: string): string | null => {
    if (!isValidPhone(jid)) return null;
    const key = getPhoneKey(getRawPhone(jid));
    return contactNameByKey.get(key) ?? null;
  };

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
            const nameA = a.name || formatPhone(a.id) || a.id;
            const nameB = b.name || formatPhone(b.id) || b.id;
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

  // Filter participants based on search
  const filteredParticipants = useMemo(() => {
    if (!searchQuery.trim()) return participants;
    
    const query = searchQuery.toLowerCase().trim();
    return participants.filter(p => {
      const contactName = getContactName(p.id);
      const phone = formatPhone(p.id);
      const rawPhone = getRawPhone(p.id);
      
      return (
        p.name?.toLowerCase().includes(query) ||
        contactName?.toLowerCase().includes(query) ||
        phone?.toLowerCase().includes(query) ||
        rawPhone.includes(query)
      );
    });
  }, [participants, searchQuery, contactNameByKey]);

  const handleCopyPhone = (jid: string) => {
    const phone = getRawPhone(jid);
    navigator.clipboard.writeText(phone);
    toast.success('Número copiado!');
  };

  const handleStartConversation = (phone: string) => {
    if (onStartConversation) {
      onStartConversation(phone);
    } else {
      navigator.clipboard.writeText(phone);
      toast.success('Número copiado! Use para iniciar uma conversa.');
    }
    setSelectedParticipant(null);
  };

  const handleSelectParticipant = (participant: GroupParticipant) => {
    const validPhone = isValidPhone(participant.id);
    if (!validPhone) return;
    
    const formattedPhone = formatPhone(participant.id);
    const contactName = getContactName(participant.id);
    const displayName = contactName || participant.name || formattedPhone || 'Participante';
    const rawPhone = getRawPhone(participant.id);
    
    setSelectedParticipant({
      id: participant.id,
      displayName,
      phone: rawPhone,
    });
  };

  const clearSelection = () => {
    setSelectedParticipant(null);
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
    <div className="space-y-3 flex flex-col">
      <div className="flex items-center gap-2 text-muted-foreground shrink-0">
        <Users className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">{participants.length} participantes</span>
      </div>

      {/* Search input */}
      <div className="relative shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar participante..."
          className="pl-8 h-9 text-sm"
        />
      </div>
      
      {/* Selected participant action bar */}
      {selectedParticipant && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center gap-2 shrink-0 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{selectedParticipant.displayName}</p>
            {selectedParticipant.phone && (
              <p className="text-xs text-muted-foreground">+{selectedParticipant.phone}</p>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 h-8 w-8 p-0"
            onClick={() => {
              if (selectedParticipant.phone) {
                handleCopyPhone(selectedParticipant.id);
              }
            }}
            title="Copiar número"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => {
              if (selectedParticipant.phone) {
                handleStartConversation(selectedParticipant.phone);
              }
            }}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Conversar</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 h-8 w-8 p-0"
            onClick={clearSelection}
            title="Fechar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      <ScrollArea className="h-[35vh] md:h-[250px]">
        <div className="space-y-1 pr-3">
          {filteredParticipants.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum resultado encontrado
            </p>
          ) : (
            filteredParticipants.map((participant) => {
              const validPhone = isValidPhone(participant.id);
              const formattedPhone = formatPhone(participant.id);
              const contactName = getContactName(participant.id);
              
              // Display priority: saved contact name > pushname > formatted phone > "Participante"
              const displayName = contactName || participant.name || formattedPhone || 'Participante';
              // Show phone below if we have a name and a valid phone
              const showPhoneBelow = validPhone && formattedPhone && (contactName || participant.name);
              
              return (
                <div
                  key={participant.id}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer",
                    selectedParticipant?.id === participant.id && "bg-primary/10 ring-1 ring-primary/30"
                  )}
                  onClick={() => validPhone && handleSelectParticipant(participant)}
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    {participant.avatarUrl && (
                      <AvatarImage src={participant.avatarUrl} alt="Avatar" />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-1.5 min-w-0">
                      <span className="font-medium text-foreground text-sm truncate flex-1">
                        {displayName}
                      </span>
                      {participant.admin && (
                        <Badge variant="secondary" className="shrink-0 text-[9px] py-0 px-1.5 h-4 whitespace-nowrap">
                          <Shield className="h-2.5 w-2.5 mr-0.5" />
                          Admin
                        </Badge>
                      )}
                    </div>
                    {showPhoneBelow && (
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span className="truncate">{formattedPhone}</span>
                      </p>
                    )}
                    {!validPhone && (
                      <p className="text-xs text-muted-foreground/60 truncate mt-0.5">
                        Número não disponível
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
