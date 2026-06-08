import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  FileText, 
  Trash2, 
  Pencil, 
  Save, 
  X, 
  Loader2,
  Bot,
  MessageSquare,
  Target
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  template_data: unknown;
  created_at: string;
}

interface ManageTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageTemplatesDialog({ open, onOpenChange }: ManageTemplatesDialogProps) {
  const { user, accountOwnerId } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const fetchTemplates = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('agent_templates')
        .select('*')
        .eq('owner_user_id', accountOwnerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open, user]);

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setEditName(template.name);
    setEditDescription(template.description || '');
  };

  const handleCancelEdit = () => {
    setEditingTemplate(null);
    setEditName('');
    setEditDescription('');
  };

  const handleSaveEdit = async () => {
    if (!editingTemplate || !editName.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('agent_templates')
        .update({
          name: editName.trim(),
          description: editDescription.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingTemplate.id);

      if (error) throw error;

      toast.success('Template atualizado com sucesso!');
      handleCancelEdit();
      fetchTemplates();
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Erro ao atualizar template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;

    try {
      const { error } = await supabase
        .from('agent_templates')
        .delete()
        .eq('id', templateToDelete.id);

      if (error) throw error;

      toast.success('Template excluído com sucesso!');
      setTemplateToDelete(null);
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Erro ao excluir template');
    }
  };

  const getObjectiveLabel = (objective: string) => {
    switch (objective) {
      case 'prospecting': return 'Prospecção';
      case 'warming': return 'Aquecimento';
      case 'first_contact': return 'Primeiro Contato';
      default: return objective;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Gerenciar Templates
            </DialogTitle>
            <DialogDescription>
              Edite ou exclua seus templates de agentes salvos
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bot className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">Nenhum template salvo</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Você ainda não salvou nenhum template. Crie um agente e salve como template 
                  nas configurações do agente.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="border border-border rounded-lg p-4 bg-card"
                  >
                    {editingTemplate?.id === template.id ? (
                      // Edit mode
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="edit-name">Nome do Template</Label>
                          <Input
                            id="edit-name"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Nome do template"
                            className="mt-1.5"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-description">Descrição</Label>
                          <Textarea
                            id="edit-description"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Descrição opcional do template"
                            className="mt-1.5"
                            rows={2}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                            disabled={saving}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveEdit}
                            disabled={saving || !editName.trim()}
                          >
                            {saving ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4 mr-1" />
                            )}
                            Salvar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Bot className="w-4 h-4 text-primary" />
                            <h4 className="font-medium truncate">{template.name}</h4>
                          </div>
                          {template.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {template.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {(template.template_data as Record<string, unknown>)?.objective && (
                              <span className="flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                {getObjectiveLabel((template.template_data as Record<string, unknown>).objective as string)}
                              </span>
                            )}
                            {(template.template_data as Record<string, unknown>)?.communication_style && (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                {(template.template_data as Record<string, unknown>).communication_style === 'formal' ? 'Formal' : 
                                 (template.template_data as Record<string, unknown>).communication_style === 'casual' ? 'Casual' : 'Técnico'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(template)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setTemplateToDelete(template)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!templateToDelete} onOpenChange={(open) => !open && setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o template "{templateToDelete?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
