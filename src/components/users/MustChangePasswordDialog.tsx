import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck } from "lucide-react";

interface Props {
  open: boolean;
  onCompleted: () => void;
}

export const MustChangePasswordDialog = ({ open, onCompleted }: Props) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (password.length < 8) {
      toast({ title: "Senha muito curta", description: "Use no mínimo 8 caracteres.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (uid) {
        await supabase.from("profiles").update({ must_change_password: false }).eq("id", uid);
        await supabase.from("account_members").update({ must_change_password: false }).eq("user_id", uid);
      }

      toast({ title: "Senha atualizada com sucesso" });
      onCompleted();
    } catch (e: any) {
      toast({ title: "Erro ao atualizar senha", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { /* não permite fechar */ }}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideClose
      >
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
            <ShieldCheck size={24} />
          </div>
          <DialogTitle className="text-center">Altere sua senha</DialogTitle>
          <DialogDescription className="text-center">
            Por segurança recomendamos alterar a senha criada pelo administrador.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="np">Nova senha</Label>
            <Input id="np" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp">Confirmar senha</Label>
            <Input id="cp" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={16} /> : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
