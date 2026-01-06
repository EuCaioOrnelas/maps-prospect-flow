import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Zap, Clock, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuickReply } from '@/hooks/useQuickReplies';

interface QuickRepliesBarProps {
  quickReplies: QuickReply[];
  onSend: (content: string, delay?: number) => void;
  isSending: boolean;
}

export const QuickRepliesBar = ({ quickReplies, onSend, isSending }: QuickRepliesBarProps) => {
  const [selectedReply, setSelectedReply] = useState<QuickReply | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const handleClick = (reply: QuickReply) => {
    setSelectedReply(reply);
    setIsConfirmOpen(true);
  };

  const handleConfirmSend = () => {
    if (!selectedReply || !selectedReply.text_content) return;

    const delay = selectedReply.delay_seconds || 0;

    if (delay > 0) {
      setCountdown(delay);
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            onSend(selectedReply.text_content!, 0);
            setIsConfirmOpen(false);
            setSelectedReply(null);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      onSend(selectedReply.text_content, 0);
      setIsConfirmOpen(false);
      setSelectedReply(null);
    }
  };

  const handleCancel = () => {
    setCountdown(null);
    setIsConfirmOpen(false);
    setSelectedReply(null);
  };

  if (quickReplies.length === 0) return null;

  return (
    <>
      <div className="px-4 py-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">Respostas Rápidas</span>
        </div>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2">
            {quickReplies.map((reply) => (
              <Button
                key={reply.id}
                variant="outline"
                size="sm"
                onClick={() => handleClick(reply)}
                disabled={isSending}
                className={cn(
                  "shrink-0 gap-1.5 h-8 text-xs",
                  "hover:bg-primary/10 hover:border-primary/30"
                )}
              >
                <Badge variant="secondary" className="font-mono text-[10px] px-1 py-0">
                  {reply.tag}
                </Badge>
                <span className="max-w-[100px] truncate">{reply.name}</span>
                {reply.delay_seconds > 0 && (
                  <Clock className="w-3 h-3 text-muted-foreground" />
                )}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <Dialog open={isConfirmOpen} onOpenChange={(open) => !countdown && setIsConfirmOpen(open)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Confirmar Envio
            </DialogTitle>
            <DialogDescription>
              {countdown !== null 
                ? `Enviando em ${countdown} segundos...`
                : 'Deseja enviar esta resposta rápida?'}
            </DialogDescription>
          </DialogHeader>

          {selectedReply && (
            <div className="space-y-3 py-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono">
                  {selectedReply.tag}
                </Badge>
                <span className="font-medium">{selectedReply.name}</span>
              </div>
              
              <div className="p-3 rounded-lg bg-muted text-sm">
                <p className="whitespace-pre-wrap">{selectedReply.text_content}</p>
              </div>

              {selectedReply.delay_seconds > 0 && countdown === null && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Será enviado com delay de {selectedReply.delay_seconds}s</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={countdown !== null && countdown > 1}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmSend} disabled={isSending || countdown !== null}>
              {countdown !== null ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando em {countdown}s
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Agora
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
