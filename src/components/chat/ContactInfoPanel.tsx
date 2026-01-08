import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { X, Save, Trash2, Plus, Building, Mail, MapPin, Tag, FileText, Phone, Settings2, User, RefreshCw, Image, Users } from 'lucide-react';
import { useContacts } from '@/hooks/useContacts';
import { toast } from 'sonner';
import type { Conversation, Contact } from '@/hooks/useChat';
import { supabase } from '@/integrations/supabase/client';
import { GroupParticipantsList } from './GroupParticipantsList';

interface ContactInfoPanelProps {
  conversation: Conversation | null;
  onClose: () => void;
  onContactUpdated: () => void;
  onOpenNumbersManager?: () => void;
  onStartConversation?: (phone: string) => void;
}

export const ContactInfoPanel = ({
  conversation,
  onClose,
  onContactUpdated,
  onOpenNumbersManager,
  onStartConversation,
}: ContactInfoPanelProps) => {
  const { createContact, updateContact, getContactByPhone } = useContacts();
  const [contact, setContact] = useState<Contact | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [instanceName, setInstanceName] = useState<string | null>(null);
  const [isFetchingAvatar, setIsFetchingAvatar] = useState(false);
  const [isRedownloadingMedia, setIsRedownloadingMedia] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    origin: '',
    notes: '',
    tags: [] as string[],
  });

  // Fetch avatar from WhatsApp and get instance name
  const fetchAvatarFromWhatsApp = useCallback(async () => {
    if (!conversation || isFetchingAvatar) return;
    
    setIsFetchingAvatar(true);
    try {
      // Get instance name for this WhatsApp number
      const { data: numberData } = await supabase
        .from('whatsapp_numbers')
        .select('instance_name')
        .eq('id', conversation.whatsapp_number_id)
        .single();

      if (!numberData?.instance_name) {
        setIsFetchingAvatar(false);
        return;
      }
      
      // Store instance name for group participants
      setInstanceName(numberData.instance_name);

      // Only fetch avatar for non-group conversations
      if (!conversation.is_group) {
        const { data, error } = await supabase.functions.invoke('evolution-fetch-avatar', {
          body: {
            conversationId: conversation.id,
            instanceName: numberData.instance_name,
            phone: conversation.phone,
          },
        });

        if (!error && data?.avatarUrl) {
          setAvatarUrl(data.avatarUrl);
        }
      }
    } catch (err) {
      console.error('Error fetching avatar:', err);
    } finally {
      setIsFetchingAvatar(false);
    }
  }, [conversation, isFetchingAvatar]);

  useEffect(() => {
    if (conversation) {
      // Set initial avatar from conversation contacts
      const initialAvatar = conversation.contacts?.avatar_url || null;
      setAvatarUrl(initialAvatar);
      
      // Load contact data (may update avatar if contact has one)
      loadContact();
      
      // Fetch avatar from WhatsApp if none available
      if (!initialAvatar) {
        fetchAvatarFromWhatsApp();
      }
    }
  }, [conversation?.id]);

  const loadContact = async () => {
    if (!conversation) return;

    const existingContact = await getContactByPhone(conversation.phone);
    
    if (existingContact) {
      setContact(existingContact);
      // Use existing contact avatar or keep current fetched avatar
      if (existingContact.avatar_url) {
        setAvatarUrl(existingContact.avatar_url);
      }
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
      // Try to fetch avatar if no contact exists and no avatar yet
      if (!avatarUrl) {
        fetchAvatarFromWhatsApp();
      }
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

  const handleRedownloadMedia = async () => {
    if (!conversation) return;
    
    setIsRedownloadingMedia(true);
    try {
      const { data, error } = await supabase.functions.invoke('redownload-media', {
        body: {
          conversationId: conversation.id,
          limit: 50,
        },
      });

      if (error) throw error;

      if (data?.processed > 0) {
        toast.success(`${data.success} mídias recuperadas de ${data.processed} processadas`);
      } else {
        toast.info('Nenhuma mídia para recuperar nesta conversa');
      }
    } catch (err) {
      console.error('Error redownloading media:', err);
      toast.error('Erro ao recuperar mídias');
    } finally {
      setIsRedownloadingMedia(false);
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

  const getDisplayName = () => {
    // For groups, show group name
    if (conversation?.is_group) {
      return conversation.group_name || `Grupo ${conversation.phone.slice(-6)}`;
    }
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
        <h3 className="font-semibold text-foreground">
          {conversation.is_group ? 'Informações do Grupo' : 'Informações do Contato'}
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Avatar and Name */}
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-20 w-20 mb-3">
              <AvatarImage src={!conversation.is_group ? (avatarUrl || contact?.avatar_url || conversation.contacts?.avatar_url) : undefined} />
              <AvatarFallback className="bg-primary/10 text-primary flex items-center justify-center">
                {conversation.is_group ? <Users className="h-10 w-10" /> : <User className="h-10 w-10" />}
              </AvatarFallback>
            </Avatar>
            
            {isEditing && !conversation.is_group ? (
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nome do contato"
                className="text-center font-semibold"
              />
            ) : (
              <h4 className="font-semibold text-lg text-foreground">{displayName}</h4>
            )}
            
            {!conversation.is_group && (
              <p className="text-sm text-muted-foreground mt-1">
                {formatPhoneNumber(conversation.phone)}
              </p>
            )}
            
            {!conversation.is_group && !contact && !isEditing && (
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

          {/* Group Participants */}
          {conversation.is_group && instanceName && (
            <div className="border-t border-border pt-4">
              <GroupParticipantsList 
                instanceName={instanceName} 
                groupJid={conversation.remote_jid}
                onStartConversation={onStartConversation}
              />
            </div>
          )}

          {/* Contact Info - only for non-groups */}
          {!conversation.is_group && (isEditing || contact) && (
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
        {/* Media Recovery Button */}
        <Button 
          variant="outline" 
          className="w-full"
          onClick={handleRedownloadMedia}
          disabled={isRedownloadingMedia}
        >
          {isRedownloadingMedia ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Image className="h-4 w-4 mr-2" />
          )}
          Recuperar Mídias
        </Button>

        {/* Contact Actions */}
        {(isEditing || contact) && (
          <>
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
