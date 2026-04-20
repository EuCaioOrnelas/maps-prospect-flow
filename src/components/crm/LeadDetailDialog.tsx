import { useState, useEffect } from 'react';
import { type Lead, type PipelineStage, type LeadNote, type LeadActivity, WHATSAPP_STATUS_LABELS, WHATSAPP_STATUS_COLORS, type WhatsAppStatus } from '@/hooks/useCRM';
import { cn } from '@/lib/utils';
import { formatPhoneNumber } from '@/lib/phoneUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, FileText, Upload, FolderOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Building2,
  Phone,
  MapPin,
  Globe,
  MessageCircle,
  Trash2,
  Save,
  Plus,
  Pencil,
  Clock,
  ExternalLink,
  User,
  Tag,
  Link2,
  Check,
  DollarSign,
  Calendar,
  TrendingUp,
  Settings2,
  X,
  Pause,
  Play,
  Bot,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LeadDeal {
  id: string;
  lead_id: string;
  user_id: string;
  value: number;
  contract_type: string;
  contract_months: number;
  closed_at: string;
  notes: string | null;
  created_at: string;
}

const CONTRACT_TYPES = [
  { value: '1', label: '1 Mês' },
  { value: '3', label: '3 Meses' },
  { value: '6', label: '6 Meses' },
  { value: '12', label: '1 Ano' },
  { value: 'custom', label: 'Personalizado' },
];

interface LeadDetailDialogProps {
  lead: Lead | null;
  stages: PipelineStage[];
  origins: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, updates: Partial<Lead>) => Promise<Lead | null>;
  onDelete: (id: string) => Promise<void>;
  onMoveToStage: (leadId: string, stageId: string) => Promise<void>;
  onAddNote: (leadId: string, content: string) => Promise<LeadNote | null>;
  onFetchNotes: (leadId: string) => Promise<LeadNote[]>;
  onFetchActivities: (leadId: string) => Promise<LeadActivity[]>;
  onAddOrigin: (origin: string) => Promise<void>;
  onUpdateOrigin?: (oldName: string, newName: string) => Promise<void>;
  onDeleteOrigin?: (name: string) => Promise<void>;
}

// formatPhoneNumber is now imported from '@/lib/phoneUtils'

// Format number to Brazilian currency format (1.234,56)
const formatCurrency = (value: number): string => {
  if (!value && value !== 0) return '';
  return value.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};

// Parse Brazilian currency format to number
const parseCurrency = (value: string): number => {
  if (!value) return 0;
  // Remove all dots (thousand separators) and replace comma with dot (decimal separator)
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

// Format input as user types in Brazilian currency format
const formatCurrencyInput = (input: string): string => {
  // Remove all non-digit characters
  const digits = input.replace(/\D/g, '');
  
  if (!digits) return '';
  
  // Convert to cents then to reais with 2 decimal places
  const cents = parseInt(digits, 10);
  const reais = cents / 100;
  
  return reais.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Editable Info Field Component for inline editing
const EditableInfoField = ({ 
  icon, 
  label, 
  value, 
  placeholder, 
  onChange, 
  onSave,
  isLink = false
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  placeholder: string; 
  onChange: (value: string) => void; 
  onSave: () => Promise<void>;
  isLink?: boolean;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      onChange(localValue);
      await onSave();
      setIsEditing(false);
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-3 p-3">
        {icon}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <div className="flex items-center gap-1">
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
              className="h-8 text-sm"
              autoFocus
              disabled={isSaving}
            />
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={handleSave} 
              className="h-8 w-8 shrink-0 text-primary hover:text-primary hover:bg-primary/10"
              disabled={isSaving}
            >
              <Save className="w-4 h-4" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => { setLocalValue(value); setIsEditing(false); }} 
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              disabled={isSaving}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/60 transition-colors group"
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
              className="text-sm text-primary hover:underline truncate flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {value.replace(/^https?:\/\//, '')}
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <p className="text-sm font-medium truncate">{value}</p>
          )
        ) : (
          <p className="text-sm text-muted-foreground/60 italic">{placeholder}</p>
        )}
      </div>
      <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </div>
  );
};

export const LeadDetailDialog = ({
  lead,
  stages,
  origins,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
  onMoveToStage,
  onAddNote,
  onFetchNotes,
  onFetchActivities,
  onAddOrigin,
  onUpdateOrigin,
  onDeleteOrigin,
}: LeadDetailDialogProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'notes' | 'history' | 'deals' | 'files'>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingHeaderName, setIsEditingHeaderName] = useState(false);
  const [headerNameValue, setHeaderNameValue] = useState('');
  const [isSavingHeaderName, setIsSavingHeaderName] = useState(false);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [deals, setDeals] = useState<LeadDeal[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newTag, setNewTag] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [showTagComposer, setShowTagComposer] = useState(false);
  const [localTags, setLocalTags] = useState<string[]>([]);
  const [hasWiizeChatConnection, setHasWiizeChatConnection] = useState(false);
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
  const [isWhatsAppStatusOpen, setIsWhatsAppStatusOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PER_PAGE = 5;
  const [showNewOriginDialog, setShowNewOriginDialog] = useState(false);
  const [newOriginValue, setNewOriginValue] = useState('');
  const [pendingOriginUpdate, setPendingOriginUpdate] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [deleteDealId, setDeleteDealId] = useState<string | null>(null);
  const [showDeleteLeadDialog, setShowDeleteLeadDialog] = useState(false);
  const [showManageOriginsDialog, setShowManageOriginsDialog] = useState(false);
  const [editingOriginName, setEditingOriginName] = useState<string | null>(null);
  const [editOriginNewName, setEditOriginNewName] = useState('');
  const [deleteOriginName, setDeleteOriginName] = useState<string | null>(null);
  
  // Deal closing state
  const [dealValue, setDealValue] = useState<number>(0);
  const [savedValue, setSavedValue] = useState<number>(0);
  const [contractType, setContractType] = useState<string>('1');
  const [customMonths, setCustomMonths] = useState<number>(1);
  const [showDealConfirm, setShowDealConfirm] = useState(false);
  const [isSavingValue, setIsSavingValue] = useState(false);

  // Agent pause state
  const [agentPauseStatus, setAgentPauseStatus] = useState<{
    conversationId: string | null;
    isPaused: boolean;
    pausedUntil: string | null;
    hasAgent: boolean;
  } | null>(null);
  const [isTogglingPause, setIsTogglingPause] = useState(false);

  // Deal attachments state
  const [dealAttachmentFiles, setDealAttachmentFiles] = useState<File[]>([]);
  const [dealAttachments, setDealAttachments] = useState<Record<string, Array<{ id: string; file_name: string; file_type: string; file_url: string }>>>({});
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  // Lead files state
  const [leadFiles, setLeadFiles] = useState<Array<{ id: string; file_name: string; file_type: string; file_url: string | null; source: string; created_at: string }>>([]);
  const [driveConnection, setDriveConnection] = useState<{ is_active: boolean; root_folder_id: string | null } | null>(null);
  const [isUploadingLeadFile, setIsUploadingLeadFile] = useState(false);
  const [pendingDriveFile, setPendingDriveFile] = useState<File | null>(null);
  const [pendingDriveFileName, setPendingDriveFileName] = useState('');
  const [leadDriveFolderUrl, setLeadDriveFolderUrl] = useState<string | null>(null);

  // Check if value has unsaved changes
  const hasUnsavedValue = dealValue !== savedValue;

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
      const initialValue = lead.estimated_value || 0;
      setDealValue(initialValue);
      setSavedValue(initialValue);
      setHeaderNameValue(lead.contact_name || lead.company_name || '');
      setIsEditing(false);
      setIsEditingHeaderName(false);
      setActiveTab('info');
      setShowWhatsAppOptions(false);
      setHistoryPage(1);
      setShowDealConfirm(false);
      setNewTag('');
      setDealAttachmentFiles([]);
      setLocalTags(lead.tags || []);

      // Load all data in parallel for faster popup
      Promise.all([
        loadNotesAndActivities(),
        loadDeals(),
        loadDealAttachments(),
        loadLeadFiles(),
        loadDriveConnection(),
        loadAgentPauseStatus(),
      ]);
    }
  }, [lead?.id]);

  useEffect(() => {
    if (!open || !user) return;

    let cancelled = false;

    const loadDialogSupportData = async () => {
      try {
        const [tagsResponse, connectionsResponse] = await Promise.all([
          supabase
            .from('crm_tags')
            .select('name')
            .eq('user_id', user.id),
          supabase
            .from('user_waba_connections')
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .limit(1),
        ]);

        if (cancelled) return;

        const uniqueTags = new Set<string>();
        tagsResponse.data?.forEach((item) => {
          if (item.name?.trim()) uniqueTags.add(item.name.trim());
        });

        setAvailableTags(Array.from(uniqueTags).sort((a, b) => a.localeCompare(b, 'pt-BR')));
        setHasWiizeChatConnection((connectionsResponse.data?.length ?? 0) > 0);
      } catch (error) {
        console.error('Error loading CRM tag support data:', error);

        if (!cancelled) {
          setAvailableTags([]);
          setHasWiizeChatConnection(false);
        }
      }
    };

    void loadDialogSupportData();

    return () => {
      cancelled = true;
    };
  }, [open, user]);

  // showTagComposer is no longer needed — tag creation is inside the status popover

  const loadDeals = async () => {
    if (!lead) return;
    const { data, error } = await supabase
      .from('lead_deals')
      .select('*')
      .eq('lead_id', lead.id)
      .order('closed_at', { ascending: false });
    if (!error && data) {
      setDeals(data as LeadDeal[]);
    }
  };

  const loadDealAttachments = async () => {
    if (!lead || !user) return;
    const { data } = await supabase
      .from('lead_deal_attachments')
      .select('id, deal_id, file_name, file_type, file_url')
      .eq('user_id', user.id);
    if (data) {
      const grouped: Record<string, Array<{ id: string; file_name: string; file_type: string; file_url: string }>> = {};
      data.forEach((att) => {
        if (!grouped[att.deal_id]) grouped[att.deal_id] = [];
        grouped[att.deal_id].push(att);
      });
      setDealAttachments(grouped);
    }
  };

  const loadLeadFiles = async () => {
    if (!lead || !user) return;
    const { data } = await supabase
      .from('lead_files')
      .select('id, file_name, file_type, file_url, source, created_at')
      .eq('lead_id', lead.id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setLeadFiles(data);
  };

  const loadDriveConnection = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_drive_connections')
      .select('is_active, root_folder_id')
      .eq('user_id', user.id)
      .maybeSingle();
    setDriveConnection(data);
  };

  const uploadDealAttachment = async (dealId: string, file: File, fileType: string) => {
    if (!user) return;
    const filePath = `${user.id}/${dealId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('deal-attachments')
      .upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from('deal-attachments').getPublicUrl(filePath);
    await supabase.from('lead_deal_attachments').insert({
      deal_id: dealId,
      user_id: user.id,
      file_name: file.name,
      file_type: fileType,
      file_url: urlData.publicUrl,
      file_size: file.size,
    });
  };

  const handleUploadLeadFile = async (file: File, customName?: string) => {
    if (!lead || !user) return;
    setIsUploadingLeadFile(true);
    try {
      // If Drive is connected, upload to Drive
      if (driveConnection?.is_active) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('lead_id', lead.id);
        if (customName) formData.append('custom_name', customName);

        const { data, error } = await supabase.functions.invoke('google-drive-upload-lead-file', {
          body: formData,
        });
        if (error) throw error;
        if (data?.folder_url) setLeadDriveFolderUrl(data.folder_url);
        toast.success('Arquivo enviado para o Google Drive!');
      } else {
        // Fallback: store in Supabase
        const finalName = customName
          ? (customName.includes('.') ? customName : `${customName}${file.name.slice(file.name.lastIndexOf('.'))}`)
          : file.name;
        const filePath = `${user.id}/${lead.id}/${Date.now()}_${finalName}`;
        const { error: uploadError } = await supabase.storage
          .from('deal-attachments')
          .upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('deal-attachments').getPublicUrl(filePath);
        await supabase.from('lead_files').insert({
          lead_id: lead.id,
          user_id: user.id,
          file_name: finalName,
          file_type: 'other',
          file_url: urlData.publicUrl,
          file_size: file.size,
          source: 'local',
        });
        toast.success('Arquivo enviado!');
      }
      loadLeadFiles();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Erro ao enviar arquivo');
    } finally {
      setIsUploadingLeadFile(false);
      setPendingDriveFile(null);
      setPendingDriveFileName('');
    }
  };

  const handleDeleteLeadFile = async (fileId: string) => {
    try {
      await supabase.from('lead_files').delete().eq('id', fileId);
      toast.success('Arquivo excluído!');
      loadLeadFiles();
    } catch {
      toast.error('Erro ao excluir arquivo');
    }
  };

  const handleConnectDrive = async () => {
    if (!user) return;
    try {
      const { data: funcUrl } = await supabase.functions.invoke('google-oauth-start', {
        body: { 
          scopes: [
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/drive',
          ],
        },
      });
      if (funcUrl?.url) {
        window.location.href = funcUrl.url;
      } else {
        toast.error('Erro ao iniciar conexão com Google Drive');
      }
    } catch {
      toast.error('Erro ao conectar Google Drive');
    }
  };

  const loadAgentPauseStatus = async () => {
    if (!lead || !user) { setAgentPauseStatus(null); return; }
    const phoneDigits = lead.phone.replace(/\D/g, '');
    const { data: agents } = await supabase
      .from('ai_agents')
      .select('id')
      .eq('user_id', user.id);
    if (!agents?.length) { setAgentPauseStatus(null); return; }
    const { data: convs } = await supabase
      .from('agent_conversations')
      .select('id, agent_manually_paused, agent_paused_until')
      .in('agent_id', agents.map(a => a.id))
      .eq('lead_phone', phoneDigits)
      .order('created_at', { ascending: false })
      .limit(1);
    if (convs?.length) {
      const c = convs[0];
      const isPausedUntil = c.agent_paused_until ? new Date(c.agent_paused_until) > new Date() : false;
      setAgentPauseStatus({
        conversationId: c.id,
        isPaused: !!(c.agent_manually_paused || isPausedUntil),
        pausedUntil: isPausedUntil ? c.agent_paused_until : null,
        hasAgent: true,
      });
    } else {
      // User has agents but no conversation for this lead — show as active (not paused)
      setAgentPauseStatus({
        conversationId: null,
        isPaused: false,
        pausedUntil: null,
        hasAgent: true,
      });
    }
  };

  const toggleAgentPause = async () => {
    if (!agentPauseStatus) return;
    setIsTogglingPause(true);
    try {
      const newPaused = !agentPauseStatus.isPaused;
      
      if (agentPauseStatus.conversationId) {
        // Has existing conversation — update it
        await supabase
          .from('agent_conversations')
          .update({
            agent_manually_paused: newPaused,
            agent_paused_until: null,
          })
          .eq('id', agentPauseStatus.conversationId);
      } else if (newPaused && lead && user) {
        // No conversation yet — create one with paused state
        const phoneDigits = lead.phone.replace(/\D/g, '');
        const { data: agents } = await supabase
          .from('ai_agents')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);
        if (agents?.length) {
          const { data: newConv } = await supabase
            .from('agent_conversations')
            .insert({
              agent_id: agents[0].id,
              lead_phone: phoneDigits,
              lead_name: lead.contact_name || lead.company_name || null,
              status: 'paused',
              agent_manually_paused: true,
            })
            .select('id')
            .single();
          if (newConv) {
            setAgentPauseStatus(prev => prev ? { ...prev, conversationId: newConv.id, isPaused: true, pausedUntil: null } : null);
            toast.success('Agente IA desativado para este lead');
            setIsTogglingPause(false);
            return;
          }
        }
      }
      
      setAgentPauseStatus(prev => prev ? { ...prev, isPaused: newPaused, pausedUntil: null } : null);
      toast.success(newPaused ? 'Agente IA desativado para este lead' : 'Agente IA ativado para este lead');
    } catch {
      toast.error('Erro ao alterar status do agente');
    } finally {
      setIsTogglingPause(false);
    }
  };

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

  const handleAddTag = async (tagValue?: string) => {
    if (!lead || !user) return;

    const normalizedTag = (tagValue ?? newTag).trim();

    if (!normalizedTag) return;

    const currentTags = localTags.map((tag) => tag.trim()).filter(Boolean);

    if (currentTags.some((tag) => tag.toLowerCase() === normalizedTag.toLowerCase())) {
      toast.error('Essa tag já está adicionada neste lead');
      return;
    }

    const updatedTags = [...currentTags, normalizedTag];

    try {
      await onUpdate(lead.id, { tags: updatedTags });

      setLocalTags(updatedTags);

      // Also save to crm_tags table (upsert to avoid duplicates)
      await supabase.from('crm_tags').upsert(
        { user_id: user.id, name: normalizedTag },
        { onConflict: 'user_id,name' }
      );

      setAvailableTags((prev) => {
        if (prev.some((tag) => tag.toLowerCase() === normalizedTag.toLowerCase())) {
          return prev;
        }
        return [...prev, normalizedTag].sort((a, b) => a.localeCompare(b, 'pt-BR'));
      });

      setNewTag('');
      setShowTagComposer(false);
      toast.success('Tag adicionada!');
    } catch {
      toast.error('Erro ao adicionar tag');
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!lead) return;
    const updatedTags = localTags.filter(tag => tag !== tagToRemove);
    try {
      await onUpdate(lead.id, { tags: updatedTags });
      setLocalTags(updatedTags);
      toast.success('Tag removida!');
    } catch {
      toast.error('Erro ao remover tag');
    }
  };

  const handleWhatsAppStatusChange = async (status: WhatsAppStatus) => {
    if (!lead) return;
    try {
      const updatedLead = await onUpdate(lead.id, { whatsapp_status: status });
      if (updatedLead) {
        // Update local lead reference for real-time UI update
        Object.assign(lead, updatedLead);
      }
      toast.success('Status atualizado!');
    } catch {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDelete = async () => {
    if (!lead) return;
    try {
      await onDelete(lead.id);
      onOpenChange(false);
      toast.success('Lead excluído!');
    } catch {
      toast.error('Erro ao excluir lead');
    }
  };

  const handleNewOriginSubmit = async () => {
    if (!lead || !newOriginValue.trim()) return;
    setPendingOriginUpdate(true);
    try {
      await onAddOrigin(newOriginValue.trim());
      const updatedLead = await onUpdate(lead.id, { origin: newOriginValue.trim() });
      if (updatedLead) Object.assign(lead, updatedLead);
      toast.success('Origem criada e atualizada!');
      setShowNewOriginDialog(false);
      setNewOriginValue('');
    } catch {
      toast.error('Erro ao criar origem');
    } finally {
      setPendingOriginUpdate(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase.from('lead_notes').delete().eq('id', noteId);
      if (error) throw error;
      loadNotesAndActivities();
      toast.success('Nota excluída!');
    } catch {
      toast.error('Erro ao excluir nota');
    } finally {
      setDeleteNoteId(null);
    }
  };

  const handleDeleteDeal = async (dealId: string) => {
    try {
      const { error } = await supabase.from('lead_deals').delete().eq('id', dealId);
      if (error) throw error;
      loadDeals();
      toast.success('Venda excluída!');
    } catch {
      toast.error('Erro ao excluir venda');
    } finally {
      setDeleteDealId(null);
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

  const openWiizeChat = () => {
    if (!lead) return;

    const params = new URLSearchParams({
      phone: lead.phone.replace(/\D/g, ''),
    });

    const displayName = lead.contact_name || lead.company_name;

    if (displayName) {
      params.set('name', displayName);
    }

    navigate(`/chat?${params.toString()}`);
    setShowWhatsAppOptions(false);
    onOpenChange(false);
  };

  const handleValueChange = async (value: number) => {
    if (!lead) return;
    setIsSavingValue(true);
    try {
      const updatedLead = await onUpdate(lead.id, { estimated_value: value });
      if (updatedLead) {
        Object.assign(lead, updatedLead);
      }
      setSavedValue(value); // Mark as saved
      toast.success('Valor salvo!');
    } catch {
      toast.error('Erro ao salvar valor');
    } finally {
      setIsSavingValue(false);
    }
  };

  const handleSaveHeaderName = async () => {
    if (!lead || !headerNameValue.trim()) return;
    setIsSavingHeaderName(true);
    try {
      // Determine if we're updating contact_name or company_name
      const updateField = lead.contact_name ? 'contact_name' : 'company_name';
      await onUpdate(lead.id, { [updateField]: headerNameValue.trim().slice(0, 50) });
      setIsEditingHeaderName(false);
      toast.success('Nome atualizado!');
    } catch {
      toast.error('Erro ao atualizar nome');
    } finally {
      setIsSavingHeaderName(false);
    }
  };

  if (!lead) return null;

  const currentStage = stages.find(s => s.id === lead.pipeline_stage_id);
  const displayName = lead.contact_name || lead.company_name || formatPhoneNumber(lead.phone);
  const normalizedTagSearch = newTag.trim().toLowerCase();
  const tagSuggestions = availableTags
    .filter((tag) => !localTags.some((currentTag) => currentTag.toLowerCase() === tag.toLowerCase()))
    .filter((tag) => !normalizedTagSearch || tag.toLowerCase().includes(normalizedTagSearch))
    .slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl h-[90vh] sm:h-[85vh] overflow-hidden flex flex-col min-h-0 p-0 gap-0 border-border w-[95vw] sm:w-full rounded-lg">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-primary/10 to-primary/5 px-4 sm:px-6 py-4 sm:py-5 shrink-0">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold text-primary-foreground shrink-0"
              style={{ backgroundColor: currentStage?.color || 'hsl(var(--primary))' }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            
            <div className="flex-1 min-w-0">
              {isEditingHeaderName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={headerNameValue}
                    onChange={(e) => setHeaderNameValue(e.target.value.slice(0, 50))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveHeaderName();
                      if (e.key === 'Escape') {
                        setHeaderNameValue(lead.contact_name || lead.company_name || '');
                        setIsEditingHeaderName(false);
                      }
                    }}
                    className="h-8 text-lg font-semibold"
                    placeholder="Nome do lead"
                    maxLength={50}
                    autoFocus
                    disabled={isSavingHeaderName}
                  />
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={handleSaveHeaderName}
                    className="h-8 w-8 shrink-0 text-primary hover:text-primary hover:bg-primary/10"
                    disabled={isSavingHeaderName || !headerNameValue.trim()}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => { 
                      setHeaderNameValue(lead.contact_name || lead.company_name || ''); 
                      setIsEditingHeaderName(false); 
                    }}
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    disabled={isSavingHeaderName}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h2 className="text-lg font-semibold text-foreground truncate" title={displayName}>
                    {displayName.length > 50 ? `${displayName.slice(0, 50)}...` : displayName}
                  </h2>
                  <button
                    onClick={() => {
                      setHeaderNameValue(lead.contact_name || lead.company_name || '');
                      setIsEditingHeaderName(true);
                    }}
                    className="p-1 rounded hover:bg-white/20 text-muted-foreground hover:text-foreground transition-opacity opacity-0 group-hover:opacity-100 shrink-0"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              )}
              {lead.company_name && lead.contact_name && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Building2 className="w-3 h-3" />
                  <span className="truncate" title={lead.company_name}>
                    {lead.company_name.length > 40 ? `${lead.company_name.slice(0, 40)}...` : lead.company_name}
                  </span>
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

        {/* Agent Status Banner - always visible when user has agents */}
        {agentPauseStatus && (
          <div className={cn(
            "flex items-center justify-between gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 border-y shrink-0 transition-colors",
            agentPauseStatus.isPaused 
              ? "bg-destructive/10 border-destructive/20" 
              : "bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20"
          )}>
            <div className="flex items-center gap-2 min-w-0">
              <Bot className={cn(
                "w-4 h-4 shrink-0",
                agentPauseStatus.isPaused ? "text-destructive" : "text-primary"
              )} />
              <span className="text-xs font-medium truncate">
                {agentPauseStatus.isPaused
                  ? `Agente IA desativado${agentPauseStatus.pausedUntil ? ` até ${format(new Date(agentPauseStatus.pausedUntil), 'HH:mm')}` : ''}`
                  : 'Agente IA ativo neste lead'}
              </span>
            </div>
            <Button
              size="sm"
              variant={agentPauseStatus.isPaused ? "default" : "destructive"}
              className="h-7 text-xs shrink-0 gap-1.5"
              onClick={toggleAgentPause}
              disabled={isTogglingPause}
            >
              {agentPauseStatus.isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Ativar
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  Desativar
                </>
              )}
            </Button>
          </div>
        )}

        {/* Quick Actions Bar */}
        <div className="flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-border bg-muted/30 shrink-0">
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
              <div className="absolute top-full left-0 right-0 mt-1 rounded-2xl border border-border bg-popover/95 p-1 shadow-xl backdrop-blur-sm z-50">
                {hasWiizeChatConnection && (
                  <>
                    <button
                      className="w-full rounded-xl px-3 py-2.5 text-sm text-left transition-colors flex items-center gap-2 text-foreground hover:bg-primary/10"
                      onClick={openWiizeChat}
                    >
                      <MessageCircle className="w-4 h-4 text-primary" />
                      Chamar no Chat Wiize
                    </button>
                    <div className="my-1 h-px bg-border/60" />
                  </>
                )}
                <button
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-left transition-colors flex items-center gap-2 text-foreground hover:bg-muted"
                  onClick={() => openWhatsApp('web')}
                >
                  <Globe className="w-4 h-4" />
                  WhatsApp Web
                </button>
                <button
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-left transition-colors flex items-center gap-2 text-foreground hover:bg-muted"
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

          <Popover open={isWhatsAppStatusOpen} onOpenChange={setIsWhatsAppStatusOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 text-sm min-w-[160px] justify-between gap-2">
                <span className="truncate">{WHATSAPP_STATUS_LABELS[lead.whatsapp_status]}</span>
                {localTags.length > 0 && (
                  <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium">+{localTags.length}</span>
                )}
                <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start" sideOffset={4}>
              <div className="max-h-[400px] overflow-y-auto [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
                {/* Status options */}
                <div className="p-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1 block">Tags padrão</span>
                  {(Object.keys(WHATSAPP_STATUS_LABELS) as WhatsAppStatus[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted',
                        lead.whatsapp_status === status && 'bg-primary/10 text-primary font-medium'
                      )}
                      onClick={() => {
                        void handleWhatsAppStatusChange(status);
                        setIsWhatsAppStatusOpen(false);
                      }}
                    >
                      {lead.whatsapp_status === status && <Check className="w-3.5 h-3.5 shrink-0" />}
                      <span className={cn(lead.whatsapp_status !== status && 'ml-5.5')}>{WHATSAPP_STATUS_LABELS[status]}</span>
                    </button>
                  ))}
                </div>

                {/* Custom Tags Section */}
                <div className="border-t border-border">
                  <div className="p-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1 block">Tags personalizadas</span>
                    
                    {/* Active custom tags */}
                    {localTags.length > 0 && (
                      <div className="space-y-0.5 mb-1">
                        {localTags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors bg-primary/10 text-primary hover:bg-primary/20 group"
                          >
                            <Check className="w-3.5 h-3.5 shrink-0" />
                            <span className="flex-1 text-left truncate">{tag}</span>
                            <X className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Available suggestions */}
                    {tagSuggestions.length > 0 && (
                      <div className="space-y-0.5">
                        {tagSuggestions.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleAddTag(tag)}
                            className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-muted text-foreground"
                          >
                            <Tag className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                            <span className="flex-1 text-left truncate">{tag}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {tagSuggestions.length === 0 && localTags.length === 0 && (
                      <p className="px-3 py-2 text-xs text-muted-foreground">Nenhuma tag personalizada. Crie em Configurações.</p>
                    )}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border shrink-0">
          {[
            { id: 'info', label: 'Informações' },
            { id: 'deals', label: `Vendas (${deals.length})` },
            { id: 'notes', label: `Notas (${notes.length})` },
            { id: 'files', label: 'Arquivos' },
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
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6">
            {/* Info Tab - All Information Visible */}
            {activeTab === 'info' && (
              <div className="space-y-5">
                {/* Contact Information Section */}
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informações de Contato</span>
                  
                  <div className="bg-muted/40 rounded-lg divide-y divide-border/50">
                    {/* Phone - Read only */}
                    <div className="flex items-center gap-3 p-3">
                      <Phone className="w-4 h-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Telefone</p>
                        <p className="text-sm font-medium">{formatPhoneNumber(lead.phone)}</p>
                      </div>
                    </div>

                    {/* Company Name - Editable */}
                    <EditableInfoField
                      icon={<Building2 className="w-4 h-4 text-muted-foreground" />}
                      label="Empresa"
                      value={formData.company_name}
                      placeholder="Adicionar empresa"
                      onChange={(value) => setFormData({ ...formData, company_name: value })}
                      onSave={async () => {
                        await onUpdate(lead.id, { company_name: formData.company_name });
                        toast.success('Empresa atualizada!');
                      }}
                    />
                  </div>
                </div>

                {/* Location Section */}
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Localização</span>
                  
                  <div className="bg-muted/40 rounded-lg divide-y divide-border/50">
                    {/* City - Editable */}
                    <EditableInfoField
                      icon={<MapPin className="w-4 h-4 text-muted-foreground" />}
                      label="Cidade"
                      value={formData.city}
                      placeholder="Adicionar cidade"
                      onChange={(value) => setFormData({ ...formData, city: value })}
                      onSave={async () => {
                        await onUpdate(lead.id, { city: formData.city });
                        toast.success('Cidade atualizada!');
                      }}
                    />

                    {/* Region - Editable */}
                    <EditableInfoField
                      icon={<Tag className="w-4 h-4 text-muted-foreground" />}
                      label="Região/Estado"
                      value={formData.region}
                      placeholder="Adicionar região"
                      onChange={(value) => setFormData({ ...formData, region: value })}
                      onSave={async () => {
                        await onUpdate(lead.id, { region: formData.region });
                        toast.success('Região atualizada!');
                      }}
                    />

                    {/* Google Maps Link */}
                    {lead.google_maps_link && (
                      <div className="flex items-center gap-3 p-3">
                        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">Google Maps</p>
                          <a 
                            href={lead.google_maps_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            Ver no mapa
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Business Info Section */}
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Negócio</span>
                  
                  <div className="bg-muted/40 rounded-lg divide-y divide-border/50">
                    {/* Category - Editable */}
                    <EditableInfoField
                      icon={<Tag className="w-4 h-4 text-muted-foreground" />}
                      label="Categoria/Nicho"
                      value={formData.category}
                      placeholder="Adicionar categoria"
                      onChange={(value) => setFormData({ ...formData, category: value })}
                      onSave={async () => {
                        await onUpdate(lead.id, { category: formData.category });
                        toast.success('Categoria atualizada!');
                      }}
                    />

                    {/* Website - Editable */}
                    <EditableInfoField
                      icon={<Globe className="w-4 h-4 text-muted-foreground" />}
                      label="Website"
                      value={formData.website}
                      placeholder="Adicionar website"
                      onChange={(value) => setFormData({ ...formData, website: value })}
                      onSave={async () => {
                        await onUpdate(lead.id, { website: formData.website });
                        toast.success('Website atualizado!');
                      }}
                      isLink
                    />
                  </div>
                </div>

                {/* Origin Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Origem</span>
                    {onUpdateOrigin && onDeleteOrigin && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 px-2 text-xs"
                        onClick={() => setShowManageOriginsDialog(true)}
                      >
                        <Settings2 className="w-3 h-3 mr-1" />
                        Gerenciar
                      </Button>
                    )}
                  </div>
                  <Select
                    value={lead.origin || ''}
                    onValueChange={async (value) => {
                      if (value === '__new__') {
                        setShowNewOriginDialog(true);
                      } else {
                        const updatedLead = await onUpdate(lead.id, { origin: value });
                        if (updatedLead) Object.assign(lead, updatedLead);
                        toast.success('Origem atualizada!');
                      }
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecionar origem" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...new Set(['Manual', 'Google Maps', 'Importação', 'Campanha', 'Indicação', 'Site', 'Rede Social', ...origins])].map((origin) => (
                        <SelectItem key={origin} value={origin}>
                          {origin}
                        </SelectItem>
                      ))}
                      <SelectItem value="__new__">
                        <span className="text-primary">+ Nova origem</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Negotiation Value with Close Deal Button */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Valor da Negociação
                  </span>
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-primary font-medium text-lg">R$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formatCurrency(dealValue)}
                        onChange={(e) => {
                          const formatted = formatCurrencyInput(e.target.value);
                          const value = parseCurrency(formatted);
                          setDealValue(value);
                        }}
                        className="flex-1 text-lg font-semibold bg-transparent outline-none text-foreground"
                        placeholder="0,00"
                      />
                    </div>
                    {hasUnsavedValue ? (
                      <Button
                        size="sm"
                        className="w-full"
                        variant="secondary"
                        onClick={() => handleValueChange(dealValue)}
                        disabled={isSavingValue}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {isSavingValue ? 'Salvando...' : 'Salvar Valor'}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => setShowDealConfirm(true)}
                        disabled={!dealValue || dealValue <= 0}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Negociação Fechada
                      </Button>
                    )}
                    {deals.length > 0 && (
                      <div className="pt-2 border-t border-primary/10">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Total em vendas:</span>
                          <span className="font-medium text-primary">
                            R$ {deals.reduce((sum, d) => sum + Number(d.value), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Meta Info - At the end */}
                <div className="space-y-2 text-xs text-muted-foreground bg-muted/20 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    <span>
                      Cadastrado em {format(new Date(lead.prospected_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>
                      Atualizado {formatDistanceToNow(new Date(lead.updated_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                </div>
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
                    <div key={note.id} className="bg-muted/40 rounded-lg p-3 group relative">
                      <p className="text-sm whitespace-pre-wrap pr-8">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(note.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      <button
                        onClick={() => setDeleteNoteId(note.id)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
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

            {/* Deals Tab */}
            {activeTab === 'deals' && (
              <div className="space-y-4">
                {deals.length > 0 ? (
                  <div className="space-y-3">
                    {deals.map((deal) => (
                      <div key={deal.id} className="bg-muted/40 rounded-lg p-4 border border-border/50 group relative">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-primary" />
                              <span className="font-semibold text-lg text-primary">
                                R$ {Number(deal.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {deal.contract_months} {deal.contract_months === 1 ? 'mês' : 'meses'}
                              </span>
                              <span>•</span>
                              <span>
                                {format(new Date(deal.closed_at), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => setDeleteDealId(deal.id)}
                            className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {deal.notes && (
                          <p className="text-sm text-muted-foreground mt-2 pt-2 border-t border-border/50">
                            {deal.notes}
                          </p>
                        )}
                        {/* Deal Attachments */}
                        {(dealAttachments[deal.id] || []).length > 0 && (
                          <div className="mt-2 pt-2 border-t border-border/50 space-y-1.5">
                            <span className="text-[11px] font-medium text-muted-foreground uppercase">Anexos</span>
                            {dealAttachments[deal.id].map((att) => (
                              <a
                                key={att.id}
                                href={att.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs text-primary hover:underline p-1.5 rounded bg-muted/30 hover:bg-muted/60 transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{att.file_name}</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                                  {att.file_type === 'receipt' ? 'Comprovante' : att.file_type === 'contract' ? 'Contrato' : 'Outro'}
                                </Badge>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* Total Summary */}
                    <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Total em Vendas</span>
                        <span className="text-xl font-bold text-primary">
                          R$ {deals.reduce((sum, d) => sum + Number(d.value), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {deals.length} {deals.length === 1 ? 'venda registrada' : 'vendas registradas'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Nenhuma venda registrada
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Use o campo de valor na aba Informações e clique no ✓ para registrar
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Arquivos Tab */}
            {activeTab === 'files' && (
              <div className="space-y-4">
                {/* Google Drive Connection */}
                <div className="bg-muted/40 rounded-lg border border-border/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <FolderOpen className="w-3.5 h-3.5" />
                      Google Drive
                    </span>
                    {driveConnection?.is_active ? (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Conectado</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Desconectado</Badge>
                    )}
                  </div>
                  {driveConnection?.is_active ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Arquivos vão para a pasta deste lead em <strong>Wiize CRM</strong> no seu Drive.
                      </p>
                      {leadDriveFolderUrl && (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 gap-1.5"
                        >
                          <a href={leadDriveFolderUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3.5 h-3.5" />
                            Abrir pasta no Drive
                          </a>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Conecte seu Google Drive para salvar arquivos automaticamente em uma pasta por lead.
                      </p>
                      <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5" onClick={handleConnectDrive}>
                        <FolderOpen className="w-3.5 h-3.5" />
                        Conectar Google Drive
                      </Button>
                    </div>
                  )}
                </div>

                {/* Upload Area */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enviar Arquivo</span>
                  <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Clique para selecionar um arquivo</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setPendingDriveFile(file);
                          setPendingDriveFileName(file.name.replace(/\.[^.]+$/, ''));
                        }
                        e.target.value = '';
                      }}
                      disabled={isUploadingLeadFile}
                    />
                  </label>
                  {isUploadingLeadFile && (
                    <p className="text-xs text-muted-foreground text-center animate-pulse">Enviando...</p>
                  )}
                </div>

                {/* Files List */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Arquivos ({leadFiles.length})
                  </span>
                  {leadFiles.length > 0 ? (
                    <div className="space-y-1.5">
                      {leadFiles.map((file) => (
                        <div key={file.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/50 group">
                          <FileText className="w-4 h-4 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.file_name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {format(new Date(file.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              {file.source === 'drive' && ' • Google Drive'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {file.file_url && (
                              <a
                                href={file.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded hover:bg-muted transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                              </a>
                            )}
                            <button
                              onClick={() => handleDeleteLeadFile(file.id)}
                              className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <FileText className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhum arquivo</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-1">
                {activities
                  .slice((historyPage - 1) * HISTORY_PER_PAGE, historyPage * HISTORY_PER_PAGE)
                  .map((activity, index, arr) => (
                  <div 
                    key={activity.id} 
                    className={cn(
                      "flex gap-3 py-3",
                      index !== arr.length - 1 && "border-b border-border/50"
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
                {activities.length > HISTORY_PER_PAGE && (
                  <div className="flex items-center justify-center gap-2 pt-4 border-t border-border/50">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={historyPage === 1}
                      onClick={() => setHistoryPage(p => p - 1)}
                    >
                      Anterior
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {historyPage} / {Math.ceil(activities.length / HISTORY_PER_PAGE)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={historyPage >= Math.ceil(activities.length / HISTORY_PER_PAGE)}
                      onClick={() => setHistoryPage(p => p + 1)}
                    >
                      Próximo
                    </Button>
                  </div>
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
            onClick={() => setShowDeleteLeadDialog(true)}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Excluir Lead
          </Button>
        </div>

        {/* New Origin Dialog */}
        <Dialog open={showNewOriginDialog} onOpenChange={setShowNewOriginDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Nova Origem</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={newOriginValue}
                onChange={(e) => setNewOriginValue(e.target.value)}
                placeholder="Nome da nova origem"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newOriginValue.trim()) {
                    handleNewOriginSubmit();
                  }
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewOriginDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleNewOriginSubmit} disabled={!newOriginValue.trim() || pendingOriginUpdate}>
                {pendingOriginUpdate ? 'Criando...' : 'Criar Origem'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Note Confirmation */}
        <AlertDialog open={!!deleteNoteId} onOpenChange={(open) => !open && setDeleteNoteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Nota</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta nota? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteNoteId && handleDeleteNote(deleteNoteId)}
                className="bg-destructive hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Deal Confirmation */}
        <AlertDialog open={!!deleteDealId} onOpenChange={(open) => !open && setDeleteDealId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Venda</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteDealId && handleDeleteDeal(deleteDealId)}
                className="bg-destructive hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showDeleteLeadDialog} onOpenChange={setShowDeleteLeadDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Lead</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este lead? Todas as notas e histórico associados serão removidos. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive hover:bg-destructive/90"
              >
              Excluir Lead
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirm Deal Dialog */}
        <Dialog open={showDealConfirm} onOpenChange={setShowDealConfirm}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Confirmar Fechamento
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="bg-primary/10 rounded-lg p-4 text-center">
                <span className="text-sm text-muted-foreground">Valor da venda</span>
                <p className="text-2xl font-bold text-primary">
                  R$ {dealValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Contrato</label>
                <Select value={contractType} onValueChange={setContractType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {contractType === 'custom' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Número de Meses</label>
                  <Input
                    type="number"
                    min={1}
                    value={customMonths}
                    onChange={(e) => setCustomMonths(parseInt(e.target.value) || 1)}
                    placeholder="Ex: 24"
                  />
                </div>
              )}

              {/* File attachments for deal */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Anexos (opcional)</label>
                <div className="space-y-2">
                  {/* Comprovante */}
                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer">
                    <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground flex-1">
                      {dealAttachmentFiles.find(f => f.name.startsWith('receipt_'))
                        ? dealAttachmentFiles.find(f => f.name.startsWith('receipt_'))!.name.replace('receipt_', '')
                        : 'Comprovante de pagamento'}
                    </span>
                    <Badge variant="outline" className="text-[10px] shrink-0">Comprovante</Badge>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const renamedFile = new File([file], `receipt_${file.name}`, { type: file.type });
                          setDealAttachmentFiles(prev => [...prev.filter(f => !f.name.startsWith('receipt_')), renamedFile]);
                        }
                      }}
                    />
                  </label>
                  {/* Contrato */}
                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer">
                    <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground flex-1">
                      {dealAttachmentFiles.find(f => f.name.startsWith('contract_'))
                        ? dealAttachmentFiles.find(f => f.name.startsWith('contract_'))!.name.replace('contract_', '')
                        : 'Contrato assinado'}
                    </span>
                    <Badge variant="outline" className="text-[10px] shrink-0">Contrato</Badge>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const renamedFile = new File([file], `contract_${file.name}`, { type: file.type });
                          setDealAttachmentFiles(prev => [...prev.filter(f => !f.name.startsWith('contract_')), renamedFile]);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowDealConfirm(false); setDealAttachmentFiles([]); }}>
                Cancelar
              </Button>
              <Button 
                onClick={async () => {
                  if (!lead || !user) return;
                  setIsUploadingAttachment(true);
                  const months = contractType === 'custom' ? customMonths : parseInt(contractType);
                  try {
                    const { data: dealData, error } = await supabase.from('lead_deals').insert({
                      lead_id: lead.id,
                      user_id: user.id,
                      value: dealValue,
                      contract_type: contractType,
                      contract_months: months,
                    }).select('id').single();
                    if (error) throw error;
                    
                    // Upload attachments
                    for (const file of dealAttachmentFiles) {
                      const fileType = file.name.startsWith('receipt_') ? 'receipt' : file.name.startsWith('contract_') ? 'contract' : 'other';
                      const originalFile = new File([file], file.name.replace(/^(receipt_|contract_)/, ''), { type: file.type });
                      await uploadDealAttachment(dealData.id, originalFile, fileType);
                    }
                    
                    await onUpdate(lead.id, { estimated_value: dealValue });
                    
                    toast.success('Venda registrada com sucesso!');
                    setShowDealConfirm(false);
                    setDealValue(0);
                    setDealAttachmentFiles([]);
                    loadDeals();
                    loadDealAttachments();
                  } catch {
                    toast.error('Erro ao registrar venda');
                  } finally {
                    setIsUploadingAttachment(false);
                  }
                }}
                className="bg-primary hover:bg-primary/90"
                disabled={isUploadingAttachment}
              >
                <Check className="w-4 h-4 mr-1" />
                {isUploadingAttachment ? 'Salvando...' : 'Confirmar Venda'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manage Origins Dialog */}
        <Dialog open={showManageOriginsDialog} onOpenChange={setShowManageOriginsDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Gerenciar Origens</DialogTitle>
            </DialogHeader>
            
            {/* Add new origin */}
            <div className="flex gap-2 mb-4">
              <Input
                value={newOriginValue}
                onChange={(e) => setNewOriginValue(e.target.value)}
                placeholder="Nova origem..."
                className="h-9"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newOriginValue.trim()) {
                    onAddOrigin(newOriginValue.trim());
                    setNewOriginValue('');
                    toast.success('Origem criada!');
                  }
                }}
              />
              <Button
                size="sm"
                onClick={() => {
                  if (newOriginValue.trim()) {
                    onAddOrigin(newOriginValue.trim());
                    setNewOriginValue('');
                    toast.success('Origem criada!');
                  }
                }}
                disabled={!newOriginValue.trim()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <ScrollArea className="max-h-[350px] pr-2">
              <div className="space-y-1">
                {/* All origins - editable */}
                {[...new Set(['Manual', 'Google Maps', 'Importação', 'Campanha', 'Indicação', 'Site', 'Rede Social', 'WhatsApp', ...origins])].map((origin) => (
                  <div 
                    key={origin}
                    className="flex items-center gap-2 p-2 rounded-lg border bg-card"
                  >
                    {editingOriginName === origin ? (
                      <>
                        <Input
                          value={editOriginNewName}
                          onChange={(e) => setEditOriginNewName(e.target.value)}
                          className="h-8 flex-1"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={async () => {
                            if (onUpdateOrigin && editOriginNewName.trim()) {
                              try {
                                await onUpdateOrigin(origin, editOriginNewName.trim());
                                toast.success('Origem atualizada!');
                                setEditingOriginName(null);
                              } catch {
                                toast.error('Erro ao atualizar origem');
                              }
                            }
                          }}
                          disabled={!editOriginNewName.trim()}
                        >
                          <Check className="w-4 h-4 text-green-500" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => setEditingOriginName(null)}
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm">{origin}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingOriginName(origin);
                            setEditOriginNewName(origin);
                          }}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteOriginName(origin)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowManageOriginsDialog(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Origin Confirmation */}
        <AlertDialog open={!!deleteOriginName} onOpenChange={(open) => !open && setDeleteOriginName(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Origem</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a origem "{deleteOriginName}"? Leads com esta origem não serão afetados, mas a origem não estará mais disponível para seleção.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (deleteOriginName && onDeleteOrigin) {
                    try {
                      await onDeleteOrigin(deleteOriginName);
                      toast.success('Origem excluída!');
                    } catch {
                      toast.error('Erro ao excluir origem');
                    }
                  }
                  setDeleteOriginName(null);
                }}
                className="bg-destructive hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};
