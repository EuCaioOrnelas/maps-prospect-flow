import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWhatsAppNumbers } from '@/hooks/useWhatsAppNumbers';
import { toast } from 'sonner';
import { MessageSquare, Phone } from 'lucide-react';

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartConversation: (phone: string, whatsappNumberId: string, contactName?: string) => Promise<void>;
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
  const [selectedNumber, setSelectedNumber] = useState(defaultWhatsAppNumberId || '');
  const [isStarting, setIsStarting] = useState(false);

  // Update selected number when default changes
  useState(() => {
    if (defaultWhatsAppNumberId) {
      setSelectedNumber(defaultWhatsAppNumberId);
    }
  });

  const connectedNumbers = numbers.filter((n) => n.is_connected);

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
      await onStartConversation(phone, selectedNumber, contactName || undefined);
      toast.success('Conversa iniciada!');
      onOpenChange(false);
      setPhone('');
      setContactName('');
      setSelectedNumber('');
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* WhatsApp Number Selection */}
          <div className="space-y-2">
            <Label>Número de WhatsApp</Label>
            {connectedNumbers.length === 0 ? (
              <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                Nenhum número conectado. Conecte um número na página de Disparos.
              </div>
            ) : (
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
            )}
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
            >
              {isStarting ? 'Iniciando...' : 'Iniciar Conversa'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
