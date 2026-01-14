import { useState, useEffect } from 'react';
import { type Lead, type PipelineStage, type LeadNote, type LeadActivity, WHATSAPP_STATUS_LABELS, WHATSAPP_STATUS_COLORS, type WhatsAppStatus } from '@/hooks/useCRM';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Building2,
  User,
  Phone,
  MapPin,
  Globe,
  Tag,
  MessageCircle,
  Calendar,
  Trash2,
  Save,
  Plus,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface LeadDetailDialogProps {
  lead: Lead | null;
  stages: PipelineStage[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, updates: Partial<Lead>) => Promise<Lead | null>;
  onDelete: (id: string) => Promise<void>;
  onMoveToStage: (leadId: string, stageId: string) => Promise<void>;
  onAddNote: (leadId: string, content: string) => Promise<LeadNote | null>;
  onFetchNotes: (leadId: string) => Promise<LeadNote[]>;
  onFetchActivities: (leadId: string) => Promise<LeadActivity[]>;
}

// Format phone number for display
const formatPhoneNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 11 && digits.startsWith('55')) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  return `+${digits}`;
};

export const LeadDetailDialog = ({
  lead,
  stages,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  onMoveToStage,
  onAddNote,
  onFetchNotes,
  onFetchActivities,
}: LeadDetailDialogProps) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newTag, setNewTag] = useState('');
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    category: '',
    city: '',
    region: '',
    website: '',
    estimated_value: 0,
  });

  useEffect(() => {
    if (lead) {
      setFormData({
        company_name: lead.company_name || '',
        contact_name: lead.contact_name || '',
        category: lead.category || '',
        city: lead.city || '',
        region: lead.region || '',
        website: lead.website || '',
        estimated_value: lead.estimated_value || 0,
      });
      loadNotesAndActivities();
    }
  }, [lead?.id]);

  const loadNotesAndActivities = async () => {
    if (!lead) return;
    const [notesData, activitiesData] = await Promise.all([
      onFetchNotes(lead.id),
      onFetchActivities(lead.id),
    ]);
    setNotes(notesData);
    setActivities(activitiesData);
  };

  const handleSave = async () => {
    if (!lead) return;
    try {
      await onUpdate(lead.id, formData);
      setIsEditing(false);
      toast.success('Lead atualizado!');
    } catch {
      toast.error('Erro ao atualizar lead');
    }
  };

  const handleAddNote = async () => {
    if (!lead || !newNote.trim()) return;
    try {
      await onAddNote(lead.id, newNote);
      setNewNote('');
      loadNotesAndActivities();
      toast.success('Nota adicionada!');
    } catch {
      toast.error('Erro ao adicionar nota');
    }
  };

  const handleAddTag = async () => {
    if (!lead || !newTag.trim()) return;
    const updatedTags = [...(lead.tags || []), newTag.trim()];
    try {
      await onUpdate(lead.id, { tags: updatedTags });
      setNewTag('');
      toast.success('Tag adicionada!');
    } catch {
      toast.error('Erro ao adicionar tag');
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!lead) return;
    const updatedTags = (lead.tags || []).filter(tag => tag !== tagToRemove);
    try {
      await onUpdate(lead.id, { tags: updatedTags });
      toast.success('Tag removida!');
    } catch {
      toast.error('Erro ao remover tag');
    }
  };

  const handleWhatsAppStatusChange = async (status: WhatsAppStatus) => {
    if (!lead) return;
    try {
      await onUpdate(lead.id, { whatsapp_status: status });
      toast.success('Status atualizado!');
    } catch {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDelete = async () => {
    if (!lead) return;
    if (!confirm('Tem certeza que deseja excluir este lead?')) return;
    try {
      await onDelete(lead.id);
      onOpenChange(false);
      toast.success('Lead excluído!');
    } catch {
      toast.error('Erro ao excluir lead');
    }
  };

  const handleOpenChat = () => {
    if (!lead) return;
    if (lead.conversation_id) {
      navigate(`/chat?conversation=${lead.conversation_id}`);
    } else {
      navigate(`/chat?phone=${lead.phone}`);
    }
  };

  if (!lead) return null;

  const currentStage = stages.find(s => s.id === lead.pipeline_stage_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <span className="truncate">
                {lead.contact_name || lead.company_name || formatPhoneNumber(lead.phone)}
              </span>
              {(lead.contact_name && lead.company_name) && (
                <p className="text-sm font-normal text-muted-foreground truncate">{lead.company_name}</p>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-4 p-6">
            {/* Stage Selector */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Etapa do Pipeline
                </label>
                <Select
                  value={lead.pipeline_stage_id || ''}
                  onValueChange={(value) => onMoveToStage(lead.id, value)}
                >
                  <SelectTrigger className="focus:ring-offset-0">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: currentStage?.color }}
                        />
                        {currentStage?.name || 'Selecionar etapa'}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: stage.color }}
                          />
                          {stage.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* WhatsApp Status */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Status WhatsApp
                </label>
                <Select
                  value={lead.whatsapp_status}
                  onValueChange={(value) => handleWhatsAppStatusChange(value as WhatsAppStatus)}
                >
                  <SelectTrigger className="focus:ring-offset-0">
                    <SelectValue>
                      <Badge className={cn("text-xs", WHATSAPP_STATUS_COLORS[lead.whatsapp_status])}>
                        {WHATSAPP_STATUS_LABELS[lead.whatsapp_status]}
                      </Badge>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(WHATSAPP_STATUS_LABELS) as WhatsAppStatus[]).map((status) => (
                      <SelectItem key={status} value={status}>
                        <Badge className={cn("text-xs", WHATSAPP_STATUS_COLORS[status])}>
                          {WHATSAPP_STATUS_LABELS[status]}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button 
                variant="default" 
                size="sm" 
                className="flex-1"
                onClick={handleOpenChat}
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                Abrir Chat
              </Button>
              {lead.google_maps_link && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(lead.google_maps_link!, '_blank')}
                >
                  <MapPin className="w-4 h-4" />
                </Button>
              )}
              {lead.website && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(lead.website!, '_blank')}
                >
                  <Globe className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="info" className="flex-1">Info</TabsTrigger>
                <TabsTrigger value="notes" className="flex-1">Notas</TabsTrigger>
                <TabsTrigger value="history" className="flex-1">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Empresa</label>
                        <Input
                          value={formData.company_name}
                          onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                          placeholder="Nome da empresa"
                          className="focus:ring-offset-0"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Contato</label>
                        <Input
                          value={formData.contact_name}
                          onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                          placeholder="Nome do contato"
                          className="focus:ring-offset-0"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                      <Input
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="Categoria/Nicho"
                        className="focus:ring-offset-0"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Cidade</label>
                        <Input
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          placeholder="Cidade"
                          className="focus:ring-offset-0"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Região</label>
                        <Input
                          value={formData.region}
                          onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                          placeholder="Região"
                          className="focus:ring-offset-0"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Website</label>
                        <Input
                          value={formData.website}
                          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                          placeholder="https://..."
                          className="focus:ring-offset-0"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Valor Estimado (R$)</label>
                        <Input
                          type="number"
                          value={formData.estimated_value}
                          onChange={(e) => setFormData({ ...formData, estimated_value: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00"
                          className="focus:ring-offset-0"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSave} className="flex-1">
                        <Save className="w-4 h-4 mr-1" /> Salvar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{formatPhoneNumber(lead.phone)}</span>
                      </div>
                      {lead.company_name && (
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <span>{lead.company_name}</span>
                        </div>
                      )}
                      {lead.contact_name && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>{lead.contact_name}</span>
                        </div>
                      )}
                      {(lead.city || lead.region) && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span>{[lead.city, lead.region].filter(Boolean).join(', ')}</span>
                        </div>
                      )}
                      {lead.category && (
                        <div className="flex items-center gap-2 text-sm">
                          <Tag className="w-4 h-4 text-muted-foreground" />
                          <span>{lead.category}</span>
                        </div>
                      )}
                      {lead.website && (
                        <div className="flex items-center gap-2 text-sm">
                          <Globe className="w-4 h-4 text-muted-foreground" />
                          <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                            {lead.website}
                          </a>
                        </div>
                      )}
                    </div>
                    {lead.estimated_value > 0 && (
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <span>R$ {lead.estimated_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          Prospectado {formatDistanceToNow(new Date(lead.prospected_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                      <span>Origem: {lead.origin}</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="w-full">
                      Editar informações
                    </Button>
                  </div>
                )}

                {/* Tags */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Tags</label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(lead.tags || []).map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs cursor-pointer hover:bg-destructive/20"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Nova tag"
                      className="text-sm focus:ring-offset-0"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    />
                    <Button size="sm" variant="outline" onClick={handleAddTag}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="notes" className="space-y-4 mt-4">
                <div className="flex gap-2">
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Adicionar nota..."
                    className="text-sm min-h-[80px] focus:ring-offset-0"
                  />
                </div>
                <Button size="sm" onClick={handleAddNote} className="w-full">
                  <Plus className="w-4 h-4 mr-1" /> Adicionar Nota
                </Button>

                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {notes.map((note) => (
                    <div key={note.id} className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(note.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  ))}
                  {notes.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma nota adicionada
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="history" className="space-y-4 mt-4">
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {activities.slice(0, 10).map((activity) => (
                    <div key={activity.id} className="flex gap-3 text-sm border-l-2 border-primary/30 pl-3 py-1">
                      <div className="flex-1">
                        <p className="text-foreground">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(activity.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {activities.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma movimentação registrada
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border">
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Excluir Lead
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};