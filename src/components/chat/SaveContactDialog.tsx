import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, UserPlus, Target } from 'lucide-react';
import type { Conversation } from '@/hooks/useChat';

interface SaveContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation | null;
  onSave: (data: { 
    name: string; 
    email?: string; 
    company?: string; 
    notes?: string;
    createLead?: boolean;
    category?: string;
  }) => Promise<void>;
}

export const SaveContactDialog = ({
  open,
  onOpenChange,
  conversation,
  onSave,
}: SaveContactDialogProps) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');
  const [createLead, setCreateLead] = useState(true);
  const [category, setCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && conversation) {
      setName(conversation.contact_name || '');
      setEmail('');
      setCompany('');
      setNotes('');
      setCreateLead(true);
      setCategory('');
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        email: email.trim() || undefined,
        company: company.trim() || undefined,
        notes: notes.trim() || undefined,
        createLead,
        category: category.trim() || undefined,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (phone.length === 13) {
      return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`;
    }
    if (phone.length === 12) {
      return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 8)}-${phone.slice(8)}`;
    }
    return phone;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Salvar Contato
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {conversation && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Telefone</p>
              <p className="font-medium">{formatPhoneNumber(conversation.phone)}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do contato"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Empresa</Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Nome da empresa"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas sobre o contato..."
              rows={3}
            />
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="createLead"
                checked={createLead}
                onCheckedChange={(checked) => setCreateLead(checked as boolean)}
              />
              <Label htmlFor="createLead" className="flex items-center gap-2 cursor-pointer">
                <Target className="h-4 w-4 text-primary" />
                Criar lead no CRM
              </Label>
            </div>
            
            {createLead && (
              <div className="mt-3 space-y-2">
                <Label htmlFor="category">Categoria/Nicho (opcional)</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: Restaurante, Clínica, Loja..."
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim() || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Contato'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
