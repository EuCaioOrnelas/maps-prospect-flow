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

interface MessageBubbleProps {
  message: Message;
  quotedMessage: Message | null;
  displayName: string;
  fontSize: string;
  isHighlighted: boolean;
  onReply: (message: Message) => void;
  onForward?: (message: Message) => void;
  onDelete?: (message: Message, forEveryone: boolean) => void;
  onEdit?: (message: Message) => void;
}

const getStatusIcon = (status: string, fromMe: boolean) => {
  if (!fromMe) return null;
  
  switch (status) {
    case 'pending':
      return <Clock className="h-3 w-3 text-muted-foreground/60" />;
    case 'sent':
      return <Check className="h-3 w-3 text-muted-foreground/60" />;
    case 'delivered':
      return <CheckCheck className="h-3 w-3 text-muted-foreground/60" />;
    case 'read':
      return <CheckCheck className="h-3 w-3 text-[#53bdeb]" />;
    default:
      return <Check className="h-3 w-3 text-muted-foreground/60" />;
  }
};

const MessageBubbleComponent = ({
  message,
  quotedMessage,
  displayName,
  fontSize,
  isHighlighted,
  onReply,
  onForward,
  onDelete,
  onEdit,
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
      // Regex to detect URLs
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const parts = message.content.split(urlRegex);
      
      return (
        <>
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
          {extractedUrls.slice(0, 1).map((url) => (
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

  return (
    <div
      id={`message-${message.id}`}
      className={cn(
        'flex w-full group transition-all duration-500',
        message.from_me ? 'justify-end' : 'justify-start',
        isHighlighted && 'animate-pulse bg-primary/10 rounded-lg py-1'
      )}
    >
      <div className={cn(
        'flex items-start gap-1 max-w-[45%]',
        message.from_me ? 'flex-row-reverse' : 'flex-row'
      )}>
        {/* Action menu - positioned at top */}
        <MessageActionsMenu
          message={message}
          fromMe={message.from_me}
          onReply={handleReply}
          onForward={handleForward}
          onDelete={handleDelete}
          onEdit={handleEdit}
          className="mt-2"
        />
        
        <div
          className={cn(
            'relative rounded-lg px-3 py-2 shadow-md w-full',
            message.from_me
              ? 'bg-primary text-primary-foreground rounded-tr-none'
              : 'bg-card text-card-foreground rounded-tl-none border border-border'
          )}
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
            {isEdited && (
              <span className={cn(
                "text-[10px] flex items-center gap-0.5",
                message.from_me ? "text-black/50" : "text-muted-foreground"
              )}>
                <Pencil className="h-2.5 w-2.5" />
                editado
              </span>
            )}
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
