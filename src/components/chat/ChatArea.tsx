import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { 
  Send, 
  Clock,
  MoreVertical,
  Minus,
  Plus,
  Type,
  ArrowLeft,
  X,
  UserPlus,
  User,
  Search,
  Upload,
  Mic,
  FileText,
  Image as ImageIcon,
  Video,
  ArrowDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Conversation, Message } from '@/hooks/useChat';
import { MediaUploader, type MediaUploaderRef } from './MediaUploader';
import { EmojiPicker } from './EmojiPicker';
import { MessageBubble } from './MessageBubble';
import { ImageGallery } from './ImageGallery';
import { ForwardMessageDialog } from './ForwardMessageDialog';
import { MessageActionsMenu } from './MessageActionsMenu';
import chatBackground from '@/assets/chat-background.png';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import type { QuickReply } from '@/hooks/useQuickReplies';
import { MessageSearch } from './MessageSearch';

interface ChatAreaProps {
  conversation: Conversation | null;
  messages: Message[];
  isSending: boolean;
  isTyping?: boolean;
  onSendMessage: (content: string, quotedMessageId?: string) => void;
  onSendMedia?: (mediaUrl: string, messageType: 'image' | 'audio', caption?: string) => void;
  onOpenContactInfo: () => void;
  onBack?: () => void;
  onSaveContact?: (conversation: Conversation) => void;
  quickReplies?: QuickReply[];
  allConversations?: Conversation[];
  onForwardMessage?: (conversationIds: string[], message: Message) => Promise<void>;
  onDeleteMessage?: (message: Message, forEveryone: boolean) => Promise<void>;
}

const FONT_SIZES = [
  { label: 'Pequeno', value: 'text-xs' },
  { label: 'Normal', value: 'text-sm' },
  { label: 'Grande', value: 'text-base' },
  { label: 'Muito grande', value: 'text-lg' },
];



const ChatAreaComponent = ({
  conversation,
  messages,
  isSending,
  isTyping = false,
  onSendMessage,
  onSendMedia,
  onOpenContactInfo,
  onBack,
  onSaveContact,
  quickReplies = [],
  allConversations = [],
  onForwardMessage,
  onDeleteMessage,
}: ChatAreaProps) => {
  const [inputValue, setInputValue] = useState('');
  const [fontSizeIndex, setFontSizeIndex] = useState(1);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isFetchingAvatar, setIsFetchingAvatar] = useState(false);
  const [matchedQuickReply, setMatchedQuickReply] = useState<QuickReply | null>(null);
  const [sendingQuickReply, setSendingQuickReply] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [forwardingMediaUrls, setForwardingMediaUrls] = useState<string[] | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaUploaderRef = useRef<MediaUploaderRef>(null);

  // Clear highlight after animation
  useEffect(() => {
    if (highlightedMessageId) {
      const timer = setTimeout(() => {
        setHighlightedMessageId(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [highlightedMessageId]);

  // Scroll to message and highlight
  const scrollToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(messageId);
    }
  };

  // Detect quick reply tag in input
  useEffect(() => {
    if (inputValue.startsWith('/') && quickReplies.length > 0) {
      const matched = quickReplies.find(qr => 
        qr.tag.toLowerCase() === inputValue.toLowerCase()
      );
      setMatchedQuickReply(matched || null);
    } else {
      setMatchedQuickReply(null);
    }
  }, [inputValue, quickReplies]);

  // Send quick reply content
  const sendQuickReply = async (reply: QuickReply) => {
    setSendingQuickReply(true);
    setInputValue('');
    setMatchedQuickReply(null);
    
    try {
      // Send text if exists
      if (reply.text_content) {
        onSendMessage(reply.text_content);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Send image if exists
      if (reply.image_url && onSendMedia) {
        onSendMedia(reply.image_url, 'image', '');
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Send audio if exists
      if (reply.audio_url && onSendMedia) {
        onSendMedia(reply.audio_url, 'audio');
      }
    } finally {
      setSendingQuickReply(false);
    }
  };

  // Fetch avatar from WhatsApp when conversation changes
  const fetchAvatarFromWhatsApp = useCallback(async () => {
    if (!conversation || isFetchingAvatar) return;
    
    // If already has avatar from contact, use it
    if (conversation.contacts?.avatar_url) {
      setAvatarUrl(conversation.contacts.avatar_url);
      return;
    }

    setIsFetchingAvatar(true);
    try {
      // Get instance name for this WhatsApp number
      const { data: numberData } = await supabase
        .from('whatsapp_numbers')
        .select('instance_name')
        .eq('id', conversation.whatsapp_number_id)
        .single();

      if (!numberData?.instance_name) {
        setIsFetchingAvatar(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('evolution-fetch-avatar', {
        body: {
          conversationId: conversation.id,
          instanceName: numberData.instance_name,
          phone: conversation.phone,
        },
      });

      if (!error && data?.avatarUrl) {
        setAvatarUrl(data.avatarUrl);
      }
    } catch (err) {
      console.error('Error fetching avatar:', err);
    } finally {
      setIsFetchingAvatar(false);
    }
  }, [conversation, isFetchingAvatar]);

  useEffect(() => {
    if (conversation) {
      // Reset avatar when conversation changes
      setAvatarUrl(conversation.contacts?.avatar_url || null);
      // Try to fetch from WhatsApp if no avatar
      if (!conversation.contacts?.avatar_url) {
        fetchAvatarFromWhatsApp();
      }
    }
  }, [conversation?.id]);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, []);

  // Auto-scroll to bottom when messages change or on initial load
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle scroll to show/hide scroll-to-bottom button
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      setShowScrollButton(distanceFromBottom > 200);
    }
  }, []);

  useEffect(() => {
    if (conversation && inputRef.current) {
      inputRef.current.focus();
    }
  }, [conversation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isSending) return;
    onSendMessage(inputValue, replyingTo?.id);
    setInputValue('');
    setReplyingTo(null);
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
    inputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const handleForward = useCallback((message: Message) => {
    setForwardingMessage(message);
  }, []);

  const handleForwardFromGallery = useCallback((mediaUrls: string[]) => {
    setForwardingMediaUrls(mediaUrls);
  }, []);

  const handleDelete = useCallback(async (message: Message, forEveryone: boolean) => {
    if (onDeleteMessage) {
      try {
        await onDeleteMessage(message, forEveryone);
        toast.success(forEveryone ? 'Mensagem apagada para todos' : 'Mensagem apagada');
      } catch {
        toast.error('Erro ao apagar mensagem');
      }
    }
  }, [onDeleteMessage]);

  const handleForwardToConversations = useCallback(async (
    conversationIds: string[], 
    message?: Message, 
    mediaUrls?: string[]
  ) => {
    if (onForwardMessage && message) {
      await onForwardMessage(conversationIds, message);
    }
    // For gallery media URLs, we would need to handle this separately
    if (mediaUrls && mediaUrls.length > 0 && onSendMedia) {
      // This would need a different handler in the parent component
      toast.success(`Encaminhado para ${conversationIds.length} conversa(s)`);
    }
  }, [onForwardMessage, onSendMedia]);

  const getQuotedMessage = (quotedId: string | null) => {
    if (!quotedId) return null;
    return messages.find(m => m.id === quotedId || m.message_id === quotedId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      // If quick reply is matched, send it
      if (matchedQuickReply) {
        sendQuickReply(matchedQuickReply);
        return;
      }
      
      // Otherwise send normal message
      handleSubmit(e);
    }
  };

  const increaseFontSize = () => {
    if (fontSizeIndex < FONT_SIZES.length - 1) {
      setFontSizeIndex(fontSizeIndex + 1);
    }
  };

  const decreaseFontSize = () => {
    if (fontSizeIndex > 0) {
      setFontSizeIndex(fontSizeIndex - 1);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging false if leaving the main container
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0 && mediaUploaderRef.current) {
      mediaUploaderRef.current.handleDroppedFiles(files);
    }
  }, []);

  const isContactSaved = () => {
    return !!(conversation?.contact_id && conversation?.contacts?.name);
  };

  const getDisplayName = () => {
    if (!conversation) return '';
    // Only show name if contact is saved with a name
    if (conversation.contacts?.name) return conversation.contacts.name;
    if (conversation.contact_name) return conversation.contact_name;
    // Otherwise show formatted phone
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
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const currentFontSize = FONT_SIZES[fontSizeIndex].value;

  // Helper type for grouped messages
  type MessageOrImageGroup = 
    | { type: 'message'; message: Message }
    | { type: 'image-group'; messages: Message[]; fromMe: boolean };

  // Memoize message grouping to avoid recalculating on every render
  const messageGroups = useMemo(() => {
    const groups: { date: string; messages: Message[]; groupedMessages: MessageOrImageGroup[] }[] = [];
    let currentDate = '';

    messages.forEach((message) => {
      const messageDate = format(new Date(message.created_at), 'dd/MM/yyyy');
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({ date: messageDate, messages: [message], groupedMessages: [] });
      } else {
        groups[groups.length - 1].messages.push(message);
      }
    });

    // Now process each date group to combine consecutive images
    groups.forEach(group => {
      const grouped: MessageOrImageGroup[] = [];
      let imageBuffer: Message[] = [];
      let lastFromMe: boolean | null = null;

      const flushImageBuffer = () => {
        if (imageBuffer.length > 1) {
          grouped.push({ type: 'image-group', messages: [...imageBuffer], fromMe: lastFromMe ?? false });
        } else if (imageBuffer.length === 1) {
          grouped.push({ type: 'message', message: imageBuffer[0] });
        }
        imageBuffer = [];
      };

      group.messages.forEach((msg) => {
        const isImage = msg.message_type === 'image' && msg.media_url;
        
        if (isImage) {
          // If switching sender or starting fresh, flush the buffer first
          if (lastFromMe !== null && lastFromMe !== msg.from_me) {
            flushImageBuffer();
          }
          imageBuffer.push(msg);
          lastFromMe = msg.from_me;
        } else {
          // Not an image - flush any buffered images first
          flushImageBuffer();
          lastFromMe = null;
          grouped.push({ type: 'message', message: msg });
        }
      });
      
      // Flush any remaining images
      flushImageBuffer();
      
      group.groupedMessages = grouped;
    });

    return groups;
  }, [messages]);

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Send className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-medium mb-1">Selecione uma conversa</h3>
          <p className="text-sm">Escolha uma conversa para começar a enviar mensagens</p>
        </div>
      </div>
    );
  }

  const displayName = getDisplayName();

  return (
    <div 
      className="h-full flex flex-col bg-background relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-sm flex items-center justify-center border-4 border-dashed border-primary rounded-lg m-2">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
              <Upload className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-foreground">Solte os arquivos aqui</h3>
            <p className="text-sm text-muted-foreground">Imagens, vídeos ou documentos</p>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onBack}
              className="sm:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <button 
            onClick={onOpenContactInfo}
            className="flex items-center gap-3 hover:bg-muted/50 rounded-lg p-2 -ml-2 transition-colors"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={avatarUrl || conversation.contacts?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary flex items-center justify-center">
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="font-medium text-foreground">{displayName}</p>
              {isContactSaved() && (
                <p className="text-xs text-muted-foreground">
                  {formatPhoneNumber(conversation.phone)}
                </p>
              )}
            </div>
          </button>
          
          {/* Save contact button - only show if not saved */}
          {!isContactSaved() && onSaveContact && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSaveContact(conversation)}
              className="gap-1.5 text-primary hover:text-primary"
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Salvar contato</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setShowMessageSearch(true)}>
            <Search className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover border border-border shadow-lg z-50">
              <DropdownMenuLabel>Opções</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowMessageSearch(true)}>
                <Search className="h-4 w-4 mr-2" />
                Buscar mensagens
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenContactInfo}>
                Ver informações do contato
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <Type className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Tamanho da fonte</span>
                </div>
                <div className="flex items-center justify-between bg-muted/50 rounded-lg p-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={decreaseFontSize}
                    disabled={fontSizeIndex === 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">
                    {FONT_SIZES[fontSizeIndex].label}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={increaseFontSize}
                    disabled={fontSizeIndex === FONT_SIZES.length - 1}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Message Search Modal */}
      {showMessageSearch && (
        <MessageSearch
          messages={messages}
          onSelectMessage={scrollToMessage}
          onClose={() => setShowMessageSearch(false)}
        />
      )}

      {/* Messages area with background image */}
      <div className="flex-1 min-h-0 overflow-hidden relative bg-background">
        {/* Background image layer with grayscale filter and low opacity */}
        <div 
          className="absolute inset-0 bg-cover bg-center grayscale"
          style={{
            backgroundImage: `url(${chatBackground})`,
            opacity: 0.04,
          }}
        />
        <div 
          ref={scrollContainerRef}
          className="h-full overflow-y-auto relative z-10"
          onScroll={handleScroll}
        >
          <div className="space-y-4 p-4 pb-2">
            {messageGroups.map((group) => (
              <div key={group.date}>
                {/* Date separator */}
                <div className="flex items-center justify-center my-4">
                  <span className="px-3 py-1 text-xs bg-muted rounded-lg text-muted-foreground shadow-sm">
                    {group.date === format(new Date(), 'dd/MM/yyyy')
                      ? 'Hoje'
                      : group.date}
                  </span>
                </div>

                {/* Messages */}
                <div className="space-y-1 px-3">
                  {group.groupedMessages.map((item, idx) => {
                    if (item.type === 'image-group') {
                      const firstMessage = item.messages[0];
                      return (
                        <div
                          key={`gallery-${firstMessage.id}`}
                          id={`message-${firstMessage.id}`}
                          className={cn(
                            'flex w-full group transition-all duration-500 px-3',
                            item.fromMe ? 'justify-end' : 'justify-start',
                            highlightedMessageId === firstMessage.id && 'animate-pulse bg-primary/10 rounded-lg py-1'
                          )}
                        >
                          <div className={cn(
                            'flex items-start gap-1 max-w-[45%]',
                            item.fromMe ? 'flex-row-reverse' : 'flex-row'
                          )}>
                            {/* Action menu - outside the card */}
                            <MessageActionsMenu
                              message={firstMessage}
                              fromMe={item.fromMe}
                              onReply={() => handleReply(firstMessage)}
                              onForward={() => handleForward(firstMessage)}
                              onDelete={(forEveryone) => handleDelete(firstMessage, forEveryone)}
                              className="mt-2"
                            />
                            
                            <div
                              className={cn(
                                'relative rounded-lg p-2 shadow-md min-w-[140px]',
                                item.fromMe
                                  ? 'bg-primary text-primary-foreground rounded-tr-none'
                                  : 'bg-card text-card-foreground rounded-tl-none border border-border'
                              )}
                            >
                              <ImageGallery
                                images={item.messages.map(m => {
                                  // Filter out placeholder content like [image], [audio], etc.
                                  const isPlaceholder = m.content && /^\[(image|audio|video|document|sticker)\]$/i.test(m.content.trim());
                                  return {
                                    url: m.media_url || '',
                                    caption: isPlaceholder ? undefined : (m.content || undefined),
                                    filename: m.media_filename || undefined,
                                    messageId: m.id,
                                  };
                                })}
                                fromMe={item.fromMe}
                                onForward={handleForwardFromGallery}
                              />
                              <div className="flex items-center justify-end gap-1 mt-1">
                                <span className={cn(
                                  "text-[10px]",
                                  item.fromMe ? "text-black/60" : "text-muted-foreground"
                                )}>
                                  {format(new Date(item.messages[item.messages.length - 1].created_at), 'HH:mm')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    const message = item.message;
                    const quotedMessage = getQuotedMessage(message.quoted_message_id);
                    
                    return (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        quotedMessage={quotedMessage}
                        displayName={displayName}
                        fontSize={currentFontSize}
                        isHighlighted={highlightedMessageId === message.id}
                        onReply={handleReply}
                        onForward={handleForward}
                        onDelete={handleDelete}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
            
            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start pr-20">
                <div className="bg-card rounded-lg px-4 py-3 shadow-md border border-border">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 z-20 w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowDown className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Reply preview */}
      {replyingTo && (
        <div className="px-3 pt-3 pb-3 bg-card border-t border-border">
          <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
            {/* Media thumbnail preview */}
            {replyingTo.message_type === 'image' && replyingTo.media_url && (
              <div className="w-12 h-12 rounded-md overflow-hidden shrink-0 bg-background">
                <img 
                  src={replyingTo.media_url} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            {(replyingTo.message_type === 'audio' || replyingTo.message_type === 'ptt') && (
              <div className="w-12 h-12 rounded-md shrink-0 bg-primary/10 flex items-center justify-center">
                <Mic className="h-5 w-5 text-primary" />
              </div>
            )}
            {replyingTo.message_type === 'video' && replyingTo.media_url && (
              <div className="w-12 h-12 rounded-md overflow-hidden shrink-0 bg-background relative">
                <video 
                  src={replyingTo.media_url} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center">
                    <div className="w-0 h-0 border-l-[6px] border-l-primary border-y-[4px] border-y-transparent ml-0.5" />
                  </div>
                </div>
              </div>
            )}
            {replyingTo.message_type === 'document' && (
              <div className="w-12 h-12 rounded-md shrink-0 bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
            )}
            
            <div className="flex-1 border-l-4 border-primary pl-3 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-primary">
                  {replyingTo.from_me ? 'Você' : displayName}
                </p>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {format(new Date(replyingTo.created_at), 'HH:mm')}
                </span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                {replyingTo.message_type === 'image' && !replyingTo.content && (
                  <span className="flex items-center gap-1">
                    <ImageIcon className="h-3.5 w-3.5" />
                    Foto
                  </span>
                )}
                {(replyingTo.message_type === 'audio' || replyingTo.message_type === 'ptt') && (
                  <span className="flex items-center gap-1">
                    <Mic className="h-3.5 w-3.5" />
                    Mensagem de voz
                  </span>
                )}
                {replyingTo.message_type === 'video' && !replyingTo.content && (
                  <span className="flex items-center gap-1">
                    <Video className="h-3.5 w-3.5" />
                    Vídeo
                  </span>
                )}
                {replyingTo.message_type === 'document' && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    {replyingTo.media_filename || 'Documento'}
                  </span>
                )}
                {replyingTo.content && replyingTo.message_type === 'text' && replyingTo.content}
                {replyingTo.content && replyingTo.message_type !== 'text' && !['audio', 'ptt'].includes(replyingTo.message_type) && replyingTo.content}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={cancelReply}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Quick Reply Match Preview */}
      {matchedQuickReply && (
        <div className="px-3 py-3 bg-card border-t border-border">
          <div 
            className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg cursor-pointer hover:bg-primary/20 transition-colors"
            onClick={() => sendQuickReply(matchedQuickReply)}
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Send className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground">{matchedQuickReply.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {matchedQuickReply.text_content || 
                  (matchedQuickReply.image_url ? 'Imagem' : '') + 
                  (matchedQuickReply.audio_url ? ' Áudio' : '')}
              </p>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-xs text-primary font-medium">Enter para enviar</span>
              <span className="text-[10px] text-muted-foreground">ou clique</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Replies Bar */}
      {quickReplies.length > 0 && !matchedQuickReply && (
        <div className="px-3 py-2 border-t border-border bg-muted/30">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {quickReplies.map((reply) => (
              <button
                key={reply.id}
                onClick={() => setInputValue(reply.tag)}
                disabled={isSending || sendingQuickReply}
                className={cn(
                  "shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
                  "bg-background border border-border shadow-sm",
                  "hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {reply.audio_url ? (
                  <span className="w-4 h-4 flex items-center justify-center">🎤</span>
                ) : reply.image_url ? (
                  <span className="w-4 h-4 flex items-center justify-center">🖼️</span>
                ) : (
                  <span className="w-4 h-4 flex items-center justify-center">💬</span>
                )}
                <span className="max-w-[100px] truncate">{reply.name}</span>
                {reply.delay_seconds > 0 && (
                  <Clock className="w-3 h-3 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-border bg-card shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <EmojiPicker 
            onEmojiSelect={(emoji) => setInputValue(prev => prev + emoji)}
            disabled={isSending || sendingQuickReply}
          />
          <MediaUploader 
            ref={mediaUploaderRef}
            conversationId={conversation.id}
            onMediaSent={() => {}}
            disabled={isSending || sendingQuickReply}
          />
          
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma mensagem ou /tag..."
            className="flex-1 bg-muted border-none text-foreground placeholder:text-muted-foreground"
            disabled={isSending || sendingQuickReply}
          />
          
          <Button 
            type="submit" 
            size="icon" 
            disabled={!inputValue.trim() || isSending || sendingQuickReply}
            className="rounded-full bg-emerald-600 hover:bg-emerald-700"
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
      
      {/* Forward Message Dialog */}
      <ForwardMessageDialog
        isOpen={!!(forwardingMessage || forwardingMediaUrls)}
        onClose={() => {
          setForwardingMessage(null);
          setForwardingMediaUrls(null);
        }}
        message={forwardingMessage}
        mediaUrls={forwardingMediaUrls || undefined}
        conversations={allConversations}
        onForward={handleForwardToConversations}
      />
    </div>
  );
};

// Memoize the entire component to prevent unnecessary re-renders
export const ChatArea = memo(ChatAreaComponent);
