import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  FileEdit, 
  Trash2, 
  Clock, 
  Users, 
  MessageSquare,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CampaignDraft } from '@/hooks/useCampaignDrafts';

interface CampaignDraftsProps {
  drafts: CampaignDraft[];
  onLoadDraft: (draft: CampaignDraft) => void;
  onDeleteDraft: (draftId: string) => Promise<boolean>;
  loading?: boolean;
}

const stepLabels: Record<string, string> = {
  leads: 'Seleção de leads',
  messages: 'Mensagens',
  settings: 'Configurações',
  summary: 'Resumo',
};

export const CampaignDrafts = ({
  drafts,
  onLoadDraft,
  onDeleteDraft,
  loading = false,
}: CampaignDraftsProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<CampaignDraft | null>(null);

  const handleDeleteClick = (draft: CampaignDraft) => {
    setDraftToDelete(draft);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!draftToDelete) return;
    
    setDeletingId(draftToDelete.id);
    await onDeleteDraft(draftToDelete.id);
    setDeletingId(null);
    setShowDeleteDialog(false);
    setDraftToDelete(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (drafts.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <FileEdit size={18} className="text-primary" />
          <h3 className="font-semibold text-foreground">Rascunhos</h3>
          <Badge variant="secondary" className="ml-auto">
            {drafts.length} rascunho{drafts.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        
        <div className="space-y-2">
          {drafts.map((draft) => (
            <Card key={draft.id} className="bg-muted/30 border-border hover:bg-muted/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground truncate">
                        {draft.campaign_name || draft.name}
                      </span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {stepLabels[draft.step] || draft.step}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        {draft.selected_leads?.length || 0} leads
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare size={12} />
                        {(draft.messages?.filter(m => m.trim()) || []).length}/5 mensagens
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatDistanceToNow(new Date(draft.updated_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(draft)}
                      disabled={deletingId === draft.id}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      {deletingId === draft.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onLoadDraft(draft)}
                      className="gap-1"
                    >
                      Continuar
                      <ArrowRight size={14} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <Clock size={12} />
          Rascunhos são apagados automaticamente após 30 minutos
        </p>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir rascunho?</AlertDialogTitle>
            <AlertDialogDescription>
              O rascunho "{draftToDelete?.campaign_name || draftToDelete?.name}" será excluído permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
