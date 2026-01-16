import { memo, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatPhoneNumber } from '@/lib/phoneUtils';
import { 
  Check, 
  CheckCheck, 
  Clock,
  Pencil,
  User,
  Loader2,
  Image as ImageIcon,
  Video,
  Mic,
  FileText,
} from 'lucide-react';
import type { Message } from '@/hooks/useChat';
import { MediaPreview } from './MediaPreview';
import { LinkPreview } from './LinkPreview';
import { MessageActionsMenu } from './MessageActionsMenu';
import { InteractiveMessage } from './InteractiveMessage';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageFormatter } from './MessageFormatter';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useGroupMemberAvatar } from '@/hooks/useGroupMemberAvatar';

interface MessageBubbleProps {
  message: Message;
  quotedMessage: Message | null;
  displayName: string;
  fontSize: string;
  isHighlighted: boolean;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  isDeleting?: boolean;
  isGroup?: boolean;
  instanceName?: string | null;
  isLoadingQuoted?: boolean;
  onReply: (message: Message) => void;
  onForward?: (message: Message) => void;
  onDelete?: (message: Message, forEveryone: boolean) => void;
  onEdit?: (message: Message) => void;
  onSelect?: (message: Message) => void;
  onScrollToMessage?: (messageId: string) => void;
}

// Format sender phone for groups - uses centralized utility
const formatSenderPhone = (phone: string | null): string => {
  if (!phone) return 'Desconhecido';
  return formatPhoneNumber(phone);
};

const getStatusIcon = (status: string, fromMe: boolean) => {
  if (!fromMe) return null;
  
  switch (status) {
    case 'pending':
      return (
        <div className="h-3 w-3 flex items-center justify-center">
          <div className="h-2 w-2 border border-white/60 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    case 'failed':
      return <Clock className="h-3 w-3 text-destructive" />;
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
  isDeleting = false,
  isGroup = false,
  instanceName = null,
  isLoadingQuoted = false,
  onReply,
  onForward,
  onDelete,
  onEdit,
  onSelect,
  onScrollToMessage,
}: MessageBubbleProps) => {
  // Fetch avatar for group member
  const { avatarUrl: memberAvatarUrl } = useGroupMemberAvatar(
    instanceName,
    message.sender_jid,
    isGroup && !message.from_me
  );
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

  // Show deleting overlay
  if (isDeleting) {
    return (
      <div
        id={`message-${message.id}`}
        className={cn(
          'flex w-full px-3',
          message.from_me ? 'justify-end' : 'justify-start',
        )}
      >
        <div className={cn(
          'relative rounded-lg px-3 py-2 shadow-md min-w-[100px] flex items-center justify-center gap-2',
          message.from_me
            ? 'bg-whatsapp-outgoing/50 text-whatsapp-outgoing-foreground rounded-tr-none'
            : 'bg-card/50 text-card-foreground rounded-tl-none border border-border'
        )}>
          <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="text-xs opacity-70">Apagando...</span>
        </div>
      </div>
    );
  }

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
      
      {/* Avatar for group messages - only for received messages */}
      {isGroup && !message.from_me && (
        <Avatar className="h-8 w-8 shrink-0 mr-1 mt-1">
          {memberAvatarUrl && (
            <AvatarImage src={memberAvatarUrl} alt="Avatar" />
          )}
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
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
            'relative rounded-lg px-3 py-2 shadow-md min-w-0 max-w-full overflow-hidden break-words',
            message.from_me
              ? 'bg-whatsapp-outgoing text-whatsapp-outgoing-foreground rounded-tr-none'
              : 'bg-card text-card-foreground rounded-tl-none border border-border'
          )}
          style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
        >
          {/* Sender name for group messages */}
          {isGroup && !message.from_me && (
            <p className="text-xs font-semibold text-primary mb-1 truncate">
              {message.sender_name || formatSenderPhone(message.sender_jid)}
            </p>
          )}
          {/* Loading state for quoted message being fetched */}
          {isLoadingQuoted && !quotedMessage && message.quoted_message_id && (
            <div className={cn(
              'mb-2 p-2 rounded border-l-4 text-xs flex items-center gap-2',
              message.from_me 
                ? 'bg-[hsl(158,37%,6%)] border-primary/70' 
                : 'bg-muted/80 border-primary/50'
            )}>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className={cn(
                message.from_me ? "text-white/70" : "text-muted-foreground"
              )}>
                Carregando mensagem...
              </span>
            </div>
          )}
          {quotedMessage && (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                if (onScrollToMessage && quotedMessage.id) {
                  onScrollToMessage(quotedMessage.id);
                }
              }}
              className={cn(
                'mb-2 p-2 rounded border-l-4 text-xs flex gap-2 cursor-pointer hover:opacity-80 transition-opacity active:scale-[0.98]',
                message.from_me 
                  ? 'bg-[hsl(158,37%,6%)] border-primary/70' 
                  : 'bg-muted/80 border-primary/50'
              )}
            >
              {/* Media thumbnail or icon for quoted message */}
              {quotedMessage.media_url && ['image', 'video', 'sticker'].includes(quotedMessage.message_type) && (
                <div className="shrink-0 w-12 h-12 rounded overflow-hidden bg-black/20">
                  <img 
                    src={quotedMessage.media_url} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              {quotedMessage.message_type === 'audio' && !quotedMessage.media_url && (
                <div className="shrink-0 w-10 h-10 rounded bg-primary/20 flex items-center justify-center">
                  <Mic className="h-5 w-5 text-primary" />
                </div>
              )}
              {quotedMessage.message_type === 'document' && (
                <div className="shrink-0 w-10 h-10 rounded bg-primary/20 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-semibold",
                  message.from_me ? "text-primary" : "text-primary"
                )}>
                  {quotedMessage.from_me ? 'Você' : displayName}
                </p>
                <p className={cn(
                  "line-clamp-2 mt-0.5 flex items-center gap-1",
                  message.from_me ? "text-white/70" : "text-muted-foreground"
                )}>
                  {/* Show media type icon inline if there's media but no text content */}
                  {quotedMessage.message_type === 'image' && !quotedMessage.content && (
                    <>
                      <ImageIcon className="h-3 w-3 inline shrink-0" />
                      <span>Foto</span>
                    </>
                  )}
                  {quotedMessage.message_type === 'video' && !quotedMessage.content && (
                    <>
                      <Video className="h-3 w-3 inline shrink-0" />
                      <span>Vídeo</span>
                    </>
                  )}
                  {(quotedMessage.message_type === 'audio' || quotedMessage.message_type === 'ptt') && (
                    <>
                      <Mic className="h-3 w-3 inline shrink-0" />
                      <span>Áudio</span>
                    </>
                  )}
                  {quotedMessage.message_type === 'document' && (
                    <>
                      <FileText className="h-3 w-3 inline shrink-0" />
                      <span>{quotedMessage.media_filename || 'Documento'}</span>
                    </>
                  )}
                  {quotedMessage.message_type === 'sticker' && !quotedMessage.content && (
                    <span>Figurinha</span>
                  )}
                  {/* Show content if available, with media type prefix if it's a caption */}
                  {quotedMessage.content && (
                    <span className="truncate">
                      {['image', 'video'].includes(quotedMessage.message_type) && (
                        <span className="inline-flex items-center gap-1">
                          {quotedMessage.message_type === 'image' && <ImageIcon className="h-3 w-3 inline shrink-0" />}
                          {quotedMessage.message_type === 'video' && <Video className="h-3 w-3 inline shrink-0" />}
                        </span>
                      )}
                      {quotedMessage.content}
                    </span>
                  )}
                  {/* Fallback for unknown types */}
                  {!quotedMessage.content && !['image', 'video', 'audio', 'ptt', 'document', 'sticker'].includes(quotedMessage.message_type) && (
                    <span>[Mensagem]</span>
                  )}
                </p>
              </div>
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
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isDeleting === nextProps.isDeleting &&
    prevProps.isLoadingQuoted === nextProps.isLoadingQuoted &&
    prevProps.onScrollToMessage === nextProps.onScrollToMessage
  );
});
