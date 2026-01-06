import { memo } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
  ChevronDown,
  Reply,
  Copy,
  Forward,
  Trash2,
  Pencil,
  Users,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from '@/hooks/useChat';
import { toast } from 'sonner';

interface MessageActionsMenuProps {
  message: Message;
  fromMe: boolean;
  onReply: () => void;
  onForward: () => void;
  onDelete: (forEveryone: boolean) => void;
  onEdit?: () => void;
  className?: string;
}

const MessageActionsMenuComponent = ({
  message,
  fromMe,
  onReply,
  onForward,
  onDelete,
  onEdit,
  className,
}: MessageActionsMenuProps) => {
  const handleCopy = async () => {
    if (message.content) {
      try {
        await navigator.clipboard.writeText(message.content);
        toast.success('Mensagem copiada');
      } catch {
        toast.error('Erro ao copiar mensagem');
      }
    } else if (message.media_url) {
      try {
        await navigator.clipboard.writeText(message.media_url);
        toast.success('Link da mídia copiado');
      } catch {
        toast.error('Erro ao copiar');
      }
    }
  };

  const canEdit = fromMe && message.message_type === 'text' && message.content;
  const canCopy = message.content || message.media_url;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity",
            "hover:bg-black/10 dark:hover:bg-white/10",
            className
          )}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align={fromMe ? "end" : "start"} 
        side="top"
        className="w-48 bg-popover border border-border shadow-lg z-50"
      >
        <DropdownMenuItem onClick={onReply} className="gap-2 cursor-pointer">
          <Reply className="h-4 w-4" />
          Responder
        </DropdownMenuItem>
        
        {canCopy && (
          <DropdownMenuItem onClick={handleCopy} className="gap-2 cursor-pointer">
            <Copy className="h-4 w-4" />
            Copiar
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem onClick={onForward} className="gap-2 cursor-pointer">
          <Forward className="h-4 w-4" />
          Encaminhar
        </DropdownMenuItem>
        
        {canEdit && onEdit && (
          <DropdownMenuItem onClick={onEdit} className="gap-2 cursor-pointer">
            <Pencil className="h-4 w-4" />
            Editar
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => onDelete(false)} 
          className="gap-2 cursor-pointer text-destructive focus:text-destructive"
        >
          <User className="h-4 w-4" />
          Apagar para mim
        </DropdownMenuItem>
        
        {fromMe && (
          <DropdownMenuItem 
            onClick={() => onDelete(true)} 
            className="gap-2 cursor-pointer text-destructive focus:text-destructive"
          >
            <Users className="h-4 w-4" />
            Apagar para todos
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const MessageActionsMenu = memo(MessageActionsMenuComponent);
