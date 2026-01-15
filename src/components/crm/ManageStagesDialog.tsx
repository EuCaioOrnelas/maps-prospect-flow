import { useState } from 'react';
import { type PipelineStage, isLockedStage } from '@/hooks/useCRM';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ManageStagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: PipelineStage[];
  onCreateStage: (name: string, color: string) => Promise<PipelineStage | null>;
  onUpdateStage: (id: string, updates: Partial<PipelineStage>) => Promise<PipelineStage | null>;
  onDeleteStage: (id: string) => Promise<void>;
  onMoveStage: (id: string, direction: 'up' | 'down') => Promise<void>;
}

const PRESET_COLORS = [
  '#6B7280', // gray
  '#3B82F6', // blue
  '#10B981', // green
  '#8B5CF6', // purple
  '#F59E0B', // amber
  '#EC4899', // pink
  '#EF4444', // red
  '#14B8A6', // teal
  '#F97316', // orange
  '#6366F1', // indigo
];

export const ManageStagesDialog = ({
  open,
  onOpenChange,
  stages,
  onCreateStage,
  onUpdateStage,
  onDeleteStage,
  onMoveStage,
}: ManageStagesDialogProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState(PRESET_COLORS[1]);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sortedStages = [...stages].sort((a, b) => a.position - b.position);

  // Encontra índices das colunas travadas para validar movimento
  const prospectadoIndex = sortedStages.findIndex(s => s.name === 'Prospectado');
  const fechadoIndex = sortedStages.findIndex(s => s.name === 'Fechado (Ganho)');
  const perdidoIndex = sortedStages.findIndex(s => s.name === 'Perdido');
  const minEditableIndex = prospectadoIndex + 1;
  const maxEditableIndex = Math.min(
    fechadoIndex >= 0 ? fechadoIndex : sortedStages.length,
    perdidoIndex >= 0 ? perdidoIndex : sortedStages.length
  ) - 1;

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
    
    if (!trimmedName) {
      toast.error('Digite um nome para a coluna');
      return;
    }

    // Check for duplicate names (case-insensitive)
    const nameExists = stages.some(
      s => s.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (nameExists) {
      toast.error('Já existe uma coluna com esse nome');
      return;
    }

    setIsLoading(true);
    try {
      await onCreateStage(trimmedName, newStageColor);
      setNewStageName('');
      setNewStageColor(PRESET_COLORS[1]);
      setIsCreating(false);
      toast.success('Coluna criada com sucesso');
    } catch (error) {
      toast.error('Erro ao criar coluna');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEdit = (stage: PipelineStage) => {
    setEditingStageId(stage.id);
    setEditName(stage.name);
    setEditColor(stage.color);
  };

  const handleSaveEdit = async () => {
    const trimmedName = editName.trim();
    if (!editingStageId || !trimmedName) return;

    // Check for duplicate names (case-insensitive), excluding current stage
    const nameExists = stages.some(
      s => s.id !== editingStageId && s.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (nameExists) {
      toast.error('Já existe uma coluna com esse nome');
      return;
    }

    setIsLoading(true);
    try {
      await onUpdateStage(editingStageId, { 
        name: trimmedName, 
        color: editColor 
      });
      setEditingStageId(null);
      toast.success('Coluna atualizada');
    } catch (error) {
      toast.error('Erro ao atualizar coluna');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingStageId(null);
    setEditName('');
    setEditColor('');
  };

  const handleDeleteStage = async (stage: PipelineStage) => {
    if (isLockedStage(stage.name)) {
      toast.error('Esta coluna não pode ser excluída');
      return;
    }

    setIsLoading(true);
    try {
      await onDeleteStage(stage.id);
      toast.success('Coluna excluída. Leads movidos para Prospectado.');
    } catch (error) {
      toast.error('Erro ao excluir coluna');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveStage = async (stageId: string, direction: 'up' | 'down') => {
    setIsLoading(true);
    try {
      await onMoveStage(stageId, direction);
    } catch (error) {
      toast.error('Erro ao mover coluna');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerenciar Colunas do Funil</DialogTitle>
          <DialogDescription>
            Crie, edite e organize as etapas do seu funil de vendas.
            As colunas Prospectado, Fechado (Ganho) e Perdido são fixas.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-2">
            {sortedStages.map((stage, index) => {
              const locked = isLockedStage(stage.name);
              const isEditing = editingStageId === stage.id;

              return (
                <div
                  key={stage.id}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-lg border transition-colors",
                    locked ? "bg-muted/50 border-border/50" : "bg-card border-border"
                  )}
                >
                  {/* Color indicator */}
                  {isEditing ? (
                    <div className="flex gap-1 flex-wrap max-w-[100px]">
                      {PRESET_COLORS.slice(0, 5).map((color) => (
                        <button
                          key={color}
                          className={cn(
                            "w-5 h-5 rounded-full border-2 transition-all",
                            editColor === color ? "border-foreground scale-110" : "border-transparent"
                          )}
                          style={{ backgroundColor: color }}
                          onClick={() => setEditColor(color)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: stage.color }}
                    />
                  )}

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8"
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {stage.name}
                        </span>
                        {locked && (
                          <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isEditing ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={handleSaveEdit}
                          disabled={isLoading || !editName.trim()}
                        >
                          <Check className="w-4 h-4 text-green-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={handleCancelEdit}
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      </>
                    ) : (
                      <>
                        {/* Move buttons */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleMoveStage(stage.id, 'up')}
                          disabled={isLoading || !canMoveUp(index, stage)}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleMoveStage(stage.id, 'down')}
                          disabled={isLoading || !canMoveDown(index, stage)}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>

                        {/* Edit button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleStartEdit(stage)}
                          disabled={isLoading || locked}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>

                        {/* Delete button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteStage(stage)}
                          disabled={isLoading || locked}
                        >
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

        {/* Create new stage */}
        <div className="border-t pt-4 mt-2">
          {isCreating ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1 flex-wrap">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 transition-all",
                        newStageColor === color ? "border-foreground scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewStageColor(color)}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  placeholder="Nome da nova coluna"
                  className="flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateStage();
                    if (e.key === 'Escape') setIsCreating(false);
                  }}
                />
                <Button
                  onClick={handleCreateStage}
                  disabled={isLoading || !newStageName.trim()}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Criar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    setNewStageName('');
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Coluna
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
