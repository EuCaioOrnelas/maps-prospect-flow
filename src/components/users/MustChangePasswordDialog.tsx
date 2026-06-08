import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, Check, X, Eye, EyeOff } from "lucide-react";

interface Props {
  open: boolean;
  onCompleted: () => void;
}

const passwordRules = [
  { label: "Mínimo 8 caracteres", test: (v: string) => v.length >= 8 },
  { label: "Pelo menos 1 letra maiúscula", test: (v: string) => /[A-Z]/.test(v) },
  { label: "Pelo menos 1 letra minúscula", test: (v: string) => /[a-z]/.test(v) },
  { label: "Pelo menos 1 número", test: (v: string) => /\d/.test(v) },
  { label: "Pelo menos 1 caractere especial", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

export const MustChangePasswordDialog = ({ open, onCompleted }: Props) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const allRulesMet = passwordRules.every((r) => r.test(password));

  const handleSubmit = async () => {
    if (!allRulesMet) {
      toast({ title: "Senha não atende aos requisitos", description: "Verifique as regras abaixo e tente novamente.", variant: "destructive" });
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
        className="sm:max-w-md [&>button.absolute]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
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
            <div className="relative">
              <Input id="np" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" className="pr-10" />
              <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp">Confirmar senha</Label>
            <div className="relative">
              <Input id="cp" type={showConfirm ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="pr-10" />
              <button type="button" onClick={() => setShowConfirm((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
            <p className="text-sm font-medium text-foreground">Requisitos da senha</p>
            <ul className="space-y-1.5">
              {passwordRules.map((rule) => {
                const ok = rule.test(password);
                return (
                  <li key={rule.label} className="flex items-center gap-2 text-sm">
                    {ok ? (
                      <Check size={14} className="text-emerald-500 shrink-0" />
                    ) : (
                      <X size={14} className="text-muted-foreground shrink-0" />
                    )}
                    <span className={ok ? "text-emerald-600" : "text-muted-foreground"}>{rule.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={loading || !allRulesMet}>
            {loading ? <Loader2 className="animate-spin" size={16} /> : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
