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
  onSendMessage: (content: string) => void;
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
  onSendMessage,
  onOpenContactInfo,
  onBack,
}: ChatAreaProps) => {
  const [inputValue, setInputValue] = useState('');
  const [fontSizeIndex, setFontSizeIndex] = useState(1); // Default to 'Normal'
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
    onSendMessage(inputValue);
    setInputValue('');
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-3 w-3 text-muted-foreground" />;
      case 'sent':
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-400" />;
      default:
        return null;
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
      <div className="h-full flex items-center justify-center bg-muted/30">
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

      {/* Messages - WhatsApp-like background */}
      <div 
        className="flex-1 overflow-hidden relative bg-[#efeae2] dark:bg-[#0b141a]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%239C92AC' fill-opacity='0.05'/%3E%3C/svg%3E")`,
        }}
      >
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          <div className="space-y-4 max-w-3xl mx-auto pb-2">
            {messageGroups.map((group) => (
              <div key={group.date}>
                {/* Date separator */}
                <div className="flex items-center justify-center my-4">
                  <span className="px-3 py-1 text-xs bg-card/90 backdrop-blur-sm rounded-lg text-muted-foreground shadow-sm">
                    {group.date === format(new Date(), 'dd/MM/yyyy')
                      ? 'Hoje'
                      : group.date}
                  </span>
                </div>

                {/* Messages */}
                <div className="space-y-1">
                  {group.messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'flex w-full',
                        message.from_me ? 'justify-end pl-12' : 'justify-start pr-12'
                      )}
                    >
                      <div
                        className={cn(
                          'relative max-w-[85%] sm:max-w-[70%] rounded-lg px-3 py-2 shadow-md',
                          message.from_me
                            ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-foreground rounded-tr-none'
                            : 'bg-card text-foreground rounded-tl-none'
                        )}
                      >
                        {/* Message tail */}
                        <div
                          className={cn(
                            'absolute top-0 w-3 h-3',
                            message.from_me
                              ? 'right-0 -mr-2 border-l-8 border-l-[#d9fdd3] dark:border-l-[#005c4b] border-t-8 border-t-transparent border-b-8 border-b-transparent'
                              : 'left-0 -ml-2 border-r-8 border-r-card border-t-8 border-t-transparent border-b-8 border-b-transparent'
                          )}
                          style={{ 
                            clipPath: message.from_me 
                              ? 'polygon(0 0, 100% 0, 0 100%)' 
                              : 'polygon(100% 0, 0 0, 100% 100%)'
                          }}
                        />

                        {renderMessageContent(message)}

                        <div className={cn(
                          'flex items-center justify-end gap-1 mt-1',
                          message.from_me ? 'text-muted-foreground' : 'text-muted-foreground'
                        )}>
                          <span className="text-[10px]">
                            {format(new Date(message.created_at), 'HH:mm')}
                          </span>
                          {message.from_me && getStatusIcon(message.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

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
            className="flex-1 bg-muted/50"
            disabled={isSending}
          />
          
          <Button 
            type="submit" 
            size="icon" 
            disabled={!inputValue.trim() || isSending}
            className="rounded-full"
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
};
