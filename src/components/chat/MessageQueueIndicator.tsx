import { memo } from 'react';
import { X, RefreshCw, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { QueuedMessage } from '@/hooks/useMessageQueue';

interface MessageQueueIndicatorProps {
  queue: QueuedMessage[];
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
}

const StatusIcon = ({ status }: { status: QueuedMessage['status'] }) => {
  switch (status) {
    case 'queued':
      return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
    case 'uploading':
      return <Loader2 className="h-3 w-3 animate-spin text-primary" />;
    case 'sending':
      return <Loader2 className="h-3 w-3 animate-spin text-primary" />;
    case 'sent':
      return <Check className="h-3 w-3 text-green-500" />;
    case 'failed':
      return <AlertCircle className="h-3 w-3 text-destructive" />;
    default:
      return null;
  }
};

const MessageQueueIndicatorComponent = ({ 
  queue, 
  onRetry, 
  onCancel 
}: MessageQueueIndicatorProps) => {
  const pendingMessages = queue.filter(m => 
    m.status === 'queued' || m.status === 'uploading' || m.status === 'sending'
  );
  const failedMessages = queue.filter(m => m.status === 'failed');

  if (pendingMessages.length === 0 && failedMessages.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 px-4">
      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-2 space-y-1 max-h-32 overflow-y-auto">
        {/* Pending messages */}
        {pendingMessages.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-2 py-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>
              Enviando {pendingMessages.length} mensage{pendingMessages.length > 1 ? 'ns' : 'm'}...
            </span>
          </div>
        )}

        {/* Failed messages */}
        {failedMessages.map((msg) => (
          <div 
            key={msg.id}
            className={cn(
              "flex items-center gap-2 px-2 py-1 rounded-md",
              "bg-destructive/10 text-destructive text-xs"
            )}
          >
            <StatusIcon status={msg.status} />
            <span className="flex-1 truncate">
              {msg.content?.slice(0, 30) || `[${msg.messageType}]`}
              {msg.content && msg.content.length > 30 && '...'}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => onRetry(msg.id)}
              title="Tentar novamente"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => onCancel(msg.id)}
              title="Cancelar"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export const MessageQueueIndicator = memo(MessageQueueIndicatorComponent);
