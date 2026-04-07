import { useState, useEffect } from 'react';
import { type Lead, type PipelineStage, type LeadNote, type LeadActivity, WHATSAPP_STATUS_LABELS, WHATSAPP_STATUS_COLORS, type WhatsAppStatus } from '@/hooks/useCRM';
import { cn } from '@/lib/utils';
import { formatPhoneNumber } from '@/lib/phoneUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  X,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Globe,
  Tag,
  MessageCircle,
  Calendar,
  Activity,
  FileText,
  Send,
  ExternalLink,
  Trash2,
  Save,
  Plus,
  Pencil,
  Trophy,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface LeadDetailPanelProps {
  lead: Lead;
  stages: PipelineStage[];
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Lead>) => Promise<Lead | null>;
  onDelete: (id: string) => Promise<void>;
  onMoveToStage: (leadId: string, stageId: string) => Promise<void>;
  onAddNote: (leadId: string, content: string) => Promise<LeadNote | null>;
  onFetchNotes: (leadId: string) => Promise<LeadNote[]>;
  onFetchActivities: (leadId: string) => Promise<LeadActivity[]>;
}

// Editable Field Component
const EditableField = ({ 
  icon, 
  label, 
  value, 
  placeholder, 
  onChange, 
  onSave,
  compact = false,
  isLink = false
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  placeholder: string; 
  onChange: (value: string) => void; 
  onSave: () => void;
  compact?: boolean;
  isLink?: boolean;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSave = () => {
    onChange(localValue);
    onSave();
    setIsEditing(false);
    toast.success('Atualizado!');
  };

  if (isEditing) {
    return (
      <div className={cn("flex items-center gap-2", compact ? "" : "py-2 border-b border-border/50")}>
        {icon}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <Input
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') {
                  setLocalValue(value);
                  setIsEditing(false);
                }
              }}
              className="h-7 text-sm"
              autoFocus
            />
            <Button size="icon" variant="ghost" onClick={handleSave} className="h-7 w-7 shrink-0">
              <Save className="w-3 h-3" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => { setLocalValue(value); setIsEditing(false); }} className="h-7 w-7 shrink-0">
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded-md transition-colors group",
        compact ? "p-1" : "py-2 px-1 border-b border-border/50"
      )}
      onClick={() => setIsEditing(true)}
    >
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {value ? (
          isLink ? (
            <a 
              href={value.startsWith('http') ? value : `https://${value}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-sm text-primary hover:underline truncate block"
              onClick={(e) => e.stopPropagation()}
            >
              {value}
            </a>
          ) : (
            <p className="text-sm font-medium truncate">{value}</p>
          )
        ) : (
          <p className="text-sm text-muted-foreground/60 italic">{placeholder}</p>
        )}
      </div>
      <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </div>
  );
};

// Editable Currency Field Component
const EditableCurrencyField = ({ 
  label, 
  value, 
  onChange, 
  onSave 
}: { 
  label: string; 
  value: number; 
  onChange: (value: number) => void; 
  onSave: () => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [displayValue, setDisplayValue] = useState(
    value > 0 ? value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''
  );

  useEffect(() => {
    setDisplayValue(
      value > 0 ? value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''
    );
  }, [value]);

  const formatCurrency = (val: string) => {
    const numbers = val.replace(/\D/g, '');
    const numValue = parseInt(numbers) / 100;
    if (isNaN(numValue) || numValue === 0) return '';
    return numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCurrency = (val: string) => {
    const numbers = val.replace(/\D/g, '');
    return parseInt(numbers) / 100 || 0;
  };

  const handleSave = () => {
    onChange(parseCurrency(displayValue));
    onSave();
    setIsEditing(false);
    toast.success('Atualizado!');
  };

  if (isEditing) {
    return (
      <div className="py-2 border-b border-border/50">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <div className="flex items-center gap-1">
          <div className="relative flex-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
            <Input
              value={displayValue}
              onChange={(e) => setDisplayValue(formatCurrency(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') {
                  setDisplayValue(value > 0 ? value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '');
                  setIsEditing(false);
                }
              }}
              className="h-7 text-sm pl-8"
              placeholder="0,00"
              autoFocus
            />
          </div>
          <Button size="icon" variant="ghost" onClick={handleSave} className="h-7 w-7 shrink-0">
            <Save className="w-3 h-3" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => { 
            setDisplayValue(value > 0 ? value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''); 
            setIsEditing(false); 
          }} className="h-7 w-7 shrink-0">
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded-md transition-colors group py-2 px-1 border-b border-border/50"
      onClick={() => setIsEditing(true)}
    >
      <div className="w-4 h-4 flex items-center justify-center text-muted-foreground text-sm font-medium">R$</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {value > 0 ? (
          <p className="text-sm font-medium text-primary">
            R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground/60 italic">Adicionar valor</p>
        )}
      </div>
      <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </div>
  );
};

// formatPhoneNumber is now imported from '@/lib/phoneUtils'

export const LeadDetailPanel = ({
  lead,
  stages,
  onClose,
  onUpdate,
  onDelete,
  onMoveToStage,
  onAddNote,
  onFetchNotes,
  onFetchActivities,
}: LeadDetailPanelProps) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState(lead.contact_name || '');
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newTag, setNewTag] = useState('');
  const [formData, setFormData] = useState({
    company_name: lead.company_name || '',
    contact_name: lead.contact_name || '',
    email: lead.email || '',
    category: lead.category || '',
    city: lead.city || '',
    region: lead.region || '',
    website: lead.website || '',
    estimated_value: lead.estimated_value || 0,
  });

  // Update editingName when lead changes
  useEffect(() => {
    setEditingName(lead.contact_name || '');
  }, [lead.contact_name]);

  useEffect(() => {
    loadNotesAndActivities();
  }, [lead.id]);

  const loadNotesAndActivities = async () => {
    const [notesData, activitiesData] = await Promise.all([
      onFetchNotes(lead.id),
      onFetchActivities(lead.id),
    ]);
    setNotes(notesData);
    setActivities(activitiesData);
  };

  const handleSave = async () => {
    try {
      await onUpdate(lead.id, formData);
      setIsEditing(false);
      toast.success('Lead atualizado!');
    } catch {
      toast.error('Erro ao atualizar lead');
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
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
    if (!newTag.trim()) return;
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
    const updatedTags = (lead.tags || []).filter(tag => tag !== tagToRemove);
    try {
      await onUpdate(lead.id, { tags: updatedTags });
      toast.success('Tag removida!');
    } catch {
      toast.error('Erro ao remover tag');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este lead?')) return;
    try {
      await onDelete(lead.id);
      onClose();
      toast.success('Lead excluído!');
    } catch {
      toast.error('Erro ao excluir lead');
    }
  };

  const handleOpenChat = () => {
    if (lead.conversation_id) {
      navigate(`/chat?conversation=${lead.conversation_id}`);
    } else {
      navigate(`/chat?phone=${lead.phone}`);
    }
  };

  const currentStage = stages.find(s => s.id === lead.pipeline_stage_id);

  const handleSaveName = async () => {
    if (editingName.trim()) {
      try {
        await onUpdate(lead.id, { contact_name: editingName.trim() });
        setIsEditingName(false);
        toast.success('Nome atualizado!');
      } catch {
        toast.error('Erro ao atualizar nome');
      }
    }
  };

  return (
    <div className="w-96 bg-card border-l border-border h-full flex flex-col">
      {/* Header with editable name */}
      <div className="p-4 border-b border-border relative">
        {/* Close button - always visible */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="absolute top-3 right-3 h-8 w-8"
        >
          <X className="w-4 h-4" />
        </Button>
        
        {/* Name section - separate and prominent */}
        <div className="pr-10">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') {
                    setIsEditingName(false);
                    setEditingName(lead.contact_name || '');
                  }
                }}
                className="h-9 text-base font-semibold flex-1"
                placeholder="Nome do contato"
                autoFocus
              />
              <Button size="icon" variant="ghost" onClick={handleSaveName} className="h-9 w-9 text-primary hover:text-primary hover:bg-primary/10 shrink-0">
                <Save className="w-4 h-4" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => {
                  setIsEditingName(false);
                  setEditingName(lead.contact_name || '');
                }}
                className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-lg truncate flex-1">
                {lead.contact_name || lead.company_name || formatPhoneNumber(lead.phone)}
              </h2>
              <div className="flex items-center gap-1.5 bg-primary/10 px-2 py-1 rounded-full shrink-0">
                <Trophy className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold text-primary">{lead.ai_score || 0}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsEditingName(true)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
          )}
          {!isEditingName && (lead.contact_name && lead.company_name) && (
            <p className="text-sm text-muted-foreground truncate">{lead.company_name}</p>
          )}
          {!isEditingName && !lead.contact_name && (
            <button 
              onClick={() => setIsEditingName(true)}
              className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
            >
              <Plus className="w-3 h-3" />
              Adicionar nome do contato
            </button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Stage Selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Etapa do Pipeline
            </label>
            <Select
              value={lead.pipeline_stage_id || ''}
              onValueChange={(value) => onMoveToStage(lead.id, value)}
            >
              <SelectTrigger>
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

          {/* Score + WhatsApp Status */}
          <div className="flex items-center gap-3">
            {/* WhatsApp Status */}
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Status WhatsApp
              </label>
              <Badge className={cn("text-xs", WHATSAPP_STATUS_COLORS[lead.whatsapp_status])}>
                {WHATSAPP_STATUS_LABELS[lead.whatsapp_status]}
              </Badge>
            </div>
            {/* Score */}
            <div className="text-right">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Score</label>
              <div className="flex items-center gap-1.5 justify-end">
                <Trophy className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm font-bold text-primary">{lead.ai_score || 0}</span>
              </div>
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

          {/* All Lead Information - Always Visible */}
          <div className="space-y-4">
            {/* Contact Info Section */}
            <div className="space-y-3 bg-muted/30 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informações de Contato</h3>
              
              <div className="flex items-center gap-3 py-2 border-b border-border/50">
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Telefone</p>
                  <p className="text-sm font-medium truncate">{formatPhoneNumber(lead.phone)}</p>
                </div>
              </div>

              <EditableField
                icon={<Mail className="w-4 h-4 text-muted-foreground" />}
                label="Email"
                value={formData.email}
                placeholder="Adicionar email"
                onChange={(value) => setFormData({ ...formData, email: value })}
                onSave={() => onUpdate(lead.id, { email: formData.email } as Partial<Lead>)}
              />

              <EditableField
                icon={<Building2 className="w-4 h-4 text-muted-foreground" />}
                label="Empresa"
                value={formData.company_name}
                placeholder="Adicionar empresa"
                onChange={(value) => setFormData({ ...formData, company_name: value })}
                onSave={() => onUpdate(lead.id, { company_name: formData.company_name })}
              />

              <EditableField
                icon={<User className="w-4 h-4 text-muted-foreground" />}
                label="Contato"
                value={formData.contact_name}
                placeholder="Adicionar contato"
                onChange={(value) => setFormData({ ...formData, contact_name: value })}
                onSave={() => onUpdate(lead.id, { contact_name: formData.contact_name })}
              />
            </div>

            {/* Location Section */}
            <div className="space-y-3 bg-muted/30 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Localização</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <EditableField
                  icon={<MapPin className="w-4 h-4 text-muted-foreground" />}
                  label="Cidade"
                  value={formData.city}
                  placeholder="Adicionar cidade"
                  onChange={(value) => setFormData({ ...formData, city: value })}
                  onSave={() => onUpdate(lead.id, { city: formData.city })}
                  compact
                />

                <EditableField
                  icon={<MapPin className="w-4 h-4 text-muted-foreground" />}
                  label="Região"
                  value={formData.region}
                  placeholder="Adicionar região"
                  onChange={(value) => setFormData({ ...formData, region: value })}
                  onSave={() => onUpdate(lead.id, { region: formData.region })}
                  compact
                />
              </div>
            </div>

            {/* Business Info Section */}
            <div className="space-y-3 bg-muted/30 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informações do Negócio</h3>
              
              <EditableField
                icon={<Tag className="w-4 h-4 text-muted-foreground" />}
                label="Categoria/Nicho"
                value={formData.category}
                placeholder="Adicionar categoria"
                onChange={(value) => setFormData({ ...formData, category: value })}
                onSave={() => onUpdate(lead.id, { category: formData.category })}
              />

              <EditableField
                icon={<Globe className="w-4 h-4 text-muted-foreground" />}
                label="Website"
                value={formData.website}
                placeholder="Adicionar website"
                onChange={(value) => setFormData({ ...formData, website: value })}
                onSave={() => onUpdate(lead.id, { website: formData.website })}
                isLink
              />

              <EditableCurrencyField
                label="Valor da Negociação"
                value={formData.estimated_value}
                onChange={(value) => setFormData({ ...formData, estimated_value: value })}
                onSave={() => onUpdate(lead.id, { estimated_value: formData.estimated_value })}
              />
            </div>

            {/* Meta Info */}
            <div className="space-y-2 text-xs text-muted-foreground bg-muted/20 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                <span>
                  Prospectado {formatDistanceToNow(new Date(lead.prospected_at), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-3 h-3" />
                <span>Origem: {lead.origin || 'manual'}</span>
              </div>
            </div>

            {/* Tags */}
            <div className="bg-muted/30 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tags</h3>
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
                {(lead.tags || []).length === 0 && (
                  <span className="text-xs text-muted-foreground">Sem tags</span>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Nova tag"
                  className="text-sm h-8"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <Button size="sm" variant="outline" onClick={handleAddTag} className="h-8 px-2">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Tabs for Notes and Activity only */}
          <Tabs defaultValue="notes" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="notes" className="flex-1">
                <FileText className="w-3 h-3 mr-1" />
                Notas
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex-1">
                <Activity className="w-3 h-3 mr-1" />
                Atividade
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notes" className="space-y-4 mt-4">
              <div className="flex gap-2">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Adicionar nota..."
                  className="text-sm min-h-[80px]"
                />
              </div>
              <Button size="sm" onClick={handleAddNote} className="w-full">
                <Plus className="w-4 h-4 mr-1" /> Adicionar Nota
              </Button>

              <div className="space-y-3">
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

            <TabsContent value="activity" className="space-y-4 mt-4">
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div>
                      <p className="text-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(activity.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma atividade registrada
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button variant="destructive" size="sm" onClick={handleDelete} className="w-full">
          <Trash2 className="w-4 h-4 mr-1" /> Excluir Lead
        </Button>
      </div>
    </div>
  );
};
