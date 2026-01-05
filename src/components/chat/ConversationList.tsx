import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Search, Plus, UserCheck, UserPlus, MoreVertical, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Conversation } from '@/hooks/useChat';

interface ConversationListProps {
  conversations: Conversation[];
  archivedConversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelect: (conversation: Conversation) => void;
  onNewChat: () => void;
  onSaveContact: (conversation: Conversation) => void;
  onArchive: (conversationId: string) => void;
  onUnarchive: (conversationId: string) => void;
  onDelete: (conversationId: string) => void;
}

export const ConversationList = ({
  conversations,
  archivedConversations,
  selectedConversation,
  onSelect,
  onNewChat,
  onSaveContact,
  onArchive,
  onUnarchive,
  onDelete,
}: ConversationListProps) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

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
    // Only show name if contact is actually saved (has contact_id AND contacts.name)
    if (conversation.contact_id && conversation.contacts?.name) {
      return conversation.contacts.name;
    }
    // Otherwise always show the phone number
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

  const currentConversations = activeTab === 'active' ? conversations : archivedConversations;

  const filteredConversations = currentConversations.filter((conv) => {
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
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/50"
          />
        </div>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'archived')}>
          <TabsList className="w-full">
            <TabsTrigger value="active" className="flex-1 gap-1.5">
              Ativas
              {conversations.length > 0 && (
                <Badge variant="secondary" className="h-5 min-w-5 text-xs">
                  {conversations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="archived" className="flex-1 gap-1.5">
              Arquivadas
              {archivedConversations.length > 0 && (
                <Badge variant="secondary" className="h-5 min-w-5 text-xs">
                  {archivedConversations.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>{activeTab === 'active' ? 'Nenhuma conversa ativa' : 'Nenhuma conversa arquivada'}</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const displayName = getDisplayName(conversation);
              const isSelected = selectedConversation?.id === conversation.id;
              const isSaved = isContactSaved(conversation);

              return (
                <div
                  key={conversation.id}
                  className={cn(
                    'w-full p-3 flex items-center gap-3 text-left transition-colors hover:bg-muted/50 group',
                    isSelected && 'bg-primary/10'
                  )}
                >
                  <button
                    onClick={() => onSelect(conversation)}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <Avatar className="h-12 w-12 shrink-0">
                      <AvatarImage src={conversation.contacts?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className="font-medium text-foreground truncate max-w-[140px]">
                            {displayName}
                          </span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="shrink-0">
                                  {isSaved ? (
                                    <UserCheck className="h-3.5 w-3.5 text-green-500" />
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onSaveContact(conversation);
                                      }}
                                      className="hover:text-primary transition-colors"
                                    >
                                      <UserPlus className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                                    </button>
                                  )}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {isSaved ? 'Contato salvo' : 'Salvar contato'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-auto">
                          {formatTime(conversation.last_message_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-sm text-muted-foreground truncate flex-1 min-w-0">
                          {conversation.last_message || 'Nenhuma mensagem'}
                        </p>
                        {conversation.unread_count > 0 && (
                          <Badge variant="default" className="shrink-0 h-5 min-w-5 flex items-center justify-center rounded-full text-xs ml-auto">
                            {conversation.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Actions Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!isSaved && (
                        <DropdownMenuItem onClick={() => onSaveContact(conversation)}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Salvar contato
                        </DropdownMenuItem>
                      )}
                      {activeTab === 'active' ? (
                        <DropdownMenuItem onClick={() => onArchive(conversation.id)}>
                          <Archive className="h-4 w-4 mr-2" />
                          Arquivar conversa
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => onUnarchive(conversation.id)}>
                          <ArchiveRestore className="h-4 w-4 mr-2" />
                          Desarquivar conversa
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => onDelete(conversation.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Deletar conversa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
