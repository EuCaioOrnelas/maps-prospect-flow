import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import type { Message } from '@/hooks/useChat';

interface EditMessageDialogProps {
  message: Message | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (messageId: string, newContent: string) => Promise<void>;
}

export const EditMessageDialog = ({
  message,
  isOpen,
  onClose,
  onSave,
}: EditMessageDialogProps) => {
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (message?.content) {
      setContent(message.content);
    }
  }, [message]);

  const handleSave = async () => {
    if (!message || !content.trim()) return;
    
    setIsSaving(true);
    try {
      await onSave(message.id, content.trim());
      onClose();
    } catch (error) {
      console.error('Error editing message:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar mensagem</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite a nova mensagem..."
            className="min-h-[100px] resize-none"
            autoFocus
          />
          <p className="text-xs text-muted-foreground mt-2">
            Pressione Enter para salvar, Shift+Enter para nova linha
          </p>
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !content.trim()}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
