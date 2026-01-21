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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  MoreHorizontal, 
  Ban, 
  CheckCircle2, 
  Loader2, 
  AlertTriangle,
  UserX,
  UserCheck
} from "lucide-react";

interface UserActionsMenuProps {
  userId: string;
  userEmail: string;
  userName: string | null;
  isBlocked: boolean;
  onActionComplete?: () => void;
}

export const UserActionsMenu = ({ 
  userId, 
  userEmail, 
  userName,
  isBlocked,
  onActionComplete 
}: UserActionsMenuProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);
  const { toast } = useToast();

  const handleBlock = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_blocked: true })
        .eq('id', userId);

      if (error) throw error;

      // Log the action
      await supabase.from('security_audit_log').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'admin_block_user',
        resource_type: 'profiles',
        resource_id: userId,
        metadata: {
          blocked_email: userEmail,
          blocked_name: userName,
          reason: 'Policy violation'
        }
      });

      toast({
        title: "Usuário bloqueado",
        description: `${userEmail} foi bloqueado com sucesso.`,
      });

      setShowBlockDialog(false);
      onActionComplete?.();
    } catch (error) {
      console.error('Error blocking user:', error);
      toast({
        title: "Erro ao bloquear",
        description: "Não foi possível bloquear o usuário.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_blocked: false })
        .eq('id', userId);

      if (error) throw error;

      // Log the action
      await supabase.from('security_audit_log').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'admin_unblock_user',
        resource_type: 'profiles',
        resource_id: userId,
        metadata: {
          unblocked_email: userEmail,
          unblocked_name: userName
        }
      });

      toast({
        title: "Usuário desbloqueado",
        description: `${userEmail} foi desbloqueado com sucesso.`,
      });

      setShowUnblockDialog(false);
      onActionComplete?.();
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast({
        title: "Erro ao desbloquear",
        description: "Não foi possível desbloquear o usuário.",
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
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isBlocked ? (
            <DropdownMenuItem onClick={() => setShowUnblockDialog(true)} className="gap-2">
              <UserCheck size={14} className="text-success" />
              Desbloquear usuário
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setShowBlockDialog(true)} className="gap-2 text-destructive">
              <UserX size={14} />
              Bloquear usuário
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Block Confirmation Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban size={20} />
              Bloquear Usuário
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>Tem certeza que deseja bloquear este usuário?</p>
              <div className="bg-muted rounded-lg p-3 mt-2">
                <p className="font-medium text-foreground">{userName || 'Sem nome'}</p>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>
              <div className="flex items-start gap-2 mt-4 p-3 bg-warning/10 rounded-lg border border-warning/20">
                <AlertTriangle size={16} className="text-warning mt-0.5 flex-shrink-0" />
                <p className="text-sm text-warning">
                  O usuário não conseguirá acessar a plataforma e verá uma mensagem informando o bloqueio.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleBlock} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={16} />
                  Bloqueando...
                </>
              ) : (
                "Bloquear Usuário"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unblock Confirmation Dialog */}
      <Dialog open={showUnblockDialog} onOpenChange={setShowUnblockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success">
              <CheckCircle2 size={20} />
              Desbloquear Usuário
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>Deseja desbloquear este usuário?</p>
              <div className="bg-muted rounded-lg p-3 mt-2">
                <p className="font-medium text-foreground">{userName || 'Sem nome'}</p>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                O usuário poderá acessar a plataforma normalmente após o desbloqueio.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnblockDialog(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={handleUnblock} disabled={isLoading} className="bg-success hover:bg-success/90">
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={16} />
                  Desbloqueando...
                </>
              ) : (
                "Desbloquear Usuário"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};