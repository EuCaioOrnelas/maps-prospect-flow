import { useState, useEffect, useCallback, useMemo, memo, useRef, CSSProperties, ReactElement } from 'react';
import { List } from 'react-window';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Search, Plus, Trash2, X, Check, MessageCircle, Users, UserX, UsersRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import type { Conversation } from '@/hooks/useChat';
import type { ConversationFilter } from '@/hooks/useChat';
import { ConversationItem } from './ConversationItem';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelect: (conversation: Conversation) => void;
  onNewChat: () => void;
  onSaveContact: (conversation: Conversation) => void;
  onDelete: (conversationId: string) => void;
  onBulkDelete: (conversationIds: string[], deleteContacts: boolean) => Promise<void>;
  onTogglePin: (conversation: Conversation) => void;
  onMarkUnread: (conversation: Conversation) => void;
  filter: ConversationFilter;
  onFilterChange: (filter: ConversationFilter) => void;
  totalConversations: number;
}

const FILTER_OPTIONS: { value: ConversationFilter; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'Todas', icon: MessageCircle },
  { value: 'unread', label: 'Não lidas', icon: MessageCircle },
  { value: 'groups', label: 'Grupos', icon: UsersRound },
  { value: 'contacts', label: 'Contatos', icon: Users },
  { value: 'non_contacts', label: 'Não contatos', icon: UserX },
];

const CONVERSATION_ITEM_HEIGHT = 76;

interface VirtualizedRowProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  selectedIds: Set<string>;
  selectionMode: boolean;
  isContactSaved: (conversation: Conversation) => boolean;
  getAvatarUrl: (conversation: Conversation) => string | undefined;
  onSelect: (conversation: Conversation) => void;
  toggleSelection: (id: string) => void;
  onSaveContact: (conversation: Conversation) => void;
  onDelete: (conversationId: string) => void;
  onTogglePin: (conversation: Conversation) => void;
  onMarkUnread: (conversation: Conversation) => void;
}

const RowComponent = ({
  ariaAttributes,
  index,
  style,
  conversations,
  selectedConversationId,
  selectedIds,
  selectionMode,
  isContactSaved,
  getAvatarUrl,
  onSelect,
  toggleSelection,
  onSaveContact,
  onDelete,
  onTogglePin,
  onMarkUnread,
}: {
  ariaAttributes: { "aria-posinset": number; "aria-setsize": number; role: "listitem" };
  index: number;
  style: CSSProperties;
} & VirtualizedRowProps): ReactElement => {
  const conversation = conversations[index];
  return (
    <div style={style} className="px-2" {...ariaAttributes}>
      <ConversationItem
        conversation={conversation}
        isSelected={selectedConversationId === conversation.id}
        isSaved={isContactSaved(conversation)}
        isChecked={selectedIds.has(conversation.id)}
        selectionMode={selectionMode}
        avatarUrl={getAvatarUrl(conversation)}
        onSelect={onSelect}
        onToggleSelection={toggleSelection}
        onSaveContact={onSaveContact}
        onDelete={onDelete}
        onTogglePin={onTogglePin}
        onMarkUnread={onMarkUnread}
      />
    </div>
  );
};

interface VirtualizedConversationListProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  selectedIds: Set<string>;
  selectionMode: boolean;
  isContactSaved: (conversation: Conversation) => boolean;
  getAvatarUrl: (conversation: Conversation) => string | undefined;
  onSelect: (conversation: Conversation) => void;
  toggleSelection: (id: string) => void;
  onSaveContact: (conversation: Conversation) => void;
  onDelete: (conversationId: string) => void;
  onTogglePin: (conversation: Conversation) => void;
  onMarkUnread: (conversation: Conversation) => void;
}

const VirtualizedConversationList = memo(({
  conversations,
  selectedConversation,
  selectedIds,
  selectionMode,
  isContactSaved,
  getAvatarUrl,
  onSelect,
  toggleSelection,
  onSaveContact,
  onDelete,
  onTogglePin,
  onMarkUnread,
}: VirtualizedConversationListProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(400);

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setListHeight(containerRef.current.clientHeight);
      }
    };

    updateHeight();
    const resizeObserver = new ResizeObserver(updateHeight);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  const rowProps = useMemo(() => ({
    conversations,
    selectedConversationId: selectedConversation?.id || null,
    selectedIds,
    selectionMode,
    isContactSaved,
    getAvatarUrl,
    onSelect,
    toggleSelection,
    onSaveContact,
    onDelete,
    onTogglePin,
    onMarkUnread,
  }), [conversations, selectedConversation?.id, selectedIds, selectionMode, isContactSaved, getAvatarUrl, onSelect, toggleSelection, onSaveContact, onDelete, onTogglePin, onMarkUnread]);

  return (
    <div ref={containerRef} className="h-full">
      <List
        rowComponent={RowComponent}
        rowCount={conversations.length}
        rowHeight={CONVERSATION_ITEM_HEIGHT}
        rowProps={rowProps}
        overscanCount={5}
        style={{ height: listHeight, width: '100%' }}
      />
    </div>
  );
});

const ConversationListComponent = ({
  conversations,
  selectedConversation,
  onSelect,
  onNewChat,
  onSaveContact,
  onDelete,
  onBulkDelete,
  onTogglePin,
  onMarkUnread,
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

  // Auto-fetch avatars for visible conversations without one (debounced)
  useEffect(() => {
    // Only fetch avatars after initial render settles
    const timeoutId = setTimeout(() => {
      const conversationsWithoutAvatar = conversations.filter(
        conv => !conv.contacts?.avatar_url && !avatarCache[conv.id] && !fetchingAvatars.has(conv.id)
      );

      // Fetch avatars for max 3 conversations at a time for better performance
      conversationsWithoutAvatar.slice(0, 3).forEach(conv => {
        fetchAvatarFromWhatsApp(conv);
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [conversations.length]); // Only re-run when conversations count changes

  // Get avatar URL - from contacts or cache
  const getAvatarUrl = useCallback((conversation: Conversation) => {
    return conversation.contacts?.avatar_url || avatarCache[conversation.id] || undefined;
  }, [avatarCache]);

  // Check if contact is saved (has an associated contact with a name)
  const isContactSaved = useCallback((conversation: Conversation) => {
    return !!(conversation.contact_id && conversation.contacts?.name);
  }, []);

  // Helper to get display name for search
  const getDisplayName = useCallback((conversation: Conversation) => {
    if (conversation.contact_id && conversation.contacts?.name) {
      return conversation.contacts.name;
    }
    return conversation.phone;
  }, []);

  // Memoize filtered conversations to avoid recalculating on every render
  const filteredConversations = useMemo(() => {
    const searchLower = search.toLowerCase();
    return conversations.filter((conv) => {
      const name = getDisplayName(conv).toLowerCase();
      const phone = conv.phone.toLowerCase();
      const lastMessage = (conv.last_message || '').toLowerCase();
      return name.includes(searchLower) || phone.includes(searchLower) || lastMessage.includes(searchLower);
    });
  }, [conversations, search, getDisplayName]);

  // Memoize unread count
  const unreadCount = useMemo(() => 
    conversations.filter(c => c.unread_count > 0).length, 
    [conversations]
  );

  return (
    <div className="h-full flex flex-col border-r border-border bg-card overflow-hidden">
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
                           option.value === 'groups' ? conversations.filter(c => c.is_group).length :
                           option.value === 'contacts' ? conversations.filter(c => !c.is_group && c.contact_id && c.contacts?.name).length :
                           conversations.filter(c => !c.is_group && (!c.contact_id || !c.contacts?.name)).length;
              
              return (
                <Button
                  key={option.value}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => onFilterChange(option.value)}
                  className={cn(
                    "shrink-0 gap-1.5 h-8 px-3 rounded-full transition-all duration-200 shadow-none",
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

      {/* Conversation List - Virtualized */}
      <div className="flex-1 min-h-0">
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
          <VirtualizedConversationList
            conversations={filteredConversations}
            selectedConversation={selectedConversation}
            selectedIds={selectedIds}
            selectionMode={selectionMode}
            isContactSaved={isContactSaved}
            getAvatarUrl={getAvatarUrl}
            onSelect={onSelect}
            toggleSelection={toggleSelection}
            onSaveContact={onSaveContact}
            onDelete={onDelete}
            onTogglePin={onTogglePin}
            onMarkUnread={onMarkUnread}
          />
        )}
      </div>

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

// Memoize the entire component to prevent unnecessary re-renders
export const ConversationList = memo(ConversationListComponent);
