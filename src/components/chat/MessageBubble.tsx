import { memo, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Check, 
  CheckCheck, 
  Clock,
  Pencil,
} from 'lucide-react';
import type { Message } from '@/hooks/useChat';
import { MediaPreview } from './MediaPreview';
import { LinkPreview } from './LinkPreview';
import { MessageActionsMenu } from './MessageActionsMenu';
import { InteractiveMessage } from './InteractiveMessage';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageFormatter } from './MessageFormatter';

interface MessageBubbleProps {
  message: Message;
  quotedMessage: Message | null;
  displayName: string;
  fontSize: string;
  isHighlighted: boolean;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onReply: (message: Message) => void;
  onForward?: (message: Message) => void;
  onDelete?: (message: Message, forEveryone: boolean) => void;
  onEdit?: (message: Message) => void;
  onSelect?: (message: Message) => void;
}

const getStatusIcon = (status: string, fromMe: boolean) => {
  if (!fromMe) return null;
  
  switch (status) {
    case 'pending':
      return <Clock className="h-3 w-3 text-white/60" />;
    case 'sent':
      return <Check className="h-3 w-3 text-white/60" />;
    case 'delivered':
      return <CheckCheck className="h-3 w-3 text-white/60" />;
    case 'read':
      return <CheckCheck className="h-3 w-3 text-whatsapp-read" />;
    default:
      return <Check className="h-3 w-3 text-white/60" />;
  }
};

const MessageBubbleComponent = ({
  message,
  quotedMessage,
  displayName,
  fontSize,
  isHighlighted,
  isSelectionMode = false,
  isSelected = false,
  onReply,
  onForward,
  onDelete,
  onEdit,
  onSelect,
}: MessageBubbleProps) => {
  const handleReply = useCallback(() => {
    onReply(message);
  }, [message, onReply]);

  const handleForward = useCallback(() => {
    onForward?.(message);
  }, [message, onForward]);

  const handleDelete = useCallback((forEveryone: boolean) => {
    onDelete?.(message, forEveryone);
  }, [message, onDelete]);

  const handleEdit = useCallback(() => {
    onEdit?.(message);
  }, [message, onEdit]);

  // Extract URLs from message content
  const extractedUrls = useMemo(() => {
    if (!message.content || message.media_url) return [];
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = message.content.match(urlRegex);
    return matches ? [...new Set(matches)] : [];
  }, [message.content, message.media_url]);

  const renderContent = () => {
    // Check if this is an interactive message (bot buttons/lists)
    const isInteractive = ['interactive', 'buttons', 'list'].includes(message.message_type);
    if (isInteractive && message.interactive) {
      return (
        <>
          <InteractiveMessage 
            interactive={message.interactive as Record<string, unknown>} 
            fromMe={message.from_me} 
          />
          {/* Also show text content if available */}
          {message.content && !message.content.startsWith('[') && (
            <div className="mt-2">
              <MessageFormatter 
                content={message.content} 
                fromMe={message.from_me} 
                fontSize={fontSize}
              />
            </div>
          )}
        </>
      );
    }

    // Check if this is a media message type (not text)
    const isMediaType = ['image', 'video', 'audio', 'ptt', 'document', 'sticker'].includes(message.message_type);
    const placeholderPattern = /^\[(image|audio|video|document|sticker|ptt)\]$/i;
    const isPlaceholderContent = message.content && placeholderPattern.test(message.content.trim());
    
    // Render media preview for media types (with or without URL)
    if (isMediaType || isPlaceholderContent) {
      const caption = message.content && !placeholderPattern.test(message.content.trim()) 
        ? message.content 
        : undefined;
      
      // Determine the media type from message_type or from placeholder content
      let mediaType = message.message_type as 'image' | 'video' | 'audio' | 'document';
      if (message.message_type === 'ptt') {
        mediaType = 'audio';
      } else if (isPlaceholderContent && message.message_type === 'text') {
        // Extract type from placeholder like [audio]
        const match = message.content?.match(/^\[(image|audio|video|document|sticker|ptt)\]$/i);
        if (match) {
          mediaType = match[1].toLowerCase() === 'ptt' ? 'audio' : match[1].toLowerCase() as 'image' | 'video' | 'audio' | 'document';
        }
      }
      
      return (
        <MediaPreview
          type={mediaType}
          url={message.media_url || undefined}
          filename={message.media_filename || undefined}
          caption={caption}
          fromMe={message.from_me}
        />
      );
    }

    if (message.content) {
      // Check if content has URLs
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const hasUrls = urlRegex.test(message.content);
      
      return (
        <>
          <MessageFormatter 
            content={message.content} 
            fromMe={message.from_me} 
            fontSize={fontSize}
          />
          {hasUrls && extractedUrls.slice(0, 1).map((url) => (
            <LinkPreview key={url} url={url} fromMe={message.from_me} />
          ))}
        </>
      );
    }

    return null;
  };

  // Check if message was edited (updated_at is different from created_at by more than 2 seconds)
  const isEdited = useMemo(() => {
    if (!message.updated_at || !message.created_at) return false;
    const created = new Date(message.created_at).getTime();
    const updated = new Date(message.updated_at).getTime();
    return updated - created > 2000; // More than 2 seconds difference
  }, [message.created_at, message.updated_at]);

  const handleClick = useCallback(() => {
    if (isSelectionMode && onSelect) {
      onSelect(message);
    }
  }, [isSelectionMode, message, onSelect]);

  return (
    <div
      id={`message-${message.id}`}
      onClick={handleClick}
      className={cn(
        'flex w-full group transition-all duration-500 px-3',
        message.from_me ? 'justify-end' : 'justify-start',
        isHighlighted && 'animate-pulse bg-primary/10 rounded-lg py-1',
        isSelectionMode && 'cursor-pointer',
        isSelected && 'bg-primary/10 rounded-lg py-1'
      )}
    >
      {/* Selection checkbox for contact messages - left edge */}
      {isSelectionMode && !message.from_me && (
        <div className="flex items-center shrink-0 mr-2">
          <Checkbox 
            checked={isSelected}
            onCheckedChange={() => onSelect?.(message)}
            className="h-5 w-5"
          />
        </div>
      )}
      
      {/* Message container - fixed alignment */}
      <div className={cn(
        'flex items-start gap-1 max-w-[85%] sm:max-w-[70%] md:max-w-[60%] lg:max-w-[50%]',
        message.from_me ? 'flex-row-reverse' : 'flex-row',
      )}>
        {/* Action menu - positioned at top (hide in selection mode) */}
        {!isSelectionMode && (
          <MessageActionsMenu
            message={message}
            fromMe={message.from_me}
            onReply={handleReply}
            onForward={handleForward}
            onDelete={handleDelete}
            onEdit={handleEdit}
            className="mt-2"
          />
        )}
        
        <div
          className={cn(
            'relative rounded-lg px-3 py-2 shadow-md min-w-0 max-w-full overflow-hidden',
            message.from_me
              ? 'bg-whatsapp-outgoing text-whatsapp-outgoing-foreground rounded-tr-none'
              : 'bg-card text-card-foreground rounded-tl-none border border-border'
          )}
        >
          {quotedMessage && (
            <div className={cn(
              'mb-2 p-2 rounded border-l-4 text-xs',
              message.from_me 
                ? 'bg-[hsl(158,37%,6%)] border-primary/70' 
                : 'bg-muted/80 border-primary/50'
            )}>
              <p className={cn(
                "font-semibold",
                message.from_me ? "text-primary" : "text-primary"
              )}>
                {quotedMessage.from_me ? 'Você' : displayName}
              </p>
              <p className={cn(
                "line-clamp-2 mt-0.5",
                message.from_me ? "text-white/70" : "text-muted-foreground"
              )}>
                {quotedMessage.content || '[Mídia]'}
              </p>
            </div>
          )}

          {renderContent()}

          <div className="flex items-center justify-end gap-1 mt-1">
            {isEdited && (
              <span className={cn(
                "text-[10px] flex items-center gap-0.5",
                message.from_me ? "text-white/70" : "text-muted-foreground"
              )}>
                <Pencil className="h-2.5 w-2.5" />
                editado
              </span>
            )}
            <span className={cn(
              "text-[10px]",
              message.from_me ? "text-white/70" : "text-muted-foreground"
            )}>
              {format(new Date(message.created_at), 'HH:mm')}
            </span>
            {getStatusIcon(message.status, message.from_me)}
          </div>
        </div>
      </div>
      
      {/* Selection checkbox for user messages - right edge */}
      {isSelectionMode && message.from_me && (
        <div className="flex items-center shrink-0 ml-2">
          <Checkbox 
            checked={isSelected}
            onCheckedChange={() => onSelect?.(message)}
            className="h-5 w-5"
          />
        </div>
      )}
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
    prevProps.quotedMessage?.id === nextProps.quotedMessage?.id &&
    prevProps.isSelectionMode === nextProps.isSelectionMode &&
    prevProps.isSelected === nextProps.isSelected
  );
});
