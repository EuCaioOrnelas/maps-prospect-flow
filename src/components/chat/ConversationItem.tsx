import { memo, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { UserCheck, UserPlus, MoreVertical, Trash2, User, Pin, PinOff, MailOpen, Users } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import type { Conversation } from '@/hooks/useChat';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  isSaved: boolean;
  isChecked: boolean;
  selectionMode: boolean;
  avatarUrl?: string;
  onSelect: (conversation: Conversation) => void;
  onToggleSelection: (id: string) => void;
  onSaveContact: (conversation: Conversation) => void;
  onDelete: (id: string) => void;
  onTogglePin?: (conversation: Conversation) => void;
  onMarkUnread?: (conversation: Conversation) => void;
}

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

const formatPhoneNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  
  // Brazilian phone with country code
  if (digits.startsWith('55') && digits.length >= 12) {
    const ddd = digits.slice(2, 4);
    const number = digits.slice(4);
    
    // 9-digit mobile: +55 (XX) XXXXX-XXXX
    if (number.length === 9) {
      return `+${digits.slice(0, 2)} (${ddd}) ${number.slice(0, 5)}-${number.slice(5)}`;
    }
    // 8-digit landline: +55 (XX) XXXX-XXXX
    if (number.length === 8) {
      return `+${digits.slice(0, 2)} (${ddd}) ${number.slice(0, 4)}-${number.slice(4)}`;
    }
  }
  
  // Fallback for other formats
  if (digits.length >= 11) {
    const countryCode = digits.slice(0, 2);
    const areaCode = digits.slice(2, 4);
    const rest = digits.slice(4);
    return `+${countryCode} (${areaCode}) ${rest}`;
  }
  return `+${digits}`;
};

const getDisplayName = (conversation: Conversation) => {
  // For groups, use group_name or phone as group ID
  if (conversation.is_group) {
    return conversation.group_name || `Grupo ${conversation.phone.slice(-6)}`;
  }
  
  // Priority: 1. Linked contact name (verified match), 2. Formatted phone number
  // Note: We DON'T use contact_name from conversation as it can be stale/wrong
  // Only use contacts.name if there's a proper contact_id link
  if (conversation.contact_id && conversation.contacts?.name) {
    return conversation.contacts.name;
  }
  
  // Always show formatted phone number for non-saved contacts
  return formatPhoneNumber(conversation.phone);
};

const formatLastMessage = (message: string | null): string => {
  if (!message) return 'Sem mensagens';
  
  // Map placeholder patterns to friendly names
  const mediaPatterns: Record<string, string> = {
    '[image]': '📷 Imagem',
    '[audio]': '🎵 Áudio',
    '[video]': '🎬 Vídeo',
    '[document]': '📄 Documento',
    '[sticker]': '🏷️ Figurinha',
    '[ptt]': '🎤 Áudio',
  };
  
  const lowerMessage = message.toLowerCase().trim();
  for (const [pattern, replacement] of Object.entries(mediaPatterns)) {
    if (lowerMessage === pattern) {
      return replacement;
    }
  }
  
  return message;
};

const ConversationItemComponent = ({
  conversation,
  isSelected,
  isSaved,
  isChecked,
  selectionMode,
  avatarUrl,
  onSelect,
  onToggleSelection,
  onSaveContact,
  onDelete,
  onTogglePin,
  onMarkUnread,
}: ConversationItemProps) => {
  const displayName = getDisplayName(conversation);
  const isPinned = !!conversation.pinned_at;
  
  const handleClick = useCallback(() => {
    if (selectionMode) {
      onToggleSelection(conversation.id);
    } else {
      onSelect(conversation);
    }
  }, [selectionMode, conversation, onToggleSelection, onSelect]);

  const handleSaveContact = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSaveContact(conversation);
  }, [conversation, onSaveContact]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(conversation.id);
  }, [conversation.id, onDelete]);

  const handleToggle = useCallback(() => {
    onToggleSelection(conversation.id);
  }, [conversation.id, onToggleSelection]);

  const handlePin = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onTogglePin?.(conversation);
  }, [conversation, onTogglePin]);

  const handleMarkUnread = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkUnread?.(conversation);
  }, [conversation, onMarkUnread]);

  return (
    <div
      className={cn(
        'w-full p-3 flex items-center gap-3 text-left transition-colors hover:bg-muted/50 group rounded-lg',
        isSelected && !selectionMode && 'bg-primary/10',
        isChecked && selectionMode && 'bg-primary/10'
      )}
    >
      {selectionMode && (
        <Checkbox
          checked={isChecked}
          onCheckedChange={handleToggle}
          className="shrink-0"
        />
      )}
      <button
        onClick={handleClick}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <Avatar className="h-12 w-12 shrink-0">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="bg-primary/10 text-primary flex items-center justify-center">
            {conversation.is_group ? <Users className="h-6 w-6" /> : <User className="h-6 w-6" />}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 overflow-hidden text-left">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {/* Pin indicator */}
              {isPinned && (
                <Pin className="h-3 w-3 text-primary shrink-0" />
              )}
              <span className="font-medium text-foreground truncate flex-1 text-left">
                {displayName}
              </span>
              {/* Save contact button - only for non-groups */}
              {!selectionMode && !conversation.is_group && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="shrink-0">
                        {isSaved ? (
                          <UserCheck className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <button
                            onClick={handleSaveContact}
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
              )}
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatTime(conversation.last_message_at)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm text-muted-foreground truncate flex-1 text-left">
              {formatLastMessage(conversation.last_message)}
            </p>
            {conversation.unread_count > 0 && (
              <Badge className="bg-primary text-primary-foreground shrink-0 h-5 min-w-5 flex items-center justify-center text-xs px-1.5">
                {conversation.manually_marked_unread ? (
                  <MailOpen className="h-3.5 w-3.5" />
                ) : (
                  conversation.unread_count
                )}
              </Badge>
            )}
          </div>
        </div>
      </button>

      {/* Actions Menu */}
      {!selectionMode && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handlePin}>
              {isPinned ? (
                <>
                  <PinOff className="h-4 w-4 mr-2" />
                  Desafixar
                </>
              ) : (
                <>
                  <Pin className="h-4 w-4 mr-2" />
                  Fixar no topo
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleMarkUnread}>
              <MailOpen className="h-4 w-4 mr-2" />
              Marcar como não lida
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir conversa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

export const ConversationItem = memo(ConversationItemComponent, (prevProps, nextProps) => {
  return (
    prevProps.conversation.id === nextProps.conversation.id &&
    prevProps.conversation.last_message === nextProps.conversation.last_message &&
    prevProps.conversation.unread_count === nextProps.conversation.unread_count &&
    prevProps.conversation.manually_marked_unread === nextProps.conversation.manually_marked_unread &&
    prevProps.conversation.last_message_at === nextProps.conversation.last_message_at &&
    prevProps.conversation.pinned_at === nextProps.conversation.pinned_at &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isSaved === nextProps.isSaved &&
    prevProps.isChecked === nextProps.isChecked &&
    prevProps.selectionMode === nextProps.selectionMode &&
    prevProps.avatarUrl === nextProps.avatarUrl
  );
});
