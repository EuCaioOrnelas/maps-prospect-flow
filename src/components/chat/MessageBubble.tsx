import { memo, useCallback } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Check, 
  CheckCheck, 
  Clock,
  Reply,
} from 'lucide-react';
import type { Message } from '@/hooks/useChat';
import { MediaPreview } from './MediaPreview';

interface MessageBubbleProps {
  message: Message;
  quotedMessage: Message | null;
  displayName: string;
  fontSize: string;
  isHighlighted: boolean;
  onReply: (message: Message) => void;
}

const getStatusIcon = (status: string, fromMe: boolean) => {
  if (!fromMe) return null;
  
  switch (status) {
    case 'pending':
      return <Clock className="h-3 w-3 text-black/60" />;
    case 'sent':
      return <Check className="h-3 w-3 text-black/60" />;
    case 'delivered':
      return <CheckCheck className="h-3 w-3 text-black/60" />;
    case 'read':
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    default:
      return <Check className="h-3 w-3 text-black/60" />;
  }
};

const MessageBubbleComponent = ({
  message,
  quotedMessage,
  displayName,
  fontSize,
  isHighlighted,
  onReply,
}: MessageBubbleProps) => {
  const handleReply = useCallback(() => {
    onReply(message);
  }, [message, onReply]);

  const renderContent = () => {
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

  if (message.content) {
      // Regex to detect URLs
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const parts = message.content.split(urlRegex);
      
      return (
        <p className={cn('whitespace-pre-wrap break-words', fontSize)}>
          {parts.map((part, index) => {
            if (urlRegex.test(part)) {
              return (
                <a
                  key={index}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'underline hover:opacity-80 transition-opacity',
                    message.from_me ? 'text-primary-foreground' : 'text-primary'
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  {part}
                </a>
              );
            }
            return part;
          })}
        </p>
      );
    }

    return null;
  };

  return (
    <div
      id={`message-${message.id}`}
      className={cn(
        'flex w-full group transition-all duration-500',
        message.from_me ? 'justify-end pl-8 sm:pl-16' : 'justify-start pr-8 sm:pr-16',
        isHighlighted && 'animate-pulse bg-primary/10 rounded-lg py-1'
      )}
    >
      <div className={cn(
        'flex items-center gap-1',
        message.from_me ? 'flex-row-reverse' : 'flex-row'
      )}>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={handleReply}
        >
          <Reply className="h-3 w-3" />
        </Button>
        
        <div
          className={cn(
            'relative rounded-lg px-3 py-2 shadow-md min-w-[80px]',
            message.from_me
              ? 'bg-primary text-primary-foreground rounded-tr-none'
              : 'bg-card text-card-foreground rounded-tl-none border border-border'
          )}
          style={{ maxWidth: 'min(85%, 480px)' }}
        >
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

          {renderContent()}

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
      </div>
    </div>
  );
};

export const MessageBubble = memo(MessageBubbleComponent, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.status === nextProps.message.status &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.fontSize === nextProps.fontSize &&
    prevProps.isHighlighted === nextProps.isHighlighted &&
    prevProps.quotedMessage?.id === nextProps.quotedMessage?.id
  );
});
