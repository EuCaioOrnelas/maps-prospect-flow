import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Search, Plus, UserCheck, UserPlus, MoreVertical, Trash2, X, Check, User, MessageCircle, Users, UserX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useCallback } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import type { Conversation } from '@/hooks/useChat';
import type { ConversationFilter } from '@/hooks/useChat';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelect: (conversation: Conversation) => void;
  onNewChat: () => void;
  onSaveContact: (conversation: Conversation) => void;
  onDelete: (conversationId: string) => void;
  onBulkDelete: (conversationIds: string[], deleteContacts: boolean) => Promise<void>;
  filter: ConversationFilter;
  onFilterChange: (filter: ConversationFilter) => void;
  totalConversations: number;
}

const FILTER_OPTIONS: { value: ConversationFilter; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'Todas', icon: MessageCircle },
  { value: 'unread', label: 'Não lidas', icon: MessageCircle },
  { value: 'contacts', label: 'Contatos', icon: Users },
  { value: 'non_contacts', label: 'Não contatos', icon: UserX },
];

export const ConversationList = ({
  conversations,
  selectedConversation,
  onSelect,
  onNewChat,
  onSaveContact,
  onDelete,
  onBulkDelete,
  filter,
  onFilterChange,
  totalConversations,
}: ConversationListProps) => {
  const [search, setSearch] = useState('');
  const [fetchingAvatars, setFetchingAvatars] = useState<Set<string>>(new Set());
  
  // Use sessionStorage for avatar cache to persist across navigation
  const [avatarCache, setAvatarCache] = useState<Record<string, string>>(() => {
    try {
      const cached = sessionStorage.getItem('chat-avatar-cache');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });

  // Persist avatar cache to sessionStorage
  useEffect(() => {
    if (Object.keys(avatarCache).length > 0) {
      try {
        sessionStorage.setItem('chat-avatar-cache', JSON.stringify(avatarCache));
      } catch {
        // Ignore storage errors
      }
    }
  }, [avatarCache]);
  
  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteContacts, setDeleteContacts] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Exit selection mode when filter changes
  useEffect(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, [filter]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredConversations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredConversations.map(c => c.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    setIsDeleting(true);
    try {
      await onBulkDelete(Array.from(selectedIds), deleteContacts);
      setSelectedIds(new Set());
      setSelectionMode(false);
      setShowDeleteDialog(false);
      setDeleteContacts(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Fetch avatar from WhatsApp for conversations without one
  const fetchAvatarFromWhatsApp = useCallback(async (conversation: Conversation) => {
    if (!conversation.whatsapp_numbers?.id || fetchingAvatars.has(conversation.id)) {
      return;
    }

    setFetchingAvatars(prev => new Set(prev).add(conversation.id));

    try {
      // Get instance name for this WhatsApp number
      const { data: numberData } = await supabase
        .from('whatsapp_numbers')
        .select('instance_name')
        .eq('id', conversation.whatsapp_number_id)
        .single();

      if (!numberData?.instance_name) return;

      const { data, error } = await supabase.functions.invoke('evolution-fetch-avatar', {
        body: {
          conversationId: conversation.id,
          instanceName: numberData.instance_name,
          phone: conversation.phone,
        },
      });

      if (!error && data?.avatarUrl) {
        setAvatarCache(prev => ({
          ...prev,
          [conversation.id]: data.avatarUrl,
        }));
      }
    } catch (e) {
      console.log('Failed to fetch avatar:', e);
    } finally {
      setFetchingAvatars(prev => {
        const next = new Set(prev);
        next.delete(conversation.id);
        return next;
      });
    }
  }, [fetchingAvatars]);

  // Auto-fetch avatars for all conversations without one
  useEffect(() => {
    const conversationsWithoutAvatar = conversations.filter(
      conv => !conv.contacts?.avatar_url && !avatarCache[conv.id] && !fetchingAvatars.has(conv.id)
    );

    // Fetch avatars for all conversations (5 at a time for better performance)
    conversationsWithoutAvatar.slice(0, 5).forEach(conv => {
      fetchAvatarFromWhatsApp(conv);
    });
  }, [conversations, avatarCache, fetchingAvatars, fetchAvatarFromWhatsApp]);

  // Get avatar URL - from contacts or cache
  const getAvatarUrl = (conversation: Conversation) => {
    return conversation.contacts?.avatar_url || avatarCache[conversation.id] || undefined;
  };

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
    // Normalize phone to just digits
    const digits = phone.replace(/\D/g, '');
    
    // Brazilian format: +55 (XX) XXXXX-XXXX or +55 (XX) XXXX-XXXX
    if (digits.length === 13 && digits.startsWith('55')) {
      return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
    }
    if (digits.length === 12 && digits.startsWith('55')) {
      return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
    }
    // International format with country code
    if (digits.length >= 11) {
      const countryCode = digits.slice(0, 2);
      const areaCode = digits.slice(2, 4);
      const rest = digits.slice(4);
      return `+${countryCode} (${areaCode}) ${rest}`;
    }
    // Default: show with + prefix
    return `+${digits}`;
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

  // Count unread
  const unreadCount = conversations.filter(c => c.unread_count > 0).length;

  return (
    <div className="h-full flex flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Conversas</h2>
          <div className="flex items-center gap-1">
            {selectionMode ? (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={selectAll}
                        className="h-8 w-8"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {selectedIds.size === filteredConversations.length ? 'Desmarcar todos' : 'Selecionar todos'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={selectedIds.size === 0}
                  className="h-8"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {selectedIds.size}
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => {
                    setSelectionMode(false);
                    setSelectedIds(new Set());
                  }}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => setSelectionMode(true)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Excluir conversas</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button size="icon" variant="ghost" onClick={onNewChat} className="h-8 w-8">
                  <Plus className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
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
        
        {/* Filter Chips - WhatsApp Style */}
        <div className="overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-secondary/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/40 [&::-webkit-scrollbar-thumb]:rounded-full">
          <div className="flex gap-2 min-w-max">
            {FILTER_OPTIONS.map((option) => {
              const isActive = filter === option.value;
              const count = option.value === 'unread' ? unreadCount : 
                           option.value === 'all' ? totalConversations : 
                           option.value === 'contacts' ? conversations.filter(c => c.contact_id && c.contacts?.name).length :
                           conversations.filter(c => !c.contact_id || !c.contacts?.name).length;
              
              return (
                <Button
                  key={option.value}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => onFilterChange(option.value)}
                  className={cn(
                    "shrink-0 gap-1.5 h-8 px-3 rounded-full transition-all duration-200",
                    isActive && "bg-primary text-primary-foreground",
                    !isActive && "bg-muted/50 hover:bg-muted border-0"
                  )}
                >
                  <option.icon className="h-3.5 w-3.5" />
                  <span>{option.label}</span>
                  {count > 0 && (
                    <Badge 
                      variant={isActive ? "secondary" : "outline"} 
                      className={cn(
                        "h-5 min-w-5 text-xs px-1.5",
                        isActive && "bg-primary-foreground/20 text-primary-foreground border-0"
                      )}
                    >
                      {count}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selection Mode Info */}
      {selectionMode && (
        <div className="px-4 py-2 bg-muted/50 border-b border-border text-sm text-muted-foreground">
          {selectedIds.size === 0 
            ? 'Clique nas conversas para selecionar'
            : `${selectedIds.size} conversa(s) selecionada(s)`
          }
        </div>
      )}

      {/* Conversation List */}
      <ScrollArea className="flex-1 [&_[data-radix-scroll-area-viewport]]:!overflow-x-hidden [&_[data-radix-scroll-area-scrollbar]]:bg-muted/50 [&_[data-radix-scroll-area-thumb]]:bg-primary/30">
        <div className="p-2 space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>
                {filter === 'unread' ? 'Nenhuma mensagem não lida' : 
                 filter === 'contacts' ? 'Nenhum contato salvo' :
                 filter === 'non_contacts' ? 'Todas as conversas são de contatos salvos' :
                 'Nenhuma conversa'}
              </p>
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const displayName = getDisplayName(conversation);
              const isConvSelected = selectedConversation?.id === conversation.id;
              const isSaved = isContactSaved(conversation);
              const isChecked = selectedIds.has(conversation.id);

              return (
                <div
                  key={conversation.id}
                  className={cn(
                    'w-full p-3 flex items-center gap-3 text-left transition-colors hover:bg-muted/50 group rounded-lg',
                    isConvSelected && !selectionMode && 'bg-primary/10',
                    isChecked && selectionMode && 'bg-primary/10'
                  )}
                >
                  {selectionMode && (
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleSelection(conversation.id)}
                      className="shrink-0"
                    />
                  )}
                  <button
                    onClick={() => selectionMode ? toggleSelection(conversation.id) : onSelect(conversation)}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <Avatar className="h-12 w-12 shrink-0">
                      <AvatarImage src={getAvatarUrl(conversation)} />
                      <AvatarFallback className="bg-primary/10 text-primary flex items-center justify-center">
                        <User className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0 overflow-hidden text-left">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className="font-medium text-foreground truncate flex-1 text-left">
                            {displayName}
                          </span>
                          {!selectionMode && (
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
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                          {formatTime(conversation.last_message_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-sm text-muted-foreground truncate flex-1 min-w-0 text-left">
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

                  {/* Actions Menu - only show when not in selection mode */}
                  {!selectionMode && (
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
                        <DropdownMenuItem 
                          onClick={() => onDelete(conversation.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Deletar conversa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.size} conversa(s)?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>Esta ação não pode ser desfeita. Todas as mensagens serão excluídas permanentemente.</p>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Checkbox
                  id="deleteContacts"
                  checked={deleteContacts}
                  onCheckedChange={(checked) => setDeleteContacts(checked === true)}
                />
                <label htmlFor="deleteContacts" className="text-sm cursor-pointer">
                  Excluir também os contatos salvos associados
                </label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
