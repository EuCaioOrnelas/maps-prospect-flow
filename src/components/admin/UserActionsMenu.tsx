import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  MoreHorizontal,
  Ban,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  UserX,
  UserCheck,
  Archive,
  ArchiveRestore,
  Trash2,
} from "lucide-react";

interface UserActionsMenuProps {
  userId: string;
  userEmail: string;
  userName: string | null;
  isBlocked: boolean;
  isArchived?: boolean;
  onActionComplete?: () => void;
}

export const UserActionsMenu = ({
  userId,
  userEmail,
  userName,
  isBlocked,
  isArchived = false,
  onActionComplete,
}: UserActionsMenuProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showUnarchiveDialog, setShowUnarchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const { toast } = useToast();

  const updateProfile = async (patch: Record<string, any>) => {
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
    if (error) throw error;
  };

  const audit = async (action: string, metadata: Record<string, any> = {}) => {
    await supabase.from("security_audit_log").insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      action,
      resource_type: "profiles",
      resource_id: userId,
      metadata: { email: userEmail, name: userName, ...metadata },
    });
  };

  const handleBlock = async () => {
    setIsLoading(true);
    try {
      await updateProfile({ is_blocked: true });
      await audit("admin_block_user");
      toast({ title: "Usuário bloqueado", description: `${userEmail} foi bloqueado.` });
      setShowBlockDialog(false);
      onActionComplete?.();
    } catch (e) {
      toast({ title: "Erro ao bloquear", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = async () => {
    setIsLoading(true);
    try {
      await updateProfile({ is_blocked: false });
      await audit("admin_unblock_user");
      toast({ title: "Usuário desbloqueado", description: `${userEmail} foi desbloqueado.` });
      setShowUnblockDialog(false);
      onActionComplete?.();
    } catch (e) {
      toast({ title: "Erro ao desbloquear", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async () => {
    setIsLoading(true);
    try {
      await updateProfile({
        is_archived: true,
        archived_at: new Date().toISOString(),
        is_blocked: true, // arquivar também bloqueia o acesso
      });
      await audit("admin_archive_user");
      toast({
        title: "Usuário arquivado",
        description: `${userEmail} foi removido da lista principal.`,
      });
      setShowArchiveDialog(false);
      onActionComplete?.();
    } catch (e) {
      toast({ title: "Erro ao arquivar", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnarchive = async () => {
    setIsLoading(true);
    try {
      await updateProfile({ is_archived: false, archived_at: null });
      await audit("admin_unarchive_user");
      toast({ title: "Usuário restaurado", description: `${userEmail} voltou à lista principal.` });
      setShowUnarchiveDialog(false);
      onActionComplete?.();
    } catch (e) {
      toast({ title: "Erro ao restaurar", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== "EXCLUIR") {
      toast({
        title: "Confirmação inválida",
        description: 'Digite "EXCLUIR" para confirmar.',
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { user_id: userId },
      });
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message);
      }
      toast({
        title: "Usuário excluído",
        description: `${userEmail} foi removido permanentemente.`,
      });
      setShowDeleteDialog(false);
      setDeleteConfirm("");
      onActionComplete?.();
    } catch (e: any) {
      toast({
        title: "Erro ao excluir",
        description: e?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          {isBlocked ? (
            <DropdownMenuItem onClick={() => setShowUnblockDialog(true)} className="gap-2">
              <UserCheck size={14} className="text-success" />
              Desbloquear
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setShowBlockDialog(true)} className="gap-2">
              <UserX size={14} />
              Bloquear
            </DropdownMenuItem>
          )}

          {isArchived ? (
            <DropdownMenuItem onClick={() => setShowUnarchiveDialog(true)} className="gap-2">
              <ArchiveRestore size={14} className="text-success" />
              Restaurar (desarquivar)
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setShowArchiveDialog(true)} className="gap-2">
              <Archive size={14} />
              Arquivar
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="gap-2 text-destructive focus:text-destructive"
          >
            <Trash2 size={14} />
            Excluir permanentemente
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Block */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban size={20} /> Bloquear Usuário
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2">
                <p>Tem certeza que deseja bloquear este usuário?</p>
                <div className="bg-muted rounded-lg p-3 mt-2">
                  <p className="font-medium text-foreground">{userName || "Sem nome"}</p>
                  <p className="text-sm text-muted-foreground">{userEmail}</p>
                </div>
                <div className="flex items-start gap-2 mt-4 p-3 bg-warning/10 rounded-lg border border-warning/20">
                  <AlertTriangle size={16} className="text-warning mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-warning">
                    O usuário não conseguirá acessar a plataforma e verá uma mensagem informando o
                    bloqueio.
                  </p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleBlock} disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Bloquear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unblock */}
      <Dialog open={showUnblockDialog} onOpenChange={setShowUnblockDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success">
              <CheckCircle2 size={20} /> Desbloquear Usuário
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2">
                <p>Deseja desbloquear este usuário?</p>
                <div className="bg-muted rounded-lg p-3 mt-2">
                  <p className="font-medium text-foreground">{userName || "Sem nome"}</p>
                  <p className="text-sm text-muted-foreground">{userEmail}</p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUnblockDialog(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button onClick={handleUnblock} disabled={isLoading} className="bg-success hover:bg-success/90">
              {isLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Desbloquear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive size={20} /> Arquivar Usuário
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2">
                <p>O usuário será removido da lista principal e bloqueado.</p>
                <div className="bg-muted rounded-lg p-3 mt-2">
                  <p className="font-medium text-foreground">{userName || "Sem nome"}</p>
                  <p className="text-sm text-muted-foreground">{userEmail}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Você pode restaurar o usuário a qualquer momento usando o filtro "Arquivados".
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowArchiveDialog(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button onClick={handleArchive} disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Arquivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unarchive */}
      <Dialog open={showUnarchiveDialog} onOpenChange={setShowUnarchiveDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success">
              <ArchiveRestore size={20} /> Restaurar Usuário
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2">
                <p>O usuário voltará para a lista principal. Ele permanecerá bloqueado até você desbloqueá-lo.</p>
                <div className="bg-muted rounded-lg p-3 mt-2">
                  <p className="font-medium text-foreground">{userName || "Sem nome"}</p>
                  <p className="text-sm text-muted-foreground">{userEmail}</p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUnarchiveDialog(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button onClick={handleUnarchive} disabled={isLoading} className="bg-success hover:bg-success/90">
              {isLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Restaurar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete permanente */}
      <Dialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          setShowDeleteDialog(open);
          if (!open) setDeleteConfirm("");
        }}
      >
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 size={20} /> Excluir permanentemente
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3">
                <div className="bg-muted rounded-lg p-3">
                  <p className="font-medium text-foreground">{userName || "Sem nome"}</p>
                  <p className="text-sm text-muted-foreground">{userEmail}</p>
                </div>
                <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <AlertTriangle size={16} className="text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-destructive">
                    Esta ação é <strong>irreversível</strong>. Todos os dados do usuário (perfil,
                    contratos, pagamentos, leads, mensagens) serão removidos.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="delete-confirm">
                    Digite <strong>EXCLUIR</strong> para confirmar
                  </Label>
                  <Input
                    id="delete-confirm"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="EXCLUIR"
                    autoComplete="off"
                  />
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading || deleteConfirm !== "EXCLUIR"}
            >
              {isLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Excluir permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
