import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { X, Save, Trash2, Plus, Building, Mail, MapPin, Tag, FileText, Phone, Settings2 } from 'lucide-react';
import { useContacts } from '@/hooks/useContacts';
import { toast } from 'sonner';
import type { Conversation, Contact } from '@/hooks/useChat';

interface ContactInfoPanelProps {
  conversation: Conversation | null;
  onClose: () => void;
  onContactUpdated: () => void;
  onOpenNumbersManager?: () => void;
}

export const ContactInfoPanel = ({
  conversation,
  onClose,
  onContactUpdated,
  onOpenNumbersManager,
}: ContactInfoPanelProps) => {
  const { createContact, updateContact, getContactByPhone } = useContacts();
  const [contact, setContact] = useState<Contact | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newTag, setNewTag] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    origin: '',
    notes: '',
    tags: [] as string[],
  });

  useEffect(() => {
    if (conversation) {
      loadContact();
    }
  }, [conversation]);

  const loadContact = async () => {
    if (!conversation) return;

    const existingContact = await getContactByPhone(conversation.phone);
    
    if (existingContact) {
      setContact(existingContact);
      setFormData({
        name: existingContact.name || '',
        email: existingContact.email || '',
        company: existingContact.company || '',
        origin: existingContact.origin || '',
        notes: existingContact.notes || '',
        tags: existingContact.tags || [],
      });
    } else {
      setContact(null);
      setFormData({
        name: conversation.contact_name || '',
        email: '',
        company: '',
        origin: '',
        notes: '',
        tags: [],
      });
    }
  };

  const handleSave = async () => {
    if (!conversation) return;

    setIsSaving(true);
    try {
      if (contact) {
        await updateContact(contact.id, formData);
        toast.success('Contato atualizado!');
      } else {
        await createContact({
          phone: conversation.phone,
          ...formData,
        });
        toast.success('Contato salvo!');
      }
      await loadContact();
      onContactUpdated();
      setIsEditing(false);
    } catch (error) {
      toast.error('Erro ao salvar contato');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
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

  const getDisplayName = () => {
    if (formData.name) return formData.name;
    if (conversation?.contact_name) return conversation.contact_name;
    return 'Contato Desconhecido';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!conversation) return null;

  const displayName = getDisplayName();

  return (
    <div className="h-full flex flex-col border-l border-border bg-card w-80">
      {/* Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-border">
        <h3 className="font-semibold text-foreground">Informações do Contato</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Avatar and Name */}
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-20 w-20 mb-3">
              <AvatarImage src={contact?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            
            {isEditing ? (
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nome do contato"
                className="text-center font-semibold"
              />
            ) : (
              <h4 className="font-semibold text-lg text-foreground">{displayName}</h4>
            )}
            
            <p className="text-sm text-muted-foreground mt-1">
              {formatPhoneNumber(conversation.phone)}
            </p>
            
            {!contact && !isEditing && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => setIsEditing(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Salvar Contato
              </Button>
            )}
          </div>

          {/* Contact Info */}
          {(isEditing || contact) && (
            <div className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                  />
                ) : (
                  <p className="text-sm text-foreground">{contact?.email || '-'}</p>
                )}
              </div>

              {/* Company */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Building className="h-4 w-4" />
                  Empresa
                </Label>
                {isEditing ? (
                  <Input
                    value={formData.company}
                    onChange={(e) => setFormData((prev) => ({ ...prev, company: e.target.value }))}
                    placeholder="Nome da empresa"
                  />
                ) : (
                  <p className="text-sm text-foreground">{contact?.company || '-'}</p>
                )}
              </div>

              {/* Origin */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Origem do Lead
                </Label>
                {isEditing ? (
                  <Input
                    value={formData.origin}
                    onChange={(e) => setFormData((prev) => ({ ...prev, origin: e.target.value }))}
                    placeholder="Ex: Google Meu Negócio, Campanha..."
                  />
                ) : (
                  <p className="text-sm text-foreground">{contact?.origin || '-'}</p>
                )}
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Tag className="h-4 w-4" />
                  Tags
                </Label>
                <div className="flex flex-wrap gap-1">
                  {formData.tags.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => isEditing && handleRemoveTag(tag)}
                    >
                      {tag}
                      {isEditing && <X className="h-3 w-3 ml-1" />}
                    </Badge>
                  ))}
                  {formData.tags.length === 0 && !isEditing && (
                    <p className="text-sm text-muted-foreground">Sem tags</p>
                  )}
                </div>
                {isEditing && (
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Nova tag"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    />
                    <Button type="button" size="sm" onClick={handleAddTag}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Observações
                </Label>
                {isEditing ? (
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Anotações sobre o contato..."
                    rows={4}
                  />
                ) : (
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {contact?.notes || '-'}
                  </p>
                )}
              </div>

              {/* Created At */}
              {contact && (
                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Contato criado em {format(new Date(contact.created_at), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="p-4 border-t border-border space-y-3">
        {/* Manage Numbers Button */}
        {onOpenNumbersManager && (
          <Button 
            variant="outline" 
            className="w-full gap-2"
            onClick={onOpenNumbersManager}
          >
            <Settings2 className="h-4 w-4" />
            Gerenciar Números Conectados
          </Button>
        )}
        
        {/* Contact Actions */}
        {(isEditing || contact) && (
          <>
            {onOpenNumbersManager && <Separator />}
            {isEditing ? (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setIsEditing(false);
                    loadContact();
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setIsEditing(true)}
              >
                Editar Contato
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
