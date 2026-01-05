import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Phone, MessageSquare, AlertTriangle, Send, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useWhatsAppNumbers } from '@/hooks/useWhatsAppNumbers';
import { Link } from 'react-router-dom';
import { CountryCodeSelect } from './CountryCodeSelect';
import { supabase } from '@/integrations/supabase/client';

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartConversation: (phone: string, whatsappNumberId: string, contactName?: string, initialMessage?: string) => Promise<any>;
  defaultWhatsAppNumberId?: string;
  existingConversations?: Array<{ id: string; phone: string; whatsapp_number_id: string }>;
  onSelectExistingConversation?: (conversationId: string, initialMessage?: string) => void;
}

export const NewChatDialog = ({
  open,
  onOpenChange,
  onStartConversation,
  defaultWhatsAppNumberId,
  existingConversations = [],
  onSelectExistingConversation,
}: NewChatDialogProps) => {
  const { numbers, loading } = useWhatsAppNumbers();
  const [countryCode, setCountryCode] = useState('55');
  const [phone, setPhone] = useState('');
  const [contactName, setContactName] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [selectedNumber, setSelectedNumber] = useState(defaultWhatsAppNumberId || '');
  const [isStarting, setIsStarting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string } | null>(null);

  const [existingConversationFound, setExistingConversationFound] = useState<{ id: string; phone: string } | null>(null);

  const connectedNumbers = numbers.filter((n) => n.is_connected);
  const fullPhone = `${countryCode}${phone}`;

  // Check if phone already exists in conversations (normalize by last 10-11 digits)
  const findExistingConversation = (phoneToCheck: string) => {
    const normalizedPhone = phoneToCheck.replace(/\D/g, '').slice(-11);
    return existingConversations.find(conv => {
      const convNormalized = conv.phone.replace(/\D/g, '').slice(-11);
      return convNormalized === normalizedPhone && conv.whatsapp_number_id === selectedNumber;
    });
  };

  // Update selected number when default changes
  useEffect(() => {
    if (defaultWhatsAppNumberId) {
      setSelectedNumber(defaultWhatsAppNumberId);
    }
  }, [defaultWhatsAppNumberId]);

  // Reset validation and check for existing conversation when phone or country code changes
  useEffect(() => {
    setValidationResult(null);
    setExistingConversationFound(null);
    
    if (phone.length >= 10 && selectedNumber) {
      const existing = findExistingConversation(fullPhone);
      if (existing) {
        setExistingConversationFound(existing);
      }
    }
  }, [phone, countryCode, selectedNumber, existingConversations]);

  const validateNumber = async () => {
    if (!phone.trim() || phone.length < 10) {
      toast.error('Digite um número válido com DDD');
      return;
    }

    if (!selectedNumber) {
      toast.error('Selecione um número de WhatsApp primeiro');
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('chat-validate-number', {
        body: {
          phone: fullPhone,
          whatsappNumberId: selectedNumber,
        },
      });

      if (error) throw error;

      setValidationResult({
        valid: data.valid,
        message: data.message || (data.valid ? 'Número válido' : 'Número inválido'),
      });

      if (!data.valid) {
        toast.error(data.message || 'Este número não está registrado no WhatsApp');
      } else {
        toast.success('Número válido no WhatsApp!');
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Erro ao validar número');
      setValidationResult({ valid: false, message: 'Erro ao validar' });
    } finally {
      setIsValidating(false);
    }
  };

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

    // Check if conversation already exists - if so, use existing
    if (existingConversationFound && onSelectExistingConversation) {
      setIsStarting(true);
      try {
        await onSelectExistingConversation(existingConversationFound.id, initialMessage.trim() || undefined);
        toast.success(initialMessage.trim() ? 'Mensagem enviada!' : 'Conversa selecionada!');
        onOpenChange(false);
        setPhone('');
        setContactName('');
        setInitialMessage('');
        setValidationResult(null);
        setExistingConversationFound(null);
      } catch (error) {
        toast.error('Erro ao enviar mensagem');
      } finally {
        setIsStarting(false);
      }
      return;
    }

    // If not validated yet, validate first
    if (!validationResult) {
      setIsValidating(true);
      try {
        const { data, error } = await supabase.functions.invoke('chat-validate-number', {
          body: {
            phone: fullPhone,
            whatsappNumberId: selectedNumber,
          },
        });

        if (error) throw error;

        if (!data.valid) {
          toast.error(data.message || 'Este número não está registrado no WhatsApp');
          setValidationResult({ valid: false, message: data.message });
          setIsValidating(false);
          return;
        }

        setValidationResult({ valid: true, message: 'Número válido' });
      } catch (error) {
        console.error('Validation error:', error);
        // Continue anyway if validation fails
      } finally {
        setIsValidating(false);
      }
    } else if (!validationResult.valid) {
      toast.error('O número informado não está registrado no WhatsApp');
      return;
    }

    setIsStarting(true);
    try {
      await onStartConversation(
        fullPhone, 
        selectedNumber, 
        contactName || undefined,
        initialMessage.trim() || undefined
      );
      toast.success(initialMessage.trim() ? 'Conversa iniciada e mensagem enviada!' : 'Conversa iniciada!');
      onOpenChange(false);
      setPhone('');
      setContactName('');
      setInitialMessage('');
      setValidationResult(null);
      setExistingConversationFound(null);
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

            {/* Phone Input with Country Code */}
            <div className="space-y-2">
              <Label htmlFor="phone">Número do Contato</Label>
              <div className="flex gap-2">
                <CountryCodeSelect 
                  value={countryCode} 
                  onValueChange={setCountryCode} 
                />
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                    placeholder="11999999999"
                    className="pl-9 pr-10"
                    maxLength={12}
                  />
                  {validationResult && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {validationResult.valid ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={validateNumber}
                  disabled={isValidating || !phone.trim() || !selectedNumber}
                  className="shrink-0"
                >
                  {isValidating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Validar'
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  DDD + número (ex: 11999999999)
                </p>
                {phone.length >= 10 && (
                  <p className="text-xs text-muted-foreground">
                    +{fullPhone}
                  </p>
                )}
              </div>
              {existingConversationFound && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  ⚠️ Já existe uma conversa com este número. A mensagem será enviada para a conversa existente.
                </p>
              )}
              {validationResult && !existingConversationFound && (
                <p className={`text-xs ${validationResult.valid ? 'text-green-600' : 'text-red-500'}`}>
                  {validationResult.message}
                </p>
              )}
            </div>

            {/* Contact Name (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="contactName">Nome do Contato (Opcional)</Label>
              <Input
                id="contactName"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Ex: João Silva"
                maxLength={100}
              />
            </div>

            {/* Initial Message (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="initialMessage">Mensagem Inicial (Opcional)</Label>
              <Textarea
                id="initialMessage"
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                placeholder="Digite uma mensagem para enviar ao iniciar a conversa..."
                className="min-h-[80px] resize-none"
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">
                Esta mensagem será enviada automaticamente ao criar a conversa
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="flex-1 gap-2"
                disabled={isStarting || isValidating || !phone.trim() || !selectedNumber}
              >
                {isStarting || isValidating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isValidating ? 'Validando...' : 'Iniciando...'}
                  </>
                ) : initialMessage.trim() ? (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar Mensagem
                  </>
                ) : (
                  'Iniciar Conversa'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
