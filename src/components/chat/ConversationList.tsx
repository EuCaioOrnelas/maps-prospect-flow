import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Search, Plus, UserCheck, UserX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Conversation } from '@/hooks/useChat';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelect: (conversation: Conversation) => void;
  onNewChat: () => void;
}

export const ConversationList = ({
  conversations,
  selectedConversation,
  onSelect,
  onNewChat,
}: ConversationListProps) => {
  const [search, setSearch] = useState('');

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    }
    if (isYesterday(date)) {
      return 'Ontem';
    }
    if (isThisWeek(date)) {
      return format(date, 'EEEE', { locale: ptBR });
    }
    return format(date, 'dd/MM/yyyy');
  };

  const getDisplayName = (conversation: Conversation) => {
    if (conversation.contacts?.name) {
      return conversation.contacts.name;
    }
    if (conversation.contact_name) {
      return conversation.contact_name;
    }
    return formatPhoneNumber(conversation.phone);
  };

  const formatPhoneNumber = (phone: string) => {
    if (phone.length === 13) {
      return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`;
    }
    if (phone.length === 12) {
      return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 8)}-${phone.slice(8)}`;
    }
    return phone;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Check if contact is saved (has an associated contact with a name)
  const isContactSaved = (conversation: Conversation) => {
    return !!(conversation.contact_id && conversation.contacts?.name);
  };

  const filteredConversations = conversations.filter((conv) => {
    const name = getDisplayName(conv).toLowerCase();
    const phone = conv.phone.toLowerCase();
    const lastMessage = (conv.last_message || '').toLowerCase();
    const searchLower = search.toLowerCase();
    return name.includes(searchLower) || phone.includes(searchLower) || lastMessage.includes(searchLower);
  });

  return (
    <div className="h-full flex flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Conversas</h2>
          <Button size="icon" variant="ghost" onClick={onNewChat}>
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/50"
          />
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>Nenhuma conversa encontrada</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const displayName = getDisplayName(conversation);
              const isSelected = selectedConversation?.id === conversation.id;

              return (
                <button
                  key={conversation.id}
                  onClick={() => onSelect(conversation)}
                  className={cn(
                    'w-full p-3 flex items-center gap-3 text-left transition-colors hover:bg-muted/50',
                    isSelected && 'bg-primary/10'
                  )}
                >
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage src={conversation.contacts?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-medium text-foreground truncate">
                          {displayName}
                        </span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="shrink-0">
                                {isContactSaved(conversation) ? (
                                  <UserCheck className="h-3.5 w-3.5 text-green-500" />
                                ) : (
                                  <UserX className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {isContactSaved(conversation) ? 'Contato salvo' : 'Contato não salvo'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatTime(conversation.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.last_message || 'Nenhuma mensagem'}
                      </p>
                      {conversation.unread_count > 0 && (
                        <Badge variant="default" className="shrink-0 h-5 min-w-5 flex items-center justify-center rounded-full text-xs">
                          {conversation.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
