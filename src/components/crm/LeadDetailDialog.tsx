import { useState, useEffect } from 'react';
import { type Lead, type PipelineStage, type LeadNote, type LeadActivity, WHATSAPP_STATUS_LABELS, WHATSAPP_STATUS_COLORS, type WhatsAppStatus } from '@/hooks/useCRM';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Building2,
  Phone,
  MapPin,
  Globe,
  MessageCircle,
  Trash2,
  Save,
  Plus,
  X,
  Pencil,
  Clock,
  ExternalLink,
  DollarSign,
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
  const [activeTab, setActiveTab] = useState<'info' | 'notes' | 'history'>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newTag, setNewTag] = useState('');
  const [formData, setFormData] = useState({
    phone: '',
    company_name: '',
    contact_name: '',
    category: '',
    city: '',
    region: '',
    website: '',
    estimated_value: 0,
  });
  const [showWhatsAppOptions, setShowWhatsAppOptions] = useState(false);

  useEffect(() => {
    if (lead) {
      setFormData({
        phone: lead.phone || '',
        company_name: lead.company_name || '',
        contact_name: lead.contact_name || '',
        category: lead.category || '',
        city: lead.city || '',
        region: lead.region || '',
        website: lead.website || '',
        estimated_value: lead.estimated_value || 0,
      });
      loadNotesAndActivities();
      setIsEditing(false);
      setActiveTab('info');
      setShowWhatsAppOptions(false);
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

  const openWhatsApp = (type: 'web' | 'app') => {
    if (!lead) return;
    const phoneDigits = lead.phone.replace(/\D/g, '');
    if (type === 'web') {
      window.open(`https://web.whatsapp.com/send?phone=${encodeURIComponent(phoneDigits)}`, '_blank');
    } else {
      window.open(`https://wa.me/${encodeURIComponent(phoneDigits)}`, '_blank');
    }
    setShowWhatsAppOptions(false);
  };

  const handleValueChange = async (value: number) => {
    if (!lead) return;
    try {
      await onUpdate(lead.id, { estimated_value: value });
      toast.success('Valor atualizado!');
    } catch {
      toast.error('Erro ao atualizar valor');
    }
  };

  if (!lead) return null;

  const currentStage = stages.find(s => s.id === lead.pipeline_stage_id);
  const displayName = lead.contact_name || lead.company_name || formatPhoneNumber(lead.phone);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-5">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold text-primary-foreground shrink-0"
              style={{ backgroundColor: currentStage?.color || 'hsl(var(--primary))' }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-foreground truncate">
                {displayName}
              </h2>
              {lead.company_name && lead.contact_name && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {lead.company_name}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge 
                  className={cn("text-xs", WHATSAPP_STATUS_COLORS[lead.whatsapp_status])}
                >
                  {WHATSAPP_STATUS_LABELS[lead.whatsapp_status]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(lead.prospected_at), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-muted/30">
          <div className="relative flex-1">
            <Button 
              size="sm" 
              className="w-full"
              onClick={() => setShowWhatsAppOptions(!showWhatsAppOptions)}
            >
              <MessageCircle className="w-4 h-4 mr-1.5" />
              Conversar
            </Button>
            {showWhatsAppOptions && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                <button
                  className="w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors flex items-center gap-2"
                  onClick={() => openWhatsApp('web')}
                >
                  <Globe className="w-4 h-4" />
                  WhatsApp Web
                </button>
                <button
                  className="w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors flex items-center gap-2"
                  onClick={() => openWhatsApp('app')}
                >
                  <Phone className="w-4 h-4" />
                  WhatsApp App
                </button>
              </div>
            )}
          </div>
          
          <Select
            value={lead.pipeline_stage_id || ''}
            onValueChange={(value) => onMoveToStage(lead.id, value)}
          >
            <SelectTrigger className="w-auto min-w-[140px] h-9 text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: currentStage?.color }}
                />
                <span className="truncate">{currentStage?.name || 'Etapa'}</span>
              </div>
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

          <Select
            value={lead.whatsapp_status}
            onValueChange={(value) => handleWhatsAppStatusChange(value as WhatsAppStatus)}
          >
            <SelectTrigger className="w-auto min-w-[120px] h-9 text-sm">
              <span className="truncate">{WHATSAPP_STATUS_LABELS[lead.whatsapp_status]}</span>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(WHATSAPP_STATUS_LABELS) as WhatsAppStatus[]).map((status) => (
                <SelectItem key={status} value={status}>
                  {WHATSAPP_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border">
          {[
            { id: 'info', label: 'Informações' },
            { id: 'notes', label: `Notas (${notes.length})` },
            { id: 'history', label: 'Histórico' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium transition-colors relative",
                activeTab === tab.id 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {/* Info Tab */}
            {activeTab === 'info' && (
              <div className="space-y-5">
                {isEditing ? (
                  <div className="space-y-4">
                    {/* Phone */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Telefone</label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^\d+]/g, '') })}
                        placeholder="+5511999999999"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Empresa</label>
                        <Input
                          value={formData.company_name}
                          onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                          placeholder="Nome da empresa"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Contato</label>
                        <Input
                          value={formData.contact_name}
                          onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                          placeholder="Nome do contato"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Cidade</label>
                        <Input
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          placeholder="Cidade"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Região</label>
                        <Input
                          value={formData.region}
                          onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                          placeholder="Região"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Website</label>
                      <Input
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={handleSave} className="flex-1">
                        <Save className="w-4 h-4 mr-1" /> Salvar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Contact Details */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contato</span>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setIsEditing(true)}>
                          <Pencil className="w-3 h-3 mr-1" />
                          Editar
                        </Button>
                      </div>
                      
                      <div className="bg-muted/40 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="font-medium">{formatPhoneNumber(lead.phone)}</span>
                        </div>
                        
                        {(lead.city || lead.region) && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4 shrink-0" />
                            <span>{[lead.city, lead.region].filter(Boolean).join(', ')}</span>
                          </div>
                        )}
                        
                        {lead.website && (
                          <div className="flex items-center gap-2 text-sm">
                            <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                            <a 
                              href={lead.website} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-primary hover:underline truncate flex items-center gap-1"
                            >
                              {lead.website.replace(/^https?:\/\//, '')}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}

                        {lead.google_maps_link && (
                          <a 
                            href={lead.google_maps_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                          >
                            <MapPin className="w-3 h-3" />
                            Ver no Google Maps
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Negotiation Value - Prominent */}
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor da Negociação</span>
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <DollarSign className="w-5 h-5 text-primary" />
                          <Input
                            type="number"
                            value={lead.estimated_value || 0}
                            onChange={(e) => handleValueChange(parseFloat(e.target.value) || 0)}
                            className="text-lg font-semibold border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                            placeholder="0,00"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tags</span>
                      <div className="flex flex-wrap gap-1.5">
                        {(lead.tags || []).map((tag, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-xs pl-2 pr-1 py-0.5 gap-1"
                          >
                            {tag}
                            <button 
                              onClick={() => handleRemoveTag(tag)}
                              className="hover:bg-destructive/20 rounded p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                        <div className="flex gap-1">
                          <Input
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            placeholder="Nova tag..."
                            className="h-7 text-xs w-24"
                            onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                          />
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={handleAddTag}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="pt-3 border-t border-border">
                      <div className="text-xs text-muted-foreground">
                        Origem: {lead.origin}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Notes Tab */}
            {activeTab === 'notes' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Escreva uma nota..."
                    className="text-sm min-h-[80px] resize-none"
                  />
                </div>
                <Button size="sm" onClick={handleAddNote} className="w-full" disabled={!newNote.trim()}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar
                </Button>

                <div className="space-y-2">
                  {notes.map((note) => (
                    <div key={note.id} className="bg-muted/40 rounded-lg p-3">
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(note.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  ))}
                  {notes.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Nenhuma nota adicionada
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-1">
                {activities.slice(0, 10).map((activity, index) => (
                  <div 
                    key={activity.id} 
                    className={cn(
                      "flex gap-3 py-3",
                      index !== activities.slice(0, 10).length - 1 && "border-b border-border/50"
                    )}
                  >
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(activity.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nenhuma movimentação registrada
                  </p>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-muted/20">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
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
