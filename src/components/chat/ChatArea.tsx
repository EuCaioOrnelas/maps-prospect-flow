import { useRef, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { 
  Send, 
  Check, 
  CheckCheck, 
  Clock,
  MoreVertical,
  Minus,
  Plus,
  Type,
  ArrowLeft,
  X,
  Reply,
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
import { MediaUploader } from './MediaUploader';
import { EmojiPicker } from './EmojiPicker';
import { MediaPreview } from './MediaPreview';

interface ChatAreaProps {
  conversation: Conversation | null;
  messages: Message[];
  isSending: boolean;
  isTyping?: boolean;
  onSendMessage: (content: string, quotedMessageId?: string) => void;
  onOpenContactInfo: () => void;
  onBack?: () => void;
}

const FONT_SIZES = [
  { label: 'Pequeno', value: 'text-xs' },
  { label: 'Normal', value: 'text-sm' },
  { label: 'Grande', value: 'text-base' },
  { label: 'Muito grande', value: 'text-lg' },
];

export const ChatArea = ({
  conversation,
  messages,
  isSending,
  isTyping = false,
  onSendMessage,
  onOpenContactInfo,
  onBack,
}: ChatAreaProps) => {
  const [inputValue, setInputValue] = useState('');
  const [fontSizeIndex, setFontSizeIndex] = useState(1);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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

  const getQuotedMessage = (quotedId: string | null) => {
    if (!quotedId) return null;
    return messages.find(m => m.id === quotedId || m.message_id === quotedId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
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

  const getDisplayName = () => {
    if (!conversation) return '';
    if (conversation.contacts?.name) return conversation.contacts.name;
    if (conversation.contact_name) return conversation.contact_name;
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

  const getStatusIcon = (status: string, fromMe: boolean) => {
    if (!fromMe) return null;
    
    switch (status) {
      case 'pending':
        return <Clock className="h-3 w-3 text-black/60" />;
      case 'sent':
        // Um check = enviado para o servidor
        return <Check className="h-3 w-3 text-black/60" />;
      case 'delivered':
        // Dois checks = entregue ao destinatário
        return <CheckCheck className="h-3 w-3 text-black/60" />;
      case 'read':
        // Dois checks azuis = lido pelo destinatário
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      default:
        return <Check className="h-3 w-3 text-black/60" />;
    }
  };

  const currentFontSize = FONT_SIZES[fontSizeIndex].value;

  const renderMessageContent = (message: Message) => {
    // If message has media URL, render media preview
    if (message.media_url && message.message_type !== 'text') {
      return (
        <MediaPreview
          type={message.message_type as 'image' | 'video' | 'audio' | 'document'}
          url={message.media_url}
          filename={message.media_filename || undefined}
          caption={message.content || undefined}
          fromMe={message.from_me}
        />
      );
    }

    // Text message
    if (message.content) {
      return (
        <p className={cn('whitespace-pre-wrap break-words', currentFontSize)}>
          {message.content}
        </p>
      );
    }

    return null;
  };

  const groupMessagesByDate = () => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';

    messages.forEach((message) => {
      const messageDate = format(new Date(message.created_at), 'dd/MM/yyyy');
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({ date: messageDate, messages: [message] });
      } else {
        groups[groups.length - 1].messages.push(message);
      }
    });

    return groups;
  };

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
  const messageGroups = groupMessagesByDate();

  return (
    <div className="h-full flex flex-col bg-background">
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
              <AvatarImage src={conversation.contacts?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="font-medium text-foreground">{displayName}</p>
              <p className="text-xs text-muted-foreground">
                {formatPhoneNumber(conversation.phone)}
              </p>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover border border-border shadow-lg z-50">
              <DropdownMenuLabel>Opções</DropdownMenuLabel>
              <DropdownMenuSeparator />
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

      {/* Messages area with subtle pattern background */}
      <div 
        className="flex-1 overflow-hidden relative"
        style={{
          backgroundColor: 'hsl(var(--background))',
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          <div className="space-y-4 pb-2">
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
                <div className="space-y-1">
                  {group.messages.map((message) => {
                    const quotedMessage = getQuotedMessage(message.quoted_message_id);
                    
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          'flex w-full group',
                          message.from_me ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div className="flex items-center gap-1">
                          {/* Reply button - only show for received messages on hover */}
                          {!message.from_me && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleReply(message)}
                            >
                              <Reply className="h-3 w-3" />
                            </Button>
                          )}
                          
                          <div
                            className={cn(
                              'relative max-w-[85%] sm:max-w-[75%] rounded-lg px-3 py-2 shadow-md',
                              message.from_me
                                ? 'bg-primary text-primary-foreground rounded-tr-none'
                                : 'bg-card text-card-foreground rounded-tl-none border border-border'
                            )}
                          >
                            {/* Quoted message preview */}
                            {quotedMessage && (
                              <div className={cn(
                                'mb-2 p-2 rounded border-l-4 text-xs',
                                message.from_me 
                                  ? 'bg-primary/80 border-primary-foreground/50' 
                                  : 'bg-muted border-muted-foreground/50'
                              )}>
                                <p className="font-medium text-primary">
                                  {quotedMessage.from_me ? 'Você' : displayName}
                                </p>
                                <p className="text-muted-foreground line-clamp-2">
                                  {quotedMessage.content || '[Mídia]'}
                                </p>
                              </div>
                            )}

                            {renderMessageContent(message)}

                            <div className="flex items-center justify-end gap-1 mt-1">
                              <span className={cn(
                                "text-[10px]",
                                message.from_me ? "text-black/60" : "text-muted-foreground"
                              )}>
                                {format(new Date(message.created_at), 'HH:mm')}
                              </span>
                              {getStatusIcon(message.status, message.from_me)}
                            </div>
                          </div>
                          
                          {/* Reply button - only show for sent messages on hover */}
                          {message.from_me && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleReply(message)}
                            >
                              <Reply className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
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
        </ScrollArea>
      </div>

      {/* Reply preview */}
      {replyingTo && (
        <div className="px-3 pt-2 bg-card border-t border-border">
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
            <div className="flex-1 border-l-4 border-primary pl-2">
              <p className="text-xs font-medium text-primary">
                {replyingTo.from_me ? 'Você' : displayName}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {replyingTo.content || '[Mídia]'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={cancelReply}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-border bg-card shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <EmojiPicker 
            onEmojiSelect={(emoji) => setInputValue(prev => prev + emoji)}
            disabled={isSending}
          />
          <MediaUploader 
            conversationId={conversation.id}
            onMediaSent={() => {}}
            disabled={isSending}
          />
          
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma mensagem..."
            className="flex-1 bg-muted border-none text-foreground placeholder:text-muted-foreground"
            disabled={isSending}
          />
          
          <Button 
            type="submit" 
            size="icon" 
            disabled={!inputValue.trim() || isSending}
            className="rounded-full bg-emerald-600 hover:bg-emerald-700"
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
};
