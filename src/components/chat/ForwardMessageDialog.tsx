import { useState, useMemo, memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, 
  Send, 
  User,
  Image as ImageIcon,
  FileAudio,
  FileVideo,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Conversation, Message } from '@/hooks/useChat';

interface ForwardMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  message?: Message | null;
  mediaUrls?: string[]; // For forwarding multiple images from gallery
  conversations: Conversation[];
  onForward: (conversationIds: string[], message?: Message, mediaUrls?: string[]) => Promise<void>;
}

const getMessagePreview = (message?: Message | null, mediaUrls?: string[]) => {
  if (mediaUrls && mediaUrls.length > 0) {
    return {
      icon: ImageIcon,
      text: `${mediaUrls.length} ${mediaUrls.length === 1 ? 'imagem' : 'imagens'}`,
    };
  }

  if (!message) return { icon: FileText, text: '' };

  switch (message.message_type) {
    case 'image':
      return { icon: ImageIcon, text: message.content || 'Imagem' };
    case 'audio':
    case 'ptt':
      return { icon: FileAudio, text: 'Áudio' };
    case 'video':
      return { icon: FileVideo, text: message.content || 'Vídeo' };
    case 'document':
      return { icon: FileText, text: message.media_filename || 'Documento' };
    default:
      return { icon: FileText, text: message.content || '' };
  }
};

const ForwardMessageDialogComponent = ({
  isOpen,
  onClose,
  message,
  mediaUrls,
  conversations,
  onForward,
}: ForwardMessageDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    const query = searchQuery.toLowerCase();
    return conversations.filter(conv => {
      const name = conv.contacts?.name || conv.contact_name || conv.phone;
      return name?.toLowerCase().includes(query);
    });
  }, [conversations, searchQuery]);

  const toggleConversation = (id: string) => {
    setSelectedConversations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleForward = async () => {
    if (selectedConversations.size === 0) return;
    
    setIsSending(true);
    try {
      await onForward(Array.from(selectedConversations), message || undefined, mediaUrls);
      handleClose();
    } catch (error) {
      console.error('Error forwarding message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedConversations(new Set());
    onClose();
  };

  const preview = getMessagePreview(message, mediaUrls);
  const PreviewIcon = preview.icon;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>Encaminhar para</DialogTitle>
        </DialogHeader>
        
        {/* Message preview */}
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
            <PreviewIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground truncate">
              {preview.text || 'Mensagem'}
            </span>
          </div>
        </div>
        
        {/* Search */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        {/* Conversation list */}
        <ScrollArea className="h-[300px] border-t border-border">
          <div className="p-2">
            {filteredConversations.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma conversa encontrada
              </p>
            ) : (
              filteredConversations.map(conv => {
                const name = conv.contacts?.name || conv.contact_name || conv.phone;
                const isSelected = selectedConversations.has(conv.id);
                
                return (
                  <button
                    key={conv.id}
                    onClick={() => toggleConversation(conv.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2 rounded-lg transition-colors",
                      "hover:bg-muted",
                      isSelected && "bg-primary/10"
                    )}
                  >
                    <Checkbox 
                      checked={isSelected}
                      onCheckedChange={() => toggleConversation(conv.id)}
                    />
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conv.contacts?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">{name}</p>
                      {conv.contacts?.name && (
                        <p className="text-xs text-muted-foreground">{conv.phone}</p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
        
        {/* Actions */}
        <div className="p-4 border-t border-border flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {selectedConversations.size > 0 && (
              `${selectedConversations.size} selecionada${selectedConversations.size > 1 ? 's' : ''}`
            )}
          </span>
          <Button 
            onClick={handleForward}
            disabled={selectedConversations.size === 0 || isSending}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {isSending ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const ForwardMessageDialog = memo(ForwardMessageDialogComponent);
