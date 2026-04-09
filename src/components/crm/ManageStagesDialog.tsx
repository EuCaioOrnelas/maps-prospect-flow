import { useState, useEffect } from 'react';
import { type PipelineStage, type Lead, isLockedStage } from '@/hooks/useCRM';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronUp, 
  ChevronDown, 
  Pencil, 
  Trash2, 
  Plus,
  Lock,
  Check,
  X,
  AlertTriangle,
  Search,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ManageStagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: PipelineStage[];
  leads?: Lead[];
  onCreateStage: (name: string, color: string) => Promise<PipelineStage | null>;
  onUpdateStage: (id: string, updates: Partial<PipelineStage>) => Promise<PipelineStage | null>;
  onDeleteStage: (id: string, moveLeadsToStageId?: string) => Promise<void>;
  onMoveStage: (id: string, direction: 'up' | 'down') => Promise<void>;
}

const PRESET_COLORS = [
  '#6B7280', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B',
  '#EC4899', '#EF4444', '#14B8A6', '#F97316', '#6366F1',
];

export const ManageStagesDialog = ({
  open,
  onOpenChange,
  stages,
  leads = [],
  onCreateStage,
  onUpdateStage,
  onDeleteStage,
  onMoveStage,
}: ManageStagesDialogProps) => {
  const [activeTab, setActiveTab] = useState<'columns' | 'tags'>('columns');
  const [isCreating, setIsCreating] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState(PRESET_COLORS[1]);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirmStage, setDeleteConfirmStage] = useState<PipelineStage | null>(null);
  const [moveToStageId, setMoveToStageId] = useState<string>('');
  const [agentsUsingStage, setAgentsUsingStage] = useState<string[]>([]);

  // Tags state
  const [allTags, setAllTags] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState('');
  const [newTagValue, setNewTagValue] = useState('');
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editTagValue, setEditTagValue] = useState('');
  const [deleteTagConfirm, setDeleteTagConfirm] = useState<string | null>(null);
  
  const { user } = useAuth();

  const sortedStages = [...stages].sort((a, b) => a.position - b.position);
  const prospectadoIndex = sortedStages.findIndex(s => s.name === 'Prospectado');
  const fechadoIndex = sortedStages.findIndex(s => s.name === 'Fechado (Ganho)');
  const perdidoIndex = sortedStages.findIndex(s => s.name === 'Perdido');
  const minEditableIndex = prospectadoIndex + 1;
  const maxEditableIndex = Math.min(
    fechadoIndex >= 0 ? fechadoIndex : sortedStages.length,
    perdidoIndex >= 0 ? perdidoIndex : sortedStages.length
  ) - 1;

  // Load tags when Tags tab is active
  useEffect(() => {
    if (open && activeTab === 'tags' && user) {
      loadAllTags();
    }
  }, [open, activeTab, user]);

  const loadAllTags = async () => {
    if (!user) return;
    setIsLoadingTags(true);
    try {
      // Load from crm_tags table + tags on leads (merge both)
      const [crmTagsRes, leadsRes] = await Promise.all([
        supabase.from('crm_tags').select('name').eq('user_id', user.id),
        supabase.from('leads').select('tags').eq('user_id', user.id).not('tags', 'is', null).range(0, 4999),
      ]);

      const uniqueTags = new Set<string>();
      crmTagsRes.data?.forEach((t) => { if (t.name?.trim()) uniqueTags.add(t.name.trim()); });
      leadsRes.data?.forEach((item) => {
        if (!Array.isArray(item.tags)) return;
        item.tags.forEach((tag) => { if (typeof tag === 'string' && tag.trim()) uniqueTags.add(tag.trim()); });
      });

      // Sync missing tags to crm_tags table
      const existingCrmNames = new Set(crmTagsRes.data?.map(t => t.name) || []);
      const missingTags = Array.from(uniqueTags).filter(t => !existingCrmNames.has(t));
      if (missingTags.length > 0) {
        await supabase.from('crm_tags').upsert(
          missingTags.map(name => ({ user_id: user.id, name })),
          { onConflict: 'user_id,name' }
        );
      }

      setAllTags(Array.from(uniqueTags).sort((a, b) => a.localeCompare(b, 'pt-BR')));
    } catch {
      toast.error('Erro ao carregar tags');
    } finally {
      setIsLoadingTags(false);
    }
  };

  const handleCreateTag = async () => {
    const trimmed = newTagValue.trim();
    if (!trimmed || !user) return;
    if (allTags.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('Essa tag já existe');
      return;
    }
    try {
      await supabase.from('crm_tags').insert({ user_id: user.id, name: trimmed });
      setAllTags(prev => [...prev, trimmed].sort((a, b) => a.localeCompare(b, 'pt-BR')));
      setNewTagValue('');
      toast.success('Tag criada!');
    } catch {
      toast.error('Erro ao criar tag');
    }
  };

  const handleRenameTag = async () => {
    if (!editingTag || !editTagValue.trim() || !user) return;
    const newName = editTagValue.trim();
    if (allTags.some(t => t !== editingTag && t.toLowerCase() === newName.toLowerCase())) {
      toast.error('Já existe uma tag com esse nome');
      return;
    }
    setIsLoading(true);
    try {
      // Update crm_tags table
      await supabase.from('crm_tags').update({ name: newName }).eq('user_id', user.id).eq('name', editingTag);
      // Update all leads that have this tag
      const { data: leadsWithTag } = await supabase
        .from('leads')
        .select('id, tags')
        .eq('user_id', user.id)
        .contains('tags', [editingTag]);
      
      if (leadsWithTag?.length) {
        for (const lead of leadsWithTag) {
          const updatedTags = (lead.tags as string[]).map(t => t === editingTag ? newName : t);
          await supabase.from('leads').update({ tags: updatedTags }).eq('id', lead.id);
        }
      }
      
      setAllTags(prev => prev.map(t => t === editingTag ? newName : t).sort((a, b) => a.localeCompare(b, 'pt-BR')));
      setEditingTag(null);
      setEditTagValue('');
      toast.success('Tag renomeada!');
    } catch {
      toast.error('Erro ao renomear tag');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTag = async () => {
    if (!deleteTagConfirm || !user) return;
    setIsLoading(true);
    try {
      // Delete from crm_tags table
      await supabase.from('crm_tags').delete().eq('user_id', user.id).eq('name', deleteTagConfirm);
      // Remove from all leads
      const { data: leadsWithTag } = await supabase
        .from('leads')
        .select('id, tags')
        .eq('user_id', user.id)
        .contains('tags', [deleteTagConfirm]);
      
      if (leadsWithTag?.length) {
        for (const lead of leadsWithTag) {
          const updatedTags = (lead.tags as string[]).filter(t => t !== deleteTagConfirm);
          await supabase.from('leads').update({ tags: updatedTags }).eq('id', lead.id);
        }
      }
      
      setAllTags(prev => prev.filter(t => t !== deleteTagConfirm));
      setDeleteTagConfirm(null);
      toast.success('Tag excluída de todos os leads!');
    } catch {
      toast.error('Erro ao excluir tag');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTags = allTags.filter(t => 
    !tagSearch || t.toLowerCase().includes(tagSearch.toLowerCase())
  );

  const canMoveUp = (index: number, stage: PipelineStage) => {
    if (isLockedStage(stage.name)) return false;
    return index > minEditableIndex;
  };

  const canMoveDown = (index: number, stage: PipelineStage) => {
    if (isLockedStage(stage.name)) return false;
    return index < maxEditableIndex;
  };

  const handleCreateStage = async () => {
    const trimmedName = newStageName.trim();
    if (!trimmedName) { toast.error('Digite um nome para a coluna'); return; }
    const nameExists = stages.some(s => s.name.toLowerCase() === trimmedName.toLowerCase());
    if (nameExists) { toast.error('Já existe uma coluna com esse nome'); return; }
    setIsLoading(true);
    try {
      await onCreateStage(trimmedName, newStageColor);
      setNewStageName(''); setNewStageColor(PRESET_COLORS[1]); setIsCreating(false);
      toast.success('Coluna criada com sucesso');
    } catch { toast.error('Erro ao criar coluna'); }
    finally { setIsLoading(false); }
  };

  const handleStartEdit = (stage: PipelineStage) => {
    setEditingStageId(stage.id); setEditName(stage.name); setEditColor(stage.color);
  };

  const handleSaveEdit = async () => {
    const trimmedName = editName.trim();
    if (!editingStageId || !trimmedName) return;
    const nameExists = stages.some(s => s.id !== editingStageId && s.name.toLowerCase() === trimmedName.toLowerCase());
    if (nameExists) { toast.error('Já existe uma coluna com esse nome'); return; }
    setIsLoading(true);
    try {
      await onUpdateStage(editingStageId, { name: trimmedName, color: editColor });
      setEditingStageId(null); toast.success('Coluna atualizada');
    } catch { toast.error('Erro ao atualizar coluna'); }
    finally { setIsLoading(false); }
  };

  const handleCancelEdit = () => { setEditingStageId(null); setEditName(''); setEditColor(''); };

  const handleRequestDelete = async (stage: PipelineStage) => {
    if (isLockedStage(stage.name)) { toast.error('Esta coluna não pode ser excluída'); return; }
    if (user) {
      const { data: agents } = await supabase
        .from('ai_agents').select('name').eq('user_id', user.id)
        .or(`crm_stage_on_new_lead.eq.${stage.name},crm_stage_on_reply.eq.${stage.name},crm_stage_on_end.eq.${stage.name},crm_stage_on_unknown.eq.${stage.name}`);
      setAgentsUsingStage(agents?.map(a => a.name) || []);
    }
    const leadsInStage = leads.filter(l => l.pipeline_stage_id === stage.id);
    const firstStage = sortedStages.find(s => s.id !== stage.id && !isLockedStage(s.name) || s.name === 'Prospectado');
    setMoveToStageId(firstStage?.id || sortedStages[0]?.id || '');
    setDeleteConfirmStage(stage);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmStage) return;
    setIsLoading(true);
    try {
      await onDeleteStage(deleteConfirmStage.id, moveToStageId || undefined);
      const targetStage = stages.find(s => s.id === moveToStageId);
      toast.success(`Coluna excluída${targetStage ? `. Leads movidos para ${targetStage.name}.` : '.'}`);
      setDeleteConfirmStage(null); setMoveToStageId('');
    } catch { toast.error('Erro ao excluir coluna'); }
    finally { setIsLoading(false); }
  };

  const getLeadsCountInStage = (stageId: string) => leads.filter(l => l.pipeline_stage_id === stageId).length;

  const handleMoveStage = async (stageId: string, direction: 'up' | 'down') => {
    setIsLoading(true);
    try { await onMoveStage(stageId, direction); }
    catch { toast.error('Erro ao mover coluna'); }
    finally { setIsLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg w-[95vw] sm:w-full rounded-lg max-h-[90vh] sm:max-h-auto overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Configurações do CRM</DialogTitle>
          <DialogDescription>
            Gerencie as colunas do funil e as tags dos seus leads.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0">
          {[
            { id: 'columns' as const, label: 'Colunas' },
            { id: 'tags' as const, label: 'Tags' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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

        {/* Columns Tab */}
        {activeTab === 'columns' && (
          <>
            <ScrollArea className="max-h-[400px] pr-4">
              <div className="space-y-2">
                {sortedStages.map((stage, index) => {
                  const locked = isLockedStage(stage.name);
                  const isEditing = editingStageId === stage.id;
                  return (
                    <div key={stage.id} className={cn("flex items-center gap-2 p-3 rounded-lg border transition-colors", locked ? "bg-muted/50 border-border/50" : "bg-card border-border")}>
                      {isEditing ? (
                        <div className="flex gap-1 flex-wrap max-w-[100px]">
                          {PRESET_COLORS.slice(0, 5).map((color) => (
                            <button key={color} className={cn("w-5 h-5 rounded-full border-2 transition-all", editColor === color ? "border-foreground scale-110" : "border-transparent")} style={{ backgroundColor: color }} onClick={() => setEditColor(color)} />
                          ))}
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                      )}
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" autoFocus />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{stage.name}</span>
                            {locked && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {isEditing ? (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveEdit} disabled={isLoading || !editName.trim()}>
                              <Check className="w-4 h-4 text-green-500" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancelEdit}>
                              <X className="w-4 h-4 text-red-500" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMoveStage(stage.id, 'up')} disabled={isLoading || !canMoveUp(index, stage)}>
                              <ChevronUp className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMoveStage(stage.id, 'down')} disabled={isLoading || !canMoveDown(index, stage)}>
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStartEdit(stage)} disabled={isLoading || locked}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleRequestDelete(stage)} disabled={isLoading || locked}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="border-t pt-4 mt-2">
              {isCreating ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1 flex-wrap">
                      {PRESET_COLORS.map((color) => (
                        <button key={color} className={cn("w-6 h-6 rounded-full border-2 transition-all", newStageColor === color ? "border-foreground scale-110" : "border-transparent")} style={{ backgroundColor: color }} onClick={() => setNewStageColor(color)} />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input value={newStageName} onChange={(e) => setNewStageName(e.target.value)} placeholder="Nome da nova coluna" className="flex-1" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleCreateStage(); if (e.key === 'Escape') setIsCreating(false); }} />
                    <Button onClick={handleCreateStage} disabled={isLoading || !newStageName.trim()}>
                      <Check className="w-4 h-4 mr-1" /> Criar
                    </Button>
                    <Button variant="outline" onClick={() => { setIsCreating(false); setNewStageName(''); }}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" className="w-full" onClick={() => setIsCreating(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Adicionar Coluna
                </Button>
              )}
            </div>
          </>
        )}

        {/* Tags Tab */}
        {activeTab === 'tags' && (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                placeholder="Pesquisar tags..."
                className="pl-9 h-9"
              />
            </div>

            {/* Tag list */}
            <ScrollArea className="max-h-[280px]">
              <div className="space-y-1.5 pr-2">
                {isLoadingTags ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Carregando tags...</p>
                ) : filteredTags.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {tagSearch ? 'Nenhuma tag encontrada' : 'Nenhuma tag criada ainda'}
                  </p>
                ) : (
                  filteredTags.map((tag) => (
                    <div key={tag} className="group flex items-center gap-2 p-2.5 rounded-lg border border-border bg-card transition-colors hover:bg-muted/50">
                      <Tag className="w-3.5 h-3.5 text-primary shrink-0" />
                      {editingTag === tag ? (
                        <div className="flex-1 flex items-center gap-1.5">
                          <Input
                            value={editTagValue}
                            onChange={(e) => setEditTagValue(e.target.value)}
                            className="h-7 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameTag();
                              if (e.key === 'Escape') { setEditingTag(null); setEditTagValue(''); }
                            }}
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleRenameTag} disabled={isLoading || !editTagValue.trim()}>
                            <Check className="w-3.5 h-3.5 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { setEditingTag(null); setEditTagValue(''); }}>
                            <X className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="flex-1 text-sm font-medium truncate">{tag}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100" onClick={() => { setEditingTag(tag); setEditTagValue(tag); }}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100" onClick={() => setDeleteTagConfirm(tag)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Create new tag */}
            <div className="border-t pt-3">
              <div className="flex gap-2">
                <Input
                  value={newTagValue}
                  onChange={(e) => setNewTagValue(e.target.value)}
                  placeholder="Nome da nova tag"
                  className="flex-1 h-9"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateTag();
                  }}
                />
                <Button
                  onClick={handleCreateTag}
                  disabled={!newTagValue.trim()}
                  className="shrink-0"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Criar Tag
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Delete Stage Confirmation */}
      <AlertDialog open={!!deleteConfirmStage} onOpenChange={(open) => !open && setDeleteConfirmStage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Excluir coluna "{deleteConfirmStage?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {agentsUsingStage.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      <div className="text-xs">
                        <p className="font-medium text-amber-500 mb-1">⚠️ Agente(s) de IA usando esta coluna</p>
                        <p className="text-muted-foreground">
                          Os agentes <strong>{agentsUsingStage.join(', ')}</strong> estão configurados para mover leads para esta coluna.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {deleteConfirmStage && getLeadsCountInStage(deleteConfirmStage.id) > 0 ? (
                  <>
                    <p>Esta coluna possui <strong>{getLeadsCountInStage(deleteConfirmStage.id)} lead(s)</strong>. Escolha para qual coluna deseja mover esses leads:</p>
                    <Select value={moveToStageId} onValueChange={setMoveToStageId}>
                      <SelectTrigger><SelectValue placeholder="Selecione a coluna de destino" /></SelectTrigger>
                      <SelectContent>
                        {sortedStages.filter(s => s.id !== deleteConfirmStage?.id).map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                              {stage.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                ) : (
                  <p>Esta ação não pode ser desfeita.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isLoading || (deleteConfirmStage && getLeadsCountInStage(deleteConfirmStage.id) > 0 && !moveToStageId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Tag Confirmation */}
      <AlertDialog open={!!deleteTagConfirm} onOpenChange={(open) => !open && setDeleteTagConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Excluir tag "{deleteTagConfirm}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta tag será removida de todos os leads que a possuem. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTag}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? 'Excluindo...' : 'Excluir Tag'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
