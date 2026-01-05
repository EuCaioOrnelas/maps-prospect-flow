import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWhatsAppNumbers } from '@/hooks/useWhatsAppNumbers';
import { toast } from 'sonner';
import { MessageSquare, Phone, AlertTriangle, Send } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartConversation: (phone: string, whatsappNumberId: string, contactName?: string, initialMessage?: string) => Promise<void>;
  defaultWhatsAppNumberId?: string;
}

export const NewChatDialog = ({
  open,
  onOpenChange,
  onStartConversation,
  defaultWhatsAppNumberId,
}: NewChatDialogProps) => {
  const { numbers, loading } = useWhatsAppNumbers();
  const [phone, setPhone] = useState('');
  const [contactName, setContactName] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [selectedNumber, setSelectedNumber] = useState(defaultWhatsAppNumberId || '');
  const [isStarting, setIsStarting] = useState(false);

  const connectedNumbers = numbers.filter((n) => n.is_connected);

  // Update selected number when default changes
  useEffect(() => {
    if (defaultWhatsAppNumberId) {
      setSelectedNumber(defaultWhatsAppNumberId);
    }
  }, [defaultWhatsAppNumberId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone.trim()) {
      toast.error('Informe o número de telefone');
      return;
    }

    if (!selectedNumber) {
      toast.error('Selecione um número de WhatsApp');
      return;
    }

    setIsStarting(true);
    try {
      await onStartConversation(
        phone, 
        selectedNumber, 
        contactName || undefined,
        initialMessage.trim() || undefined
      );
      toast.success(initialMessage.trim() ? 'Conversa iniciada e mensagem enviada!' : 'Conversa iniciada!');
      onOpenChange(false);
      setPhone('');
      setContactName('');
      setInitialMessage('');
    } catch (error) {
      toast.error('Erro ao iniciar conversa');
    } finally {
      setIsStarting(false);
    }
  };

  const formatPhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Nova Conversa
          </DialogTitle>
        </DialogHeader>

        {connectedNumbers.length === 0 ? (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">
                Nenhum número conectado
              </h3>
              <p className="text-sm text-muted-foreground">
                Para iniciar conversas, você precisa conectar um número de WhatsApp primeiro.
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button asChild>
                <Link to="/whatsapp">Conectar WhatsApp</Link>
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* WhatsApp Number Selection */}
            <div className="space-y-2">
              <Label>Número de WhatsApp</Label>
              <Select value={selectedNumber} onValueChange={setSelectedNumber}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um número" />
                </SelectTrigger>
                <SelectContent>
                  {connectedNumbers.map((number) => (
                    <SelectItem key={number.id} value={number.id}>
                      {number.name} - {number.phone_number || 'Conectado'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Phone Input */}
            <div className="space-y-2">
              <Label htmlFor="phone">Número do Contato</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                  placeholder="5511999999999"
                  className="pl-9"
                  maxLength={15}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Digite o número com código do país (55 para Brasil)
              </p>
            </div>

            {/* Contact Name (optional) */}
            <div className="space-y-2">
              <Label htmlFor="contactName">Nome do Contato (opcional)</Label>
              <Input
                id="contactName"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Nome para identificar o contato"
              />
            </div>

            {/* Initial Message (optional) */}
            <div className="space-y-2">
              <Label htmlFor="initialMessage" className="flex items-center gap-2">
                <Send className="h-3.5 w-3.5" />
                Mensagem Inicial (opcional)
              </Label>
              <Textarea
                id="initialMessage"
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                placeholder="Digite uma mensagem para enviar ao iniciar a conversa..."
                className="min-h-[80px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                A mensagem será enviada automaticamente ao criar a conversa
              </p>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isStarting || !selectedNumber || !phone.trim()}
                className="gap-2"
              >
                {isStarting ? 'Iniciando...' : (
                  <>
                    {initialMessage.trim() ? <Send className="h-4 w-4" /> : null}
                    {initialMessage.trim() ? 'Enviar e Iniciar' : 'Iniciar Conversa'}
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
